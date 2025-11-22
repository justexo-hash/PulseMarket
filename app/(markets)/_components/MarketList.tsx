"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { type Market } from "@shared/schema";
import { MarketCard } from "./MarketCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, ArrowUpDown, Plus, Users } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Link from "next/link";
import { useAuth } from "@/lib/auth";

type SortOption =
  | "newest"
  | "oldest"
  | "volume"
  | "probability"
  | "ending-soon";

function MarketsSkeleton() {
  return (
    <div className="relative min-h-screen">
      <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Discover</h1>
          <p className="text-white/80 text-lg">
            Explore prediction markets and place your bets on future events
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-lg p-6 h-64 animate-pulse"
            />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-lg p-6 shadow-lg h-64 animate-pulse"
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export function MarketListView() {
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const { user } = useAuth();

  const {
    data: markets = [],
    isLoading,
    error,
  } = useQuery<Market[]>({
    queryKey: ["/api/markets"],
  });

  const categories = useMemo(() => {
    const unique = new Set(markets.map((m) => m.category));
    return ["All", ...Array.from(unique).sort()];
  }, [markets]);

  const filteredMarkets = useMemo(() => {
    let filtered = markets.filter((market) => {
      const matchesCategory =
        selectedCategory === "All" || market.category === selectedCategory;
      const matchesSearch =
        searchQuery === "" ||
        market.question.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });

    filtered.sort((a, b) => {
      switch (sortBy) {
        case "newest": {
          const aCreated = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const bCreated = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return bCreated - aCreated;
        }
        case "oldest": {
          const aCreated = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const bCreated = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return aCreated - bCreated;
        }
        case "volume": {
          const aVolume = parseFloat(a.yesPool) + parseFloat(a.noPool);
          const bVolume = parseFloat(b.yesPool) + parseFloat(b.noPool);
          return bVolume - aVolume;
        }
        case "probability":
          return b.probability - a.probability;
        case "ending-soon": {
          const aExpires = a.expiresAt
            ? new Date(a.expiresAt).getTime()
            : Infinity;
          const bExpires = b.expiresAt
            ? new Date(b.expiresAt).getTime()
            : Infinity;
          if (aExpires === Infinity && bExpires === Infinity) return 0;
          if (aExpires === Infinity) return 1;
          if (bExpires === Infinity) return -1;
          return aExpires - bExpires;
        }
        default:
          return 0;
      }
    });

    return filtered;
  }, [markets, selectedCategory, searchQuery, sortBy]);

  if (isLoading) {
    return <MarketsSkeleton />;
  }

  if (error) {
    return (
      <div className="relative min-h-screen">
        <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center py-20">
            <p className="text-2xl text-red-400 mb-4">Failed to load markets</p>
            <p className="text-white/70">{(error as Error).message}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen">
      <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Discover</h1>
            <p className="text-white/80 text-lg">
              Explore prediction markets and place your bets on future events
            </p>
          </div>
          <div className="flex gap-2">
            {user?.isAdmin && (
              <Button size="lg" className="gap-2" asChild>
                <Link href="/create">
                  <Plus className="h-5 w-5" />
                  Create Market
                </Link>
              </Button>
            )}
            <Button size="lg" variant="secondary" className="gap-2" asChild>
              <Link href="/create">
                <Users className="h-5 w-5" />
                Private Wager
              </Link>
            </Button>
          </div>
        </div>

        <div className="mb-8 space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search markets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-black/30 backdrop-blur-sm border-white/20 text-white placeholder:text-white/50"
                data-testid="input-search"
              />
            </div>

            <div className="flex items-center gap-2">
              <ArrowUpDown className="h-4 w-4 text-white/70" />
              <Select
                value={sortBy}
                onValueChange={(value) => setSortBy(value as SortOption)}
              >
                <SelectTrigger className="w-[180px] bg-black/30 backdrop-blur-sm border-white/20 text-white">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest First</SelectItem>
                  <SelectItem value="oldest">Oldest First</SelectItem>
                  <SelectItem value="volume">Highest Volume</SelectItem>
                  <SelectItem value="probability">
                    Highest Probability
                  </SelectItem>
                  <SelectItem value="ending-soon">Ending Soon</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <Button
                key={category}
                variant={selectedCategory === category ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(category)}
                className={
                  selectedCategory !== category
                    ? "bg-black/30 backdrop-blur-sm border-white/30 text-white hover:bg-white/20"
                    : undefined
                }
                data-testid={`button-filter-${category.toLowerCase()}`}
              >
                {category}
              </Button>
            ))}
          </div>
        </div>

        {filteredMarkets.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-2xl text-white mb-4">
              {searchQuery || selectedCategory !== "All"
                ? "No markets match your filters"
                : "No markets available yet"}
            </p>
            <p className="text-white/70">
              {searchQuery || selectedCategory !== "All"
                ? "Try adjusting your filters"
                : "Be the first to create a market!"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredMarkets.map((market) => (
              <MarketCard key={market.id} market={market} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export { MarketsSkeleton };

