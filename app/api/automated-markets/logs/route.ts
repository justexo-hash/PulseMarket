/**
 * Automated Markets Logs Endpoint
 * 
 * GET: Returns recent execution logs for the admin panel
 * 
 * Admin only - requires authentication
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "../../_utils/auth";
import { storage } from "@server/storage";

export const dynamic = "force-dynamic";

/**
 * GET /api/automated-markets/logs
 * 
 * Returns recent execution logs
 * Query params: ?limit=50 (optional, default 50)
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const searchParams = request.nextUrl.searchParams;
    const limitParam = searchParams.get("limit");
    const limit = limitParam ? parseInt(limitParam, 10) : 50;

    if (isNaN(limit) || limit < 1 || limit > 100) {
      return NextResponse.json(
        { error: "limit must be between 1 and 100" },
        { status: 400 }
      );
    }

    const logs = await storage.getRecentAutomatedMarketLogs(limit);

    return NextResponse.json({
      success: true,
      logs: logs.map(log => ({
        id: log.id,
        executionTime: log.executionTime,
        marketId: log.marketId,
        questionType: log.questionType,
        tokenAddress: log.tokenAddress,
        tokenAddress2: log.tokenAddress2,
        success: log.success === 1,
        errorMessage: log.errorMessage,
        createdAt: log.createdAt,
      })),
    });
  } catch (error: any) {
    console.error("[AutomatedMarkets Logs] Error:", error);
    const message = error?.message || "Failed to fetch logs";
    const status = message.includes("401") || message === "Not authenticated"
      ? 401
      : message.includes("403") || message === "Admin access required"
      ? 403
      : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

