import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";

interface FearGreedData {
  value: number;
  classification: string;
}

// Fallback function to fetch from alternative.me API
async function fetchFromAlternativeMe(): Promise<FearGreedData> {
  const response = await fetch("https://api.alternative.me/fng/");
  const json = await response.json();
  const value = parseInt(json.data[0].value);
  
  let classification = "Neutral";
  if (value <= 25) classification = "Extreme Fear";
  else if (value <= 45) classification = "Fear";
  else if (value <= 55) classification = "Neutral";
  else if (value <= 75) classification = "Greed";
  else classification = "Extreme Greed";
  
  return { value, classification };
}

export function FearGreedWidget() {
  const { data, isLoading } = useQuery<FearGreedData>({
    queryKey: ["fear-greed-index"],
    queryFn: async () => {
      try {
        // Fetch from CoinMarketCap API via our proxy
        const response = await fetch("/api/coinmarketcap/fear-and-greed");
        
        // Check if response is an error
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          // If CoinMarketCap endpoint is not available (returns HTML), fallback to alternative.me
          if (errorData.error && errorData.error.includes("HTML error page")) {
            console.warn("[FearGreedWidget] CoinMarketCap endpoint unavailable, falling back to alternative.me");
            return await fetchFromAlternativeMe();
          }
          throw new Error(errorData.error || `Failed to fetch Fear & Greed Index: ${response.statusText}`);
        }
        
        const json = await response.json();
        
        // Check for API errors in response
        if (json.error) {
          throw new Error(json.error || `API error: ${JSON.stringify(json.status || {})}`);
        }
        
        // CoinMarketCap v3 Fear & Greed Index response structure:
        // Check the actual structure from the API response
        console.log("[FearGreedWidget] Full response:", JSON.stringify(json, null, 2));
        
        // Check if status indicates an error (even if HTTP status is 200)
        if (json.status?.error_code && json.status.error_code !== 0) {
          throw new Error(json.status.error_message || `CoinMarketCap API error: ${json.status.error_code}`);
        }
        
        // Try different possible response structures
        let fearGreedData = null;
        let value = 0;
        let classification = "Neutral";
        
        // Structure 1: data is an array
        if (json.data && Array.isArray(json.data) && json.data.length > 0) {
          fearGreedData = json.data[0];
        } 
        // Structure 2: data is a direct object
        else if (json.data && typeof json.data === 'object' && !Array.isArray(json.data)) {
          fearGreedData = json.data;
        }
        // Structure 3: response might have value directly
        else if (json.value !== undefined) {
          value = parseInt(json.value.toString());
          classification = json.value_classification || json.classification || "Neutral";
        }
        
        if (fearGreedData) {
          value = parseInt(fearGreedData.value?.toString() || "0");
          classification = fearGreedData.value_classification || fearGreedData.classification || "Neutral";
        }
        
        // If we still don't have a value, try to derive classification from value ranges
        if (value === 0 && fearGreedData) {
          // Try alternative field names
          const possibleValue = fearGreedData.fng_value || fearGreedData.fng || fearGreedData.index;
          if (possibleValue !== undefined) {
            value = parseInt(possibleValue.toString());
          }
        }
        
        if (value === 0) {
          console.error("[FearGreedWidget] Could not extract value from response:", json);
          throw new Error("Could not extract Fear & Greed value from API response");
        }
        
        // Derive classification if not provided
        if (!classification || classification === "Neutral") {
          if (value <= 25) classification = "Extreme Fear";
          else if (value <= 45) classification = "Fear";
          else if (value <= 55) classification = "Neutral";
          else if (value <= 75) classification = "Greed";
          else classification = "Extreme Greed";
        }
        
        return { value, classification };
      } catch (error) {
        console.error("Error fetching Fear & Greed Index:", error);
        // Return mock data as fallback
        return { value: 36, classification: "Fear" };
      }
    },
    refetchInterval: 300000, // Refetch every 5 minutes
  });

  if (isLoading) {
    return (
      <Card className="p-3 bg-card/50 backdrop-blur-sm border-border/50">
        <h3 className="text-sm font-semibold mb-2 text-foreground">Fear & Greed Index</h3>
        <div className="flex items-center justify-center h-24">
          <div className="w-16 h-16 bg-muted animate-pulse rounded-full" />
        </div>
      </Card>
    );
  }

  const value = data?.value || 36;
  const classification = data?.classification || "Fear";
  
  // Calculate angle for gauge (0-180 degrees, where 0 = extreme fear, 180 = extreme greed)
  const angle = (value / 100) * 180;
  
  // Color based on value
  const getColor = () => {
    if (value <= 25) return "from-red-500 to-red-600";
    if (value <= 45) return "from-orange-500 to-orange-600";
    if (value <= 55) return "from-yellow-500 to-yellow-600";
    if (value <= 75) return "from-green-500 to-green-600";
    return "from-emerald-500 to-emerald-600";
  };

  return (
    <Card className="p-3 bg-card/50 backdrop-blur-sm border-border/50">
      <h3 className="text-sm font-semibold mb-2 text-foreground">Fear & Greed Index</h3>
      <div className="flex flex-col items-center justify-center">
        {/* Gauge */}
        <div className="relative w-32 h-20 mb-2">
          {/* Background arc */}
          <svg className="w-full h-full" viewBox="0 0 200 100">
            {/* Background gradient arc */}
            <defs>
              <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#ef4444" />
                <stop offset="25%" stopColor="#f97316" />
                <stop offset="50%" stopColor="#eab308" />
                <stop offset="75%" stopColor="#22c55e" />
                <stop offset="100%" stopColor="#10b981" />
              </linearGradient>
            </defs>
            {/* Arc path */}
            <path
              d="M 20 80 A 80 80 0 0 1 180 80"
              fill="none"
              stroke="url(#gaugeGradient)"
              strokeWidth="10"
              strokeLinecap="round"
            />
            {/* Needle */}
            <g transform={`rotate(${angle - 90} 100 80)`}>
              <line
                x1="100"
                y1="80"
                x2="100"
                y2="20"
                stroke="white"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              <circle cx="100" cy="80" r="5" fill="white" />
            </g>
          </svg>
        </div>
        
        {/* Value and classification */}
        <div className="text-center">
          <div className="text-2xl font-bold text-foreground mb-0.5">{value}</div>
          <div className="text-[10px] font-medium text-muted-foreground">{classification}</div>
        </div>
      </div>
    </Card>
  );
}
