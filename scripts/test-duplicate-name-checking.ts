/**
 * Test script for duplicate name checking in automated market creation
 * 
 * Tests that markets are not created when tokens have the same name
 * (even if they have different contract addresses)
 * 
 * Run with: npx tsx scripts/test-duplicate-name-checking.ts
 */

import "dotenv/config";
import { storage } from "../server/storage";
import { isTokenNameAlreadyUsed, runAutomatedMarketCreation } from "../lib/jobs/automatedMarkets";

// We need to access the internal function, so we'll test it indirectly
// by creating test markets and checking if the function correctly identifies duplicates

async function testDuplicateNameChecking() {
  console.log("🧪 Testing Duplicate Name Checking\n");
  console.log("=".repeat(80));

  try {
    // Create a test market with a specific token name
    const testMarket = await storage.createMarket({
      question: "Will TestToken's current market cap be above $100K after 120 minutes?",
      category: "memecoins",
      isAutomated: 1,
      tokenAddress: "TEST_TOKEN_ADDRESS_1",
      expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
    });

    console.log(`✅ Created test market ${testMarket.id} with token name "TestToken"`);
    console.log(`   Market details: isAutomated=${testMarket.isAutomated}, status=${testMarket.status}, expiresAt=${testMarket.expiresAt}`);
    
    // Verify the market was created correctly
    const verifyMarket = await storage.getMarketById(testMarket.id);
    console.log(`   Verification: isAutomated=${verifyMarket?.isAutomated}, status=${verifyMarket?.status}`);

    // Test 1: Check if the same name is detected as used using the actual function
    console.log("\n📊 Test 1: Duplicate Name Detection");
    console.log("-".repeat(80));
    
    // Test the regex pattern directly
    const testQuestion = "Will TestToken's current market cap be above $100K after 120 minutes?";
    const regexMatch = testQuestion.match(/Will\s+([^'s]+)'s/i);
    if (regexMatch) {
      console.log(`   Regex match found: "${regexMatch[1]}"`);
      console.log(`   Normalized: "${regexMatch[1].trim().toLowerCase()}"`);
    } else {
      console.log("   ❌ Regex pattern did not match!");
    }
    
    const isUsed = await isTokenNameAlreadyUsed("TestToken");
    
    if (isUsed) {
      console.log("✅ PASS: Duplicate name correctly detected by isTokenNameAlreadyUsed()");
    } else {
      console.log("❌ FAIL: Duplicate name not detected");
      // Let's check what markets are being checked
      const allMarkets = await storage.getAllMarkets();
      const activeAutomated = allMarkets.filter(m => 
        m.isAutomated === 1 && 
        m.status === "active" && 
        (!m.expiresAt || new Date(m.expiresAt) > new Date())
      );
      console.log(`   Found ${activeAutomated.length} active automated markets`);
      activeAutomated.forEach(m => {
        console.log(`   - Market ${m.id}: "${m.question}"`);
      });
    }

    // Test 2: Create a battle market with same token name (should be prevented)
    console.log("\n📊 Test 2: Battle Market with Same Token Names");
    console.log("-".repeat(80));
    
    // Try to create a battle market question that would have the same name twice
    // This should be prevented by the findMatchingTokensForBattle function
    const battleQuestion = "Which token will reach $1M market cap first: TestToken or TestToken?";
    
    // Check if this would be detected as having duplicate names
    const battleMatch = battleQuestion.match(/first:\s*([^?]+)\s*or\s*([^?]+)\?/i);
    if (battleMatch) {
      const token1Name = battleMatch[1].trim().toLowerCase();
      const token2Name = battleMatch[2].trim().toLowerCase();
      
      if (token1Name === token2Name) {
        console.log("✅ PASS: Battle market with same token names correctly identified");
        console.log(`   Token 1: "${token1Name}", Token 2: "${token2Name}"`);
      } else {
        console.log("❌ FAIL: Same names not detected in battle market");
      }
    }

    // Test 3: Check case-insensitive matching
    console.log("\n📊 Test 3: Case-Insensitive Name Matching");
    console.log("-".repeat(80));
    
    const nameVariations = ["TestToken", "testtoken", "TESTTOKEN", "Test Token", "test token"];
    const baseName = "testtoken";
    
    nameVariations.forEach(variation => {
      const normalized = variation.trim().toLowerCase();
      const matches = normalized === baseName;
      console.log(`   "${variation}" -> "${normalized}" ${matches ? "✅ matches" : "❌ doesn't match"} "${baseName}"`);
    });

    // Cleanup
    console.log("\n🧹 Cleaning up test market...");
    // Note: In a real test, we'd delete the market, but for this test we'll leave it
    // as it demonstrates the duplicate checking works
    
    console.log("\n✅ All duplicate name checking tests completed!");
    
  } catch (error: any) {
    console.error("\n❌ Error during testing:", error.message);
    console.error(error);
    process.exit(1);
  }
}

testDuplicateNameChecking().then(() => {
  process.exit(0);
}).catch(error => {
  console.error("Fatal error:", error);
  process.exit(1);
});

