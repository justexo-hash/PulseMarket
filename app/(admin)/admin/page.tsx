"use client";

import Link from "next/link";
import { useQuery, useMutation } from "@tanstack/react-query";
import { type Market } from "@shared/schema";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { CheckCircle2, XCircle, DollarSign, Shield, Wallet, RefreshCw } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function AdminPanelPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const isAdmin = !!user?.isAdmin;

  const { data: markets = [], isLoading } = useQuery<Market[]>({
    queryKey: ["/api/markets"],
    enabled: isAdmin,
  });

  const {
    data: treasuryBalance,
    isLoading: isLoadingTreasury,
    refetch: refetchTreasury,
  } = useQuery<{
    balance: number;
    balanceFormatted: string;
    treasuryAddress: string | null;
    reserveAmount: number;
    availableForWithdrawal: number;
    availableForWithdrawalFormatted: string;
    error?: string;
  }>({
    queryKey: ["/api/admin/treasury-balance"],
    enabled: isAdmin,
    refetchInterval: 30000,
  });

  const resolveMarket = useMutation({
    mutationFn: async ({ marketId, outcome }: { marketId: number; outcome: "yes" | "no" }) => {
      const response = await apiRequest("POST", `/api/markets/${marketId}/resolve`, { outcome });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/markets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/activity"] });
      toast({
        title: "Market Resolved!",
        description: "The market has been resolved and payouts distributed.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to resolve market.",
        variant: "destructive",
      });
    },
  });

  const refundMarket = useMutation({
    mutationFn: async (marketId: number) => {
      const response = await apiRequest("POST", `/api/markets/${marketId}/refund`);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/markets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/activity"] });
      toast({
        title: "Market Refunded!",
        description: "All bets have been refunded.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to refund market.",
        variant: "destructive",
      });
    },
  });

  if (!isAdmin) {
    return (
      <div className="relative min-h-screen">
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/60 to-black/70" />
        <div className="relative z-10 container mx-auto py-12">
          <Card className="p-12 text-center bg-black/30 backdrop-blur-sm border-white/20">
            <Shield className="h-16 w-16 mx-auto mb-4 text-destructive" />
            <h1 className="text-3xl font-bold text-white mb-4">Access Denied</h1>
            <p className="text-white/70 text-lg">
              You need admin privileges to access this page.
            </p>
          </Card>
        </div>
      </div>
    );
  }

  const activeMarkets = markets.filter((m) => m.status === "active");

  if (isLoading) {
    return (
      <div className="relative min-h-screen">
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/60 to-black/70" />
        <div className="relative z-10 container mx-auto py-12">
          <h1 className="text-4xl font-bold text-white mb-8">Admin Panel</h1>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="p-6 animate-pulse h-32" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen">
      {/* Background Image with Dark Overlay */}
      <div 
        className="fixed inset-0 z-0"
        style={{
          backgroundImage: 'url(/IMG_8113.PNG)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/60 to-black/70" />
      </div>
      
      {/* Content */}
      <div className="relative z-10 container mx-auto py-12">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Shield className="h-8 w-8 text-secondary-foreground" />
            <h1 className="text-4xl font-bold text-white">Admin Panel</h1>
          </div>
          <p className="text-white/80 text-lg">
            Manage and resolve markets. Refund markets that cannot be determined.
          </p>
        </div>

        {/* Treasury Balance Card */}
        <Card className="p-6 bg-black/30 backdrop-blur-sm border-white/20 mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Wallet className="h-6 w-6 text-secondary-foreground" />
              <h2 className="text-2xl font-bold text-white">Treasury Balance</h2>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetchTreasury()}
              disabled={isLoadingTreasury}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingTreasury ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>

          {isLoadingTreasury ? (
            <div className="space-y-2">
              <div className="h-8 bg-white/10 rounded animate-pulse" />
              <div className="h-4 bg-white/10 rounded animate-pulse w-2/3" />
            </div>
          ) : treasuryBalance?.error ? (
            <div className="space-y-2">
              <p className="text-destructive font-semibold">Error: {treasuryBalance.error}</p>
              <p className="text-white/60 text-sm">
                Treasury keypair not configured. Set TREASURY_PRIVATE_KEY in your .env file.
              </p>
            </div>
          ) : treasuryBalance ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-white/60 mb-1">Total Balance (On-Chain)</p>
                <p className="text-3xl font-bold text-secondary-foreground">
                  {treasuryBalance.balanceFormatted} SOL
                </p>
              </div>
              <div>
                <p className="text-sm text-white/60 mb-1">Reserve Amount</p>
                <p className="text-2xl font-bold text-white/80">
                  {treasuryBalance.reserveAmount.toFixed(4)} SOL
                </p>
                <p className="text-xs text-white/50 mt-1">Reserved for transaction fees</p>
              </div>
              <div>
                <p className="text-sm text-white/60 mb-1">Available for Withdrawals</p>
                <p className={`text-2xl font-bold ${
                  treasuryBalance.availableForWithdrawal > 0 ? 'text-green-400' : 'text-destructive'
                }`}>
                  {treasuryBalance.availableForWithdrawalFormatted} SOL
                </p>
                <p className="text-xs text-white/50 mt-1">
                  {treasuryBalance.availableForWithdrawal <= 0 
                    ? '⚠️ Fund treasury to enable withdrawals'
                    : 'Available after reserve'}
                </p>
              </div>
            </div>
          ) : null}

          {treasuryBalance?.treasuryAddress && (
            <div className="mt-4 pt-4 border-t border-white/10">
              <p className="text-xs text-white/60 mb-1">Treasury Address</p>
              <p className="text-sm font-mono text-white/80 break-all">
                {treasuryBalance.treasuryAddress}
              </p>
              <p className="text-xs text-white/50 mt-2">
                Send SOL to this address to fund the treasury
              </p>
            </div>
          )}
        </Card>

        {activeMarkets.length === 0 ? (
          <Card className="p-12 text-center bg-black/30 backdrop-blur-sm border-white/20">
            <p className="text-xl text-white mb-2">No active markets to manage</p>
            <p className="text-white/70">All markets have been resolved or refunded.</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {activeMarkets.map((market) => {
              const volume = parseFloat(market.yesPool) + parseFloat(market.noPool);
              const isExpiringSoon = market.expiresAt 
                ? new Date(market.expiresAt).getTime() - Date.now() < 24 * 60 * 60 * 1000
                : false;
              
              return (
                <Card key={market.id} className="p-6 bg-black/30 backdrop-blur-sm border-white/20">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-start gap-3 mb-3">
                        <Badge variant="secondary" className="bg-primary/20 text-secondary-foreground">
                          {market.category}
                        </Badge>
                        {market.expiresAt && (
                          <Badge variant={isExpiringSoon ? "destructive" : "outline"}>
                            Expires: {formatDistanceToNow(new Date(market.expiresAt), { addSuffix: true })}
                          </Badge>
                        )}
                        <Badge variant="outline" className="bg-primary/10 text-secondary-foreground">
                          Volume: {volume.toFixed(2)} SOL
                        </Badge>
                      </div>
                      <h3 className="text-xl font-semibold text-white mb-2">
                        {market.question}
                      </h3>
                      <div className="flex items-center gap-4 text-sm text-white/60">
                        <span>Yes: {parseFloat(market.yesPool || "0").toFixed(2)} SOL</span>
                        <span>No: {parseFloat(market.noPool || "0").toFixed(2)} SOL</span>
                        <span>Probability: {market.probability}%</span>
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-2 min-w-[280px]">
                      <div className="grid grid-cols-3 gap-2">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="default"
                              className="text-xs"
                              disabled={resolveMarket.isPending}
                            >
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              YES
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Resolve Market as YES?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will resolve the market as YES and distribute payouts to YES bettors. 
                                This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => resolveMarket.mutate({ marketId: market.id, outcome: "yes" })}
                                className="bg-primary"
                              >
                                Resolve YES
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="destructive"
                              className="text-xs"
                              disabled={resolveMarket.isPending}
                            >
                              <XCircle className="h-3 w-3 mr-1" />
                              NO
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Resolve Market as NO?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will resolve the market as NO and distribute payouts to NO bettors. 
                                This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => resolveMarket.mutate({ marketId: market.id, outcome: "no" })}
                                className="bg-destructive"
                              >
                                Resolve NO
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs"
                              disabled={refundMarket.isPending}
                            >
                              <DollarSign className="h-3 w-3 mr-1" />
                              Refund
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Refund All Bets?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will refund all bets for this market. Use this for markets that cannot be determined.
                                This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => refundMarket.mutate(market.id)}
                                className="bg-destructive"
                              >
                                Refund All Bets
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                      <Link href={market.isPrivate === 1 && market.inviteCode ? `/wager/${market.inviteCode}` : `/markets/${market.slug || market.id}`}>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full text-xs"
                        >
                          View Details
                        </Button>
                      </Link>
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

