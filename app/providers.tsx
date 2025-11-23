"use client";

import type { ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { WalletContextProvider } from "@/lib/wallet";
import { AuthProvider } from "@/lib/auth";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AppEffects } from "./app-effects";
import MarketSearchProviderClient from "./(markets)/_components/MarketSearchProviderClient";

interface AppProvidersProps {
  children: ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <WalletContextProvider>
          <AuthProvider>
            <TooltipProvider delayDuration={200}>
              <AppEffects />
              <Toaster />
              <MarketSearchProviderClient>
                {children}
              </MarketSearchProviderClient>
            </TooltipProvider>
          </AuthProvider>
        </WalletContextProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

