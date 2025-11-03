import { pgTable, serial, text, integer, timestamp, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  walletAddress: text("wallet_address").notNull().unique(),
  password: text("password").notNull(),
  balance: numeric("balance", { precision: 20, scale: 9 }).notNull().default("0"), // SOL balance with 9 decimal places
  isAdmin: integer("is_admin").notNull().default(0), // 0 = false, 1 = true
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

export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // "deposit", "bet", "payout", "refund"
  amount: numeric("amount", { precision: 20, scale: 9 }).notNull(), // SOL amount (positive for deposits/payouts, negative for bets)
  marketId: integer("market_id").references(() => markets.id, { onDelete: "set null" }), // null for deposits
  betId: integer("bet_id").references(() => bets.id, { onDelete: "set null" }), // null for deposits
  description: text("description"), // Human-readable description
  txSignature: text("tx_signature"), // On-chain transaction signature/hash for verification
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
}).extend({
  question: z.string().min(10, "Question must be at least 10 characters"),
  category: z.string().min(1, "Category is required"),
  expiresAt: z.string().datetime().nullable().optional(),
  isPrivate: z.boolean().optional(),
  payoutType: z.enum(["proportional", "winner-takes-all"]).optional(),
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

export const mockMarkets: Omit<Market, "id">[] = [
  {
    question: "Will Ethereum reach $5,000 by 2026?",
    category: "Crypto",
    probability: 65,
    status: "active",
    resolvedOutcome: null,
    yesPool: "0",
    noPool: "0",
    expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
    createdAt: new Date(),
  },
  {
    question: "Will 'Dune: Part Two' win Best Picture?",
    category: "Entertainment",
    probability: 22,
    status: "active",
    resolvedOutcome: null,
    yesPool: "0",
    noPool: "0",
    expiresAt: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000), // 6 months from now
    createdAt: new Date(),
  },
  {
    question: "Will AI surpass human intelligence by 2030?",
    category: "Technology",
    probability: 40,
    status: "active",
    resolvedOutcome: null,
    yesPool: "0",
    noPool: "0",
    expiresAt: new Date(Date.now() + 2190 * 24 * 60 * 60 * 1000), // 6 years from now
    createdAt: new Date(),
  },
];
