import { createContext, useContext, ReactNode, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { User } from "@shared/schema";

interface AuthContextType {
  user: User | null | undefined;
  isLoading: boolean;
  login: (walletAddress: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
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
        return null;
      }
    },
    retry: false,
  });

  const loginMutation = useMutation({
    mutationFn: async (data: { walletAddress: string; password: string }) => {
      const response = await apiRequest("POST", "/api/auth/login", data);
      return await response.json();
    },
    onSuccess: (data) => {
      console.log("[AuthContext] Login response data:", data);
      queryClient.setQueryData(["/api/auth/me"], data);
      console.log("[AuthContext] Query cache after setQueryData:", queryClient.getQueryData(["/api/auth/me"]));
    },
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

  const login = async (walletAddress: string, password: string) => {
    await loginMutation.mutateAsync({ walletAddress, password });
  };

  const logout = () => {
    logoutMutation.mutate();
  };

  const contextValue = useMemo(
    () => ({ user, isLoading, login, logout }),
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
