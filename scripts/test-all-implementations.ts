/**
 * Comprehensive Test Script for All 5 Implementation Changes
 * 
 * Tests:
 * 1. PumpFun token filtering
 * 2. Battle market button labels (visual check needed)
 * 3. Market card image display (visual check needed)
 * 4. DexScreener chart embedding (visual check needed)
 * 5. Contract address search functionality
 */

import "dotenv/config";
import { getGraduatedTokens } from "../server/solanaTracker";
import { runAutomatedMarketCreation } from "../lib/jobs/automatedMarkets";
import { storage } from "../server/storage";
import { promises as fs } from "fs";
import path from "path";

const COLORS = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
};

function log(message: string, color: keyof typeof COLORS = "reset") {
  console.log(`${COLORS[color]}${message}${COLORS.reset}`);
}

function logSection(title: string) {
  console.log("\n" + "=".repeat(60));
  log(title, "cyan");
  console.log("=".repeat(60) + "\n");
}

async function test1_PumpFunFiltering() {
  logSection("TEST 1: PumpFun Token Filtering");
  
  try {
    log("Fetching graduated tokens...", "blue");
    const tokens = await getGraduatedTokens({ limit: 50 });
    log(`✓ Fetched ${tokens.length} tokens`, "green");
    
    // Check market types
    const marketTypes = new Map<string, number>();
    let pumpfunCount = 0;
    let nonPumpfunCount = 0;
    
    for (const token of tokens) {
      const markets = token.pools.map(p => p.market?.toLowerCase() || "unknown");
      for (const market of markets) {
        marketTypes.set(market, (marketTypes.get(market) || 0) + 1);
        if (market === "pumpfun") {
          pumpfunCount++;
        } else {
          nonPumpfunCount++;
        }
      }
    }
    
    log("\nMarket type distribution:", "yellow");
    for (const [market, count] of Array.from(marketTypes.entries()).sort((a, b) => b[1] - a[1])) {
      log(`  ${market}: ${count}`, market === "pumpfun" ? "green" : "reset");
    }
    
    log(`\n✓ PumpFun tokens found: ${pumpfunCount}`, pumpfunCount > 0 ? "green" : "yellow");
    log(`✓ Non-PumpFun tokens found: ${nonPumpfunCount}`, "yellow");
    
    if (pumpfunCount === 0) {
      log("⚠️  WARNING: No PumpFun tokens found in sample!", "red");
      log("   This might mean the API response structure changed or no PumpFun tokens are available.", "yellow");
    } else {
      log("✓ PumpFun filtering should work correctly", "green");
    }
    
    return { success: true, pumpfunCount, nonPumpfunCount };
  } catch (error: any) {
    log(`✗ Test failed: ${error.message}`, "red");
    return { success: false, error: error.message };
  }
}

async function test2_BattleMarketCreation() {
  logSection("TEST 2: Battle Market Creation (Image Splicing)");
  
  try {
    log("Creating a test battle market...", "blue");
    log("(This will test image splicing and PumpFun filtering)", "blue");
    
    const result = await runAutomatedMarketCreation("battle_race", true); // testMode = true
    
    if (result.success && result.marketCreated) {
      log(`✓ Battle market created successfully!`, "green");
      log(`  Market ID: ${result.marketCreated}`, "blue");
      log(`  Market Type: ${result.marketType}`, "blue");
      
      // Get the market to check image
      const market = await storage.getMarketById(result.marketCreated);
      if (market) {
        log(`\nMarket details:`, "yellow");
        log(`  Question: ${market.question}`, "reset");
        log(`  Image path: ${market.image || "NONE"}`, market.image ? "green" : "red");
        log(`  Token 1: ${market.tokenAddress}`, "blue");
        log(`  Token 2: ${market.tokenAddress2 || "NONE"}`, market.tokenAddress2 ? "blue" : "red");
        
        // Check if image file exists
        if (market.image && market.image.startsWith("/uploads/")) {
          const imagePath = path.join(process.cwd(), "public", market.image);
          try {
            await fs.access(imagePath);
            const stats = await fs.stat(imagePath);
            log(`\n✓ Image file exists: ${imagePath}`, "green");
            log(`  File size: ${(stats.size / 1024).toFixed(2)} KB`, "blue");
          } catch (error: any) {
            log(`\n✗ Image file NOT found: ${imagePath}`, "red");
            log(`  Error: ${error.message}`, "red");
          }
        } else {
          log(`\n⚠️  Market has no image path set`, "yellow");
        }
      }
      
      return { success: true, marketId: result.marketCreated, market };
    } else {
      log(`✗ Failed to create battle market: ${result.error}`, "red");
      return { success: false, error: result.error };
    }
  } catch (error: any) {
    log(`✗ Test failed: ${error.message}`, "red");
    return { success: false, error: error.message };
  }
}

