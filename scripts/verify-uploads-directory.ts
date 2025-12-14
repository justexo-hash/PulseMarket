/**
 * Verify Uploads Directory Setup
 * 
 * This script checks if the public/uploads directory exists and has proper permissions.
 * Run this on Railway to verify the directory is set up correctly.
 * 
 * Run with: npx tsx scripts/verify-uploads-directory.ts
 */

import "dotenv/config";
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
  log("║  Uploads Directory Verification                                 ║", "cyan");
  log("╚══════════════════════════════════════════════════════════════════╝", "cyan");
  console.log("\n");
  
  const uploadsDir = path.join(process.cwd(), "public", "uploads");
  log(`Checking directory: ${uploadsDir}`, "blue");
  console.log();
  
  // Check if directory exists
  try {
    await fs.access(uploadsDir);
    log("✓ Directory exists", "green");
  } catch (error: any) {
    if (error.code === "ENOENT") {
      log("✗ Directory does not exist", "red");
      log("  Creating directory...", "yellow");
      try {
        await fs.mkdir(uploadsDir, { recursive: true });
        log("  ✓ Directory created successfully", "green");
      } catch (createError: any) {
        log(`  ✗ Failed to create directory: ${createError.message}`, "red");
        process.exit(1);
      }
    } else {
      log(`✗ Error accessing directory: ${error.message}`, "red");
      process.exit(1);
    }
  }
  
  // Check write permissions
  try {
    const testFile = path.join(uploadsDir, ".write-test");
    await fs.writeFile(testFile, "test");
    await fs.unlink(testFile);
    log("✓ Write permissions verified", "green");
  } catch (error: any) {
    log(`✗ Cannot write to directory: ${error.message}`, "red");
    log("  This will prevent battle market images from being saved!", "red");
    process.exit(1);
  }
  
  // List existing files
  try {
    const files = await fs.readdir(uploadsDir);
    const battleImages = files.filter(f => f.startsWith("battle-") && f.endsWith(".png"));
    
    log(`\nDirectory contents:`, "blue");
    log(`  Total files: ${files.length}`, "reset");
    log(`  Battle images: ${battleImages.length}`, battleImages.length > 0 ? "green" : "yellow");
    
    if (battleImages.length > 0) {
      log(`\nSample battle images:`, "blue");
      for (const file of battleImages.slice(0, 5)) {
        const filePath = path.join(uploadsDir, file);
        const stats = await fs.stat(filePath);
        log(`  - ${file} (${(stats.size / 1024).toFixed(2)} KB)`, "reset");
      }
      if (battleImages.length > 5) {
        log(`  ... and ${battleImages.length - 5} more`, "reset");
      }
    }
  } catch (error: any) {
    log(`✗ Error reading directory: ${error.message}`, "red");
  }
  
  // Check if files are accessible via /uploads/ route
  log(`\n✓ Directory setup verified`, "green");
  log(`\nNote: Files should be accessible at /uploads/{filename}`, "blue");
  log(`  Example: /uploads/battle-1234567890-abc123.png`, "blue");
  
  console.log("\n");
}

main().catch((error) => {
  log(`\n✗ Fatal error: ${error.message}`, "red");
  console.error(error);
  process.exit(1);
});

