"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useQuery, useMutation } from "@tanstack/react-query";
import { type Market } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ArrowLeft, ThumbsUp, ThumbsDown, CheckCircle2, DollarSign, Shield, Copy, XCircle, Clock, TrendingUp, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { useWallet } from "@solana/wallet-adapter-react";
import { verifyCommitmentHash } from "@/lib/provablyFair";
import { PnLSidebar } from "./PnLSidebar";
import { MarketCharts } from "./MarketCharts";
import { TokenPriceChart } from "./TokenPriceChart";

// Live expiration timer component
function ExpirationTimer({ expiresAt }: { expiresAt: Date | string }) {
  const [timeRemaining, setTimeRemaining] = useState<string>("");

  useEffect(() => {
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
        setTimeRemaining(`${days}d ${hours}h ${minutes}m`);
      } else if (hours > 0) {
        setTimeRemaining(`${hours}h ${minutes}m ${seconds}s`);
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

  if (!timeRemaining) return null;

  const isUrgent = new Date(expiresAt).getTime() - Date.now() < 60 * 60 * 1000;

  return (
    <span className={`font-medium ${isUrgent ? "text-destructive" : "text-foreground"}`}>
      {timeRemaining}
    </span>
  );
}

interface MarketDetailViewProps {
  slug?: string;
  marketOverride?: Market;
}

export function MarketDetailView({ slug, marketOverride }: MarketDetailViewProps = {}) {
  const { toast } = useToast();
  const { user } = useAuth();
  const wallet = useWallet();
  const [betAmount, setBetAmount] = useState("1");
  const [selectedPosition, setSelectedPosition] = useState<"yes" | "no">("yes");
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<boolean | null>(null);
  const [inviteCode, setInviteCode] = useState("");
  const [isPnLSidebarOpen, setIsPnLSidebarOpen] = useState(false);

  const { data: market, isLoading, error } = useQuery<Market>({
    queryKey: ["/api/markets", slug],
    enabled: !!slug && !marketOverride,
    initialData: marketOverride,
  });

  const displayMarket = marketOverride || market;
  const marketId = displayMarket?.id?.toString() || slug;
  const querySlug = slug || displayMarket?.slug || displayMarket?.id?.toString();

  // Extract token names
  let token1Name: string | null = null;
  let token2Name: string | null = null;

  if (displayMarket) {
    if (displayMarket.tokenAddress2) {
      const match = displayMarket.question.match(/:\s*([^?]+?)\s+or\s+([^?]+?)\s*\?/i);
      if (match && match[1] && match[2]) {
        token1Name = match[1].trim();
        token2Name = match[2].trim();
      }
    } else if (displayMarket.tokenAddress) {
      const match = displayMarket.question.match(/Will\s+([^']+)'s/i);
      if (match) {
        token1Name = match[1].trim();
      }
    }
  }

  const truncateText = (text: string | null, maxLength: number = 20): string => {
    if (!text) return "";
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + "...";
  };

  // Mutations
  const resolveMarket = useMutation({
    mutationFn: async (outcome: "yes" | "no") => {
      const response = await apiRequest("POST", `/api/markets/${marketId}/resolve`, { outcome });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/markets"] });
      if (querySlug) queryClient.invalidateQueries({ queryKey: ["/api/markets", querySlug] });
      queryClient.invalidateQueries({ queryKey: ["/api/wallet/balance"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bets"] });
      toast({ title: "Market resolved successfully!" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to resolve market", description: error.message, variant: "destructive" });
    },
  });

  const refundMarket = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/markets/${marketId}/refund`);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/markets"] });
      toast({ title: "All bets refunded!" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to refund", description: error.message, variant: "destructive" });
    },
  });

  const placeBet = useMutation({
    mutationFn: async ({ position, amount }: { position: "yes" | "no"; amount: string }) => {
      const payload: { marketId: number; position: string; amount: string; inviteCode?: string } = {
        marketId: parseInt(marketId || "0"),
        position,
        amount,
      };
      if (displayMarket?.isPrivate === 1 && inviteCode) {
        payload.inviteCode = inviteCode;
      }
      const response = await apiRequest("POST", `/api/markets/${marketId}/bet`, payload);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/markets"] });
      if (querySlug) queryClient.invalidateQueries({ queryKey: ["/api/markets", querySlug] });
      queryClient.invalidateQueries({ queryKey: ["/api/wallet/balance"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bets"] });
      toast({ title: "Bet placed successfully!" });
      setIsPnLSidebarOpen(true);
    },
    onError: (error: Error) => {
      toast({ title: "Failed to place bet", description: error.message, variant: "destructive" });
    },
  });

  const handleBet = () => {
    if (!user) {
      toast({ title: "Please connect your wallet", variant: "destructive" });
      return;
    }
    placeBet.mutate({ position: selectedPosition, amount: betAmount });
  };

  // Calculate probabilities and potential winnings
  const yesPool = parseFloat(displayMarket?.yesPool || "0");
  const noPool = parseFloat(displayMarket?.noPool || "0");
  const totalPool = yesPool + noPool;
  const displayProbability = totalPool > 0 ? Math.round((yesPool / totalPool) * 100) : 50;
  const noProbability = 100 - displayProbability;

  const betAmountNum = parseFloat(betAmount) || 0;
  const currentPool = selectedPosition === "yes" ? yesPool : noPool;
  const oppositePool = selectedPosition === "yes" ? noPool : yesPool;
  const newPool = currentPool + betAmountNum;
  const newTotalPool = totalPool + betAmountNum;
  const potentialWinnings = newPool > 0 ? (betAmountNum / newPool) * newTotalPool : 0;
  const potentialProfit = potentialWinnings - betAmountNum;

  // Loading/Error states
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !displayMarket) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-8 text-center">
          <XCircle className="h-12 w-12 mx-auto mb-4 text-destructive" />
          <h2 className="text-xl font-bold mb-2">Market Not Found</h2>
          <Link href="/markets">
            <Button variant="outline">Back to Markets</Button>
          </Link>
        </Card>
      </div>
    );
  }

  const isResolved = displayMarket.status === "resolved";
  const isActive = displayMarket.status === "active";
  const isAdmin = !!user?.isAdmin;
  const isCreator = displayMarket.createdBy === user?.id;

  return (
    <div className="min-h-screen bg-background">
      {/* Back Button */}
      <div className="border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <Link href="/markets" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm">Back to Markets</span>
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex flex-col lg:flex-row gap-6">

          {/* LEFT COLUMN - Main Content */}
          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="mb-6">
              <div className="flex items-start gap-3 mb-3">
                <Badge variant="outline" className="text-xs border-border text-muted-foreground">
                  {displayMarket.category}
                </Badge>
                {displayMarket.isPrivate === 1 && (
                  <Badge variant="outline" className="text-xs border-primary text-primary">
                    Private
                  </Badge>
                )}
                {isResolved && (
                  <Badge className={displayMarket.resolvedOutcome === "yes" ? "bg-success text-success-foreground" : "bg-destructive text-destructive-foreground"}>
                    Resolved: {displayMarket.resolvedOutcome?.toUpperCase()}
                  </Badge>
                )}
              </div>
              <h1 className="text-2xl font-bold text-foreground mb-4">{displayMarket.question}</h1>

              {/* Stats Row */}
              <div className="flex flex-wrap items-center gap-4 text-sm">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <TrendingUp className="h-4 w-4" />
                  <span>{totalPool.toFixed(2)} SOL Vol.</span>
                </div>
                {displayMarket.expiresAt && (
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <ExpirationTimer expiresAt={displayMarket.expiresAt} />
                  </div>
                )}
              </div>
            </div>

            {/* Token Address(es) */}
            {(displayMarket.tokenAddress || displayMarket.tokenAddress2) && (
              <div className="mb-4 p-3 bg-secondary/50 rounded-lg border border-border">
                <div className="flex flex-wrap gap-4 text-xs">
                  {displayMarket.tokenAddress && (
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">{token1Name || "Token"}:</span>
                      <code className="text-muted-foreground font-mono">{displayMarket.tokenAddress.slice(0, 8)}...{displayMarket.tokenAddress.slice(-4)}</code>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(displayMarket.tokenAddress || "");
                          toast({ title: "Copied!" });
                        }}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <Copy className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                  {displayMarket.tokenAddress2 && (
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">{token2Name || "Token 2"}:</span>
                      <code className="text-muted-foreground font-mono">{displayMarket.tokenAddress2.slice(0, 8)}...{displayMarket.tokenAddress2.slice(-4)}</code>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(displayMarket.tokenAddress2 || "");
                          toast({ title: "Copied!" });
                        }}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <Copy className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Price Chart */}
            {displayMarket.tokenAddress && (
              <div className="mb-6">
                <TokenPriceChart
                  tokenAddress={displayMarket.tokenAddress}
                  tokenName={token1Name || undefined}
                  tokenAddress2={displayMarket.tokenAddress2 || undefined}
                  tokenName2={token2Name || undefined}
                />
              </div>
            )}

            {/* Probability Chart */}
            {querySlug && (
              <div className="mb-6">
                <MarketCharts slug={querySlug} currentProbability={displayProbability} />
              </div>
            )}

            {/* Resolution Section (Admin) */}
            {isActive && (isAdmin || isCreator) && (
              <div className="mb-6 p-4 bg-secondary/50 rounded-lg border border-border">
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">Resolve Market</h3>
                <div className="flex gap-3">
                  <Button
                    onClick={() => resolveMarket.mutate("yes")}
                    disabled={resolveMarket.isPending}
                    className="bg-success text-success-foreground hover:brightness-110"
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Resolve YES
                  </Button>
                  <Button
                    onClick={() => resolveMarket.mutate("no")}
                    disabled={resolveMarket.isPending}
                    className="bg-destructive text-destructive-foreground hover:brightness-110"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Resolve NO
                  </Button>
                  <Button
                    onClick={() => refundMarket.mutate()}
                    disabled={refundMarket.isPending}
                    variant="outline"
                    className="border-border"
                  >
                    Refund All
                  </Button>
                </div>
              </div>
            )}

            {/* Resolved Info */}
            {isResolved && displayMarket.commitmentHash && (
              <div className="mb-6 p-4 bg-secondary/50 rounded-lg border border-border">
                <div className="flex items-center gap-2 mb-3">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Provably Fair</h3>
                </div>
                <div className="space-y-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">Hash: </span>
                    <code className="text-muted-foreground font-mono break-all">{displayMarket.commitmentHash}</code>
                  </div>
                  {displayMarket.commitmentSecret && (
                    <div>
                      <span className="text-muted-foreground">Secret: </span>
                      <code className="text-muted-foreground font-mono break-all">{displayMarket.commitmentSecret}</code>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN - Betting Sidebar */}
          <div className="lg:w-80 flex-shrink-0">
            <div className="lg:sticky lg:top-6">
              <div className="bg-secondary/50 rounded-xl border border-border overflow-hidden">
                {/* Header */}
                <div className="p-4 border-b border-border">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${selectedPosition === "yes" ? "bg-success" : "bg-destructive"}`} />
                    <span className="font-medium text-foreground">
                      {displayMarket.tokenAddress2
                        ? (selectedPosition === "yes" ? token1Name : token2Name) || (selectedPosition === "yes" ? "Token 1" : "Token 2")
                        : selectedPosition === "yes" ? "Yes" : "No"}
                    </span>
                  </div>
                </div>

                <div className="p-4">
                  {/* Position Toggle */}
                  <div className="flex gap-2 mb-4">
                    <Button
                      onClick={() => setSelectedPosition("yes")}
                      variant={selectedPosition === "yes" ? "success" : "ghost"}
                      className={`flex-1 ${selectedPosition === "yes" ? "shadow-[0_0_10px_rgba(34,197,94,0.2)]" : ""}`}
                    >
                      Yes {displayProbability}¢
                    </Button>
                    <Button
                      onClick={() => setSelectedPosition("no")}
                      variant={selectedPosition === "no" ? "destructive" : "ghost"}
                      className={`flex-1 ${selectedPosition === "no" ? "shadow-[0_0_10px_rgba(239,68,68,0.2)]" : ""}`}
                    >
                      No {noProbability}¢
                    </Button>
                  </div>

                  {/* Amount Input */}
                  <div className="mb-4">
                    <label className="text-xs text-muted-foreground mb-1.5 block">Amount</label>
                    <div className="relative">
                      <Input
                        type="number"
                        min="0"
                        step="0.1"
                        value={betAmount}
                        onChange={(e) => setBetAmount(e.target.value)}
                        className="bg-secondary border-border text-foreground pr-12"
                        placeholder="0"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">SOL</span>
                    </div>
                  </div>

                  {/* Quick Amount Buttons */}
                  <div className="flex gap-2 mb-4">
                    {["0.1", "0.5", "1", "5"].map((amt) => (
                      <Button
                        key={amt}
                        onClick={() => setBetAmount(amt)}
                        size="sm"
                        variant={
                          betAmount === amt
                            ? selectedPosition === "yes"
                              ? "success"
                              : "destructive"
                            : "ghost"
                        }
                        className="flex-1"
                      >
                        {amt}
                      </Button>
                    ))}
                  </div>

                  {/* Invite Code (for private markets) */}
                  {displayMarket.isPrivate === 1 && !displayMarket.inviteCode && (
                    <div className="mb-4">
                      <label className="text-xs text-muted-foreground mb-1.5 block">Invite Code</label>
                      <Input
                        type="text"
                        value={inviteCode}
                        onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                        className="bg-secondary border-border text-foreground font-mono uppercase"
                        placeholder="XXXXXXXX"
                        maxLength={8}
                      />
                    </div>
                  )}

                  {/* Summary */}
                  <div className="py-3 border-t border-border space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Avg price</span>
                      <span className="text-foreground">{selectedPosition === "yes" ? displayProbability : noProbability}¢</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Potential return</span>
                      <span className={`font-medium ${selectedPosition === "yes" ? "text-success" : "text-destructive"}`}>
                        {potentialWinnings.toFixed(4)} SOL
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Profit</span>
                      <span className={`font-medium ${selectedPosition === "yes" ? "text-success" : "text-destructive"}`}>
                        +{potentialProfit.toFixed(4)} SOL
                      </span>
                    </div>
                  </div>

                  {/* Trade Button */}
                  <Button
                    onClick={handleBet}
                    disabled={placeBet.isPending || !isActive || betAmountNum <= 0}
                    variant={selectedPosition === "yes" ? "success" : "destructive"}
                    className="w-full"
                    size="lg"
                  >
                    {placeBet.isPending ? "Placing..." : isActive ? "Trade" : "Market Closed"}
                  </Button>

                  {/* View P&L */}
                  {user && (
                    <Button
                      onClick={() => setIsPnLSidebarOpen(true)}
                      variant="ghost"
                      className="w-full mt-3"
                    >
                      <DollarSign className="h-4 w-4" />
                      View your positions
                    </Button>
                  )}
                </div>

                {/* Disclaimer */}
                <div className="px-4 py-3 border-t border-border">
                  <p className="text-[10px] text-muted-foreground text-center">
                    By trading, you agree to the Terms of Use
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* P&L Sidebar */}
      <PnLSidebar isOpen={isPnLSidebarOpen} onClose={() => setIsPnLSidebarOpen(false)} />
    </div>
  );
}
