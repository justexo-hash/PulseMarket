"use client";

import Link from "next/link";
import Image from "next/image";
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
import { useEffect, useState } from "react";
import clsx from "clsx";

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
  const pathname = usePathname();
  const [isMounted, setIsMounted] = useState(false);

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

  useEffect(() => {
    setIsMounted(true);

    const removeZeroTextNodes = () => {
      const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        null
      );
      const textNodes: Text[] = [];
      let node: Node | null;
      while ((node = walker.nextNode())) {
        if (node.textContent?.trim() === "0") {
          textNodes.push(node as Text);
        }
      }
      textNodes.forEach((textNode) => {
        const parent = textNode.parentElement;
        if (parent) {
          const text = parent.textContent || "";
          if (text.includes("Activity") || text.includes("Private Wager")) {
            textNode.remove();
          }
        }
      });
    };

    removeZeroTextNodes();
    const timeout = setTimeout(removeZeroTextNodes, 100);
    return () => clearTimeout(timeout);
  }, []);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-card/80 backdrop-blur-md shadow-lg">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-4">
          <div className="flex items-center gap-8">
            <Link
              href="/"
              data-testid="link-home"
              className="flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer"
            >
              <TrendingUp className="h-6 w-6 text-primary" />
              <span className="text-xl font-bold text-foreground">
                PulseMarket
              </span>
            </Link>

            <nav className="hidden md:flex items-center gap-1">
              <HowItWorksButton />
              {NAV_LINKS.filter(({ requiresAuth }) => {
                if (!requiresAuth) return true;
                return Boolean(user);
              }).map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  data-testid={`link-${label.toLowerCase()}`}
                  className={clsx(
                    "px-4 py-2 rounded-lg font-medium transition-all",
                    pathname === href
                      ? "bg-primary/20 text-primary"
                      : "text-foreground/70 hover:text-foreground hover:bg-muted/50"
                  )}
                >
                  {label}
                </Link>
              ))}
              {user && (
                <Link
                  href={`/profile/${user.username}`}
                  data-testid="link-profile"
                  className={clsx(
                    "px-4 py-2 rounded-lg font-medium transition-all",
                    pathname?.startsWith("/profile/")
                      ? "bg-primary/20 text-primary"
                      : "text-foreground/70 hover:text-foreground hover:bg-muted/50"
                  )}
                >
                  Profile
                </Link>
              )}
              {user?.isAdmin && (
                <Link
                  href="/admin"
                  data-testid="link-admin"
                  className={clsx(
                    "px-4 py-2 rounded-lg font-medium transition-all",
                    pathname === "/admin"
                      ? "bg-primary/20 text-primary"
                      : "text-foreground/70 hover:text-foreground hover:bg-muted/50"
                  )}
                >
                  Admin
                </Link>
              )}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <Button size="sm" asChild className="gap-2">
              <Link href="/deposit">
                <Plus className="h-4 w-4" />
                Deposit
              </Link>
            </Button>

            {wallet.connected && wallet.publicKey && (
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
            )}

            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
            </Button>

            {wallet.connected ? (
              <div className="flex items-center gap-2">
                {isMounted ? (
                  <WalletMultiButton className="!h-9 !rounded-lg" />
                ) : (
                  <Button
                    size="sm"
                    disabled
                    className="!h-9 !rounded-lg opacity-50"
                    aria-hidden="true"
                  >
                    Loading
                  </Button>
                )}
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
            ) : isMounted ? (
              <WalletMultiButton className="!h-9 !rounded-lg" />
            ) : (
              <Button
                size="sm"
                disabled
                className="!h-9 !rounded-lg opacity-50"
                aria-hidden="true"
              >
                Connect Wallet
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

