"use client";

import { useQuery } from "@tanstack/react-query";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer, Tooltip, Line, ComposedChart } from "recharts";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, Layers, Activity } from "lucide-react";

interface HistoryEntry {
  time: string;
  probability: number;
  yesPool: number;
  noPool: number;
}

interface MarketChartsProps {
  slug: string;
  currentProbability: number;
}

export function MarketCharts({ slug, currentProbability }: MarketChartsProps) {
  const { data, isLoading } = useQuery<{ history: HistoryEntry[] }>({
    queryKey: ["market-history", slug],
    queryFn: async () => {
      const response = await fetch(`/api/markets/${encodeURIComponent(slug)}/history`);
      if (!response.ok) throw new Error("Failed to fetch history");
      return response.json();
    },
    refetchInterval: 30000,
  });

  const chartData = data?.history.map((entry) => ({
    ...entry,
    time: new Date(entry.time).getTime(),
    displayTime: new Date(entry.time).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }),
    totalPool: entry.yesPool + entry.noPool,
  })) || [];

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="h-[300px] flex items-center justify-center text-muted-foreground">
          Loading chart data...
        </div>
      </Card>
    );
  }

  if (chartData.length < 2) {
    return (
      <Card className="p-6">
        <div className="h-[200px] flex flex-col items-center justify-center text-muted-foreground">
          <Activity className="h-8 w-8 mb-2 opacity-50" />
          <p>Not enough data for charts yet</p>
          <p className="text-sm">Charts will appear after more bets are placed</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <Tabs defaultValue="probability" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="probability" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            <span className="hidden sm:inline">Probability</span>
          </TabsTrigger>
          <TabsTrigger value="pools" className="flex items-center gap-2">
            <Layers className="h-4 w-4" />
            <span className="hidden sm:inline">Pool Size</span>
          </TabsTrigger>
          <TabsTrigger value="combined" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            <span className="hidden sm:inline">Combined</span>
          </TabsTrigger>
        </TabsList>

        {/* Probability History Chart */}
        <TabsContent value="probability" className="mt-0">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-secondary-foreground">Probability Over Time</h3>
            <p className="text-sm text-muted-foreground">Yes probability based on betting activity</p>
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorProbability" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--success)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="var(--success)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis
                  dataKey="displayTime"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                  minTickGap={50}
                />
                <YAxis
                  domain={[0, 100]}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                  tickFormatter={(value) => `${value}%`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: "8px",
                    fontSize: 12,
                  }}
                  labelStyle={{ color: "var(--foreground)" }}
                  formatter={(value: number) => [`${value}%`, "Yes Probability"]}
                />
                <Area
                  type="monotone"
                  dataKey="probability"
                  stroke="var(--success)"
                  strokeWidth={2}
                  fill="url(#colorProbability)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          {/* Mini sparkline indicator */}
          <div className="mt-4 flex items-center justify-between p-3 rounded-lg bg-secondary/30">
            <span className="text-sm text-muted-foreground">Current Probability</span>
            <div className="flex items-center gap-3">
              <div className="w-24 h-8">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData.slice(-10)}>
                    <Area
                      type="monotone"
                      dataKey="probability"
                      stroke="var(--success)"
                      strokeWidth={1.5}
                      fill="none"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <span className="text-xl font-bold text-success">{currentProbability}%</span>
            </div>
          </div>
        </TabsContent>

        {/* Pool Size Chart */}
        <TabsContent value="pools" className="mt-0">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-secondary-foreground">Pool Size Over Time</h3>
            <p className="text-sm text-muted-foreground">Total SOL in Yes and No pools</p>
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorYesPool" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--success)" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="var(--success)" stopOpacity={0.05} />
                  </linearGradient>
                  <linearGradient id="colorNoPool" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--destructive)" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="var(--destructive)" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis
                  dataKey="displayTime"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                  minTickGap={50}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                  tickFormatter={(value) => `${value.toFixed(1)}`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: "8px",
                    fontSize: 12,
                  }}
                  labelStyle={{ color: "var(--foreground)" }}
                  formatter={(value: number, name: string) => [
                    `${value.toFixed(4)} SOL`,
                    name === "yesPool" ? "Yes Pool" : "No Pool",
                  ]}
                />
                <Area
                  type="monotone"
                  dataKey="yesPool"
                  stackId="1"
                  stroke="var(--success)"
                  strokeWidth={2}
                  fill="url(#colorYesPool)"
                />
                <Area
                  type="monotone"
                  dataKey="noPool"
                  stackId="1"
                  stroke="var(--destructive)"
                  strokeWidth={2}
                  fill="url(#colorNoPool)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          {/* Pool totals */}
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div className="p-3 rounded-lg bg-success/5 border border-success/30">
              <span className="text-sm text-muted-foreground">Yes Pool</span>
              <p className="text-lg font-bold text-success">
                {chartData[chartData.length - 1]?.yesPool.toFixed(4) || "0"} SOL
              </p>
            </div>
            <div className="p-3 rounded-lg bg-destructive/5 border border-destructive/30">
              <span className="text-sm text-muted-foreground">No Pool</span>
              <p className="text-lg font-bold text-destructive">
                {chartData[chartData.length - 1]?.noPool.toFixed(4) || "0"} SOL
              </p>
            </div>
          </div>
        </TabsContent>

        {/* Combined Chart */}
        <TabsContent value="combined" className="mt-0">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-secondary-foreground">Combined View</h3>
            <p className="text-sm text-muted-foreground">Probability and total pool volume</p>
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorTotalPool" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis
                  dataKey="displayTime"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                  minTickGap={50}
                />
                <YAxis
                  yAxisId="probability"
                  domain={[0, 100]}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "var(--success)", fontSize: 11 }}
                  tickFormatter={(value) => `${value}%`}
                  orientation="left"
                />
                <YAxis
                  yAxisId="pool"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "var(--primary)", fontSize: 11 }}
                  tickFormatter={(value) => `${value.toFixed(1)}`}
                  orientation="right"
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: "8px",
                    fontSize: 12,
                  }}
                  labelStyle={{ color: "var(--foreground)" }}
                  formatter={(value: number, name: string) => {
                    if (name === "probability") return [`${value}%`, "Probability"];
                    return [`${value.toFixed(4)} SOL`, "Total Pool"];
                  }}
                />
                <Area
                  yAxisId="pool"
                  type="monotone"
                  dataKey="totalPool"
                  stroke="var(--primary)"
                  strokeWidth={2}
                  fill="url(#colorTotalPool)"
                />
                <Line
                  yAxisId="probability"
                  type="monotone"
                  dataKey="probability"
                  stroke="var(--success)"
                  strokeWidth={2}
                  dot={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          {/* Summary stats */}
          <div className="mt-4 grid grid-cols-3 gap-4">
            <div className="p-3 rounded-lg bg-secondary/20 border border-border text-center">
              <span className="text-xs text-muted-foreground">Total Volume</span>
              <p className="text-lg font-bold text-secondary-foreground">
                {chartData[chartData.length - 1]?.totalPool.toFixed(4) || "0"} SOL
              </p>
            </div>
            <div className="p-3 rounded-lg bg-success/5 border border-success/30 text-center">
              <span className="text-xs text-muted-foreground">Yes Prob</span>
              <p className="text-lg font-bold text-success">{currentProbability}%</p>
            </div>
            <div className="p-3 rounded-lg bg-destructive/5 border border-destructive/30 text-center">
              <span className="text-xs text-muted-foreground">No Prob</span>
              <p className="text-lg font-bold text-destructive">{100 - currentProbability}%</p>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </Card>
  );
}
