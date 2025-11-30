"use client";

import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { useWallet } from "@solana/wallet-adapter-react";
import { useSolanaConnection, getSOLBalance } from "@/lib/solana";
import { useEffect, useState } from "react";


import { useMediaQuery } from "../_hooks/useMediaQuery";
import { HeaderDesktop } from "./Header/HeaderDesktop";
import { HeaderMobile} from "./Header/HeaderMobile";

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

  const isAuthenticated = Boolean(user);
  const canShowWalletActions = Boolean(
    isAuthenticated && wallet.connected && wallet.publicKey
  );

  const isDesktop = useMediaQuery("(min-width: 1280px)");

  if (isDesktop) {
    return (
      <HeaderDesktop
        user={user}
        wallet={wallet}
        onChainBalance={onChainBalance}
        isMounted={isMounted}
        handleLogout={handleLogout}
      />
    );
  }
  return (
    <HeaderMobile
      user={user}
      wallet={wallet}
      onChainBalance={onChainBalance}
      handleLogout={handleLogout}
      isMounted={isMounted}
    />
  );
}
