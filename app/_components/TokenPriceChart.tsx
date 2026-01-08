"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PriceDataPoint {
  time: number;
  price: number;
  marketCap: number;
}

interface ApiResponse {
  priceHistory: PriceDataPoint[];
  currentMc: number;
  currentPrice: number;
}

interface TokenPriceChartProps {
  tokenAddress: string;
  tokenName?: string;
  tokenAddress2?: string;
  tokenName2?: string;
}

const TIME_RANGES = ["1H", "4H", "12H", "1D", "1W", "1M"] as const;
type TimeRange = (typeof TIME_RANGES)[number];

const formatMarketCap = (mc: number) => {
  if (!mc || isNaN(mc)) return "$0";
  if (mc >= 1_000_000_000) return `$${(mc / 1_000_000_000).toFixed(2)}B`;
  if (mc >= 1_000_000) return `$${(mc / 1_000_000).toFixed(2)}M`;
  if (mc >= 1_000) return `$${(mc / 1_000).toFixed(2)}K`;
  return `$${mc.toFixed(2)}`;
};

// Single token chart
function SingleTokenChart({
  tokenAddress,
  tokenName,
  timeRange,
}: {
  tokenAddress: string;
  tokenName?: string;
  timeRange: TimeRange;
}) {
  const { data, isLoading, error } = useQuery<ApiResponse>({
    queryKey: ["token-price", tokenAddress, timeRange],
    queryFn: async () => {
      const res = await fetch(`/api/token/${tokenAddress}/price-history?range=${timeRange}`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    refetchInterval: 60000, // 1 minute (data is cached server-side)
  });

  if (isLoading) {
    return (
      <div className="h-[300px] flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !data?.priceHistory?.length) {
    return (
      <div className="h-[300px] flex items-center justify-center text-muted-foreground">
        No market cap data
      </div>
    );
  }

  const chartData = data.priceHistory.map((p) => ({
    time: new Date(p.time).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
    marketCap: p.marketCap,
  }));

  const firstMc = chartData[0]?.marketCap || 0;
  const lastMc = chartData[chartData.length - 1]?.marketCap || 0;
  const change = firstMc > 0 ? ((lastMc - firstMc) / firstMc) * 100 : 0;
  const isUp = change >= 0;
  const color = isUp ? "var(--success)" : "var(--destructive)";

  return (
    <div>
      <div className="flex justify-between items-start mb-4">
        <div>
          <p className="text-sm text-muted-foreground">{tokenName || "Token"}</p>
          <p className="text-2xl font-bold text-secondary-foreground">{formatMarketCap(lastMc)}</p>
        </div>
        <div className={`text-right ${isUp ? "text-success" : "text-destructive"}`}>
          <p className="text-xl font-semibold">{isUp ? "+" : ""}{change.toFixed(2)}%</p>
          <p className="text-xs text-muted-foreground">{timeRange}</p>
        </div>
      </div>

      <div style={{ width: "100%", height: 250 }}>
        <ResponsiveContainer>
          <LineChart data={chartData}>
            <XAxis
              dataKey="time"
              tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              domain={["auto", "auto"]}
              tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => formatMarketCap(v)}
              width={55}
            />
            <Tooltip
              contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }}
              labelStyle={{ color: "var(--muted-foreground)" }}
              formatter={(value: number) => [formatMarketCap(value), "Market Cap"]}
            />
            <Line
              type="monotone"
              dataKey="marketCap"
              stroke={color}
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// Battle chart - two tokens on same chart (normalized to % change)
function BattleTokenChart({
  tokenAddress1,
  tokenName1,
  tokenAddress2,
  tokenName2,
  timeRange,
}: {
  tokenAddress1: string;
  tokenName1?: string;
  tokenAddress2: string;
  tokenName2?: string;
  timeRange: TimeRange;
}) {
  const { data: data1, isLoading: loading1 } = useQuery<ApiResponse>({
    queryKey: ["token-price", tokenAddress1, timeRange],
    queryFn: async () => {
      const res = await fetch(`/api/token/${tokenAddress1}/price-history?range=${timeRange}`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    refetchInterval: 60000, // 1 minute (data is cached server-side)
  });

  const { data: data2, isLoading: loading2 } = useQuery<ApiResponse>({
    queryKey: ["token-price", tokenAddress2, timeRange],
    queryFn: async () => {
      const res = await fetch(`/api/token/${tokenAddress2}/price-history?range=${timeRange}`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    refetchInterval: 60000, // 1 minute (data is cached server-side)
  });

  if (loading1 || loading2) {
    return (
      <div className="h-[350px] flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data1?.priceHistory?.length || !data2?.priceHistory?.length) {
    return (
      <div className="h-[350px] flex items-center justify-center text-muted-foreground">
        No market cap data available
      </div>
    );
  }

  // Normalize both to % change from start (using market cap)
  const baseMc1 = data1.priceHistory[0]?.marketCap || 1;
  const baseMc2 = data2.priceHistory[0]?.marketCap || 1;

  // Merge data by index (assuming same time intervals)
  const maxLen = Math.max(data1.priceHistory.length, data2.priceHistory.length);
  const chartData = [];

  for (let i = 0; i < maxLen; i++) {
    const p1 = data1.priceHistory[i];
    const p2 = data2.priceHistory[i];

    chartData.push({
      time: new Date(p1?.time || p2?.time).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
      token1: p1 ? ((p1.marketCap - baseMc1) / baseMc1) * 100 : null,
      token2: p2 ? ((p2.marketCap - baseMc2) / baseMc2) * 100 : null,
      mc1: p1?.marketCap,
      mc2: p2?.marketCap,
    });
  }

  const lastMc1 = data1.priceHistory[data1.priceHistory.length - 1]?.marketCap || 0;
  const lastMc2 = data2.priceHistory[data2.priceHistory.length - 1]?.marketCap || 0;
  const change1 = ((lastMc1 - baseMc1) / baseMc1) * 100;
  const change2 = ((lastMc2 - baseMc2) / baseMc2) * 100;

  return (
    <div>
      {/* Stats header */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-success/10 rounded-lg p-3 border border-success/20">
          <p className="text-xs text-muted-foreground mb-1">{tokenName1 || "Token 1"}</p>
          <p className="text-lg font-bold text-secondary-foreground">{formatMarketCap(lastMc1)}</p>
          <p className={`text-sm font-semibold ${change1 >= 0 ? "text-success" : "text-destructive"}`}>
            {change1 >= 0 ? "+" : ""}{change1.toFixed(2)}%
          </p>
        </div>
        <div className="bg-primary/10 rounded-lg p-3 border border-primary/20">
          <p className="text-xs text-muted-foreground mb-1">{tokenName2 || "Token 2"}</p>
          <p className="text-lg font-bold text-secondary-foreground">{formatMarketCap(lastMc2)}</p>
          <p className={`text-sm font-semibold ${change2 >= 0 ? "text-success" : "text-destructive"}`}>
            {change2 >= 0 ? "+" : ""}{change2.toFixed(2)}%
          </p>
        </div>
      </div>

      {/* Combined chart */}
      <div style={{ width: "100%", height: 280 }}>
        <ResponsiveContainer>
          <LineChart data={chartData}>
            <XAxis
              dataKey="time"
              tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              domain={["auto", "auto"]}
              tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `${v.toFixed(0)}%`}
              width={45}
            />
            <Tooltip
              contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }}
              labelStyle={{ color: "var(--muted-foreground)" }}
              formatter={(value: number, name: string, props: any) => {
                const label = name === "token1" ? tokenName1 : tokenName2;
                const mc = name === "token1" ? props.payload.mc1 : props.payload.mc2;
                return [`${value?.toFixed(2)}% (${formatMarketCap(mc)})`, label];
              }}
            />
            <Legend
              wrapperStyle={{ paddingTop: 10 }}
              formatter={(value) => (
                <span className="text-xs text-muted-foreground">
                  {value === "token1" ? tokenName1 : tokenName2}
                </span>
              )}
            />
            <Line
              type="monotone"
              dataKey="token1"
              name="token1"
              stroke="var(--success)"
              strokeWidth={2}
              dot={false}
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="token2"
              name="token2"
              stroke="var(--primary)"
              strokeWidth={2}
              dot={false}
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function TokenPriceChart({
  tokenAddress,
  tokenName,
  tokenAddress2,
  tokenName2,
}: TokenPriceChartProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>("1D");
  const isBattle = !!tokenAddress2;

  return (
    <div className="bg-secondary/50 rounded-xl p-5 border border-border">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-medium text-secondary-foreground">
          {isBattle ? "Market Cap Battle" : "Market Cap"}
        </h3>
        <div className="flex gap-0.5">
          {TIME_RANGES.map((r) => (
            <Button
              key={r}
              onClick={() => setTimeRange(r)}
              size="sm"
              variant={timeRange === r ? "selected" : "ghost"}
            >
              {r}
            </Button>
          ))}
        </div>
      </div>

      {isBattle ? (
        <BattleTokenChart
          tokenAddress1={tokenAddress}
          tokenName1={tokenName}
          tokenAddress2={tokenAddress2}
          tokenName2={tokenName2}
          timeRange={timeRange}
        />
      ) : (
        <SingleTokenChart
          tokenAddress={tokenAddress}
          tokenName={tokenName}
          timeRange={timeRange}
        />
      )}
    </div>
  );
}
