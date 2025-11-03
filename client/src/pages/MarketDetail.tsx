import { useState } from "react";
import { useParams, Link } from "wouter";
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

export function MarketDetail() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const { user } = useAuth();
  const wallet = useWallet();
  const [betAmount, setBetAmount] = useState("1");
  const [hoveredOption, setHoveredOption] = useState<"yes" | "no" | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<boolean | null>(null);
  const [inviteCode, setInviteCode] = useState("");
  
  const { data: market, isLoading, error } = useQuery<Market>({
    queryKey: ["/api/markets", id],
    enabled: !!id,
  });

  const resolveMarket = useMutation({
    mutationFn: async (outcome: "yes" | "no") => {
      const response = await apiRequest("POST", `/api/markets/${id}/resolve`, { outcome });
      return await response.json();
    },
    onSuccess: (data: { market: Market; payoutResults?: Array<{ walletAddress: string; amountSOL: number; txSignature: string | null; error?: string }> }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/markets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/markets", id] });
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
      const response = await apiRequest("POST", `/api/markets/${id}/refund`);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/markets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/markets", id] });
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
      if (market?.isPrivate && market.inviteCode) {
        body.inviteCode = market.inviteCode;
      } else if (market?.isPrivate && inviteCode) {
        body.inviteCode = inviteCode;
      }
      
      const response = await apiRequest("POST", `/api/markets/${id}/bet`, body);
      return await response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/markets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/markets", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/wallet/balance"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      toast({
        title: `${data.bet.position === "yes" ? "Yes" : "No"} Bet Placed!`,
        description: `You bet ${betAmount} SOL at ${data.bet.probability}% probability.`,
      });
      setBetAmount("1"); // Reset bet amount
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

    if (!market) return;
    
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
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="bg-card border border-card-border rounded-lg p-8 shadow-xl animate-pulse">
            <div className="h-8 w-32 bg-muted rounded mb-4" />
            <div className="h-12 bg-muted rounded mb-8" />
            <div className="grid md:grid-cols-2 gap-8">
              <div className="h-48 bg-muted rounded" />
              <div className="h-48 bg-muted rounded" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !market) {
    return (
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center py-20">
          <h2 className="text-3xl font-bold text-foreground mb-4">Market Not Found</h2>
          <p className="text-muted-foreground mb-8">
            The market you're looking for doesn't exist.
          </p>
          <Link href="/">
            <Button variant="default" data-testid="button-back-home">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Markets
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const noProbability = 100 - market.probability;

  // Calculate potential winnings for a bet
  const calculatePotentialWinnings = (amount: number, position: "yes" | "no"): number | null => {
    if (amount <= 0 || isNaN(amount)) return null;

    const yesPool = parseFloat(market.yesPool || "0");
    const noPool = parseFloat(market.noPool || "0");
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
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <Link href="/" data-testid="button-back">
        <Button variant="ghost" className="mb-6 hover-elevate">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Markets
        </Button>
      </Link>

      <div className="max-w-4xl mx-auto">
        <div className="bg-card border border-card-border rounded-lg p-8 shadow-xl">
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Badge
                variant="secondary"
                className="bg-primary/20 text-primary border-primary/30 uppercase text-xs font-semibold tracking-wide"
                data-testid="badge-category"
              >
                {market.category}
              </Badge>
              {market.isPrivate === 1 && (
                <Badge variant="outline" className="bg-muted border-muted-foreground/20">
                  <Shield className="h-3 w-3 mr-1" />
                  Private Wager
                </Badge>
              )}
              {market.payoutType === "winner-takes-all" && (
                <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
                  Winner Takes All
                </Badge>
              )}
            </div>
            <h1 className="text-4xl font-bold text-foreground mb-4" data-testid="text-question">
              {market.question}
            </h1>
            
            {/* Show invite code for private wagers */}
            {market.isPrivate === 1 && market.inviteCode && (
              <Card className="p-4 bg-primary/5 border-primary/20 mb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Invite Code</p>
                    <code className="text-lg font-mono text-foreground">{market.inviteCode}</code>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(market.inviteCode!);
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
                        const inviteLink = `${window.location.origin}/wager/${market.inviteCode}`;
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
            <div className="bg-muted/50 rounded-lg p-6 border border-border">
              <div className="text-center">
                <p className="text-sm text-muted-foreground uppercase tracking-wide font-medium mb-2">
                  Yes Probability
                </p>
                <p className="text-6xl font-bold text-primary mb-4" data-testid="text-yes-probability">
                  {market.probability}%
                </p>
                <div className="w-full h-3 bg-background rounded-full overflow-hidden mb-4">
                  <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${market.probability}%` }}
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  Pool: <span className="font-semibold text-primary" data-testid="text-yes-pool">
                    {parseFloat(market.yesPool || "0").toFixed(4)} SOL
                  </span>
                </p>
              </div>
            </div>

            <div className="bg-muted/50 rounded-lg p-6 border border-border">
              <div className="text-center">
                <p className="text-sm text-muted-foreground uppercase tracking-wide font-medium mb-2">
                  No Probability
                </p>
                <p className="text-6xl font-bold text-destructive mb-4" data-testid="text-no-probability">
                  {noProbability}%
                </p>
                <div className="w-full h-3 bg-background rounded-full overflow-hidden mb-4">
                  <div
                    className="h-full bg-destructive rounded-full transition-all"
                    style={{ width: `${noProbability}%` }}
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  Pool: <span className="font-semibold text-destructive" data-testid="text-no-pool">
                    {parseFloat(market.noPool || "0").toFixed(4)} SOL
                  </span>
                </p>
              </div>
            </div>
          </div>

          <div className="border-t border-border pt-8">
            <h2 className="text-2xl font-bold text-foreground mb-6">Place Your Bet</h2>
            
            {/* Invite code input for private wagers (if user doesn't have access yet) */}
            {market.isPrivate === 1 && !market.inviteCode && (
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
                  <div className={`rounded-lg p-4 border transition-all ${
                    hoveredOption === "yes" 
                      ? "bg-primary/10 border-primary/20" 
                      : "bg-destructive/10 border-destructive/20"
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-sm font-medium ${
                        hoveredOption === "yes" ? "text-primary" : "text-destructive"
                      }`}>
                        If {hoveredOption.toUpperCase()} Wins:
                      </span>
                      {returnMultiplier && (
                        <span className={`text-xs px-2 py-1 rounded ${
                          hoveredOption === "yes"
                            ? "bg-primary/20 text-primary"
                            : "bg-destructive/20 text-destructive"
                        }`}>
                          {returnMultiplier}x return
                        </span>
                      )}
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">You win:</span>
                        <span className={`font-semibold ${
                          hoveredOption === "yes" ? "text-primary" : "text-destructive"
                        }`}>
                          {potentialWinnings.toFixed(4)} SOL
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Profit:</span>
                        <span className={`font-semibold ${potentialProfit! >= 0 ? 'text-green-500' : 'text-red-500'}`}>
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
                  variant="default"
                  className="h-auto py-6 text-lg font-semibold w-full"
                  onClick={() => handleBet("yes")}
                  disabled={placeBet.isPending || market.status !== "active"}
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
                  variant="destructive"
                  className="h-auto py-6 text-lg font-semibold w-full"
                  onClick={() => handleBet("no")}
                  disabled={placeBet.isPending || market.status !== "active"}
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
          {market.status === "resolved" ? (
            <div className="border-t border-border pt-8 space-y-6">
              <Card className="p-6 bg-muted/30">
                <div className="flex items-center justify-center gap-3">
                  <CheckCircle2 className="h-6 w-6 text-primary" />
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground font-medium mb-1">
                      Market Resolved
                    </p>
                    <p className="text-2xl font-bold text-foreground" data-testid="text-resolved-outcome">
                      Outcome: <span className={market.resolvedOutcome === "yes" ? "text-primary" : "text-destructive"}>
                        {market.resolvedOutcome?.toUpperCase()}
                      </span>
                    </p>
                  </div>
                </div>
              </Card>

              {/* Provably Fair Verification */}
              {market.commitmentHash && (
                <Card className="p-6 bg-primary/5 border-primary/20">
                  <div className="flex items-center gap-2 mb-4">
                    <Shield className="h-5 w-5 text-primary" />
                    <h3 className="text-lg font-semibold text-foreground">Provably Fair Verification</h3>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground mb-2 block">
                        Commitment Hash
                      </label>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 text-xs font-mono bg-muted p-3 rounded-lg break-all">
                          {market.commitmentHash}
                        </code>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            navigator.clipboard.writeText(market.commitmentHash!);
                            toast({ title: "Copied!", description: "Commitment hash copied to clipboard" });
                          }}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {market.commitmentSecret && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground mb-2 block">
                          Revealed Secret
                        </label>
                        <div className="flex items-center gap-2">
                          <code className="flex-1 text-xs font-mono bg-muted p-3 rounded-lg break-all">
                            {market.commitmentSecret}
                          </code>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              navigator.clipboard.writeText(market.commitmentSecret!);
                              toast({ title: "Copied!", description: "Secret copied to clipboard" });
                            }}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}

                    {market.commitmentHash && market.commitmentSecret && market.resolvedOutcome && (
                      <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {verificationResult === true ? (
                              <CheckCircle2 className="h-4 w-4 text-green-500" />
                            ) : verificationResult === false ? (
                              <XCircle className="h-4 w-4 text-red-500" />
                            ) : (
                              <Shield className="h-4 w-4 text-muted-foreground" />
                            )}
                            <span className={`text-sm font-medium ${
                              verificationResult === true ? "text-green-500" :
                              verificationResult === false ? "text-red-500" :
                              "text-muted-foreground"
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
                              if (!market.commitmentHash || !market.commitmentSecret || !market.resolvedOutcome || !id) return;
                              setIsVerifying(true);
                              try {
                                const isValid = await verifyCommitmentHash(
                                  market.resolvedOutcome as "yes" | "no" | "refunded",
                                  market.commitmentSecret,
                                  parseInt(id),
                                  market.commitmentHash
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
                          Verify by computing: SHA256(&quot;{market.resolvedOutcome}:{market.commitmentSecret}:{id}&quot;)
                        </p>
                        <p className="text-xs text-muted-foreground mt-1 font-mono">
                          Expected: {market.commitmentHash}
                        </p>
                      </div>
                    )}

                    <div className="pt-2 border-t border-border">
                      <Link href="/transparency">
                        <Button variant="outline" size="sm" className="w-full">
                          <Shield className="h-4 w-4 mr-2" />
                          View Full Transparency Page
                        </Button>
                      </Link>
                    </div>
                  </div>
                </Card>
              )}
            </div>
          ) : (
            (user?.isAdmin || (market.isPrivate === 1 && market.createdBy === user?.id)) && (
              <div className="border-t border-border pt-8">
                <h2 className="text-2xl font-bold text-foreground mb-6">
                  {market.isPrivate === 1 && market.createdBy === user?.id 
                    ? "Resolve Private Wager" 
                    : "Admin: Resolve Market"}
                </h2>
                <p className="text-muted-foreground mb-6">
                  {market.isPrivate === 1 && market.createdBy === user?.id
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
                  Resolving a market is permanent. Use "Refund All" for markets that cannot be determined.
                </p>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
