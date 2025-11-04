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

