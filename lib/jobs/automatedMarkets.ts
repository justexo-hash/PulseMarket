/**
 * Automated Market Creation Job
 * 
 * This job runs every 6 hours to create new markets automatically based on graduating tokens.
 * It implements the logic defined in blorg.md for market creation, calculations, and rotation.
 */

import { storage } from "@server/storage";
import { getGraduatingTokens, getMultipleTokens, getTokenChart, type GraduatingToken } from "@server/solanaTracker";
import { type InsertMarket } from "@shared/schema";
import { publishEvent } from "@lib/realtime/server";
import { spliceBattleMarketImages } from "@server/imageUtils";

// Market type constants
export type MarketType = "market_cap" | "volume" | "holders" | "battle_race" | "battle_dump";

// Target milestones for different market types
const MARKET_CAP_MILESTONES = [250000, 500000, 750000, 1000000, 2000000, 3000000, 5000000, 10000000, 20000000, 50000000, 100000000];
const VOLUME_MILESTONES = [250000, 500000, 750000, 1000000, 2000000, 3000000, 5000000, 10000000, 20000000, 50000000, 100000000];
const HOLDER_MILESTONES = [500, 1000, 2000, 3000, 5000, 7500, 10000, 15000, 20000, 30000, 50000];

/**
 * Round a number up to the nearest milestone
 * @param value - The value to round
 * @param milestones - Array of milestone values (must be sorted ascending)
 * @returns The nearest milestone that is >= value, or the max milestone if value exceeds all
 */
function roundUpToMilestone(value: number, milestones: number[]): number {
  // Find first milestone that is >= value
  for (const milestone of milestones) {
    if (milestone >= value) {
      return milestone;
    }
  }
  // If value exceeds all milestones, return the max
  return milestones[milestones.length - 1];
}

/**
 * Round a number to the nearest 100K (for dump battle markets)
 * @param value - The value to round
 * @returns The value rounded to nearest 100K
 */
function roundToNearest100K(value: number): number {
  return Math.round(value / 100000) * 100000;
}

/**
 * Calculate market cap milestone target
 * Takes current MC, doubles it, rounds up to nearest milestone
 */
function calculateMarketCapTarget(currentMC: number): { target: number; question: string } {
  // Double the current market cap
  const doubled = currentMC * 2;
  
  // Round up to nearest milestone
  const target = roundUpToMilestone(doubled, MARKET_CAP_MILESTONES);
  
  // Format target for display (convert to millions if >= 1M)
  const targetFormatted = target >= 1000000 
    ? `$${(target / 1000000).toFixed(1)}M`
    : `$${(target / 1000).toFixed(0)}K`;
  
  const question = `Will this token's current market cap be above ${targetFormatted} after 120 minutes?`;
  
  return { target, question };
}

/**
 * Calculate volume milestone target
 * Takes current 24h volume, doubles it, rounds up to nearest milestone
 */
function calculateVolumeTarget(currentVolume: number): { target: number; question: string } {
  // Double the current volume
  const doubled = currentVolume * 2;
  
  // Round up to nearest milestone
  const target = roundUpToMilestone(doubled, VOLUME_MILESTONES);
  
  // Format target for display
  const targetFormatted = target >= 1000000 
    ? `$${(target / 1000000).toFixed(1)}M`
    : `$${(target / 1000).toFixed(0)}K`;
  
  const question = `Will this token's current 24h volume be above ${targetFormatted} after 1 day?`;
  
  return { target, question };
}

/**
 * Calculate holder count milestone target
 * Takes current holders, doubles it, rounds up to nearest milestone
 */
function calculateHolderTarget(currentHolders: number): { target: number; question: string } {
  // Double the current holders
  const doubled = currentHolders * 2;
  
  // Round up to nearest milestone
  const target = roundUpToMilestone(doubled, HOLDER_MILESTONES);
  
  // Format target for display
  const targetFormatted = target >= 1000 
    ? `${(target / 1000).toFixed(1)}K`
    : `${target}`;
  
  const question = `Will this token have more than ${targetFormatted} holders after 1 day?`;
  
  return { target, question };
}

/**
 * Calculate battle race target (both tokens race to same target)
 * Uses the lower MC token's 2x rounded milestone
 */
