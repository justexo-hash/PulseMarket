"use client";

import { Button } from "@/components/ui/button";
import { useMarketSearchContext } from "../_context/MarketSearchContext";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function SearchCategories() {
  const { categories } = useMarketSearchContext();
  const pathname = usePathname();
  const activeCategory = decodeURIComponent(pathname.split("/").pop() || "");

  if (!categories || categories.length === 0) return null;

  return (
    <div className="flex items-start gap-6 overflow-x-auto">
      {categories.map((cat:any) => (
        <Link href={`/category/${encodeURIComponent(cat)}`}>

        <Button
          key={cat}
          size="lg"
          variant={activeCategory === cat ? "selected" : "ghost"}
          className="whitespace-nowrap px-0 capitalize font-bold text-sm"
        >
          {cat}
        </Button>
        </Link>
      ))}
    </div>
  );
}