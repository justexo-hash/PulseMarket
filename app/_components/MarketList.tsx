"use client";
import { useQuery } from "@tanstack/react-query";
import { type Market } from "@shared/schema";
import { MarketCard } from "./MarketCard";
import { useAuth } from "@/lib/auth";
import { useMarketSearchContext } from "app/(markets)/_context/MarketSearchContext";

export function MarketListView({
  categoryFilter,
}: {
  categoryFilter?: string;
}) {
  const { user } = useAuth();

  const {
    data: markets = [],
    isLoading,
    error,
  } = useQuery<Market[]>({
    queryKey: ["/api/markets"],
  });

  const { searchQuery, selectedCategory } = useMarketSearchContext();

  const filteredMarkets = markets.filter((m) => {
    const matchCategory = categoryFilter
      ? m.category === categoryFilter
      : selectedCategory === "All" || m.category === selectedCategory;

    return matchCategory;
  });

  if (error) {
    return (
        <div className="relative z-10 mx-auto py-12">
          <div className="text-center py-20">
            <p className="text-2xl text-red-400 mb-4">Failed to load markets</p>
            <p className="text-white/70">{(error as Error).message}</p>
          </div>
        </div>
    );
  }

  return (
    
      <div className="relative z-10">
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
          <div className="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredMarkets.map((market) => (
              <MarketCard key={market.id} market={market} />
            ))}
          </div>
        )}
      </div>
  );
}
