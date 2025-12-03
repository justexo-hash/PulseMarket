"use client";

import { useQuery } from "@tanstack/react-query";
import { type Market, type Bet, type Transaction } from "@shared/schema";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Target,
  Plus,
  Minus,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ExternalLink,
  Shield,
  Wallet,
} from "lucide-react";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { extractTxSignature, getSolscanUrl, truncateSignature } from "@/lib/transparency";
import { useWallet } from "@solana/wallet-adapter-react";
import Link from "next/link";

export default function PortfolioPage() {
  const router = useRouter();
  const { user } = useAuth();
  const wallet = useWallet();
  const hasPortfolioAccess = Boolean(user && wallet.connected && wallet.publicKey);
  
  const { data: markets = [] } = useQuery<Market[]>({
    queryKey: ["/api/markets"],
  });

  const { data: bets = [] } = useQuery<Bet[]>({
    queryKey: ["/api/bets"],
    enabled: hasPortfolioAccess,
  });

  const { data: transactions = [] } = useQuery<Transaction[]>({
    queryKey: ["/api/transactions"],
    enabled: hasPortfolioAccess,
  });

  // Get user's current portfolio balance (from database)
  const { data: balanceData } = useQuery<{ balance: string }>({
    queryKey: ["/api/wallet/balance"],
    enabled: hasPortfolioAccess,
    retry: false,
    refetchInterval: 3000, // Refetch every 3 seconds to catch updates
    refetchOnWindowFocus: true, // Refetch when user returns to tab
    refetchOnMount: true, // Always refetch when component mounts
  });

  const currentBalance = hasPortfolioAccess
    ? parseFloat(balanceData?.balance || "0")
    : 0;

  // Calculate portfolio metrics
  const totalBet = bets.reduce((sum, bet) => sum + parseFloat(bet.amount), 0);
  
  // Calculate current portfolio value (sum of all bets on resolved markets where user won)
  const portfolioValue = bets.reduce((total, bet) => {
    const market = markets.find(m => m.id === bet.marketId);
    if (!market || market.status !== "resolved") return total;
    
    // If bet position matches resolved outcome, calculate payout
    if (bet.position === market.resolvedOutcome) {
      const yesPool = parseFloat(market.yesPool || "0");
      const noPool = parseFloat(market.noPool || "0");
      const totalPool = yesPool + noPool;
      
      if (totalPool === 0) return total;
      
      // Get all bets on winning side to calculate share
      const winnerBets = bets.filter(b => 
        b.marketId === market.id && b.position === market.resolvedOutcome
      );
      const totalWinnerBets = winnerBets.reduce((sum, b) => sum + parseFloat(b.amount), 0);
      
      if (totalWinnerBets === 0) return total;
      
      const betAmount = parseFloat(bet.amount);
      const payout = (betAmount / totalWinnerBets) * totalPool;
      return total + payout;
    }
    
    return total;
  }, 0);

  const profitLoss = portfolioValue - totalBet;
  const profitLossPercent = totalBet > 0 ? ((profitLoss / totalBet) * 100) : 0;

  const deposits = transactions.filter(t => t.type === "deposit");
  const payouts = transactions.filter(t => t.type === "payout");
  const totalDeposits = deposits.reduce((sum, t) => sum + Math.abs(parseFloat(t.amount)), 0);
  const totalPayouts = payouts.reduce((sum, t) => sum + parseFloat(t.amount), 0);

  if (!hasPortfolioAccess) {
    return (
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-2xl mx-auto text-center py-24 space-y-6">
          <h1 className="text-4xl font-bold text-secondary-foreground ">Portfolio Restricted</h1>
          <p className="text-muted-foreground text-lg">
            Your betting history and balances are only available after you log in and connect your Solana wallet.
          </p>
          <p className="text-muted-foreground">
            Use the wallet button in the header to connect, or{" "}
            <Link href="/deposit" className="text-secondary-foreground underline">
              head to the deposit page
            </Link>{" "}
            once you&apos;re authenticated.
          </p>
          <Button onClick={() => router.push("/")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Markets
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto pt-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-secondary-foreground  mb-2">My Portfolio</h1>
          <p className="text-muted-foreground text-lg">
            Track your betting history and portfolio performance
          </p>
        </div>
        <div className="flex gap-3">
          <Button onClick={() => router.push("/withdraw")} variant="destructive" data-testid="button-withdraw">
            <Minus className="mr-2 h-4 w-4" />
            Withdraw
          </Button>
          <Button onClick={() => router.push("/deposit")} data-testid="button-deposit">
            <Plus className="mr-2 h-4 w-4" />
            Deposit
          </Button>
        </div>
      </div>

      {/* Portfolio Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-muted-foreground font-medium">Total Bets</p>
            <Target className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="text-3xl font-bold text-secondary-foreground " data-testid="text-total-bets">
            {bets.length}
          </p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-muted-foreground font-medium">Amount Invested</p>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="text-3xl font-bold text-secondary-foreground " data-testid="text-amount-invested">
            {totalBet.toFixed(4)} SOL
          </p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-muted-foreground font-medium">Current Balance</p>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="text-3xl font-bold text-secondary-foreground" data-testid="text-current-balance">
            {currentBalance.toFixed(4)} SOL
          </p>
          <p className="text-xs text-muted-foreground mt-1">Available for betting</p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-muted-foreground font-medium">Profit/Loss</p>
            {profitLoss >= 0 ? (
              <TrendingUp className="h-4 w-4 text-secondary-foreground" />
            ) : (
              <TrendingDown className="h-4 w-4 text-destructive" />
            )}
          </div>
          <div>
            <p
              className={`text-3xl font-bold ${
                profitLoss >= 0 ? "text-secondary-foreground" : "text-destructive"
              }`}
              data-testid="text-profit-loss"
            >
              {profitLoss >= 0 ? "+" : "-"}{Math.abs(profitLoss).toFixed(4)} SOL
            </p>
            <p
              className={`text-sm ${
                profitLoss >= 0 ? "text-secondary-foreground" : "text-destructive"
              }`}
              data-testid="text-profit-loss-percent"
            >
              {profitLoss >= 0 ? "+" : "-"}{Math.abs(profitLossPercent).toFixed(2)}%
            </p>
          </div>
        </Card>
      </div>

      {/* Tabs for Bets and Transactions */}
      <Tabs defaultValue="bets" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="bets">My Bets</TabsTrigger>
          <TabsTrigger value="transactions">Transaction History</TabsTrigger>
        </TabsList>

        <TabsContent value="bets">
          <div>
            <h2 className="text-2xl font-bold text-secondary-foreground  mb-6">Betting History</h2>
            
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
                {bets.map((bet) => {
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
                              {format(new Date(bet.createdAt), "MMM d, yyyy 'at' h:mm a")}
                            </p>
                          </div>
                          <p className="text-lg font-semibold text-secondary-foreground  mb-1" data-testid={`text-question-${bet.id}`}>
                            {market?.question || `Market #${bet.marketId}`}
                          </p>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span>Amount: {parseFloat(bet.amount).toFixed(4)} SOL</span>
                            <span>Probability: {bet.position === "yes" ? bet.probability : 100 - bet.probability}%</span>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground mb-1">Current Value</p>
                          <p
                            className={`text-xl font-bold ${
                              valueChange >= 0 ? "text-secondary-foreground" : "text-destructive"
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
        </TabsContent>

        <TabsContent value="transactions">
          <div>
            <h2 className="text-2xl font-bold text-secondary-foreground  mb-6">Transaction History</h2>
            
            {transactions.length === 0 ? (
              <Card className="p-12">
                <div className="text-center">
                  <p className="text-xl text-muted-foreground mb-2">No transactions yet</p>
                  <p className="text-muted-foreground">
                    Your deposits, bets, and payouts will appear here
                  </p>
                </div>
              </Card>
            ) : (
              <div className="space-y-4">
                {transactions.map((transaction) => {
                  // Transaction amounts are stored as strings, bet amounts are negative
                  const amountStr = transaction.amount.replace(/^-/, ""); // Remove negative sign if present
                  const amount = parseFloat(amountStr);
                  const isPositive = transaction.type === "deposit" || transaction.type === "payout" || transaction.type === "refund";
                  
                  return (
                    <Card key={transaction.id} className="p-6" data-testid={`card-transaction-${transaction.id}`}>
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            {transaction.type === "deposit" && <ArrowUp className="h-4 w-4 text-secondary-foreground" />}
                            {transaction.type === "bet" && <ArrowDown className="h-4 w-4 text-destructive" />}
                            {transaction.type === "payout" && <ArrowUp className="h-4 w-4 text-secondary-foreground" />}
                            {transaction.type === "refund" && <ArrowUp className="h-4 w-4 text-muted-foreground" />}
                            <Badge
                              variant={
                                transaction.type === "deposit" || transaction.type === "payout" 
                                  ? "default" 
                                  : transaction.type === "bet" 
                                  ? "destructive" 
                                  : "secondary"
                              }
                              className="uppercase text-xs font-bold"
                            >
                              {transaction.type}
                            </Badge>
                            <p className="text-sm text-muted-foreground">
                              {format(new Date(transaction.createdAt), "MMM d, yyyy 'at' h:mm a")}
                            </p>
                          </div>
                          <p className="text-lg font-semibold text-secondary-foreground  mb-1">
                            {transaction.description || `${transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)} transaction`}
                          </p>
                          
                          {/* Show transaction signature if available */}
                          {(() => {
                            const txSig = extractTxSignature(transaction.description, transaction.txSignature);
                            if (txSig) {
                              return (
                                <div className="mt-2 flex items-center gap-2">
                                  <Shield className="h-3 w-3 text-muted-foreground" />
                                  <a
                                    href={getSolscanUrl(txSig)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs font-mono text-secondary-foreground hover:underline inline-flex items-center gap-1"
                                  >
                                    {truncateSignature(txSig)}
                                    <ExternalLink className="h-3 w-3" />
                                  </a>
                                  <span className="text-xs text-muted-foreground">Verified on-chain</span>
                                </div>
                              );
                            }
                            return null;
                          })()}
                        </div>
                        
                        <div className="text-right">
                          <p
                            className={`text-xl font-bold ${
                              isPositive ? "text-secondary-foreground" : "text-destructive"
                            }`}
                            data-testid={`text-transaction-amount-${transaction.id}`}
                          >
                            {isPositive ? "+" : ""}{Math.abs(amount).toFixed(4)} SOL
                          </p>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
