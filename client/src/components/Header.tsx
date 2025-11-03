import { Link, useLocation } from "wouter";
import { TrendingUp, Wallet, LogOut, Activity, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useSolanaConnection, getSOLBalance } from "@/lib/solana";
import HowItWorksButton from "@/components/HowItWorks";

export function Header() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const wallet = useWallet();
  const connection = useSolanaConnection();
  const [location] = useLocation();

  // Get on-chain SOL balance if wallet is connected
  const { data: onChainBalance } = useQuery({
    queryKey: ["wallet-balance", wallet.publicKey?.toBase58()],
    queryFn: async () => {
      if (!wallet.publicKey || !connection) return 0;
      return await getSOLBalance(connection, wallet.publicKey);
    },
    enabled: !!wallet.publicKey && !!connection,
    refetchInterval: 10000, // Refetch every 10 seconds
  });

  // Get database balance (deposited balance for betting)
  const { data: balanceData } = useQuery<{ balance: string }>({
    queryKey: ["/api/wallet/balance"],
    enabled: !!user,
    retry: false,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const databaseBalance = balanceData?.balance || user?.balance || "0";
  const depositedBalance = parseFloat(databaseBalance);

  const handleLogout = () => {
    logout();
    toast({
      title: "Logged Out",
      description: "You have been logged out successfully.",
    });
  };

  const truncateAddress = (address?: string) => {
    if (!address) return '';
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-card shadow-lg">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" data-testid="link-home">
            <div className="flex items-center gap-2 hover-elevate rounded-lg px-3 py-2 transition-all cursor-pointer">
              <TrendingUp className="h-7 w-7 text-primary" />
              <span className="text-2xl font-bold text-foreground">PulseMarket</span>
            </div>
          </Link>

          <nav className="flex items-center gap-2">
            <Link href="/" data-testid="link-markets">
              <div
                className={`px-4 py-2 rounded-lg font-semibold transition-all hover-elevate ${
                  location === "/"
                    ? "bg-primary text-primary-foreground"
                    : "text-foreground"
                }`}
              >
                Markets
              </div>
            </Link>
            <Link href="/activity" data-testid="link-activity">
              <div
                className={`px-4 py-2 rounded-lg font-semibold transition-all hover-elevate flex items-center gap-2 ${
                  location === "/activity"
                    ? "bg-primary text-primary-foreground"
                    : "text-foreground"
                }`}
              >
                <Activity className="h-4 w-4" />
                Activity
              </div>
            </Link>
            <Link href="/transparency" data-testid="link-transparency">
              <div
                className={`px-4 py-2 rounded-lg font-semibold transition-all hover-elevate flex items-center gap-2 ${
                  location === "/transparency"
                    ? "bg-primary text-primary-foreground"
                    : "text-foreground"
                }`}
              >
                <Shield className="h-4 w-4" />
                Transparency
              </div>
            </Link>
            <Link href="/portfolio" data-testid="link-portfolio">
              <div
                className={`px-4 py-2 rounded-lg font-semibold transition-all hover-elevate flex items-center gap-2 ${
                  location === "/portfolio"
                    ? "bg-primary text-primary-foreground"
                    : "text-foreground"
                }`}
              >
                <Wallet className="h-4 w-4" />
                Portfolio
              </div>
            </Link>
            <Link href="/create" data-testid="link-create-market">
              <div
                className={`px-4 py-2 rounded-lg font-semibold transition-all hover-elevate ${
                  location === "/create"
                    ? "bg-primary text-primary-foreground"
                    : "text-foreground"
                }`}
              >
                Create Market
              </div>
            </Link>
            <HowItWorksButton />
            {user?.isAdmin && (
              <Link href="/admin" data-testid="link-admin">
                <div
                  className={`px-4 py-2 rounded-lg font-semibold transition-all hover-elevate flex items-center gap-2 ${
                    location === "/admin"
                      ? "bg-primary text-primary-foreground"
                      : "text-foreground"
                  }`}
                >
                  <Shield className="h-4 w-4" />
                  Admin
                </div>
              </Link>
            )}

            <div className="flex items-center gap-2 ml-4 border-l border-border pl-4">
              {/* Solana Wallet Connection Button */}
              <WalletMultiButton className="!h-9 !rounded-lg" />
              
              {/* Show compact balances when wallet is connected */}
              {wallet.connected && wallet.publicKey && (
                <div className="px-3 py-2 bg-muted rounded-lg border border-border text-sm">
                  <div className="flex items-center gap-2">
                    <Wallet className="h-4 w-4 text-primary" />
                    <span className="text-foreground" data-testid="text-onchain-balance">
                      {(onChainBalance ?? 0).toFixed(4)} SOL
                    </span>
                    <span className="text-muted-foreground">|
                    </span>
                    <span className="text-primary font-semibold" data-testid="text-deposited-balance">
                      {depositedBalance.toFixed(4)} SOL
                    </span>
                  </div>
                </div>
              )}
              
              {/* Show database balance if user exists but wallet not connected */}
              {!wallet.connected && user && (
                <>
                  <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-lg">
                    <Wallet className="h-4 w-4 text-primary" />
                    <span className="font-mono text-sm" data-testid="text-wallet-address">
                      {truncateAddress(user.walletAddress)}
                    </span>
                  </div>
                  <div className="px-3 py-2 bg-primary/10 rounded-lg border border-primary/20">
                    <div className="flex flex-col items-end">
                      <span className="text-xs text-primary/70">Deposited</span>
                      <span className="text-sm font-semibold text-primary" data-testid="text-balance">
                        {depositedBalance.toFixed(4)} SOL
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleLogout}
                    data-testid="button-logout"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Logout
                  </Button>
                </>
              )}
            </div>
          </nav>
        </div>
      </div>
    </header>
  );
}
