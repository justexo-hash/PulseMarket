# Deployment Guide

## 🗑️ Clear Test Data First

Before deploying, clear all test markets from your database:

### Option 1: SQL Script (Recommended)
Run the SQL in `clear_test_markets.sql` in your Neon database:

```sql
DELETE FROM markets;
```

This will:
- Delete all markets
- Automatically cascade delete all bets (due to foreign key constraint)
- Keep transactions but set `marketId` to null (for audit trail)

### Option 2: Manual in Neon Console
1. Go to your Neon dashboard
2. Open SQL Editor
3. Run: `DELETE FROM markets;`

---

## 🚀 Deployment Options

### ⚠️ Vercel Limitations

**Vercel is NOT recommended for this application** because:
- ❌ Limited WebSocket support (serverless functions don't maintain persistent connections well)
- ❌ Background jobs (expired markets auto-resolve) may not work reliably
- ❌ Express servers work better as long-running processes, not serverless functions
- ⚠️ Requires special configuration for full-stack apps

### ✅ Recommended: Railway (Easiest)

**Railway is the best choice** because:
- ✅ Native WebSocket support
- ✅ Long-running Express servers
- ✅ Built-in PostgreSQL database
- ✅ Background jobs/cron tasks work perfectly
- ✅ Simple deployment from GitHub
- ✅ Free tier available

**See `RAILWAY_DEPLOYMENT.md` for step-by-step guide**

### Alternative Platforms

1. **Render** - Good for Express + WebSockets
2. **Fly.io** - Supports persistent connections and WebSockets
3. **DigitalOcean App Platform** - Full-stack support
4. **AWS/GCP/Azure** - More control, more setup required

---

## 📋 Pre-Deployment Checklist

- [ ] Clear all test markets from database
- [ ] Set strong `SESSION_SECRET` (generate with: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`)
- [ ] Verify all environment variables are set
- [ ] Test WebSocket connections locally
- [ ] Build and test production build: `npm run build && npm start`
- [ ] Verify database migrations: `npm run db:push`

---

## 🔐 Required Environment Variables

Make sure these are set in your deployment platform:

```
DATABASE_URL=<Your Neon PostgreSQL connection string>
SESSION_SECRET=<Random secure string - generate one!>
TREASURY_ADDRESS=<Your Solana treasury address>
TREASURY_PRIVATE_KEY=<Your treasury private key (base58 or hex)>
CRON_SECRET=<Random string for cron endpoint auth>
VITE_SOLANA_NETWORK=mainnet-beta
VITE_SOLANA_RPC_URL=<Your Helius RPC URL>
VITE_TREASURY_ADDRESS=<Same as TREASURY_ADDRESS>
NODE_ENV=production
PORT=5000
```

**Note**: `VITE_*` variables are exposed to the client, so don't put secrets there!

---

## 📦 Build Commands

The project is already configured with:
- **Build**: `npm run build` (builds frontend + bundles server)
- **Start**: `npm start` (runs production server)

These work on most platforms (Railway, Render, Fly.io, etc.)

---

## 🐛 Troubleshooting Deployment

### WebSocket Issues
- Make sure your platform supports WebSockets
- Check firewall/network configuration
- Verify WebSocket endpoint is accessible

### Database Connection
- Ensure `DATABASE_URL` is set correctly
- Check if your database allows connections from deployment platform IPs
- Neon allows all IPs by default, but verify your connection string

### Session Issues
- Make sure `SESSION_SECRET` is set and consistent
- Check cookie settings (secure flag in production)
- Verify session store configuration

### Build Failures
- Ensure all dependencies are in `dependencies` (not just `devDependencies`)
- Check that TypeScript compilation succeeds
- Verify `esbuild` can bundle the server code

### Background Jobs (Expired Markets)
- Set `CRON_SECRET` in your environment variables
- Configure your platform's scheduler (Railway Schedules, cron, etc.) to run:
  ```
  curl -X POST https://<your-domain>/api/jobs/expired-markets -H "x-cron-secret: $CRON_SECRET"
  ```
- Check logs for `[Jobs]` messages if resolutions are not occurring

