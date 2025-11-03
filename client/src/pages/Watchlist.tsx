import { useQuery, useMutation } from "@tanstack/react-query";
import { type Market } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Heart } from "lucide-react";
import { MarketCard } from "@/components/MarketCard";

export default function Watchlist() {
  const { data: markets, isLoading, error } = useQuery<Market[]>({
    queryKey: ["/api/watchlist"],
    queryFn: async () => {
      const response = await fetch("/api/watchlist", { credentials: "include" });
      if (!response.ok) {
        if (response.status === 401) return [];
        throw new Error(`Failed to fetch watchlist: ${response.statusText}`);
      }
      const data = await response.json();
      console.log("[Watchlist] Fetched markets:", data);
      return data as Market[];
    },
    retry: false,
  });

  const removeMutation = useMutation({
    mutationFn: async (marketId: number) => {
      await apiRequest("DELETE", `/api/watchlist/${marketId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/watchlist"] });
    },
  });

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <Link href="/">
        <Button variant="ghost" className="mb-6 hover-elevate">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Markets
        </Button>
      </Link>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-foreground">Your Watchlist</h1>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading watchlist...</p>
      ) : error ? (
        <p className="text-destructive">Error loading watchlist: {error.message}</p>
      ) : !markets || markets.length === 0 ? (
        <p className="text-muted-foreground">No favorites yet. Tap the <Heart className="inline h-4 w-4" /> icon on any market.</p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {markets.map((m) => (
            <div key={m.id} className="relative group">
              <MarketCard market={m} />
              <button
                aria-label="Remove from watchlist"
                className="absolute top-3 right-3 text-destructive/80 hover:text-destructive"
                onClick={() => removeMutation.mutate(m.id)}
              >
                <Heart className="h-5 w-5 fill-destructive/20" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


