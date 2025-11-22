"use client";

import { useMemo, ReactNode } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-phantom';
import { SolflareWalletAdapter } from '@solana/wallet-adapter-solflare';
import { TorusWalletAdapter } from '@solana/wallet-adapter-torus';
import { clusterApiUrl } from '@solana/web3.js';

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

