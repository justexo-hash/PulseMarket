import { createContext, useContext, ReactNode, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useWallet } from "@solana/wallet-adapter-react";
import type { User } from "@shared/schema";

interface AuthContextType {
  user: User | null | undefined;
  isLoading: boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const wallet = useWallet();
  
  // Authenticate with wallet when wallet connects
  const walletAuthMutation = useMutation({
    mutationFn: async (walletAddress: string) => {
      const response = await apiRequest("POST", "/api/auth/wallet", { walletAddress });
      return await response.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["/api/auth/me"], data);
    },
  });

  // Auto-authenticate when wallet connects
  useEffect(() => {
    if (wallet.connected && wallet.publicKey && !walletAuthMutation.isPending) {
      const walletAddress = wallet.publicKey.toBase58();
      // Only authenticate if we don't already have a user or it's a different wallet
      const currentUser = queryClient.getQueryData<User | null>(["/api/auth/me"]);
      if (!currentUser || currentUser.walletAddress !== walletAddress) {
        walletAuthMutation.mutate(walletAddress);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wallet.connected, wallet.publicKey]);

  const { data: user, isLoading } = useQuery<User | null>({
    queryKey: ["/api/auth/me"],
    queryFn: async () => {
      try {
        const response = await fetch("/api/auth/me", {
          credentials: "include",
        });
        if (!response.ok) {
          return null;
        }
        return await response.json();
      } catch (error) {
        console.error('[Auth] Error fetching user:', error);
        return null;
      }
    },
    retry: false,
    // Prevent refetch on mount if we already have data
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    staleTime: Infinity,
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/auth/logout", {});
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/auth/me"], null);
      queryClient.clear();
    },
  });

  const logout = () => {
    logoutMutation.mutate();
  };

  const contextValue = useMemo(
    () => ({ user, isLoading, logout }),
    [user, isLoading]
  );

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
