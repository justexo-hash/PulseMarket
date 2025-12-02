"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation } from "@tanstack/react-query";
import { type Market } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { ArrowLeft, ThumbsUp, ThumbsDown, CheckCircle2, DollarSign, Shield, Copy, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { useWallet } from "@solana/wallet-adapter-react";
import { verifyCommitmentHash } from "@/lib/provablyFair";
import { PnLSidebar } from "./PnLSidebar";

interface MarketDetailViewProps {
  slug?: string;
  marketOverride?: Market;
}

export function MarketDetailView({ slug, marketOverride }: MarketDetailViewProps = {}) {
  const { toast } = useToast();
  const { user } = useAuth();
  const wallet = useWallet();
  const [betAmount, setBetAmount] = useState("1");
  const [hoveredOption, setHoveredOption] = useState<"yes" | "no" | null>(null);
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

  const resolveMarket = useMutation({
    mutationFn: async (outcome: "yes" | "no") => {
      const response = await apiRequest("POST", `/api/markets/${marketId}/resolve`, { outcome });
      return await response.json();
    },
    onSuccess: (data: { market: Market; payoutResults?: Array<{ walletAddress: string; amountSOL: number; txSignature: string | null; error?: string }> }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/markets"] });
      if (querySlug) {
        queryClient.invalidateQueries({ queryKey: ["/api/markets", querySlug] });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/wallet/balance"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      
      // Show payout results
      if (data.payoutResults && data.payoutResults.length > 0) {
        const successful = data.payoutResults.filter(r => r.txSignature).length;
        const failed = data.payoutResults.filter(r => !r.txSignature).length;
        
        if (failed > 0) {
          // Show detailed error messages
          const failedPayouts = data.payoutResults.filter(r => !r.txSignature);
          const errorMessages = failedPayouts.map(r => r.error).filter(Boolean);
          const uniqueErrors = [...new Set(errorMessages)];
          
          toast({
            title: "Market Resolved (Partial Payouts)",
            description: (
              <div>
                <p className="mb-2">{successful} payouts successful, {failed} failed.</p>
                {uniqueErrors.length > 0 && (
                  <div className="mt-2 text-sm">
                    <p className="font-semibold mb-1">Errors:</p>
                    <ul className="list-disc list-inside space-y-1">
                      {uniqueErrors.slice(0, 3).map((error, i) => (
                        <li key={i}>{error}</li>
                      ))}
                      {uniqueErrors.length > 3 && (
                        <li>...and {uniqueErrors.length - 3} more errors</li>
                      )}
                    </ul>
                  </div>
                )}
                <p className="mt-2 text-xs">Check transactions for details.</p>
              </div>
            ),
            variant: "destructive",
            duration: 10000,
          });
        } else {
          toast({
            title: "Market Resolved!",
            description: `Successfully distributed ${successful} payout(s) on-chain.`,
          });
        }
      } else {
        toast({
          title: "Market Resolved!",
          description: "The market has been resolved and payouts have been distributed.",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to resolve market. Please try again.",
        variant: "destructive",
      });
    },
  });

  const refundMarket = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/markets/${marketId}/refund`);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/markets"] });
      if (querySlug) {
        queryClient.invalidateQueries({ queryKey: ["/api/markets", querySlug] });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/wallet/balance"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      
      toast({
        title: "Market Refunded!",
        description: "All bets have been refunded to their respective users.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to refund market. Please try again.",
        variant: "destructive",
      });
    },
  });

  const placeBet = useMutation({
    mutationFn: async (position: "yes" | "no") => {
      // Include wallet address if wallet is connected for wallet-based auth
      const body: { position: "yes" | "no"; amount: string; walletAddress?: string; inviteCode?: string } = {
        position,
        amount: betAmount,
      };
      
      if (wallet.publicKey) {
        body.walletAddress = wallet.publicKey.toBase58();
      }

      // Include invite code if this is a private wager
      if (displayMarket?.isPrivate && displayMarket.inviteCode) {
        body.inviteCode = displayMarket.inviteCode;
      } else if (displayMarket?.isPrivate && inviteCode) {
        body.inviteCode = inviteCode;
      }
      
      const response = await apiRequest("POST", `/api/markets/${marketId}/bet`, body);
      return await response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/markets"] });
      if (querySlug) {
        queryClient.invalidateQueries({ queryKey: ["/api/markets", querySlug] });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/wallet/balance"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      toast({
        title: `${data.bet.position === "yes" ? "Yes" : "No"} Bet Placed!`,
        description: `You bet ${betAmount} SOL at ${data.bet.probability}% probability.`,
      });
      setBetAmount("1"); // Reset bet amount
      // Open P&L sidebar after placing bet
      setIsPnLSidebarOpen(true);
    },
    onError: (error: any) => {
      toast({
        title: "Bet Failed",
        description: error.message || "Failed to place bet. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleBet = (position: "yes" | "no") => {
    if (!wallet.connected && !user) {
      toast({
        title: "Wallet Required",
        description: "Please connect your wallet to place bets.",
        variant: "destructive",
      });
      return;
    }

    if (!displayMarket) return;
    
    const amount = parseFloat(betAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid bet amount greater than 0.",
        variant: "destructive",
      });
      return;
    }

    placeBet.mutate(position);
  };

  const handleResolve = (outcome: "yes" | "no") => {
    resolveMarket.mutate(outcome);
  };

  const handleRefund = () => {
    if (confirm("Are you sure you want to refund all bets for this market? This cannot be undone.")) {
      refundMarket.mutate();
    }
  };

  if (isLoading) {
    return (
      /** TODO */
     "loading"
    );
  }

  if (!displayMarket && !isLoading) {
    return (
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center py-20">
          <h2 className="text-3xl font-bold text-secondary-foreground  mb-4">Market Not Found</h2>
          <p className="text-muted-foreground mb-8">
            {error ? `Error: ${error.message}` : "The market you're looking for doesn't exist."}
          </p>
          <Button variant="default" data-testid="button-back-home" asChild>
            <Link href="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Markets
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  if (!displayMarket) {
    return null; // Still loading or no data
  }

  // Recalculate probability from pools (client-side fallback to ensure accuracy)
  const yesPool = parseFloat(displayMarket.yesPool || "0");
  const noPool = parseFloat(displayMarket.noPool || "0");
  const totalPool = yesPool + noPool;
  const calculatedProbability = totalPool > 0
    ? Math.max(0, Math.min(100, Math.round((yesPool / totalPool) * 100)))
    : 50;
  
  // Use calculated probability for active markets, stored for resolved markets
  const displayProbability = displayMarket.status === "resolved" 
    ? displayMarket.probability 
    : calculatedProbability;
  
  const noProbability = 100 - displayProbability;

  // Calculate potential winnings for a bet
  const calculatePotentialWinnings = (amount: number, position: "yes" | "no"): number | null => {
    if (amount <= 0 || isNaN(amount) || !displayMarket) return null;

    const yesPool = parseFloat(displayMarket.yesPool || "0");
    const noPool = parseFloat(displayMarket.noPool || "0");
    const totalPool = yesPool + noPool;

    // Calculate what the pools would be after this bet
    const newYesPool = position === "yes" ? yesPool + amount : yesPool;
    const newNoPool = position === "no" ? noPool + amount : noPool;
    const newTotalPool = newYesPool + newNoPool;

    // Calculate total bets on the winning side (including this bet)
    const winnerPool = position === "yes" ? newYesPool : newNoPool;

    if (winnerPool === 0) return null;

    // Payout = (yourBet / totalWinnerBets) * totalPool
    const potentialPayout = (amount / winnerPool) * newTotalPool;
    return potentialPayout;
  };

  const betAmountNum = parseFloat(betAmount) || 0;

  // Calculate potential winnings only for the hovered/selected option
  const potentialWinnings = hoveredOption ? calculatePotentialWinnings(betAmountNum, hoveredOption) : null;
  const potentialProfit = potentialWinnings !== null ? potentialWinnings - betAmountNum : null;
  const returnMultiplier = potentialWinnings !== null && betAmountNum > 0 ? (potentialWinnings / betAmountNum).toFixed(2) : null;

  return (
    <div className="">
      <Button variant="ghost" className="mb-6" asChild>
        <Link href="/" data-testid="button-back">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Markets
        </Link>
      </Button>

      <div className="market">
            <div className="flex items-center gap-2 mb-4">
              <Badge
                className="uppercase text-xs font-semibold tracking-wide"
                data-testid="badge-category"
              >
                {displayMarket.category}
              </Badge>
              {displayMarket.isPrivate === 1 && (
                <Badge className="uppercase text-xs font-semibold tracking-wide">
                  <Shield className="h-3 w-3 mr-1" />
                  Private Wager
                </Badge>
              )}
              {displayMarket.payoutType === "winner-takes-all" && (
                <Badge className="uppercase text-xs font-semibold tracking-wide">
                  Winner Takes All
                </Badge>
              )}
            </div>
            <div className="flex items-start justify-between gap-4 mb-2">
              <h1 className="text-4xl font-bold text-secondary-foreground " data-testid="text-question">
                {displayMarket.question}
              </h1>
            </div>
            
            {/* Show token address if available as subheader */}
            {displayMarket.tokenAddress && (
              <div className="mb-4 flex items-center gap-2">
                <p className="text-sm text-muted-foreground font-mono">
                  {displayMarket.tokenAddress}
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2"
                  onClick={() => {
                    navigator.clipboard.writeText(displayMarket.tokenAddress || "");
                    toast({
                      title: "Copied!",
                      description: "Token address copied to clipboard",
                    });
                  }}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            )}
            
            {/* Show invite code for private wagers */}
            {displayMarket.isPrivate === 1 && displayMarket.inviteCode && (
              <Card className="p-4  mb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Invite Code</p>
                    <code className="text-lg font-mono text-secondary-foreground ">{displayMarket.inviteCode}</code>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(displayMarket.inviteCode!);
                        toast({ title: "Copied!", description: "Invite code copied to clipboard" });
                      }}
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Copy Code
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const inviteLink = `${window.location.origin}/wager/${displayMarket.inviteCode}`;
                        navigator.clipboard.writeText(inviteLink);
                        toast({ title: "Copied!", description: "Invite link copied to clipboard" });
                      }}
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Copy Link
                    </Button>
                  </div>
                </div>
              </Card>
            )}
          </div>

          <div className="grid md:grid-cols-2 gap-8 mb-8">
            <div className="rounded-lg p-6">
              <div className="text-center">
                <p className="text-sm text-muted-foreground uppercase tracking-wide font-medium mb-2">
                  Yes Probability
                </p>
                <p className="text-6xl font-bold text-chart-2 mb-4" data-testid="text-yes-probability">
                  {displayProbability}%
                </p>
                <div className="w-full h-3 rounded-full overflow-hidden mb-4">
                  <div
                    className="h-full bg-chart-2 rounded-full transition-all"
                    style={{ width: `${displayProbability}%` }}
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  Pool: <span className="font-semibold text-chart-2" data-testid="text-yes-pool">
                    {parseFloat(displayMarket.yesPool || "0").toFixed(4)} SOL
                  </span>
                </p>
              </div>
            </div>

            <div className="rounded-lg p-6">
              <div className="text-center">
                <p className="text-sm text-muted-foreground uppercase tracking-wide font-medium mb-2">
                  No Probability
                </p>
                <p className="text-6xl font-bold text-destructive mb-4" data-testid="text-no-probability">
                  {noProbability}%
                </p>
                <div className="w-full h-3 rounded-full overflow-hidden mb-4">
                  <div
                    className="h-full bg-destructive rounded-full transition-all"
                    style={{ width: `${noProbability}%` }}
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  Pool: <span className="font-semibold text-destructive" data-testid="text-no-pool">
                    {parseFloat(displayMarket.noPool || "0").toFixed(4)} SOL
                  </span>
                </p>
              </div>
            </div>
          </div>

          <div className="pt-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-secondary-foreground ">Place Your Bet</h2>
              {user && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsPnLSidebarOpen(!isPnLSidebarOpen)}
                  className="flex items-center gap-2"
                >
                  <DollarSign className="h-4 w-4" />
                  View P&L
                </Button>
              )}
            </div>
            
            {/* Invite code input for private wagers (if user doesn't have access yet) */}
            {displayMarket.isPrivate === 1 && !displayMarket.inviteCode && (
              <div className="mb-6">
                <Label htmlFor="invite-code" className="text-base font-semibold mb-2 block">
                  Invite Code <span className="text-muted-foreground text-sm">(Required)</span>
                </Label>
                <Input
                  id="invite-code"
                  type="text"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  className="text-lg font-mono uppercase"
                  placeholder="Enter 8-character code"
                  maxLength={8}
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Get the invite code from the wager creator to participate
                </p>
              </div>
            )}
            
            <div className="mb-6">
              <Label htmlFor="bet-amount" className="text-base font-semibold mb-2 block">
                Bet Amount (SOL)
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  id="bet-amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={betAmount}
                  onChange={(e) => setBetAmount(e.target.value)}
                  className="text-lg"
                  data-testid="input-bet-amount"
                  placeholder="1.0"
                />
                <span className="text-lg text-muted-foreground font-medium">SOL</span>
              </div>
              
              {/* Show potential winnings when user enters an amount and hovers over a button */}
              {/* Reserve space to prevent layout shift */}
              <div className="mt-4 min-h-[100px]">
                {betAmountNum > 0 && hoveredOption && potentialWinnings !== null && (
                  <div
                    className={`rounded-lg p-4 transition-all ${
                      hoveredOption === "yes"
                        ? "bg-green-400/20 text-green-400"
                        : "bg-red-400/20 text-red-400"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">
                        If {hoveredOption.toUpperCase()} Wins:
                      </span>
                      {returnMultiplier && (
                        <span className="text-xs px-2 py-1 rounded">
                          {returnMultiplier}x return
                        </span>
                      )}
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">You win:</span>
                        <span className="font-semibold">
                          {potentialWinnings.toFixed(4)} SOL
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Profit:</span>
                        <span className={`font-semibold ${potentialProfit! >= 0 ? '' : ''}`}>
                          {potentialProfit! >= 0 ? '+' : ''}{potentialProfit!.toFixed(4)} SOL
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div
                onMouseEnter={() => betAmountNum > 0 && setHoveredOption("yes")}
                onMouseLeave={() => setHoveredOption(null)}
              >
                <Button
                  size="lg"
                  className="h-auto py-6 text-lg font-semibold w-full bg-green-400/20 text-green-400"
                  onClick={() => handleBet("yes")}
                  disabled={placeBet.isPending || displayMarket.status !== "active"}
                  data-testid="button-bet-yes"
                >
                  <ThumbsUp className="mr-2 h-5 w-5" />
                  {placeBet.isPending ? "Placing..." : "Bet Yes"}
                </Button>
              </div>
              <div
                onMouseEnter={() => betAmountNum > 0 && setHoveredOption("no")}
                onMouseLeave={() => setHoveredOption(null)}
              >
                <Button
                  size="lg"
                  className="h-auto py-6 text-lg font-semibold w-full bg-red-400/20 text-red-400"
                  onClick={() => handleBet("no")}
                  disabled={placeBet.isPending || displayMarket.status !== "active"}
                  data-testid="button-bet-no"
                >
                  <ThumbsDown className="mr-2 h-5 w-5" />
                  {placeBet.isPending ? "Placing..." : "Bet No"}
                </Button>
              </div>
            </div>
            <p className="text-sm text-muted-foreground text-center mt-4">
              Bets are deducted from your wallet balance. Winnings are automatically distributed when the market resolves.
            </p>
          </div>

          {/* Market Resolution Section - Show resolved status to all, but only show resolution buttons to admins */}
          {displayMarket.status === "resolved" ? (
            <div className="pt-8 space-y-6">
              <Card className="p-6">
                <div className="flex items-center justify-center gap-3">
                  <CheckCircle2 className="h-6 w-6 text-secondary-foreground" />
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground font-medium mb-1">
                      Market Resolved
                    </p>
                    <p className="text-2xl font-bold text-secondary-foreground " data-testid="text-resolved-outcome">
                      Outcome: <span className={displayMarket.resolvedOutcome === "yes" ? "text-green-400" : "text-red-400"}>
                        {displayMarket.resolvedOutcome?.toUpperCase()}
                      </span>
                    </p>
                  </div>
                </div>
              </Card>

              {/* Provably Fair Verification */}
              {displayMarket.commitmentHash && (
                <Card className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Shield className="h-5 w-5 text-secondary-foreground" />
                    <h3 className="text-lg font-semibold text-secondary-foreground ">Provably Fair Verification</h3>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground mb-2 block">
                        Commitment Hash
                      </label>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 text-xs font-mono p-3 rounded-lg break-all">
                          {displayMarket.commitmentHash}
                        </code>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            navigator.clipboard.writeText(displayMarket.commitmentHash!);
                            toast({ title: "Copied!", description: "Commitment hash copied to clipboard" });
                          }}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {displayMarket.commitmentSecret && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground mb-2 block">
                          Revealed Secret
                        </label>
                        <div className="flex items-center gap-2">
                          <code className="flex-1 text-xs font-mono p-3 rounded-lg break-all">
                            {displayMarket.commitmentSecret}
                          </code>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              navigator.clipboard.writeText(displayMarket.commitmentSecret!);
                              toast({ title: "Copied!", description: "Secret copied to clipboard" });
                            }}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}

                    {displayMarket.commitmentHash && displayMarket.commitmentSecret && displayMarket.resolvedOutcome && (
                      <div className="p-4 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {verificationResult === true ? (
                              <CheckCircle2 className="h-4 w-4 text-green-400" />
                            ) : verificationResult === false ? (
                              <XCircle className="h-4 w-4 text-red-400" />
                            ) : (
                              <Shield className="h-4 w-4 text-muted-foreground" />
                            )}
                            <span className={`text-sm font-medium ${
                              verificationResult === true ? "text-green-400" :
                              verificationResult === false ? "text-red-400" :
                              ""
                            }`}>
                              {verificationResult === true ? "Verified ✓" :
                               verificationResult === false ? "Verification Failed" :
                               "Click to Verify"}
                            </span>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={async () => {
                              if (!displayMarket.commitmentHash || !displayMarket.commitmentSecret || !displayMarket.resolvedOutcome || !displayMarket.id) return;
                              setIsVerifying(true);
                              try {
                                const isValid = await verifyCommitmentHash(
                                  displayMarket.resolvedOutcome as "yes" | "no" | "refunded",
                                  displayMarket.commitmentSecret,
                                  displayMarket.id,
                                  displayMarket.commitmentHash
                                );
                                setVerificationResult(isValid);
                                if (isValid) {
                                  toast({ title: "Verification Successful!", description: "Commitment hash is valid." });
                                } else {
                                  toast({ 
                                    title: "Verification Failed", 
                                    description: "Hash does not match. Contact support.",
                                    variant: "destructive"
                                  });
                                }
                              } catch (error) {
                                console.error("Verification error:", error);
                                toast({ title: "Verification Error", description: "Failed to verify commitment.", variant: "destructive" });
                              } finally {
                                setIsVerifying(false);
                              }
                            }}
                            disabled={isVerifying}
                          >
                            {isVerifying ? "Verifying..." : "Verify Hash"}
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Verify by computing: SHA256(&quot;{displayMarket.resolvedOutcome}:{displayMarket.commitmentSecret}:{displayMarket.id}&quot;)
                        </p>
                        <p className="text-xs text-muted-foreground mt-1 font-mono">
                          Expected: {displayMarket.commitmentHash}
                        </p>
                      </div>
                    )}

                    <div className="pt-2">
                      <Button variant="outline" size="sm" className="w-full" asChild>
                        <Link href="/transparency">
                          <Shield className="h-4 w-4 mr-2" />
                          View Full Transparency Page
                        </Link>
                      </Button>
                    </div>
                  </div>
                </Card>
              )}
            </div>
          ) : (
            (user?.isAdmin || (displayMarket.isPrivate === 1 && displayMarket.createdBy === user?.id)) && (
              <div className="pt-8">
                <h2 className="text-2xl font-bold text-secondary-foreground  mb-6">
                  {displayMarket.isPrivate === 1 && displayMarket.createdBy === user?.id 
                    ? "Resolve Private Wager" 
                    : "Admin: Resolve Market"}
                </h2>
                <p className="text-muted-foreground mb-6">
                  {displayMarket.isPrivate === 1 && displayMarket.createdBy === user?.id
                    ? "Resolve this wager with the actual outcome or refund all bets if the wager cannot be determined."
                    : "Admin only: Resolve this market with the actual outcome or refund all bets if the market cannot be determined."}
                </p>
                <div className="grid sm:grid-cols-3 gap-4">
                <Button
                  size="lg"
                  variant="default"
                  className="h-auto py-6 text-lg font-semibold"
                  onClick={() => handleResolve("yes")}
                  disabled={resolveMarket.isPending}
                  data-testid="button-resolve-yes"
                >
                  <CheckCircle2 className="mr-2 h-5 w-5" />
                  {resolveMarket.isPending ? "Resolving..." : "Resolve YES"}
                </Button>
                <Button
                  size="lg"
                  variant="destructive"
                  className="h-auto py-6 text-lg font-semibold"
                  onClick={() => handleResolve("no")}
                  disabled={resolveMarket.isPending}
                  data-testid="button-resolve-no"
                >
                  <CheckCircle2 className="mr-2 h-5 w-5" />
                  {resolveMarket.isPending ? "Resolving..." : "Resolve NO"}
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="h-auto py-6 text-lg font-semibold"
                  onClick={() => handleRefund()}
                  disabled={refundMarket.isPending}
                  data-testid="button-refund"
                >
                  <ArrowLeft className="mr-2 h-5 w-5" />
                  {refundMarket.isPending ? "Refunding..." : "Refund All"}
                </Button>
                </div>
                <p className="text-sm text-muted-foreground text-center mt-4">
                  Resolving a market is permanent. Use &quot;Refund All&quot; for markets that cannot be determined.
                </p>
              </div>
            )
          )}
      
      {/* P&L Sidebar */}
      <PnLSidebar isOpen={isPnLSidebarOpen} onClose={() => setIsPnLSidebarOpen(false)} />
    </div>
  );
}
