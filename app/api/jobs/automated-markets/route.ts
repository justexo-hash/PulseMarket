/**
 * Automated Market Creation Job Endpoint
 * 
 * This endpoint is called by Railway cron every 6 hours to create new automated markets.
 * It validates the cron secret and then calls the market creation job function.
 */

import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { requireAdmin } from "../../_utils/auth";
import { runAutomatedMarketCreation } from "@lib/jobs/automatedMarkets";

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
 * POST /api/jobs/automated-markets
 * 
 * Triggered by Railway cron every 6 hours to create new automated markets.
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

    // Run the automated market creation job
    const result = await runAutomatedMarketCreation();

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: "Automated market creation job executed successfully",
        marketCreated: result.marketCreated,
        marketType: result.marketType,
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: result.error || "Market creation failed",
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("[Jobs] Automated market creation job failed:", error);
    const rawMessage = error?.message || "Failed to execute automated market creation job";
    const status =
      rawMessage === "Not authenticated" || rawMessage === "User not found"
        ? 401
        : rawMessage === "Admin access required"
        ? 403
        : 500;
    return NextResponse.json({ error: rawMessage }, { status });
  }
}

