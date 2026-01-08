"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { type Market, type Bet, type Transaction } from "@shared/schema";
import {
  TrendingUp, TrendingDown, DollarSign, Target, Plus, Minus, ArrowUp, ArrowDown,
  ArrowLeft, ExternalLink, Shield, Wallet,
} from "lucide-react";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useWallet } from "@solana/wallet-adapter-react";

// Components & Utils imports
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/lib/auth";
import { extractTxSignature, getSolscanUrl, truncateSignature } from "@/lib/transparency";

// =========================================================================
// 🎣 Custom Hooks for Data Fetching & Calculation
// (Comments kept in standard block format as they are function/hook descriptions)
// =========================================================================

/**
 * Hook for core portfolio data fetching.
 * Fetches markets, bets, transactions, and the current on-chain balance.
 * Determines the portfolio access status based on authentication and wallet connection.
 */
const usePortfolioData = () => {
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
    refetchInterval: 3000, 
    refetchOnWindowFocus: true, 
    refetchOnMount: true, 
  });

  const currentBalance = hasPortfolioAccess
    ? parseFloat(balanceData?.balance || "0")
    : 0;

  return { hasPortfolioAccess, markets, bets, transactions, currentBalance };
};

/**
 * Hook to calculate portfolio performance metrics using useMemo.
 * This separates the expensive calculation logic from the rendering component.
 * @returns Calculated metrics (totalBet, profitLoss, etc.).
 */
const usePortfolioMetrics = (markets: Market[], bets: Bet[], transactions: Transaction[]) => {
  return useMemo(() => {
    const totalBet = bets.reduce((sum, bet) => sum + parseFloat(bet.amount), 0);
    
    // Function to calculate the potential payout amount for a winning bet
    const calculatePayout = (bet: Bet, market: Market) => {
        const yesPool = parseFloat(market.yesPool || "0");
        const noPool = parseFloat(market.noPool || "0");
        const totalPool = yesPool + noPool;
        
        if (totalPool === 0) return 0;
        
        // Find all bets on the winning side to determine the share
        const winnerBets = bets.filter(
            b => b.marketId === market.id && b.position === market.resolvedOutcome
        );
        const totalWinnerBets = winnerBets.reduce((sum, b) => sum + parseFloat(b.amount), 0);
        
        if (totalWinnerBets === 0) return 0;
        
        const betAmount = parseFloat(bet.amount);
        // Payout = (Bettor's Stake / Total Winning Stakes) * Total Pool
        return (betAmount / totalWinnerBets) * totalPool;
    };

    // Calculate current portfolio value (sum of payouts on resolved markets where user won)
    const portfolioValue = bets.reduce((total, bet) => {
      const market = markets.find(m => m.id === bet.marketId);
      
      // Only resolved and winning bets contribute to the 'portfolioValue'
      if (market && market.status === "resolved" && bet.position === market.resolvedOutcome) {
        return total + calculatePayout(bet, market);
      }
      return total;
    }, 0);

    const profitLoss = portfolioValue - totalBet;
    const profitLossPercent = totalBet > 0 ? ((profitLoss / totalBet) * 100) : 0;

    const deposits = transactions.filter(t => t.type === "deposit");
    const payouts = transactions.filter(t => t.type === "payout");
    const totalDeposits = deposits.reduce((sum, t) => sum + Math.abs(parseFloat(t.amount)), 0);
    const totalPayouts = payouts.reduce((sum, t) => sum + parseFloat(t.amount), 0);

    return {
      totalBet,
      portfolioValue,
      profitLoss,
      profitLossPercent,
      totalDeposits,
      totalPayouts,
    };
  }, [markets, bets, transactions]); 
};

// =========================================================================
// 🖼️ UI Components
// =========================================================================

/**
 * Displays a single portfolio summary card.
 */
interface SummaryCardProps {
    title: string;
    value: string;
    icon: React.ElementType;
    iconColor?: string;
    testId: string;
    subtitle?: string;
}

