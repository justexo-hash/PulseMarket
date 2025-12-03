import Link from "next/link";

import { SearchCategories } from "../SearchCategories";
import { MarketSearchBar } from "../Searchbar";
import HowItWorksButton from "@/components/HowItWorks";
import { Button } from "@/components/ui/button";
import { Plus, Users } from "lucide-react";
import { WalletDropdown } from "./WalletDropdown";
import { useAuth } from "@/lib/auth";
// Static navigation links for both desktop and mobile menus
const NAV_LINKS = [
  { href: "/", label: "Discover" },
  { href: "/portfolio", label: "Portfolio", requiresAuth: true },
  { href: "/activity", label: "Activity" },
];

// DESKTOP HEADER COMPONENT
export function HeaderDesktop(props: any) {
  const { user } = useAuth();
  return (
    <header className="z-50 w-full">
      <div className="px-[1.5rem] pt-[1.5rem] flex flex-col gap-6 mb-6">
        {/* LEFT SIDE: Logo + Searchbar + Mobile Burger Menu */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex justify-between md:justify-start gap-3 desktop">
            {/* Searchbar — desktop & mobile responsive */}
            <MarketSearchBar />
            <HowItWorksButton />
          </div>

          {/* RIGHT SIDE: Wallet actions, notifications, login/signup dialog, and desktop menu */}
          <div className="hidden md:flex items-center gap-3">
            {user && (
              <div className="flex items-start justify-between">
                <div className="flex gap-2">
                  {user?.isAdmin && (
                    <Button size="sm" className="gap-2" asChild>
                      <Link href="/create">
                        <Plus className="h-5 w-5" />
                        Create Market
                      </Link>
                    </Button>
                  )}

                  <Button size="sm" className="gap-2" asChild>
                    <Link href="/create">
                      <Users className="h-5 w-5" />
                      Private Wager
                    </Link>
                  </Button>
                </div>
              </div>
            )}
            <WalletDropdown
              wallet={props.wallet}
              isMounted={props.isMounted}
              onChainBalance={props.onChainBalance}
              solPriceUsd={props.solPriceUsd}
              onDisconnect={props.handleLogout}
            />
            {/* DESKTOP DROPDOWN MENU
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
            </DropdownMenu> */}
          </div>
        </div>

      </div>
    </header>
  );
}
