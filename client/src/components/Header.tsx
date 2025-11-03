import { Link, useLocation } from "wouter";
import { TrendingUp, Wallet, Bell, Plus, LogOut, Activity, Shield } from "lucide-react";
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
    refetchInterval: 10000,
  });

  // Get database balance
  const { data: balanceData } = useQuery<{ balance: string }>({
    queryKey: ["/api/wallet/balance"],
    enabled: !!user,
    retry: false,
    refetchInterval: 30000,
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
    <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-card/80 backdrop-blur-md shadow-lg">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-4">
          {/* Left: Logo and Navigation */}
          <div className="flex items-center gap-8">
            <Link href="/" data-testid="link-home">
              <div className="flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer">
                <TrendingUp className="h-6 w-6 text-primary" />
                <span className="text-xl font-bold text-foreground">PulseMarket</span>
              </div>
            </Link>

            <nav className="hidden md:flex items-center gap-1">
              <HowItWorksButton />
              <Link href="/" data-testid="link-markets">
                <div
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    location === "/"
                      ? "bg-primary/20 text-primary"
                      : "text-foreground/70 hover:text-foreground hover:bg-muted/50"
                  }`}
                >
                  Discover
                </div>
              </Link>
              <Link href="/portfolio" data-testid="link-portfolio">
                <div
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    location === "/portfolio"
                      ? "bg-primary/20 text-primary"
                      : "text-foreground/70 hover:text-foreground hover:bg-muted/50"
                  }`}
                >
                  Portfolio
                </div>
              </Link>
              <Link href="/activity" data-testid="link-activity">
                <div
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    location === "/activity"
                      ? "bg-primary/20 text-primary"
                      : "text-foreground/70 hover:text-foreground hover:bg-muted/50"
                  }`}
                >
                  Activity
                </div>
              </Link>
              {user?.isAdmin && (
                <Link href="/admin" data-testid="link-admin">
                  <div
                    className={`px-4 py-2 rounded-lg font-medium transition-all ${
                      location === "/admin"
                        ? "bg-primary/20 text-primary"
                        : "text-foreground/70 hover:text-foreground hover:bg-muted/50"
                    }`}
                  >
                    Admin
                  </div>
                </Link>
              )}
            </nav>
          </div>


          {/* Right: Actions */}
          <div className="flex items-center gap-3">
            <Link href="/deposit">
              <Button size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                Deposit
              </Button>
            </Link>

            {/* SOL Balance */}
            {wallet.connected && wallet.publicKey && (
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-lg border border-border/50">
                <img src="/solana.webp" alt="SOL" className="w-5 h-5 rounded-full object-cover" />
                <span className="text-sm font-medium text-foreground">
                  {(onChainBalance ?? 0).toFixed(2)}
                </span>
              </div>
            )}

            {/* Notifications */}
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
            </Button>

            {/* Wallet/User */}
            {wallet.connected ? (
              <div className="flex items-center gap-2">
                <WalletMultiButton className="!h-9 !rounded-lg" />
                {user && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleLogout}
                    className="hidden sm:flex"
                  >
                    <LogOut className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ) : (
              <WalletMultiButton className="!h-9 !rounded-lg" />
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
