import { NextRequest, NextResponse } from "next/server";
import { fetchCryptoQuotes } from "@lib/coinmarketcap";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const symbol = request.nextUrl.searchParams.get("symbol");
  if (!symbol) {
    return NextResponse.json(
      { error: "Symbol parameter required" },
      { status: 400 }
    );
  }

  try {
    const data = await fetchCryptoQuotes(symbol);
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("[CoinMarketCap] quotes error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch quotes" },
      { status: 500 }
    );
  }
}

