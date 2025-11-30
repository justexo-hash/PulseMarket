import NextAuth, { type DefaultSession } from "next-auth";
import { JWT } from "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: number;
      walletAddress: string;
      username: string;
      isAdmin: boolean;
    };
  }

  interface User {
    id: string | number;
    walletAddress: string;
    username: string;
    isAdmin: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId?: number;
    walletAddress?: string;
    username?: string;
    isAdmin?: boolean;
  }
}


