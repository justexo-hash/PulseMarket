

"use client";

import { useMemo, useState } from "react";
import type { Market } from "@shared/schema";

export type SortOption =
  | "newest"
  | "oldest"
  | "volume"
  | "probability"
  | "ending-soon";

export function useMarketSearch(markets: Market[]) {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");

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

  return {
    searchQuery,
    setSearchQuery,
    sortBy,
    setSortBy,
    selectedCategory,
    setSelectedCategory,
    categories,
    filteredMarkets,
  };
}