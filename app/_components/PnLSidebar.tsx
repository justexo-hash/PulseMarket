"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { type Bet, type Market } from "@shared/schema";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X, TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import { format } from "date-fns";

interface PnLSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

interface BetWithMarket extends Bet {
  market: Market;
}

export function PnLSidebar({ isOpen, onClose }: PnLSidebarProps) {
  const { user } = useAuth();

  const { data: bets } = useQuery<Bet[]>({
    queryKey: ["/api/bets"],
    enabled: !!user && isOpen,
    refetchInterval: 5000,
  });

  const { data: markets } = useQuery<Market[]>({
    queryKey: ["/api/markets"],
    enabled: !!user && isOpen,
    refetchInterval: 5000,
  });

  if (!isOpen) return null;

  const activeBetsWithMarkets: BetWithMarket[] = (bets || [])
    .map((bet) => {
      const market = markets?.find((m) => m.id === bet.marketId);
      if (!market || market.status !== "active") {
        return null;
      }
      return {
        ...bet,
        market,
      };
    })
    .filter((bet): bet is BetWithMarket => bet !== null);

  const totalUnrealizedPnL = activeBetsWithMarkets.reduce((sum, bet) => {
    const market = bet.market!;
    const currentYesPool = parseFloat(market.yesPool || "0");
    const currentNoPool = parseFloat(market.noPool || "0");
    const totalPool = currentYesPool + currentNoPool;

    const betAmount = parseFloat(bet.amount);

    if (bet.position === "yes") {
      const currentValue =
        totalPool > 0 && currentYesPool > 0
          ? (betAmount / currentYesPool) * totalPool
          : betAmount;
      return sum + (currentValue - betAmount);
    } else {
      const currentValue =
        totalPool > 0 && currentNoPool > 0
          ? (betAmount / currentNoPool) * totalPool
          : betAmount;
      return sum + (currentValue - betAmount);
    }
  }, 0);

  const totalPotentialProfit = activeBetsWithMarkets.reduce((sum, bet) => {
    const market = bet.market!;
    const yesPool = parseFloat(market.yesPool || "0");
    const noPool = parseFloat(market.noPool || "0");
    const totalPool = yesPool + noPool;

    if (totalPool === 0) return sum;

    const betAmount = parseFloat(bet.amount);

    if (bet.position === "yes") {
      const profit = yesPool > 0 ? (betAmount / yesPool) * totalPool - betAmount : 0;
      return sum + profit;
    } else {
      const profit = noPool > 0 ? (betAmount / noPool) * totalPool - betAmount : 0;
      return sum + profit;
    }
  }, 0);

  return (
    <>
      {isOpen && <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />}

      <div
        className={`fixed right-0 top-0 h-full w-96 bg-card border-l border-border shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
        style={{ height: "100vh" }}
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-4 border-b border-border">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-secondary-foreground" />
              <h2 className="text-xl font-bold text-secondary-foreground ">Active Bets P&L</h2>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="p-4 border-b border-border bg-secondary/30">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Unrealized P&L</span>
                <span
                  className={`text-lg font-bold ${
                    totalUnrealizedPnL >= 0 ? "text-secondary-foreground" : "text-destructive"
                  }`}
                >
                  {totalUnrealizedPnL >= 0 ? "+" : ""}
                  {totalUnrealizedPnL.toFixed(4)} SOL
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Potential Profit</span>
                <span className="text-lg font-bold text-secondary-foreground">
                  +{totalPotentialProfit.toFixed(4)} SOL
                </span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-border">
                <span className="text-sm font-medium text-secondary-foreground ">Total Active Bets</span>
                <span className="text-lg font-bold text-secondary-foreground ">
                  {activeBetsWithMarkets.length}
                </span>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {activeBetsWithMarkets.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p>No active bets</p>
                <p className="text-sm mt-2">Place a bet to track your P&L here</p>
              </div>
            ) : (
              activeBetsWithMarkets.map((bet) => {
                const market = bet.market!;
                const currentYesPool = parseFloat(market.yesPool || "0");
                const currentNoPool = parseFloat(market.noPool || "0");
                const totalPool = currentYesPool + currentNoPool;
                const currentProb =
                  totalPool > 0 ? Math.round((currentYesPool / totalPool) * 100) : 50;

                const betAmount = parseFloat(bet.amount);
                const betProb = bet.probability;

                let currentValue: number;
                if (bet.position === "yes") {
                  currentValue =
                    totalPool > 0 && currentYesPool > 0
                      ? (betAmount / currentYesPool) * totalPool
                      : betAmount;
                } else {
                  currentValue =
                    totalPool > 0 && currentNoPool > 0
                      ? (betAmount / currentNoPool) * totalPool
                      : betAmount;
                }

                const unrealizedPnL = currentValue - betAmount;
                const pnlPercent =
                  betAmount > 0 ? (unrealizedPnL / betAmount) * 100 : 0;

                let potentialProfit = 0;
                if (bet.position === "yes" && currentYesPool > 0) {
                  potentialProfit = (betAmount / currentYesPool) * totalPool - betAmount;
                } else if (bet.position === "no" && currentNoPool > 0) {
                  potentialProfit = (betAmount / currentNoPool) * totalPool - betAmount;
                }

                const marketPath =
                  market.isPrivate === 1 && market.inviteCode
                    ? `/wager/${market.inviteCode}`
                    : `/markets/${market.slug || market.id}`;

                return (
                  <Link key={bet.id} href={marketPath}>
                    <Card className="p-4 hover:bg-secondary/50 transition-colors cursor-pointer">
                      <div className="space-y-3">
                        <p className="text-sm font-semibold text-secondary-foreground  line-clamp-2">
                          {market.question}
                        </p>

                        <div className="flex items-center justify-between">
                          <Badge
                            variant={bet.position === "yes" ? "default" : "destructive"}
                            className="uppercase text-xs"
                          >
                            {bet.position}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(bet.createdAt), "MMM d, HH:mm")}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Bet Amount:</span>
                          <span className="font-medium">{betAmount.toFixed(4)} SOL</span>
                        </div>

                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Entry Odds:</span>
                          <span className="font-medium">
                            {bet.position === "yes" ? betProb : 100 - betProb}%
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Current Odds:</span>
                          <span className="font-medium">
                            {bet.position === "yes" ? currentProb : 100 - currentProb}%
                          </span>
                        </div>

                        <div className="pt-2 border-t border-border">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm text-muted-foreground">
                              Unrealized P&L:
                            </span>
                            <div className="flex items-center gap-1">
                              {unrealizedPnL >= 0 ? (
                                <TrendingUp className="h-3 w-3 text-secondary-foreground" />
                              ) : (
                                <TrendingDown className="h-3 w-3 text-destructive" />
                              )}
                              <span
                                className={`text-sm font-bold ${
                                  unrealizedPnL >= 0
                                    ? "text-secondary-foreground"
                                    : "text-destructive"
                                }`}
                              >
                                {unrealizedPnL >= 0 ? "+" : ""}
                                {unrealizedPnL.toFixed(4)} SOL
                              </span>
                              <span
                                className={`text-xs ${
                                  unrealizedPnL >= 0
                                    ? "text-secondary-foreground"
                                    : "text-destructive"
                                }`}
                              >
                                ({pnlPercent >= 0 ? "+" : ""}
                                {pnlPercent.toFixed(2)}%)
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">If Won:</span>
                            <span className="text-xs font-medium text-secondary-foreground">
                              +{potentialProfit.toFixed(4)} SOL
                            </span>
                          </div>
                        </div>
                      </div>
                    </Card>
                  </Link>
                );
              })
            )}
          </div>
        </div>
      </div>
    </>
  );
}
