import { type Market, type InsertMarket, markets, type User, type InsertUser, users } from "@shared/schema";
import { db } from "../db";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";

export interface IStorage {
  getAllMarkets(): Promise<Market[]>;
  getMarketById(id: number): Promise<Market | undefined>;
  createMarket(market: InsertMarket): Promise<Market>;
  deleteMarket(id: number): Promise<void>;
  resolveMarket(id: number, outcome: "yes" | "no"): Promise<Market | undefined>;
  
  // Auth methods
  createUser(user: InsertUser): Promise<User>;
  getUserByWalletAddress(walletAddress: string): Promise<User | undefined>;
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

  async createUser(insertUser: InsertUser): Promise<User> {
    const hashedPassword = await bcrypt.hash(insertUser.password, 10);
    const result = await db
      .insert(users)
      .values({ ...insertUser, password: hashedPassword })
      .returning();
    return result[0];
  }

  async getUserByWalletAddress(walletAddress: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.walletAddress, walletAddress));
    return result[0];
  }
}

export const storage = new DbStorage();
