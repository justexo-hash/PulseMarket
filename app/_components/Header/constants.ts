import { Home, User, Wallet, ChartArea, MessageCircle, Plus } from "lucide-react";
import type { NavLink } from "./types";

// Navigation links shared between desktop and mobile headers
export const NAV_LINKS: NavLink[] = [
  { href: "/", label: "Discover", icon: Home },
  { href: "/portfolio", label: "Portfolio", icon: Wallet, requiresAuth: true },
  { href: "/activity", label: "Activity", icon: ChartArea },
];

// Sidebar navigation links
export const SIDEBAR_LINKS: NavLink[] = [
  { href: "/", label: "Home", icon: Home },
  { href: "/profile", label: "Profile", icon: User, requiresAuth: true },
  { href: "/portfolio", label: "Portfolio", icon: Wallet, requiresAuth: true },
  { href: "/activity", label: "Activity", icon: ChartArea },
  { href: "/blog", label: "Blog", icon: MessageCircle },
  { href: "/create", label: "Create", icon: Plus, requiresAuth: true },
];

// Wallet readiness state labels
export const WALLET_READY_STATE_LABELS: Record<string, string> = {
  Installed: "Installed",
  Loadable: "Loadable",
  NotDetected: "Not detected",
  Unsupported: "Unsupported",
};

// Helper function to truncate wallet address
export function truncateAddress(address?: string | null, chars = 4): string {
  if (!address) return "";
  if (address.length <= chars * 2 + 3) return address;
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

// Helper function to filter nav links based on user authentication
export function filterNavLinks(links: NavLink[], user: { isAdmin?: boolean } | null): NavLink[] {
  return links.filter((link) => {
    if (link.adminOnly && !user?.isAdmin) return false;
    if (link.requiresAuth && !user) return false;
    return true;
  });
}
