import { z } from "zod";

export const marketSchema = z.object({
  id: z.number(),
  question: z.string().min(10, "Question must be at least 10 characters"),
  category: z.string().min(1, "Category is required"),
  probability: z.number().min(0).max(100),
});

export const insertMarketSchema = marketSchema.omit({ id: true, probability: true });

export type Market = z.infer<typeof marketSchema>;
export type InsertMarket = z.infer<typeof insertMarketSchema>;

export const mockMarkets: Market[] = [
  {
    id: 1,
    question: "Will Ethereum reach $5,000 by 2026?",
    category: "Crypto",
    probability: 65,
  },
  {
    id: 2,
    question: "Will 'Dune: Part Two' win Best Picture?",
    category: "Entertainment",
    probability: 22,
  },
  {
    id: 3,
    question: "Will AI surpass human intelligence by 2030?",
    category: "Technology",
    probability: 40,
  },
];
