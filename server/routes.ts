import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertMarketSchema, resolveMarketSchema, betSchema, depositSchema } from "@shared/schema";
import crypto from "crypto";
import { getTreasuryKeypair, distributePayouts } from "./payouts";
import { realtimeService } from "./websocket";
import { verifyDepositTransaction } from "./deposits";
import { generateCommitmentHash, generateSecret, verifyCommitmentHash } from "./provablyFair";
import { generateInviteCode, isValidInviteCode } from "./inviteCodes";

export async function registerRoutes(app: Express): Promise<Server> {
  // Authentication routes - Wallet-based only
  
  app.post("/api/auth/logout", async (req, res) => {
    req.session?.destroy((err: Error | null) => {
      if (err) {
        return res.status(500).json({ error: "Failed to logout" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });

  app.get("/api/auth/me", async (req, res) => {
    if (!req.session?.userId || !req.session?.walletAddress) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const user = await storage.getUserByWalletAddress(req.session.walletAddress);
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Don't send password back
      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch user" });
    }
  });

  // Wallet-based authentication (no password required)
  // Users are automatically created when they connect wallet or make transactions
  app.post("/api/auth/wallet", async (req, res) => {
    try {
      const { walletAddress } = req.body;
      
      if (!walletAddress || typeof walletAddress !== 'string' || walletAddress.length < 32) {
        return res.status(400).json({ error: "Valid wallet address required" });
      }

      // Find or create user by wallet address
      let user = await storage.getUserByWalletAddress(walletAddress);
      
      if (!user) {
        // Create new user without password (wallet-based auth)
        // Generate a random password hash (not used for wallet auth, but required by schema)
        const randomPassword = crypto.randomBytes(32).toString('hex');
        user = await storage.createUser({
          walletAddress,
          password: randomPassword, // Not used for wallet auth
        });
      }

      // Set session
      if (req.session) {
        req.session.userId = user.id;
        req.session.walletAddress = user.walletAddress;
      }

      // Don't send password back
      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to authenticate wallet" });
    }
  });

  // Get all markets (excluding private wagers)
  app.get("/api/markets", async (req, res) => {
    try {
      const allMarkets = await storage.getAllMarkets();
      // Filter out private wagers from public list
      const publicMarkets = allMarkets.filter(m => m.isPrivate !== 1);
      res.json(publicMarkets);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch markets" });
    }
  });

  // Watchlist routes (require auth)
  app.get("/api/watchlist", async (req, res) => {
    try {
      const userId = req.session?.userId;
      if (!userId) return res.status(401).json({ error: "Not authenticated" });
      const list = await storage.getWatchlist(userId);
      res.json(list);
    } catch (e: any) {
      console.error("[Watchlist] Error fetching watchlist:", e);
      const errorMessage = e?.message || String(e);
      if (errorMessage.includes('watchlist') || errorMessage.includes('column') || errorMessage.includes('table')) {
        return res.status(500).json({ 
          error: "Watchlist table not found. Please run database migration.",
          details: errorMessage 
        });
      }
      res.status(500).json({ error: "Failed to fetch watchlist", details: errorMessage });
    }
  });

  app.post("/api/watchlist/:marketId", async (req, res) => {
    try {
      const userId = req.session?.userId;
      if (!userId) return res.status(401).json({ error: "Not authenticated" });
      const marketId = parseInt(req.params.marketId);
      if (isNaN(marketId)) return res.status(400).json({ error: "Invalid market id" });
      const item = await storage.addToWatchlist(userId, marketId);
      res.json(item);
    } catch (e) {
      res.status(500).json({ error: "Failed to add to watchlist" });
    }
  });

  app.delete("/api/watchlist/:marketId", async (req, res) => {
    try {
      const userId = req.session?.userId;
      if (!userId) return res.status(401).json({ error: "Not authenticated" });
      const marketId = parseInt(req.params.marketId);
      if (isNaN(marketId)) return res.status(400).json({ error: "Invalid market id" });
      await storage.removeFromWatchlist(userId, marketId);
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ error: "Failed to remove from watchlist" });
    }
  });

  // Get market by invite code (for private wagers)
  app.get("/api/wager/:inviteCode", async (req, res) => {
    try {
      const inviteCode = req.params.inviteCode;
      if (!inviteCode || !isValidInviteCode(inviteCode)) {
        return res.status(400).json({ error: "Invalid invite code format" });
      }
      
      const market = await storage.getMarketByInviteCode(inviteCode);
      if (!market) {
        return res.status(404).json({ error: "Private wager not found" });
      }
      
      res.json(market);
    } catch (error: any) {
      console.error("[Wager] Error:", error);
      res.status(500).json({ error: "Failed to fetch private wager" });
    }
  });

  // Get single market by slug or ID (supports both for backward compatibility)
  app.get("/api/markets/:identifier", async (req, res) => {
    try {
      const identifier = req.params.identifier;
      
      // Try parsing as ID first (backward compatibility)
      const id = parseInt(identifier);
      if (!isNaN(id)) {
        const market = await storage.getMarketById(id);
        if (market) {
          return res.json(market);
        }
      }
      
      // If not found by ID, try as slug
      const market = await storage.getMarketBySlug(identifier);
      
      if (!market) {
        return res.status(404).json({ error: "Market not found" });
      }
      
      res.json(market);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch market" });
    }
  });

  // Create new market
  app.post("/api/markets", async (req, res) => {
    try {
      // Get user ID from session (optional for private wagers)
      const userId = req.session?.userId;

      const result = insertMarketSchema.safeParse(req.body);
      
      if (!result.success) {
        return res.status(400).json({ error: result.error.errors });
      }

      // Convert expiresAt from ISO string to Date object if provided
      // Handle empty string, null, undefined, or actual date string
      let expiresAt: Date | null = null;
      if (result.data.expiresAt) {
        const dateStr = typeof result.data.expiresAt === 'string' 
          ? result.data.expiresAt.trim() 
          : String(result.data.expiresAt).trim();
        if (dateStr && dateStr !== 'null' && dateStr !== 'undefined') {
          expiresAt = new Date(dateStr);
          // Validate the date
          if (isNaN(expiresAt.getTime())) {
            return res.status(400).json({ error: "Invalid expiration date format" });
          }
        }
      }

      // For private wagers, generate invite code and set creator
      let inviteCode: string | undefined;
      if (result.data.isPrivate) {
        inviteCode = generateInviteCode();
        // Ensure uniqueness (very unlikely collision, but check anyway)
        let existing = await storage.getMarketByInviteCode(inviteCode);
        let attempts = 0;
        while (existing && attempts < 10) {
          inviteCode = generateInviteCode();
          existing = await storage.getMarketByInviteCode(inviteCode);
          attempts++;
        }
        if (existing) {
          return res.status(500).json({ error: "Failed to generate unique invite code. Please try again." });
        }
      }

      const marketData = {
        ...result.data,
        expiresAt,
        inviteCode,
        createdBy: result.data.isPrivate ? userId : undefined,
        payoutType: result.data.payoutType || (result.data.isPrivate ? "winner-takes-all" : "proportional"),
      };

      const market = await storage.createMarket(marketData);
      
      // Broadcast new market event (only for public markets)
      if (!market.isPrivate) {
        realtimeService.broadcast({ type: 'market:created', data: market });
      }
      
      res.status(201).json(market);
    } catch (error: any) {
      console.error("[Market] Error creating market:", error);
      console.error("[Market] Error stack:", error?.stack);
      
      // Provide helpful error message for database schema issues
      const errorMessage = error?.message || String(error);
      if (errorMessage.includes('column') || errorMessage.includes('expires_at') || errorMessage.includes('created_at') || errorMessage.includes('is_private') || errorMessage.includes('invite_code')) {
        return res.status(500).json({ 
          error: "Database schema mismatch. Please run: npm run db:push",
          details: errorMessage
        });
      }
      
      // Log full error for debugging
      console.error("[Market] Full error:", error);
      console.error("[Market] Error stack:", error?.stack);
      
      res.status(500).json({ 
        error: "Failed to create market",
        details: process.env.NODE_ENV === "development" ? errorMessage : undefined,
        hint: errorMessage.includes('column') || errorMessage.includes('is_private') || errorMessage.includes('invite_code') || errorMessage.includes('payout_type') || errorMessage.includes('created_by')
          ? "Database schema mismatch. Please run: npm run db:push"
          : undefined
      });
    }
  });

  // Delete market
  app.delete("/api/markets/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid market ID" });
      }
      
      await storage.deleteMarket(id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete market" });
    }
  });

  // Middleware to check admin status
  const requireAdmin = async (req: any, res: any, next: any) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const user = await storage.getUserById(req.session.userId);
      if (!user) {
        return res.status(403).json({ error: "User not found" });
      }
      
      // Admins have access to everything
      if (user.isAdmin) {
        return next();
      }
      
      // For market-specific routes, check if user is the creator of a private wager
      const marketId = parseInt(req.params.id);
      if (!isNaN(marketId)) {
        const market = await storage.getMarketById(marketId);
        if (market && market.isPrivate === 1 && market.createdBy === user.id) {
          // Creator of private wager can resolve/refund their own wager
          return next();
        }
      }
      
      return res.status(403).json({ error: "Admin access required or must be creator of private wager" });
    } catch (error) {
      res.status(500).json({ error: "Failed to verify access" });
    }
  };

  // Refund market bets (admin only)
  app.post("/api/markets/:id/refund", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid market ID" });
      }

      const market = await storage.getMarketById(id);
      if (!market) {
        return res.status(404).json({ error: "Market not found" });
      }

      if (market.status === "resolved") {
        return res.status(400).json({ error: "Cannot refund a resolved market" });
      }

      // Get all bets for this market
      const allBets = await storage.getBetsByMarket(id);
      const yesPool = parseFloat(market.yesPool || "0");
      const noPool = parseFloat(market.noPool || "0");
      const totalPool = yesPool + noPool;

      let onChainRefundResults: Array<{ walletAddress: string; amountSOL: number; txSignature: string | null; error?: string }> = [];

      // If there are bets, send on-chain refunds
      if (totalPool > 0 && allBets.length > 0) {
        // Get treasury keypair
        const treasuryKeypair = getTreasuryKeypair();
        
        if (treasuryKeypair) {
          // Prepare refunds: each user gets back exactly what they bet
          const refunds: Array<{ walletAddress: string; amountSOL: number }> = [];
          
          for (const bet of allBets) {
            const user = await storage.getUserById(bet.userId);
            if (!user) continue;
            
            const refundAmount = parseFloat(bet.amount);
            
            refunds.push({
              walletAddress: user.walletAddress,
              amountSOL: refundAmount,
            });
          }

          // Send on-chain refunds
          console.log(`[Refund] Distributing ${refunds.length} refund(s) totaling ${totalPool} SOL`);
          onChainRefundResults = await distributePayouts(treasuryKeypair, refunds);
          
          // Log results
          const successful = onChainRefundResults.filter(r => r.txSignature).length;
          const failed = onChainRefundResults.filter(r => !r.txSignature).length;
          console.log(`[Refund] Refunds: ${successful} successful, ${failed} failed`);
        } else {
          console.warn(`[Refund] Treasury keypair not available. Database refunds only.`);
        }
      }

      // Update database with refunds (including on-chain transaction signatures)
      const onChainRefunds = onChainRefundResults
        .filter(r => r.txSignature)
        .map(r => ({
          walletAddress: r.walletAddress,
          amountSOL: r.amountSOL,
          txSignature: r.txSignature!,
        }));

      await storage.refundMarketBets(id, onChainRefunds);

      // Generate provably fair commitment for refund
      const secret = generateSecret();
      const commitmentHash = generateCommitmentHash("refunded", secret, id);
      
      // Update market with provably fair data
      await storage.updateMarketCommitment(id, commitmentHash, secret, "refunded");
      
      console.log(`[Refund] Market ${id} refunded with provably fair commitment: ${commitmentHash}`);

      // Prepare response with refund results
      const successfulRefunds = onChainRefundResults.filter(r => r.txSignature).length;
      const failedRefunds = onChainRefundResults.filter(r => !r.txSignature).length;
      
      // Broadcast market update and balance updates for all affected users
      realtimeService.broadcast({ type: 'market:updated', data: { id } });
      // Get all bets to notify users
      const userIds = [...new Set(allBets.map(b => b.userId))];
      userIds.forEach(userId => {
        realtimeService.broadcastToUser(userId, { type: 'balance:updated', data: { userId } });
      });
      
      res.json({ 
        message: "Market bets refunded successfully",
        refundResults: {
          total: onChainRefundResults.length,
          successful: successfulRefunds,
          failed: failedRefunds,
        }
      });
    } catch (error: any) {
      console.error("[Refund] Error:", error);
      res.status(500).json({ error: error.message || "Failed to refund market bets" });
    }
  });

  // Resolve market (admin only)
  app.post("/api/markets/:id/resolve", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid market ID" });
      }

      const result = resolveMarketSchema.safeParse(req.body);
      
      if (!result.success) {
        return res.status(400).json({ error: result.error.errors });
      }

      const outcome = result.data.outcome;
      
      // Get market and calculate payouts
      const market = await storage.getMarketById(id);
      if (!market) {
        return res.status(404).json({ error: "Market not found" });
      }

      // Get all bets for this market to calculate payouts
      const allBets = await storage.getBetsByMarket(id);
      const yesPool = parseFloat(market.yesPool || "0");
      const noPool = parseFloat(market.noPool || "0");
      const totalPool = yesPool + noPool;

      let onChainPayoutResults: Array<{ walletAddress: string; amountSOL: number; txSignature: string | null; error?: string }> = [];

      // If there are bets and winners, send on-chain payouts
      if (totalPool > 0) {
        const winnerBets = allBets.filter(bet => bet.position === outcome);
        const totalWinnerBets = winnerBets.reduce((sum, bet) => sum + parseFloat(bet.amount), 0);

        if (totalWinnerBets > 0) {
          // Get treasury keypair
          const treasuryKeypair = getTreasuryKeypair();
          
          if (treasuryKeypair) {
            // Calculate payouts for each winner
            const payouts: Array<{ walletAddress: string; amountSOL: number }> = [];
            
            // Check if this is a winner-takes-all private wager
            const isWinnerTakesAll = market.payoutType === "winner-takes-all" && market.isPrivate === 1;
            
            for (const bet of winnerBets) {
              const user = await storage.getUserById(bet.userId);
              if (!user) continue;
              
              let payoutAmount: number;
              if (isWinnerTakesAll) {
                // Winner-takes-all: split pool equally among all winners
                payoutAmount = totalPool / winnerBets.length;
              } else {
                // Proportional: based on bet size
                const betAmount = parseFloat(bet.amount);
                payoutAmount = (betAmount / totalWinnerBets) * totalPool;
              }
              
              payouts.push({
                walletAddress: user.walletAddress,
                amountSOL: payoutAmount,
              });
            }

            // Send on-chain payouts
            console.log(`[Resolve] Distributing ${payouts.length} payouts totaling ${totalPool} SOL`);
            onChainPayoutResults = await distributePayouts(treasuryKeypair, payouts);
            
            // Log results
            const successful = onChainPayoutResults.filter(r => r.txSignature).length;
            const failed = onChainPayoutResults.filter(r => !r.txSignature).length;
            console.log(`[Resolve] Payouts: ${successful} successful, ${failed} failed`);
          } else {
            console.warn(`[Resolve] Treasury keypair not available. Database payouts only.`);
          }
        }
      }

      // Update database with payouts (including on-chain transaction signatures)
      const onChainPayouts = onChainPayoutResults
        .filter(r => r.txSignature)
        .map(r => ({
          walletAddress: r.walletAddress,
          amountSOL: r.amountSOL,
          txSignature: r.txSignature!,
        }));

      await storage.calculateAndDistributePayouts(id, outcome, onChainPayouts);

      // Generate provably fair commitment
      const secret = generateSecret();
      const commitmentHash = generateCommitmentHash(outcome, secret, id);
      
      // Verify the commitment is valid
      const isValid = verifyCommitmentHash(commitmentHash, outcome, secret, id);
      if (!isValid) {
        console.error(`[Resolve] Generated invalid commitment hash! This should never happen.`);
      }

      // Update market status with provably fair data
      const resolvedMarket = await storage.resolveMarket(id, outcome, commitmentHash, secret);
      
      if (!resolvedMarket) {
        return res.status(404).json({ error: "Market not found" });
      }
      
      console.log(`[Resolve] Market ${id} resolved with provably fair commitment: ${commitmentHash}`);
      console.log(`[Resolve] Secret (for verification): ${secret}`);
      
      // Broadcast market resolved event
      realtimeService.broadcast({ type: 'market:resolved', data: { id } });
      realtimeService.broadcast({ type: 'market:updated', data: { id } });
      
      res.json({
        market: resolvedMarket,
        payoutResults: onChainPayoutResults,
        provablyFair: {
          commitmentHash,
          secret,
          verified: isValid,
        },
      });
    } catch (error: any) {
      console.error("[Resolve] Error:", error);
      res.status(500).json({ error: error.message || "Failed to resolve market" });
    }
  });

  // Wallet routes
  app.get("/api/wallet/balance", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const balance = await storage.getUserBalance(req.session.userId);
      res.json({ balance });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch balance" });
    }
  });

  app.post("/api/wallet/deposit", async (req, res) => {
    // Allow wallet-based auth via walletAddress in body, or session-based auth
    let userId: number | undefined = req.session?.userId;
    let walletAddress: string | undefined = req.session?.walletAddress;

    // If no session, try to authenticate by wallet address
    if (!userId && req.body.walletAddress) {
      walletAddress = req.body.walletAddress;
      const user = await storage.getUserByWalletAddress(walletAddress);
      if (user) {
        userId = user.id;
        // Set session for future requests
        if (req.session) {
          req.session.userId = user.id;
          req.session.walletAddress = user.walletAddress;
        }
      } else {
        // User doesn't exist - create them automatically
        const randomPassword = crypto.randomBytes(32).toString('hex');
        const newUser = await storage.createUser({
          walletAddress,
          password: randomPassword,
        });
        userId = newUser.id;
        if (req.session) {
          req.session.userId = newUser.id;
          req.session.walletAddress = newUser.walletAddress;
        }
      }
    }

    if (!userId || !walletAddress) {
      return res.status(401).json({ error: "Not authenticated. Please connect wallet or log in." });
    }

    try {
      const { amount, txSignature } = req.body;

      // Validate required fields
      if (!amount || !txSignature) {
        return res.status(400).json({ 
          error: "Amount and transaction signature are required for on-chain deposits" 
        });
      }

      // Get treasury address from environment
      const treasuryAddress = process.env.VITE_TREASURY_ADDRESS || process.env.TREASURY_ADDRESS;
      if (!treasuryAddress) {
        return res.status(500).json({ error: "Treasury address not configured" });
      }

      // Verify the transaction on-chain
      console.log(`[Deposit] Verifying transaction ${txSignature} from ${walletAddress}...`);
      const verified = await verifyDepositTransaction(
        txSignature,
        walletAddress,
        treasuryAddress,
        parseFloat(amount)
      );

      if (!verified.isValid) {
        console.error(`[Deposit] Transaction verification failed:`, verified.error);
        return res.status(400).json({ 
          error: verified.error || "Transaction verification failed",
          details: {
            expectedFrom: walletAddress,
            actualFrom: verified.fromAddress,
            expectedTo: treasuryAddress,
            actualTo: verified.toAddress,
            expectedAmount: amount,
            actualAmount: verified.amountSOL,
          }
        });
      }

      // Check if this transaction has already been processed (prevent double-spending)
      const existingTransactions = await storage.getTransactionsByUser(userId);
      const alreadyProcessed = existingTransactions.some(
        tx => tx.type === "deposit" && 
        tx.description?.includes(`Tx: ${txSignature}`)
      );

      if (alreadyProcessed) {
        return res.status(400).json({ 
          error: "This transaction has already been processed",
          txSignature 
        });
      }

      // Use the verified amount from the blockchain (more trustworthy than client-provided)
      const depositAmount = verified.amountSOL.toFixed(9);

      // Deposit the verified amount
      const user = await storage.deposit(userId, depositAmount);

      // Create transaction record with signature
      await storage.createTransaction({
        userId,
        type: "deposit",
        amount: depositAmount,
        txSignature: txSignature,
        description: `Deposited ${depositAmount} SOL`,
      });

      const { password, ...userWithoutPassword } = user;
      
      // Broadcast balance update
      if (userId) {
        realtimeService.broadcastToUser(userId, { type: 'balance:updated', data: { userId } });
      }
      
      console.log(`[Deposit] Successfully processed deposit: ${depositAmount} SOL from ${walletAddress} (Tx: ${txSignature})`);
      
      res.json({
        ...userWithoutPassword,
        depositVerification: {
          verified: true,
          amount: verified.amountSOL,
          txSignature: verified.signature,
        }
      });
    } catch (error: any) {
      console.error("[Deposit] Error:", error);
      res.status(500).json({ error: error.message || "Failed to deposit" });
    }
  });

  // Bet routes
  app.post("/api/markets/:id/bet", async (req, res) => {
    // Allow wallet-based auth via walletAddress in body, or session-based auth
    let userId: number | undefined = req.session?.userId;
    let walletAddress: string | undefined = req.session?.walletAddress;

    // If no session, try to authenticate by wallet address
    if (!userId && req.body.walletAddress) {
      walletAddress = req.body.walletAddress;
      const user = await storage.getUserByWalletAddress(walletAddress);
      if (user) {
        userId = user.id;
        // Set session for future requests
        if (req.session) {
          req.session.userId = user.id;
          req.session.walletAddress = user.walletAddress;
        }
      } else {
        // User doesn't exist - create them automatically
        const randomPassword = crypto.randomBytes(32).toString('hex');
        const newUser = await storage.createUser({
          walletAddress,
          password: randomPassword,
        });
        userId = newUser.id;
        if (req.session) {
          req.session.userId = newUser.id;
          req.session.walletAddress = newUser.walletAddress;
        }
      }
    }

    if (!userId) {
      return res.status(401).json({ error: "Not authenticated. Please connect wallet." });
    }

    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid market ID" });
      }

      // Get market to check if it's private
      const market = await storage.getMarketById(id);
      if (!market) {
        return res.status(404).json({ error: "Market not found" });
      }

      // Check if this is a private wager requiring an invite code
      if (market.isPrivate === 1) {
        const inviteCode = req.body.inviteCode;
        if (!inviteCode || !isValidInviteCode(inviteCode)) {
          return res.status(400).json({ error: "Valid invite code is required for private wagers" });
        }
        if (market.inviteCode !== inviteCode) {
          return res.status(403).json({ error: "Invalid invite code" });
        }
      }

      // Validate bet data - ensure amount is a string
      // Extract walletAddress and inviteCode for auth (not part of bet schema)
      const { walletAddress, inviteCode, ...betBodyData } = req.body;
      const betData = {
        ...betBodyData,
        amount: typeof betBodyData.amount === 'string' ? betBodyData.amount : String(betBodyData.amount),
        marketId: id,
      };

      const result = betSchema.safeParse(betData);
      
      if (!result.success) {
        console.log("[Bet] Validation error:", result.error.errors);
        return res.status(400).json({ error: result.error.errors });
      }

      const bet = await storage.createBet(
        userId,
        id,
        result.data.position,
        result.data.amount
      );
      
      // Broadcast bet placed event (triggers market update for all clients)
      realtimeService.broadcast({ type: 'bet:placed', data: { marketId: id } });
      realtimeService.broadcast({ type: 'market:updated', data: { id } });
      
      // Broadcast balance update for the user who placed the bet
      if (userId) {
        realtimeService.broadcastToUser(userId, { type: 'balance:updated', data: { userId } });
      }
      
      res.status(201).json({ bet, market });
    } catch (error: any) {
      console.log("[Bet] Error:", error);
      res.status(400).json({ error: error.message || "Failed to place bet" });
    }
  });

  app.get("/api/bets", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const userBets = await storage.getBetsByUser(req.session.userId);
      res.json(userBets);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch bets" });
    }
  });

  app.get("/api/markets/:id/bets", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid market ID" });
      }

      const marketBets = await storage.getBetsByMarket(id);
      res.json(marketBets);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch bets" });
    }
  });

  // Transaction routes
  app.get("/api/transactions", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const transactions = await storage.getTransactionsByUser(req.session.userId);
      res.json(transactions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch transactions" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
