"use client";

import { useMemo, ReactNode, useEffect } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-phantom';
import { SolflareWalletAdapter } from '@solana/wallet-adapter-solflare';
import { TorusWalletAdapter } from '@solana/wallet-adapter-torus';
import { clusterApiUrl } from '@solana/web3.js';
import {
  registerMwa,
  createDefaultAuthorizationCache,
  createDefaultChainSelector,
  createDefaultWalletNotFoundHandler,
} from '@solana-mobile/wallet-standard-mobile';

// Import wallet adapter CSS
import '@solana/wallet-adapter-react-ui/styles.css';

type EnvKey = "SOLANA_NETWORK" | "SOLANA_RPC_URL";

const nextEnvMap: Record<EnvKey, string | undefined> = {
  SOLANA_NETWORK:
    typeof process !== "undefined"
      ? process.env.NEXT_PUBLIC_SOLANA_NETWORK ?? process.env.SOLANA_NETWORK
      : undefined,
  SOLANA_RPC_URL:
    typeof process !== "undefined"
      ? process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? process.env.SOLANA_RPC_URL
      : undefined,
};

function getEnvVar(key: EnvKey): string | undefined {
  try {
    const viteEnv =
      typeof import.meta !== "undefined" ? (import.meta as any).env : undefined;
    if (viteEnv) {
      const viteKey = `VITE_${key}`;
      if (viteEnv[viteKey]) {
        return viteEnv[viteKey];
      }
    }
  } catch {
    // Ignore - import.meta isn't available outside Vite builds
  }

  return nextEnvMap[key];
}

interface WalletContextProviderProps {
  children: ReactNode;
}

export function WalletContextProvider({ children }: WalletContextProviderProps) {
  const { network, endpoint } = useMemo(() => {
    const resolvedNetwork =
      (getEnvVar("SOLANA_NETWORK") as WalletAdapterNetwork | undefined) ??
      WalletAdapterNetwork.Mainnet;

    const customRpc = getEnvVar("SOLANA_RPC_URL");
    if (customRpc) {
      console.log('[Wallet] Using custom RPC endpoint:', customRpc);
      return { network: resolvedNetwork, endpoint: customRpc };
    }
    const defaultRpc = clusterApiUrl(resolvedNetwork);
    console.log('[Wallet] Using default RPC endpoint:', defaultRpc);
    return { network: resolvedNetwork, endpoint: defaultRpc };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      registerMwa({
        appIdentity: {
          name: process.env.NEXT_PUBLIC_APP_NAME || "Polymeme",
          uri:
            process.env.NEXT_PUBLIC_APP_URL ||
            window.location.origin ||
            "https://pulsemkt.app",
          icon: "/logo-white.png",
        },
        authorizationCache: createDefaultAuthorizationCache(),
        chains: ["solana:mainnet", "solana:testnet", "solana:devnet"],
        chainSelector: createDefaultChainSelector(),
        onWalletNotFound: createDefaultWalletNotFoundHandler(),
      });
      console.log("[Wallet] Mobile Wallet Adapter registered");
    } catch (error) {
      console.error("[Wallet] Failed to register Mobile Wallet Adapter", error);
    }
  }, []);

  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
      new TorusWalletAdapter(),
    ],
    []
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          {children}
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}

