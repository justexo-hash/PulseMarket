"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { type Market } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { MarketDetailView } from "../../_components/MarketDetailView";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { useWallet } from "@solana/wallet-adapter-react";

interface PrivateWagerClientProps {
  inviteCode: string;
}

export function PrivateWagerClient({ inviteCode }: PrivateWagerClientProps) {
  const normalizedCode = inviteCode?.toUpperCase();
  const { user } = useAuth();
  const wallet = useWallet();

  const inviteCodeValid =
    !!normalizedCode && /^[A-Z0-9]{8}$/.test(normalizedCode || "");
  const hasPrivateAccess = Boolean(user && wallet.connected && wallet.publicKey);

  const { data: market, isLoading, error } = useQuery<Market>({
    queryKey: ["/api/wager", normalizedCode],
    enabled: inviteCodeValid && hasPrivateAccess,
    retry: false,
  });

  if (!normalizedCode || !inviteCodeValid) {
    return (
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center py-20">
          <h2 className="text-3xl font-bold text-secondary-foreground  mb-4">Invalid Invite Code</h2>
          <p className="text-muted-foreground mb-8">
            The invite code format is invalid. Invite codes are 8 characters (uppercase letters and numbers).
          </p>
          <Button variant="default" asChild>
            <Link href="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Markets
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="bg-card border border-card-border rounded-lg p-8 shadow-xl animate-pulse">
            <div className="h-8 w-32 bg-secondary rounded mb-4" />
            <div className="h-12 bg-secondary rounded mb-8" />
          </div>
        </div>
      </div>
    );
  }

  if (!hasPrivateAccess) {
    return (
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center py-20 max-w-2xl mx-auto space-y-6">
          <h2 className="text-3xl font-bold text-secondary-foreground ">Private Wager Restricted</h2>
          <p className="text-muted-foreground text-lg">
            Private wagers are only available to authenticated users with a connected wallet.
            Please log in and connect your Solana wallet using the button in the header to continue.
          </p>
          <div className="flex flex-col items-center gap-3 text-sm text-muted-foreground/80">
            <p>Once your wallet is connected, refresh this page to load the wager.</p>
          </div>
          <Button variant="default" asChild>
            <Link href="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Markets
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  if (error || !market) {
    return (
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center py-20">
          <h2 className="text-3xl font-bold text-secondary-foreground  mb-4">Private Wager Not Found</h2>
          <p className="text-muted-foreground mb-8">
            The private wager with this invite code doesn&apos;t exist or may have been deleted.
          </p>
          <Button variant="default" asChild>
            <Link href="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Markets
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  // Render MarketDetail directly with market data, keeping invite code in URL
  return <MarketDetailView marketOverride={market} />;
}

