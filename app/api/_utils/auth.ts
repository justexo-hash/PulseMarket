import { storage } from "@server/storage";
import { getSession } from "./session";

export async function requireUser() {
  const session = getSession();
  if (!session?.userId) {
    throw new Error("Not authenticated");
  }

  const user = await storage.getUserById(session.userId);
  if (!user) {
    throw new Error("User not found");
  }

  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (!user.isAdmin) {
    throw new Error("Admin access required");
  }
  return user;
}

export async function requireAdminOrCreator(marketId?: number) {
  const user = await requireUser();

  if (user.isAdmin) {
    return user;
  }

  if (marketId) {
    const market = await storage.getMarketById(marketId);
    if (market && market.isPrivate === 1 && market.createdBy === user.id) {
      return user;
    }
  }

  throw new Error("Admin access required or must be creator of private wager");
}

