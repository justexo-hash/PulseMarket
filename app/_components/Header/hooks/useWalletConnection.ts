"use client";

import { useState, useMemo, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import type { WalletContextState } from "@solana/wallet-adapter-react";
import { WalletReadyState, type WalletName } from "@solana/wallet-adapter-base";

interface UseWalletConnectionOptions {
  wallet: WalletContextState;
  onDisconnect?: () => void;
}

interface UseWalletConnectionReturn {
  // State
  pendingWallet: WalletName | null;
  isConnecting: boolean;
  connectedAddress: string | undefined;
  connectedWalletName: string | undefined;
  availableWallets: WalletContextState["wallets"];

  // Actions
  handleSelectWallet: (name: WalletName) => Promise<void>;
  handleDisconnect: () => Promise<void>;
  handleCopyAddress: () => Promise<void>;
}

export function useWalletConnection({
  wallet,
  onDisconnect,
}: UseWalletConnectionOptions): UseWalletConnectionReturn {
  const { toast } = useToast();
  const [pendingWallet, setPendingWallet] = useState<WalletName | null>(null);

  const connectedAddress = wallet.publicKey?.toBase58();
  const connectedWalletName = wallet.wallet?.adapter.name;
  const isConnecting = wallet.connecting || pendingWallet !== null;

  const wallets = wallet.wallets;

  // Build a deduplicated and priority-sorted list of detected wallets
  const availableWallets = useMemo(() => {
    const priority: Record<WalletReadyState, number> = {
      [WalletReadyState.Installed]: 0,
      [WalletReadyState.Loadable]: 1,
      [WalletReadyState.NotDetected]: 2,
      [WalletReadyState.Unsupported]: 3,
    };

    const deduped: typeof wallets = [];
    const seen = new Set<string>();

    for (const entry of wallets) {
      const dedupeKey = `${entry.adapter.name}-${entry.adapter.url ?? ""}`;
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);
      deduped.push(entry);
    }

    return deduped.sort(
      (a, b) => priority[a.readyState] - priority[b.readyState]
    );
  }, [wallets]);

  // Handle the user selecting a specific wallet provider
  const handleSelectWallet = useCallback(
    async (name: WalletName) => {
      setPendingWallet(name);
      try {
        const target = availableWallets.find(
          ({ adapter }) => adapter.name === name
        );
        if (!target) {
          throw new Error("Wallet not available");
        }

        const canConnect =
          target.readyState === WalletReadyState.Installed ||
          target.readyState === WalletReadyState.Loadable;

        if (!canConnect) {
          if (target.adapter.url) {
            window.open(target.adapter.url, "_blank", "noopener,noreferrer");
          }
          throw new Error(
            `${name} is not installed. Install the wallet to continue.`
          );
        }

        if (wallet.wallet?.adapter.name !== name) {
          wallet.select(name);
          // Small delay to allow wallet selection to propagate
          await new Promise((resolve) => setTimeout(resolve, 50));
        }

        await wallet.connect();
        toast({
          title: "Wallet Connected",
          description: `Connected to ${name}.`,
        });
      } catch (error: unknown) {
        const err = error as Error & { name?: string };
        const selectedWalletMatches = wallet.wallet?.adapter.name === name;
        const alreadyConnected = wallet.connected && selectedWalletMatches;
        const isWalletNotSelectedError =
          err?.name === "WalletNotSelectedError" ||
          /WalletNotSelectedError/i.test(err?.message || "");

        if (alreadyConnected) {
          toast({
            title: "Wallet Connected",
            description: `Connected to ${name}.`,
          });
          return;
        }

        if (isWalletNotSelectedError && !selectedWalletMatches) {
          toast({
            title: "Wallet Not Selected",
            description: "Please choose a wallet from the list to continue.",
            variant: "destructive",
          });
          return;
        }

        toast({
          title: "Connection Failed",
          description: err?.message || "Unable to connect wallet.",
          variant: "destructive",
        });
      } finally {
        setPendingWallet(null);
      }
    },
    [availableWallets, toast, wallet]
  );

  // Disconnect the currently connected wallet
  const handleDisconnect = useCallback(async () => {
    try {
      await wallet.disconnect();
      onDisconnect?.();
      toast({
        title: "Wallet Disconnected",
        description: "You have disconnected your wallet.",
      });
    } catch (error: unknown) {
      const err = error as Error;
      toast({
        title: "Disconnect Failed",
        description: err?.message || "Unable to disconnect wallet.",
        variant: "destructive",
      });
    }
  }, [onDisconnect, toast, wallet]);

  // Copy the connected wallet address to clipboard
  const handleCopyAddress = useCallback(async () => {
    if (!connectedAddress || typeof navigator === "undefined") return;
    try {
      await navigator.clipboard.writeText(connectedAddress);
      toast({
        title: "Address Copied",
        description: connectedAddress,
      });
    } catch (error: unknown) {
      const err = error as Error;
      toast({
        title: "Copy Failed",
        description: err?.message || "Unable to copy address.",
        variant: "destructive",
      });
    }
  }, [connectedAddress, toast]);

  return {
    pendingWallet,
    isConnecting,
    connectedAddress,
    connectedWalletName,
    availableWallets,
    handleSelectWallet,
    handleDisconnect,
    handleCopyAddress,
  };
}
