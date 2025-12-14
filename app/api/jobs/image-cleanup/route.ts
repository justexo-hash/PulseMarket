/**
 * Image Cleanup Job Endpoint
 * 
 * This endpoint is called by Railway cron (recommended: daily) to delete old images.
 * It validates the cron secret and then calls the image cleanup function.
 */

import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { requireAdmin } from "../../_utils/auth";
import { cleanupOldImages } from "@lib/jobs/imageCleanup";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Validate cron secret from headers
 * Railway cron jobs should include x-cron-secret header
 */
function isCronAuthorized(headerList: Headers): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.warn("[Jobs] CRON_SECRET not set, allowing admin-only access");
    return false;
  }

  const providedSecret = headerList.get("x-cron-secret");
  if (!providedSecret) {
    return false;
  }

  return providedSecret === cronSecret;
}

/**
 * POST /api/jobs/image-cleanup
 * 
 * Triggered by Railway cron (recommended: daily) to delete images older than 7 days.
 * Can also be called manually by admins.
 */
export async function POST() {
  try {
    const headerList = headers();
    const cronAuthorized = isCronAuthorized(headerList);

    // If not authorized via cron secret, require admin authentication
    if (!cronAuthorized) {
      await requireAdmin();
    }

    // Run the image cleanup job
    const result = await cleanupOldImages();

    return NextResponse.json({
      success: result.success,
      message: "Image cleanup job executed",
      deleted: result.deleted,
      totalSizeFreed: result.totalSizeFreed,
      errors: result.errors,
    });
  } catch (error: any) {
    console.error("[Jobs] Image cleanup job failed:", error);
    const rawMessage = error?.message || "Failed to execute image cleanup job";
    const status =
      rawMessage === "Not authenticated" || rawMessage === "User not found"
        ? 401
        : rawMessage === "Admin access required"
        ? 403
        : 500;
    return NextResponse.json({ error: rawMessage }, { status });
  }
}

