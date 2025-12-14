/**
 * Image Cleanup Job
 * 
 * Deletes battle images and other uploads older than 7 days.
 * This prevents storage from filling up with old images.
 * 
 * Run via: POST /api/jobs/image-cleanup
 */

import { promises as fs } from "fs";
import path from "path";

const UPLOADS_DIR = process.env.UPLOADS_DIR || path.join(process.cwd(), "public", "uploads");
const MAX_AGE_DAYS = 7;
const MAX_AGE_MS = MAX_AGE_DAYS * 24 * 60 * 60 * 1000;

/**
 * Clean up old images from the uploads directory
 * Deletes files older than 7 days
 */
export async function cleanupOldImages(): Promise<{
  success: boolean;
  deleted: number;
  errors: string[];
  totalSizeFreed: number; // bytes
}> {
  const errors: string[] = [];
  let deleted = 0;
  let totalSizeFreed = 0;

  try {
    // Check if directory exists
    try {
      await fs.access(UPLOADS_DIR);
    } catch {
      console.log(`[ImageCleanup] Uploads directory does not exist: ${UPLOADS_DIR}`);
      return { success: true, deleted: 0, errors: [], totalSizeFreed: 0 };
    }

    // Read all files in the directory
    const files = await fs.readdir(UPLOADS_DIR);
    const now = Date.now();

    console.log(`[ImageCleanup] Checking ${files.length} files in ${UPLOADS_DIR}`);

    for (const file of files) {
      // Skip hidden files and test files
      if (file.startsWith(".")) {
        continue;
      }

      const filePath = path.join(UPLOADS_DIR, file);

      try {
        // Get file stats
        const stats = await fs.stat(filePath);
        
        // Skip directories
        if (stats.isDirectory()) {
          continue;
        }

        // Calculate file age
        const fileAge = now - stats.mtimeMs;

        // Delete if older than MAX_AGE_DAYS
        if (fileAge > MAX_AGE_MS) {
          try {
            await fs.unlink(filePath);
            deleted++;
            totalSizeFreed += stats.size;
            console.log(`[ImageCleanup] Deleted old file: ${file} (${(fileAge / (24 * 60 * 60 * 1000)).toFixed(1)} days old, ${(stats.size / 1024).toFixed(2)} KB)`);
          } catch (deleteError: any) {
            const errorMsg = `Failed to delete ${file}: ${deleteError.message}`;
            console.error(`[ImageCleanup] ${errorMsg}`);
            errors.push(errorMsg);
          }
        }
      } catch (statError: any) {
        const errorMsg = `Failed to stat ${file}: ${statError.message}`;
        console.error(`[ImageCleanup] ${errorMsg}`);
        errors.push(errorMsg);
      }
    }

    console.log(`[ImageCleanup] Cleanup complete: deleted ${deleted} files, freed ${(totalSizeFreed / 1024 / 1024).toFixed(2)} MB`);

    return {
      success: errors.length === 0,
      deleted,
      errors,
      totalSizeFreed,
    };
  } catch (error: any) {
    const errorMsg = `Failed to cleanup images: ${error.message}`;
    console.error(`[ImageCleanup] ${errorMsg}`);
    return {
      success: false,
      deleted,
      errors: [...errors, errorMsg],
      totalSizeFreed,
    };
  }
}

