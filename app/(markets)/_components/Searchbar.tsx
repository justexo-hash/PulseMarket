"use client";

import { Search, ArrowUpDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useMarketSearchContext } from "../_context/MarketSearchContext";

export function MarketSearchBar() {
  const { searchQuery, setSearchQuery } = useMarketSearchContext();
  return (
    <div className="w-full flex items-center justify-between mb-6">
      <div className="relative flex-1">
        <Search className="absolute z-50 left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground" />
        <Input
          type="text"
          placeholder="Search market"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 text-foreground w-full border border-muted-foreground/10"
        />
      </div>
    </div>
  );
}