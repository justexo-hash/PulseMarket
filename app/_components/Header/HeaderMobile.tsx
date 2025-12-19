import Link from "next/link";

import { MarketSearchBar } from "../Searchbar";
import HowItWorksButton from "@/components/HowItWorks";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { CircleDollarSign, Menu } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { SearchCategories } from "../SearchCategories";
import { WalletDropdown } from "./WalletDropdown";
import { NotificationsDropdown } from "./NotificationsDropdown";
import FilterHeader from "./FilterHeader";
// Static navigation links for both desktop and mobile menus
const NAV_LINKS = [
  { href: "/", label: "Discover" },
  { href: "/portfolio", label: "Portfolio", requiresAuth: true },
  { href: "/activity", label: "Activity" },
];

// MOBILE HEADER COMPONENT
export function HeaderMobile(props: any) {
  return (
    <header className="z-50 w-full border-b mb-6">
      <div className="container mx-auto pt-[1.5rem] flex flex-col gap-6 mb-6">
        {/* LEFT SIDE: Logo + Searchbar + Mobile Burger Menu */}
        <div className="flex items-center justify-between gap-6">
          <div className="flex justify-between w-full gap-3 mobile">
            {/* App logo linking to homepage */}
            <Link
              href="/"
              data-testid="link-home"
              className="flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo-white.png" className="w-8 h-8" alt="" />
              <span className="text-xl font-bold text-secondary-foreground ">
                Polymeme
              </span>
            </Link>
            {/* MOBILE NAVIGATION (Sheet Menu) */}
            <div className="flex items-center gap-3">
              <HowItWorksButton />

              <NotificationsDropdown
                enabled={Boolean(props.user)}
                align="end"
              />
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

                  <div className="flex flex-col gap-6">
                    <div className="flex items-center justify-between py-2">
                      <div className="flex items-center gap-2 px-3 py-1.5 bg-secondary/50 rounded-lg border border-border/50 w-full">
                        <Image
                          src="/solana.webp"
                          alt="SOL"
                          width={20}
                          height={20}
                          className="rounded-full object-cover"
                        />
                        <span className="text-sm font-bold text-secondary-foreground ">
                          {(props.platformBalance ?? 0).toFixed(2)}
                        </span>
                      </div>
                    </div>

                    <div className="page-links flex flex-col gap-3">
                      <p className="text-muted-foreground">Navigation</p>
                      {NAV_LINKS.filter(({ requiresAuth }) => {
                        if (!requiresAuth) return true;
                        return Boolean(props.user);
                      }).map(({ href, label }) => (
                        <Link
                          key={href}
                          href={href}
                          className="text-base py-2 font-base"
                        >
                          {label}
                        </Link>
                      ))}
                      <p className="text-muted-foreground">Profile</p>
                      <WalletDropdown
                        wallet={props.wallet}
                        isMounted={props.isMounted}
                        onChainBalance={props.onChainBalance}
                        solPriceUsd={props.solPriceUsd}
                        onDisconnect={props.handleLogout}
                      />
                      {props.user && (
                        <Link
                          href={`/profile/${props.user.username}`}
                          className="text-base py-2 font-base"
                        >
                          Profile
                        </Link>
                      )}

                      {props.user?.isAdmin && (
                        <Link
                          href="/admin"
                          className="text-base py-2 font-base"
                        >
                          Admin
                        </Link>
                      )}
                    </div>

                    {props.user &&
                      props.wallet.connected &&
                      props.wallet.publicKey && (
                        <>
                          <Link href="/deposit" className="w-full">
                            <Button variant="marketing" className="w-full">
                              <CircleDollarSign />
                              Deposit
                            </Button>
                          </Link>
                        </>
                      )}
                  </div>
                </SheetContent>
              </Sheet>
            </div>
            {/* Searchbar — desktop & mobile responsive */}
          </div>
        </div>
        <FilterHeader />

        <MarketSearchBar />
      </div>
    </header>
  );
}
