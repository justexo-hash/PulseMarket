"use client";

import { useEffect } from "react";
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
import { MarketSearchBar } from "./Searchbar";
import { useMarketSearch } from "../_hooks/useMarketSearch";

export function MarketListView() {
  const { user } = useAuth();

  const {
    data: markets = [],
    isLoading,
    error,
  } = useQuery<Market[]>({
    queryKey: ["/api/markets"],
  });

  const {
    searchQuery,
    setSearchQuery,
    sortBy,
    setSortBy,
    selectedCategory,
    setSelectedCategory,
    categories,
    filteredMarkets,
  } = useMarketSearch(markets);

  useEffect(() => {
    const removeZeroTextNodes = () => {
      const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        null
      );
      const textNodes: Text[] = [];
      let node: Node | null;
      while ((node = walker.nextNode())) {
        if (node.textContent?.trim() === "0") {
          textNodes.push(node as Text);
        }
      }
      textNodes.forEach((textNode) => {
        const parent = textNode.parentElement;
        if (parent) {
          const text = parent.textContent || "";
          if (text.includes("Private Wager")) {
            textNode.remove();
          }
        }
      });
    };

    removeZeroTextNodes();
    const timeout = setTimeout(removeZeroTextNodes, 100);
    return () => clearTimeout(timeout);
  }, []);

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
            <Button size="lg"  className="gap-2" asChild>
              <Link href="/create">
                <Users className="h-5 w-5" />
                Private Wager
              </Link>
            </Button>
          </div>
        </div>

        <MarketSearchBar
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          sortBy={sortBy}
          setSortBy={setSortBy}
          categories={categories}
          selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory}
        />

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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredMarkets.map((market) => (
              <MarketCard key={market.id} market={market} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
