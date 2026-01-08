"use client";

import { useState } from "react";
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
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { WalletReadyState } from "@solana/wallet-adapter-base";
import {
  ChevronDown,
  CircleDollarSign,
  Copy,
  Edit,
  LogOut,
  User,
  Wallet,
  Wallet2,
} from "lucide-react";
import Link from "next/link";
import type { WalletDropdownProps } from "./types";
import { useWalletConnection } from "./hooks";
import { truncateAddress, WALLET_READY_STATE_LABELS } from "./constants";

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
  const { user } = useAuth();
  const [viewWalletOpen, setViewWalletOpen] = useState(false);
  const [connectDialogOpen, setConnectDialogOpen] = useState(false);

  const {
    pendingWallet,
    isConnecting,
    connectedAddress,
    connectedWalletName,
    availableWallets,
    handleSelectWallet,
    handleDisconnect,
    handleCopyAddress,
  } = useWalletConnection({ wallet, onDisconnect });

  const personalBalance = onChainBalance ?? 0;
  const personalUsdValue =
    typeof solPriceUsd === "number" ? personalBalance * solPriceUsd : null;

  // Determine the label shown on the trigger button
  const triggerLabel = !isMounted
    ? "Loading..."
    : isConnecting
    ? "Connecting..."
    : connectedAddress
    ? truncateAddress(connectedAddress)
    : "Connect Wallet";

  // Not connected - show wallet selection dialog
  if (!connectedAddress) {
    return (
      <Dialog open={connectDialogOpen} onOpenChange={setConnectDialogOpen}>
        <DialogTrigger asChild>
          <Button
            variant={triggerVariant}
            size={triggerSize}
            disabled={!isMounted || isConnecting}
            className={cn(
              "flex items-center gap-3 min-w-[140px] justify-center",
              triggerClassName
            )}
          >
            <Wallet className="h-4 w-4" />
            <span>{triggerLabel}</span>
          </Button>
        </DialogTrigger>

        <DialogContent className="max-w-[440px] p-0 gap-0 bg-background border-border overflow-hidden">
          <DialogHeader className="px-5 pt-6 pb-5">
            <DialogTitle className="text-xl font-semibold text-foreground">
              Connect Wallet
            </DialogTitle>
            <p className="text-sm text-muted-foreground mt-2">
              Choose your preferred wallet to continue
            </p>
          </DialogHeader>

          <div className="flex flex-col gap-3 px-5 pb-6">
            {availableWallets.length === 0 && (
              <div className="py-8 text-center">
                <Wallet className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
                <p className="text-muted-foreground text-sm">
                  No wallets detected
                </p>
                <p className="text-muted-foreground/70 text-xs mt-1">
                  Install a Solana wallet to continue
                </p>
              </div>
            )}

            {availableWallets.map(({ adapter, readyState }) => {
              const walletKey = `${adapter.name}-${adapter.url ?? ""}`;
              const isInstalled =
                readyState === WalletReadyState.Installed ||
                readyState === WalletReadyState.Loadable;
              const isPending = pendingWallet === adapter.name;
              const isDisabled =
                readyState === WalletReadyState.Unsupported ||
                isConnecting ||
                (pendingWallet !== null && !isPending);

              return (
                <button
                  key={walletKey}
                  onClick={async () => {
                    await handleSelectWallet(adapter.name);
                    if (wallet.connected) {
                      setConnectDialogOpen(false);
                    }
                  }}
                  disabled={isDisabled}
                  className={cn(
                    "group flex items-center gap-4 w-full p-4 rounded-xl transition-all duration-200",
                    "bg-secondary/50 hover:bg-secondary",
                    "disabled:opacity-50 disabled:cursor-not-allowed",
                    isPending && "ring-1 ring-primary/50 bg-primary/5"
                  )}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={adapter.icon}
                    alt={adapter.name}
                    className="h-10 w-10 rounded-xl"
                  />
                  <div className="flex flex-col text-left flex-1">
                    <span className="text-sm font-semibold text-foreground">
                      {adapter.name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {isPending ? (
                        <span className="text-primary">Connecting...</span>
                      ) : isInstalled ? (
                        WALLET_READY_STATE_LABELS[readyState]
                      ) : (
                        "Not installed"
                      )}
                    </span>
                  </div>
                  {isInstalled && !isPending && (
                    <div className="w-2 h-2 rounded-full bg-success opacity-0 group-hover:opacity-100 transition-opacity" />
                  )}
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Connected - show dropdown with wallet info
  return (
    <div className="relative">
      {/* View Wallet Dialog */}
      <Dialog open={viewWalletOpen} onOpenChange={setViewWalletOpen}>
        <DialogContent className="max-w-[440px] p-0 gap-0 bg-background border-border overflow-hidden">
          {user && (
            <DialogHeader className="px-5 pt-6 pb-5 border-b border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <DialogTitle className="text-base font-semibold text-foreground">
                      {user.username}
                    </DialogTitle>
                    <p className="text-xs text-muted-foreground">{connectedWalletName}</p>
                  </div>
                </div>
                <Link href={`/profile/${user.username}`}>
                  <Button variant="ghost" size="sm" className="h-8">
                    <Edit className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              </div>
            </DialogHeader>
          )}

          <div className="p-5 space-y-4">
            {/* Balance Card */}
            <div className="p-5 rounded-xl bg-secondary/50">
              <p className="text-xs text-muted-foreground mb-1">Balance</p>
              <p className="text-2xl font-bold text-foreground">
                {personalBalance.toFixed(4)} <span className="text-base font-medium text-muted-foreground">SOL</span>
              </p>
              {personalUsdValue !== null && (
                <p className="text-sm text-muted-foreground mt-0.5">
                  ≈ ${personalUsdValue.toFixed(2)} USD
                </p>
              )}
            </div>

            {/* Address */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-secondary/30">
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Address</p>
                <p className="font-mono text-xs text-foreground">{truncateAddress(connectedAddress, 8)}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={handleCopyAddress} className="h-8">
                <Copy className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Connected Wallet Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="secondary"
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
          align={align}
          className="mt-2 text-secondary-foreground bg-secondary shadow-xl px-1.5"
        >
          {user && (
            <DropdownMenuItem asChild>
              <Link
                href={`/profile/${user.username}`}
                className="flex items-center gap-2 cursor-pointer"
              >
                <User className="h-4 w-4" />
                Profile
              </Link>
            </DropdownMenuItem>
          )}

          <DropdownMenuItem
            onClick={() => setViewWalletOpen(true)}
            className="cursor-pointer"
          >
            <Wallet2 className="h-4 w-4 mr-2" />
            View wallet
          </DropdownMenuItem>

          <DropdownMenuItem onClick={handleCopyAddress} className="cursor-pointer">
            <Copy className="h-4 w-4 mr-2" />
            Copy Address
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {user && wallet.connected && wallet.publicKey && (
            <>
              <DropdownMenuItem asChild>
                <Link
                  href="/deposit"
                  className="text-primary flex items-center gap-2 cursor-pointer"
                >
                  <CircleDollarSign className="h-4 w-4" />
                  Deposit
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}

          <DropdownMenuItem
            onClick={handleDisconnect}
            className="text-destructive cursor-pointer"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Log out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
