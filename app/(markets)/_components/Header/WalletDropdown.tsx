"use client";

import { useMemo, useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button, type ButtonProps } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import type { WalletContextState } from "@solana/wallet-adapter-react";
import {
  WalletReadyState,
  type WalletName,
} from "@solana/wallet-adapter-base";
import { Check, ChevronDown, Copy, LogOut, Wallet } from "lucide-react";

interface WalletDropdownProps {
  wallet: WalletContextState;
  isMounted?: boolean;
  align?: "start" | "center" | "end";
  triggerClassName?: string;
  triggerVariant?: ButtonProps["variant"];
  triggerSize?: ButtonProps["size"];
  onDisconnect?: () => void;
  onChainBalance?: number | null;
  solPriceUsd?: number | null;
}

const READY_STATE_LABEL: Record<WalletReadyState, string> = {
  [WalletReadyState.Installed]: "Installed",
  [WalletReadyState.Loadable]: "Loadable",
  [WalletReadyState.NotDetected]: "Not detected",
  [WalletReadyState.Unsupported]: "Unsupported",
};

export function WalletDropdown({
  wallet,
  isMounted = true,
  align = "end",
  triggerClassName,
  triggerVariant = "default",
  triggerSize = "sm",
  onDisconnect,
  onChainBalance,
  solPriceUsd,
}: WalletDropdownProps) {
  const { toast } = useToast();
  const [pendingWallet, setPendingWallet] = useState<WalletName | null>(null);

  const connectedAddress = wallet.publicKey?.toBase58();
  const connectedWalletName = wallet.wallet?.adapter.name;

  const wallets = wallet.wallets;

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

  const truncateAddress = (address?: string) => {
    if (!address) return "";
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  const handleSelectWallet = async (name: WalletName) => {
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
        await new Promise((resolve) => setTimeout(resolve, 0));
      }

      await wallet.connect();
      toast({
        title: "Wallet Connected",
        description: `Connected to ${name}.`,
      });
    } catch (error: any) {
      const selectedWalletMatches = wallet.wallet?.adapter.name === name;
      const alreadyConnected = wallet.connected && selectedWalletMatches;
      const isWalletNotSelectedError =
        error?.name === "WalletNotSelectedError" ||
        /WalletNotSelectedError/i.test(error?.message || "");

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
        description: error?.message || "Unable to connect wallet.",
        variant: "destructive",
      });
    } finally {
      setPendingWallet(null);
    }
  };

  const handleDisconnect = async () => {
    try {
      await wallet.disconnect();
      onDisconnect?.();
      toast({
        title: "Wallet Disconnected",
        description: "You have disconnected your wallet.",
      });
    } catch (error: any) {
      toast({
        title: "Disconnect Failed",
        description: error?.message || "Unable to disconnect wallet.",
        variant: "destructive",
      });
    }
  };

  const handleCopyAddress = async () => {
    if (!connectedAddress || typeof navigator === "undefined") return;
    try {
      await navigator.clipboard.writeText(connectedAddress);
      toast({
        title: "Address Copied",
        description: connectedAddress,
      });
    } catch (error: any) {
      toast({
        title: "Copy Failed",
        description: error?.message || "Unable to copy address.",
        variant: "destructive",
      });
    }
  };

  const triggerLabel = !isMounted
    ? "Loading..."
    : wallet.connecting || pendingWallet
      ? "Connecting..."
      : connectedAddress
        ? truncateAddress(connectedAddress)
        : "Connect Wallet";

  const personalBalance = onChainBalance ?? 0;
  const personalUsdValue =
    typeof solPriceUsd === "number"
      ? personalBalance * solPriceUsd
      : null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={triggerVariant}
          size={triggerSize}
          disabled={!isMounted || wallet.connecting}
          className={cn(
            "flex items-center gap-2 min-w-[140px] justify-center",
            triggerClassName
          )}
        >
          <Wallet className="h-4 w-4" />
          <span>{triggerLabel}</span>
          <ChevronDown className="h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align={align}
        className="w-72 bg-background text-secondary-foreground shadow-xl"
      >
        {connectedAddress ? (
          <>
            <DropdownMenuLabel className="flex flex-col gap-1">
              <span className="text-xs uppercase text-muted-foreground">
                Connected Wallet
              </span>
              <span
                className="font-mono text-sm"
                title={connectedAddress}
              >
                {truncateAddress(connectedAddress)}
              </span>
              {connectedWalletName && (
                <Badge variant="secondary" className="w-fit">
                  {connectedWalletName}
                </Badge>
              )}
            </DropdownMenuLabel>
            <div className="px-3 pb-3">
              <p className="text-xs uppercase text-muted-foreground">
                Personal Wallet Balance
              </p>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="text-lg font-semibold text-secondary-foreground">
                  {personalBalance.toFixed(4)} SOL
                </span>
                {personalUsdValue !== null && (
                  <span className="text-xs text-muted-foreground">
                    ≈ $
                    {personalUsdValue.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                )}
              </div>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleCopyAddress}>
              <Copy className="mr-2 h-4 w-4" />
              Copy Address
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={handleDisconnect}
              className="text-destructive focus:text-destructive"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Disconnect
            </DropdownMenuItem>
          </>
        ) : (
          <>
            <DropdownMenuLabel>Select a wallet</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {availableWallets.length === 0 && (
              <DropdownMenuItem disabled>
                No wallets detected. Install a Solana wallet to continue.
              </DropdownMenuItem>
            )}
            {availableWallets.map(({ adapter, readyState }) => {
              const walletKey = `${adapter.name}-${adapter.url ?? ""}`;
              const isInstalled =
                readyState === WalletReadyState.Installed ||
                readyState === WalletReadyState.Loadable;
              return (
                <DropdownMenuItem
                  key={walletKey}
                  onClick={() => handleSelectWallet(adapter.name)}
                  disabled={
                    readyState === WalletReadyState.Unsupported ||
                    wallet.connecting ||
                    Boolean(pendingWallet && pendingWallet !== adapter.name)
                  }
                  className="flex items-center gap-3"
                >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    src={adapter.icon}
                    alt={adapter.name}
                    className="h-6 w-6 rounded-full"
                  />
                  <div className="flex flex-col text-left">
                    <span className="text-sm font-medium">{adapter.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {isInstalled
                        ? READY_STATE_LABEL[readyState]
                        : "Install required"}
                      {pendingWallet === adapter.name && " • Connecting"}
                      {wallet.wallet?.adapter.name === adapter.name &&
                        !pendingWallet && (
                          <span className="inline-flex items-center gap-1 text-green-500 ml-1">
                            <Check className="h-3 w-3" />
                            Selected
                          </span>
                        )}
                    </span>
                  </div>
                </DropdownMenuItem>
              );
            })}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}


