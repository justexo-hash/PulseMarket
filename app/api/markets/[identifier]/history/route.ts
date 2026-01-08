import { NextResponse } from "next/server";
import { storage } from "@server/storage";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: { identifier: string };
}

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { identifier } = params;

    // Find market by ID or slug
    let market = null;
    const numericId = Number(identifier);
    if (!Number.isNaN(numericId)) {
      market = await storage.getMarketById(numericId);
    }
    if (!market) {
      market = await storage.getMarketBySlug(identifier);
    }
    if (!market) {
      return NextResponse.json({ error: "Market not found" }, { status: 404 });
    }

    // Get all bets for this market
    const bets = await storage.getBetsByMarket(market.id);

    // Sort bets by creation time
    const sortedBets = bets.sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    // Build probability history from bets
    // Start with 50% at market creation
    const history: Array<{ time: string; probability: number; yesPool: number; noPool: number }> = [
      {
        time: new Date(market.createdAt).toISOString(),
        probability: 50,
        yesPool: 0,
        noPool: 0,
      },
    ];

    let yesPool = 0;
    let noPool = 0;

    for (const bet of sortedBets) {
      const amount = parseFloat(bet.amount);
      if (bet.position === "yes") {
        yesPool += amount;
      } else {
        noPool += amount;
      }

      const totalPool = yesPool + noPool;
      const probability = totalPool > 0 ? Math.round((yesPool / totalPool) * 100) : 50;

      history.push({
        time: new Date(bet.createdAt).toISOString(),
        probability,
        yesPool,
        noPool,
      });
    }

    // Add current state as final point
    const currentYesPool = parseFloat(market.yesPool || "0");
    const currentNoPool = parseFloat(market.noPool || "0");
    const currentTotal = currentYesPool + currentNoPool;
    const currentProbability = currentTotal > 0 ? Math.round((currentYesPool / currentTotal) * 100) : 50;

    const lastEntry = history[history.length - 1];
    if (lastEntry.probability !== currentProbability || history.length === 1) {
      history.push({
        time: new Date().toISOString(),
        probability: currentProbability,
        yesPool: currentYesPool,
        noPool: currentNoPool,
      });
    }

    return NextResponse.json({ history });
  } catch (error) {
    console.error("[GET /api/markets/:identifier/history] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch probability history" },
      { status: 500 }
    );
  }
}
