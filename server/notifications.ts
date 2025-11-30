import { db } from "../db";
import {
  userFollowers,
  users,
  transactions,
  markets,
} from "@shared/schema";
import { and, desc, eq, inArray } from "drizzle-orm";

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


