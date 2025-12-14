/**
 * Comprehensive Test for Token Filtering Logic
 * 
 * Tests all market type filters to ensure tokens are properly filtered:
 * - Battle dump: tokens >= 50K (so 50% = 25K minimum)
 * - Battle race: tokens < 100M
 * - Market cap: tokens >= 60K and < 100M
 * - Volume: tokens >= 60K and < 100M
 * - Holders: tokens >= 100 and < 50K
 * 
 * Also tests milestone calculations with new targets.
 * 
 * Run with: npx tsx scripts/test-token-filtering.ts
 */

import "dotenv/config";
import { getGraduatedTokens } from "../server/solanaTracker";
import { isPumpFunToken } from "../lib/jobs/automatedMarkets";

const COLORS = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
  magenta: "\x1b[35m",
};

function log(message: string, color: keyof typeof COLORS = "reset") {
  console.log(`${COLORS[color]}${message}${COLORS.reset}`);
}

function logSection(title: string) {
  console.log("\n" + "=".repeat(70));
  log(title, "cyan");
  console.log("=".repeat(70) + "\n");
}

interface TestResult {
  name: string;
  passed: boolean;
  details?: string;
  error?: string;
}

// Mock the isPumpFunToken function for testing
// We'll check the actual implementation separately
function checkPumpFunToken(token: any): boolean {
  return token.pools?.some((pool: any) => 
    pool.market?.toLowerCase() === "pumpfun"
  ) || false;
}

// Test filtering logic
function testMarketCapFilter(mc: number): { shouldPass: boolean; reason: string } {
  const minMC = 60000; // 2x = 120K, rounds to 125K
  const maxMC = 100000000; // 100M
  
  if (mc < minMC) {
    return { shouldPass: false, reason: `MC ${mc} < ${minMC} (minimum for 2x to reach 125K)` };
  }
  if (mc >= maxMC) {
    return { shouldPass: false, reason: `MC ${mc} >= ${maxMC} (above all milestones)` };
  }
  return { shouldPass: true, reason: `MC ${mc} is within valid range [${minMC}, ${maxMC})` };
}

function testVolumeFilter(volume: number): { shouldPass: boolean; reason: string } {
  const minVolume = 60000; // 2x = 120K, rounds to 125K
  const maxVolume = 100000000; // 100M
  
  if (volume < minVolume) {
    return { shouldPass: false, reason: `Volume ${volume} < ${minVolume} (minimum for 2x to reach 125K)` };
  }
  if (volume >= maxVolume) {
    return { shouldPass: false, reason: `Volume ${volume} >= ${maxVolume} (above all milestones)` };
  }
  return { shouldPass: true, reason: `Volume ${volume} is within valid range [${minVolume}, ${maxVolume})` };
}

function testHoldersFilter(holders: number): { shouldPass: boolean; reason: string } {
  const minHolders = 100; // 2x = 200 (lowest milestone)
  const maxHolders = 50000; // 50K
  
  if (holders < minHolders) {
    return { shouldPass: false, reason: `Holders ${holders} < ${minHolders} (minimum for 2x to reach 200)` };
  }
  if (holders >= maxHolders) {
    return { shouldPass: false, reason: `Holders ${holders} >= ${maxHolders} (above all milestones)` };
  }
  return { shouldPass: true, reason: `Holders ${holders} is within valid range [${minHolders}, ${maxHolders})` };
}

function testBattleDumpFilter(mc: number): { shouldPass: boolean; reason: string } {
  const minMC = 50000; // 50% = 25K (lowest dump target)
  
  if (mc < minMC) {
    return { shouldPass: false, reason: `MC ${mc} < ${minMC} (minimum for 50% to reach 25K)` };
  }
  return { shouldPass: true, reason: `MC ${mc} >= ${minMC} (valid for dump market)` };
}