const SummaryCard: React.FC<SummaryCardProps> = ({ title, value, icon: Icon, iconColor = "text-muted-foreground", testId, subtitle }) => (
    <Card className="p-6">
        {/** Header section with title and icon */}
        <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-muted-foreground font-medium">{title}</p>
            <Icon className={`h-4 w-4 ${iconColor}`} />
        </div>
        {/** Main value of the card */}
        <p className="text-3xl font-bold text-secondary-foreground" data-testid={testId}>
            {value}
        </p>
        {/** Optional subtitle/context text */}
        {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
    </Card>
);

/**
 * Displays an individual bet item in the history list.
 */
const BetItem: React.FC<{ bet: Bet; market?: Market }> = ({ bet, market }) => {
    // Logic for calculating valueChange...
    const currentProb = market?.probability || bet.probability;
    const betProb = bet.position === "yes" ? bet.probability : 100 - bet.probability;
    const currentProbForPosition = bet.position === "yes" ? currentProb : 100 - currentProb;
    
    const valueChange = betProb > 0 
      ? ((currentProbForPosition - betProb) / betProb) * 100
      : 0; 

    const isPositiveChange = valueChange >= 0;

    return (
        <Card key={bet.id} className="p-6" data-testid={`card-bet-${bet.id}`}>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                {/** Left side: Bet details (Position, Date, Question, Amount, Probability) */}
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                        {/** Bet position badge (YES/NO) */}
                        <Badge
                            variant={bet.position === "yes" ? "default" : "destructive"}
                            className="uppercase text-xs font-bold"
                            data-testid={`badge-position-${bet.id}`}
                        >
                            {bet.position}
                        </Badge>
                        {/** Bet creation date */}
                        <p className="text-sm text-muted-foreground">
                            {format(new Date(bet.createdAt), "MMM d, yyyy 'at' h:mm a")}
                        </p>
                    </div>
                    {/** Market question/description */}
                    <p className="text-lg font-semibold text-secondary-foreground mb-1" data-testid={`text-question-${bet.id}`}>
                        {market?.question || `Market #${bet.marketId}`}
                    </p>
                    {/** Amount and recorded probability */}
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>Amount: {parseFloat(bet.amount).toFixed(4)} SOL</span>
                        <span>Probability: {betProb.toFixed(2)}%</span>
                    </div>
                </div>
                
                {/** Right side: Current value change */}
                <div className="text-right">
                    <p className="text-sm text-muted-foreground mb-1">Current Price Change</p>
                    <p
                        className={`text-xl font-bold ${isPositiveChange ? "text-secondary-foreground" : "text-destructive"}`}
                        data-testid={`text-value-change-${bet.id}`}
                    >
                        {isPositiveChange ? "+" : ""}{valueChange.toFixed(1)}%
                    </p>
                </div>
            </div>
        </Card>
    );
};

/**
 * Displays an individual transaction item in the history list.
 */
const TransactionItem: React.FC<{ transaction: Transaction }> = ({ transaction }) => {
    // Logic for determining type, icon, and color...
    const amount = parseFloat(transaction.amount.replace(/^-/, ""));
    const isPositive = ["deposit", "payout", "refund"].includes(transaction.type);
    
    let Icon = ArrowDown;
    let variant: "default" | "destructive" | "secondary" = "destructive";
    let iconColor = "text-destructive";

    if (transaction.type === "deposit" || transaction.type === "payout") {
        Icon = ArrowUp;
        variant = "default";
        iconColor = "text-secondary-foreground";
    } else if (transaction.type === "refund") {
        Icon = ArrowUp;
        variant = "secondary";
        iconColor = "text-muted-foreground";
    }

    const txSig = extractTxSignature(transaction.description, transaction.txSignature);

    return (
        <Card key={transaction.id} className="p-6" data-testid={`card-transaction-${transaction.id}`}>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                {/** Left side: Transaction details (Type, Date, Description, Signature) */}
                <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                        {/** Transaction type icon */}
                        <Icon className={`h-4 w-4 ${iconColor}`} />
                        {/** Transaction type badge */}
                        <Badge variant={variant} className="uppercase text-xs font-bold">
                            {transaction.type}
                        </Badge>
                        {/** Transaction creation date */}
                        <p className="text-sm text-muted-foreground">
                            {format(new Date(transaction.createdAt), "MMM d, yyyy 'at' h:mm a")}
                        </p>
                    </div>
                    {/** Transaction description */}
                    <p className="text-lg font-semibold text-secondary-foreground mb-1">
                        {transaction.description || `${transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)} transaction`}
                    </p>
                    
                    {/** Solana signature and external link (if available) */}
                    {txSig && (
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
                    )}
                </div>
                
                {/** Right side: Transaction amount */}
                <div className="text-right">
                    <p
                        className={`text-xl font-bold ${isPositive ? "text-secondary-foreground" : "text-destructive"}`}
                        data-testid={`text-transaction-amount-${transaction.id}`}
                    >
                        {isPositive ? "+" : ""}{Math.abs(amount).toFixed(4)} SOL
                    </p>
                </div>
            </div>
        </Card>
    );
};

/**
 * Component for displaying an empty state (no data).
 */
const EmptyStateCard: React.FC<{ title: string; description: string }> = ({ title, description }) => (
    <Card className="p-12">
        {/** Empty state text content */}
        <div className="text-center">
            <p className="text-xl text-muted-foreground mb-2">{title}</p>
            <p className="text-muted-foreground">{description}</p>
        </div>
    </Card>
);

// =========================================================================
// 🚀 Main Component PortfolioPage
// =========================================================================

export default function PortfolioPage() {
  const router = useRouter();
  // Data and access checks
  const { hasPortfolioAccess, markets, bets, transactions, currentBalance } = usePortfolioData();
  // Performance metrics (memoized)
  const metrics = usePortfolioMetrics(markets, bets, transactions);
  
  const { totalBet, profitLoss, profitLossPercent } = metrics;
  
  // Display restricted state if the user is not authenticated/connected
  if (!hasPortfolioAccess) {
    return (
      /** Portfolio Restricted View (No wallet connected) */
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-2xl mx-auto text-center py-24 space-y-6">
          <h1 className="text-4xl font-bold text-secondary-foreground">Portfolio Restricted</h1>
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

  const isProfit = profitLoss >= 0;

  return (
    <div className="max-w-7xl mx-auto pt-3 ">
        {/** Page Header */}
        <div className="mb-8 flex flex-col md:flex-row items-start md:items-center gap-6 justify-between">
            {/** Title and subtitle */}
            <div>
                <h1 className="text-4xl font-bold text-secondary-foreground mb-2">My Portfolio</h1>
                <p className="text-muted-foreground text-lg">
                    Track your betting history and portfolio performance
                </p>
            </div>
            {/** Action buttons (Withdraw/Deposit) */}
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

        {/** Portfolio Summary Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <SummaryCard
                title="Total Bets"
                value={`${bets.length}`}
                icon={Target}
                testId="text-total-bets"
            />
            <SummaryCard
                title="Amount Invested"
                value={`${totalBet.toFixed(4)} SOL`}
                icon={DollarSign}
                testId="text-amount-invested"
            />
            <SummaryCard
                title="Current Balance"
                value={`${currentBalance.toFixed(4)} SOL`}
                icon={Wallet}
                testId="text-current-balance"
                subtitle="Available for betting"
            />
            <SummaryCard
                title="Profit/Loss"
                value={`${isProfit ? "+" : "-"}${Math.abs(profitLoss).toFixed(4)} SOL`}
                icon={isProfit ? TrendingUp : TrendingDown}
                iconColor={isProfit ? "text-secondary-foreground" : "text-destructive"}
                testId="text-profit-loss"
                subtitle={`${isProfit ? "+" : "-"}${Math.abs(profitLossPercent).toFixed(2)}%`}
            />
        </div>

        {/** Tabs for Bets and Transactions History */}
        <Tabs defaultValue="bets" className="w-full">
            {/** Tabs list/navigation */}
            <TabsList className="mb-6">
                <TabsTrigger value="bets">My Bets ({bets.length})</TabsTrigger>
                <TabsTrigger value="transactions">Transaction History ({transactions.length})</TabsTrigger>
            </TabsList>

            {/** Betting History Tab Content */}
            <TabsContent value="bets">
                <h2 className="text-2xl font-bold text-secondary-foreground mb-6">Betting History</h2>
                {bets.length === 0 ? (
                    /** Empty state if no bets are found */
                    <EmptyStateCard 
                        title="No bets placed yet" 
                        description="Start by placing a bet on any active market."
                    />
                ) : (
                    /** List of BetItem components */
                    <div className="space-y-4">
                        {bets.map((bet) => (
                            <BetItem 
                                key={bet.id} 
                                bet={bet} 
                                market={markets.find(m => m.id === bet.marketId)} 
                            />
                        ))}
                    </div>
                )}
            </TabsContent>

            {/** Transaction History Tab Content */}
            <TabsContent value="transactions">
                <h2 className="text-2xl font-bold text-secondary-foreground mb-6">Transaction History</h2>
                {transactions.length === 0 ? (
                    /** Empty state if no transactions are found */
                    <EmptyStateCard 
                        title="No transactions yet" 
                        description="Your deposits, bets, and payouts will appear here."
                    />
                ) : (
                    /** List of TransactionItem components */
                    <div className="space-y-4">
                        {transactions.map((transaction) => (
                            <TransactionItem 
                                key={transaction.id} 
                                transaction={transaction} 
                            />
                        ))}
                    </div>
                )}
            </TabsContent>
        </Tabs>
    </div>
  );
}