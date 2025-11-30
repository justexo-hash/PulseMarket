import Link from "next/link";

import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuGroup,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

import { SearchCategories } from "../SearchCategories";
import { MarketSearchBar } from "../Searchbar";
import HowItWorksButton from "@/components/HowItWorks";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Bell, CircleDollarSign, Menu } from "lucide-react";
import { ModeToggle } from "@/components/theme-toggle";
import { WalletDropdown } from "./WalletDropdown";

// Static navigation links for both desktop and mobile menus
const NAV_LINKS = [
  { href: "/", label: "Discover" },
  { href: "/portfolio", label: "Portfolio", requiresAuth: true },
  { href: "/activity", label: "Activity" },
];

// DESKTOP HEADER COMPONENT
export function HeaderDesktop(props: any) {
  return (
    <header className="z-50 w-full">
      <div className="container mx-auto pt-3  flex flex-col gap-3">
        {/* LEFT SIDE: Logo + Searchbar + Mobile Burger Menu */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex justify-between md:justify-start gap-3 desktop">
            {/* App logo linking to homepage */}
            <Link
              href="/"
              data-testid="link-home"
              className="flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo-white.png" className="w-8 h-8" alt="" />
              <span className="text-xl font-bold text-secondary-foreground ">
                PulseMarket
              </span>
            </Link>

            {/* Searchbar — desktop & mobile responsive */}
            <MarketSearchBar />
            <HowItWorksButton />
          </div>

          {/* RIGHT SIDE: Wallet actions, notifications, login/signup dialog, and desktop menu */}
          <div className="hidden md:flex items-center gap-3">
            {/* <ModeToggle /> */}
            {/* If wallet is connected, display deposit + balance + notifications */}
            {props.user && props.wallet.connected && props.wallet.publicKey && (
              <>
                <Button variant="marketing" asChild>
                  <Link href="/deposit">
                    {" "}
                    <CircleDollarSign />
                    Deposit
                  </Link>
                </Button>
                <div className="items-center gap-1.5 px-1.5 py-1.5 bg-secondary flex rounded-md">
                  <Image
                    src="/solana.webp"
                    alt="SOL"
                    width={20}
                    height={20}
                    className="rounded-full object-cover"
                  />
                  <span className="text-sm font-bold text-secondary-foreground">
                    {(props.platformBalance ?? 0).toFixed(2)}
                  </span>
                </div>

                <Button variant="ghost" size="icon">
                  <Bell className="h-5 w-5" />
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
                </Button>
              </>
            )}

            <WalletDropdown
              wallet={props.wallet}
              isMounted={props.isMounted}
              onChainBalance={props.onChainBalance}
              solPriceUsd={props.solPriceUsd}
              onDisconnect={props.handleLogout}
            />
            {/* DESKTOP DROPDOWN MENU */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="hidden md:flex">
                  <Menu className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent
                className="w-56 bg-background text-secondary-foreground-foreground border-none shadow-lg"
                align="end"
              >
                <DropdownMenuLabel className="text-secondary-foreground ">
                  Navigation
                </DropdownMenuLabel>
                <DropdownMenuGroup>
                  {NAV_LINKS.filter(({ requiresAuth }) => {
                    if (!requiresAuth) return true;
                    return Boolean(props.user);
                  }).map(({ href, label }) => (
                    <DropdownMenuItem
                      className="hover:bg-primary/20 transition-colors"
                      asChild
                      key={href}
                    >
                      <Link
                        href={href}
                        className="text-base px-3 py-2 text-secondary-foreground/50 hover:text-secondary-foreground !cursor-pointer font-bold"
                      >
                        {label}
                      </Link>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuGroup>

                {props.user && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel className="text-secondary-foreground ">
                      Account
                    </DropdownMenuLabel>
                    <DropdownMenuItem asChild>
                      <Link
                        href={`/profile/${props.user.username}`}
                        className="text-base px-3 py-2 text-secondary-foreground/50 hover:text-secondary-foreground !cursor-pointer font-bold"
                      >
                        Profile
                      </Link>
                    </DropdownMenuItem>
                  </>
                )}

                {props.user?.isAdmin && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel>Admin</DropdownMenuLabel>
                    <DropdownMenuItem asChild>
                      <Link
                        href="/admin"
                        className="text-base px-3 py-2 text-secondary-foreground/50 hover:text-secondary-foreground !cursor-pointer font-bold"
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
        <SearchCategories />
      </div>
    </header>
  );
}