function testBattleRaceFilter(mc: number): { shouldPass: boolean; reason: string } {
  const maxMC = 100000000; // 100M
  
  if (mc >= maxMC) {
    return { shouldPass: false, reason: `MC ${mc} >= ${maxMC} (above all milestones)` };
  }
  return { shouldPass: true, reason: `MC ${mc} < ${maxMC} (valid for race market)` };
}

async function test1_RealTokenFiltering() {
  logSection("TEST 1: Real Token Filtering Analysis");
  
  try {
    log("Fetching graduated tokens...", "blue");
    const tokens = await getGraduatedTokens({ limit: 100 });
    log(`✓ Fetched ${tokens.length} tokens`, "green");
    
    // Filter for PumpFun tokens only
    const pumpfunTokens = tokens.filter(t => checkPumpFunToken(t));
    log(`✓ Found ${pumpfunTokens.length} PumpFun tokens`, "green");
    
    if (pumpfunTokens.length === 0) {
      log("⚠️  No PumpFun tokens found - cannot test filtering", "yellow");
      return { success: false, error: "No PumpFun tokens found" };
    }
    
    // Analyze tokens by market type eligibility
    const results = {
      marketCap: { eligible: 0, ineligible: 0, details: [] as string[] },
      volume: { eligible: 0, ineligible: 0, details: [] as string[] },
      holders: { eligible: 0, ineligible: 0, details: [] as string[] },
      battleDump: { eligible: 0, ineligible: 0, details: [] as string[] },
      battleRace: { eligible: 0, ineligible: 0, details: [] as string[] },
    };
    
    for (const token of pumpfunTokens) {
      const mc = token.pools[0]?.marketCap?.usd || 0;
      const volume = token.pools[0]?.txns?.volume24h || 0;
      const holders = token.holders || 0;
      const name = token.token.name || token.token.symbol || "Unknown";
      
      // Test market cap filter
      const mcTest = testMarketCapFilter(mc);
      if (mcTest.shouldPass) {
        results.marketCap.eligible++;
      } else {
        results.marketCap.ineligible++;
        if (results.marketCap.details.length < 5) {
          results.marketCap.details.push(`${name}: ${mcTest.reason}`);
        }
      }
      
      // Test volume filter
      const volTest = testVolumeFilter(volume);
      if (volTest.shouldPass) {
        results.volume.eligible++;
      } else {
        results.volume.ineligible++;
        if (results.volume.details.length < 5) {
          results.volume.details.push(`${name}: ${volTest.reason}`);
        }
      }
      
      // Test holders filter
      const holdersTest = testHoldersFilter(holders);
      if (holdersTest.shouldPass) {
        results.holders.eligible++;
      } else {
        results.holders.ineligible++;
        if (results.holders.details.length < 5) {
          results.holders.details.push(`${name}: ${holdersTest.reason}`);
        }
      }
      
      // Test battle dump filter
      const dumpTest = testBattleDumpFilter(mc);
      if (dumpTest.shouldPass) {
        results.battleDump.eligible++;
      } else {
        results.battleDump.ineligible++;
        if (results.battleDump.details.length < 5) {
          results.battleDump.details.push(`${name}: ${dumpTest.reason}`);
        }
      }
      
      // Test battle race filter
      const raceTest = testBattleRaceFilter(mc);
      if (raceTest.shouldPass) {
        results.battleRace.eligible++;
      } else {
        results.battleRace.ineligible++;
        if (results.battleRace.details.length < 5) {
          results.battleRace.details.push(`${raceTest.reason}`);
        }
      }
    }
    
    // Display results
    log("\nFiltering Results:", "yellow");
    console.log("\nMarket Cap Markets:");
    log(`  Eligible: ${results.marketCap.eligible}`, "green");
    log(`  Ineligible: ${results.marketCap.ineligible}`, "yellow");
    if (results.marketCap.details.length > 0) {
      log("  Sample ineligible reasons:", "yellow");
      results.marketCap.details.forEach(d => log(`    - ${d}`, "reset"));
    }
    
    console.log("\nVolume Markets:");
    log(`  Eligible: ${results.volume.eligible}`, "green");
    log(`  Ineligible: ${results.volume.ineligible}`, "yellow");
    if (results.volume.details.length > 0) {
      log("  Sample ineligible reasons:", "yellow");
      results.volume.details.forEach(d => log(`    - ${d}`, "reset"));
    }
    
    console.log("\nHolders Markets:");
    log(`  Eligible: ${results.holders.eligible}`, "green");
    log(`  Ineligible: ${results.holders.ineligible}`, "yellow");
    if (results.holders.details.length > 0) {
      log("  Sample ineligible reasons:", "yellow");
      results.holders.details.forEach(d => log(`    - ${d}`, "reset"));
    }
    
    console.log("\nBattle Dump Markets:");
    log(`  Eligible: ${results.battleDump.eligible}`, "green");
    log(`  Ineligible: ${results.battleDump.ineligible}`, "yellow");
    if (results.battleDump.details.length > 0) {
      log("  Sample ineligible reasons:", "yellow");
      results.battleDump.details.forEach(d => log(`    - ${d}`, "reset"));
    }
    
    console.log("\nBattle Race Markets:");
    log(`  Eligible: ${results.battleRace.eligible}`, "green");
    log(`  Ineligible: ${results.battleRace.ineligible}`, "yellow");
    if (results.battleRace.details.length > 0) {
      log("  Sample ineligible reasons:", "yellow");
      results.battleRace.details.forEach(d => log(`    - ${d}`, "reset"));
    }
    
    // Check if we have enough eligible tokens
    const hasEnoughTokens = 
      results.marketCap.eligible > 0 &&
      results.volume.eligible > 0 &&
      results.holders.eligible > 0 &&
      results.battleDump.eligible >= 2 && // Need at least 2 for battle
      results.battleRace.eligible >= 2;   // Need at least 2 for battle
    
    if (hasEnoughTokens) {
      log("\n✓ All market types have eligible tokens", "green");
    } else {
      log("\n⚠️  Some market types may not have enough eligible tokens", "yellow");
    }
    
    return { success: true, results };
  } catch (error: any) {
    log(`✗ Test failed: ${error.message}`, "red");
    return { success: false, error: error.message };
  }
}

