import { NextResponse } from "next/server";
import { fetchGlobalMetrics } from "@lib/coinmarketcap";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await fetchGlobalMetrics();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("[CoinMarketCap] global metrics error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch global metrics" },
      { status: 500 }
    );
  }
}

