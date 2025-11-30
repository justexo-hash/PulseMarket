import { db } from "../db";
import {
  users,
  bets,
  markets,
  transactions,
  userFollowers,
} from "@shared/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import type { User } from "@shared/schema";
import { publishFollowerNotification } from "./notifications";

export interface CalibrationBucket {
  bucket: number;
  predictions: number;
  correct: number;
  winRate: number;
}

export interface SectorStat {
  category: string;
  total: number;
  wins: number;
  winRate: number;
}

export interface PulseProfileSummary {
  user: {
    id: number;
    username: string;
    displayName: string;
    bio: string | null;
    avatarUrl: string | null;
    walletAddress: string;
    joinedAt: Date;
  };
  stats: {
    realizedPnl: number;
    totalPredictions: number;
    resolvedPredictions: number;
    correctPredictions: number;
    winRate: number;
    calibrationBuckets: CalibrationBucket[];
    sectorSpecialization: SectorStat[];
  };
  followers: {
    followersCount: number;
    followingCount: number;
    isFollowing: boolean;
  };
  recentBets: Array<{
    id: number;
    position: string;
    amount: number;
    probability: number;
    createdAt: Date;
    marketQuestion: string | null;
    marketSlug: string | null;
    marketInviteCode: string | null;
    marketCategory: string | null;
    resolvedOutcome: string | null;
    marketStatus: string | null;
  }>;
}

export async function getPulseProfile(
  username: string,
  viewerId?: number
): Promise<PulseProfileSummary | null> {
  const user = await db.query.users.findFirst({
    where: eq(users.username, username),
  });

  if (!user) {
    return null;
  }

  const [betRows, followerMeta, followingMeta, isFollowingMeta] =
    await Promise.all([
      db
        .select({
          id: bets.id,
          position: bets.position,
          amount: bets.amount,
          probability: bets.probability,
          createdAt: bets.createdAt,
          marketQuestion: markets.question,
          marketSlug: markets.slug,
          marketInviteCode: markets.inviteCode,
          marketCategory: markets.category,
          marketStatus: markets.status,
          resolvedOutcome: markets.resolvedOutcome,
        })
        .from(bets)
        .leftJoin(markets, eq(bets.marketId, markets.id))
        .where(eq(bets.userId, user.id))
        .orderBy(desc(bets.createdAt))
        .limit(100),
      db
        .select({ count: sql<number>`count(*)` })
        .from(userFollowers)
        .where(eq(userFollowers.followeeId, user.id)),
      db
        .select({ count: sql<number>`count(*)` })
        .from(userFollowers)
        .where(eq(userFollowers.followerId, user.id)),
      viewerId
        ? db
            .select({ count: sql<number>`count(*)` })
            .from(userFollowers)
            .where(
              and(
                eq(userFollowers.followerId, viewerId),
                eq(userFollowers.followeeId, user.id)
              )
            )
        : Promise.resolve([{ count: 0 }]),
    ]);

  const resolvedBets = betRows.filter(
    (bet) => bet.marketStatus === "resolved" && !!bet.resolvedOutcome
  );
  const correctBets = resolvedBets.filter(
    (bet) => bet.resolvedOutcome === bet.position
  );

  const transactionsRows = await db
    .select({
      amount: transactions.amount,
      type: transactions.type,
      marketId: transactions.marketId,
    })
    .from(transactions)
    .where(eq(transactions.userId, user.id));

  const totalPayouts = sumBy(
    transactionsRows.filter((tx) => tx.type === "payout"),
    (tx) => parseFloat(tx.amount as string)
  );
  const totalRefunds = sumBy(
    transactionsRows.filter((tx) => tx.type === "refund"),
    (tx) => parseFloat(tx.amount as string)
  );

  const resolvedStake = resolvedBets.reduce(
    (sum, bet) => sum + parseFloat(bet.amount as string),
    0
  );

  const realizedPnl = Number(
    (totalPayouts + totalRefunds - resolvedStake).toFixed(4)
  );

  const calibrationMap = new Map<number, { total: number; correct: number }>();

  resolvedBets.forEach((bet) => {
    const bucket = clampBucket(bet.probability ?? 50);
    const entry = calibrationMap.get(bucket) || { total: 0, correct: 0 };
    entry.total += 1;
    if (bet.resolvedOutcome === bet.position) {
      entry.correct += 1;
    }
    calibrationMap.set(bucket, entry);
  });

  const calibrationBuckets: CalibrationBucket[] = Array.from(
    calibrationMap.entries()
  )
    .map(([bucket, entry]) => ({
      bucket,
      predictions: entry.total,
      correct: entry.correct,
      winRate: entry.total > 0 ? entry.correct / entry.total : 0,
    }))
    .sort((a, b) => a.bucket - b.bucket);

  const sectorMap = new Map<
    string,
    { total: number; wins: number }
  >();
  resolvedBets.forEach((bet) => {
    const category = bet.marketCategory || "General";
    const entry = sectorMap.get(category) || { total: 0, wins: 0 };
    entry.total += 1;
    if (bet.resolvedOutcome === bet.position) {
      entry.wins += 1;
    }
    sectorMap.set(category, entry);
  });

  const sectorSpecialization: SectorStat[] = Array.from(
    sectorMap.entries()
  )
    .map(([category, entry]) => ({
      category,
      total: entry.total,
      wins: entry.wins,
      winRate: entry.total > 0 ? entry.wins / entry.total : 0,
    }))
    .sort((a, b) => b.total - a.total);

  return {
    user: {
      id: user.id,
      username: user.username,
      displayName: user.displayName || user.username,
      bio: user.bio,
      avatarUrl: user.avatarUrl,
      walletAddress: user.walletAddress,
      joinedAt: user.createdAt,
    },
    stats: {
      realizedPnl,
      totalPredictions: betRows.length,
      resolvedPredictions: resolvedBets.length,
      correctPredictions: correctBets.length,
      winRate:
        resolvedBets.length > 0 ? correctBets.length / resolvedBets.length : 0,
      calibrationBuckets,
      sectorSpecialization,
    },
    followers: {
      followersCount: Number(followerMeta[0]?.count || 0),
      followingCount: Number(followingMeta[0]?.count || 0),
      isFollowing: Boolean(isFollowingMeta?.[0]?.count),
    },
    recentBets: betRows.slice(0, 10).map((bet) => ({
      id: Number(bet.id),
      position: bet.position,
      amount: parseFloat(bet.amount as string),
      probability: bet.probability ?? 0,
      createdAt: bet.createdAt,
      marketQuestion: bet.marketQuestion,
      marketSlug: bet.marketSlug,
      marketInviteCode: bet.marketInviteCode,
      marketCategory: bet.marketCategory,
      resolvedOutcome: bet.resolvedOutcome,
      marketStatus: bet.marketStatus,
    })),
  };
}

