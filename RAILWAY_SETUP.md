# Railway Quick Setup Checklist

## ✅ Pre-Deployment

1. **Clear Test Data** (Run in Neon SQL Editor):
   ```sql
   DELETE FROM markets;
   ```

2. **Verify Build Works Locally**:
   ```bash
   npm run build
   npm start
   ```

## 🚀 Railway Deployment Steps

### Step 1: Create Railway Account
- Go to https://railway.app
- Sign up with GitHub

### Step 2: Deploy Repository
1. Click "New Project"
2. "Deploy from GitHub repo"
3. Select `PulseMarket` repository
4. Railway auto-detects Node.js

### Step 3: Add PostgreSQL (Optional - or use existing Neon)
- Click "+ New" → "Database" → "PostgreSQL"
- Railway auto-creates and sets `DATABASE_URL`

### Step 4: Environment Variables
In Service → Variables, add all variables from `RAILWAY_DEPLOYMENT.md`

### Step 5: First Deployment
- Railway builds automatically
- Check logs for any errors
- Get your `*.railway.app` URL

### Step 6: Database Migration
Run in Railway terminal or via CLI:
```bash
railway run npm run db:push
```

## 🎯 That's It!

Your app should be live at `https://your-app.railway.app`

---

**Need help?** See full guide in `RAILWAY_DEPLOYMENT.md`

