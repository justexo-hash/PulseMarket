/**
 * Automated Market Resolution Checking Job Endpoint
 * 
 * This endpoint is called by Railway cron every 30 minutes to check and resolve automated markets.
 * It validates the cron secret and then calls the resolution checking job function.
 */

import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { requireAdmin } from "../../_utils/auth";
import { checkAutomatedMarketResolutions } from "@lib/jobs/automatedMarkets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Environment variable keys that might contain the cron secret
const CRON_SECRET_ENV_KEYS = ["CRON_SECRET", "JOBS_CRON_SECRET"] as const;

/**
 * Get cron secret from environment variables
 */
function getCronSecretFromEnv() {
  for (const key of CRON_SECRET_ENV_KEYS) {
    const value = process.env[key];
    if (value) {
      return value;
    }
  }
  return undefined;
}

/**
 * Extract secret from request headers
 * Checks multiple possible header names for flexibility
 */
function extractSecretFromHeaders(headerList: Headers) {
  const possibleHeaderKeys = [
    "x-cron-secret",
    "x-job-secret",
    "x-railway-cron-secret",
  ];

  for (const key of possibleHeaderKeys) {
    const value = headerList.get(key);
    if (value) {
      return value.trim();
    }
  }

  // Also check Authorization header with Bearer token
  const auth = headerList.get("authorization");
  if (!auth) {
    return undefined;
  }

  if (/^bearer\s+/i.test(auth)) {
    return auth.replace(/^bearer\s+/i, "").trim();
  }

  return auth.trim();
}

/**
 * Check if the request is authorized (either via cron secret or admin auth)
 */
function isCronAuthorized(headerList: Headers) {
  const cronSecret = getCronSecretFromEnv();
  if (!cronSecret) {
    return false;
  }

  const providedSecret = extractSecretFromHeaders(headerList);
  if (!providedSecret) {
    return false;
  }

  return providedSecret === cronSecret;
}

/**
 * POST /api/jobs/automated-resolutions
 * 
 * Triggered by Railway cron every 30 minutes to check and resolve automated markets.
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

    // Run the resolution checking job
    const result = await checkAutomatedMarketResolutions();

    return NextResponse.json({
      success: result.success,
      message: "Automated market resolution checking job executed",
      checked: result.checked,
      resolved: result.resolved,
      errors: result.errors,
    });
  } catch (error: any) {
    console.error("[Jobs] Automated resolution checking job failed:", error);
    const rawMessage = error?.message || "Failed to execute automated resolution checking job";
    const status =
      rawMessage === "Not authenticated" || rawMessage === "User not found"
        ? 401
        : rawMessage === "Admin access required"
        ? 403
        : 500;
    return NextResponse.json({ error: rawMessage }, { status });
  }
}

