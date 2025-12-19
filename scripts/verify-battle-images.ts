/**
 * Verify Battle Market Images
 * 
 * This script checks:
 * 1. If battle markets exist in the database
 * 2. What image paths they have
 * 3. If the images exist in the filesystem
 * 4. If the images are accessible via the /uploads/ route
 * 
 * Run with: npx tsx scripts/verify-battle-images.ts
 */

import "dotenv/config";
import { db } from "../db/index";
import { markets } from "../shared/schema";
import { eq, and, isNotNull } from "drizzle-orm";
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

async function main() {
  console.log("\n");
  log("╔══════════════════════════════════════════════════════════════════╗", "cyan");
  log("║  Battle Market Images Verification                              ║", "cyan");
  log("╚══════════════════════════════════════════════════════════════════╝", "cyan");
  console.log("\n");
  
  // 1. Check for battle markets in database
  log("Step 1: Checking database for battle markets...", "blue");
  try {
    const battleMarkets = await db
      .select()
      .from(markets)
      .where(
        and(
          isNotNull(markets.tokenAddress2),
          isNotNull(markets.image)
        )
      )
      .limit(10);
    
    log(`Found ${battleMarkets.length} battle markets with images`, battleMarkets.length > 0 ? "green" : "yellow");
    
    if (battleMarkets.length === 0) {
      log("No battle markets found. Create a battle market first.", "yellow");
      return;
    }
    
    console.log("\nBattle Markets:");
    for (const market of battleMarkets) {
      log(`  - Market ID: ${market.id}`, "reset");
      log(`    Question: ${market.question?.substring(0, 60)}...`, "reset");
      log(`    Image: ${market.image}`, market.image?.startsWith("/uploads/") ? "green" : "yellow");
      log(`    Token 1: ${market.tokenAddress}`, "reset");
      log(`    Token 2: ${market.tokenAddress2}`, "reset");
      console.log();
    }
    
    // 2. Check if images exist in filesystem
    log("Step 2: Checking filesystem for images...", "blue");
    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    
    let dirExists = false;
    try {
      await fs.access(uploadsDir);
      dirExists = true;
      log("✓ Uploads directory exists", "green");
    } catch {
      log("✗ Uploads directory does not exist", "red");
      log("  This is expected on Railway if no images have been created yet", "yellow");
    }
    
    if (dirExists) {
      const files = await fs.readdir(uploadsDir);
      const battleImages = files.filter(f => f.startsWith("battle-") && f.endsWith(".png"));
      
      log(`Found ${battleImages.length} battle images in filesystem`, battleImages.length > 0 ? "green" : "yellow");
      
      if (battleImages.length > 0) {
        log("\nSample battle images:", "blue");
        for (const file of battleImages.slice(0, 5)) {
          const filePath = path.join(uploadsDir, file);
          const stats = await fs.stat(filePath);
          log(`  - ${file} (${(stats.size / 1024).toFixed(2)} KB)`, "reset");
        }
      }
      
      // 3. Check if market images match filesystem
      log("\nStep 3: Matching market images to filesystem...", "blue");
      let matched = 0;
      let missing = 0;
      
      for (const market of battleMarkets) {
        if (!market.image) continue;
        
        // Extract filename from path (e.g., "/uploads/battle-xxx.png" -> "battle-xxx.png")
        const filename = market.image.replace("/uploads/", "");
        const filePath = path.join(uploadsDir, filename);
        
        try {
          await fs.access(filePath);
          log(`  ✓ Market ${market.id}: ${filename} exists`, "green");
          matched++;
        } catch {
          log(`  ✗ Market ${market.id}: ${filename} NOT FOUND`, "red");
          missing++;
        }
      }
      
      log(`\nMatched: ${matched}/${battleMarkets.length}`, matched === battleMarkets.length ? "green" : "yellow");
      if (missing > 0) {
        log(`Missing: ${missing} images`, "red");
        log("\nPossible reasons:", "yellow");
        log("  1. Images were created but lost after Railway redeploy (ephemeral filesystem)", "yellow");
        log("  2. Images failed to save (check Railway logs for [ImageUtils] errors)", "yellow");
        log("  3. Images were created on a different server instance", "yellow");
      }
    }
    
    // 4. Check image paths
    log("\nStep 4: Verifying image paths...", "blue");
    for (const market of battleMarkets) {
      if (!market.image) continue;
      
      if (market.image.startsWith("/uploads/")) {
        log(`  ✓ Market ${market.id}: Path format correct (${market.image})`, "green");
      } else if (market.image.startsWith("http")) {
        log(`  ⚠ Market ${market.id}: Using external URL (${market.image})`, "yellow");
      } else {
        log(`  ✗ Market ${market.id}: Invalid path format (${market.image})`, "red");
      }
    }
    
    // 5. Summary
    log("\n" + "=".repeat(70), "cyan");
    log("Summary:", "cyan");
    log(`  Battle markets found: ${battleMarkets.length}`, "reset");
    if (dirExists) {
      const files = await fs.readdir(uploadsDir);
      const battleImages = files.filter(f => f.startsWith("battle-") && f.endsWith(".png"));
      log(`  Battle images in filesystem: ${battleImages.length}`, battleImages.length > 0 ? "green" : "yellow");
    } else {
      log(`  Uploads directory: Does not exist (will be created on first image)`, "yellow");
    }
    
    log("\nNext steps:", "blue");
    log("  1. Check Railway logs for [ImageUtils] and [AutomatedMarkets] messages", "reset");
    log("  2. Create a new battle market and watch the logs", "reset");
    log("  3. Verify the image is accessible at: https://your-domain.com/uploads/battle-xxx.png", "reset");
    
  } catch (error: any) {
    log(`✗ Error: ${error.message}`, "red");
    console.error(error);
    process.exit(1);
  }
  
  console.log("\n");
}

main().catch((error) => {
  log(`\n✗ Fatal error: ${error.message}`, "red");
  console.error(error);
  process.exit(1);
});

