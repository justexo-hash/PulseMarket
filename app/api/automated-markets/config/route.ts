/**
 * Automated Markets Configuration Endpoint
 * 
 * GET: Returns current automation configuration
 * POST: Updates automation configuration (enable/disable)
 * 
 * Admin only - requires authentication
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "../../_utils/auth";
import { storage } from "@server/storage";

export const dynamic = "force-dynamic";

/**
 * GET /api/automated-markets/config
 * 
 * Returns the current automation configuration
 */
export async function GET() {
  try {
    await requireAdmin();

    const config = await storage.getAutomatedMarketsConfig();
    
    if (!config) {
      // No config exists yet - return default (disabled)
      return NextResponse.json({
        enabled: false,
        lastRun: null,
      });
    }

    return NextResponse.json({
      enabled: config.enabled === 1,
      lastRun: config.lastRun,
    });
  } catch (error: any) {
    console.error("[AutomatedMarkets Config] Error:", error);
    const message = error?.message || "Failed to fetch config";
    const status = message.includes("401") || message === "Not authenticated"
      ? 401
      : message.includes("403") || message === "Admin access required"
      ? 403
      : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

/**
 * POST /api/automated-markets/config
 * 
 * Updates the automation configuration
 * Body: { enabled: boolean }
 */
export async function POST(request: NextRequest) {
  try {
    await requireAdmin();

    const body = await request.json();
    const { enabled } = body;

    if (typeof enabled !== "boolean") {
      return NextResponse.json(
        { error: "enabled must be a boolean" },
        { status: 400 }
      );
    }

    const config = await storage.updateAutomatedMarketsConfig(enabled);

    return NextResponse.json({
      success: true,
      enabled: config.enabled === 1,
      lastRun: config.lastRun,
    });
  } catch (error: any) {
    console.error("[AutomatedMarkets Config] Error:", error);
    const message = error?.message || "Failed to update config";
    const status = message.includes("401") || message === "Not authenticated"
      ? 401
      : message.includes("403") || message === "Admin access required"
      ? 403
      : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

