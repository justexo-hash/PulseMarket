import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, Plus, Wallet, AlertCircle, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { useWallet } from '@solana/wallet-adapter-react';
import { useSolanaConnection, sendSOLWithWallet } from "@/lib/solana";
import { PublicKey } from '@solana/web3.js';

// Treasury/escrow address for holding deposits
// In production, this would be a Program Derived Address (PDA) from a Solana program
const TREASURY_ADDRESS = import.meta.env.VITE_TREASURY_ADDRESS || "11111111111111111111111111111111"; // Placeholder - use actual treasury address

export function Deposit() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const wallet = useWallet();
  const connection = useSolanaConnection();
  const [amount, setAmount] = useState("0.1");
  const [txSignature, setTxSignature] = useState<string | null>(null);

  // Debug: Log connection endpoint
  if (connection) {
    console.log('[Deposit] Connection endpoint:', (connection as any).rpcEndpoint || 'Not accessible');
  }

  // Real blockchain deposit - sends SOL from wallet to treasury
  const blockchainDepositMutation = useMutation({
    mutationFn: async (solAmount: number) => {
      if (!wallet.publicKey || !wallet.sendTransaction || !connection) {
        throw new Error("Wallet not connected");
      }

      const treasuryPubkey = new PublicKey(TREASURY_ADDRESS);
      
      // Send SOL transaction
      const signature = await sendSOLWithWallet(
        connection,
        {
          publicKey: wallet.publicKey,
          sendTransaction: wallet.sendTransaction.bind(wallet),
        },
        treasuryPubkey,
        solAmount
      );

      // After blockchain transaction, update database
      // Include wallet address for wallet-based authentication
      await apiRequest("POST", "/api/wallet/deposit", {
        amount: solAmount.toString(),
        txSignature: signature,
        walletAddress: wallet.publicKey.toBase58(),
      });

      return signature;
    },
    onSuccess: (signature) => {
      setTxSignature(signature);
      queryClient.invalidateQueries({ queryKey: ["/api/wallet/balance"] });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["wallet-balance"] });
      
      const network = import.meta.env.VITE_SOLANA_NETWORK === "mainnet-beta" ? "" : "devnet.";
      const explorerUrl = `https://solscan.io/tx/${signature}?cluster=${network}`;
      
      toast({
        title: "Deposit Successful!",
        description: (
          <div>
            <p>Successfully sent {amount} SOL on-chain.</p>
            <a 
              href={explorerUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="underline text-primary mt-1 inline-flex items-center gap-1"
            >
              View on Solscan <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        ),
      });
      setAmount("0.1");
    },
    onError: (error: any) => {
      toast({
        title: "Deposit Failed",
        description: error.message || "Failed to deposit. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Simulated deposit (for users without wallet connection)
  const simulatedDepositMutation = useMutation({
    mutationFn: async (data: { amount: string }) => {
      return await apiRequest("POST", "/api/wallet/deposit", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/wallet/balance"] });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      toast({
        title: "Deposit Successful!",
        description: `Successfully deposited ${amount} SOL to your wallet.`,
      });
      setLocation("/portfolio");
    },
    onError: (error: any) => {
      toast({
        title: "Deposit Failed",
        description: error.message || "Failed to deposit. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const depositAmount = parseFloat(amount);
    if (isNaN(depositAmount) || depositAmount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid deposit amount greater than 0.",
        variant: "destructive",
      });
      return;
    }

    // Use blockchain deposit if wallet is connected, otherwise simulated
    if (wallet.connected && wallet.publicKey) {
      blockchainDepositMutation.mutate(depositAmount);
    } else if (user) {
      simulatedDepositMutation.mutate({ amount });
    } else {
      toast({
        title: "Authentication Required",
        description: "Please connect your wallet or log in to deposit funds.",
        variant: "destructive",
      });
    }
  };

  const isLoading = blockchainDepositMutation.isPending || simulatedDepositMutation.isPending;

  const quickAmounts = [10, 25, 50, 100];

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <Link href="/portfolio" data-testid="button-back">
        <Button variant="ghost" className="mb-6 hover-elevate">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Portfolio
        </Button>
      </Link>

      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">Deposit SOL</h1>
          <p className="text-muted-foreground text-lg">
            Add SOL to your wallet to start placing bets
          </p>
        </div>

        <Card className="p-8">
          {!wallet.connected && (
            <Alert className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Connect your Solana wallet to make real on-chain deposits, or continue with simulated deposits if you're logged in.
              </AlertDescription>
            </Alert>
          )}

          {wallet.connected && (
            <Alert className="mb-6 border-primary/20 bg-primary/5">
              <Wallet className="h-4 w-4 text-primary" />
              <AlertDescription>
                <strong>Real blockchain deposit:</strong> SOL will be sent from your connected wallet ({wallet.publicKey?.toBase58().slice(0, 8)}...) to the PulseMarket treasury.
              </AlertDescription>
            </Alert>
          )}

          {txSignature && (
            <Alert className="mb-6 border-primary/20 bg-primary/5">
              <AlertDescription>
                <strong>Transaction confirmed!</strong>{" "}
                <a 
                  href={`https://solscan.io/tx/${txSignature}${import.meta.env.VITE_SOLANA_NETWORK !== "mainnet-beta" ? "?cluster=devnet" : ""}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline text-primary inline-flex items-center gap-1"
                >
                  View on Solscan <ExternalLink className="h-3 w-3" />
                </a>
              </AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="amount" className="text-base font-semibold mb-2 block">
                Deposit Amount (SOL)
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  id="amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="text-lg"
                  placeholder="0.1"
                  data-testid="input-deposit-amount"
                  required
                  disabled={isLoading}
                />
                <span className="text-lg text-muted-foreground font-medium">SOL</span>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                {wallet.connected 
                  ? "This will send real SOL from your wallet to the PulseMarket treasury."
                  : "This is a simulated deposit. Connect your wallet for real blockchain transactions."}
              </p>
            </div>

            <div>
              <Label className="text-sm font-medium mb-2 block">Quick Amounts</Label>
              <div className="flex gap-2 flex-wrap">
                {quickAmounts.map((quickAmount) => (
                  <Button
                    key={quickAmount}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setAmount(quickAmount.toString())}
                    data-testid={`button-quick-${quickAmount}`}
                  >
                    {quickAmount} SOL
                  </Button>
                ))}
              </div>
            </div>

            <div className="pt-4">
              <Button
                type="submit"
                size="lg"
                className="w-full text-lg font-semibold h-auto py-4"
                disabled={isLoading || (!wallet.connected && !user)}
                data-testid="button-submit-deposit"
              >
                <Plus className="mr-2 h-5 w-5" />
                {isLoading 
                  ? (wallet.connected ? "Sending transaction..." : "Processing...")
                  : wallet.connected 
                    ? "Send SOL to Treasury"
                    : "Deposit SOL"}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}

