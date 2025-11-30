import { db } from "../db";
import {
  userFollowers,
  users,
  transactions,
  markets,
} from "@shared/schema";
import { and, desc, eq, inArray } from "drizzle-orm";
import { publishToUser } from "@lib/realtime/server";

export type NotificationRecord = {
  id: string;
  type: "follower" | "payout" | "refund";
  title: string;
  message: string;
  createdAt: Date;
  href?: string;
};

const NOTIFICATION_LIMIT = 30;

export async function getNotificationsForUser(userId: number) {
  const [followerRows, payoutRows] = await Promise.all([
    db
      .select({
        id: userFollowers.id,
        createdAt: userFollowers.createdAt,
        followerUsername: users.username,
        followerDisplayName: users.displayName,
      })
      .from(userFollowers)
      .innerJoin(users, eq(userFollowers.followerId, users.id))
      .where(eq(userFollowers.followeeId, userId))
      .orderBy(desc(userFollowers.createdAt))
      .limit(NOTIFICATION_LIMIT),
    db
      .select({
        id: transactions.id,
        type: transactions.type,
        amount: transactions.amount,
        createdAt: transactions.createdAt,
        marketQuestion: markets.question,
        marketSlug: markets.slug,
      })
      .from(transactions)
      .leftJoin(markets, eq(transactions.marketId, markets.id))
      .where(
        and(
          eq(transactions.userId, userId),
          inArray(transactions.type, ["payout", "refund"])
        )
      )
      .orderBy(desc(transactions.createdAt))
      .limit(NOTIFICATION_LIMIT),
  ]);

  const followerNotifications: NotificationRecord[] = followerRows.map(
    (row) => ({
      id: `follow-${row.id}`,
      type: "follower",
      title: "New follower",
      message: `${row.followerDisplayName || row.followerUsername} started following you.`,
      createdAt: row.createdAt,
      href: `/profile/${row.followerUsername}`,
    })
  );

  const payoutNotifications: NotificationRecord[] = payoutRows.map((row) => {
    const amount = row.amount ? Number(row.amount) : 0;
    const isRefund = row.type === "refund";
    const title = isRefund ? "Refund issued" : "Bet settled";
    const action = isRefund ? "Refunded" : "Payout";
    const question = row.marketQuestion || "One of your markets";
    return {
      id: `tx-${row.id}`,
      type: isRefund ? "refund" : "payout",
      title,
      message: `${question} • ${action} ${amount.toFixed(2)} SOL`,
      createdAt: row.createdAt,
      href: row.marketSlug ? `/market/${row.marketSlug}` : undefined,
    };
  });

  return [...followerNotifications, ...payoutNotifications]
    .sort(
      (a, b) =>
        b.createdAt.getTime() - a.createdAt.getTime()
    )
    .slice(0, NOTIFICATION_LIMIT);
}

export async function publishFollowerNotification(
  follower: { id: number; username: string; displayName?: string | null },
  targetUserId: number
) {
  const notification = {
    id: `follow-${follower.id}-${Date.now()}`,
    type: "follower" as const,
    title: "New follower",
    message: `${follower.displayName || follower.username} started following you.`,
    createdAt: new Date().toISOString(),
    href: `/profile/${follower.username}`,
  };

  await publishToUser(targetUserId, {
    type: "notification:new",
    data: { userId: targetUserId, notification },
  });
}

export async function publishTransactionNotification(params: {
  userId: number;
  transactionId: number;
  type: "payout" | "refund";
  amount: number;
  marketQuestion?: string | null;
  marketSlug?: string | null;
}) {
  const notification = {
    id: `tx-${params.transactionId}`,
    type: params.type,
    title: params.type === "refund" ? "Refund issued" : "Bet settled",
    message: `${
      params.marketQuestion || "One of your markets"
    } • ${params.type === "refund" ? "Refunded" : "Payout"} ${params.amount.toFixed(
      2
    )} SOL`,
    createdAt: new Date().toISOString(),
    href: params.marketSlug ? `/market/${params.marketSlug}` : undefined,
  };

  await publishToUser(params.userId, {
    type: "notification:new",
    data: { userId: params.userId, notification },
  });
}


