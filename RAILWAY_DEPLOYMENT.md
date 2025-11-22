# Railway Deployment Guide (Recommended)

Railway is better suited for this application because it supports:
- ✅ Long-running Express servers
- ✅ WebSockets out of the box
- ✅ PostgreSQL databases
- ✅ Background jobs/cron tasks
- ✅ Environment variables
- ✅ Free tier with $5/month credit

## 🚀 Quick Start (5 minutes)

### 1. Clear Test Data First
Before deploying, clear your test markets in Neon:
```sql
DELETE FROM markets;
```

### 2. Create Railway Account
1. Go to https://railway.app
2. Click "Start a New Project"
3. Sign up with GitHub (recommended)

### 3. Deploy from GitHub
1. In Railway dashboard, click "New Project"
2. Select "Deploy from GitHub repo"
3. Authorize Railway to access your GitHub
4. Select your `PulseMarket` repository
5. Railway will auto-detect it's a Node.js project and start deploying!

### 4. Add PostgreSQL Database
1. In your Railway project, click "+ New"
2. Select "Database" → "Add PostgreSQL"
3. Railway automatically creates the database and sets `DATABASE_URL`
4. **Note**: You can use your existing Neon database too (just set `DATABASE_URL` manually)

### 5. Set Environment Variables
Click on your service → "Variables" tab, and add:

**Required Variables:**
```
DATABASE_URL=<Your Neon PostgreSQL URL or Railway PostgreSQL URL>
SESSION_SECRET=<Generate a random string - use: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))" >
TREASURY_ADDRESS=<Your Solana treasury address>
TREASURY_PRIVATE_KEY=<Your treasury private key (base58 or hex)>
CRON_SECRET=<Any random string used by Railway scheduler to hit the job endpoint>
```

**Client Variables (VITE_ prefix - these are public):**
```
VITE_SOLANA_NETWORK=mainnet-beta
VITE_SOLANA_RPC_URL=<Your Helius RPC URL>
VITE_TREASURY_ADDRESS=<Same as TREASURY_ADDRESS>
```

**Production Settings:**
```
NODE_ENV=production
PORT=5000
```

**⚠️ Important**: `VITE_*` variables are exposed to the browser, don't put secrets there!

### 6. Configure Build Settings
Railway auto-detects Node.js, but verify:
- **Build Command**: `npm run build` (should be auto-detected)
- **Start Command**: `npm start` (should be auto-detected)
- Railway will automatically run these from `package.json`

### 7. Run Database Migration
After first deployment:
1. Go to your service in Railway
2. Click on the service
3. Click "Deployments" → Click on the latest deployment
4. Click the terminal icon or use "Connect" to get shell access
5. Run: `npm run db:push`

Or use Railway CLI:
```bash
railway login
railway link  # Link to your project
railway run npm run db:push
```

### 8. Get Your Domain
1. Railway automatically provides a `*.railway.app` domain
2. Find it in: Service → Settings → Domains
3. You can add a custom domain later if needed

## 🎉 That's It!

Railway will:
- ✅ Auto-deploy on every push to your main branch
- ✅ Handle WebSockets automatically
- ✅ Keep your server running 24/7
- ✅ Run background jobs (expired markets auto-resolve)

## 📋 Verification Checklist

After deployment:
- [ ] App loads at `https://your-app.railway.app`
- [ ] Can connect wallet
- [ ] Can create markets
- [ ] WebSocket connections work (check browser console for `/ws` connection)
- [ ] Can place bets
- [ ] Transactions appear correctly

## 🔧 Troubleshooting

### Build Fails
- Check Railway logs for errors
- Ensure all dependencies are in `dependencies` (not `devDependencies`)
- Verify TypeScript compiles: `npm run check`

### Database Connection Issues
- Verify `DATABASE_URL` is set correctly
- Check if database allows connections from Railway IPs
- Neon allows all IPs by default, so this should work

### WebSocket Not Working
- Railway supports WebSockets natively - no config needed
- Check browser console for connection errors
- Verify the WebSocket endpoint is `/ws`

### Background Jobs Not Running
- Railway keeps the process alive, so jobs should run
- Check server logs in Railway dashboard
- Verify the cron schedule is successfully calling `/api/jobs/expired-markets`

## 💰 Pricing

Railway's free tier includes:
- $5/month credit
- 500 hours of runtime per month
- Perfect for development and small deployments

## 🔄 Updating Your Deployment

Just push to GitHub! Railway automatically:
1. Detects the push
2. Runs `npm run build`
3. Deploys the new version
4. Restarts the server

## Steps to Deploy

### 1. Create Railway Account
1. Go to https://railway.app
2. Sign up with GitHub

### 2. Create New Project
1. Click "New Project"
2. Select "Deploy from GitHub repo"
3. Connect your GitHub account and select the PulseMarket repository

### 3. Add PostgreSQL Database
1. In your project, click "New"
2. Select "PostgreSQL"
3. Railway will create a database and provide `DATABASE_URL`

### 4. Set Environment Variables
In Railway project settings, add:

```
DATABASE_URL=<Railway PostgreSQL URL>
SESSION_SECRET=<Generate a random string>
TREASURY_ADDRESS=<Your Solana treasury address>
TREASURY_PRIVATE_KEY=<Your treasury private key (base58 or hex)>
CRON_SECRET=<Random string used by the scheduled curl call>
VITE_SOLANA_NETWORK=mainnet-beta
VITE_SOLANA_RPC_URL=<Your Helius RPC URL>
VITE_TREASURY_ADDRESS=<Same as TREASURY_ADDRESS>
NODE_ENV=production
PORT=5000
```

### 5. Schedule the Expired Markets Job
1. Inside your Railway service, go to the **Settings** tab and scroll to **Schedules** (or "Cron Jobs").
2. Click **New Schedule** and configure how often you want to auto-resolve markets (e.g. `*/5 * * * *` for every 5 minutes).
3. Use the following command so Railway hits the protected cron endpoint with your secret:
   ```
   bash -lc "curl -X POST https://<your-app>.railway.app/api/jobs/expired-markets -H \"x-cron-secret: $CRON_SECRET\""
   ```
   (Replace `<your-app>` with your Railway domain. Scheduled commands automatically inherit the service env vars, so `$CRON_SECRET` resolves to the same value you defined above.)
4. Save the schedule. Railway will now call the endpoint on the cadence you set, and the job bypasses admin cookies by validating the `x-cron-secret` header.

### 5. Configure Build Settings
Railway will auto-detect Node.js. Ensure:
- **Build Command**: `npm run build`
- **Start Command**: `npm start`
- **Root Directory**: `/` (project root)

### 6. Deploy
Railway will automatically deploy when you push to your main branch.

### 7. Get Your Domain
Railway provides a `*.railway.app` domain. You can also add a custom domain.

## Database Migration

After deployment, run migrations:
```bash
railway run npm run db:push
```

Or connect to your database and run migrations manually.

## WebSocket Support

Railway supports WebSockets natively - no special configuration needed!

