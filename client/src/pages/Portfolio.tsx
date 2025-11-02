import { useQuery } from "@tanstack/react-query";
import { type Market } from "@shared/schema";
import { getBets, getTotalBetAmount, getPortfolioValue } from "@/lib/bets";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, DollarSign, Target } from "lucide-react";
import { format } from "date-fns";

export function Portfolio() {
  const { data: markets = [] } = useQuery<Market[]>({
    queryKey: ["/api/markets"],
  });

  const bets = getBets();
  const totalBet = getTotalBetAmount();
  const portfolioValue = getPortfolioValue(markets);
  const profitLoss = portfolioValue - totalBet;
  const profitLossPercent = totalBet > 0 ? ((profitLoss / totalBet) * 100) : 0;

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-foreground mb-2">My Portfolio</h1>
        <p className="text-muted-foreground text-lg">
          Track your betting history and portfolio performance
        </p>
      </div>

      {/* Portfolio Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-muted-foreground font-medium">Total Bets</p>
            <Target className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="text-3xl font-bold text-foreground" data-testid="text-total-bets">
            {bets.length}
          </p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-muted-foreground font-medium">Amount Invested</p>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="text-3xl font-bold text-foreground" data-testid="text-amount-invested">
            ${totalBet.toFixed(2)}
          </p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-muted-foreground font-medium">Portfolio Value</p>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="text-3xl font-bold text-foreground" data-testid="text-portfolio-value">
            ${portfolioValue.toFixed(2)}
          </p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-muted-foreground font-medium">Profit/Loss</p>
            {profitLoss >= 0 ? (
              <TrendingUp className="h-4 w-4 text-primary" />
            ) : (
              <TrendingDown className="h-4 w-4 text-destructive" />
            )}
          </div>
          <div>
            <p
              className={`text-3xl font-bold ${
                profitLoss >= 0 ? "text-primary" : "text-destructive"
              }`}
              data-testid="text-profit-loss"
            >
              ${Math.abs(profitLoss).toFixed(2)}
            </p>
            <p
              className={`text-sm ${
                profitLoss >= 0 ? "text-primary" : "text-destructive"
              }`}
              data-testid="text-profit-loss-percent"
            >
              {profitLoss >= 0 ? "+" : "-"}{Math.abs(profitLossPercent).toFixed(2)}%
            </p>
          </div>
        </Card>
      </div>

      {/* Betting History */}
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-6">Betting History</h2>
        
        {bets.length === 0 ? (
          <Card className="p-12">
            <div className="text-center">
              <p className="text-xl text-muted-foreground mb-2">No bets placed yet</p>
              <p className="text-muted-foreground">
                Start by placing a bet on any active market
              </p>
            </div>
          </Card>
        ) : (
          <div className="space-y-4">
            {bets.slice().reverse().map((bet) => {
              const market = markets.find(m => m.id === bet.marketId);
              const currentProb = market?.probability || bet.probability;
              const valueChange = bet.position === "yes"
                ? ((currentProb - bet.probability) / bet.probability) * 100
                : (((100 - currentProb) - (100 - bet.probability)) / (100 - bet.probability)) * 100;

              return (
                <Card key={bet.id} className="p-6" data-testid={`card-bet-${bet.id}`}>
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge
                          variant={bet.position === "yes" ? "default" : "destructive"}
                          className="uppercase text-xs font-bold"
                          data-testid={`badge-position-${bet.id}`}
                        >
                          {bet.position}
                        </Badge>
                        <p className="text-sm text-muted-foreground">
                          {format(bet.timestamp, "MMM d, yyyy 'at' h:mm a")}
                        </p>
                      </div>
                      <p className="text-lg font-semibold text-foreground mb-1" data-testid={`text-question-${bet.id}`}>
                        {bet.marketQuestion}
                      </p>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>Amount: ${bet.amount.toFixed(2)}</span>
                        <span>Probability: {bet.position === "yes" ? bet.probability : 100 - bet.probability}%</span>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground mb-1">Current Value</p>
                      <p
                        className={`text-xl font-bold ${
                          valueChange >= 0 ? "text-primary" : "text-destructive"
                        }`}
                        data-testid={`text-value-change-${bet.id}`}
                      >
                        {valueChange >= 0 ? "+" : ""}{valueChange.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
