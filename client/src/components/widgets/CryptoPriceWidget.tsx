import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { TrendingUp, TrendingDown } from "lucide-react";

type CryptoType = "sol" | "eth" | "btc";

interface PriceData {
  price: number;
  change24h: number;
}

export function CryptoPriceWidget() {
  const [selectedCrypto, setSelectedCrypto] = useState<CryptoType>("sol");

  const { data, isLoading } = useQuery<PriceData>({
    queryKey: [`crypto-price-${selectedCrypto}`],
    queryFn: async () => {
      try {
        // Map to CoinMarketCap symbols
        const symbol = selectedCrypto === "sol" ? "SOL" : selectedCrypto === "eth" ? "ETH" : "BTC";
        
        // Fetch from CoinMarketCap API via our proxy
        const response = await fetch(`/api/coinmarketcap/quotes?symbol=${symbol}`);
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `Failed to fetch ${symbol} price: ${response.statusText}`);
        }
        
        const json = await response.json();
        
        // Check for API errors in response
        if (json.error) {
          throw new Error(json.error || `API error: ${JSON.stringify(json.status || {})}`);
        }
        
        // CoinMarketCap API v1 response structure (from https://coinmarketcap.com/api/documentation/v1/#):
        // {
        //   "status": { "error_code": 0, "error_message": null, ... },
        //   "data": {
        //     "BTC": [{ "id": 1, "name": "Bitcoin", "symbol": "BTC", "quote": { "USD": { "price": ..., "percent_change_24h": ... } } }],
        //     "ETH": [{ ... }],
        //     "SOL": [{ ... }]
        //   }
        // }
        // The data object uses symbol as key, and value is an array with one object
        
        // Check if status indicates an error (even if HTTP status is 200)
        if (json.status?.error_code && json.status.error_code !== 0) {
          throw new Error(json.status.error_message || `CoinMarketCap API error: ${json.status.error_code}`);
        }
        
        // Access the coin data - according to CoinMarketCap API docs
        // Response structure: { status: {...}, data: { "BTC": [{...}], "ETH": [{...}], ... } }
        if (!json.data || typeof json.data !== 'object') {
          console.error(`[CryptoPriceWidget] Invalid response structure:`, json);
          throw new Error(`Invalid response structure from CoinMarketCap API`);
        }
        
        // CoinMarketCap API returns data as an object with symbol keys
        // The structure is: data: { "BTC": { id: 1, name: "Bitcoin", quote: {...} }, "ETH": {...}, ... }
        // Note: It's a direct object, NOT an array!
        let coinData = null;
        
        // Try to access by symbol key - the value is a direct object, not an array
        if (json.data[symbol] && typeof json.data[symbol] === 'object' && !Array.isArray(json.data[symbol])) {
          coinData = json.data[symbol];
        } else {
          // If not found, try case-insensitive match
          const upperSymbol = symbol.toUpperCase();
          for (const key of Object.keys(json.data)) {
            if (key.toUpperCase() === upperSymbol && typeof json.data[key] === 'object' && !Array.isArray(json.data[key])) {
              coinData = json.data[key];
              break;
            }
          }
        }
        
        if (!coinData) {
          const availableSymbols = Object.keys(json.data).join(', ');
          throw new Error(`No data found for ${symbol}. Available symbols: ${availableSymbols}`);
        }
        
        const quote = coinData.quote?.USD;
        if (!quote) {
          throw new Error(`No USD quote found for ${symbol}`);
        }
        
        return {
          price: quote.price || 0,
          change24h: quote.percent_change_24h || 0,
        };
      } catch (error) {
        console.error(`Error fetching ${selectedCrypto} price:`, error);
        // Return mock data as fallback
        const mockData: Record<CryptoType, PriceData> = {
          sol: { price: 164.52, change24h: 0.08 },
          eth: { price: 3420.15, change24h: -1.23 },
          btc: { price: 67890.12, change24h: 2.45 },
        };
        return mockData[selectedCrypto];
      }
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const getCryptoName = () => {
    switch (selectedCrypto) {
      case "sol": return "Solana";
      case "eth": return "Ethereum";
      case "btc": return "Bitcoin";
    }
  };

  const getCryptoIcon = (crypto: CryptoType) => {
    switch (crypto) {
      case "sol": return "/solana.webp";
      case "eth": return "/eth-logo.webp";
      case "btc": return "/btc-logo.webp";
    }
  };

  if (isLoading) {
    return (
      <Card className="p-3 bg-card/50 backdrop-blur-sm border-border/50">
        <div className="flex items-center justify-between mb-2">
          <div className="h-4 w-20 bg-muted animate-pulse rounded" />
          <div className="flex gap-1.5">
            {(["sol", "eth", "btc"] as CryptoType[]).map((crypto) => (
              <div key={crypto} className="w-6 h-6 bg-muted animate-pulse rounded-full" />
            ))}
          </div>
        </div>
        <div className="h-8 bg-muted animate-pulse rounded" />
      </Card>
    );
  }

  const price = data?.price || 0;
  const change24h = data?.change24h || 0;

  return (
    <Card className="p-3 bg-card/50 backdrop-blur-sm border-border/50">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-foreground">{getCryptoName()} Price</h3>
        <div className="flex gap-1.5">
          <button
            onClick={() => setSelectedCrypto("sol")}
            className={`w-6 h-6 rounded-full flex items-center justify-center transition-all overflow-hidden ${
              selectedCrypto === "sol"
                ? "ring-1.5 ring-primary"
                : "opacity-60 hover:opacity-100"
            }`}
          >
            <img src={getCryptoIcon("sol")} alt="Solana" className="w-full h-full object-cover" />
          </button>
          <button
            onClick={() => setSelectedCrypto("eth")}
            className={`w-6 h-6 rounded-full flex items-center justify-center transition-all overflow-hidden ${
              selectedCrypto === "eth"
                ? "ring-1.5 ring-primary"
                : "opacity-60 hover:opacity-100"
            }`}
          >
            <img src={getCryptoIcon("eth")} alt="Ethereum" className="w-full h-full object-cover" />
          </button>
          <button
            onClick={() => setSelectedCrypto("btc")}
            className={`w-6 h-6 rounded-full flex items-center justify-center transition-all overflow-hidden ${
              selectedCrypto === "btc"
                ? "ring-1.5 ring-primary"
                : "opacity-60 hover:opacity-100"
            }`}
          >
            <img src={getCryptoIcon("btc")} alt="Bitcoin" className="w-full h-full object-cover" />
          </button>
        </div>
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className="text-xl font-bold text-foreground">
          ${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
        <div className={`flex items-center gap-0.5 ${change24h >= 0 ? 'text-green-500' : 'text-red-500'}`}>
          {change24h >= 0 ? (
            <TrendingUp className="h-3 w-3" />
          ) : (
            <TrendingDown className="h-3 w-3" />
          )}
          <span className="text-xs font-medium">
            {change24h >= 0 ? "+" : ""}{change24h.toFixed(2)}%
          </span>
        </div>
      </div>
    </Card>
  );
}
