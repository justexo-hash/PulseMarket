import { NextResponse } from "next/server";
import { storage } from "@server/storage";
import { recalculateProbability } from "../../_utils/markets";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: { identifier: string };
}

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { identifier } = params;

    const numericId = Number(identifier);
    if (!Number.isNaN(numericId)) {
      const marketById = await storage.getMarketById(numericId);
      if (marketById) {
        return NextResponse.json(recalculateProbability(marketById));
      }
    }

    const marketBySlug = await storage.getMarketBySlug(identifier);
    if (!marketBySlug) {
      return NextResponse.json({ error: "Market not found" }, { status: 404 });
    }

    return NextResponse.json(recalculateProbability(marketBySlug));
  } catch (error) {
    console.error("[GET /api/markets/:identifier] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch market" },
      { status: 500 }
    );
  }
}

