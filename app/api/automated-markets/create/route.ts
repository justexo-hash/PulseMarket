/**
 * Manual Automated Market Creation Endpoint
 * 
 * POST: Manually trigger automated market creation (for testing/admin use)
 * 
 * Admin only - requires authentication
 */

import { NextResponse } from "next/server";
import { requireAdmin } from "../../_utils/auth";
import { runAutomatedMarketCreation } from "@lib/jobs/automatedMarkets";

export const dynamic = "force-dynamic";

/**
 * POST /api/automated-markets/create
 * 
 * Manually trigger automated market creation
 * Useful for testing or admin-triggered creation
 * 
 * Body: { marketType?: string, testMode?: boolean }
 */
export async function POST(request: Request) {
  try {
    await requireAdmin();

    const body = await request.json().catch(() => ({}));
    const { marketType, testMode } = body;

    // Run the automated market creation job
    const result = await runAutomatedMarketCreation(marketType || undefined, testMode || false);

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: "Market creation triggered successfully",
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
    console.error("[AutomatedMarkets Create] Error:", error);
    const message = error?.message || "Failed to trigger market creation";
    const status = message.includes("401") || message === "Not authenticated"
      ? 401
      : message.includes("403") || message === "Admin access required"
      ? 403
      : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