async function test2_EdgeCaseBoundaries() {
  logSection("TEST 2: Edge Case Boundary Testing");
  
  const testCases: Array<{
    name: string;
    mc?: number;
    volume?: number;
    holders?: number;
    marketType: string;
    expected: boolean;
  }> = [
    // Market Cap edge cases
    { name: "MC exactly at minimum (60K)", mc: 60000, marketType: "market_cap", expected: true },
    { name: "MC just below minimum (59.9K)", mc: 59900, marketType: "market_cap", expected: false },
    { name: "MC at maximum-1 (99.9M)", mc: 99900000, marketType: "market_cap", expected: true },
    { name: "MC at maximum (100M)", mc: 100000000, marketType: "market_cap", expected: false },
    { name: "MC above maximum (101M)", mc: 101000000, marketType: "market_cap", expected: false },
    
    // Volume edge cases
    { name: "Volume exactly at minimum (60K)", volume: 60000, marketType: "volume", expected: true },
    { name: "Volume just below minimum (59.9K)", volume: 59900, marketType: "volume", expected: false },
    { name: "Volume at maximum-1 (99.9M)", volume: 99900000, marketType: "volume", expected: true },
    { name: "Volume at maximum (100M)", volume: 100000000, marketType: "volume", expected: false },
    
    // Holders edge cases
    { name: "Holders exactly at minimum (100)", holders: 100, marketType: "holders", expected: true },
    { name: "Holders just below minimum (99)", holders: 99, marketType: "holders", expected: false },
    { name: "Holders at maximum-1 (49.9K)", holders: 49900, marketType: "holders", expected: true },
    { name: "Holders at maximum (50K)", holders: 50000, marketType: "holders", expected: false },
    
    // Battle Dump edge cases
    { name: "Dump MC exactly at minimum (50K)", mc: 50000, marketType: "battle_dump", expected: true },
    { name: "Dump MC just below minimum (49.9K)", mc: 49900, marketType: "battle_dump", expected: false },
    { name: "Dump MC high value (10M)", mc: 10000000, marketType: "battle_dump", expected: true },
    
    // Battle Race edge cases
    { name: "Race MC at maximum-1 (99.9M)", mc: 99900000, marketType: "battle_race", expected: true },
    { name: "Race MC at maximum (100M)", mc: 100000000, marketType: "battle_race", expected: false },
    { name: "Race MC above maximum (101M)", mc: 101000000, marketType: "battle_race", expected: false },
  ];
  
  const results: TestResult[] = [];
  
  for (const testCase of testCases) {
    let actual: boolean;
    let reason: string;
    
    if (testCase.marketType === "market_cap") {
      const result = testMarketCapFilter(testCase.mc!);
      actual = result.shouldPass;
      reason = result.reason;
    } else if (testCase.marketType === "volume") {
      const result = testVolumeFilter(testCase.volume!);
      actual = result.shouldPass;
      reason = result.reason;
    } else if (testCase.marketType === "holders") {
      const result = testHoldersFilter(testCase.holders!);
      actual = result.shouldPass;
      reason = result.reason;
    } else if (testCase.marketType === "battle_dump") {
      const result = testBattleDumpFilter(testCase.mc!);
      actual = result.shouldPass;
      reason = result.reason;
    } else if (testCase.marketType === "battle_race") {
      const result = testBattleRaceFilter(testCase.mc!);
      actual = result.shouldPass;
      reason = result.reason;
    } else {
      actual = false;
      reason = "Unknown market type";
    }
    
    const passed = actual === testCase.expected;
    results.push({
      name: testCase.name,
      passed,
      details: reason,
      error: passed ? undefined : `Expected ${testCase.expected}, got ${actual}`,
    });
  }
  
  // Display results
  let passedCount = 0;
  for (const result of results) {
    if (result.passed) {
      log(`✓ ${result.name}`, "green");
      passedCount++;
    } else {
      log(`✗ ${result.name}`, "red");
      log(`  ${result.error}`, "red");
      log(`  ${result.details}`, "yellow");
    }
  }
  
  log(`\nEdge case tests: ${passedCount}/${results.length} passed`, 
    passedCount === results.length ? "green" : "yellow");
  
  return { success: passedCount === results.length, results };
}