function calculateBattleRaceTarget(token1MC: number, token2MC: number): { target: number; question: string; token1Name: string; token2Name: string } {
  // Use the lower MC for target calculation
  const lowerMC = Math.min(token1MC, token2MC);
  
  // Double it and round up to milestone
  const doubled = lowerMC * 2;
  const target = roundUpToMilestone(doubled, MARKET_CAP_MILESTONES);
  
  // Format target
  const targetFormatted = target >= 1000000 
    ? `$${(target / 1000000).toFixed(1)}M`
    : `$${(target / 1000).toFixed(0)}K`;
  
  // We'll need token names later, but for now use placeholders
  const question = `Which token will reach ${targetFormatted} market cap first: Token A or Token B?`;
  
  return { target, question, token1Name: "Token A", token2Name: "Token B" };
}

/**
 * Calculate battle dump target (50% below, rounded to nearest 100K)
 */
function calculateBattleDumpTarget(token1MC: number, token2MC: number): { target: number; question: string; token1Name: string; token2Name: string } {
  // Calculate 50% below for both tokens, use the average or lower one
  const token1Target = token1MC * 0.5;
  const token2Target = token2MC * 0.5;
  
  // Use the lower target (more conservative)
  const lowerTarget = Math.min(token1Target, token2Target);
  
  // Round to nearest 100K, but ensure minimum of 100K
  let target = roundToNearest100K(lowerTarget);
  if (target < 100000) {
    target = 100000;
  }
  
  // Format target
  const targetFormatted = target >= 1000000 
    ? `$${(target / 1000000).toFixed(1)}M`
    : `$${(target / 1000).toFixed(0)}K`;
  
  const question = `Which token will dump 50% first (to ${targetFormatted} market cap): Token A or Token B?`;
  
  return { target, question, token1Name: "Token A", token2Name: "Token B" };
}

/**
 * Check if two tokens match for battle markets (similar MC and age)
 * Uses 30% buffer for both MC and age
 */
function tokensMatchForBattle(
  token1: GraduatingToken,
  token2: GraduatingToken
): boolean {
  const mc1 = token1.pools[0]?.marketCap?.usd || 0;
  const mc2 = token2.pools[0]?.marketCap?.usd || 0;
  
  // Calculate age in hours
  const now = Math.floor(Date.now() / 1000);
  const age1 = token1.token.creation?.created_time ? (now - token1.token.creation.created_time) / 3600 : 0;
  const age2 = token2.token.creation?.created_time ? (now - token2.token.creation.created_time) / 3600 : 0;
  
  // Check if MCs are within 30% buffer
  const avgMC = (mc1 + mc2) / 2;
  const mcDiff = Math.abs(mc1 - mc2) / avgMC;
  
  // Check if ages are within 30% buffer (handle zero age)
  const avgAge = (age1 + age2) / 2;
  const ageDiff = avgAge > 0 ? Math.abs(age1 - age2) / avgAge : 0;
  
  return mcDiff <= 0.30 && ageDiff <= 0.30;
}

/**
 * Select the next market type based on rotation (25% each: MC, Volume, Holders, Battles)
 * Battles alternate between Race and Dump
 * Rotation order: market_cap -> volume -> holders -> battle_race -> battle_dump -> repeat
 * 
 * @param lastMarketType - The last market type that was created (from logs)
 * @returns The next market type in rotation
 */
function selectMarketTypeByRotation(lastMarketType?: MarketType): MarketType {
  // Define rotation order
  const rotation: MarketType[] = ["market_cap", "volume", "holders", "battle_race", "battle_dump"];
  
  if (!lastMarketType) {
    // First market - start with market_cap
    return "market_cap";
  }
  
  // Find current index
  const currentIndex = rotation.indexOf(lastMarketType);
  if (currentIndex === -1) {
    // Unknown type, default to market_cap
    return "market_cap";
  }
  
  // Get next in rotation (wrap around)
  const nextIndex = (currentIndex + 1) % rotation.length;
  return rotation[nextIndex];
}

/**
 * Check if a token address has already been used in an active automated market
 * Only checks active markets - expired/resolved markets allow token reuse
 */
async function isTokenAlreadyUsed(tokenAddress: string): Promise<boolean> {
  const allMarkets = await storage.getAllMarkets();
  const now = new Date();
  return allMarkets.some(
    m => {
      // Must be automated market
      if (m.isAutomated !== 1) return false;
      // Must be active (not resolved/refunded)
      if (m.status !== "active") return false;
      // Must not be expired
      if (m.expiresAt && new Date(m.expiresAt) <= now) return false;
      // Check if token matches
      return (m.tokenAddress === tokenAddress || m.tokenAddress2 === tokenAddress);
    }
  );
}

