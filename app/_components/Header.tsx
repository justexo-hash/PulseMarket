"use client";

import { useEffect, useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useWallet } from "@solana/wallet-adapter-react";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { useSolanaConnection, getSOLBalance } from "@/lib/solana";
import { useMediaQuery } from "app/(markets)/_hooks/useMediaQuery";
import { HeaderDesktop } from "./Header/HeaderDesktop";
import { HeaderMobile } from "./Header/HeaderMobile";
import { DESKTOP_QUERY } from "./Header/types";

export function Header() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const wallet = useWallet();
  const connection = useSolanaConnection();
  const isDesktop = useMediaQuery(DESKTOP_QUERY);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Fetch on-chain SOL balance
  const { data: onChainBalance } = useQuery({
    queryKey: ["wallet-balance", wallet.publicKey?.toBase58()],
    queryFn: async () => {
      if (!wallet.publicKey || !connection) return 0;
      return await getSOLBalance(connection, wallet.publicKey);
    },
    enabled: !!wallet.publicKey && !!connection,
    refetchInterval: 10000,
    staleTime: 5000,
  });

  // Fetch platform balance
  const { data: balanceData } = useQuery<{ balance: string }>({
    queryKey: ["/api/wallet/balance"],
    enabled: !!user,
    retry: false,
    refetchInterval: 30000,
    staleTime: 15000,
  });

  // Fetch SOL/USD price
  const { data: solPriceUsd } = useQuery<number>({
    queryKey: ["sol-price-header"],
    queryFn: async () => {
      const response = await fetch("/api/coinmarketcap/quotes?symbol=SOL");
      if (!response.ok) {
        const { error } = await response.json().catch(() => ({ error: null }));
        throw new Error(error || "Failed to fetch SOL price");
      }
      const json = await response.json();
      const quote = json?.data?.SOL?.quote?.USD;
      return quote?.price ?? 0;
    },
    enabled: !!wallet.connected,
    refetchInterval: 60000,
    staleTime: 30000,
  });

  const handleLogout = useCallback(() => {
    logout();
    toast({
      title: "Logged Out",
      description: "You have been logged out successfully.",
    });
  }, [logout, toast]);

  const platformBalance = balanceData
    ? parseFloat(balanceData.balance || "0")
    : 0;

  const headerProps = {
    user,
    wallet,
    onChainBalance,
    platformBalance,
    solPriceUsd,
    isMounted,
    handleLogout,
  };

  if (isDesktop) {
    return <HeaderDesktop {...headerProps} />;
  }

  return <HeaderMobile {...headerProps} />;
}
