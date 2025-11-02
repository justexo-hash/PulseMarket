import { Link } from "wouter";
import { type Market } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, CheckCircle2 } from "lucide-react";

interface MarketCardProps {
  market: Market;
}

export function MarketCard({ market }: MarketCardProps) {
  const isResolved = market.status === "resolved";
  const resolvedOutcome = market.resolvedOutcome;

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
          </div>
          {!isResolved && market.probability > 50 && (
            <TrendingUp className="h-4 w-4 text-primary" />
          )}
        </div>

        <h3 className="text-xl font-semibold text-foreground mb-4 line-clamp-3 flex-grow" data-testid={`text-question-${market.id}`}>
          {market.question}
        </h3>

        <div className="mt-auto">
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
