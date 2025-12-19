"use client";

import { Button } from "@/components/ui/button";
import { useMarketSearchContext } from "app/(markets)/_context/MarketSearchContext";
import { X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function SearchCategories() {
  const { categories, selectedCategory, setSelectedCategory } = useMarketSearchContext();
  const pathname = usePathname();
  const activeCategory = decodeURIComponent(pathname.split("/").pop() || "").toLowerCase();

  if (!categories || categories.length === 0) return null;
  

  return (
      <div className="flex items-center gap-6 overflow-auto no-scrollbar">
        <div className="pr-6 flex items-center gap-6 border-r border-border">

            <Link
            href={`/`}
          >
            <Button
              variant={
                activeCategory === "" ? "link" : "selected"
              }
              className="whitespace-nowrap capitalize font-bold text-base"
            >
              Trending
            </Button>
          </Link>
        </div>
          
        {categories.map((cat: any) => (
          <Link
            key={cat}
            href={`/market/${encodeURIComponent(cat.toLowerCase())}`}
          >
            <Button
              key={cat}
              variant={
                activeCategory === cat.toLowerCase() ? "link" : "selected"
              }
              className="whitespace-nowrap capitalize font-bold text-base"
            >
              {cat.charAt(0).toUpperCase() + cat.slice(1)}
            </Button>
          </Link>
        ))}
      </div>
  );
}
