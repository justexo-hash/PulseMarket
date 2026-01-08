import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: { address: string };
}

// In-memory cache
interface CacheEntry {
  data: any;
  expiry: number;
}

const ohlcvCache = new Map<string, CacheEntry>();
const overviewCache = new Map<string, CacheEntry>();

// Cache TTL based on time range (in ms)
const getCacheTTL = (timeRange: string): number => {
  switch (timeRange) {
    case "1H": return 60 * 1000;        // 1 min for 1H
    case "4H": return 2 * 60 * 1000;    // 2 min for 4H
    case "12H": return 5 * 60 * 1000;   // 5 min for 12H
    case "1D": return 5 * 60 * 1000;    // 5 min for 1D
    case "1W": return 15 * 60 * 1000;   // 15 min for 1W
    case "1M": return 30 * 60 * 1000;   // 30 min for 1M
    default: return 5 * 60 * 1000;
  }
};

// Overview cache: 5 minutes (market cap doesn't change that fast)
const OVERVIEW_CACHE_TTL = 5 * 60 * 1000;

function getFromCache<T>(cache: Map<string, CacheEntry>, key: string): T | null {
  const entry = cache.get(key);
  if (entry && Date.now() < entry.expiry) {
    return entry.data as T;
  }
  cache.delete(key);
  return null;
}

function setCache(cache: Map<string, CacheEntry>, key: string, data: any, ttl: number) {
  cache.set(key, { data, expiry: Date.now() + ttl });

  // Cleanup old entries periodically (keep cache size reasonable)
  if (cache.size > 100) {
    const now = Date.now();
    for (const [k, v] of cache.entries()) {
      if (v.expiry < now) cache.delete(k);
    }
  }
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { address } = params;
    const { searchParams } = new URL(request.url);

    const timeRange = searchParams.get("range") || "1D";

    const now = Math.floor(Date.now() / 1000);
    let timeFrom: number;
    let interval = "15m";

    switch (timeRange) {
      case "1H":
        timeFrom = now - 60 * 60;
        interval = "1m";
        break;
      case "4H":
        timeFrom = now - 4 * 60 * 60;
        interval = "5m";
        break;
      case "12H":
        timeFrom = now - 12 * 60 * 60;
        interval = "15m";
        break;
      case "1D":
        timeFrom = now - 24 * 60 * 60;
        interval = "15m";
        break;
      case "1W":
        timeFrom = now - 7 * 24 * 60 * 60;
        interval = "1H";
        break;
      case "1M":
        timeFrom = now - 30 * 24 * 60 * 60;
        interval = "4H";
        break;
      default:
        timeFrom = now - 24 * 60 * 60;
        interval = "15m";
    }

    const apiKey = process.env.BIRDEYE_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Birdeye API key not configured" },
        { status: 500 }
      );
    }

    // Check overview cache first
    let currentMc = 0;
    let currentPrice = 0;
    let circulatingSupply = 0;

    const overviewCacheKey = `overview:${address}`;
    const cachedOverview = getFromCache<any>(overviewCache, overviewCacheKey);

    if (cachedOverview) {
      currentMc = cachedOverview.marketCap || 0;
      currentPrice = cachedOverview.price || 0;
      circulatingSupply = cachedOverview.circulatingSupply || 0;
    } else {
      // Fetch token overview
      const overviewUrl = `https://public-api.birdeye.so/defi/token_overview?address=${address}`;
      const overviewResponse = await fetch(overviewUrl, {
        headers: {
          "X-API-KEY": apiKey,
          "x-chain": "solana",
        },
      });

      if (overviewResponse.ok) {
        const overviewData = await overviewResponse.json();
        currentMc = overviewData.data?.marketCap || overviewData.data?.mc || 0;
        currentPrice = overviewData.data?.price || 0;
        circulatingSupply = overviewData.data?.circulatingSupply || 0;

        if (circulatingSupply === 0 && currentPrice > 0 && currentMc > 0) {
          circulatingSupply = currentMc / currentPrice;
        }

        // Cache the overview data
        setCache(overviewCache, overviewCacheKey, {
          marketCap: currentMc,
          price: currentPrice,
          circulatingSupply,
        }, OVERVIEW_CACHE_TTL);
      }
    }

    // Check OHLCV cache
    const ohlcvCacheKey = `ohlcv:${address}:${timeRange}`;
    const cachedOhlcv = getFromCache<any[]>(ohlcvCache, ohlcvCacheKey);

    let priceHistory: any[];

    if (cachedOhlcv) {
      // Use cached OHLCV data, recalculate market cap with current supply
      priceHistory = cachedOhlcv.map((item: any) => ({
        time: item.time,
        price: item.price,
        marketCap: circulatingSupply > 0 ? item.price * circulatingSupply : 0,
        volume: item.volume,
      }));
    } else {
      // Fetch OHLCV data from Birdeye
      const url = `https://public-api.birdeye.so/defi/ohlcv?address=${address}&type=${interval}&time_from=${timeFrom}&time_to=${now}`;

      const response = await fetch(url, {
        headers: {
          "X-API-KEY": apiKey,
          "x-chain": "solana",
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("[Birdeye API] Error:", response.status, errorText);
        return NextResponse.json(
          { error: "Failed to fetch token price data" },
          { status: response.status }
        );
      }

      const data = await response.json();

      // Store raw price/volume data in cache (without marketCap - we'll calculate that with current supply)
      const rawData = data.data?.items?.map((item: any) => ({
        time: item.unixTime * 1000,
        price: item.c,
        volume: item.v,
      })) || [];

      setCache(ohlcvCache, ohlcvCacheKey, rawData, getCacheTTL(timeRange));

      // Calculate market cap
      priceHistory = rawData.map((item: any) => ({
        ...item,
        marketCap: circulatingSupply > 0 ? item.price * circulatingSupply : 0,
      }));
    }

    return NextResponse.json({
      address,
      timeRange,
      interval,
      currentMc,
      currentPrice,
      priceHistory,
    });
  } catch (error) {
    console.error("[GET /api/token/:address/price-history] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch token price history" },
      { status: 500 }
    );
  }
}