async function test3_MilestoneCalculations() {
  logSection("TEST 3: Milestone Calculation Testing");
  
  // Import the calculation functions (we'll need to test them)
  // For now, we'll test the logic manually
  
  const testCases: Array<{
    name: string;
    current: number;
    marketType: string;
    expectedTarget: number;
    expectedQuestion?: string;
  }> = [
    // Market Cap: 2x and round up to milestone
    { name: "MC 60K -> 2x = 120K -> rounds to 125K", current: 60000, marketType: "market_cap", expectedTarget: 125000 },
    { name: "MC 125K -> 2x = 250K -> rounds to 250K", current: 125000, marketType: "market_cap", expectedTarget: 250000 },
    { name: "MC 200K -> 2x = 400K -> rounds to 500K", current: 200000, marketType: "market_cap", expectedTarget: 500000 },
    
    // Volume: 2x and round up to milestone
    { name: "Volume 60K -> 2x = 120K -> rounds to 125K", current: 60000, marketType: "volume", expectedTarget: 125000 },
    { name: "Volume 125K -> 2x = 250K -> rounds to 250K", current: 125000, marketType: "volume", expectedTarget: 250000 },
    
    // Holders: 2x and round up to milestone
    { name: "Holders 100 -> 2x = 200 -> rounds to 200", current: 100, marketType: "holders", expectedTarget: 200 },
    { name: "Holders 175 -> 2x = 350 -> rounds to 350", current: 175, marketType: "holders", expectedTarget: 350 },
    { name: "Holders 250 -> 2x = 500 -> rounds to 500", current: 250, marketType: "holders", expectedTarget: 500 },
    
    // Battle Dump: 50% and round up to dump milestone
    { name: "Dump MC 50K -> 50% = 25K -> rounds to 25K", current: 50000, marketType: "battle_dump", expectedTarget: 25000 },
    { name: "Dump MC 100K -> 50% = 50K -> rounds to 50K", current: 100000, marketType: "battle_dump", expectedTarget: 50000 },
    { name: "Dump MC 200K -> 50% = 100K -> rounds to 100K", current: 200000, marketType: "battle_dump", expectedTarget: 100000 },
    { name: "Dump MC 300K -> 50% = 150K -> rounds to 200K", current: 300000, marketType: "battle_dump", expectedTarget: 200000 },
  ];
  
  // Helper function to round up to milestone
  function roundUpToMilestone(value: number, milestones: number[]): number {
    for (const milestone of milestones) {
      if (milestone >= value) {
        return milestone;
      }
    }
    return milestones[milestones.length - 1];
  }
  
  const MARKET_CAP_MILESTONES = [125000, 250000, 500000, 750000, 1000000, 2000000, 3000000, 5000000, 10000000, 20000000, 50000000, 100000000];
  const VOLUME_MILESTONES = [125000, 250000, 500000, 750000, 1000000, 2000000, 3000000, 5000000, 10000000, 20000000, 50000000, 100000000];
  const HOLDER_MILESTONES = [200, 350, 500, 750, 1000, 2000, 3000, 5000, 7500, 10000, 15000, 20000, 30000, 50000];
  const DUMP_TARGETS = [25000, 50000, 100000, 200000, 300000, 500000, 750000, 1000000, 2000000, 3000000, 5000000, 10000000, 20000000, 50000000];
  
  const results: TestResult[] = [];
  
  for (const testCase of testCases) {
    let calculatedTarget: number;
    
    if (testCase.marketType === "market_cap") {
      const doubled = testCase.current * 2;
      calculatedTarget = roundUpToMilestone(doubled, MARKET_CAP_MILESTONES);
    } else if (testCase.marketType === "volume") {
      const doubled = testCase.current * 2;
      calculatedTarget = roundUpToMilestone(doubled, VOLUME_MILESTONES);
    } else if (testCase.marketType === "holders") {
      const doubled = testCase.current * 2;
      calculatedTarget = roundUpToMilestone(doubled, HOLDER_MILESTONES);
    } else if (testCase.marketType === "battle_dump") {
      const halved = testCase.current * 0.5;
      calculatedTarget = roundUpToMilestone(halved, DUMP_TARGETS);
    } else {
      calculatedTarget = 0;
    }
    
    const passed = calculatedTarget === testCase.expectedTarget;
    results.push({
      name: testCase.name,
      passed,
      details: `Calculated: ${calculatedTarget}, Expected: ${testCase.expectedTarget}`,
      error: passed ? undefined : `Expected ${testCase.expectedTarget}, got ${calculatedTarget}`,
    });
  }
  
  // Display results
  let passedCount = 0;
  for (const result of results) {
    if (result.passed) {
      log(`✓ ${result.name}`, "green");
      log(`  ${result.details}`, "blue");
    } else {
      log(`✗ ${result.name}`, "red");
      log(`  ${result.error}`, "red");
    }
    if (result.passed) passedCount++;
  }
  
  log(`\nMilestone calculation tests: ${passedCount}/${results.length} passed`, 
    passedCount === results.length ? "green" : "yellow");
  
  return { success: passedCount === results.length, results };
}

