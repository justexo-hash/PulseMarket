/**
 * Comprehensive Resolution Testing Script
 * 
 * Tests all resolution scenarios without relying on real tokens:
 * - Mocks API responses (getMultipleTokens, getTokenChart)
 * - Creates test markets in database
 * - Tests all resolution scenarios
 * - Validates outcomes
 * 
 * Run with: npx tsx scripts/test-resolution-scenarios.ts
 * 
 * ⚠️ This script creates test data in the database - run on test environment only!
 */

import "dotenv/config";
import { storage } from "../server/storage";
import { db } from "../db";
import { markets, automatedMarketResolutions } from "../shared/schema";
import { eq } from "drizzle-orm";
// Don't import checkAutomatedMarketResolutions yet - we'll import after mocking

// Mock token data structures
interface MockTokenInfo {
  token: {
    name: string;
    symbol: string;
    mint: string;
    image: string;
    creation: {
      created_time: number;
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

interface MockChartData {
  oclhv: Array<{
    open: number;
    close: number;
    low: number;
    high: number;
    volume: number;
    time: number; // Unix timestamp in seconds
  }>;
}

// Mock data storage
const mockTokenData: Record<string, MockTokenInfo> = {};
const mockChartData: Record<string, MockChartData> = {};

// Store original module reference
let originalGetMultipleTokens: any;
let originalGetTokenChart: any;

/**
 * Set mock token data for a token address
 */
function setMockTokenData(address: string, data: Partial<MockTokenInfo>) {
  mockTokenData[address] = {
    token: {
      name: data.token?.name || "Test Token",
      symbol: data.token?.symbol || "TEST",
      mint: address,
      image: data.token?.image || "",
      creation: {
        created_time: data.token?.creation?.created_time || Math.floor(Date.now() / 1000),
      },
    },
    pools: data.pools || [{
      marketCap: { usd: 0 },
      txns: { volume24h: 0 },
    }],
    holders: data.holders || 0,
  };
}

/**
 * Set mock chart data for a token address
 */
function setMockChartData(address: string, candles: Array<{
  time: number;
  high: number;
  low: number;
  open?: number;
  close?: number;
  volume?: number;
}>) {
  mockChartData[address] = {
    oclhv: candles.map(c => ({
      open: c.open || c.high,
      close: c.close || c.low,
      low: c.low,
      high: c.high,
      volume: c.volume || 0,
      time: c.time,
    })),
  };
}

/**
 * Mock getMultipleTokens to return our controlled data
 */
async function mockGetMultipleTokens(addresses: string[]): Promise<Record<string, MockTokenInfo>> {
  const result: Record<string, MockTokenInfo> = {};
  for (const address of addresses) {
    if (mockTokenData[address]) {
      result[address] = mockTokenData[address];
    } else {
      // Default mock data if not set
      result[address] = {
        token: {
          name: "Unknown Token",
          symbol: "UNK",
          mint: address,
          image: "",
          creation: { created_time: Math.floor(Date.now() / 1000) },
        },
        pools: [{ marketCap: { usd: 0 }, txns: { volume24h: 0 } }],
        holders: 0,
      };
    }
  }
  return result;
}

/**
 * Mock getTokenChart to return our controlled data
 */
async function mockGetTokenChart(
  address: string,
  timeframe: string = "5m",
  limit: number = 1000
): Promise<MockChartData> {
  if (mockChartData[address]) {
    return mockChartData[address];
  }
  // Default: empty chart
  return { oclhv: [] };
}

/**
 * Create a test market with resolution tracking
 */
async function createTestMarket(scenario: {
  marketType: "market_cap" | "volume" | "holders" | "battle_race" | "battle_dump";
  question: string;
  targetValue: number;
  tokenAddress: string;
  tokenAddress2?: string;
  expiresAt: Date;
  category?: string;
}): Promise<number> {
  const market = await storage.createMarket({
    question: scenario.question,
    category: scenario.category || "memecoins",
    isAutomated: 1,
    tokenAddress: scenario.tokenAddress,
    tokenAddress2: scenario.tokenAddress2 || undefined,
    expiresAt: scenario.expiresAt,
  });

  await storage.createMarketResolutionTracking({
    marketId: market.id,
    marketType: scenario.marketType,
    targetValue: scenario.targetValue, // Function expects number, converts to string internally
    tokenAddress: scenario.tokenAddress,
    tokenAddress2: scenario.tokenAddress2 || undefined,
    // Note: status defaults to "pending" in the function
  });

  return market.id;
}

/**
 * Clean up test markets
 */
async function cleanupTestMarkets(marketIds: number[]) {
  for (const id of marketIds) {
    await db.delete(automatedMarketResolutions).where(eq(automatedMarketResolutions.marketId, id));
    await db.delete(markets).where(eq(markets.id, id));
  }
}

/**
 * Run all test scenarios
 */
async function runTests() {
  console.log("🧪 Starting Resolution Scenario Tests\n");
  console.log("=".repeat(80));

  // Mock the API functions FIRST, before importing the resolution function
  const solanaTrackerModule = require("../server/solanaTracker");
  
  // Store originals for restoration
  originalGetMultipleTokens = solanaTrackerModule.getMultipleTokens;
  originalGetTokenChart = solanaTrackerModule.getTokenChart;
  
  // Replace with mocks
  solanaTrackerModule.getMultipleTokens = mockGetMultipleTokens;
  solanaTrackerModule.getTokenChart = mockGetTokenChart;
  
  // Clear module cache so automatedMarkets re-imports with mocked functions
  delete require.cache[require.resolve("../lib/jobs/automatedMarkets")];
  
  // Now import the resolution function (it will use our mocks)
  const { checkAutomatedMarketResolutions } = require("../lib/jobs/automatedMarkets");
  
  console.log("   ℹ️  API functions mocked for testing");

  const testMarketIds: number[] = [];
  const now = new Date();
  let passed = 0;
  let failed = 0;

  try {
    // ============================================================
    // TEST 1: Market Cap - Reaches Target (YES)
    // ============================================================
    console.log("\n📊 Test 1: Market Cap - Reaches Target (YES)");
    console.log("-".repeat(80));
    
    const expiresAt1 = new Date(now.getTime() + 1 * 60 * 1000); // 1 minute from now
    const marketId1 = await createTestMarket({
      marketType: "market_cap",
      question: "Will Test Token's current market cap be above $500K after 120 minutes?",
      targetValue: 500000,
      tokenAddress: "TEST_TOKEN_1",
      expiresAt: expiresAt1,
    });
    testMarketIds.push(marketId1);

    // Set mock data: current MC = $600K (above target)
    setMockTokenData("TEST_TOKEN_1", {
      pools: [{ marketCap: { usd: 600000 }, txns: { volume24h: 0 } }],
    });

      // Wait until expiration time
      const waitTime = expiresAt1.getTime() - Date.now() + 1000; // 1 second after expiration
      if (waitTime > 0) {
        console.log(`   Waiting ${Math.ceil(waitTime / 1000)} seconds until expiration...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      } else {
        console.log("   Market already expired, proceeding...");
      }

    // Run resolution check
    const result1 = await checkAutomatedMarketResolutions();
    const market1 = await storage.getMarketById(marketId1);
    
    if (market1?.status === "resolved" && market1.resolvedOutcome === "yes") {
      console.log("   ✅ PASS: Market resolved as YES (reached target)");
      passed++;
    } else {
      console.log(`   ❌ FAIL: Expected YES, got status=${market1?.status}, outcome=${market1?.resolvedOutcome}`);
      failed++;
    }

    // ============================================================
    // TEST 2: Market Cap - Doesn't Reach Target (NO)
    // ============================================================
    console.log("\n📊 Test 2: Market Cap - Doesn't Reach Target (NO)");
    console.log("-".repeat(80));
    
    const expiresAt2 = new Date(now.getTime() + 1 * 60 * 1000); // 1 minute from now
    const marketId2 = await createTestMarket({
      marketType: "market_cap",
      question: "Will Test Token 2's current market cap be above $500K after 120 minutes?",
      targetValue: 500000,
      tokenAddress: "TEST_TOKEN_2",
      expiresAt: expiresAt2,
    });
    testMarketIds.push(marketId2);

    // Set mock data: current MC = $300K (below target)
    setMockTokenData("TEST_TOKEN_2", {
      pools: [{ marketCap: { usd: 300000 }, txns: { volume24h: 0 } }],
    });

    await new Promise(resolve => setTimeout(resolve, expiresAt2.getTime() - Date.now() + 1000));

    const result2 = await checkAutomatedMarketResolutions();
    const market2 = await storage.getMarketById(marketId2);
    
    if (market2?.status === "resolved" && market2.resolvedOutcome === "no") {
      console.log("   ✅ PASS: Market resolved as NO (didn't reach target)");
      passed++;
    } else {
      console.log(`   ❌ FAIL: Expected NO, got status=${market2?.status}, outcome=${market2?.resolvedOutcome}`);
      failed++;
    }

    // ============================================================
    // TEST 3: Volume - Reaches Target (YES)
    // ============================================================
    console.log("\n📊 Test 3: Volume - Reaches Target (YES)");
    console.log("-".repeat(80));
    
    const expiresAt3 = new Date(now.getTime() + 1 * 60 * 1000); // 1 minute from now
    const marketId3 = await createTestMarket({
      marketType: "volume",
      question: "Will Test Token 3's current 24h volume be above $750K after 1 day?",
      targetValue: 750000,
      tokenAddress: "TEST_TOKEN_3",
      expiresAt: expiresAt3,
    });
    testMarketIds.push(marketId3);

    setMockTokenData("TEST_TOKEN_3", {
      pools: [{ marketCap: { usd: 0 }, txns: { volume24h: 800000 } }],
    });

    await new Promise(resolve => setTimeout(resolve, expiresAt3.getTime() - Date.now() + 1000));

    const result3 = await checkAutomatedMarketResolutions();
    const market3 = await storage.getMarketById(marketId3);
    
    if (market3?.status === "resolved" && market3.resolvedOutcome === "yes") {
      console.log("   ✅ PASS: Volume market resolved as YES");
      passed++;
    } else {
      console.log(`   ❌ FAIL: Expected YES, got status=${market3?.status}, outcome=${market3?.resolvedOutcome}`);
      failed++;
    }

    // ============================================================
    // TEST 4: Holders - Reaches Target (YES)
    // ============================================================
    console.log("\n📊 Test 4: Holders - Reaches Target (YES)");
    console.log("-".repeat(80));
    
    const expiresAt4 = new Date(now.getTime() + 1 * 60 * 1000); // 1 minute from now
    const marketId4 = await createTestMarket({
      marketType: "holders",
      question: "Will Test Token 4 have more than 5000 holders after 1 day?",
      targetValue: 5000,
      tokenAddress: "TEST_TOKEN_4",
      expiresAt: expiresAt4,
    });
    testMarketIds.push(marketId4);

    setMockTokenData("TEST_TOKEN_4", {
      holders: 6000,
    });

    await new Promise(resolve => setTimeout(resolve, expiresAt4.getTime() - Date.now() + 1000));

    const result4 = await checkAutomatedMarketResolutions();
    const market4 = await storage.getMarketById(marketId4);
    
    if (market4?.status === "resolved" && market4.resolvedOutcome === "yes") {
      console.log("   ✅ PASS: Holders market resolved as YES");
      passed++;
    } else {
      console.log(`   ❌ FAIL: Expected YES, got status=${market4?.status}, outcome=${market4?.resolvedOutcome}`);
      failed++;
    }

    // ============================================================
    // TEST 5: Battle Race - Token 1 Wins
    // ============================================================
    console.log("\n📊 Test 5: Battle Race - Token 1 Wins");
    console.log("-".repeat(80));
    
    const marketId5 = await createTestMarket({
      marketType: "battle_race",
      question: "Which token will reach $1M market cap first: Token A or Token B?",
      targetValue: 1000000,
      tokenAddress: "BATTLE_TOKEN_1",
      tokenAddress2: "BATTLE_TOKEN_2",
      expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000), // 24 hours
    });
    testMarketIds.push(marketId5);

    const baseTime = Math.floor(Date.now() / 1000);
    // Token 1 hits target at time 1000
    setMockChartData("BATTLE_TOKEN_1", [
      { time: baseTime + 1000, high: 1200000, low: 800000 },
    ]);
    // Token 2 hits target at time 2000 (later)
    setMockChartData("BATTLE_TOKEN_2", [
      { time: baseTime + 2000, high: 1200000, low: 800000 },
    ]);

    const result5 = await checkAutomatedMarketResolutions();
    const market5 = await storage.getMarketById(marketId5);
    
    if (market5?.status === "resolved" && market5.resolvedOutcome === "yes") {
      console.log("   ✅ PASS: Battle race resolved - Token 1 won");
      passed++;
    } else {
      console.log(`   ❌ FAIL: Expected YES (Token 1), got status=${market5?.status}, outcome=${market5?.resolvedOutcome}`);
      failed++;
    }

    // ============================================================
    // TEST 6: Battle Race - Token 2 Wins
    // ============================================================
    console.log("\n📊 Test 6: Battle Race - Token 2 Wins");
    console.log("-".repeat(80));
    
    const marketId6 = await createTestMarket({
      marketType: "battle_race",
      question: "Which token will reach $1M market cap first: Token C or Token D?",
      targetValue: 1000000,
      tokenAddress: "BATTLE_TOKEN_3",
      tokenAddress2: "BATTLE_TOKEN_4",
      expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
    });
    testMarketIds.push(marketId6);

    // Token 2 hits first
    setMockChartData("BATTLE_TOKEN_3", [
      { time: baseTime + 2000, high: 1200000, low: 800000 },
    ]);
    setMockChartData("BATTLE_TOKEN_4", [
      { time: baseTime + 1000, high: 1200000, low: 800000 },
    ]);

    const result6 = await checkAutomatedMarketResolutions();
    const market6 = await storage.getMarketById(marketId6);
    
    if (market6?.status === "resolved" && market6.resolvedOutcome === "no") {
      console.log("   ✅ PASS: Battle race resolved - Token 2 won");
      passed++;
    } else {
      console.log(`   ❌ FAIL: Expected NO (Token 2), got status=${market6?.status}, outcome=${market6?.resolvedOutcome}`);
      failed++;
    }

    // ============================================================
    // TEST 7: Battle Dump - Token 1 Dumps First
    // ============================================================
    console.log("\n📊 Test 7: Battle Dump - Token 1 Dumps First");
    console.log("-".repeat(80));
    
    const marketId7 = await createTestMarket({
      marketType: "battle_dump",
      question: "Which token will dump 50% first (to $500K market cap): Token E or Token F?",
      targetValue: 500000,
      tokenAddress: "BATTLE_TOKEN_5",
      tokenAddress2: "BATTLE_TOKEN_6",
      expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
    });
    testMarketIds.push(marketId7);

    // Token 1 dumps to $400K (below target) at time 1000
    setMockChartData("BATTLE_TOKEN_5", [
      { time: baseTime + 1000, high: 600000, low: 400000 },
    ]);
    // Token 2 dumps later
    setMockChartData("BATTLE_TOKEN_6", [
      { time: baseTime + 2000, high: 600000, low: 400000 },
    ]);

    const result7 = await checkAutomatedMarketResolutions();
    const market7 = await storage.getMarketById(marketId7);
    
    if (market7?.status === "resolved" && market7.resolvedOutcome === "yes") {
      console.log("   ✅ PASS: Battle dump resolved - Token 1 dumped first");
      passed++;
    } else {
      console.log(`   ❌ FAIL: Expected YES (Token 1), got status=${market7?.status}, outcome=${market7?.resolvedOutcome}`);
      failed++;
    }

    // ============================================================
    // TEST 8: Battle Market - Expires Without Winner (Refund)
    // ============================================================
    console.log("\n📊 Test 8: Battle Market - Expires Without Winner (Refund)");
    console.log("-".repeat(80));
    
    const expiresAt8 = new Date(now.getTime() - 1000); // Already expired
    const marketId8 = await createTestMarket({
      marketType: "battle_race",
      question: "Which token will reach $1M market cap first: Token G or Token H?",
      targetValue: 1000000,
      tokenAddress: "BATTLE_TOKEN_7",
      tokenAddress2: "BATTLE_TOKEN_8",
      expiresAt: expiresAt8,
    });
    testMarketIds.push(marketId8);

    // Neither token hit target
    setMockChartData("BATTLE_TOKEN_7", [
      { time: baseTime - 1000, high: 800000, low: 700000 }, // Below target
    ]);
    setMockChartData("BATTLE_TOKEN_8", [
      { time: baseTime - 1000, high: 900000, low: 800000 }, // Below target
    ]);

    const result8 = await checkAutomatedMarketResolutions();
    const market8 = await storage.getMarketById(marketId8);
    const resolution8 = await db.select().from(automatedMarketResolutions)
      .where(eq(automatedMarketResolutions.marketId, marketId8))
      .limit(1);
    
    if (resolution8[0]?.status === "expired" && market8?.status === "active") {
      console.log("   ✅ PASS: Battle market expired, marked for refund");
      passed++;
    } else {
      console.log(`   ❌ FAIL: Expected expired status, got resolution=${resolution8[0]?.status}, market=${market8?.status}`);
      failed++;
    }

    // ============================================================
    // TEST 9: Single Token Market - Expires Too Late (>5 min)
    // ============================================================
    console.log("\n📊 Test 9: Single Token Market - Expires Too Late");
    console.log("-".repeat(80));
    
    const expiresAt9 = new Date(now.getTime() - 10 * 60 * 1000); // 10 minutes ago
    const marketId9 = await createTestMarket({
      marketType: "market_cap",
      question: "Will Test Token 9's current market cap be above $500K after 120 minutes?",
      targetValue: 500000,
      tokenAddress: "TEST_TOKEN_9",
      expiresAt: expiresAt9,
    });
    testMarketIds.push(marketId9);

    const result9 = await checkAutomatedMarketResolutions();
    const resolution9 = await db.select().from(automatedMarketResolutions)
      .where(eq(automatedMarketResolutions.marketId, marketId9))
      .limit(1);
    
    if (resolution9[0]?.status === "expired") {
      console.log("   ✅ PASS: Market expired too late, marked as expired");
      passed++;
    } else {
      console.log(`   ❌ FAIL: Expected expired status, got ${resolution9[0]?.status}`);
      failed++;
    }

    // ============================================================
    // Summary
    // ============================================================
    console.log("\n" + "=".repeat(80));
    console.log("📊 Test Summary");
    console.log("=".repeat(80));
    console.log(`Total Tests: ${passed + failed}`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    
    if (failed === 0) {
      console.log("\n🎉 All tests passed!");
    } else {
      console.log("\n⚠️  Some tests failed - review above for details");
    }

  } catch (error: any) {
    console.error("\n❌ Fatal error during testing:", error);
    console.error(error.stack);
  } finally {
    // Restore original functions
    const solanaTrackerModule = require("../server/solanaTracker");
    if (originalGetMultipleTokens) {
      solanaTrackerModule.getMultipleTokens = originalGetMultipleTokens;
    }
    if (originalGetTokenChart) {
      solanaTrackerModule.getTokenChart = originalGetTokenChart;
    }
    
    // Clear module cache
    delete require.cache[require.resolve("../lib/jobs/automatedMarkets")];

    // Cleanup
    console.log("\n🧹 Cleaning up test markets...");
    await cleanupTestMarkets(testMarketIds);
    console.log("✅ Cleanup complete");
  }
}

// Run tests
runTests().then(() => {
  process.exit(0);
}).catch(error => {
  console.error("Fatal error:", error);
  process.exit(1);
});

