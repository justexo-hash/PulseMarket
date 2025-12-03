"use client";

import { createContext, useContext, useState, useMemo } from "react";
import type { Market } from "@shared/schema";

interface MarketSearchContextType {
  searchQuery: string;
  setSearchQuery: (v: string) => void;

  categories: string[];
  markets: Market[];
  selectedCategory: string;
  setSelectedCategory: (v: string) => void;
}

const MarketSearchContext = createContext<MarketSearchContextType | null>(null);

export function MarketSearchProvider({
  markets,
  children,
}: {
  markets: Market[];
  children: React.ReactNode;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  // Extract unique categories from markets
  const categories = useMemo(() => {
    if (!markets || markets.length === 0) return ["All"];

    const unique = new Set(
      markets
        .map((m) => m.category?.trim())
        .filter((c) => c && c.length > 0)
    );

    return ["All", ...Array.from(unique)];
  }, [markets]);

  const value: MarketSearchContextType = {
    searchQuery,
    setSearchQuery,

    categories,
    markets,
    selectedCategory,
    setSelectedCategory,
  };

  return (
    <MarketSearchContext.Provider value={value}>
      {children}
    </MarketSearchContext.Provider>
  );
}

export function useMarketSearchContext() {
  const ctx = useContext(MarketSearchContext);
  if (!ctx) {
    throw new Error("useMarketSearchContext must be used inside MarketSearchProvider");
  }
  return ctx;
}