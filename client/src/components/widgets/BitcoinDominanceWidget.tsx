import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { TrendingUp, TrendingDown } from "lucide-react";

interface DominanceData {
  name: string;
  percentage: number;
  change24h: number;
  color: string;
}

export function BitcoinDominanceWidget() {
  const { data, isLoading } = useQuery<DominanceData[]>({
    queryKey: ["bitcoin-dominance"],
    queryFn: async () => {
      try {
        // Fetch from CoinMarketCap API via our proxy
        const response = await fetch("/api/coinmarketcap/global-metrics");
        if (!response.ok) {
          throw new Error("Failed to fetch global metrics");
        }
        
        const json = await response.json();
        const globalData = json.data;
        
        if (!globalData) {
          console.error("[BitcoinDominanceWidget] Invalid response structure:", json);
          throw new Error("Invalid response structure from API");
        }
        
        // Get BTC, ETH, SOL dominance from CoinMarketCap
        const btcDominance = globalData.btc_dominance || 0;
        const ethDominance = globalData.eth_dominance || 0;
        
        // Fetch SOL data separately to get its market cap
        const solResponse = await fetch("/api/coinmarketcap/quotes?symbol=SOL");
        let solDominance = 0;
        let solChange = -0.19; // Default fallback
        if (solResponse.ok) {
          const solData = await solResponse.json();
          const totalMarketCap = globalData.quote?.USD?.total_market_cap || 0;
          
          // CoinMarketCap API structure: data["SOL"] is a direct object, not an array
          if (solData.data && typeof solData.data === 'object' && solData.data.SOL) {
            const solCoinData = solData.data.SOL;
            // Check if it's a direct object (not an array)
            if (typeof solCoinData === 'object' && !Array.isArray(solCoinData)) {
              const solMarketCap = solCoinData.quote?.USD?.market_cap || 0;
              solDominance = totalMarketCap > 0 ? (solMarketCap / totalMarketCap) * 100 : 0;
              solChange = solCoinData.quote?.USD?.percent_change_24h || solChange;
            } else if (Array.isArray(solCoinData) && solCoinData.length > 0) {
              // Handle array structure as fallback (though it shouldn't be needed)
              const solCoin = solCoinData[0];
              const solMarketCap = solCoin.quote?.USD?.market_cap || 0;
              solDominance = totalMarketCap > 0 ? (solMarketCap / totalMarketCap) * 100 : 0;
              solChange = solCoin.quote?.USD?.percent_change_24h || solChange;
            }
          }
        }
        
        // Calculate others (100% - BTC - ETH - SOL)
        const othersDominance = Math.max(0, 100 - btcDominance - ethDominance - solDominance);
        
        // Get 24h changes from global metrics
        const btcChange = globalData.btc_dominance_24h_percentage_change || 0;
        const ethChange = globalData.eth_dominance_24h_percentage_change || 0;
        
        // For Others, we'll use approximate change (can be enhanced later)
        const othersChange = -0.55; // Approximate
        
        return [
          {
            name: "Bitcoin",
            percentage: btcDominance,
            change24h: btcChange,
            color: "bg-orange-500",
          },
          {
            name: "Ethereum",
            percentage: ethDominance,
            change24h: ethChange,
            color: "bg-purple-500",
          },
          {
            name: "Solana",
            percentage: solDominance,
            change24h: solChange,
            color: "bg-teal-500",
          },
          {
            name: "Others",
            percentage: othersDominance,
            change24h: othersChange,
            color: "bg-gray-500",
          },
        ];
      } catch (error) {
        console.error("Error fetching dominance data:", error);
        // Return mock data as fallback
        return [
          {
            name: "Bitcoin",
            percentage: 60.4,
            change24h: 1.01,
            color: "bg-orange-500",
          },
          {
            name: "Ethereum",
            percentage: 12.3,
            change24h: -0.27,
            color: "bg-purple-500",
          },
          {
            name: "Solana",
            percentage: 2.6,
            change24h: -0.19,
            color: "bg-teal-500",
          },
          {
            name: "Others",
            percentage: 24.7,
            change24h: -0.55,
            color: "bg-gray-500",
          },
        ];
      }
    },
    refetchInterval: 60000, // Refetch every minute
  });

  if (isLoading) {
    return (
      <Card className="p-3 bg-card/50 backdrop-blur-sm border-border/50">
        <h3 className="text-sm font-semibold mb-2 text-foreground">Bitcoin Dominance</h3>
        <div className="space-y-1.5">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-6 bg-muted animate-pulse rounded" />
          ))}
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-3 bg-card/50 backdrop-blur-sm border-border/50">
      <h3 className="text-sm font-semibold mb-2 text-foreground">Bitcoin Dominance</h3>
      <div className="space-y-1.5">
        {data?.map((item) => {
          const getIcon = () => {
            switch (item.name) {
              case "Bitcoin": return "/btc-logo.webp";
              case "Ethereum": return "/eth-logo.webp";
              case "Solana": return "/solana.webp";
              default: return null;
            }
          };
          const icon = getIcon();
          
          return (
            <div key={item.name} className="flex items-center justify-between">
              <div className="flex items-center gap-2 flex-1">
                {icon ? (
                  <img src={icon} alt={item.name} className="w-4 h-4 rounded-full object-cover" />
                ) : (
                  <div className={`w-2.5 h-2.5 rounded-full ${item.color}`} />
                )}
                <span className="text-xs font-medium text-foreground">{item.name}</span>
              </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-foreground">
                {item.percentage.toFixed(1)}%
              </span>
              <div className={`flex items-center gap-0.5 ${item.change24h >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {item.change24h >= 0 ? (
                  <TrendingUp className="h-2.5 w-2.5" />
                ) : (
                  <TrendingDown className="h-2.5 w-2.5" />
                )}
                <span className="text-[10px] font-medium">
                  {Math.abs(item.change24h).toFixed(2)}%
                </span>
              </div>
            </div>
          </div>
          );
        })}
      </div>
    </Card>
  );
}
