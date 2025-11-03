import { useQuery, useMutation } from "@tanstack/react-query";
import { type Market } from "@shared/schema";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { CheckCircle2, XCircle, DollarSign, Shield } from "lucide-react";
import { Link, useLocation } from "wouter";
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

export function AdminPanel() {
  const { user } = useAuth();
  const { toast } = useToast();

  // Check if user is admin
  if (!user?.isAdmin) {
    return (
      <div className="relative min-h-screen">
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/60 to-black/70" />
        <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 py-12">
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

  const { data: markets = [], isLoading } = useQuery<Market[]>({
    queryKey: ["/api/markets"],
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

  // Filter to show only active markets (that need resolution)
  const activeMarkets = markets.filter(m => m.status === "active");

  if (isLoading) {
    return (
      <div className="relative min-h-screen">
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/60 to-black/70" />
        <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 py-12">
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
      <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Shield className="h-8 w-8 text-primary" />
            <h1 className="text-4xl font-bold text-white">Admin Panel</h1>
          </div>
          <p className="text-white/80 text-lg">
            Manage and resolve markets. Refund markets that cannot be determined.
          </p>
        </div>

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
                        <Badge variant="secondary" className="bg-primary/20 text-primary">
                          {market.category}
                        </Badge>
                        {market.expiresAt && (
                          <Badge variant={isExpiringSoon ? "destructive" : "outline"}>
                            Expires: {formatDistanceToNow(new Date(market.expiresAt), { addSuffix: true })}
                          </Badge>
                        )}
                        <Badge variant="outline" className="bg-primary/10 text-primary">
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
                      <Link href={market.isPrivate === 1 && market.inviteCode ? `/wager/${market.inviteCode}` : `/market/${market.slug || market.id}`}>
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

