import {
  type Market, type InsertMarket, markets, 
  type User, type InsertUser, users,
  type Bet, type InsertBet, bets,
  type Transaction, transactions,
  walletNonces
} from "@shared/schema";
import { db } from "../db";
import { eq, and, sql, desc } from "drizzle-orm";
import bcrypt from "bcrypt";
import { generateInviteCode, isValidInviteCode } from "./inviteCodes";
import { generateSlug } from "./slugs";

export interface IStorage {
  getAllMarkets(): Promise<Market[]>;
  getMarketById(id: number): Promise<Market | undefined>;
  getMarketByInviteCode(inviteCode: string): Promise<Market | undefined>;
  getMarketBySlug(slug: string): Promise<Market | undefined>;
  createMarket(market: InsertMarket): Promise<Market>;
  deleteMarket(id: number): Promise<void>;
  resolveMarket(id: number, outcome: "yes" | "no", commitmentHash?: string, commitmentSecret?: string): Promise<Market | undefined>;
  updateMarketCommitment(id: number, commitmentHash: string, commitmentSecret: string, outcome: "yes" | "no" | "refunded"): Promise<void>;
  
  // Auth methods
  createUser(user: InsertUser): Promise<User>;
  getUserByWalletAddress(walletAddress: string): Promise<User | undefined>;
  getUserById(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  
  // Balance methods
  getUserBalance(userId: number): Promise<string>;
  deposit(userId: number, amount: string): Promise<User>;
  withdraw(userId: number, amount: string): Promise<User>;
  
  // Bet methods
  createBet(userId: number, marketId: number, position: "yes" | "no", amount: string): Promise<Bet>;
  getBetsByUser(userId: number): Promise<Bet[]>;
  getBetsByMarket(marketId: number): Promise<Bet[]>;
  getBetsByUserAndMarket(userId: number, marketId: number): Promise<Bet[]>;
  
  // Pool methods
  updateMarketPools(marketId: number, position: "yes" | "no", amount: string): Promise<Market>;
  
  // Transaction methods
  createTransaction(data: {
    userId: number;
    type: "deposit" | "bet" | "payout" | "refund" | "withdraw";
    amount: string;
    marketId?: number;
    betId?: number;
    description?: string;
    txSignature?: string; // On-chain transaction signature for transparency
  }): Promise<Transaction>;
  getTransactionsByUser(userId: number): Promise<Transaction[]>;
  
  // Payout methods
  calculateAndDistributePayouts(marketId: number, outcome: "yes" | "no"): Promise<void>;
  
  // Admin methods
  refundMarketBets(marketId: number, onChainRefunds?: Array<{ walletAddress: string; amountSOL: number; txSignature?: string }>): Promise<void>;

  // Wallet nonce helpers
  upsertWalletNonce(walletAddress: string, nonce: string, expiresAt: Date): Promise<void>;
  consumeWalletNonce(walletAddress: string, nonce: string): Promise<boolean>;
}

export class DbStorage implements IStorage {
  async getAllMarkets(): Promise<Market[]> {
    return await db.select().from(markets);
  }

  async getMarketById(id: number): Promise<Market | undefined> {
    const result = await db.select().from(markets).where(eq(markets.id, id));
    return result[0];
  }

  async getMarketByInviteCode(inviteCode: string): Promise<Market | undefined> {
    const result = await db.select().from(markets).where(eq(markets.inviteCode, inviteCode)).limit(1);
    return result[0];
  }

  async getMarketBySlug(slug: string): Promise<Market | undefined> {
    const result = await db.select().from(markets).where(eq(markets.slug, slug)).limit(1);
    return result[0];
  }

