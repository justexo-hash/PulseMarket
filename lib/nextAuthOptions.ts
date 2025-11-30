import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import crypto from "crypto";
import { storage } from "@server/storage";
import { verifySolanaSignature } from "./solanaAuth";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  providers: [
    CredentialsProvider({
      name: "Solana Wallet",
      credentials: {
        walletAddress: { label: "Wallet Address", type: "text" },
        nonce: { label: "Nonce", type: "text" },
        signature: { label: "Signature", type: "text" },
      },
      async authorize(credentials) {
        const walletAddress = credentials?.walletAddress?.trim();
        const signature = credentials?.signature;
        const nonce = credentials?.nonce;

        if (!walletAddress || !signature || !nonce) {
          throw new Error("Missing credentials");
        }

        const isNonceValid = await storage.consumeWalletNonce(
          walletAddress,
          nonce
        );
        if (!isNonceValid) {
          throw new Error("Invalid or expired nonce");
        }

        const isValidSignature = verifySolanaSignature({
          walletAddress,
          nonce,
          signature,
        });

        if (!isValidSignature) {
          throw new Error("Signature verification failed");
        }

        let user = await storage.getUserByWalletAddress(walletAddress);
        if (!user) {
          const temporaryPassword = crypto.randomBytes(32).toString("hex");
          user = await storage.createUser({
            walletAddress,
            password: temporaryPassword,
          });
        }

        return {
          id: user.id.toString(),
          walletAddress: user.walletAddress,
          username: user.username,
          isAdmin: Boolean(user.isAdmin),
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.userId = Number(user.id);
        token.walletAddress = (user as any).walletAddress;
        token.username = (user as any).username;
        token.isAdmin = (user as any).isAdmin;
      } else if (trigger === "update" && session?.user) {
        if (session.user.username) {
          token.username = session.user.username;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token?.userId) {
        session.user.id = Number(token.userId);
        session.user.walletAddress = token.walletAddress as string;
        session.user.username = token.username as string;
        session.user.isAdmin = Boolean(token.isAdmin);
      }
      return session;
    },
  },
  pages: {
    signIn: "/",
  },
  secret: process.env.NEXTAUTH_SECRET,
};

export type AppSessionUser = {
  id: number;
  walletAddress: string;
  username: string;
  isAdmin: boolean;
};


