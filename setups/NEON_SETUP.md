# Setting Up Neon Database - Quick Guide

Neon is a serverless PostgreSQL platform that's perfect for PulseMarket. It's free to start and handles all the server management for you!

## Step 1: Create a Neon Account

1. **Go to Neon**: https://neon.tech
2. **Click "Sign Up"** (you can use GitHub, Google, or email)
3. **Verify your email** if required

## Step 2: Create a New Project

1. **Once logged in**, click **"Create a project"** or **"New Project"**
2. **Fill in the details:**
   - **Project name**: `pulsemarket` (or any name you like)
   - **Region**: Choose the closest one to you (US East, US West, EU, etc.)
   - **PostgreSQL version**: Latest is fine (usually 15 or 16)
   - **Branch name**: `main` (default is fine)

3. **Click "Create Project"**

## Step 3: Get Your Connection String

Neon will automatically create a database for you. You'll see a **connection string** that looks like:

```
postgresql://username:password@ep-xxx-xxx.region.neon.tech/dbname?sslmode=require
```

**Copy this connection string** - you'll need it for your `.env` file!

### If you don't see the connection string:

1. **Go to your project dashboard**
2. **Click on "Connection Details"** or look for a connection string/URI
3. **Copy the connection string**

It should look something like:
```
postgresql://neondb_owner:npg_xxxxx@ep-cool-darkness-123456.us-east-2.aws.neon.tech/neondb?sslmode=require
```

## Step 4: Add to Your .env File

In your PulseMarket project, create or edit the `.env` file in the root directory:

```env
DATABASE_URL=postgresql://username:password@ep-xxx-xxx.region.neon.tech/dbname?sslmode=require
SESSION_SECRET=your-random-secret-key-here
PORT=5000
```

**Replace:**
- The entire connection string with the one Neon gave you
- `SESSION_SECRET` with a random string (you can generate one with: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`)

**Example `.env` file:**
```env
DATABASE_URL=postgresql://neondb_owner:npg_aBc123XyZ@ep-cool-darkness-123456.us-east-2.aws.neon.tech/neondb?sslmode=require
SESSION_SECRET=abc123def456ghi789jkl012mno345pqr678stu901vwx234yz567
PORT=5000
```

## Step 5: Push Database Schema

Run the database migration to create all tables:

```bash
npm run db:push
```

This will create:
- `users` table
- `markets` table  
- `bets` table
- `transactions` table

You should see output like:
```
✓ Migration successful!
```

## Step 6: Verify It Works

Start your development server:

```bash
npm run dev
```

The app should connect to Neon without any issues! 

## Step 7: Test the Connection

You can verify your database connection in several ways:

### Option A: Via Neon Dashboard
1. Go to your Neon project dashboard
2. Click on **"SQL Editor"** or **"Query"**
3. Run: `SELECT * FROM users;` (should be empty at first)

### Option B: Via Your App
1. Start the app: `npm run dev`
2. Navigate to http://localhost:5000
3. Try registering a user - if it works, your database is connected!

## Neon Dashboard Features

Neon provides a nice dashboard where you can:
- **View your database tables** - Browse schema
- **Run SQL queries** - Test queries directly
- **View connection details** - See your connection string anytime
- **Monitor usage** - Track your database usage
- **View logs** - See query logs

## Free Tier Limits

Neon's free tier includes:
- ✅ 0.5 GB storage
- ✅ Unlimited projects
- ✅ Unlimited branches
- ✅ 256 MB RAM
- ✅ Shared CPU

This is **more than enough** for development and testing!

## Troubleshooting

### "DATABASE_URL environment variable is not set"
- Make sure your `.env` file is in the **root directory** (same level as `package.json`)
- Check that the file is named exactly `.env` (not `.env.txt` or `.env.local`)
- Verify the connection string is on one line (no line breaks)

### "Connection refused" or "Connection timeout"
- Check your connection string is correct
- Make sure `?sslmode=require` is at the end
- Verify you copied the entire connection string from Neon

### "Password authentication failed"
- Neon passwords might contain special characters - make sure you copied the entire password
- Try regenerating the password in Neon dashboard

### "Database does not exist"
- Neon creates a database automatically - use the one from the connection string
- The database name is usually `neondb` or similar

### Can't find connection string in Neon dashboard
1. Go to your project
2. Look for **"Connection Details"**, **"Connection String"**, or **"Connect"** button
3. Sometimes it's under **"Settings"** → **"Connection Details"**

## Security Tips

1. **Keep your `.env` file private** - Never commit it to Git (it's already in `.gitignore`)
2. **Rotate passwords** - If you suspect a leak, regenerate the password in Neon
3. **Use connection pooling** - Neon automatically handles this, but for production you might want to use connection pooling

## Next Steps

Once connected:
1. ✅ Your database is set up
2. ✅ Run `npm run db:push` to create tables
3. ✅ Start your app with `npm run dev`
4. ✅ Generate a wallet, register, and start using PulseMarket!

That's it! Neon handles everything else - no server management, no configuration, no headaches! 🎉

