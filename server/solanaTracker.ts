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

/**
 * Search Token Result (from /search endpoint)
 */
export interface SearchTokenResult {
  name: string;
  symbol: string;
  mint: string;
  decimals: number;
  image: string;
  holders: number;
  jupiter: boolean;
  verified: boolean;
  liquidityUsd: number;
  marketCapUsd: number;
  priceUsd: number;
  volume: number;
  volume_5m: number;
  volume_15m: number;
  volume_30m: number;
  volume_1h: number;
  volume_6h: number;
  volume_12h: number;
  volume_24h: number;
  tokenDetails: {
    creator: string;
    tx: string;
    time: number; // Unix timestamp in milliseconds
  };
}

/**
 * Search Token Response
 */
export interface SearchTokenResponse {
  status: string;
  data: SearchTokenResult[];
  total: number;
  pages: number;
  page: number;
  nextCursor?: string;
  hasMore: boolean;
}

/**
 * Search tokens by symbol, name, or address
 * 
 * @param query - Search term for token symbol, name, or address
 * @param options - Optional search parameters (sortBy, sortOrder, limit, etc.)
 * @returns Search results with tokens matching the query
 * @throws Error if API key is missing or request fails
 */
export async function searchTokens(
  query: string,
  options?: {
    sortBy?: string;
    sortOrder?: "asc" | "desc";
    limit?: number;
    page?: number;
    minMarketCap?: number;
    maxMarketCap?: number;
    minVolume?: number;
    minHolders?: number;
  }
): Promise<SearchTokenResponse> {
  const apiKey = getApiKey();
  
  if (!query || query.trim().length === 0) {
    throw new Error("Search query cannot be empty");
  }

  const url = new URL(`${BASE_URL}/search`);
  url.searchParams.set("query", query.trim());
  
  if (options) {
    if (options.sortBy) url.searchParams.set("sortBy", options.sortBy);
    if (options.sortOrder) url.searchParams.set("sortOrder", options.sortOrder);
    if (options.limit) url.searchParams.set("limit", options.limit.toString());
    if (options.page) url.searchParams.set("page", options.page.toString());
    if (options.minMarketCap) url.searchParams.set("minMarketCap", options.minMarketCap.toString());
    if (options.maxMarketCap) url.searchParams.set("maxMarketCap", options.maxMarketCap.toString());
    if (options.minVolume) url.searchParams.set("minVolume", options.minVolume.toString());
    if (options.minHolders) url.searchParams.set("minHolders", options.minHolders.toString());
  }

  try {
    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "x-api-key": apiKey,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `Failed to search tokens: ${response.status} ${response.statusText}`;
      
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

    const data = await response.json() as SearchTokenResponse;
    return data;
  } catch (error: any) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(`Failed to search tokens: ${error.message || String(error)}`);
  }
}

/**
 * Graduated Token structure (from /tokens/multi/graduated endpoint)
 * Similar to TokenInfo but for graduated tokens
 */
export interface GraduatedToken {
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
      volume24h: number;
    };
  }>;
  holders: number;
}

/**
 * Get graduated tokens from Solana Tracker API
 * Returns tokens that have graduated from bonding curves (e.g., PumpFun)
 * These are tokens that have successfully completed their bonding curve
 * 
 * @param options - Optional parameters (limit, page, filters)
 * @returns Array of graduated tokens
 * @throws Error if API key is missing or request fails
 * @see https://docs.solanatracker.io/data-api/tokens/get-graduated-tokens
 */
export async function getGraduatedTokens(options?: {
  limit?: number;
  page?: number;
  reduceSpam?: boolean;
  minMarketCap?: number;
  maxMarketCap?: number;
}): Promise<GraduatedToken[]> {
  const apiKey = getApiKey();
  const url = new URL(`${BASE_URL}/tokens/multi/graduated`);
  
  if (options) {
    if (options.limit) url.searchParams.set("limit", options.limit.toString());
    if (options.page) url.searchParams.set("page", options.page.toString());
    if (options.reduceSpam !== undefined) url.searchParams.set("reduceSpam", options.reduceSpam.toString());
    if (options.minMarketCap) url.searchParams.set("minMarketCap", options.minMarketCap.toString());
    if (options.maxMarketCap) url.searchParams.set("maxMarketCap", options.maxMarketCap.toString());
  }
  
  try {
    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "x-api-key": apiKey,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `Failed to fetch graduated tokens: ${response.status} ${response.statusText}`;
      
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

    const data = await response.json() as GraduatedToken[];
    return data;
  } catch (error: any) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(`Failed to fetch graduated tokens: ${error.message || String(error)}`);
  }
}


