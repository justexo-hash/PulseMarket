import { NextResponse } from "next/server";
import { fetchFearAndGreed } from "@lib/coinmarketcap";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await fetchFearAndGreed();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("[CoinMarketCap] fear & greed error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch Fear & Greed Index" },
      { status: 500 }
    );
  }
}

