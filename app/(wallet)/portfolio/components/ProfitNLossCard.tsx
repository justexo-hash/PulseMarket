"use client"

import * as React from "react"
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export const description = "An interactive area chart"

const chartData = [
  { date: "2025-07-01", profit: 120 },
  { date: "2025-07-02", profit: 180 },
  { date: "2025-07-03", profit: 90 },
  { date: "2025-07-04", profit: 250 },
  { date: "2025-07-05", profit: 320 },
  { date: "2025-07-06", profit: 410 },
  { date: "2025-07-07", profit: 150 },
  { date: "2025-07-08", profit: 470 },
  { date: "2025-07-09", profit: 390 },
  { date: "2025-07-10", profit: 280 },
  { date: "2025-07-11", profit: 350 },
  { date: "2025-07-12", profit: 200 },
  { date: "2025-07-13", profit: 430 },
  { date: "2025-07-14", profit: 310 },
  { date: "2025-07-15", profit: 260 },
  { date: "2025-07-16", profit: 180 },
  { date: "2025-07-17", profit: 500 },
  { date: "2025-07-18", profit: 220 },
  { date: "2025-07-19", profit: 170 },
  { date: "2025-07-20", profit: 140 },
  { date: "2025-07-21", profit: 330 },
  { date: "2025-07-22", profit: 410 },
  { date: "2025-07-23", profit: 290 },
  { date: "2025-07-24", profit: 230 },
  { date: "2025-07-25", profit: 150 },
  { date: "2025-07-26", profit: 200 },
  { date: "2025-07-27", profit: 460 },
  { date: "2025-07-28", profit: 380 },
  { date: "2025-07-29", profit: 120 },
  { date: "2025-07-30", profit: 270 },
  { date: "2025-07-31", profit: 340 },
]

const chartConfig = {
  visitors: {
    label: "Visitors",
  },
  profit: {
    label: "Profit",
    color: "var(--color-desktop)",
  },
} satisfies ChartConfig

export default function ChartAreaInteractive() {
  const [timeRange, setTimeRange] = React.useState("90d")

  const filteredData = chartData.filter((item) => {
    const date = new Date(item.date)
    const referenceDate = new Date("2024-06-30")
    let daysToSubtract = 90
    if (timeRange === "30d") {
      daysToSubtract = 30
    } else if (timeRange === "7d") {
      daysToSubtract = 7
    }
    const startDate = new Date(referenceDate)
    startDate.setDate(startDate.getDate() - daysToSubtract)
    return date >= startDate
  })

  return (
    <Card className="pt-0">
      <CardHeader className="flex items-center gap-2 space-y-0 border-b py-5 sm:flex-row">
        <div className="grid flex-1 gap-1">
          <CardTitle className="text-muted-foreground text-sm font-light">Realized PnL</CardTitle>
        </div>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger
            className="hidden w-[160px] rounded-lg sm:ml-auto sm:flex"
            aria-label="Select a value"
          >
            <SelectValue placeholder="Last 3 months" />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="90d" className="rounded-lg">
              Last 3 months
            </SelectItem>
            <SelectItem value="30d" className="rounded-lg">
              Last 30 days
            </SelectItem>
            <SelectItem value="7d" className="rounded-lg">
              Last 7 days
            </SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[250px] w-full"
        >
          <AreaChart data={filteredData}>
            <defs>
              <linearGradient id="fillProfit" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="hsl(var(--color-desktop))"
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="hsl(var(--color-desktop))"
                  stopOpacity={0.1}
                />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tickFormatter={(value) => {
                const date = new Date(value)
                return date.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })
              }}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  labelFormatter={(value) => {
                    return new Date(value).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })
                  }}
                  indicator="dot"
                />
              }
            />
            <Area
              dataKey="profit"
              type="natural"
              fill="url(#fillProfit)"
              stroke="hsl(var(--chart-2))"
            />
            <ChartLegend content={<ChartLegendContent />} />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
