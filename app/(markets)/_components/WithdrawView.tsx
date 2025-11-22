"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, Minus, Wallet, AlertCircle, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { useWallet } from '@solana/wallet-adapter-react';

type WithdrawEnvKey = "SOLANA_NETWORK";

const nextWithdrawEnv: Record<WithdrawEnvKey, string | undefined> = {
  SOLANA_NETWORK:
    typeof process !== "undefined"
      ? process.env.NEXT_PUBLIC_SOLANA_NETWORK ?? process.env.SOLANA_NETWORK
      : undefined,
};

const getEnvVar = (key: WithdrawEnvKey) => {
  try {
    const viteEnv =
      typeof import.meta !== "undefined" ? (import.meta as any).env : undefined;
    if (viteEnv) {
      return viteEnv[`VITE_${key}`];
    }
  } catch {
    // ignore
  }
  return nextWithdrawEnv[key];
};

const SOLANA_NETWORK = getEnvVar("SOLANA_NETWORK") || "mainnet-beta";

export function WithdrawView() {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();
  const wallet = useWallet();
  const hasWithdrawAccess = Boolean(user && wallet.connected && wallet.publicKey);
  const [amount, setAmount] = useState("");
  const [txSignature, setTxSignature] = useState<string | null>(null);

  // Get user balance
  const { data: balanceData } = useQuery<{ balance: string }>({
    queryKey: ["/api/wallet/balance"],
    enabled: hasWithdrawAccess,
  });

  const currentBalance = hasWithdrawAccess
    ? balanceData
      ? parseFloat(balanceData.balance || "0")
      : 0
    : 0;

  // Withdrawal mutation
  const withdrawMutation = useMutation({
    mutationFn: async (solAmount: number) => {
      if (!wallet.publicKey) {
        throw new Error("Wallet not connected");
      }

      const response = await apiRequest("POST", "/api/wallet/withdraw", {
        amount: solAmount.toString(),
        walletAddress: wallet.publicKey.toBase58(),
      });

      return await response.json();
    },
    onSuccess: (data) => {
      if (data.withdrawalVerification?.txSignature) {
        setTxSignature(data.withdrawalVerification.txSignature);
      }
      
      queryClient.invalidateQueries({ queryKey: ["/api/wallet/balance"] });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["wallet-balance"] });
      
      const network = SOLANA_NETWORK === "mainnet-beta" ? "" : "devnet.";
      const explorerUrl = data.withdrawalVerification?.txSignature 
        ? `https://solscan.io/tx/${data.withdrawalVerification.txSignature}?cluster=${network}`
        : null;
      
      const actualReceived = data.withdrawalVerification?.actualPayoutAmount || parseFloat(amount);
      const reserve = data.withdrawalVerification?.reserveAmount || 0;
      
      toast({
        title: "Withdrawal Successful!",
        description: (
          <div>
            <p>Withdrew {amount} SOL from your portfolio.</p>
            {reserve > 0 && (
              <p className="text-sm mt-1">
                Received: {actualReceived.toFixed(6)} SOL ({reserve.toFixed(6)} SOL reserved for treasury rent/fees)
              </p>
            )}
            {explorerUrl && (
              <a 
                href={explorerUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="underline text-primary mt-1 inline-flex items-center gap-1"
              >
                View on Solscan <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        ),
      });
      setAmount("");
      router.push("/portfolio");
    },
    onError: (error: any) => {
      toast({
        title: "Withdrawal Failed",
        description: error.message || "Failed to withdraw. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const withdrawAmount = parseFloat(amount);
    if (isNaN(withdrawAmount) || withdrawAmount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid withdrawal amount greater than 0.",
        variant: "destructive",
      });
      return;
    }

    if (withdrawAmount > currentBalance) {
      toast({
        title: "Insufficient Balance",
        description: `You have ${currentBalance.toFixed(4)} SOL available. Please enter a smaller amount.`,
        variant: "destructive",
      });
      return;
    }

    if (!wallet.connected || !wallet.publicKey) {
      toast({
        title: "Wallet Required",
        description: "Please connect your Solana wallet to withdraw funds.",
        variant: "destructive",
      });
      return;
    }

    withdrawMutation.mutate(withdrawAmount);
  };

  const isLoading = withdrawMutation.isPending;

  // Calculate quick amounts based on balance
  const getQuickAmounts = () => {
    if (currentBalance === 0) return [];
    const amounts: number[] = [];
    if (currentBalance >= 0.1) amounts.push(0.1);
    if (currentBalance >= 0.5) amounts.push(0.5);
    if (currentBalance >= 1) amounts.push(1);
    if (currentBalance >= 5) amounts.push(5);
    if (currentBalance > amounts[amounts.length - 1]) {
      // Add max amount (rounded down)
      amounts.push(Math.floor(currentBalance * 10) / 10);
    }
    return amounts;
  };

  if (!hasWithdrawAccess) {
    return (
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-2xl mx-auto text-center space-y-6 py-24">
          <h1 className="text-4xl font-bold text-foreground">Withdrawals Restricted</h1>
          <p className="text-muted-foreground text-lg">
            To withdraw SOL you need to be logged in and have your Solana wallet connected. Connect your wallet using the button in the header to continue.
          </p>
          <Button onClick={() => router.push("/")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Markets
          </Button>
        </div>
      </div>
    );
  }

  const quickAmounts = getQuickAmounts();

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <Button variant="ghost" className="mb-6 hover-elevate" asChild>
        <Link href="/portfolio" data-testid="button-back">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Portfolio
        </Link>
      </Button>

      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">Withdraw SOL</h1>
          <p className="text-muted-foreground text-lg">
            Withdraw SOL from your portfolio to your connected wallet
          </p>
        </div>

        <Card className="p-8">
          {!wallet.connected && (
            <Alert className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Connect your Solana wallet to withdraw funds. Funds will be sent directly to your connected wallet.
              </AlertDescription>
            </Alert>
          )}

          {wallet.connected && (
            <Alert className="mb-6 border-primary/20 bg-primary/5">
              <Wallet className="h-4 w-4 text-primary" />
              <AlertDescription>
                <strong>Withdrawal:</strong> SOL will be sent from the PulseMarket treasury to your connected wallet ({wallet.publicKey?.toBase58().slice(0, 8)}...).
              </AlertDescription>
            </Alert>
          )}

          {currentBalance === 0 && (
            <Alert className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                You have no funds in your portfolio. Deposit SOL first to start betting.
              </AlertDescription>
            </Alert>
          )}

          {txSignature && (
            <Alert className="mb-6 border-primary/20 bg-primary/5">
              <AlertDescription>
                <strong>Transaction confirmed!</strong>{" "}
                <a 
                  href={`https://solscan.io/tx/${txSignature}${
                    SOLANA_NETWORK !== "mainnet-beta" ? "?cluster=devnet" : ""
                  }`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline text-primary inline-flex items-center gap-1"
                >
                  View on Solscan <ExternalLink className="h-3 w-3" />
                </a>
              </AlertDescription>
            </Alert>
          )}

          <div className="mb-6 p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Available Balance</span>
              <span className="text-2xl font-bold text-foreground">{currentBalance.toFixed(4)} SOL</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="amount" className="text-base font-semibold mb-2 block">
                Withdrawal Amount (SOL)
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  id="amount"
                  type="number"
                  min="0"
                  step="0.01"
                  max={currentBalance}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="text-lg"
                  placeholder="0.1"
                  data-testid="input-withdraw-amount"
                  required
                  disabled={isLoading || currentBalance === 0}
                />
                <span className="text-lg text-muted-foreground font-medium">SOL</span>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Funds will be sent directly to your connected wallet. A small amount (~0.001 SOL) will be reserved in the treasury for rent and transaction fees.
              </p>
            </div>

            {quickAmounts.length > 0 && (
              <div>
                <Label className="text-sm font-medium mb-2 block">Quick Amounts</Label>
                <div className="flex gap-2 flex-wrap">
                  {quickAmounts.map((quickAmount) => (
                    <Button
                      key={quickAmount}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setAmount(quickAmount.toFixed(4))}
                      data-testid={`button-quick-${quickAmount}`}
                    >
                      {quickAmount} SOL
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {currentBalance > 0 && (
              <div className="pt-2 pb-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="lg"
                  className="w-full"
                  onClick={() => {
                    const withdrawAmount = currentBalance;
                    if (withdrawAmount > 0 && !isLoading && wallet.connected) {
                      withdrawMutation.mutate(withdrawAmount);
                    }
                  }}
                  disabled={isLoading || !wallet.connected}
                  data-testid="button-withdraw-all"
                >
                  <Minus className="mr-2 h-4 w-4" />
                  Withdraw All ({currentBalance.toFixed(4)} SOL)
                </Button>
              </div>
            )}

            <div className="pt-4">
              <Button
                type="submit"
                size="lg"
                className="w-full text-lg font-semibold h-auto py-4"
                disabled={isLoading || !wallet.connected || currentBalance === 0}
                data-testid="button-submit-withdraw"
              >
                <Minus className="mr-2 h-5 w-5" />
                {isLoading 
                  ? "Processing withdrawal..."
                  : "Withdraw SOL"}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}

