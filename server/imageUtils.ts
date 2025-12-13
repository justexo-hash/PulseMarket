/**
 * Image Processing Utilities
 * 
 * Functions for processing images, including splicing battle market images
 */

import sharp from "sharp";
import path from "path";
import { promises as fs } from "fs";
import crypto from "crypto";

/**
 * Splice two images together by taking left half of image1 and right half of image2
 * 
 * @param image1Url - URL or path to first image (left half will be used)
 * @param image2Url - URL or path to second image (right half will be used)
 * @returns Path to the saved spliced image (relative to public/uploads)
 */
export async function spliceBattleMarketImages(
  image1Url: string,
  image2Url: string
): Promise<string> {
  try {
    // Download both images
    const [image1Buffer, image2Buffer] = await Promise.all([
      downloadImage(image1Url),
      downloadImage(image2Url),
    ]);

    // Get metadata for both images
    const [metadata1, metadata2] = await Promise.all([
      sharp(image1Buffer).metadata(),
      sharp(image2Buffer).metadata(),
    ]);

    if (!metadata1.width || !metadata1.height || !metadata2.width || !metadata2.height) {
      throw new Error("Could not get image dimensions");
    }

    // Use the larger height to ensure both halves fit together nicely
    const targetHeight = Math.max(metadata1.height, metadata2.height);
    
    // Resize both images to same height (maintain aspect ratio)
    const resized1 = await sharp(image1Buffer)
      .resize(null, targetHeight, { fit: "contain" })
      .toBuffer();
    
    const resized2 = await sharp(image2Buffer)
      .resize(null, targetHeight, { fit: "contain" })
      .toBuffer();

    // Get new dimensions after resize
    const resizedMetadata1 = await sharp(resized1).metadata();
    const resizedMetadata2 = await sharp(resized2).metadata();

    if (!resizedMetadata1.width || !resizedMetadata2.width) {
      throw new Error("Could not get resized image dimensions");
    }

    // Extract left half of image1 and right half of image2
    const leftHalf = await sharp(resized1)
      .extract({
        left: 0,
        top: 0,
        width: Math.floor(resizedMetadata1.width / 2),
        height: targetHeight,
      })
      .toBuffer();

    const rightHalf = await sharp(resized2)
      .extract({
        left: Math.floor(resizedMetadata2.width / 2),
        top: 0,
        width: Math.ceil(resizedMetadata2.width / 2),
        height: targetHeight,
      })
      .toBuffer();

    // Combine the two halves
    const combinedWidth = Math.floor(resizedMetadata1.width / 2) + Math.ceil(resizedMetadata2.width / 2);
    
    // Create the spliced image
    let splicedImage = await sharp({
      create: {
        width: combinedWidth,
        height: targetHeight,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .composite([
        { input: leftHalf, left: 0, top: 0 },
        { input: rightHalf, left: Math.floor(resizedMetadata1.width / 2), top: 0 },
      ])
      .png() // Save as PNG to preserve transparency
      .toBuffer();

    // Crop to square (1:1 ratio) if not already square
    // Use the smaller dimension (width or height) to make it square
    const finalSize = Math.min(combinedWidth, targetHeight);
    
    if (combinedWidth !== targetHeight) {
      // Crop from center to make it square
      const cropLeft = Math.floor((combinedWidth - finalSize) / 2);
      const cropTop = Math.floor((targetHeight - finalSize) / 2);
      
      splicedImage = await sharp(splicedImage)
        .extract({
          left: cropLeft,
          top: cropTop,
          width: finalSize,
          height: finalSize,
        })
        .png()
        .toBuffer();
    }

    // Save the spliced image
    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    await fs.mkdir(uploadsDir, { recursive: true });

    const uniqueSuffix = `${Date.now()}-${crypto.randomUUID()}`;
    const filename = `battle-${uniqueSuffix}.png`;
    const filePath = path.join(uploadsDir, filename);

    await fs.writeFile(filePath, splicedImage);

    return `/uploads/${filename}`;
  } catch (error: any) {
    console.error("[ImageUtils] Error splicing images:", error);
    throw new Error(`Failed to splice images: ${error.message}`);
  }
}

/**
 * Download an image from a URL or return buffer if it's already a local path
 * 
 * @param imageUrl - URL or local file path
 * @returns Image buffer
 */
async function downloadImage(imageUrl: string): Promise<Buffer> {
  // If it's already a local path (starts with /uploads/), read from filesystem
  if (imageUrl.startsWith("/uploads/")) {
    const filePath = path.join(process.cwd(), "public", imageUrl);
    return await fs.readFile(filePath);
  }

  // If it's a full URL, download it
  if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.status} ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  // Assume it's a local file path
  return await fs.readFile(imageUrl);
}