  async createMarket(insertMarket: InsertMarket & { createdBy?: number; inviteCode?: string }): Promise<Market> {
    // Probability starts at 50% when no bets are placed (equal pools)
    // Will be recalculated automatically when bets are placed via updateMarketPools
    try {
      // Build the values object for insertion
      const values: {
        question: string;
        category: string;
        probability: number;
        expiresAt?: Date;
        isPrivate?: number;
        inviteCode?: string;
        slug?: string;
        createdBy?: number;
        payoutType?: string;
        image?: string | null;
        tokenAddress?: string | null;
      } = {
        question: insertMarket.question,
        category: insertMarket.category,
        probability: 50, // Default to 50% (equal odds) until bets are placed
        isPrivate: insertMarket.isPrivate ? 1 : 0,
        payoutType: insertMarket.payoutType || "proportional",
      };
      
      // Only include expiresAt if it's a valid Date object
      // Drizzle handles undefined fields by not including them in the insert
      const expiresAtValue = insertMarket.expiresAt as Date | string | null | undefined;
      if (
        expiresAtValue instanceof Date &&
        !isNaN(expiresAtValue.getTime())
      ) {
        values.expiresAt = expiresAtValue;
      } else if (typeof expiresAtValue === "string") {
        const parsed = new Date(expiresAtValue);
        if (!isNaN(parsed.getTime())) {
          values.expiresAt = parsed;
        }
      }
      // If expiresAt is null/undefined, we simply don't include it (column will be NULL in DB)
      
      // Handle optional image field (null or empty string becomes null)
      if (insertMarket.image && insertMarket.image.trim() !== "") {
        values.image = insertMarket.image.trim();
      } else {
        values.image = null;
      }
      
      // Handle optional tokenAddress field (null or empty string becomes null)
      if (insertMarket.tokenAddress && insertMarket.tokenAddress.trim() !== "") {
        values.tokenAddress = insertMarket.tokenAddress.trim();
      } else {
        values.tokenAddress = null;
      }
      
      // For private wagers, include invite code and creator
      if (insertMarket.isPrivate) {
        values.inviteCode = insertMarket.inviteCode || generateInviteCode();
        if (insertMarket.createdBy) {
          values.createdBy = insertMarket.createdBy;
        }
      }
      
      // Log what we're inserting for debugging
      console.log('[Storage] Inserting market with values:', {
        question: values.question,
        category: values.category,
        isPrivate: values.isPrivate,
        inviteCode: values.inviteCode,
        createdBy: values.createdBy,
        payoutType: values.payoutType,
      });
      
      const result = await db
        .insert(markets)
        .values(values)
        .returning();
      
      // Generate and update slug for public markets (after we have the ID)
      const createdMarket = result[0];
      if (!createdMarket.isPrivate && !createdMarket.slug) {
        const slug = generateSlug(createdMarket.question, createdMarket.id);
        const updated = await db
          .update(markets)
          .set({ slug })
          .where(eq(markets.id, createdMarket.id))
          .returning();
        return updated[0];
      }
      
      return createdMarket;
    } catch (error: any) {
      // Check if it's a column missing error
      const errorMessage = error?.message || String(error);
      console.error('[Storage] Database error:', errorMessage);
      console.error('[Storage] Error details:', error);
      
      if (errorMessage.includes('expires_at') || errorMessage.includes('created_at') || errorMessage.includes('column') || errorMessage.includes('is_private') || errorMessage.includes('invite_code') || errorMessage.includes('payout_type') || errorMessage.includes('created_by')) {
        console.error('[Storage] Database column error. Run migration: npm run db:push');
        throw new Error(`Database schema mismatch. Please run: npm run db:push. Original error: ${errorMessage}`);
      }
      throw error;
    }
  }

  async deleteMarket(id: number): Promise<void> {
    await db.delete(markets).where(eq(markets.id, id));
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const hashedPassword = await bcrypt.hash(insertUser.password, 10);
    const username = await this.generateUniqueUsername(insertUser.walletAddress);
    const result = await db
      .insert(users)
      .values({ ...insertUser, password: hashedPassword, username })
      .returning();
    return result[0];
  }

