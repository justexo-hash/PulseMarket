"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { type Market, type Bet } from "@shared/schema";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow, subDays, startOfDay, endOfDay } from "date-fns";
import Link from "next/link";
import { TrendingUp, TrendingDown, DollarSign, Target, ArrowRight, Clock, Filter } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type BetWithMarket = Bet & { market: Market };

type ActivityItem =
  | { type: "bet"; data: BetWithMarket }
  | { type: "resolution"; data: Market }
  | { type: "market_created"; data: Market };

type ActivityType = "all" | "bet" | "resolution" | "market_created";
type DateFilter = "all" | "today" | "week" | "month";

export function ActivityFeedView() {
  const { user } = useAuth();
  const [activityType, setActivityType] = useState<ActivityType>("all");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  
  const { data: markets = [] } = useQuery<Market[]>({
    queryKey: ["/api/markets"],
  });

  const { data: bets = [] } = useQuery<Bet[]>({
    queryKey: ["/api/bets"],
    enabled: !!user,
  });

  // Extract unique categories from markets
  const categories = useMemo(() => {
    const unique = new Set(markets.map(m => m.category));
    return ["all", ...Array.from(unique).sort()];
  }, [markets]);

  // Get date range based on filter
  const getDateRange = (filter: DateFilter): { start: Date | null; end: Date | null } => {
    const now = new Date();
    switch (filter) {
      case "today":
        return { start: startOfDay(now), end: endOfDay(now) };
      case "week":
        return { start: startOfDay(subDays(now, 7)), end: endOfDay(now) };
      case "month":
        return { start: startOfDay(subDays(now, 30)), end: endOfDay(now) };
      default:
        return { start: null, end: null };
    }
  };

  // Combine all activities - useMemo to recompute when markets or bets change
  const activitiesData = useMemo<ActivityItem[]>(() => {
    if (markets.length === 0) return [];

    // Get recent bets with market info
    const recentBets = bets
      .slice(-50)
      .map((bet) => {
        const market = markets.find((m) => m.id === bet.marketId);
        if (!market) {
          return null;
        }
        return {
          type: "bet" as const,
          data: {
            ...bet,
            market,
          },
        };
      })
      .filter(
        (item): item is Extract<ActivityItem, { type: "bet" }> => item !== null
      );

    // Get recently resolved markets
    const resolvedMarkets = markets
      .filter(m => m.status === "resolved")
      .sort((a, b) => {
        // Sort by when they were likely resolved (we'd need a resolvedAt field for better sorting)
        // For now, use createdAt as proxy
        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bTime - aTime;
      })
      .slice(0, 20)
      .map(market => ({
        type: "resolution" as const,
        data: market,
      }));

    // Get recently created markets
    const createdMarkets = markets
      .filter(m => m.status === "active")
      .sort((a, b) => {
        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bTime - aTime;
      })
      .slice(0, 20)
      .map(market => ({
        type: "market_created" as const,
        data: market,
      }));

    // Combine and sort by timestamp (most recent first)
    const allActivities: ActivityItem[] = [
      ...recentBets,
      ...resolvedMarkets,
      ...createdMarkets,
    ].sort((a, b) => {
      const getTime = (item: ActivityItem) => {
        if (item.type === "bet") {
          return item.data.createdAt ? new Date(item.data.createdAt).getTime() : 0;
        }
        return item.data.createdAt ? new Date(item.data.createdAt).getTime() : 0;
      };
      return getTime(b) - getTime(a);
    });

    return allActivities.slice(0, 50); // Return top 50 most recent
  }, [markets, bets]);

  // Use the computed activities directly (no query needed since it's computed from other queries)
  const activities = {
    data: activitiesData,
    isLoading: markets.length === 0,
    error: null,
  };

  // Filter activities based on selected filters
  const filteredActivities = useMemo(() => {
    if (!activitiesData || activitiesData.length === 0) return [];

    const dateRange = getDateRange(dateFilter);
    
    return activitiesData.filter((activity) => {
      // Filter by activity type
      if (activityType !== "all" && activity.type !== activityType) {
        return false;
      }

      // Filter by category
      if (categoryFilter !== "all") {
        const category =
          activity.type === "bet"
            ? activity.data.market.category
            : activity.data.category;
        if (category !== categoryFilter) {
          return false;
        }
      }

      // Filter by date range
      if (dateRange.start && dateRange.end) {
        const activityDate = activity.type === "bet"
          ? (activity.data.createdAt ? new Date(activity.data.createdAt) : null)
          : (activity.data.createdAt ? new Date(activity.data.createdAt) : null);
        
        if (!activityDate) return false;
        
        if (activityDate < dateRange.start || activityDate > dateRange.end) {
          return false;
        }
      }

      return true;
    });
  }, [activitiesData, activityType, dateFilter, categoryFilter]);

  if (activities.isLoading || markets.length === 0) {
    return (
      <div className="relative min-h-screen">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <h1 className="text-4xl font-bold text-secondary-foreground  mb-8">Activity Feed</h1>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="p-6 animate-pulse h-32" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-secondary-foreground  mb-2">Activity Feed</h1>
          <p className="text-muted-foreground text-lg">
            See recent bets, market resolutions, and new markets
          </p>
        </div>

        {/* Filters */}
        <div className="mb-8 space-y-4">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Filters:</span>
            </div>
            
            <Select value={activityType} onValueChange={(value) => setActivityType(value as ActivityType)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Activity type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Activity</SelectItem>
                <SelectItem value="bet">Bets Only</SelectItem>
                <SelectItem value="resolution">Resolutions</SelectItem>
                <SelectItem value="market_created">New Markets</SelectItem>
              </SelectContent>
            </Select>

            <Select value={dateFilter} onValueChange={(value) => setDateFilter(value as DateFilter)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Date range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">Last 7 Days</SelectItem>
                <SelectItem value="month">Last 30 Days</SelectItem>
              </SelectContent>
            </Select>

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.filter(c => c !== "all").map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {(activityType !== "all" || dateFilter !== "all" || categoryFilter !== "all") && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setActivityType("all");
                  setDateFilter("all");
                  setCategoryFilter("all");
                }}
                className=""
              >
                Clear Filters
              </Button>
            )}
          </div>
        </div>

        {filteredActivities.length === 0 ? (
          <Card className="p-12 text-center bg-secondary border border-border">
            <p className="text-xl text-secondary-foreground  mb-2">
              {activitiesData && activitiesData.length > 0 
                ? "No activity matches your filters" 
                : "No activity yet"}
            </p>
            <p className="text-muted-foreground">
              {activitiesData && activitiesData.length > 0
                ? "Try adjusting your filters"
                : "Check back later for updates!"}
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredActivities.map((activity, index) => {
              if (activity.type === "bet") {
                const bet = activity.data;
                const timeAgo = bet.createdAt 
                  ? formatDistanceToNow(new Date(bet.createdAt), { addSuffix: true })
                  : "recently";
                const volume = parseFloat(bet.market.yesPool) + parseFloat(bet.market.noPool);
                
                return (
                  <Link
                    key={`bet-${bet.id}-${index}`}
                    href={
                      bet.market.isPrivate === 1 && bet.market.inviteCode
                        ? `/wager/${bet.market.inviteCode}`
                        : `/market/${bet.market.slug || bet.marketId}`
                    }
                    className="block"
                  >
                    <Card className="p-6 bg-secondary border border-border cursor-pointer">
                      <div className="flex items-start gap-4">
                        <div className={`p-3 rounded-full ${
                          bet.position === "yes" 
                            ? "text-secondary-foreground"
                            : "text-destructive"
                        }`}>
                          {bet.position === "yes" ? (
                            <TrendingUp className="h-5 w-5" />
                          ) : (
                            <TrendingDown className="h-5 w-5" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-start justify-between gap-4 mb-2">
                            <div>
                              <p className="text-secondary-foreground  font-semibold">
                                Bet placed on {bet.market.question}
                              </p>
                              <p className="text-muted-foreground text-sm mt-1">
                                {bet.position.toUpperCase()} • {parseFloat(bet.amount).toFixed(2)} SOL
                                {bet.probability && ` • ${bet.probability}% probability`}
                              </p>
                            </div>
                            <Badge variant="outline" className="">
                              <Clock className="h-3 w-3 mr-1" />
                              {timeAgo}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span>Market Volume: {volume.toFixed(2)} SOL</span>
                            <Badge variant="secondary" className="text-xs">
                              {bet.market.category}
                            </Badge>
                          </div>
                        </div>
                        <ArrowRight className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-1" />
                      </div>
                    </Card>
                  </Link>
                );
              } else if (activity.type === "resolution") {
                const market = activity.data;
                const timeAgo = market.createdAt 
                  ? formatDistanceToNow(new Date(market.createdAt), { addSuffix: true })
                  : "recently";
                
                return (
                  <Link
                    key={`resolution-${market.id}-${index}`}
                    href={
                      market.isPrivate === 1 && market.inviteCode
                        ? `/wager/${market.inviteCode}`
                        : `/market/${market.slug || market.id}`
                    }
                    className="block"
                  >
                    <Card className="p-6 bg-secondary hover:bg-background/70 hover-elevate active-elevate-2 transition-all duration-200 cursor-pointer border border-border cursor-pointer">
                      <div className="flex items-start gap-4">
                        <div className={`p-3 rounded-full ${
                          market.resolvedOutcome === "yes"
                            ? "text-chart-2"
                            : "text-destructive"
                        }`}>
                          <Target className="h-5 w-5" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-start justify-between gap-4 mb-2">
                            <div>
                              <p className="text-secondary-foreground  font-semibold">
                                Market resolved: {market.question}
                              </p>
                              <p className="text-muted-foreground text-sm mt-1">
                                Outcome: <span className="font-semibold text-secondary-foreground ">{market.resolvedOutcome?.toUpperCase()}</span>
                              </p>
                            </div>
                            <Badge 
                              variant={market.resolvedOutcome === "yes" ? "default" : "destructive"}
                              className={`text-xs ${market.resolvedOutcome === "yes" ? "bg-green-400/20 text-green-400" : ""}`}
                            >
                              RESOLVED
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span>
                              Final Probability: {market.probability}%
                            </span>
                            <Badge variant="secondary" className="text-xs">
                              {market.category}
                            </Badge>
                          </div>
                        </div>
                        <ArrowRight className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-1" />
                      </div>
                    </Card>
                  </Link>
                );
              } else if (activity.type === "market_created") {
                const market = activity.data;
                const timeAgo = market.createdAt 
                  ? formatDistanceToNow(new Date(market.createdAt), { addSuffix: true })
                  : "recently";
                const volume = parseFloat(market.yesPool) + parseFloat(market.noPool);
                
                return (
                  <Link
                    key={`created-${market.id}-${index}`}
                    href={
                      market.isPrivate === 1 && market.inviteCode
                        ? `/wager/${market.inviteCode}`
                        : `/market/${market.slug || market.id}`
                    }
                    className="block"
                  >
                    <Card className="p-6 bg-secondary hover:bg-background/50 hover-elevate active-elevate-2 transition-all duration-200 cursor-pointer border border-border cursor-pointer">
                      <div className="flex items-start gap-4">
                        <div className="p-3 rounded-full text-secondary-foreground">
                          <Target className="h-5 w-5" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-start justify-between gap-4 mb-2">
                            <div>
                              <p className="text-secondary-foreground  font-semibold">
                                New market: {market.question}
                              </p>
                              <p className="text-muted-foreground text-sm mt-1">
                                Starting probability: {market.probability}%
                              </p>
                            </div>
                            <Badge variant="outline" className="">
                              <Clock className="h-3 w-3 mr-1" />
                              {timeAgo}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span>Volume: {volume.toFixed(2)} SOL</span>
                            <Badge variant="secondary" className="text-xs">
                              {market.category}
                            </Badge>
                          </div>
                        </div>
                        <ArrowRight className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-1" />
                      </div>
                    </Card>
                  </Link>
                );
              }
              return null;
            })}
          </div>
        )}
      </div>
    </div>
  );
}

