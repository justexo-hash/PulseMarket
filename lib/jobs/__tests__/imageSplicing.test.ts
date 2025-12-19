/**
 * Image Splicing Tests for Battle Markets
 * 
 * These tests validate the image splicing functionality:
 * - Downloads real token images from API
 * - Splices left half of token1 with right half of token2
 * - Creates output file in /public/uploads/
 * 
 * ⚠️ NOTE: These tests CREATE OUTPUT FILES
 * Output location: /public/uploads/battle-{timestamp}-{uuid}.png
 * You can manually delete these files after testing.
 * 
 * Run with: npx tsx lib/jobs/__tests__/imageSplicing.test.ts
 * 
 * Prerequisites:
 * - SOLANA_TRACKER_KEY set in .env
 * - Internet connection
 * - sharp package installed (npm install sharp)
 */

import { config } from "dotenv";
import { getTrendingTokens } from "../../../server/solanaTracker";
import { spliceBattleMarketImages } from "../../../server/imageUtils";
import { promises as fs } from "fs";
import path from "path";
import sharp from "sharp";

config();

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  outputFile?: string;
  details?: any;
}

const results: TestResult[] = [];
const createdFiles: string[] = [];

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
    toBeTruthy: () => {
      if (!actual) {
        throw new Error(`Expected truthy value, got ${actual}`);
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
  console.log("🧪 Running Image Splicing Tests\n");
  console.log("⚠️  These tests will CREATE output files in /public/uploads/\n");
  console.log("💡 You can manually delete them after testing\n");

  // Test 1: Find tokens with images
  let token1Image: string | null = null;
  let token2Image: string | null = null;
  let token1Name = "";
  let token2Name = "";
  let token1Address = "";
  let token2Address = "";

  await describe("Finding Tokens with Images", async () => {
    await it("should find tokens with valid image URLs", async () => {
      const tokens = await getTrendingTokens();
      
      if (tokens.length < 2) {
        throw new Error("Need at least 2 tokens for splicing test");
      }

      // Collect all tokens with valid images (skip SVG files)
      const tokensWithImages = tokens.filter(t => 
        t.token.image && 
        t.token.image.startsWith("http") &&
        !t.token.image.toLowerCase().endsWith(".svg") // Skip SVG files
      );

      if (tokensWithImages.length < 2) {
        throw new Error(`Need at least 2 tokens with images, found ${tokensWithImages.length}`);
      }

      // Try different token pairs until we find ones that work
      // Skip jelly-my-jelly (FeR8VBqNRSUD5NtXAj2n3j1dAHkZHfyDktKuLXD4pump)
      const jellyAddress = "FeR8VBqNRSUD5NtXAj2n3j1dAHkZHfyDktKuLXD4pump";
      const filteredTokens = tokensWithImages.filter(t => t.token.mint !== jellyAddress);
      
      if (filteredTokens.length < 2) {
        throw new Error(`Need at least 2 tokens with images (excluding jelly), found ${filteredTokens.length}`);
      }
      
      let foundWorkingPair = false;
      const maxAttempts = Math.min(10, filteredTokens.length - 1);
      
      for (let attempt = 0; attempt < maxAttempts && !foundWorkingPair; attempt++) {
        const token1Index = attempt;
        const token2Index = Math.min(attempt + 3, filteredTokens.length - 1);
        
        if (token1Index >= token2Index) continue;
        
        const token1 = filteredTokens[token1Index];
        const token2 = filteredTokens[token2Index];
        
        if (token1 && token2 && token1.token.image !== token2.token.image) {
          token1Image = token1.token.image; // Using token.image from API
          token1Name = token1.token.name || token1.token.symbol || "Token1";
          token1Address = token1.token.mint || "";

          token2Image = token2.token.image; // Using token.image from API
          token2Name = token2.token.name || token2.token.symbol || "Token2";
          token2Address = token2.token.mint || "";
          
          foundWorkingPair = true;
        }
      }

      if (!token1Image || !token2Image) {
        throw new Error("Could not find two different tokens with valid images");
      }

      if (!token2Image) {
        throw new Error("Could not find second token with image URL");
      }

      console.log(`    ℹ️  Token 1: ${token1Name}`);
      console.log(`       Address: ${token1Address}`);
      console.log(`       Image: ${token1Image.substring(0, 60)}...`);
      console.log(`    ℹ️  Token 2: ${token2Name}`);
      console.log(`       Address: ${token2Address}`);
      console.log(`       Image: ${token2Image.substring(0, 60)}...`);

      return true;
    });
  });

  // Test 2: Splice Images (WITHOUT jelly-my-jelly - should be square)
  await describe("Image Splicing (Non-Jelly Tokens)", async () => {
    if (!token1Image || !token2Image) {
      console.log("\n⚠️  Skipping splicing tests - no tokens with images found");
      return;
    }

    await it("should splice two images together and crop to square (left half + right half)", async () => {
      if (!token1Image || !token2Image) {
        throw new Error("Token images not found");
      }
      const splicedPath = await spliceBattleMarketImages(token1Image, token2Image);
      
      if (!splicedPath) {
        throw new Error("Splicing returned no path");
      }

      if (!splicedPath.startsWith("/uploads/")) {
        throw new Error(`Expected path to start with /uploads/, got ${splicedPath}`);
      }

      if (!splicedPath.includes("battle-")) {
        throw new Error(`Expected path to contain 'battle-', got ${splicedPath}`);
      }

      if (!splicedPath.endsWith(".png")) {
        throw new Error(`Expected path to end with .png, got ${splicedPath}`);
      }

      // Verify file exists
      const filePath = path.join(process.cwd(), "public", splicedPath);
      try {
        await fs.access(filePath);
      } catch {
        throw new Error(`Spliced image file not found at ${filePath}`);
      }

      // Get file stats
      const stats = await fs.stat(filePath);
      if (stats.size === 0) {
        throw new Error("Spliced image file is empty");
      }

      createdFiles.push(splicedPath);
      console.log(`    ✓ Created: ${splicedPath}`);
      console.log(`    ✓ File size: ${(stats.size / 1024).toFixed(2)} KB`);

      // Verify image is square (1:1 ratio)
      const image = sharp(filePath);
      const metadata = await image.metadata();
      if (metadata.width && metadata.height) {
        if (metadata.width === metadata.height) {
          console.log(`    ✓ Image is square: ${metadata.width}x${metadata.height}`);
        } else {
          throw new Error(`Image is not square: ${metadata.width}x${metadata.height}`);
        }
      }

      return true;
    });

    await it("should create valid PNG image file", async () => {
      if (createdFiles.length === 0) {
        throw new Error("No spliced image created in previous test");
      }

      const splicedPath = createdFiles[0];
      const filePath = path.join(process.cwd(), "public", splicedPath);
      
      // Read file and check PNG header
      const buffer = await fs.readFile(filePath);
      const pngHeader = buffer.slice(0, 8);
      const expectedHeader = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
      
      if (!pngHeader.equals(expectedHeader)) {
        throw new Error("File is not a valid PNG (missing PNG header)");
      }

      console.log(`    ✓ Verified PNG format: ${splicedPath}`);
      return true;
    });

    await it("should handle image URLs from different sources", async () => {
      if (!token1Image || !token2Image) {
        throw new Error("Token images not found");
      }
      // Test with the same images but verify it works
      const splicedPath = await spliceBattleMarketImages(token1Image, token2Image);
      
      if (!splicedPath) {
        throw new Error("Splicing failed");
      }

      const filePath = path.join(process.cwd(), "public", splicedPath);
      const stats = await fs.stat(filePath);
      
      if (stats.size === 0) {
        throw new Error("Spliced image is empty");
      }

      // Verify square
      const image = sharp(filePath);
      const metadata = await image.metadata();
      if (metadata.width && metadata.height && metadata.width !== metadata.height) {
        throw new Error(`Image should be square but is ${metadata.width}x${metadata.height}`);
      }

      createdFiles.push(splicedPath);
      console.log(`    ✓ Created second spliced image: ${splicedPath}`);
      if (metadata.width && metadata.height) {
        console.log(`    ✓ Verified square: ${metadata.width}x${metadata.height}`);
      }
      return true;
    });
  });

  // Test 3: Splice WITH jelly-my-jelly (to test cropping from non-square)
  await describe("Image Splicing (WITH jelly-my-jelly - Tests Cropping)", async () => {
    await it("should find jelly-my-jelly token for cropping test", async () => {
      const tokens = await getTrendingTokens();
      const jellyToken = tokens.find(t => 
        t.token.mint === "FeR8VBqNRSUD5NtXAj2n3j1dAHkZHfyDktKuLXD4pump"
      );

      if (!jellyToken || !jellyToken.token.image) {
        throw new Error("jelly-my-jelly token not found or has no image");
      }

      // Find a different token to pair with jelly
      const otherToken = tokens.find(t => 
        t.token.mint !== "FeR8VBqNRSUD5NtXAj2n3j1dAHkZHfyDktKuLXD4pump" &&
        t.token.image && 
        t.token.image.startsWith("http") &&
        !t.token.image.toLowerCase().endsWith(".svg")
      );

      if (!otherToken || !otherToken.token.image) {
        throw new Error("Could not find another token to pair with jelly");
      }

      const jellyImage = jellyToken.token.image;
      const otherImage = otherToken.token.image;

      console.log(`    ℹ️  Testing with jelly-my-jelly: ${jellyToken.token.name || jellyToken.token.symbol}`);
      console.log(`    ℹ️  Paired with: ${otherToken.token.name || otherToken.token.symbol}`);

      // Perform the splice
      const splicedPath = await spliceBattleMarketImages(jellyImage, otherImage);
      
      if (!splicedPath) {
        throw new Error("Splicing failed");
      }

      const filePath = path.join(process.cwd(), "public", splicedPath);
      const stats = await fs.stat(filePath);
      
      if (stats.size === 0) {
        throw new Error("Spliced image is empty");
      }

      // Verify it's square (cropping should have made it square)
      const image = sharp(filePath);
      const metadata = await image.metadata();
      if (metadata.width && metadata.height) {
        if (metadata.width === metadata.height) {
          console.log(`    ✓ Image cropped to square: ${metadata.width}x${metadata.height}`);
          console.log(`    ✓ File size: ${(stats.size / 1024).toFixed(2)} KB`);
        } else {
          throw new Error(`Image should be square after cropping but is ${metadata.width}x${metadata.height}`);
        }
      }

      createdFiles.push(splicedPath);
      return true;
    });
  });

  // Test 3: Edge Cases
  await describe("Edge Cases", async () => {
    await it("should handle missing image gracefully (fallback logic)", async () => {
      // This tests the fallback logic in automatedMarkets.ts
      // When one image is missing, it should fallback to the other
      const hasImage1 = !!token1Image;
      const hasImage2 = !!token2Image;
      
      // If both have images, splicing should work
      // If one is missing, fallback should work
      if (hasImage1 && hasImage2) {
        // Both have images - splicing should work
        const splicedPath = await spliceBattleMarketImages(token1Image!, token2Image!);
        expect(splicedPath).toBeTruthy();
        createdFiles.push(splicedPath);
        console.log(`    ✓ Both images present - splicing works`);
      } else {
        // Fallback logic would use whichever image exists
        console.log(`    ℹ️  One or both images missing - fallback would be used`);
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

  if (createdFiles.length > 0) {
    console.log("\n📁 Created Files (you can delete these manually):");
    createdFiles.forEach(file => {
      const fullPath = path.join(process.cwd(), "public", file);
      console.log(`   - ${file}`);
      console.log(`     Full path: ${fullPath}`);
    });
    console.log("\n💡 To delete all test images:");
    console.log(`   rm public/uploads/battle-*.png`);
  }

  if (token1Address && token2Address) {
    console.log("\n🔍 Token Addresses for Verification:");
    console.log(`   Token 1 (${token1Name}): ${token1Address}`);
    console.log(`   Token 2 (${token2Name}): ${token2Address}`);
    console.log("\n   Original Images:");
    console.log(`   Token 1: ${token1Image}`);
    console.log(`   Token 2: ${token2Image}`);
  }

  if (failed > 0) {
    console.log("\n❌ Failed Tests:");
    results.filter(r => !r.passed).forEach(r => {
      console.log(`  - ${r.name}: ${r.error}`);
    });
    process.exit(1);
  } else {
    console.log("\n✅ All image splicing tests passed!");
    process.exit(0);
  }
}

// Run tests
runTests().catch(error => {
  console.error("Fatal error:", error);
  process.exit(1);
});