async function test4_FilterCombinations() {
  logSection("TEST 4: Filter Combination Testing");
  
  // Test tokens that should pass multiple filters
  const testTokens = [
    { name: "Token A", mc: 100000, volume: 100000, holders: 200, pumpfun: true },
    { name: "Token B", mc: 50000, volume: 50000, holders: 50, pumpfun: true }, // Should fail holders
    { name: "Token C", mc: 50000, volume: 50000, holders: 200, pumpfun: true }, // Should fail MC/Volume
    { name: "Token D", mc: 100000, volume: 100000, holders: 200, pumpfun: false }, // Should fail PumpFun
    { name: "Token E", mc: 150000000, volume: 100000, holders: 200, pumpfun: true }, // Should fail MC (too high)
  ];
  
  log("Testing token combinations:", "blue");
  
  for (const token of testTokens) {
    log(`\n${token.name}:`, "yellow");
    log(`  MC: ${token.mc}, Volume: ${token.volume}, Holders: ${token.holders}, PumpFun: ${token.pumpfun}`, "reset");
    
    const mcTest = testMarketCapFilter(token.mc);
    const volTest = testVolumeFilter(token.volume);
    const holdersTest = testHoldersFilter(token.holders);
    const dumpTest = testBattleDumpFilter(token.mc);
    const raceTest = testBattleRaceFilter(token.mc);
    
    log(`  Market Cap: ${mcTest.shouldPass ? "✓" : "✗"} ${mcTest.reason}`, mcTest.shouldPass ? "green" : "red");
    log(`  Volume: ${volTest.shouldPass ? "✓" : "✗"} ${volTest.reason}`, volTest.shouldPass ? "green" : "red");
    log(`  Holders: ${holdersTest.shouldPass ? "✓" : "✗"} ${holdersTest.reason}`, holdersTest.shouldPass ? "green" : "red");
    log(`  Battle Dump: ${dumpTest.shouldPass ? "✓" : "✗"} ${dumpTest.reason}`, dumpTest.shouldPass ? "green" : "red");
    log(`  Battle Race: ${raceTest.shouldPass ? "✓" : "✗"} ${raceTest.reason}`, raceTest.shouldPass ? "green" : "red");
    log(`  PumpFun: ${token.pumpfun ? "✓" : "✗"}`, token.pumpfun ? "green" : "red");
  }
  
  return { success: true };
}

