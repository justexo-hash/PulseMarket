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
      <div className="flex items-start gap-6 pb-6 overflow-x-auto">
            <Link
            href={`/`}
          >
            <Button
              variant={
                activeCategory ? "secondary" : "default"
              }
              className="whitespace-nowrap capitalize font-bold text-base"
            >
              All
            </Button>
          </Link>
        {categories.map((cat: any) => (
          <Link
            key={cat}
            href={`/market/${encodeURIComponent(cat.toLowerCase())}`}
          >
            <Button
              key={cat}
              variant={
                activeCategory === cat.toLowerCase() ? "default" : "secondary"
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