const ESCAPE_LIKE_REGEX = /[%_]/g;
function buildSearchTerm(query: string) {
  return `%${query.replace(ESCAPE_LIKE_REGEX, (char) => `\\${char}`)}%`;
}

export async function searchProfiles(query: string, limit = 5) {
  if (!query.trim()) {
    return [];
  }

  const term = buildSearchTerm(query.trim());

  return db
    .select({
      id: users.id,
      username: users.username,
      displayName: users.displayName,
      avatarUrl: users.avatarUrl,
      bio: users.bio,
    })
    .from(users)
    .where(
      sql`${users.username} ILIKE ${term} OR ${users.displayName} ILIKE ${term}`
    )
    .orderBy(sql`LENGTH(${users.username}) ASC`)
    .limit(Math.max(1, Math.min(limit, 20)));
}

export async function followUser(
  followerId: number,
  followeeId: number
): Promise<void> {
  if (followerId === followeeId) {
    throw new Error("Cannot follow yourself");
  }

  const existing = await db
    .select({ id: userFollowers.id })
    .from(userFollowers)
    .where(
      and(
        eq(userFollowers.followerId, followerId),
        eq(userFollowers.followeeId, followeeId)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    return;
  }

  await db.insert(userFollowers).values({ followerId, followeeId });

  const follower = await getUserById(followerId);
  if (follower) {
    await publishFollowerNotification(
      {
        id: follower.id,
        username: follower.username,
        displayName: follower.displayName,
      },
      followeeId
    );
  }
}

export async function unfollowUser(
  followerId: number,
  followeeId: number
): Promise<void> {
  await db
    .delete(userFollowers)
    .where(
      and(
        eq(userFollowers.followerId, followerId),
        eq(userFollowers.followeeId, followeeId)
      )
    );
}

export async function getUserById(userId: number): Promise<User | undefined> {
  const result = await db.select().from(users).where(eq(users.id, userId));
  return result[0];
}

function sumBy<T>(rows: T[], fn: (row: T) => number): number {
  return rows.reduce((sum, row) => sum + fn(row), 0);
}

function clampBucket(probability: number): number {
  const clamped = Math.max(0, Math.min(100, probability));
  return Math.round(clamped / 10) * 10;
}

