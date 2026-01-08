"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  User,
  Wallet,
  ChartArea,
  MessageCircle,
  Plus,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { DESKTOP_QUERY } from "./types";
import { useMediaQuery } from "app/(markets)/_hooks/useMediaQuery";

interface SidebarLink {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  requiresAuth?: boolean;
  isPrimary?: boolean;
}

const SIDEBAR_LINKS: SidebarLink[] = [
  { href: "/", label: "Home", icon: Home },
  { href: "/profile", label: "Profile", icon: User, requiresAuth: true },
  { href: "/portfolio", label: "Portfolio", icon: Wallet, requiresAuth: true },
  { href: "/activity", label: "Activity", icon: ChartArea },
  { href: "/blog", label: "Blog", icon: MessageCircle },
  { href: "/create", label: "Create", icon: Plus, requiresAuth: true, isPrimary: true },
];

export default function Sidebar() {
  const isDesktop = useMediaQuery(DESKTOP_QUERY);
  const [isExpanded, setIsExpanded] = useState(false);
  const { user } = useAuth();
  const pathname = usePathname();

  const toggleExpanded = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);

  // Don't render on mobile/tablet
  if (!isDesktop) return null;

  const visibleLinks = SIDEBAR_LINKS.filter((link) => {
    if (link.requiresAuth && !user) return false;
    return true;
  });

  return (
    <nav
      className={cn(
        "sticky top-0 h-screen pt-6 px-3 border-r border-border",
        "flex flex-col items-center transition-all duration-200 ease-in-out",
        isExpanded ? "w-44" : "w-[72px]"
      )}
    >
      {/* Logo */}
      <Link href="/" className="mb-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-white.png" className="w-8 h-8" alt="Logo" />
      </Link>

      {/* Expand/Collapse toggle */}
      <Button
        variant="ghost"
        size="sm"
        onClick={toggleExpanded}
        className="p-2 mb-6 hover:bg-muted/50"
        aria-label={isExpanded ? "Collapse sidebar" : "Expand sidebar"}
      >
        {isExpanded ? (
          <ChevronLeft className="h-4 w-4" />
        ) : (
          <ChevronRight className="h-4 w-4" />
        )}
      </Button>

      {/* Navigation links */}
      <div className="flex flex-col gap-2 w-full">
        {visibleLinks.map(({ href, label, icon: Icon, isPrimary, requiresAuth }) => {
          const resolvedHref =
            href === "/profile" && user ? `/profile/${user.username}` : href;
          const isActive =
            pathname === resolvedHref ||
            (href === "/" && pathname === "/") ||
            (href !== "/" && pathname.startsWith(href));

          return (
            <Link key={href} href={resolvedHref} className="w-full">
              <Button
                variant={isPrimary ? "default" : "ghost"}
                size="sm"
                className={cn(
                  "w-full justify-start gap-3 px-3 py-2",
                  !isExpanded && "justify-center px-2",
                  isActive && !isPrimary && "bg-muted",
                  isPrimary && "mt-2"
                )}
              >
                <Icon className="h-5 w-5 shrink-0" />
                {isExpanded && (
                  <span className="text-sm truncate">{label}</span>
                )}
              </Button>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
