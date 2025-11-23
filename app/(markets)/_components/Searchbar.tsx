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

type SortOption =
  | "newest"
  | "oldest"
  | "volume"
  | "probability"
  | "ending-soon";

interface MarketSearchBarProps {
  searchQuery: string;
  setSearchQuery: (value: string) => void;

  sortBy: SortOption;
  setSortBy: (value: SortOption) => void;

  categories: string[];
  selectedCategory: string;
  setSelectedCategory: (value: string) => void;
}

export function MarketSearchBar({
  searchQuery,
  setSearchQuery,
  sortBy,
  setSortBy,
  categories,
  selectedCategory,
  setSelectedCategory,
}: MarketSearchBarProps) {
  return (
    <div className="w-full flex items-center justify-between mb-6">
      {/* Search */}
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

    <div className="flex items-center gap-4 flex-1 justify-end">

      {/* Sort */}
      <div className="flex items-center gap-2 ">
        <Select value={sortBy} onValueChange={(val) => setSortBy(val as SortOption)}>
          <SelectTrigger className="w-[150px] border-muted-foreground/10">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest First</SelectItem>
            <SelectItem value="oldest">Oldest First</SelectItem>
            <SelectItem value="volume">Highest Volume</SelectItem>
            <SelectItem value="probability">Highest Probability</SelectItem>
            <SelectItem value="ending-soon">Ending Soon</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Categories */}
      <div className="flex flex-wrap gap-2">
        {categories.map((cat) => (
          <Button
            key={cat}
            size="sm"
            variant={selectedCategory === cat ? "default" : "outline"}
            onClick={() => setSelectedCategory(cat)}
          >
            {cat}
          </Button>
        ))}
      </div>
    </div>

    </div>
  );
}