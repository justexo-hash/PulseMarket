# Vercel Deployment Guide

## ⚠️ Important Considerations

**This app uses WebSockets and long-running Express server**, which has limitations on Vercel:

1. **WebSockets**: Vercel supports WebSockets in certain regions, but the serverless model may not be ideal for persistent connections
2. **Long-running processes**: The expired markets background job might not work well in serverless
3. **Express with serverless**: Requires special configuration

## Recommended: Alternative Deployment Options

For this type of application, consider:
- **Railway** (recommended): Easy Express + WebSocket support, PostgreSQL included
- **Render**: Good for Express apps with WebSockets
- **Fly.io**: Supports WebSockets and persistent connections
- **DigitalOcean App Platform**: Full-stack support
- **AWS/GCP/Azure**: More control, more setup

## If You Still Want to Deploy to Vercel

### Option 1: Serverless API Routes (Limited WebSocket Support)

1. **Install Vercel CLI**:
   ```bash
   npm i -g vercel
   ```

2. **Set Environment Variables** in Vercel Dashboard:
   - `DATABASE_URL` - Your Neon PostgreSQL connection string
   - `SESSION_SECRET` - Random secret for sessions
   - `TREASURY_ADDRESS` - Your Solana treasury address
   - `TREASURY_PRIVATE_KEY` - Base58 or hex encoded private key
   - `VITE_SOLANA_NETWORK` - `mainnet-beta` or `devnet`
   - `VITE_SOLANA_RPC_URL` - Your Helius RPC URL
   - `VITE_TREASURY_ADDRESS` - Same as TREASURY_ADDRESS

3. **Modify Build Process**:
   The current setup might need adjustments for Vercel's serverless model.

### Option 2: Use Vercel + Separate WebSocket Service

- Deploy frontend to Vercel
- Use a separate service (Railway, Render, Fly.io) for the Express backend with WebSockets

## Quick Database Cleanup

Run this SQL in your Neon database to clear all test markets:

```sql
-- Delete all markets (bets cascade delete automatically)
DELETE FROM markets;
```

Or use the provided `clear_test_markets.sql` file.

