"use client";

import Link from "next/link";
import Image from "next/image";
import { MarketSearchBar } from "../Searchbar";
import { Button } from "@/components/ui/button";
import { CircleDollarSign, Menu } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { WalletDropdown } from "./WalletDropdown";
import { NotificationsDropdown } from "./NotificationsDropdown";
import FilterHeader from "./FilterHeader";
import type { HeaderProps } from "./types";
import { NAV_LINKS, filterNavLinks } from "./constants";

export function HeaderMobile({
  user,
  wallet,
  onChainBalance,
  platformBalance,
  solPriceUsd,
  isMounted,
  handleLogout,
}: HeaderProps) {
  const filteredNavLinks = filterNavLinks(NAV_LINKS, user);

  return (
    <header className="z-50 w-full border-b mb-4 sm:mb-6">
      <div className="container mx-auto px-4 pt-4 sm:pt-6 flex flex-col gap-4 sm:gap-6 mb-4 sm:mb-6">
        {/* Top row: Logo, notifications, menu */}
        <div className="flex items-center justify-between gap-4">
          {/* Logo */}
          <Link
            href="/"
            data-testid="link-home"
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-white.png" className="w-8 h-8" alt="Logo" />
            <span className="text-lg sm:text-xl font-bold text-secondary-foreground">
              Polymeme
            </span>
          </Link>

          {/* Right side: Notifications + Menu */}
          <div className="flex items-center gap-2">
            <NotificationsDropdown enabled={Boolean(user)} align="end" />

            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Open menu</span>
                </Button>
              </SheetTrigger>

              <SheetContent side="left" className="w-72 px-4 py-6">
                <div className="flex items-center justify-between mb-6">
                  <span className="text-lg font-semibold">Menu</span>
                </div>

                <div className="flex flex-col gap-6">
                  {/* Platform balance */}
                  <div className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-secondary/50 rounded-lg border border-border/50 w-full">
                      <Image
                        src="/solana.webp"
                        alt="SOL"
                        width={20}
                        height={20}
                        className="rounded-full object-cover"
                      />
                      <span className="text-sm font-bold text-secondary-foreground">
                        {(platformBalance ?? 0).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Navigation links */}
                  <nav className="flex flex-col gap-3">
                    <p className="text-sm text-muted-foreground font-medium">
                      Navigation
                    </p>
                    {filteredNavLinks.map(({ href, label }) => (
                      <Link
                        key={href}
                        href={href}
                        className="text-base py-2 font-medium hover:text-primary transition-colors"
                      >
                        {label}
                      </Link>
                    ))}
                  </nav>

                  {/* Profile section */}
                  <div className="flex flex-col gap-3">
                    <p className="text-sm text-muted-foreground font-medium">
                      Profile
                    </p>

                    <WalletDropdown
                      wallet={wallet}
                      isMounted={isMounted}
                      onChainBalance={onChainBalance}
                      solPriceUsd={solPriceUsd}
                      onDisconnect={handleLogout}
                    />

                    {user && (
                      <Link
                        href={`/profile/${user.username}`}
                        className="text-base py-2 font-medium hover:text-primary transition-colors"
                      >
                        Profile
                      </Link>
                    )}

                    {user?.isAdmin && (
                      <Link
                        href="/admin"
                        className="text-base py-2 font-medium hover:text-primary transition-colors"
                      >
                        Admin
                      </Link>
                    )}
                  </div>

                  {/* Deposit button */}
                  {user && wallet.connected && wallet.publicKey && (
                    <Link href="/deposit" className="w-full">
                      <Button variant="marketing" className="w-full gap-2">
                        <CircleDollarSign className="h-4 w-4" />
                        Deposit
                      </Button>
                    </Link>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        {/* Filter categories */}
        <FilterHeader />

        {/* Search bar */}
        <MarketSearchBar />
      </div>
    </header>
  );
}
