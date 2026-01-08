"use client";

import Link from "next/link";
import { MarketSearchBar } from "../Searchbar";
import { Button } from "@/components/ui/button";
import { Plus, Users } from "lucide-react";
import { WalletDropdown } from "./WalletDropdown";
import FilterHeader from "./FilterHeader";
import { NotificationsDropdown } from "./NotificationsDropdown";
import type { HeaderProps } from "./types";

export function HeaderDesktop({
  user,
  wallet,
  onChainBalance,
  solPriceUsd,
  isMounted,
  handleLogout,
}: HeaderProps) {
  return (
    <header className="z-50 w-full mb-6">
      <div className="px-4 xl:px-6 pt-4 xl:pt-6 flex flex-col gap-4 xl:gap-6 mb-4 xl:mb-6">
        {/* Main header row */}
        <div className="flex items-center justify-between gap-3">
          {/* Left side: Searchbar */}
          <div className="flex-1 max-w-2xl">
            <MarketSearchBar />
          </div>

          {/* Right side: Actions */}
          <div className="flex items-center gap-2 xl:gap-3">
            {user && (
              <>
                {user.isAdmin && (
                  <Button size="sm" className="gap-2 hidden lg:flex" asChild>
                    <Link href="/create">
                      <Plus className="h-4 w-4" />
                      <span className="hidden xl:inline">Create Market</span>
                    </Link>
                  </Button>
                )}

                <Button
                  size="sm"
                  variant="outline"
                  className="gap-2 hidden lg:flex"
                  asChild
                >
                  <Link href="/create">
                    <Users className="h-4 w-4" />
                    <span className="hidden xl:inline">Private Wager</span>
                  </Link>
                </Button>
              </>
            )}

            <WalletDropdown
              wallet={wallet}
              isMounted={isMounted}
              onChainBalance={onChainBalance}
              solPriceUsd={solPriceUsd}
              onDisconnect={handleLogout}
            />

            <NotificationsDropdown enabled={Boolean(user)} align="end" />
          </div>
        </div>

        {/* Filter categories */}
        <FilterHeader />
      </div>
    </header>
  );
}
