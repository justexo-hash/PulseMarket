import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Heart } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";

export function MarketWatchToggle({ marketId }: { marketId: number }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: watchlist } = useQuery<number[]>({
    queryKey: ["/api/watchlist", "ids"],
    queryFn: async () => {
      const res = await fetch("/api/watchlist", { credentials: "include" });
      if (res.status === 401) return [];
      if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
      const markets = await res.json();
      return (markets || []).map((m: any) => m.id as number);
    },
    staleTime: 30_000,
  });

  const isActive = !!watchlist?.includes(marketId);

  const add = useMutation({
    mutationFn: async () => apiRequest("POST", `/api/watchlist/${marketId}`),
    onSuccess: async () => {
      toast({ title: "Added to Watchlist" });
      // Optimistically update ids cache
      queryClient.setQueryData<number[]>(["/api/watchlist", "ids"], (prev) => {
        const set = new Set(prev || []);
        set.add(marketId);
        return Array.from(set);
      });
      queryClient.invalidateQueries({ queryKey: ["/api/watchlist"] });
      queryClient.invalidateQueries({ queryKey: ["/api/watchlist", "ids"] });
    },
    onError: (err: any) => {
      toast({ title: "Watchlist", description: err?.message || "Failed to add.", variant: "destructive" });
    },
  });

  const remove = useMutation({
    mutationFn: async () => apiRequest("DELETE", `/api/watchlist/${marketId}`),
    onSuccess: async () => {
      toast({ title: "Removed from Watchlist" });
      // Optimistically update ids cache
      queryClient.setQueryData<number[]>(["/api/watchlist", "ids"], (prev) => {
        const arr = (prev || []).filter((id) => id !== marketId);
        return arr;
      });
      queryClient.invalidateQueries({ queryKey: ["/api/watchlist"] });
      queryClient.invalidateQueries({ queryKey: ["/api/watchlist", "ids"] });
    },
    onError: (err: any) => {
      toast({ title: "Watchlist", description: err?.message || "Failed to remove.", variant: "destructive" });
    },
  });

  return (
    <button
      aria-label={isActive ? "Remove from watchlist" : "Add to watchlist"}
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log("[Watchlist] click", { marketId, isActive, userPresent: !!user });
        if (!user) {
          toast({ title: "Login required", description: "Connect your wallet to use Watchlist.", variant: "destructive" });
          return;
        }
        isActive ? remove.mutate() : add.mutate();
      }}
      className={`transition-colors ${
        isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
      } ${add.isPending || remove.isPending ? "opacity-60 pointer-events-none" : ""}`}
      title={isActive ? "Remove from Watchlist" : "Add to Watchlist"}
    >
      <Heart className={`h-5 w-5 ${isActive ? "fill-primary/20" : ""}`} />
    </button>
  );
}