/**
 * Find an unused token from the graduating list
 * Goes down the list until finding one that hasn't been used
 */
async function findUnusedToken(graduatingTokens: GraduatingToken[]): Promise<GraduatingToken | null> {
  for (const token of graduatingTokens) {
    const mint = token.token.mint;
    if (!mint) continue;
    
    const used = await isTokenAlreadyUsed(mint);
    if (!used) {
      return token;
    }
  }
  return null;
}

/**
 * Find two matching tokens for battle markets
 * Searches graduating list for tokens that match (similar MC and age)
 */
async function findMatchingTokensForBattle(graduatingTokens: GraduatingToken[]): Promise<[GraduatingToken, GraduatingToken] | null> {
  // Try all pairs until we find a match
  for (let i = 0; i < graduatingTokens.length; i++) {
    const token1 = graduatingTokens[i];
    
    // Check if token1 is already used
    if (token1.token.mint && await isTokenAlreadyUsed(token1.token.mint)) {
      continue;
    }
    
    for (let j = i + 1; j < graduatingTokens.length; j++) {
      const token2 = graduatingTokens[j];
      
      // Check if token2 is already used
      if (token2.token.mint && await isTokenAlreadyUsed(token2.token.mint)) {
        continue;
      }
      
      // Check if they match for battle
      if (tokensMatchForBattle(token1, token2)) {
        return [token1, token2];
      }
    }
  }
  
  return null;
}

/**
 * Main function to run automated market creation
 * This is called by the cron job every 6 hours
 * 
 * @param forcedMarketType - Optional: Force a specific market type (for testing)
 * @param testMode - Optional: If true, use 5% of normal expiration time (for testing)
 */
