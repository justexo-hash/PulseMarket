"use client";

import {
  createContext,
  useContext,
  ReactNode,
  useMemo,
  useEffect,
  useCallback,
  useState,
} from "react";
import { SessionProvider, signIn, signOut, useSession } from "next-auth/react";
import { useWallet } from "@solana/wallet-adapter-react";
import { Buffer } from "buffer";
import { queryClient } from "@/lib/queryClient";
import { getWalletSignMessage } from "@/lib/solanaAuth";
import { useToast } from "@/hooks/use-toast";

type AuthUser = {
  id: number;
  walletAddress: string;
  username: string;
  isAdmin: boolean;
};

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  logout: () => void;
}

if (typeof window !== "undefined") {
  // Ensure Buffer is available when wallet adapters run in the browser
  (window as any).Buffer = (window as any).Buffer || Buffer;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function AuthSyncProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const wallet = useWallet();
  const { toast } = useToast();
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [lastAuthenticatedAddress, setLastAuthenticatedAddress] = useState<string | null>(null);
  const [shouldAuthenticate, setShouldAuthenticate] = useState(false);

  const logout = useCallback(() => {
    signOut({ redirect: false });
    queryClient.clear();
  }, []);

  const authenticateWithWallet = useCallback(
    async (walletAddress: string) => {
      if (!wallet.signMessage) {
        toast({
          title: "Wallet Unsupported",
          description:
            "This wallet does not support message signing. Please use a wallet that supports signMessage.",
          variant: "destructive",
        });
        return;
      }

      setIsAuthenticating(true);
      try {
        const nonceResponse = await fetch("/api/auth/nonce", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ walletAddress }),
        });

        if (!nonceResponse.ok) {
          const error = await nonceResponse.json().catch(() => ({}));
          throw new Error(error.error || "Failed to fetch nonce.");
        }

        const { nonce } = await nonceResponse.json();
        const message = getWalletSignMessage(nonce);
        const encodedMessage = new TextEncoder().encode(message);
        const signature = await wallet.signMessage(encodedMessage);
        const signatureBase64 = Buffer.from(signature).toString("base64");

        const result = await signIn("credentials", {
          walletAddress,
          nonce,
          signature: signatureBase64,
          redirect: false,
        });

        if (result?.error) {
          throw new Error(result.error);
        }

        setLastAuthenticatedAddress(walletAddress);
      } catch (error: any) {
        console.error("[Auth] Wallet authentication failed:", error);
        toast({
          title: "Connection Failed",
          description: error?.message || "Unable to authenticate wallet.",
          variant: "destructive",
        });
        await wallet.disconnect();
      } finally {
        setIsAuthenticating(false);
      }
    },
    [toast, wallet]
  );

  useEffect(() => {
    if (session?.user?.walletAddress) {
      setLastAuthenticatedAddress(session.user.walletAddress);
    }
  }, [session?.user?.walletAddress]);

  useEffect(() => {
    if (
      wallet.connected &&
      wallet.publicKey &&
      wallet.signMessage &&
      !isAuthenticating &&
      status !== "loading"
    ) {
      const currentAddress = wallet.publicKey.toBase58();
      if (session?.user?.walletAddress === currentAddress || lastAuthenticatedAddress === currentAddress) {
        setShouldAuthenticate(false);
      } else {
        setShouldAuthenticate(true);
      }
    } else {
      setShouldAuthenticate(false);
    }
  }, [
    wallet.connected,
    wallet.publicKey,
    wallet.signMessage,
    isAuthenticating,
    status,
    session?.user?.walletAddress,
    lastAuthenticatedAddress,
  ]);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      const currentAddress = wallet.publicKey?.toBase58();
      if (shouldAuthenticate && currentAddress) {
        if (session?.user?.walletAddress && session.user.walletAddress !== currentAddress) {
          await logout();
        }
        if (!cancelled) {
          await authenticateWithWallet(currentAddress);
        }
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [authenticateWithWallet, logout, session?.user?.walletAddress, shouldAuthenticate, wallet.publicKey]);

  const contextValue = useMemo(() => {
    const memoUser: AuthUser | null = session?.user
      ? {
          id: session.user.id,
          walletAddress: session.user.walletAddress,
          username: session.user.username,
          isAdmin: session.user.isAdmin,
        }
      : null;

    return {
      user: memoUser,
      isLoading: status === "loading" || isAuthenticating,
      logout,
    };
  }, [session?.user, status, isAuthenticating, logout]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function AuthProvider({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <AuthSyncProvider>{children}</AuthSyncProvider>
    </SessionProvider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

