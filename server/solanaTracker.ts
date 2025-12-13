/**
 * Solana Tracker API Integration
 * 
 * API Documentation: https://docs.solanatracker.io/data-api/tokens/get-token-information
 * Base URL: https://data.solanatracker.io
 */

interface TokenInfo {
  token: {
    name: string;
    symbol: string;
    mint: string;
    uri: string;
    decimals: number;
    description: string;
    image: string;
    hasFileMetaData: boolean;
    strictSocials: Record<string, unknown>;
    creation: {
      creator: string;
      created_tx: string;
      created_time: number;
    };
  };
  pools: Array<{
    poolId: string;
    liquidity: {
      quote: number;
      usd: number;
    };
    price: {
      quote: number;
      usd: number;
    };
    tokenSupply: number;
    lpBurn: number;
    tokenAddress: string;
    marketCap: {
      quote: number;
      usd: number;
    };
    market: string;
    quoteToken: string;
    decimals: number;
    security: {
      freezeAuthority: string | null;
      mintAuthority: string | null;
    };
    lastUpdated?: number;
    createdAt?: number;
    deployer?: string | null;
    txns: {
      buys: number;
      sells: number;
      total: number;
      volume: number;
      volume24h: number;
    };
  }>;
  events: Record<string, { priceChangePercentage: number }>;
  risk: {
    snipers: {
      count: number;
      totalBalance: number;
      totalPercentage: number;
      wallets: string[];
    };
    insiders: {
      count: number;
      totalBalance: number;
      totalPercentage: number;
      wallets: string[];
    };
    top10: number;
    dev: {
      percentage: number;
      amount: number;
    };
    fees: Record<string, number>;
    rugged: boolean;
    risks: string[];
    score: number;
    jupiterVerified: boolean;
  };
  buys: number;
  sells: number;
  txns: number;
  holders: number;
}

const BASE_URL = "https://data.solanatracker.io";

/**
 * Get API key from environment variables
 */
function getApiKey(): string {
  const apiKey = process.env.SOLANA_TRACKER_KEY || process.env.VITE_SOLANA_TRACKER_KEY;
  if (!apiKey) {
    throw new Error("SOLANA_TRACKER_KEY environment variable is not set");
  }
  return apiKey;
}

/**
 * Get token information by contract address
 * 
 * @param tokenAddress - Solana token contract address (mint address)
 * @returns Token information including image, name, symbol, etc.
 * @throws Error if API key is missing or request fails
 */
export async function getTokenInfo(tokenAddress: string): Promise<TokenInfo> {
  const apiKey = getApiKey();
  
  // Validate token address format (basic Solana address validation)
  if (!tokenAddress || tokenAddress.length < 32 || tokenAddress.length > 44) {
    throw new Error("Invalid token address format");
  }

  const url = `${BASE_URL}/tokens/${tokenAddress}`;
  
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "x-api-key": apiKey,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `Failed to fetch token info: ${response.status} ${response.statusText}`;
      
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.message || errorJson.error || errorMessage;
      } catch {
        // If error response is not JSON, use the text
        if (errorText) {
          errorMessage = `${errorMessage} - ${errorText}`;
        }
      }
      
      throw new Error(errorMessage);
    }

    const data = await response.json() as TokenInfo;
    return data;
  } catch (error: any) {
    // Re-throw with more context if it's not already an Error
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(`Failed to fetch token information: ${error.message || String(error)}`);
  }
}

/**
 * Get token image URL from token information
 * 
 * @param tokenAddress - Solana token contract address
 * @returns Image URL or null if not available
 */
export async function getTokenImage(tokenAddress: string): Promise<string | null> {
  try {
    const tokenInfo = await getTokenInfo(tokenAddress);
    return tokenInfo.token.image || null;
  } catch (error) {
    console.error(`[SolanaTracker] Error fetching token image:`, error);
    return null;
  }
}

/**
 * Validate token address format (basic validation)
 * 
 * @param tokenAddress - Token address to validate
 * @returns true if address appears to be valid
 */
export function isValidTokenAddress(tokenAddress: string): boolean {
  if (!tokenAddress || typeof tokenAddress !== "string") {
    return false;
  }
  
  // Solana addresses are base58 encoded and typically 32-44 characters
  const trimmed = tokenAddress.trim();
  if (trimmed.length < 32 || trimmed.length > 44) {
    return false;
  }
  
  // Basic check: should only contain base58 characters (alphanumeric except 0, O, I, l)
  const base58Regex = /^[1-9A-HJ-NP-Za-km-z]+$/;
  return base58Regex.test(trimmed);
}

/**
 * Trending Token Info (from /tokens/trending endpoint)
 * Simplified structure for what we need from trending tokens
 */
