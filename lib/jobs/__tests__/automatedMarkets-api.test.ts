/**
 * API Integration Tests for Automated Markets
 * 
 * These tests make REAL API calls to Solana Tracker to validate:
 * - API connectivity and authentication
 * - Response structure and data availability
 * - Data extraction and processing
 * - Rate limiting compliance (1 call/sec)
 * 
 * ⚠️ IMPORTANT: These tests make real API calls but DO NOT create any outputs
 * (no markets, no files, no database writes)
 * 
 * Run with: npx tsx lib/jobs/__tests__/automatedMarkets-api.test.ts
 * 
 * Prerequisites:
 * - SOLANA_TRACKER_KEY set in .env
 * - Internet connection
 */

import { config } from "dotenv";
import { getTrendingTokens, getMultipleTokens, getTokenChart } from "../../../server/solanaTracker";

config();

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  details?: any;
}

const results: TestResult[] = [];

// Rate limiting: 1 call per second
function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function describe(name: string, fn: () => void | Promise<void>) {
  console.log(`\n📦 ${name}`);
  return fn();
}

async function it(name: string, fn: () => Promise<boolean | void> | boolean | void) {
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
}

function expect(actual: any) {
  return {
    toBe: (expected: any) => {
      if (actual !== expected) {
        throw new Error(`Expected ${expected}, got ${actual}`);
      }
    },
    toBeGreaterThan: (expected: number) => {
      if (actual <= expected) {
        throw new Error(`Expected ${actual} to be greater than ${expected}`);
      }
    },
    toBeTruthy: () => {
      if (!actual) {
        throw new Error(`Expected truthy value, got ${actual}`);
      }
    },
    toBeFalsy: () => {
      if (actual) {
        throw new Error(`Expected falsy value, got ${actual}`);
      }
    },
    toContain: (expected: string) => {
      if (typeof actual !== "string" || !actual.includes(expected)) {
        throw new Error(`Expected string to contain "${expected}"`);
      }
    },
  };
}

