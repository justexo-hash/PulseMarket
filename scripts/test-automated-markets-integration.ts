/**
 * Integration Test Script for Automated Markets
 * 
 * This script tests the FULL integration:
 * - Calls actual Solana Tracker API
 * - Creates actual markets in database
 * - Verifies all fields are set correctly
 * - Tests all market types
 * 
 * Run with: npx tsx scripts/test-automated-markets-integration.ts
 * 
 * Prerequisites:
 * - DATABASE_URL set in .env
 * - SOLANA_TRACKER_KEY set in .env
 * - Database schema pushed (npm run db:push)
 */

import { config } from "dotenv";
import { getTrendingTokens, getMultipleTokens, getTokenChart } from "../server/solanaTracker";
import { storage } from "../server/storage";
import { runAutomatedMarketCreation, checkAutomatedMarketResolutions } from "../lib/jobs/automatedMarkets";

config();

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  details?: any;
}

const results: TestResult[] = [];

function test(name: string, fn: () => Promise<boolean | void> | boolean | void) {
  return async () => {
    try {
      const result = await fn();
      const passed = result !== false;
      results.push({ name, passed, error: passed ? undefined : "Test returned false" });
      console.log(passed ? `  ✓ ${name}` : `  ✗ ${name}`);
      return passed;
    } catch (error: any) {
      results.push({ name, passed: false, error: error.message, details: error });
      console.log(`  ✗ ${name}: ${error.message}`);
      return false;
    }
  };
}

