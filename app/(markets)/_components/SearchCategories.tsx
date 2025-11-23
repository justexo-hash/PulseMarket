

"use client";

import { Button } from "@/components/ui/button";
import { useMarketSearchContext } from "../_context/MarketSearchContext";

export function SearchCategories() {
  const {
    categories,
    selectedCategory,
    setSelectedCategory,
  } = useMarketSearchContext();

  if (!categories || categories.length === 0) return null;

  return (
    <div className="flex items-center gap-2 overflow-x-auto">
      {categories.map((cat) => (
        <Button
          key={cat}
          size="lg"
          variant={selectedCategory === cat ?  "selected" : "ghost"}
          onClick={() => setSelectedCategory(cat)}
          className="whitespace-nowrap capitalize font-bold text-sm"
        >
          {cat}
        </Button>
      ))}
    </div>
  );
}