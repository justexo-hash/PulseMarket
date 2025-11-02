import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertMarketSchema, resolveMarketSchema, insertUserSchema, loginSchema } from "@shared/schema";
import bcrypt from "bcrypt";

export async function registerRoutes(app: Express): Promise<Server> {
  // Authentication routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      const result = insertUserSchema.safeParse(req.body);
      
      if (!result.success) {
        return res.status(400).json({ error: result.error.errors });
      }

      // Check if wallet address already exists
      const existingUser = await storage.getUserByWalletAddress(result.data.walletAddress);
      if (existingUser) {
        return res.status(400).json({ error: "Wallet address already registered" });
      }

      const user = await storage.createUser(result.data);
      
      // Set session
      if (req.session) {
        req.session.userId = user.id;
        req.session.walletAddress = user.walletAddress;
      }
      
      // Don't send password back
      const { password, ...userWithoutPassword } = user;
      console.log("[Register] User from DB:", user);
      console.log("[Register] User without password:", userWithoutPassword);
      res.status(201).json(userWithoutPassword);
    } catch (error) {
      res.status(500).json({ error: "Failed to register user" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const result = loginSchema.safeParse(req.body);
      
      if (!result.success) {
        return res.status(400).json({ error: result.error.errors });
      }

      const user = await storage.getUserByWalletAddress(result.data.walletAddress);
      
      if (!user) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const isPasswordValid = await bcrypt.compare(result.data.password, user.password);
      
      if (!isPasswordValid) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      // Set session
      if (req.session) {
        req.session.userId = user.id;
        req.session.walletAddress = user.walletAddress;
      }

      // Don't send password back
      const { password, ...userWithoutPassword } = user;
      console.log("[Login] User from DB:", user);
      console.log("[Login] User without password:", userWithoutPassword);
      res.json(userWithoutPassword);
    } catch (error) {
      res.status(500).json({ error: "Failed to login" });
    }
  });

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

  // Get all markets
  app.get("/api/markets", async (req, res) => {
    try {
      const markets = await storage.getAllMarkets();
      res.json(markets);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch markets" });
    }
  });

  // Get single market by ID
  app.get("/api/markets/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid market ID" });
      }
      
      const market = await storage.getMarketById(id);
      
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
      const result = insertMarketSchema.safeParse(req.body);
      
      if (!result.success) {
        return res.status(400).json({ error: result.error.errors });
      }

      const market = await storage.createMarket(result.data);
      res.status(201).json(market);
    } catch (error) {
      res.status(500).json({ error: "Failed to create market" });
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

  // Resolve market
  app.post("/api/markets/:id/resolve", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid market ID" });
      }

      const result = resolveMarketSchema.safeParse(req.body);
      
      if (!result.success) {
        return res.status(400).json({ error: result.error.errors });
      }

      const market = await storage.resolveMarket(id, result.data.outcome);
      
      if (!market) {
        return res.status(404).json({ error: "Market not found" });
      }
      
      res.json(market);
    } catch (error) {
      res.status(500).json({ error: "Failed to resolve market" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
