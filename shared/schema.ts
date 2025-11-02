import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  walletAddress: text("wallet_address").notNull().unique(),
  password: text("password").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const markets = pgTable("markets", {
  id: serial("id").primaryKey(),
  question: text("question").notNull(),
  category: text("category").notNull(),
  probability: integer("probability").notNull().default(50),
  status: text("status").notNull().default("active"),
  resolvedOutcome: text("resolved_outcome"),
});

export const insertMarketSchema = createInsertSchema(markets).omit({
  id: true,
  probability: true,
  status: true,
  resolvedOutcome: true,
}).extend({
  question: z.string().min(10, "Question must be at least 10 characters"),
  category: z.string().min(1, "Category is required"),
});

export const resolveMarketSchema = z.object({
  outcome: z.enum(["yes", "no"]),
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
export type InsertMarket = z.infer<typeof insertMarketSchema>;

// Bet type for local storage (not persisted to database)
export const betSchema = z.object({
  id: z.string(),
  marketId: z.number(),
  marketQuestion: z.string(),
  position: z.enum(["yes", "no"]),
  amount: z.number(),
  probability: z.number(),
  timestamp: z.number(),
});

export type Bet = z.infer<typeof betSchema>;

export const mockMarkets: Omit<Market, "id">[] = [
  {
    question: "Will Ethereum reach $5,000 by 2026?",
    category: "Crypto",
    probability: 65,
    status: "active",
    resolvedOutcome: null,
  },
  {
    question: "Will 'Dune: Part Two' win Best Picture?",
    category: "Entertainment",
    probability: 22,
    status: "active",
    resolvedOutcome: null,
  },
  {
    question: "Will AI surpass human intelligence by 2030?",
    category: "Technology",
    probability: 40,
    status: "active",
    resolvedOutcome: null,
  },
];