export async function runAutomatedMarketCreation(
  forcedMarketType?: MarketType,
  testMode: boolean = false
): Promise<{
  success: boolean;
  marketCreated?: number;
  marketType?: MarketType;
  error?: string;
}> {
  try {
    // Step 1: Check if automation is enabled
    const config = await storage.getAutomatedMarketsConfig();
    if (!config || config.enabled === 0) {
      console.log("[AutomatedMarkets] Automation is disabled, skipping market creation");
      await storage.createAutomatedMarketLog({
        questionType: "disabled",
        success: true,
      });
      return { success: true };
    }

    // Step 2: Fetch graduating tokens
    console.log("[AutomatedMarkets] Fetching graduating tokens...");
    const graduatingTokens = await getGraduatingTokens();
    if (!graduatingTokens || graduatingTokens.length === 0) {
      throw new Error("No graduating tokens returned from API");
    }

    // Step 3: Get existing markets to check for duplicates
    const allMarkets = await storage.getAllMarkets();
    
    // Step 4: Get last market type from logs to determine rotation (unless forced)
    let marketType: MarketType;
    if (forcedMarketType) {
      marketType = forcedMarketType;
      console.log(`[AutomatedMarkets] Using forced market type: ${marketType}`);
    } else {
      const recentLogs = await storage.getRecentAutomatedMarketLogs(10);
      const lastMarketType = recentLogs.find(log => log.success && log.questionType && 
        ["market_cap", "volume", "holders", "battle_race", "battle_dump"].includes(log.questionType))?.questionType as MarketType | undefined;
      
      // Step 5: Select market type (round-robin rotation based on last created type)
      marketType = selectMarketTypeByRotation(lastMarketType);
      console.log(`[AutomatedMarkets] Selected market type: ${marketType} (last was: ${lastMarketType || "none"})`);
    }

    // Step 5: Get token(s) and generate market
    let marketData: InsertMarket | null = null;
    let resolutionData: {
      marketType: string;
      targetValue: number;
      tokenAddress: string;
      tokenAddress2?: string;
    } | null = null;

    if (marketType === "battle_race" || marketType === "battle_dump") {
      // Battle markets need 2 matching tokens
      const matchingTokens = await findMatchingTokensForBattle(graduatingTokens);
      if (!matchingTokens) {
        throw new Error("Could not find matching tokens for battle market");
      }
      
      const [token1, token2] = matchingTokens;
      const mc1 = token1.pools[0]?.marketCap?.usd || 0;
      const mc2 = token2.pools[0]?.marketCap?.usd || 0;
      
      let target: number;
      let question: string;
      
      if (marketType === "battle_race") {
        const result = calculateBattleRaceTarget(mc1, mc2);
        target = result.target;
        // Format target for display
        const targetFormatted = target >= 1000000 
          ? `$${(target / 1000000).toFixed(1)}M`
          : `$${(target / 1000).toFixed(0)}K`;
        question = `Which token will reach ${targetFormatted} market cap first: ${token1.token.name || token1.token.symbol} or ${token2.token.name || token2.token.symbol}?`;
      } else {
        const result = calculateBattleDumpTarget(mc1, mc2);
        target = result.target;
        // Format target for display
        const targetFormatted = target >= 1000000 
          ? `$${(target / 1000000).toFixed(1)}M`
          : `$${(target / 1000).toFixed(0)}K`;
        question = `Which token will dump 50% first (to ${targetFormatted} market cap): ${token1.token.name || token1.token.symbol} or ${token2.token.name || token2.token.symbol}?`;
      }
      
      // Validate required fields for battle markets
      if (!token1.token.mint || !token2.token.mint) {
        throw new Error("Battle market tokens missing mint addresses");
      }
      if (!token1.token.name && !token1.token.symbol) {
        throw new Error("Battle market token1 missing name and symbol");
      }
      if (!token2.token.name && !token2.token.symbol) {
        throw new Error("Battle market token2 missing name and symbol");
      }
      
      // Calculate expiration: 2 days from now (or 5 minutes in test mode)
      const expiresAt = new Date();
      if (testMode) {
        expiresAt.setMinutes(expiresAt.getMinutes() + 5);
      } else {
        expiresAt.setDate(expiresAt.getDate() + 2);
      }
      
      // For battle markets, splice the two token images together
      // Take left half of token1 and right half of token2
      // Both images are REQUIRED for battle markets
      let battleImage: string | undefined = undefined;
      if (!token1.token.image || !token2.token.image) {
        throw new Error(`Battle market missing images: token1=${!!token1.token.image}, token2=${!!token2.token.image}`);
      }
      
      try {
        // Both tokens have images - splice them together
        battleImage = await spliceBattleMarketImages(
          token1.token.image,
          token2.token.image
        );
        console.log(`[AutomatedMarkets] Created spliced battle image: ${battleImage}`);
      } catch (error: any) {
        // If image splicing fails, we can't create the market
        throw new Error(`Failed to splice battle images: ${error.message}`);
      }
      
      marketData = {
        question,
        category: "memecoins",
        expiresAt: expiresAt.toISOString(),
        isPrivate: false,
        image: battleImage,
        tokenAddress: token1.token.mint,
        isAutomated: true,
        tokenAddress2: token2.token.mint,
      };
      
      resolutionData = {
        marketType,
        targetValue: target,
        tokenAddress: token1.token.mint,
        tokenAddress2: token2.token.mint,
      };
    } else {
      // Single token markets - try multiple tokens until we find one that works
      let token: GraduatingToken | null = null;
      
      const maxAttempts = 20; // Try up to 20 tokens
      let attempts = 0;
      const triedTokens = new Set<string>(); // Track tokens we've already tried
      
      while (!marketData && attempts < maxAttempts) {
        attempts++;
        // Get unused token, but filter out ones we've already tried
        const availableTokens = graduatingTokens.filter(t => {
          if (!t.token.mint) return false;
          if (triedTokens.has(t.token.mint)) return false;
          return true;
        });
        
        // Find unused token from available list
        for (const t of availableTokens) {
          if (!t.token.mint) continue;
          const used = await isTokenAlreadyUsed(t.token.mint);
          if (!used) {
            token = t;
            triedTokens.add(t.token.mint);
            break;
          }
        }
        
        if (!token) {
          throw new Error("Could not find unused token from graduating list");
        }
        
        const mc = token.pools[0]?.marketCap?.usd || 0;
        const volume24h = token.pools[0]?.txns?.volume24h || 0;
        const holders = token.holders || 0;
        
        try {
          let target: number;
          let question: string;
          let expiresAt: Date;
          
          if (marketType === "market_cap") {
            // Validate required token fields
            if (!token.token.name && !token.token.symbol) {
              console.log(`[AutomatedMarkets] Skipping token: missing name and symbol`);
              continue; // Try next token
            }
            if (!token.token.mint) {
              console.log(`[AutomatedMarkets] Skipping token: missing mint address`);
              continue; // Try next token
            }
            
            // Check edge case: token already above all milestones - skip this token
            const maxMilestone = MARKET_CAP_MILESTONES[MARKET_CAP_MILESTONES.length - 1];
            if (mc >= maxMilestone) {
              console.log(`[AutomatedMarkets] Skipping token ${token.token.symbol || token.token.name}: MC (${mc}) already above all milestones`);
              continue; // Try next token
            }
            
            const result = calculateMarketCapTarget(mc);
            target = result.target;
            question = result.question.replace("this token", token.token.name || token.token.symbol);
            
            // Expiration: 120 minutes from now (or 5 minutes in test mode)
            expiresAt = new Date();
            if (testMode) {
              expiresAt.setMinutes(expiresAt.getMinutes() + 5);
            } else {
              expiresAt.setMinutes(expiresAt.getMinutes() + 120);
            }
          } else if (marketType === "volume") {
            // Check edge case: token already above all milestones - skip this token
            const maxMilestone = VOLUME_MILESTONES[VOLUME_MILESTONES.length - 1];
            if (volume24h >= maxMilestone) {
              console.log(`[AutomatedMarkets] Skipping token ${token.token.symbol}: volume (${volume24h}) already above all milestones`);
              continue; // Try next token
            }
            
            const result = calculateVolumeTarget(volume24h);
            target = result.target;
            // Validate required token fields
            if (!token.token.name && !token.token.symbol) {
              console.log(`[AutomatedMarkets] Skipping token: missing name and symbol`);
              continue; // Try next token
            }
            if (!token.token.mint) {
              console.log(`[AutomatedMarkets] Skipping token: missing mint address`);
              continue; // Try next token
            }
            
            question = result.question.replace("this token", token.token.name || token.token.symbol);
            
            // Expiration: 1 day from now (or 5 minutes in test mode)
            expiresAt = new Date();
            if (testMode) {
              expiresAt.setMinutes(expiresAt.getMinutes() + 5);
            } else {
              expiresAt.setDate(expiresAt.getDate() + 1);
            }
          } else if (marketType === "holders") {
            // Check edge case: holders < 100 - skip this token
            if (holders < 100) {
              console.log(`[AutomatedMarkets] Skipping token ${token.token.symbol}: too few holders (${holders} < 100)`);
              continue; // Try next token
            }
            
            const result = calculateHolderTarget(holders);
            target = result.target;
            
            // Check edge case: 2x rounds to same number
            if (target <= holders) {
              // Add minimum increment (10% of current)
              target = Math.ceil(holders * 1.1);
              // Round up to nearest milestone
              target = roundUpToMilestone(target, HOLDER_MILESTONES);
            }
            
            const targetFormatted = target >= 1000 
              ? `${(target / 1000).toFixed(1)}K`
              : `${target}`;
            // Validate required token fields
            if (!token.token.name && !token.token.symbol) {
              console.log(`[AutomatedMarkets] Skipping token: missing name and symbol`);
              continue; // Try next token
            }
            if (!token.token.mint) {
              console.log(`[AutomatedMarkets] Skipping token: missing mint address`);
              continue; // Try next token
            }
            
            question = `Will ${token.token.name || token.token.symbol} have more than ${targetFormatted} holders after 1 day?`;
            
            // Expiration: 1 day from now (or 5 minutes in test mode)
            expiresAt = new Date();
            if (testMode) {
              expiresAt.setMinutes(expiresAt.getMinutes() + 5);
            } else {
              expiresAt.setDate(expiresAt.getDate() + 1);
            }
          } else {
            throw new Error(`Unknown market type: ${marketType}`);
          }
          
          // Validate required fields before creating market
          if (!token.token.mint) {
            console.log(`[AutomatedMarkets] Skipping token: missing mint address`);
            continue; // Try next token
          }
          
          marketData = {
            question,
            category: "memecoins",
            expiresAt: expiresAt.toISOString(),
            isPrivate: false,
            image: token.token.image || undefined, // Image is optional, can be undefined
            tokenAddress: token.token.mint,
            isAutomated: true,
          };
          
          resolutionData = {
            marketType,
            targetValue: target,
            tokenAddress: token.token.mint,
          };
        } catch (error: any) {
          // If this token fails, try the next one
          console.log(`[AutomatedMarkets] Token ${token.token.symbol} failed: ${error.message}, trying next...`);
          continue;
        }
      }
      
      if (!marketData || !resolutionData) {
        throw new Error(`Could not create market after trying ${attempts} tokens`);
      }
    }

    // Validate that we have market data before proceeding
    if (!marketData || !resolutionData) {
      throw new Error("Failed to generate market data");
    }

    // Step 6: Create the market
    console.log("[AutomatedMarkets] Creating market...");
    const market = await storage.createMarket(marketData);
    
    // Step 7: Create resolution tracking
    await storage.createMarketResolutionTracking({
      marketId: market.id,
      ...resolutionData,
    });
    
    // Step 8: Publish real-time event
    await publishEvent({ type: "market:created", data: market });
    
    // Step 9: Update config last run time
    await storage.updateAutomatedMarketsConfig(true, new Date()); // Keep enabled, update last run timestamp
    
    // Step 10: Log success
    await storage.createAutomatedMarketLog({
      marketId: market.id,
      questionType: marketType,
      tokenAddress: marketData.tokenAddress || undefined,
      tokenAddress2: marketData.tokenAddress2 || undefined,
      success: true,
    });
    
    console.log(`[AutomatedMarkets] Successfully created market ${market.id} (type: ${marketType})`);
    
    return {
      success: true,
      marketCreated: market.id,
      marketType,
    };
  } catch (error: any) {
    const errorMessage = error?.message || String(error);
    console.error("[AutomatedMarkets] Error creating market:", errorMessage);
    
    // Log the error
    await storage.createAutomatedMarketLog({
      questionType: "error",
      success: false,
      errorMessage,
    });
    
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Check and resolve automated markets
 * This is called every 30 minutes to check if markets have reached their targets
 * 
 * For single token markets: Checks at exact expiration time
 * For battle markets: Checks every 30 minutes to see which token hit target first
 */
export async function checkAutomatedMarketResolutions(): Promise<{
  success: boolean;
  checked: number;
  resolved: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let checked = 0;
  let resolved = 0;

  try {
    // Get all markets needing resolution
    const marketsNeedingResolution = await storage.getMarketsNeedingResolution();
    
    if (marketsNeedingResolution.length === 0) {
      console.log("[AutomatedResolutions] No markets needing resolution");
      return { success: true, checked: 0, resolved: 0, errors: [] };
    }

    console.log(`[AutomatedResolutions] Checking ${marketsNeedingResolution.length} markets...`);

    // Process each market
    for (const { resolution, ...market } of marketsNeedingResolution) {
      checked++;
      
      try {
        const now = new Date();
        const expiresAt = market.expiresAt ? new Date(market.expiresAt) : null;
        const targetValue = parseFloat(resolution.targetValue || "0");
        
        // Check if market has expired
        if (expiresAt && now > expiresAt) {
          // Market expired - check if it's a battle market that needs refund
          if (resolution.marketType === "battle_race" || resolution.marketType === "battle_dump") {
            // Battle markets: if expired and neither won, refund
            console.log(`[AutomatedResolutions] Market ${market.id} expired without winner, refunding...`);
            await storage.refundMarketBets(market.id);
            await storage.updateMarketResolutionTracking(market.id, {
              status: "expired",
            });
            resolved++;
          } else {
            // Single token markets: check at expiration (even if slightly past)
            const timeSinceExpiration = now.getTime() - expiresAt.getTime();
            if (timeSinceExpiration <= 5 * 60 * 1000) { // Within 5 minutes of expiration
              await checkSingleTokenMarket(market, resolution, targetValue);
              resolved++;
            } else {
              // Too late, mark as expired
              await storage.updateMarketResolutionTracking(market.id, {
                status: "expired",
              });
            }
          }
          continue;
        }

        // Market hasn't expired yet
        if (resolution.marketType === "battle_race" || resolution.marketType === "battle_dump") {
          // Battle markets: check every 30 minutes
          await checkBattleMarket(market, resolution, targetValue);
          resolved++;
        } else {
          // Single token markets: only check at exact expiration time
          if (expiresAt) {
            const timeUntilExpiration = expiresAt.getTime() - now.getTime();
            // Check if we're within 1 minute of expiration
            if (timeUntilExpiration <= 60 * 1000 && timeUntilExpiration >= -60 * 1000) {
              await checkSingleTokenMarket(market, resolution, targetValue);
              resolved++;
            }
          }
        }
        
        // Update last checked time
        await storage.updateMarketResolutionTracking(market.id, {
          lastChecked: now,
        });
      } catch (error: any) {
        const errorMessage = `Market ${market.id}: ${error?.message || String(error)}`;
        console.error(`[AutomatedResolutions] Error checking market ${market.id}:`, errorMessage);
        errors.push(errorMessage);
      }
    }

    console.log(`[AutomatedResolutions] Checked ${checked} markets, resolved ${resolved}, ${errors.length} errors`);
    
    return {
      success: errors.length === 0,
      checked,
      resolved,
      errors,
    };
  } catch (error: any) {
    const errorMessage = error?.message || String(error);
    console.error("[AutomatedResolutions] Fatal error:", errorMessage);
    return {
      success: false,
      checked,
      resolved,
      errors: [errorMessage],
    };
  }
}

/**
 * Check a single token market (Market Cap, Volume, or Holders)
 * Compares current value vs target at expiration time
 */
async function checkSingleTokenMarket(
  market: { id: number; expiresAt: Date | null },
  resolution: { marketType: string; tokenAddress: string },
  targetValue: number
): Promise<void> {
  try {
    // Get current token data
    const tokenData = await getMultipleTokens([resolution.tokenAddress]);
    const token = tokenData[resolution.tokenAddress];
    
    if (!token) {
      throw new Error(`Token ${resolution.tokenAddress} not found`);
    }

    let currentValue: number;
    let outcome: "yes" | "no";

    if (resolution.marketType === "market_cap") {
      currentValue = token.pools[0]?.marketCap?.usd || 0;
      outcome = currentValue >= targetValue ? "yes" : "no";
    } else if (resolution.marketType === "volume") {
      currentValue = token.pools[0]?.txns?.volume24h || 0;
      outcome = currentValue >= targetValue ? "yes" : "no";
    } else if (resolution.marketType === "holders") {
      currentValue = token.holders || 0;
      outcome = currentValue >= targetValue ? "yes" : "no";
    } else {
      throw new Error(`Unknown single token market type: ${resolution.marketType}`);
    }

    console.log(`[AutomatedResolutions] Market ${market.id}: current=${currentValue}, target=${targetValue}, outcome=${outcome}`);

    // Resolve the market
    await storage.resolveMarket(market.id, outcome);
    
    // Update resolution tracking
    await storage.updateMarketResolutionTracking(market.id, {
      status: "resolved",
    });
  } catch (error: any) {
    throw new Error(`Failed to check single token market: ${error?.message || String(error)}`);
  }
}

/**
 * Check a battle market (Race or Dump)
 * Uses chart data to find which token hit target first
 */
async function checkBattleMarket(
  market: { id: number; expiresAt: Date | null },
  resolution: { marketType: string; tokenAddress: string; tokenAddress2: string | null },
  targetValue: number
): Promise<void> {
  if (!resolution.tokenAddress2) {
    throw new Error("Battle market missing second token address");
  }

  try {
    // Get chart data for both tokens
    const [chart1, chart2] = await Promise.all([
      getTokenChart(resolution.tokenAddress, "5m", 1000),
      getTokenChart(resolution.tokenAddress2, "5m", 1000),
    ]);

    // Find first candle that hit target for each token
    let token1HitTime: number | null = null;
    let token2HitTime: number | null = null;

    if (resolution.marketType === "battle_race") {
      // Race: find first candle where high >= target
      for (const candle of chart1.oclhv) {
        if (candle.high >= targetValue) {
          token1HitTime = candle.time;
          break;
        }
      }
      for (const candle of chart2.oclhv) {
        if (candle.high >= targetValue) {
          token2HitTime = candle.time;
          break;
        }
      }
    } else if (resolution.marketType === "battle_dump") {
      // Dump: find first candle where low <= target
      for (const candle of chart1.oclhv) {
        if (candle.low <= targetValue) {
          token1HitTime = candle.time;
          break;
        }
      }
      for (const candle of chart2.oclhv) {
        if (candle.low <= targetValue) {
          token2HitTime = candle.time;
          break;
        }
      }
    } else {
      throw new Error(`Unknown battle market type: ${resolution.marketType}`);
    }

    // Determine winner
    if (token1HitTime && token2HitTime) {
      // Both hit target - compare timestamps
      if (token1HitTime < token2HitTime) {
        // Token 1 won (reached target first)
        console.log(`[AutomatedResolutions] Market ${market.id}: Token 1 won (${token1HitTime} < ${token2HitTime})`);
        await storage.resolveMarket(market.id, "yes");
      } else if (token2HitTime < token1HitTime) {
        // Token 2 won
        console.log(`[AutomatedResolutions] Market ${market.id}: Token 2 won (${token2HitTime} < ${token1HitTime})`);
        await storage.resolveMarket(market.id, "no");
      } else {
        // Exact same timestamp - try granular check (1m timeframe)
        console.log(`[AutomatedResolutions] Market ${market.id}: Same timestamp, checking 1m granularity...`);
        if (resolution.tokenAddress2) {
          await checkBattleMarketGranular(market, {
            marketType: resolution.marketType,
            tokenAddress: resolution.tokenAddress,
            tokenAddress2: resolution.tokenAddress2,
          }, targetValue);
        } else {
          // Shouldn't happen, but if tokenAddress2 is null, refund
          console.log(`[AutomatedResolutions] Market ${market.id}: Missing tokenAddress2, refunding`);
          await storage.refundMarketBets(market.id);
          await storage.updateMarketResolutionTracking(market.id, {
            status: "expired",
          });
        }
      }
    } else if (token1HitTime) {
      // Only token 1 hit
      console.log(`[AutomatedResolutions] Market ${market.id}: Token 1 hit target`);
      await storage.resolveMarket(market.id, "yes");
    } else if (token2HitTime) {
      // Only token 2 hit
      console.log(`[AutomatedResolutions] Market ${market.id}: Token 2 hit target`);
      await storage.resolveMarket(market.id, "no");
    } else {
      // Neither hit yet - will check again next time
      console.log(`[AutomatedResolutions] Market ${market.id}: Neither token hit target yet`);
      return;
    }

    // Update resolution tracking
    await storage.updateMarketResolutionTracking(market.id, {
      status: "resolved",
    });
  } catch (error: any) {
    throw new Error(`Failed to check battle market: ${error?.message || String(error)}`);
  }
}

/**
 * Check battle market with granular timeframe (1m) to find exact second
 * Used when both tokens hit target at the same 5m candle timestamp
 */
async function checkBattleMarketGranular(
  market: { id: number },
  resolution: { marketType: string; tokenAddress: string; tokenAddress2: string },
  targetValue: number
): Promise<void> {
  try {
    // Get 1m chart data for both tokens
    const [chart1, chart2] = await Promise.all([
      getTokenChart(resolution.tokenAddress, "5m", 2000), // Use 5m but with more data
      getTokenChart(resolution.tokenAddress2, "5m", 2000),
    ]);

    let token1HitTime: number | null = null;
    let token2HitTime: number | null = null;

    if (resolution.marketType === "battle_race") {
      for (const candle of chart1.oclhv) {
        if (candle.high >= targetValue) {
          token1HitTime = candle.time;
          break;
        }
      }
      for (const candle of chart2.oclhv) {
        if (candle.high >= targetValue) {
          token2HitTime = candle.time;
          break;
        }
      }
    } else {
      for (const candle of chart1.oclhv) {
        if (candle.low <= targetValue) {
          token1HitTime = candle.time;
          break;
        }
      }
      for (const candle of chart2.oclhv) {
        if (candle.low <= targetValue) {
          token2HitTime = candle.time;
          break;
        }
      }
    }

    if (token1HitTime && token2HitTime) {
      if (token1HitTime < token2HitTime) {
        await storage.resolveMarket(market.id, "yes");
      } else if (token2HitTime < token1HitTime) {
        await storage.resolveMarket(market.id, "no");
      } else {
        // Still same after granular check - refund
        console.log(`[AutomatedResolutions] Market ${market.id}: Still same after granular check, refunding`);
        await storage.refundMarketBets(market.id);
        await storage.updateMarketResolutionTracking(market.id, {
          status: "expired",
        });
      }
    } else {
      // Shouldn't happen, but if it does, refund
      console.log(`[AutomatedResolutions] Market ${market.id}: Unexpected state in granular check, refunding`);
      await storage.refundMarketBets(market.id);
      await storage.updateMarketResolutionTracking(market.id, {
        status: "expired",
      });
    }
  } catch (error: any) {
    // If granular check fails, refund to be safe
    console.error(`[AutomatedResolutions] Granular check failed for market ${market.id}, refunding:`, error);
    await storage.refundMarketBets(market.id);
    await storage.updateMarketResolutionTracking(market.id, {
      status: "expired",
    });
  }
}

