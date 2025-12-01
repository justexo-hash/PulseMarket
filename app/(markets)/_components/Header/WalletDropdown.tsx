"use client";
// WalletDropdown: manages connecting, displaying, and managing Solana wallets in the header UI

import { useMemo, useState } from "react";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/lib/auth";
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
import { WalletReadyState, type WalletName } from "@solana/wallet-adapter-base";
import {
  Check,
  ChevronDown,
  CircleDollarSign,
  Copy,
  LogOut,
  User,
  Wallet,
  Wallet2,
} from "lucide-react";
import Link from "next/link";
import { NotificationsDropdown } from "./NotificationsDropdown";

// Props expected by the WalletDropdown component
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

// Human-readable labels for Solana wallet readiness states
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
  const { user } = useAuth();
  const [viewWalletOpen, setViewWalletOpen] = useState(false);

  const connectedAddress = wallet.publicKey?.toBase58();
  const connectedWalletName = wallet.wallet?.adapter.name;

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

  // Format a wallet address to a short readable form (e.g. 8zxf...A91k)
  const truncateAddress = (address?: string) => {
    if (!address) return "";
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  // Handle the user selecting a specific wallet provider
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

  // Disconnect the currently connected wallet
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

  // Copy the connected wallet address to clipboard
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

  // Determine the label shown on the trigger button
  const triggerLabel = !isMounted
    ? "Loading..."
    : wallet.connecting || pendingWallet
    ? "Connecting..."
    : connectedAddress
    ? truncateAddress(connectedAddress)
    : "Connect Wallet";

  // Render the wallet selection modal when user is not connected
  const personalBalance = onChainBalance ?? 0;
  const personalUsdValue =
    typeof solPriceUsd === "number" ? personalBalance * solPriceUsd : null;

  if (!connectedAddress) {
    return (
      <Dialog
        onOpenChange={(open) => {
          if (!open && wallet.connected) {
            // close modal automatically once connected
          }
        }}
      >
        <DialogTrigger asChild>
          <Button
            variant={connectedAddress ? "secondary" : triggerVariant}
            size={triggerSize}
            disabled={!isMounted || wallet.connecting}
            className={cn(
              "flex items-center gap-3 min-w-[140px] justify-center",
              triggerClassName
            )}
          >
            <Wallet className="h-4 w-4" />
            <span>{triggerLabel}</span>
          </Button>
        </DialogTrigger>

        <DialogContent className="max-w-sm bg-background text-secondary-foreground px-1.5">
          <DialogHeader>
            <DialogTitle>Select a wallet</DialogTitle>
          </DialogHeader>

          {/* Render each available wallet with its installation status */}
          <div className="flex flex-col gap-3 px-1.5 max-h-64 overflow-y-auto">
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
                  className="flex items-center justify-start gap-3 px-1.5"
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
    <>
      <Dialog open={viewWalletOpen} onOpenChange={setViewWalletOpen}>
        <DialogContent className=" bg-background text-secondary-foreground px-4">
          <DialogHeader>
            <DialogTitle>Wallet Details</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-4 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Address</span>
              <span>{connectedAddress}</span>
            </div>

            <div className="flex justify-between">
              <span className="text-muted-foreground">Wallet</span>
              <span>{connectedWalletName}</span>
            </div>

            <div className="flex justify-between">
              <span className="text-muted-foreground">Balance</span>
              <span>{personalBalance} SOL</span>
            </div>

            {personalUsdValue !== null && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">USD Value</span>
                <span>${personalUsdValue.toFixed(2)}</span>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant={connectedAddress ? "secondary" : triggerVariant}
            size={triggerSize}
            className={cn(
              "flex items-center gap-3 min-w-[140px] justify-center",
              triggerClassName
            )}
          >
            <Wallet className="h-4 w-4" />
            <span>{truncateAddress(connectedAddress)}</span>
            <ChevronDown className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align="end"
          className="mt-2 text-secondary-foreground bg-secondary shadow-xl px-1.5"
        >
          {user && 
            <Link
            href={`/profile/${user.username}`}
            >
          <DropdownMenuItem>
            <User /> Profil
          </DropdownMenuItem>
            </Link>
                      }
          <DropdownMenuItem onClick={() => setViewWalletOpen(true)}>
            <Wallet2 /> View wallet
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleCopyAddress}>
            <Copy /> Copy Address
          </DropdownMenuItem>
          <DropdownMenuSeparator />

          {/* Wallet actions available to the user */}

          {/* If wallet is connected, display deposit + balance + notifications */}
          {user && wallet.connected && wallet.publicKey && (
            <>
              <DropdownMenuItem>
                <Link
                  className="text-orange-400 w-full flex gap-3 items-center"
                  href="/deposit"
                >
                  <CircleDollarSign />
                  Deposit
                </Link>

                {/* <NotificationsDropdown enabled={Boolean(user)} /> */}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}
          <DropdownMenuItem onClick={handleDisconnect} className="text-red-400">
            <LogOut /> Log out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
