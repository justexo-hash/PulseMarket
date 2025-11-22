import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { requireAdmin } from "../../_utils/auth";
import { runExpiredMarketsJob } from "@lib/jobs/expiredMarkets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CRON_SECRET_ENV_KEYS = ["CRON_SECRET", "JOBS_CRON_SECRET"] as const;

function getCronSecretFromEnv() {
  for (const key of CRON_SECRET_ENV_KEYS) {
    const value = process.env[key];
    if (value) {
      return value;
    }
  }
  return undefined;
}

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

  const auth = headerList.get("authorization");
  if (!auth) {
    return undefined;
  }

  if (/^bearer\s+/i.test(auth)) {
    return auth.replace(/^bearer\s+/i, "").trim();
  }

  return auth.trim();
}

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

export async function POST() {
  try {
    const headerList = headers();
    const cronAuthorized = isCronAuthorized(headerList);

    if (!cronAuthorized) {
      await requireAdmin();
    }

    await runExpiredMarketsJob();
    return NextResponse.json({
      success: true,
      message: "Expired markets job executed successfully",
    });
  } catch (error: any) {
    console.error("[Jobs] Expired market job failed:", error);
    const rawMessage = error?.message || "Failed to execute expired job";
    const status =
      rawMessage === "Not authenticated" || rawMessage === "User not found"
        ? 401
        : rawMessage === "Admin access required"
        ? 403
        : 500;
    return NextResponse.json({ error: rawMessage }, { status });
  }
}

