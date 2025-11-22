import {
  pgTable,
  serial,
  text,
  integer,
  timestamp,
  numeric,
  jsonb,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  walletAddress: text("wallet_address").notNull().unique(),
  password: text("password").notNull(),
  balance: numeric("balance", { precision: 20, scale: 9 }).notNull().default("0"), // SOL balance with 9 decimal places
  isAdmin: integer("is_admin").notNull().default(0), // 0 = false, 1 = true
  username: text("username").notNull().unique(),
  displayName: text("display_name"),
  bio: text("bio"),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const markets = pgTable("markets", {
  id: serial("id").primaryKey(),
  question: text("question").notNull(),
  category: text("category").notNull(),
  probability: integer("probability").notNull().default(50),
  status: text("status").notNull().default("active"),
  resolvedOutcome: text("resolved_outcome"),
  yesPool: numeric("yes_pool", { precision: 20, scale: 9 }).notNull().default("0"), // Total SOL in YES pool
  noPool: numeric("no_pool", { precision: 20, scale: 9 }).notNull().default("0"), // Total SOL in NO pool
  expiresAt: timestamp("expires_at"), // Optional expiration date
  commitmentHash: text("commitment_hash"), // Provably fair: hash(outcome + secret) - committed before resolution
  commitmentSecret: text("commitment_secret"), // Provably fair: revealed secret after resolution
  isPrivate: integer("is_private").notNull().default(0), // 0 = public, 1 = private wager
  inviteCode: text("invite_code"), // Unique invite code for private wagers
  slug: text("slug"), // URL-friendly slug for public markets (e.g., "trump-2024-id5252643646")
  createdBy: integer("created_by").references(() => users.id, { onDelete: "set null" }), // Creator of private wager
  payoutType: text("payout_type").notNull().default("proportional"), // "proportional" or "winner-takes-all"
  image: text("image"), // Optional market image URL
  tokenAddress: text("token_address"), // Optional Solana token contract address
  createdAt: timestamp("created_at").notNull().defaultNow(), // Track when market was created
});

export const bets = pgTable("bets", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  marketId: integer("market_id").notNull().references(() => markets.id, { onDelete: "cascade" }),
  position: text("position").notNull(), // "yes" or "no"
  amount: numeric("amount", { precision: 20, scale: 9 }).notNull(), // SOL amount
  probability: integer("probability").notNull(), // Probability at time of bet
  commitmentHash: text("commitment_hash"), // Provably fair: hash(outcome + secret) - stored before resolution
  commitmentSecret: text("commitment_secret"), // Provably fair: revealed secret after resolution
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

const transactionTypes = ["deposit", "bet", "payout", "refund", "withdraw"] as const;
export type TransactionType = (typeof transactionTypes)[number];

export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type").$type<TransactionType>().notNull(),
  amount: numeric("amount", { precision: 20, scale: 9 }).notNull(), // SOL amount (positive for deposits/payouts, negative for bets)
  marketId: integer("market_id").references(() => markets.id, { onDelete: "set null" }), // null for deposits
  betId: integer("bet_id").references(() => bets.id, { onDelete: "set null" }), // null for deposits
  description: text("description"), // Human-readable description
  txSignature: text("tx_signature"), // On-chain transaction signature/hash for verification
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const userStats = pgTable("user_stats", {
  userId: integer("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  realizedPnl: numeric("realized_pnl", { precision: 20, scale: 9 }).notNull().default("0"),
  totalPredictions: integer("total_predictions").notNull().default(0),
  correctPredictions: integer("correct_predictions").notNull().default(0),
  calibrationScore: numeric("calibration_score", { precision: 6, scale: 3 }).notNull().default("0"),
  calibrationBuckets: jsonb("calibration_buckets").$type<Record<string, any>[]>().notNull().default(sql`'[]'::jsonb`),
  sectorSpecialization: jsonb("sector_specialization").$type<Record<string, number>>().notNull().default(sql`'{}'::jsonb`),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const userFollowers = pgTable("user_followers", {
  id: serial("id").primaryKey(),
  followerId: integer("follower_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  followeeId: integer("followee_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// User Watchlist (Favorites)
export const watchlist = pgTable("watchlist", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  marketId: integer("market_id").notNull().references(() => markets.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertMarketSchema = createInsertSchema(markets).omit({
  id: true,
  probability: true,
  status: true,
  resolvedOutcome: true,
  yesPool: true,
  noPool: true,
  createdAt: true,
  inviteCode: true,
  createdBy: true,
  image: true, // Remove image from auto-generated schema
}).extend({
  question: z.string().min(10, "Question must be at least 10 characters"),
  category: z.string().min(1, "Category is required"),
  expiresAt: z.string().datetime().nullable().optional(),
  isPrivate: z.boolean().optional(),
  payoutType: z.enum(["proportional", "winner-takes-all"]).optional(),
  image: z.string().optional().refine(
    (val) => {
      // Allow undefined, null, or empty string
      if (!val || val === "" || val === null || val === undefined) return true;
      // Allow relative paths starting with /uploads/
      if (typeof val === "string" && val.startsWith("/uploads/")) return true;
      // Allow valid URLs (both absolute and relative)
      if (typeof val === "string") {
        // Try to parse as URL - if it's a relative path like /uploads/..., it will fail
        // So we check for /uploads/ first, then try URL parsing
        try {
          new URL(val);
          return true;
        } catch {
          // If URL parsing fails, it might still be valid if it starts with /
          return val.startsWith("/");
        }
      }
      return false;
    },
    { message: "Image must be a valid URL or uploaded file path" }
  ),
  tokenAddress: z.string().nullable().optional().or(z.literal("")),
});

export const resolveMarketSchema = z.object({
  outcome: z.enum(["yes", "no"]),
});

export const betSchema = createInsertSchema(bets).omit({
  id: true,
  userId: true,
  createdAt: true,
  probability: true,
}).extend({
  marketId: z.number().int().positive(),
  position: z.enum(["yes", "no"]),
  amount: z.string().refine((val) => {
    const num = parseFloat(val);
    return !isNaN(num) && num > 0;
  }, "Amount must be a positive number"),
});

export const depositSchema = z.object({
  amount: z.string().refine((val) => {
    const num = parseFloat(val);
    return !isNaN(num) && num > 0;
  }, "Amount must be a positive number"),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  username: true,
  displayName: true,
  bio: true,
  avatarUrl: true,
}).extend({
  walletAddress: z.string().min(32, "Invalid wallet address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const loginSchema = z.object({
  walletAddress: z.string().min(32, "Invalid wallet address"),
  password: z.string().min(1, "Password is required"),
});

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Market = typeof markets.$inferSelect;
export type InsertMarket = z.infer<typeof insertMarketSchema> & {
  expiresAt?: string | Date | null;
};
export type Bet = typeof bets.$inferSelect;
export type InsertBet = z.infer<typeof betSchema>;
export type Transaction = typeof transactions.$inferSelect;
export type WatchlistItem = typeof watchlist.$inferSelect;
export type UserStats = typeof userStats.$inferSelect;
export type UserFollower = typeof userFollowers.$inferSelect;
