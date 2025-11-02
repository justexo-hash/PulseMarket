import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { type Market } from "@shared/schema";
import { MarketCard } from "@/components/MarketCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";

export function MarketList() {
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");
  
  const { data: markets = [], isLoading, error } = useQuery<Market[]>({
    queryKey: ["/api/markets"],
  });

  // Extract unique categories from markets
  const categories = useMemo(() => {
    const unique = new Set(markets.map(m => m.category));
    return ["All", ...Array.from(unique).sort()];
  }, [markets]);

  // Filter markets based on category and search
  const filteredMarkets = useMemo(() => {
    return markets.filter(market => {
      const matchesCategory = selectedCategory === "All" || market.category === selectedCategory;
      const matchesSearch = searchQuery === "" || 
        market.question.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [markets, selectedCategory, searchQuery]);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">Active Markets</h1>
          <p className="text-muted-foreground text-lg">
            Explore prediction markets and place your bets on future events
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-card border border-card-border rounded-lg p-6 shadow-lg h-64 animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center py-20">
          <p className="text-2xl text-destructive mb-4">Failed to load markets</p>
          <p className="text-muted-foreground">{error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-foreground mb-2">Active Markets</h1>
        <p className="text-muted-foreground text-lg">
          Explore prediction markets and place your bets on future events
        </p>
      </div>

      {/* Search and Filters */}
      <div className="mb-8 space-y-4">
        {/* Search Input */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search markets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            data-testid="input-search"
          />
        </div>

        {/* Category Filters */}
        <div className="flex flex-wrap gap-2">
          {categories.map((category) => (
            <Button
              key={category}
              variant={selectedCategory === category ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(category)}
              data-testid={`button-filter-${category.toLowerCase()}`}
            >
              {category}
            </Button>
          ))}
        </div>
      </div>

      {/* Markets Grid */}
      {filteredMarkets.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-2xl text-muted-foreground mb-4">
            {searchQuery || selectedCategory !== "All" 
              ? "No markets match your filters" 
              : "No markets available yet"}
          </p>
          <p className="text-muted-foreground">
            {searchQuery || selectedCategory !== "All"
              ? "Try adjusting your filters"
              : "Be the first to create a market!"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMarkets.map((market) => (
            <MarketCard key={market.id} market={market} />
          ))}
        </div>
      )}
    </div>
  );
}