export interface TrendingToken {
  token: {
    name: string;
    symbol: string;
    mint: string;
    image: string;
    creation: {
      created_time: number; // Unix timestamp in seconds
    };
  };
  pools: Array<{
    marketCap: {
      usd: number;
    };
    txns: {
      volume: number; // 5min volume
      volume24h: number;
    };
  }>;
  holders: number;
}

/**
 * Get trending tokens from Solana Tracker API
 * Returns top 100 trending tokens with their current metrics
 * 
 * @returns Array of trending tokens
 * @throws Error if API key is missing or request fails
 */
export async function getTrendingTokens(): Promise<TrendingToken[]> {
  const apiKey = getApiKey();
  const url = `${BASE_URL}/tokens/trending`;
  
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "x-api-key": apiKey,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `Failed to fetch trending tokens: ${response.status} ${response.statusText}`;
      
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.message || errorJson.error || errorMessage;
      } catch {
        if (errorText) {
          errorMessage = `${errorMessage} - ${errorText}`;
        }
      }
      
      throw new Error(errorMessage);
    }

    const data = await response.json() as TrendingToken[];
    return data;
  } catch (error: any) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(`Failed to fetch trending tokens: ${error.message || String(error)}`);
  }
}

/**
 * Get multiple tokens in a single batch request
 * More efficient than calling getTokenInfo() multiple times
 * 
 * @param tokenAddresses - Array of token addresses (max 20 per request)
 * @returns Object with token addresses as keys and TokenInfo as values
 * @throws Error if API key is missing, too many tokens, or request fails
 */
export async function getMultipleTokens(tokenAddresses: string[]): Promise<Record<string, TokenInfo>> {
  const apiKey = getApiKey();
  
  // Validate input
  if (!Array.isArray(tokenAddresses) || tokenAddresses.length === 0) {
    throw new Error("tokenAddresses must be a non-empty array");
  }
  
  if (tokenAddresses.length > 20) {
    throw new Error("Maximum 20 tokens per batch request");
  }
  
  // Validate all addresses
  for (const address of tokenAddresses) {
    if (!isValidTokenAddress(address)) {
      throw new Error(`Invalid token address: ${address}`);
    }
  }
  
  const url = `${BASE_URL}/tokens/multi`;
  
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        tokens: tokenAddresses,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `Failed to fetch multiple tokens: ${response.status} ${response.statusText}`;
      
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.message || errorJson.error || errorMessage;
      } catch {
        if (errorText) {
          errorMessage = `${errorMessage} - ${errorText}`;
        }
      }
      
      throw new Error(errorMessage);
    }

    const data = await response.json() as { tokens: Record<string, TokenInfo> };
    return data.tokens;
  } catch (error: any) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(`Failed to fetch multiple tokens: ${error.message || String(error)}`);
  }
}

/**
 * OHLCV Candle structure from chart endpoint
 */
export interface OHLCVCandle {
  open: number;
  close: number;
  low: number;
  high: number;
  volume: number;
  time: number; // Unix timestamp in seconds
}

/**
 * Chart data response structure
 */
export interface TokenChartData {
  oclhv: OHLCVCandle[]; // Note: API uses "oclhv" (typo) instead of "ohlcv"
}

/**
 * Get token chart/OHLCV data for a specific timeframe
 * Used for battle market resolution to find when tokens hit targets
 * 
 * @param tokenAddress - Solana token contract address
 * @param timeframe - Timeframe: "5m", "15m", "1h", "4h", "1d"
 * @param limit - Maximum number of candles to return (default: 1000)
 * @returns Chart data with OHLCV candles
 * @throws Error if API key is missing, invalid address, or request fails
 */
export async function getTokenChart(
  tokenAddress: string,
  timeframe: "5m" | "15m" | "1h" | "4h" | "1d" = "5m",
  limit: number = 1000
): Promise<TokenChartData> {
  const apiKey = getApiKey();
  
  // Validate token address
  if (!isValidTokenAddress(tokenAddress)) {
    throw new Error("Invalid token address format");
  }
  
  // Validate timeframe
  const validTimeframes = ["5m", "15m", "1h", "4h", "1d"];
  if (!validTimeframes.includes(timeframe)) {
    throw new Error(`Invalid timeframe. Must be one of: ${validTimeframes.join(", ")}`);
  }
  
  // Validate limit
  if (limit < 1 || limit > 1000) {
    throw new Error("Limit must be between 1 and 1000");
  }
  
  const url = `${BASE_URL}/chart/${tokenAddress}?timeframe=${timeframe}&limit=${limit}`;
  
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "x-api-key": apiKey,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `Failed to fetch chart data: ${response.status} ${response.statusText}`;
      
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.message || errorJson.error || errorMessage;
      } catch {
        if (errorText) {
          errorMessage = `${errorMessage} - ${errorText}`;
        }
      }
      
      throw new Error(errorMessage);
    }

    const data = await response.json() as TokenChartData;
    return data;
  } catch (error: any) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(`Failed to fetch chart data: ${error.message || String(error)}`);
  }
}

