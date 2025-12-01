"use client";

import { useMemo, useState } from "react";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
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

  if (!connectedAddress) {
    return (
      <Dialog onOpenChange={(open) => {
        if (!open && wallet.connected) {
          // close modal automatically once connected
        }
      }}>
        <DialogTrigger asChild>
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
          </Button>
        </DialogTrigger>

        <DialogContent className="max-w-sm bg-background text-secondary-foreground">
          <DialogHeader>
            <DialogTitle>Select a wallet</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-2 py-2 max-h-64 overflow-y-auto">
            {availableWallets.length === 0 && (
              <p className="text-muted-foreground text-sm">
                No wallets detected. Install a Solana wallet to continue.
              </p>
            )}

            {availableWallets.map(({ adapter, readyState }) => {
              const walletKey = `${adapter.name}-${adapter.url ?? ""}`;
              const isInstalled =
                readyState === WalletReadyState.Installed ||
                readyState === WalletReadyState.Loadable;
              return (
                <Button
                  key={walletKey}
                  variant="outline"
                  className="flex items-center justify-start gap-3 px-3"
                  onClick={async () => {
                    await handleSelectWallet(adapter.name);
                    if (wallet.connected) {
                      document
                        .querySelector('[data-state="open"]')
                        ?.dispatchEvent(new Event("close"));
                    }
                  }}
                  disabled={
                    readyState === WalletReadyState.Unsupported ||
                    wallet.connecting ||
                    Boolean(pendingWallet && pendingWallet !== adapter.name)
                  }
                >
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
                    </span>
                  </div>
                </Button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={triggerVariant}
          size={triggerSize}
          className={cn(
            "flex items-center gap-2 min-w-[140px] justify-center",
            triggerClassName
          )}
        >
          <Wallet className="h-4 w-4" />
          <span>{truncateAddress(connectedAddress)}</span>
          <ChevronDown className="h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="w-72 bg-background text-secondary-foreground shadow-xl">
        <DropdownMenuLabel className="flex flex-col gap-1">
          <span className="text-xs uppercase text-muted-foreground">
            Connected Wallet
          </span>
          <div className="flex justify-between">
          <span className="font-mono text-sm">
            {truncateAddress(connectedAddress)}
          </span>
        {connectedWalletName && (
            <Badge
              className={cn(
                "w-fit",
                connectedWalletName === "Phantom" && "bg-[#AB19EE] text-white",
                connectedWalletName === "MetaMask" && "bg-[#F6851B] text-white",
                connectedWalletName === "Solflare" && "bg-[#F6D500] text-black",
                connectedWalletName === "Magic Eden" && "bg-[#8A2BE2] text-white",
                connectedWalletName === "Torus" && "bg-[#2F80ED] text-white",
                !["Phantom","MetaMask","Solflare","Magic Eden","Torus"].includes(connectedWalletName ?? "") &&
                  "bg-secondary text-secondary-foreground"
              )}
            >
              {connectedWalletName}
            </Badge>
          )}
          </div>
        </DropdownMenuLabel>

        <div className="px-3 pb-3">
          <p className="text-xs uppercase text-muted-foreground">Balance</p>
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
          <Copy className="mr-2 h-4 w-4" /> Copy Address
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={handleDisconnect}
          className="text-destructive focus:text-destructive"
        >
          <LogOut className="mr-2 h-4 w-4" /> Disconnect
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
