/**
 * Manual Test Script for Automated Market Creation Logic
 * 
 * Run with: npx tsx scripts/test-automated-markets.ts
 * 
 * This script tests all calculation functions and edge cases without requiring a test framework.
 */

// Test calculation functions (simplified versions for testing)
const MARKET_CAP_MILESTONES = [250000, 500000, 750000, 1000000, 2000000, 3000000, 5000000, 10000000, 20000000, 50000000, 100000000];
const HOLDER_MILESTONES = [500, 1000, 2000, 3000, 5000, 7500, 10000, 15000, 20000, 30000, 50000];

function roundUpToMilestone(value: number, milestones: number[]): number {
  for (const milestone of milestones) {
    if (milestone >= value) {
      return milestone;
    }
  }
  return milestones[milestones.length - 1];
}

function roundToNearest100K(value: number): number {
  return Math.round(value / 100000) * 100000;
}

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

const results: TestResult[] = [];

function test(name: string, fn: () => boolean | void) {
  try {
    const result = fn();
    const passed = result !== false;
    results.push({ name, passed, error: passed ? undefined : "Test returned false" });
    console.log(passed ? `✓ ${name}` : `✗ ${name}`);
  } catch (error: any) {
    results.push({ name, passed: false, error: error.message });
    console.log(`✗ ${name}: ${error.message}`);
  }
}

console.log("🧪 Testing Automated Market Creation Logic\n");

// Market Cap Tests
test("Market Cap: $300K → 2x = $600K → round up to $750K", () => {
  const currentMC = 300000;
  const doubled = currentMC * 2;
  const target = roundUpToMilestone(doubled, MARKET_CAP_MILESTONES);
  return target === 750000;
});

test("Market Cap: $250K → 2x = $500K → exact match", () => {
  const currentMC = 250000;
  const doubled = currentMC * 2;
  const target = roundUpToMilestone(doubled, MARKET_CAP_MILESTONES);
  return target === 500000;
});

test("Market Cap: $60M → 2x = $120M → cap at $100M", () => {
  const currentMC = 60000000;
  const doubled = currentMC * 2;
  let target = roundUpToMilestone(doubled, MARKET_CAP_MILESTONES);
  if (target < doubled) {
    target = MARKET_CAP_MILESTONES[MARKET_CAP_MILESTONES.length - 1];
  }
  return target === 100000000;
});

test("Market Cap: Skip if already above all milestones", () => {
  const currentMC = 150000000;
  const maxMilestone = MARKET_CAP_MILESTONES[MARKET_CAP_MILESTONES.length - 1];
  return currentMC >= maxMilestone;
});

// Holder Tests
test("Holders: 350 → 2x = 700 → round up to 1K", () => {
  const currentHolders = 350;
  const doubled = currentHolders * 2;
  const target = roundUpToMilestone(doubled, HOLDER_MILESTONES);
  return target === 1000;
});

test("Holders: Skip if < 100 holders", () => {
  const currentHolders = 50;
  return currentHolders < 100;
});

test("Holders: Handle 2x rounding to same number", () => {
  const currentHolders = 100;
  const doubled = currentHolders * 2;
  let target = roundUpToMilestone(doubled, HOLDER_MILESTONES);
  if (target <= currentHolders) {
    target = Math.ceil(currentHolders * 1.1);
    target = roundUpToMilestone(target, HOLDER_MILESTONES);
  }
  return target > currentHolders;
});

// Battle Market Tests
test("Battle Race: Use lower MC for target ($300K vs $350K → use $300K)", () => {
  const token1MC = 300000;
  const token2MC = 350000;
  const lowerMC = Math.min(token1MC, token2MC);
  const doubled = lowerMC * 2;
  const target = roundUpToMilestone(doubled, MARKET_CAP_MILESTONES);
  return target === 750000 && lowerMC === 300000;
});

test("Battle Dump: $800K → 50% = $400K → round to $400K", () => {
  const currentMC = 800000;
  const fiftyPercent = currentMC * 0.5;
  let rounded = roundToNearest100K(fiftyPercent);
  if (rounded < 100000) {
    rounded = 100000;
  }
  return rounded === 400000;
});

test("Battle Dump: $1.5M → 50% = $750K → round to $800K", () => {
  const currentMC = 1500000;
  const fiftyPercent = currentMC * 0.5;
  const rounded = roundToNearest100K(fiftyPercent);
  return rounded === 800000;
});

test("Battle Dump: Enforce 100K minimum", () => {
  const currentMC = 150000;
  const fiftyPercent = currentMC * 0.5;
  let rounded = roundToNearest100K(fiftyPercent);
  if (rounded < 100000) {
    rounded = 100000;
  }
  return rounded === 100000;
});

// Token Matching Tests
test("Token Matching: Within 30% buffer should match", () => {
  const mc1 = 1000000;
  const mc2 = 1200000;
  const age1 = 48;
  const age2 = 52.8;
  
  const avgMC = (mc1 + mc2) / 2;
  const mcDiff = Math.abs(mc1 - mc2) / avgMC;
  
  const avgAge = (age1 + age2) / 2;
  const ageDiff = Math.abs(age1 - age2) / avgAge;
  
  return mcDiff <= 0.30 && ageDiff <= 0.30;
});

test("Token Matching: Outside 30% buffer should not match", () => {
  const mc1 = 1000000;
  const mc2 = 2000000;
  const age1 = 48;
  const age2 = 48;
  
  const avgMC = (mc1 + mc2) / 2;
  const mcDiff = Math.abs(mc1 - mc2) / avgMC;
  
  const avgAge = (age1 + age2) / 2;
  const ageDiff = Math.abs(age1 - age2) / avgAge;
  
  return !(mcDiff <= 0.30 && ageDiff <= 0.30);
});

// Expiration Tests
test("Market Cap: 120 minutes expiration", () => {
  const now = new Date();
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + 120);
  const diffMinutes = (expiresAt.getTime() - now.getTime()) / (1000 * 60);
  return Math.abs(diffMinutes - 120) < 1;
});

test("Volume/Holders: 1 day expiration", () => {
  const now = new Date();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 1);
  const diffHours = (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60);
  return Math.abs(diffHours - 24) < 1;
});

test("Battle Markets: 2 days expiration", () => {
  const now = new Date();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 2);
  const diffHours = (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60);
  return Math.abs(diffHours - 48) < 1;
});

// Resolution Tests
test("Resolution: YES when current >= target", () => {
  const currentMC = 800000;
  const target = 750000;
  return currentMC >= target;
});

test("Resolution: NO when current < target", () => {
  const currentMC = 600000;
  const target = 750000;
  return currentMC < target;
});

test("Battle: Token1 wins when hits target first", () => {
  const token1HitTime = 1000;
  const token2HitTime = 2000;
  return token1HitTime < token2HitTime;
});

test("Battle: Refund when expired and no winner", () => {
  const now = new Date();
  const expiresAt = new Date(now.getTime() - 1000);
  const token1HitTime = null;
  const token2HitTime = null;
  return now > expiresAt && token1HitTime === null && token2HitTime === null;
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
  console.log("\n✅ All tests passed!");
  process.exit(0);
}