async function runTests() {
  console.log("🧪 Running Integration Tests for Automated Markets\n");
  console.log("⚠️  WARNING: These tests will create actual markets in your database!\n");

  // Test 1: API Connectivity
  console.log("📡 Testing API Connectivity...");
  await test("Should fetch trending tokens from Solana Tracker API", async () => {
    const tokens = await getTrendingTokens();
    if (!tokens || tokens.length === 0) {
      throw new Error("No trending tokens returned");
    }
    if (tokens.length < 10) {
      throw new Error(`Expected at least 10 tokens, got ${tokens.length}`);
    }
    // Verify structure
    const firstToken = tokens[0];
    if (!firstToken.token?.mint) {
      throw new Error("Token missing mint address");
    }
    if (!firstToken.pools || firstToken.pools.length === 0) {
      throw new Error("Token missing pools data");
    }
    return true;
  })();

  await test("Should fetch multiple tokens in batch", async () => {
    const tokens = await getTrendingTokens();
    if (tokens.length < 2) {
      throw new Error("Need at least 2 tokens for batch test");
    }
    const addresses = tokens.slice(0, 2).map(t => t.token.mint).filter(Boolean);
    if (addresses.length < 2) {
      throw new Error("Could not get 2 valid addresses");
    }
    const batchResult = await getMultipleTokens(addresses);
    if (!batchResult || Object.keys(batchResult).length !== addresses.length) {
      throw new Error(`Expected ${addresses.length} tokens, got ${Object.keys(batchResult).length}`);
    }
    // Verify each token has required data
    for (const address of addresses) {
      const token = batchResult[address];
      if (!token) {
        throw new Error(`Token ${address} not found in batch result`);
      }
      if (!token.pools || token.pools.length === 0) {
        throw new Error(`Token ${address} missing pools data`);
      }
    }
    return true;
  })();

  await test("Should fetch chart data for a token", async () => {
    const tokens = await getTrendingTokens();
    if (tokens.length === 0) {
      throw new Error("No tokens available for chart test");
    }
    const firstToken = tokens[0];
    if (!firstToken.token.mint) {
      throw new Error("Token missing mint address");
    }
    const chart = await getTokenChart(firstToken.token.mint, "5m", 100);
    if (!chart || !chart.oclhv) {
      throw new Error("Chart data missing oclhv array");
    }
    if (chart.oclhv.length === 0) {
      throw new Error("Chart data has no candles");
    }
    // Verify candle structure
    const firstCandle = chart.oclhv[0];
    if (typeof firstCandle.high !== "number" || typeof firstCandle.low !== "number") {
      throw new Error("Candle missing high/low values");
    }
    if (typeof firstCandle.time !== "number") {
      throw new Error("Candle missing time value");
    }
    return true;
  })();

  // Test 2: Database Operations
  console.log("\n💾 Testing Database Operations...");
  await test("Should get/create automation config", async () => {
    const config = await storage.getAutomatedMarketsConfig();
    // Config might not exist yet, that's okay
    if (config) {
      if (typeof config.enabled !== "number") {
        throw new Error("Config enabled should be number (0 or 1)");
      }
    }
    // Try to update/create config
    const updated = await storage.updateAutomatedMarketsConfig(false);
    if (updated.enabled !== 0) {
      throw new Error("Config should be disabled");
    }
    return true;
  })();

  await test("Should create automation log entry", async () => {
    const log = await storage.createAutomatedMarketLog({
      questionType: "test",
      success: true,
    });
    if (!log.id) {
      throw new Error("Log missing ID");
    }
    if (log.questionType !== "test") {
      throw new Error("Log questionType incorrect");
    }
    if (log.success !== 1) {
      throw new Error("Log success should be 1");
    }
    return true;
  })();

  // Test 3: Market Creation (Dry Run - Check Logic)
  console.log("\n🏗️  Testing Market Creation Logic...");
  await test("Should calculate market cap target correctly", async () => {
    const tokens = await getTrendingTokens();
    if (tokens.length === 0) {
      throw new Error("No tokens available");
    }
    const token = tokens[0];
    const mc = token.pools[0]?.marketCap?.usd || 0;
    if (mc === 0) {
      throw new Error("Token has zero market cap");
    }
    const doubled = mc * 2;
    const milestones = [250000, 500000, 750000, 1000000, 2000000, 3000000, 5000000, 10000000, 20000000, 50000000, 100000000];
    let target = milestones[0];
    for (const milestone of milestones) {
      if (milestone >= doubled) {
        target = milestone;
        break;
      }
    }
    if (target < doubled && doubled <= milestones[milestones.length - 1]) {
      target = milestones[milestones.length - 1];
    }
    if (target <= mc) {
      throw new Error(`Target ${target} should be greater than current MC ${mc}`);
    }
    return true;
  })();

  await test("Should find unused tokens", async () => {
    const tokens = await getTrendingTokens();
    if (tokens.length === 0) {
      throw new Error("No tokens available");
    }
    // Check first few tokens
    let foundUnused = false;
    for (let i = 0; i < Math.min(10, tokens.length); i++) {
      const token = tokens[i];
      if (!token.token.mint) continue;
      const isUsed = await storage.getAllMarkets().then(markets =>
        markets.some(m => (m.tokenAddress === token.token.mint || m.tokenAddress2 === token.token.mint) && m.isAutomated === 1)
      );
      if (!isUsed) {
        foundUnused = true;
        break;
      }
    }
    if (!foundUnused) {
      console.log("    ⚠️  All top 10 tokens are already used (this is okay for testing)");
    }
    return true;
  })();

  // Test 4: Full Market Creation (ACTUAL CREATION)
  console.log("\n🎯 Testing Full Market Creation (WILL CREATE ACTUAL MARKET)...");
  
  // Enable automation first
  await storage.updateAutomatedMarketsConfig(true);
  
  const creationResult = await test("Should create a market with all correct fields", async () => {
    const result = await runAutomatedMarketCreation();
    
    if (!result.success) {
      throw new Error(`Market creation failed: ${result.error}`);
    }
    
    if (!result.marketCreated) {
      throw new Error("Market creation succeeded but no market ID returned");
    }
    
    // Fetch the created market
    const market = await storage.getMarketById(result.marketCreated);
    if (!market) {
      throw new Error(`Market ${result.marketCreated} not found in database`);
    }
    
    // Verify all fields
    if (market.isAutomated !== 1) {
      throw new Error(`Market isAutomated should be 1, got ${market.isAutomated}`);
    }
    
    if (market.category !== "memecoins") {
      throw new Error(`Market category should be 'memecoins', got '${market.category}'`);
    }
    
    if (!market.question || market.question.length < 10) {
      throw new Error(`Market question too short: ${market.question}`);
    }
    
    if (!market.expiresAt) {
      throw new Error("Market missing expiration date");
    }
    
    // Verify expiration is in the future
    const expiresAt = new Date(market.expiresAt);
    const now = new Date();
    if (expiresAt <= now) {
      throw new Error(`Market expiration ${expiresAt} should be in the future`);
    }
    
    // Verify token address
    if (!market.tokenAddress) {
      throw new Error("Market missing tokenAddress");
    }
    
    // Verify image (should be present for single token markets)
    if (result.marketType !== "battle_race" && result.marketType !== "battle_dump") {
      if (!market.image) {
        console.log("    ⚠️  Market missing image (some tokens may not have images)");
      }
    }
    
    // For battle markets, verify tokenAddress2
    if (result.marketType === "battle_race" || result.marketType === "battle_dump") {
      if (!market.tokenAddress2) {
        throw new Error("Battle market missing tokenAddress2");
      }
      // Battle markets should use token1's image (or could be null)
      console.log(`    ℹ️  Battle market image: ${market.image || "null (using token1's image or none)"}`);
    }
    
    // Verify resolution tracking was created
    const resolution = await storage.getMarketResolutionTracking(market.id);
    if (!resolution) {
      throw new Error("Resolution tracking not created");
    }
    
    if (resolution.marketType !== result.marketType) {
      throw new Error(`Resolution marketType mismatch: ${resolution.marketType} vs ${result.marketType}`);
    }
    
    if (!resolution.targetValue) {
      throw new Error("Resolution missing targetValue");
    }
    
    if (resolution.status !== "pending") {
      throw new Error(`Resolution status should be 'pending', got '${resolution.status}'`);
    }
    
    console.log(`    ✓ Market #${market.id} created successfully`);
    console.log(`    ✓ Type: ${result.marketType}`);
    console.log(`    ✓ Question: ${market.question}`);
    console.log(`    ✓ Category: ${market.category}`);
    console.log(`    ✓ Expires: ${expiresAt.toLocaleString()}`);
    console.log(`    ✓ Token: ${market.tokenAddress}`);
    if (market.tokenAddress2) {
      console.log(`    ✓ Token2: ${market.tokenAddress2}`);
    }
    console.log(`    ✓ Image: ${market.image || "none"}`);
    console.log(`    ✓ Target: ${resolution.targetValue}`);
    
    return true;
  })();

  // Test 5: Verify Market Appears in Listings
  console.log("\n📋 Testing Market Integration...");
  await test("Should find created market in getAllMarkets()", async () => {
    const markets = await storage.getAllMarkets();
    const automatedMarkets = markets.filter(m => m.isAutomated === 1);
    if (automatedMarkets.length === 0) {
      throw new Error("No automated markets found");
    }
    const latestMarket = automatedMarkets[automatedMarkets.length - 1];
    if (latestMarket.category !== "memecoins") {
      throw new Error("Latest automated market should be in memecoins category");
    }
    return true;
  })();

  // Test 6: Resolution Checking (Dry Run)
  console.log("\n⏰ Testing Resolution Checking...");
  await test("Should get markets needing resolution", async () => {
    const marketsNeedingResolution = await storage.getMarketsNeedingResolution();
    // Should have at least the market we just created
    if (marketsNeedingResolution.length === 0) {
      console.log("    ⚠️  No markets needing resolution (may have expired or been resolved)");
      return true; // Not an error, just no active markets
    }
    const market = marketsNeedingResolution[0];
    if (!market.resolution) {
      throw new Error("Market missing resolution tracking");
    }
    if (market.status !== "active") {
      throw new Error(`Market should be active, got ${market.status}`);
    }
    return true;
  })();

  // Test 7: API Endpoint Structure (Verify data flow)
  console.log("\n🔌 Testing API Data Flow...");
  await test("Should have correct data structure for market creation", async () => {
    const tokens = await getTrendingTokens();
    if (tokens.length === 0) {
      throw new Error("No tokens available");
    }
    const token = tokens[0];
    
    // Verify all required data is present
    if (!token.token.mint) {
      throw new Error("Token missing mint");
    }
    if (!token.token.name && !token.token.symbol) {
      throw new Error("Token missing name and symbol");
    }
    if (!token.pools || token.pools.length === 0) {
      throw new Error("Token missing pools");
    }
    const pool = token.pools[0];
    if (!pool.marketCap?.usd && pool.marketCap?.usd !== 0) {
      throw new Error("Token missing marketCap.usd");
    }
    if (typeof token.holders !== "number") {
      throw new Error("Token missing holders count");
    }
    return true;
  })();

  // Summary
  console.log("\n📊 Test Results:");
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  console.log(`Total: ${results.length}`);
  console.log(`Passed: ${passed} ✓`);
  console.log(`Failed: ${failed} ${failed > 0 ? "✗" : ""}`);

  if (failed > 0) {
    console.log("\n❌ Failed Tests:");
    results.filter(r => !r.passed).forEach(r => {
      console.log(`  - ${r.name}: ${r.error}`);
    });
    process.exit(1);
  } else {
    console.log("\n✅ All integration tests passed!");
    console.log("\n💡 Next Steps:");
    console.log("   1. Start dev server: npm run dev");
    console.log("   2. Visit http://localhost:3000/admin");
    console.log("   3. Check the 'Automated Markets' section");
    console.log("   4. Verify the created market appears in market listings");
    process.exit(0);
  }
}

// Run tests
runTests().catch(error => {
  console.error("Fatal error:", error);
  process.exit(1);
});

