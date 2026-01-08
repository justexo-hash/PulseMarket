// Main components
export { HeaderDesktop } from "./HeaderDesktop";
export { HeaderMobile } from "./HeaderMobile";
export { WalletDropdown } from "./WalletDropdown";
export { NotificationsDropdown } from "./NotificationsDropdown";
export { default as Sidebar } from "./Sidebar";
export { default as FilterHeader } from "./FilterHeader";

// Types
export type { HeaderProps, WalletDropdownProps, NavLink, AuthUser } from "./types";
export { BREAKPOINTS, DESKTOP_BREAKPOINT, DESKTOP_QUERY } from "./types";

// Constants & utilities
export { NAV_LINKS, SIDEBAR_LINKS, truncateAddress, filterNavLinks } from "./constants";

// Hooks
export { useWalletConnection } from "./hooks";
