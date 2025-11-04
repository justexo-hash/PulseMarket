import { useState, useEffect } from "react";
import { Link } from "wouter";
import { type Market } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, CheckCircle2, Clock } from "lucide-react";

interface MarketCardProps {
  market: Market;
}

function CountdownTimer({ expiresAt }: { expiresAt: Date | string | null }) {
  const [timeRemaining, setTimeRemaining] = useState<string>("");

  useEffect(() => {
    if (!expiresAt) {
      setTimeRemaining("");
      return;
    }

    const updateTimer = () => {
      const now = new Date().getTime();
      const expiration = new Date(expiresAt).getTime();
      const diff = expiration - now;

      if (diff <= 0) {
        setTimeRemaining("Expired");
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      if (days > 0) {
        setTimeRemaining(`${days}d ${hours}h`);
      } else if (hours > 0) {
        setTimeRemaining(`${hours}h ${minutes}m`);
      } else if (minutes > 0) {
        setTimeRemaining(`${minutes}m ${seconds}s`);
      } else {
        setTimeRemaining(`${seconds}s`);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [expiresAt]);

  if (!expiresAt || !timeRemaining) return null;

  const isUrgent = new Date(expiresAt).getTime() - Date.now() < 24 * 60 * 60 * 1000; // Less than 24 hours

  return (
    <Badge
      variant="outline"
      className={`text-xs flex items-center gap-1 ${
        isUrgent 
          ? "bg-destructive/20 text-destructive border-destructive/30" 
          : "bg-primary/20 text-primary border-primary/30"
      }`}
    >
      <Clock className="h-3 w-3" />
      {timeRemaining}
    </Badge>
  );
}

export function MarketCard({ market }: MarketCardProps) {
  const isResolved = market.status === "resolved";
  const resolvedOutcome = market.resolvedOutcome;
  const volume = parseFloat(market.yesPool || "0") + parseFloat(market.noPool || "0");
  
  // Recalculate probability from pools (client-side fallback to ensure accuracy)
  const yesPool = parseFloat(market.yesPool || "0");
  const noPool = parseFloat(market.noPool || "0");
  const totalPool = yesPool + noPool;
  const calculatedProbability = totalPool > 0
    ? Math.max(0, Math.min(100, Math.round((yesPool / totalPool) * 100)))
    : 50;
  
  // Use calculated probability (ignore stored value which may be stale)
  const displayProbability = isResolved ? market.probability : calculatedProbability;

  // Use slug for public markets, invite code for private wagers
  const marketPath = market.isPrivate === 1 && market.inviteCode 
    ? `/wager/${market.inviteCode}` 
    : `/market/${market.slug || market.id}`;
  
  return (
    <Link href={marketPath} data-testid={`card-market-${market.id}`}>
      <div className={`group bg-card border border-card-border rounded-lg p-6 shadow-lg hover-elevate active-elevate-2 transition-all duration-200 cursor-pointer h-full flex flex-col ${isResolved ? "opacity-75" : ""}`}>
        <div className="flex items-start justify-between gap-2 mb-4">
          <div className="flex flex-wrap gap-2">
            <Badge
              variant="secondary"
              className="bg-primary/20 text-primary border-primary/30 uppercase text-xs font-semibold tracking-wide"
              data-testid={`badge-category-${market.id}`}
            >
              {market.category}
            </Badge>
            {isResolved && (
              <Badge
                variant={resolvedOutcome === "yes" ? "default" : "destructive"}
                className={`uppercase text-xs font-bold flex items-center gap-1 ${
                  resolvedOutcome === "yes" ? "bg-green-600 text-white border-green-500" : ""
                }`}
                data-testid={`badge-resolved-${market.id}`}
              >
                <CheckCircle2 className="h-3 w-3" />
                {resolvedOutcome}
              </Badge>
            )}
            {!isResolved && market.expiresAt && (
              <CountdownTimer expiresAt={market.expiresAt} />
            )}
          </div>
          {!isResolved && displayProbability > 50 && (
            <TrendingUp className="h-4 w-4 text-green-500" />
          )}
        </div>

        <div className="flex gap-4 flex-grow items-center">
          {/* Left side: Question, Volume, Probability */}
          <div className="flex-1 min-w-0 flex flex-col">
            <h3 className="text-xl font-semibold text-foreground mb-2 line-clamp-2" data-testid={`text-question-${market.id}`}>
              {market.question}
            </h3>
            <div className="flex items-center text-xs text-muted-foreground mb-4">
              <span>Volume: {volume.toFixed(2)} SOL</span>
            </div>
            
            <div className="mt-auto space-y-3">
              <div className="flex items-end justify-between mb-3">
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-1">
                    {isResolved ? "Final Result" : "Probability"}
                  </span>
                  <span 
                    className={`text-4xl font-bold ${
                      isResolved 
                        ? (resolvedOutcome === "yes" ? "text-green-500" : "text-destructive")
                        : "text-green-500"
                    }`}
                    data-testid={`text-probability-${market.id}`}
                  >
                    {displayProbability}%
                  </span>
                </div>
              </div>

              <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    isResolved
                      ? (resolvedOutcome === "yes" ? "bg-green-500" : "bg-destructive")
                      : "bg-green-500"
                  }`}
                  style={{ width: `${displayProbability}%` }}
                />
              </div>
            </div>
          </div>
          
          {/* Right side: Image */}
          {market.image && (
            <div className="flex-shrink-0 w-1/2 max-w-[200px] flex items-center justify-center">
              <div className="w-full rounded-lg overflow-hidden border border-card-border">
                <img
                  src={market.image}
                  alt={market.question}
                  className="w-full h-auto object-cover"
                  onError={(e) => {
                    // Hide image if it fails to load
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