  async getUserByWalletAddress(walletAddress: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.walletAddress, walletAddress));
    return result[0];
  }

  async getUserById(id: number): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id));
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
    return result[0];
  }

  private async generateUniqueUsername(walletAddress: string): Promise<string> {
    const base = `forecaster-${walletAddress.slice(0, 6).toLowerCase()}`;
    let candidate = base;
    let suffix = 1;

    // Ensure uniqueness; fallback to random suffix after several tries
    while (await this.getUserByUsername(candidate)) {
      candidate = `${base}-${suffix}`;
      suffix += 1;
      if (suffix > 50) {
        candidate = `forecaster-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        break;
      }
    }

    return candidate;
  }

  async getUserBalance(userId: number): Promise<string> {
    const user = await this.getUserById(userId);
    return user?.balance || "0";
  }

  async deposit(userId: number, amount: string): Promise<User> {
    const user = await this.getUserById(userId);
    if (!user) throw new Error("User not found");
    
    const currentBalance = parseFloat(user.balance || "0");
    const depositAmount = parseFloat(amount);
    const newBalance = (currentBalance + depositAmount).toFixed(9);
    
    const result = await db
      .update(users)
      .set({ balance: newBalance })
      .where(eq(users.id, userId))
      .returning();
    
    // Create transaction record (deposits are private, not shown in activity feed)
    await this.createTransaction({
      userId,
      type: "deposit",
      amount,
      description: `Deposited ${amount} SOL`,
    });
    
    return result[0];
  }

  async withdraw(userId: number, amount: string): Promise<User> {
    const user = await this.getUserById(userId);
    if (!user) throw new Error("User not found");
    
    const currentBalance = parseFloat(user.balance || "0");
    const withdrawAmount = parseFloat(amount);
    
    if (withdrawAmount <= 0) {
      throw new Error("Withdrawal amount must be greater than 0");
    }
    
    if (currentBalance < withdrawAmount) {
      throw new Error("Insufficient balance");
    }
    
    const newBalance = (currentBalance - withdrawAmount).toFixed(9);
    
    const result = await db
      .update(users)
      .set({ balance: newBalance })
      .where(eq(users.id, userId))
      .returning();
    
    // Transaction record is created in the route handler with optional on-chain signature
    
    return result[0];
  }

  async createBet(userId: number, marketId: number, position: "yes" | "no", amount: string): Promise<Bet> {
    // Get current market to calculate probability
    const market = await this.getMarketById(marketId);
    if (!market) throw new Error("Market not found");
    
    if (market.status !== "active") {
      throw new Error("Cannot bet on resolved market");
    }
    
    // Check user balance
    const user = await this.getUserById(userId);
    if (!user) throw new Error("User not found");
    
    const balance = parseFloat(user.balance || "0");
    const betAmount = parseFloat(amount);
    
    if (balance < betAmount) {
      throw new Error("Insufficient balance");
    }
    
    // Calculate current probability based on pools
    const yesPool = parseFloat(market.yesPool || "0");
    const noPool = parseFloat(market.noPool || "0");
    const totalPool = yesPool + noPool;
    // Clamp probability to 0-100 range
    const probability = totalPool > 0 
      ? Math.max(0, Math.min(100, Math.round((yesPool / totalPool) * 100)))
      : 50;
    
    // Deduct balance
    const newBalance = (balance - betAmount).toFixed(9);
    await db
      .update(users)
      .set({ balance: newBalance })
      .where(eq(users.id, userId));
    
    // Create bet
    const betResult = await db
      .insert(bets)
      .values({
        userId,
        marketId,
        position,
        amount,
        probability,
      })
      .returning();
    
    const bet = betResult[0];
    
    // Update market pools
    await this.updateMarketPools(marketId, position, amount);
    
    // Create transaction record
    await this.createTransaction({
      userId,
      type: "bet",
      amount: `-${amount}`, // Negative for bets
      marketId,
      betId: bet.id,
      description: `Bet ${amount} SOL on ${position.toUpperCase()} for market "${market.question}"`,
    });
    
    return bet;
  }

  async getBetsByUser(userId: number): Promise<Bet[]> {
    return await db.select().from(bets).where(eq(bets.userId, userId)).orderBy(desc(bets.createdAt));
  }

  async getBetsByMarket(marketId: number): Promise<Bet[]> {
    return await db.select().from(bets).where(eq(bets.marketId, marketId)).orderBy(desc(bets.createdAt));
  }

  async getBetsByUserAndMarket(userId: number, marketId: number): Promise<Bet[]> {
    return await db
      .select()
      .from(bets)
      .where(and(eq(bets.userId, userId), eq(bets.marketId, marketId)))
      .orderBy(desc(bets.createdAt));
  }

  async updateMarketPools(marketId: number, position: "yes" | "no", amount: string): Promise<Market> {
    const market = await this.getMarketById(marketId);
    if (!market) throw new Error("Market not found");
    
    const yesPool = parseFloat(market.yesPool || "0");
    const noPool = parseFloat(market.noPool || "0");
    const betAmount = parseFloat(amount);
    
    const updates: { yesPool?: string; noPool?: string; probability?: number } = {};
    
    if (position === "yes") {
      const newYesPool = (yesPool + betAmount).toFixed(9);
      updates.yesPool = newYesPool;
    } else {
      const newNoPool = (noPool + betAmount).toFixed(9);
      updates.noPool = newNoPool;
    }
    
    // Recalculate probability based on new pools
    const newYesPool = position === "yes" ? parseFloat(updates.yesPool!) : yesPool;
    const newNoPool = position === "no" ? parseFloat(updates.noPool!) : noPool;
    const totalPool = newYesPool + newNoPool;
    // Clamp probability to 0-100 range
    updates.probability = totalPool > 0 
      ? Math.max(0, Math.min(100, Math.round((newYesPool / totalPool) * 100)))
      : 50;
    
    const result = await db
      .update(markets)
      .set(updates)
      .where(eq(markets.id, marketId))
      .returning();
    
    return result[0];
  }

  async createTransaction(data: {
    userId: number;
    type: "deposit" | "bet" | "payout" | "refund" | "withdraw";
    amount: string;
    marketId?: number;
    betId?: number;
    description?: string;
    txSignature?: string;
  }): Promise<Transaction> {
    const result = await db
      .insert(transactions)
      .values(data)
      .returning();
    return result[0];
  }

  async getTransactionsByUser(userId: number): Promise<Transaction[]> {
    return await db
      .select()
      .from(transactions)
      .where(eq(transactions.userId, userId))
      .orderBy(desc(transactions.createdAt));
  }


  async calculateAndDistributePayouts(
    marketId: number, 
    outcome: "yes" | "no",
    onChainPayouts?: Array<{ walletAddress: string; amountSOL: number; txSignature?: string }>
  ): Promise<void> {
    const market = await this.getMarketById(marketId);
    if (!market) throw new Error("Market not found");
    
    const yesPool = parseFloat(market.yesPool || "0");
    const noPool = parseFloat(market.noPool || "0");
    const totalPool = yesPool + noPool;
    
    if (totalPool === 0) {
      return; // No bets to payout
    }
    
    // Get all bets for this market
    const allBets = await this.getBetsByMarket(marketId);
    
    // Calculate total bet amounts for winners
    const winnerBets = allBets.filter(bet => bet.position === outcome);
    const totalWinnerBets = winnerBets.reduce((sum, bet) => sum + parseFloat(bet.amount), 0);
    
    if (totalWinnerBets === 0) {
      // No winners, refund everyone - this is the same logic as refundMarketBets
      await this.refundMarketBets(marketId);
      return;
    }
    
    // Create a map of on-chain payout results by wallet address
    const payoutMap = new Map<string, { amountSOL: number; txSignature?: string }>();
    if (onChainPayouts) {
      for (const payout of onChainPayouts) {
        payoutMap.set(payout.walletAddress, payout);
      }
    }
    
    // Check if this is a winner-takes-all private wager
    const isWinnerTakesAll = market.payoutType === "winner-takes-all" && market.isPrivate === 1;
    
    if (isWinnerTakesAll) {
      // Winner-takes-all: distribute entire pool equally among all winners
      // If multiple winners, split evenly (simple approach - could also do by bet size)
      if (winnerBets.length === 0) {
        // Safety check: no winners means refund everyone
        await this.refundMarketBets(marketId);
        return;
      }
      const payoutPerWinner = totalPool / winnerBets.length;
      
      for (const bet of winnerBets) {
        const user = await this.getUserById(bet.userId);
        if (!user) continue;
        
        // Check if on-chain payout was successful
        const onChainPayout = payoutMap.get(user.walletAddress);
        const txSignature = onChainPayout?.txSignature;
        
        const currentBalance = parseFloat(user.balance || "0");
        const newBalance = (currentBalance + payoutPerWinner).toFixed(9);
        
        await db
          .update(users)
          .set({ balance: newBalance })
          .where(eq(users.id, bet.userId));
        
        await this.createTransaction({
          userId: bet.userId,
          type: "payout",
          amount: payoutPerWinner.toFixed(9),
          marketId,
          betId: bet.id,
          txSignature: txSignature || undefined,
          description: txSignature 
            ? `Won ${payoutPerWinner.toFixed(9)} SOL (Winner-takes-all: ${outcome.toUpperCase()} outcome)`
            : `Won ${payoutPerWinner.toFixed(9)} SOL (Winner-takes-all: ${outcome.toUpperCase()} outcome)`,
        });
      }
    } else {
      // Proportional payout: distribute based on bet size
      for (const bet of winnerBets) {
        const user = await this.getUserById(bet.userId);
        if (!user) continue;
        
        const betAmount = parseFloat(bet.amount);
        const payout = (betAmount / totalWinnerBets) * totalPool;
        
        // Check if on-chain payout was successful
        const onChainPayout = payoutMap.get(user.walletAddress);
        const txSignature = onChainPayout?.txSignature;
        
        const currentBalance = parseFloat(user.balance || "0");
        const newBalance = (currentBalance + payout).toFixed(9);
        
        await db
          .update(users)
          .set({ balance: newBalance })
          .where(eq(users.id, bet.userId));
        
        await this.createTransaction({
          userId: bet.userId,
          type: "payout",
          amount: payout.toFixed(9),
          marketId,
          betId: bet.id,
          txSignature: txSignature || undefined,
          description: txSignature 
            ? `Won ${payout.toFixed(9)} SOL from ${outcome.toUpperCase()} outcome`
            : `Won ${payout.toFixed(9)} SOL from ${outcome.toUpperCase()} outcome`,
        });
      }
    }
  }

  async refundMarketBets(
    marketId: number,
    onChainRefunds?: Array<{ walletAddress: string; amountSOL: number; txSignature?: string }>
  ): Promise<void> {
    const market = await this.getMarketById(marketId);
    if (!market) throw new Error("Market not found");

    // Get all bets for this market
    const allBets = await this.getBetsByMarket(marketId);

    // Create a map of on-chain refund results by wallet address
    const refundMap = new Map<string, { amountSOL: number; txSignature?: string }>();
    if (onChainRefunds) {
      for (const refund of onChainRefunds) {
        refundMap.set(refund.walletAddress, refund);
      }
    }

    // Refund each bet back to the user
    for (const bet of allBets) {
      const user = await this.getUserById(bet.userId);
      if (!user) continue;

      const refundAmount = parseFloat(bet.amount);

      // Check if on-chain refund was successful
      const onChainRefund = refundMap.get(user.walletAddress);
      const txSignature = onChainRefund?.txSignature;

      // Only update balance if:
      // 1. No on-chain refunds were attempted (treasury keypair not set), OR
      // 2. On-chain refund succeeded (has txSignature)
      if (!onChainRefunds || txSignature) {
        const currentBalance = parseFloat(user.balance || "0");
        const newBalance = (currentBalance + refundAmount).toFixed(9);

        // Update user balance
        await db
          .update(users)
          .set({ balance: newBalance })
          .where(eq(users.id, bet.userId));

        // Create transaction record
        await this.createTransaction({
          userId: bet.userId,
          type: "refund",
          amount: refundAmount.toFixed(9),
          marketId,
          betId: bet.id,
          txSignature: txSignature || undefined,
          description: `Refunded ${refundAmount.toFixed(9)} SOL for market: ${market.question}`,
        });
      }
    }

    // Reset market pools to zero
    await db
      .update(markets)
      .set({ 
        yesPool: "0",
        noPool: "0",
        status: "resolved",
        resolvedOutcome: "refunded",
        probability: 50 // Reset to neutral
      })
      .where(eq(markets.id, marketId));
  }

  async resolveMarket(
    id: number, 
    outcome: "yes" | "no",
    commitmentHash?: string,
    commitmentSecret?: string
  ): Promise<Market | undefined> {
    // Note: calculateAndDistributePayouts is called before this in routes.ts
    // This function only updates the market status
    
    const updates: {
      status: string;
      resolvedOutcome: string;
      probability: number;
      commitmentHash?: string;
      commitmentSecret?: string;
    } = {
      status: "resolved",
      resolvedOutcome: outcome,
      probability: outcome === "yes" ? 100 : 0,
    };

    if (commitmentHash) {
      updates.commitmentHash = commitmentHash;
    }
    if (commitmentSecret) {
      updates.commitmentSecret = commitmentSecret;
    }
    
    // Update market status
    const result = await db
      .update(markets)
      .set(updates)
      .where(eq(markets.id, id))
      .returning();
    return result[0];
  }

  async updateMarketCommitment(
    id: number,
    commitmentHash: string,
    commitmentSecret: string,
    outcome: "yes" | "no" | "refunded"
  ): Promise<void> {
    const updates: {
      status: string;
      resolvedOutcome: string;
      commitmentHash: string;
      commitmentSecret: string;
      probability: number;
    } = {
      status: "resolved",
      resolvedOutcome: outcome,
      commitmentHash,
      commitmentSecret,
      probability: outcome === "yes" ? 100 : outcome === "no" ? 0 : 50,
    };

    await db
      .update(markets)
      .set(updates)
      .where(eq(markets.id, id));
  }

  async upsertWalletNonce(walletAddress: string, nonce: string, expiresAt: Date): Promise<void> {
    await db
      .insert(walletNonces)
      .values({ walletAddress, nonce, expiresAt })
      .onConflictDoUpdate({
        target: walletNonces.walletAddress,
        set: { nonce, expiresAt },
      });
  }

  async consumeWalletNonce(walletAddress: string, nonce: string): Promise<boolean> {
    const record = await db
      .select()
      .from(walletNonces)
      .where(eq(walletNonces.walletAddress, walletAddress))
      .limit(1);

    if (!record[0]) {
      return false;
    }

    const isMatch = record[0].nonce === nonce;
    const isExpired = record[0].expiresAt && record[0].expiresAt < new Date();

    await db.delete(walletNonces).where(eq(walletNonces.walletAddress, walletAddress));

    return isMatch && !isExpired;
  }
}

export const storage = new DbStorage();
