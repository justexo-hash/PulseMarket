import { type Market, type InsertMarket, markets } from "@shared/schema";
import { db } from "../db";
import { eq } from "drizzle-orm";

export interface IStorage {
  getAllMarkets(): Promise<Market[]>;
  getMarketById(id: number): Promise<Market | undefined>;
  createMarket(market: InsertMarket): Promise<Market>;
  deleteMarket(id: number): Promise<void>;
  resolveMarket(id: number, outcome: "yes" | "no"): Promise<Market | undefined>;
}

export class DbStorage implements IStorage {
  async getAllMarkets(): Promise<Market[]> {
    return await db.select().from(markets);
  }

  async getMarketById(id: number): Promise<Market | undefined> {
    const result = await db.select().from(markets).where(eq(markets.id, id));
    return result[0];
  }

  async createMarket(insertMarket: InsertMarket): Promise<Market> {
    const probability = Math.floor(Math.random() * 80) + 10;
    const result = await db
      .insert(markets)
      .values({ ...insertMarket, probability })
      .returning();
    return result[0];
  }

  async deleteMarket(id: number): Promise<void> {
    await db.delete(markets).where(eq(markets.id, id));
  }

  async resolveMarket(id: number, outcome: "yes" | "no"): Promise<Market | undefined> {
    const result = await db
      .update(markets)
      .set({ 
        status: "resolved", 
        resolvedOutcome: outcome,
        probability: outcome === "yes" ? 100 : 0
      })
      .where(eq(markets.id, id))
      .returning();
    return result[0];
  }
}

export const storage = new DbStorage();
