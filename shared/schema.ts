import { pgTable, serial, text, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const markets = pgTable("markets", {
  id: serial("id").primaryKey(),
  question: text("question").notNull(),
  category: text("category").notNull(),
  probability: integer("probability").notNull().default(50),
});

export const insertMarketSchema = createInsertSchema(markets).omit({
  id: true,
  probability: true,
}).extend({
  question: z.string().min(10, "Question must be at least 10 characters"),
  category: z.string().min(1, "Category is required"),
});

export type Market = typeof markets.$inferSelect;
export type InsertMarket = z.infer<typeof insertMarketSchema>;

export const mockMarkets: Omit<Market, "id">[] = [
  {
    question: "Will Ethereum reach $5,000 by 2026?",
    category: "Crypto",
    probability: 65,
  },
  {
    question: "Will 'Dune: Part Two' win Best Picture?",
    category: "Entertainment",
    probability: 22,
  },
  {
    question: "Will AI surpass human intelligence by 2030?",
    category: "Technology",
    probability: 40,
  },
];