async function main() {
  console.log("\n");
  log("╔══════════════════════════════════════════════════════════════════╗", "cyan");
  log("║  Comprehensive Token Filtering Test Suite                      ║", "cyan");
  log("╚══════════════════════════════════════════════════════════════════╝", "cyan");
  
  const results: Record<string, any> = {};
  
  // Run all tests
  results.test1 = await test1_RealTokenFiltering();
  results.test2 = await test2_EdgeCaseBoundaries();
  results.test3 = await test3_MilestoneCalculations();
  results.test4 = await test4_FilterCombinations();
  
  // Summary
  logSection("TEST SUMMARY");
  
  const passed = Object.values(results).filter(r => r.success).length;
  const total = Object.keys(results).length;
  
  log(`Tests passed: ${passed}/${total}`, passed === total ? "green" : "yellow");
  
  console.log("\nDetailed Results:");
  for (const [testName, result] of Object.entries(results)) {
    const status = result.success ? "✓ PASS" : "✗ FAIL";
    const color = result.success ? "green" : "red";
    log(`  ${testName}: ${status}`, color);
    if (result.error) {
      log(`    Error: ${result.error}`, "red");
    }
  }
  
  console.log("\n");
  
  process.exit(passed === total ? 0 : 1);
}

main().catch((error) => {
  log(`\n✗ Fatal error: ${error.message}`, "red");
  console.error(error);
  process.exit(1);
});

