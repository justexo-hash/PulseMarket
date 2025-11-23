"use client";

import Link from "next/link";
import Image from "next/image";
import { type Market } from "@shared/schema";

import { usePathname } from "next/navigation";
import { TrendingUp, Bell, Plus, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useSolanaConnection, getSOLBalance } from "@/lib/solana";
import HowItWorksButton from "@/components/HowItWorks";
import { useState } from "react";
import { useEffect } from "react";
import clsx from "clsx";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { MarketSearchBar } from "./Searchbar";
import { SearchCategories } from "./SearchCategories";

const NAV_LINKS = [
  { href: "/", label: "Discover" },
  { href: "/portfolio", label: "Portfolio", requiresAuth: true },
  { href: "/activity", label: "Activity" },
];

export function Header() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const wallet = useWallet();
  const connection = useSolanaConnection();
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const { data: onChainBalance } = useQuery({
    queryKey: ["wallet-balance", wallet.publicKey?.toBase58()],
    queryFn: async () => {
      if (!wallet.publicKey || !connection) return 0;
      return await getSOLBalance(connection, wallet.publicKey);
    },
    enabled: !!wallet.publicKey && !!connection,
    refetchInterval: 10000,
  });

  const { data: balanceData } = useQuery<{ balance: string }>({
    queryKey: ["/api/wallet/balance"],
    enabled: !!user,
    retry: false,
    refetchInterval: 30000,
  });

  const handleLogout = () => {
    logout();
    toast({
      title: "Logged Out",
      description: "You have been logged out successfully.",
    });
  };

  const truncateAddress = (address?: string) => {
    if (!address) return "";
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  return (
    <header className="sticky top-0 z-50 w-full bg-background">
      <div className="container mx-auto sm:px-6 md:px-0 border-b border-muted-foreground/20">
        <div className="flex h-16 items-center justify-between gap-3">
          <div className="flex items-center justify-center gap-6">
            <Link
              href="/"
              data-testid="link-home"
              className="flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer"
            >
              <img src="../logo-white.png" className="w-8 h-8 bg-secondary rounded-md" alt="" />
              <span className="text-xl font-bold text-foreground">
                PulseMarket
              </span>
            </Link>
            <MarketSearchBar/>
            <nav className="hidden md:flex items-center gap-1">
              <HowItWorksButton />
              {NAV_LINKS.filter(({ requiresAuth }) => {
                if (!requiresAuth) return true;
                return Boolean(user);
              }).map(({ href, label }) => (
                <Button asChild key={href} variant="ghost">
                  <Link href={href} data-testid={`link-${label.toLowerCase()}`}>
                    {label}
                  </Link>
                </Button>
              ))}
              {user && (
                <Button asChild variant="ghost">
                  <Link
                    href={`/profile/${user.username}`}
                    data-testid="link-profile"
                  >
                    Profile
                  </Link>
                </Button>
              )}
              {user?.isAdmin && (
                <Button asChild variant="ghost">
                  <Link href="/admin" data-testid="link-admin">
                    Admin
                  </Link>
                </Button>
              )}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            {/** LOGGED */}
            {wallet.connected && wallet.publicKey && (
              <>
                <Button variant="secondary" asChild>
                  <Link href="/deposit">Deposit</Link>
                </Button>
                <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-lg border border-border/50">
                  <Image
                    src="/solana.webp"
                    alt="SOL"
                    width={20}
                    height={20}
                    className="rounded-full object-cover"
                  />
                  <span className="text-sm font-medium text-foreground">
                    {(onChainBalance ?? 0).toFixed(2)}
                  </span>
                </div>

                <Button variant="ghost" size="icon">
                  <Bell className="h-5 w-5" />
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
                </Button>
              </>
            )}

            <Dialog>
              <DialogTrigger asChild>
                <Button variant="ghost">Log in</Button>
              </DialogTrigger>
              <DialogTrigger asChild>
                <Button>Sign Up</Button>
              </DialogTrigger>

              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Connect your Wallet</DialogTitle>
                  <DialogDescription>
                    Choose your preferred wallet provider to connect securely.
                  </DialogDescription>
                </DialogHeader>

                {isMounted ? (
                  <WalletMultiButton className="!h-9 !rounded-lg w-full" />
                ) : (
                  <Button
                    size="sm"
                    disabled
                    aria-hidden="true"
                    className="w-full"
                  >
                    Loading
                  </Button>
                )}

                {wallet.connected && user && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleLogout}
                    className="mt-2"
                  >
                    <LogOut className="h-4 w-4" />
                  </Button>
                )}
              </DialogContent>
            </Dialog>
          </div>
        </div>
        {/* Categories navigation (below navbar) */}
        <div className="hidden md:flex w-full mt-2">
          <SearchCategories />
        </div>
      </div>
    </header>
  );
}
