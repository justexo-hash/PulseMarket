"use client";

// HEADER COMPONENT — Handles navigation, searchbar, wallet connection, and mobile/desktop menus

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

import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu, X } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuGroup,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";

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

// Static navigation links for both desktop and mobile menus
const NAV_LINKS = [
  { href: "/", label: "Discover" },
  { href: "/portfolio", label: "Portfolio", requiresAuth: true },
  { href: "/activity", label: "Activity" },
];

// Main Header component — responsive navbar + wallet + search + menus
export function Header() {
  // AUTH / WALLET / QUERY HOOKS
  // - user authentication
  // - wallet connection
  // - on-chain balance fetching
  // - mounting state (to avoid hydration issues with WalletMultiButton)
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

  // =========================
  // HEADER LAYOUT STRUCTURE
  // =========================
  return (
    // Top-level sticky header wrapper
    <header className="sticky top-0 z-50 w-full">
      <div className="container mx-auto sm:px-6 lg:px-0 border-b border-muted-foreground/20 px-3 md:px-0">
        {/* LEFT SIDE: Logo + Searchbar + Mobile Burger Menu */}
        <div className="flex h-16 items-center justify-between gap-3">
          <div className="flex justify-between md:justify-start w-full gap-3">

          {/* App logo linking to homepage */}
          <Link
              href="/"
              data-testid="link-home"
              className="flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer"
            >
              <img src="../logo-white.png" className="w-8 h-8" alt="" />
              <span className="text-xl font-bold text-foreground">
                PulseMarket
              </span>
            </Link>
          {/* MOBILE NAVIGATION (Sheet Menu) */}
          <div className="flex md:hidden items-center">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>

              <SheetContent side="left" className="w-72 px-4 py-6">
                <div className="flex items-center justify-between mb-6">
                  <span className="text-lg font-semibold">Menu</span>
                </div>

                <div className="flex flex-col gap-4">
                  {NAV_LINKS.filter(({ requiresAuth }) => {
                    if (!requiresAuth) return true;
                    return Boolean(user);
                  }).map(({ href, label }) => (
                    <Link key={href} href={href} className="text-base py-2 font-medium">
                      {label}
                    </Link>
                  ))}

                  {user && (
                    <Link
                      href={`/profile/${user.username}`}
                      className="text-base py-2 font-medium"
                    >
                      Profile
                    </Link>
                  )}

                  {user?.isAdmin && (
                    <Link href="/admin" className="text-base py-2 font-medium">
                      Admin
                    </Link>
                  )}

                  {!wallet.connected && (
                    <>
                      <Button variant="ghost" className="w-full">Log in</Button>
                      <Button className="w-full">Sign Up</Button>
                    </>
                  )}

                  {wallet.connected && (
                    <Button
                      onClick={handleLogout}
                      className="w-full"
                      variant="ghost"
                    >
                      Log out
                    </Button>
                  )}

                  {/* Extra buttons from header */}
                  <Link href="/deposit" className="w-full">
                    <Button variant="secondary" className="w-full">
                      Deposit
                    </Button>
                  </Link>

                  <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-lg border border-border/50 w-full">
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

                  <Button variant="ghost" className="w-full flex justify-start gap-2">
                    <Bell className="h-5 w-5" />
                    Notifications
                  </Button>
                <HowItWorksButton/>
                </div>
              </SheetContent>
            </Sheet>
          </div>
   
            {/* Searchbar — desktop & mobile responsive */}
            <MarketSearchBar/>
                  <div className="hidden lg:flex">
            <HowItWorksButton/>
                  </div>
                    
            </div>

          {/* RIGHT SIDE: Wallet actions, notifications, login/signup dialog, and desktop menu */}
          <div className="hidden md:flex items-center gap-3">
            {/* If wallet is connected, display deposit + balance + notifications */}
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

            {/* LOGIN / SIGNUP WALLET MODAL
            Uses Dialog + WalletMultiButton */}
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
            {/* DESKTOP DROPDOWN MENU */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="hidden md:flex">
                  <Menu className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent
                className="w-56 bg-secondary text-primary-foreground border-none shadow-lg"
                align="end"
              >
                <DropdownMenuLabel className="text-foreground">Navigation</DropdownMenuLabel>
                <DropdownMenuGroup>
                  {NAV_LINKS.filter(({ requiresAuth }) => {
                    if (!requiresAuth) return true;
                    return Boolean(user);
                  }).map(({ href, label }) => (
                    <DropdownMenuItem className="hover:bg-primary/20 transition-colors" asChild key={href}>
                      <Link
                        href={href}
                        className="text-base px-3 py-2 text-primary/50 hover:text-primary !cursor-pointer font-medium"
                      >
                        {label}
                      </Link>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuGroup>

                {user && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel className="text-foreground">Account</DropdownMenuLabel>
                    <DropdownMenuItem asChild>
                      <Link
                        href={`/profile/${user.username}`}
                        className="text-base px-3 py-2 text-primary/50 hover:text-primary !cursor-pointer font-medium"
                      >
                        Profile
                      </Link>
                    </DropdownMenuItem>
                  </>
                )}

                {user?.isAdmin && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel>Admin</DropdownMenuLabel>
                    <DropdownMenuItem asChild>
                      <Link
                        href="/admin"
                        className="text-base px-3 py-2 text-primary/50 hover:text-primary !cursor-pointer font-medium"
                      >
                        Admin
                      </Link>
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        {/* SECONDARY NAVIGATION (Categories) — only visible on desktop */}
        <div className="hidden md:flex w-full mt-2">
          <SearchCategories />
        </div>
      </div>
    </header>
  );
}
