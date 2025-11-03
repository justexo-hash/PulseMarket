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
  const volume = parseFloat(market.yesPool) + parseFloat(market.noPool);

  return (
    <Link href={`/market/${market.id}`} data-testid={`card-market-${market.id}`}>
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
                className="uppercase text-xs font-bold flex items-center gap-1"
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
          {!isResolved && market.probability > 50 && (
            <TrendingUp className="h-4 w-4 text-primary" />
          )}
        </div>

        <h3 className="text-xl font-semibold text-foreground mb-4 line-clamp-3 flex-grow" data-testid={`text-question-${market.id}`}>
          {market.question}
        </h3>

        <div className="mt-auto space-y-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Volume: {volume.toFixed(2)} SOL</span>
          </div>
          <div className="flex items-end justify-between mb-3">
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-1">
                {isResolved ? "Final Result" : "Probability"}
              </span>
              <span 
                className={`text-4xl font-bold ${
                  isResolved 
                    ? (resolvedOutcome === "yes" ? "text-primary" : "text-destructive")
                    : "text-primary"
                }`}
                data-testid={`text-probability-${market.id}`}
              >
                {market.probability}%
              </span>
            </div>
          </div>

          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                isResolved
                  ? (resolvedOutcome === "yes" ? "bg-primary" : "bg-destructive")
                  : "bg-primary"
              }`}
              style={{ width: `${market.probability}%` }}
            />
          </div>
        </div>
      </div>
    </Link>
  );
}
