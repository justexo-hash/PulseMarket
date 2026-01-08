import type { WalletContextState } from "@solana/wallet-adapter-react";

// User type from auth context
export interface AuthUser {
  id: number;
  walletAddress: string;
  username: string;
  isAdmin: boolean;
}

// Shared props for Header components
export interface HeaderProps {
  user: AuthUser | null;
  wallet: WalletContextState;
  onChainBalance?: number;
  platformBalance: number;
  solPriceUsd?: number;
  isMounted: boolean;
  handleLogout: () => void;
}

// Props for WalletDropdown
export interface WalletDropdownProps {
  wallet: WalletContextState;
  isMounted?: boolean;
  align?: "start" | "center" | "end";
  triggerClassName?: string;
  triggerVariant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link" | "marketing" | "sidebar";
  triggerSize?: "default" | "sm" | "lg" | "icon";
  onDisconnect?: () => void;
  onChainBalance?: number | null;
  solPriceUsd?: number | null;
}

// Navigation link type
export interface NavLink {
  href: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  requiresAuth?: boolean;
  adminOnly?: boolean;
}

// Responsive breakpoints - centralized for consistency
export const BREAKPOINTS = {
  mobile: 640,   // sm
  tablet: 768,   // md
  desktop: 1024, // lg
  wide: 1280,    // xl
} as const;

// Desktop breakpoint used across the app
export const DESKTOP_BREAKPOINT = BREAKPOINTS.wide;
export const DESKTOP_QUERY = `(min-width: ${DESKTOP_BREAKPOINT}px)`;
