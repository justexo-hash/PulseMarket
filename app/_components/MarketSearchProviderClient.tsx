

"use client";

import { useQuery } from "@tanstack/react-query";
import { Market } from "@shared/schema";
import { MarketSearchProvider } from "app/(markets)/_context/MarketSearchContext";

export default function MarketSearchProviderClient({
  children,
}: {
  children: React.ReactNode;
}) {
  // Fetch markets using React Query
  const {
    data: markets = [],
    isLoading,
    error,
  } = useQuery<Market[]>({
    queryKey: ["/api/markets"],
  });

  // While loading, render nothing (layout keeps stable)
  if (isLoading) return null;

  // If error, still render children with empty markets
  return (
    <MarketSearchProvider markets={markets || []}>
      {children}
    </MarketSearchProvider>
  );
}