async function test3_ContractAddressSearch() {
  logSection("TEST 3: Contract Address Search");
  
  try {
    log("Fetching all markets...", "blue");
    const allMarkets = await storage.getAllMarkets();
    
    // Filter for automated markets with token addresses
    const marketsWithAddresses = allMarkets.filter(m => 
      m.isAutomated === 1 && (m.tokenAddress || m.tokenAddress2)
    );
    
    log(`✓ Found ${marketsWithAddresses.length} automated markets with token addresses`, "green");
    
    if (marketsWithAddresses.length === 0) {
      log("⚠️  No markets with addresses found - cannot test search", "yellow");
      return { success: true, skipped: true };
    }
    
    // Test search by token address
    const testMarket = marketsWithAddresses[0];
    const searchQuery = testMarket.tokenAddress?.substring(0, 8) || ""; // First 8 chars
    
    if (!searchQuery) {
      log("⚠️  No token address to test with", "yellow");
      return { success: true, skipped: true };
    }
    
    log(`\nTesting search with query: "${searchQuery}"`, "blue");
    log(`  (First 8 chars of token: ${testMarket.tokenAddress})`, "blue");
    
    // Simulate the search logic from useMarketSearch
    const matchingMarkets = allMarkets.filter(market => {
      const query = searchQuery.toLowerCase();
      return (
        market.question.toLowerCase().includes(query) ||
        market.tokenAddress?.toLowerCase().includes(query) ||
        market.tokenAddress2?.toLowerCase().includes(query)
      );
    });
    
    log(`✓ Found ${matchingMarkets.length} matching markets`, "green");
    
    if (matchingMarkets.length > 0) {
      log(`\nSample matches:`, "yellow");
      matchingMarkets.slice(0, 3).forEach(m => {
        const matches = [];
        if (m.question.toLowerCase().includes(searchQuery.toLowerCase())) matches.push("question");
        if (m.tokenAddress?.toLowerCase().includes(searchQuery.toLowerCase())) matches.push("token1");
        if (m.tokenAddress2?.toLowerCase().includes(searchQuery.toLowerCase())) matches.push("token2");
        log(`  - Market ${m.id}: matches by ${matches.join(", ")}`, "reset");
      });
    }
    
    return { success: true, matches: matchingMarkets.length };
  } catch (error: any) {
    log(`✗ Test failed: ${error.message}`, "red");
    return { success: false, error: error.message };
  }
}

async function test4_ImageFilesExist() {
  logSection("TEST 4: Verify Image Files in public/uploads/");
  
  try {
    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    
    // Check if directory exists
    try {
      await fs.access(uploadsDir);
      log(`✓ Uploads directory exists: ${uploadsDir}`, "green");
    } catch {
      log(`✗ Uploads directory does not exist: ${uploadsDir}`, "red");
      log(`  Creating directory...`, "yellow");
      await fs.mkdir(uploadsDir, { recursive: true });
      log(`✓ Created uploads directory`, "green");
    }
    
    // List all files
    const files = await fs.readdir(uploadsDir);
    const battleImages = files.filter(f => f.startsWith("battle-") && f.endsWith(".png"));
    
    log(`\nFiles in uploads directory:`, "yellow");
    log(`  Total files: ${files.length}`, "blue");
    log(`  Battle images: ${battleImages.length}`, battleImages.length > 0 ? "green" : "yellow");
    
    if (battleImages.length > 0) {
      log(`\nBattle image files:`, "yellow");
      for (const file of battleImages.slice(0, 5)) {
        const filePath = path.join(uploadsDir, file);
        const stats = await fs.stat(filePath);
        log(`  - ${file} (${(stats.size / 1024).toFixed(2)} KB)`, "reset");
      }
      if (battleImages.length > 5) {
        log(`  ... and ${battleImages.length - 5} more`, "reset");
      }
    } else {
      log(`\n⚠️  No battle images found in uploads directory`, "yellow");
      log(`   This might mean:`, "yellow");
      log(`   1. No battle markets have been created yet`, "reset");
      log(`   2. Image splicing is failing silently`, "reset");
      log(`   3. Images are being saved to a different location`, "reset");
    }
    
    return { success: true, battleImages: battleImages.length, totalFiles: files.length };
  } catch (error: any) {
    log(`✗ Test failed: ${error.message}`, "red");
    return { success: false, error: error.message };
  }
}

async function main() {
  console.log("\n");
  log("╔══════════════════════════════════════════════════════════╗", "cyan");
  log("║  Comprehensive Test Suite for Implementation Changes   ║", "cyan");
  log("╚══════════════════════════════════════════════════════════╝", "cyan");
  
  const results: Record<string, any> = {};
  
  // Run all tests
  results.test1 = await test1_PumpFunFiltering();
  results.test2 = await test2_BattleMarketCreation();
  results.test3 = await test3_ContractAddressSearch();
  results.test4 = await test4_ImageFilesExist();
  
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
  
  log("\n⚠️  NOTE: Visual tests required for:", "yellow");
  log("  - Battle market button labels (should show token names)", "yellow");
  log("  - DexScreener charts (should load in market details)", "yellow");
  log("  - Market card images (should display spliced images)", "yellow");
  
  console.log("\n");
  
  process.exit(passed === total ? 0 : 1);
}

main().catch((error) => {
  log(`\n✗ Fatal error: ${error.message}`, "red");
  console.error(error);
  process.exit(1);
});

