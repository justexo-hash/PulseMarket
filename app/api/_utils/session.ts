import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/nextAuthOptions";

export interface SessionPayload {
  userId: number;
  walletAddress: string;
}

export async function getSession(): Promise<SessionPayload | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return null;
  }
  return {
    userId: session.user.id,
    walletAddress: session.user.walletAddress,
  };
}