async function runTests() {
  console.log("🧪 Running API Integration Tests (Real API Calls)\n");
  console.log("⚠️  Rate Limit: 1 call/sec - tests will wait between calls\n");

  // Test 1: Trending Tokens API
  await describe("Trending Tokens API", async () => {
    await it("should fetch trending tokens from Solana Tracker API", async () => {
      const tokens = await getTrendingTokens();
      
      if (!tokens || !Array.isArray(tokens)) {
        throw new Error("Expected array of tokens");
      }
      
      if (tokens.length === 0) {
        throw new Error("Expected at least 1 trending token");
      }
      
      if (tokens.length < 10) {
        console.log(`    ⚠️  Only ${tokens.length} tokens returned (expected 100)`);
      }
      
      return true;
    });

    await delay(1000); // Rate limit: 1 call/sec

    await it("should return tokens with required structure", async () => {
      const tokens = await getTrendingTokens();
      const firstToken = tokens[0];
      
      // Verify token structure
      if (!firstToken.token) {
        throw new Error("Token missing 'token' object");
      }
      
      if (!firstToken.token.mint) {
        throw new Error("Token missing 'mint' address");
      }
      
      if (!firstToken.token.name && !firstToken.token.symbol) {
        throw new Error("Token missing both 'name' and 'symbol'");
      }
      
      // Verify pools structure
      if (!firstToken.pools || !Array.isArray(firstToken.pools)) {
        throw new Error("Token missing 'pools' array");
      }
      
      if (firstToken.pools.length === 0) {
        throw new Error("Token has empty pools array");
      }
      
      const pool = firstToken.pools[0];
      if (!pool.marketCap) {
        throw new Error("Pool missing 'marketCap' object");
      }
      
      if (typeof pool.marketCap.usd !== "number") {
        throw new Error("Pool marketCap.usd should be a number");
      }
      
      if (!pool.txns) {
        throw new Error("Pool missing 'txns' object");
      }
      
      if (typeof pool.txns.volume24h !== "number") {
        throw new Error("Pool txns.volume24h should be a number");
      }
      
      // Verify holders
      if (typeof firstToken.holders !== "number") {
        throw new Error("Token holders should be a number");
      }
      
      // Verify creation time (for battle markets)
      if (!firstToken.token.creation) {
        throw new Error("Token missing 'creation' object");
      }
      
      if (typeof firstToken.token.creation.created_time !== "number") {
        throw new Error("Token creation.created_time should be a number (Unix timestamp)");
      }
      
      return true;
    });

    await delay(1000); // Rate limit

    await it("should have valid token addresses (32-44 chars)", async () => {
      const tokens = await getTrendingTokens();
      const firstToken = tokens[0];
      
      const mint = firstToken.token.mint;
      if (!mint || mint.length < 32 || mint.length > 44) {
        throw new Error(`Invalid mint address length: ${mint?.length || 0} (expected 32-44)`);
      }
      
      return true;
    });
  });

  // Test 2: Multiple Tokens API (Batch)
  await describe("Multiple Tokens API (Batch)", async () => {
    await delay(1000); // Rate limit

    await it("should fetch multiple tokens in batch", async () => {
      // First get trending tokens to get addresses
      const trendingTokens = await getTrendingTokens();
      if (trendingTokens.length < 2) {
        throw new Error("Need at least 2 tokens for batch test");
      }
      
      const addresses = trendingTokens.slice(0, 2).map(t => t.token.mint).filter(Boolean);
      if (addresses.length < 2) {
        throw new Error("Could not get 2 valid addresses");
      }
      
      await delay(1000); // Rate limit before batch call
      
      const batchResult = await getMultipleTokens(addresses);
      
      if (!batchResult || typeof batchResult !== "object") {
        throw new Error("Expected object with token addresses as keys");
      }
      
      if (Object.keys(batchResult).length !== addresses.length) {
        throw new Error(`Expected ${addresses.length} tokens, got ${Object.keys(batchResult).length}`);
      }
      
      return true;
    });

    await delay(1000); // Rate limit

    await it("should return same structure as single token endpoint", async () => {
      const trendingTokens = await getTrendingTokens();
      const address = trendingTokens[0].token.mint;
      
      if (!address) {
        throw new Error("No token address available");
      }
      
      await delay(1000); // Rate limit
      
      const batchResult = await getMultipleTokens([address]);
      const token = batchResult[address];
      
      if (!token) {
        throw new Error("Token not found in batch result");
      }
      
      // Verify structure matches single token endpoint
      if (!token.token || !token.pools || typeof token.holders !== "number") {
        throw new Error("Batch result structure doesn't match single token structure");
      }
      
      return true;
    });

    await delay(1000); // Rate limit

    await it("should handle up to 20 tokens in batch", async () => {
      const trendingTokens = await getTrendingTokens();
      const addresses = trendingTokens.slice(0, 20).map(t => t.token.mint).filter(Boolean);
      
      if (addresses.length < 5) {
        console.log("    ⚠️  Only testing with 5 tokens (not enough trending tokens)");
        // Still test with what we have
      }
      
      await delay(1000); // Rate limit
      
      const batchResult = await getMultipleTokens(addresses);
      
      if (Object.keys(batchResult).length !== addresses.length) {
        throw new Error(`Expected ${addresses.length} tokens, got ${Object.keys(batchResult).length}`);
      }
      
      return true;
    });
  });

  // Test 3: Chart API
  await describe("Chart API (OHLCV)", async () => {
    await delay(1000); // Rate limit

    await it("should fetch chart data for a token", async () => {
      const trendingTokens = await getTrendingTokens();
      const address = trendingTokens[0].token.mint;
      
      if (!address) {
        throw new Error("No token address available");
      }
      
      await delay(1000); // Rate limit
      
      const chart = await getTokenChart(address, "5m", 100);
      
      if (!chart || !chart.oclhv) {
        throw new Error("Chart data missing 'oclhv' array");
      }
      
      if (!Array.isArray(chart.oclhv)) {
        throw new Error("Chart oclhv should be an array");
      }
      
      if (chart.oclhv.length === 0) {
        throw new Error("Chart data has no candles");
      }
      
      return true;
    });

    await delay(1000); // Rate limit

    await it("should return candles with required fields", async () => {
      const trendingTokens = await getTrendingTokens();
      const address = trendingTokens[0].token.mint;
      
      if (!address) {
        throw new Error("No token address available");
      }
      
      await delay(1000); // Rate limit
      
      const chart = await getTokenChart(address, "5m", 10);
      const candle = chart.oclhv[0];
      
      if (typeof candle.open !== "number") {
        throw new Error("Candle missing 'open' field");
      }
      
      if (typeof candle.close !== "number") {
        throw new Error("Candle missing 'close' field");
      }
      
      if (typeof candle.high !== "number") {
        throw new Error("Candle missing 'high' field");
      }
      
      if (typeof candle.low !== "number") {
        throw new Error("Candle missing 'low' field");
      }
      
      if (typeof candle.volume !== "number") {
        throw new Error("Candle missing 'volume' field");
      }
      
      if (typeof candle.time !== "number") {
        throw new Error("Candle missing 'time' field (Unix timestamp)");
      }
      
      return true;
    });

    await delay(1000); // Rate limit

    await it("should support different timeframes", async () => {
      const trendingTokens = await getTrendingTokens();
      const address = trendingTokens[0].token.mint;
      
      if (!address) {
        throw new Error("No token address available");
      }
      
      const timeframes: Array<"5m" | "15m" | "1h" | "4h" | "1d"> = ["5m", "15m", "1h"];
      
      for (const timeframe of timeframes) {
        await delay(1000); // Rate limit between calls
        
        const chart = await getTokenChart(address, timeframe, 10);
        
        if (!chart.oclhv || chart.oclhv.length === 0) {
          throw new Error(`Chart data empty for timeframe ${timeframe}`);
        }
      }
      
      return true;
    });
  });

  // Test 4: Data Extraction Validation
  await describe("Data Extraction Validation", async () => {
    await delay(1000); // Rate limit

    await it("should extract market cap from token data", async () => {
      const tokens = await getTrendingTokens();
      const token = tokens[0];
      
      const mc = token.pools[0]?.marketCap?.usd || 0;
      
      if (mc === 0) {
        console.log("    ⚠️  Token has zero market cap (may be valid for new tokens)");
      }
      
      if (typeof mc !== "number") {
        throw new Error(`Market cap should be number, got ${typeof mc}`);
      }
      
      return true;
    });

    await delay(1000); // Rate limit

    await it("should extract 24h volume from token data", async () => {
      const tokens = await getTrendingTokens();
      const token = tokens[0];
      
      const volume24h = token.pools[0]?.txns?.volume24h || 0;
      
      if (typeof volume24h !== "number") {
        throw new Error(`24h volume should be number, got ${typeof volume24h}`);
      }
      
      return true;
    });

    await delay(1000); // Rate limit

    await it("should extract holders count from token data", async () => {
      const tokens = await getTrendingTokens();
      const token = tokens[0];
      
      const holders = token.holders || 0;
      
      if (typeof holders !== "number") {
        throw new Error(`Holders should be number, got ${typeof holders}`);
      }
      
      return true;
    });

    await delay(1000); // Rate limit

    await it("should extract creation time for age calculation", async () => {
      const tokens = await getTrendingTokens();
      const token = tokens[0];
      
      const createdTime = token.token.creation?.created_time;
      
      if (typeof createdTime !== "number") {
        throw new Error(`Created time should be number (Unix timestamp), got ${typeof createdTime}`);
      }
      
      // Verify it's a reasonable timestamp (not in the future, not too old)
      const now = Math.floor(Date.now() / 1000);
      if (createdTime > now) {
        throw new Error(`Created time ${createdTime} is in the future`);
      }
      
      // Tokens shouldn't be older than a few years (reasonable check)
      const yearsAgo = (now - createdTime) / (365 * 24 * 60 * 60);
      if (yearsAgo > 5) {
        console.log(`    ⚠️  Token is ${yearsAgo.toFixed(1)} years old (may be valid)`);
      }
      
      return true;
    });
  });

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
    console.log("\n✅ All API integration tests passed!");
    console.log("\n💡 Note: These tests made real API calls but created no outputs");
    console.log("   (no markets, no files, no database writes)");
    process.exit(0);
  }
}

// Run tests
runTests().catch(error => {
  console.error("Fatal error:", error);
  process.exit(1);
});

