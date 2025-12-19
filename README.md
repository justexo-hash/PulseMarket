# Polymeme - Local Development Setup

## Prerequisites

- **Node.js** 18+ installed
- **PostgreSQL database** (you can use Neon for a free hosted PostgreSQL database)
- **npm** or **yarn** package manager

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Database

You need a PostgreSQL database. You can use:
- **Neon** (Recommended - Free tier): https://neon.tech
- **Supabase** (Free tier): https://supabase.com
- **Local PostgreSQL**: Install and run locally

Once you have a database, get your connection string. It should look like:
```
postgresql://user:password@host/database?sslmode=require
```

### 3. Configure Environment Variables

Create a `.env` file in the root directory:

```env
DATABASE_URL=postgresql://user:password@host/database?sslmode=require
SESSION_SECRET=your-super-secret-session-key-change-this-in-production
PORT=5000
```

**Important**: 
- Replace the `DATABASE_URL` with your actual PostgreSQL connection string
- Change `SESSION_SECRET` to a random secure string (you can generate one with: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`)
- `PORT` is optional (defaults to 5000)

### 4. Push Database Schema

Run the database migrations to create all tables:

```bash
npm run db:push
```

This will create the following tables:
- `users` - User accounts with wallet addresses and balances
- `markets` - Prediction markets with pools
- `bets` - All bets placed by users
- `transactions` - Transaction history (deposits, bets, payouts)

### 5. Start Development Server

The project now uses `cross-env` for cross-platform compatibility, so this works on **Windows, Mac, and Linux**:

```bash
npm run dev
```

The server will start and you should see output like:
```
serving on port 5000
```

The server will start on `http://localhost:5000` (or the port you specified).

### 6. Access the Application

Open your browser and navigate to:
```
http://localhost:5000
```

## Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm start` - Start production server (after build)
- `npm run db:push` - Push database schema changes to database
- `npm run check` - Type check TypeScript code

## Development Workflow

1. **Make code changes** - The dev server will automatically reload
2. **Database changes** - If you modify `shared/schema.ts`, run `npm run db:push` to sync
3. **Frontend changes** - Vite will hot-reload automatically
4. **Backend changes** - Server will restart automatically

## Troubleshooting

### Database Connection Issues

If you see errors about `DATABASE_URL`:
- Make sure your `.env` file exists in the root directory
- Verify your database connection string is correct
- Check that your database is accessible (not behind a firewall)

### Port Already in Use

If port 5000 is already in use:
- Change the `PORT` in your `.env` file
- Or kill the process using port 5000:
  - Windows: `netstat -ano | findstr :5000` then `taskkill /PID <PID> /F`
  - Mac/Linux: `lsof -ti:5000 | xargs kill`

### Module Not Found Errors

- Delete `node_modules` and `package-lock.json`
- Run `npm install` again

### Session Issues

- Make sure `SESSION_SECRET` is set in your `.env` file
- Clear your browser cookies for `localhost:5000`

## Production Build

To build for production:

```bash
npm run build
npm start
```

This will:
1. Build the Next.js app into `.next/`
2. Prepare the API route handlers
3. Serve everything on the configured port

## Project Structure

```
Polymeme/
├── app/            # Next.js App Router (pages + API routes)
├── components/     # Shared UI primitives (shadcn/ui, HowItWorks, ErrorBoundary)
├── hooks/          # Reusable client hooks (toast helpers, etc.)
├── lib/            # Client/server utilities (wallet, auth, payouts, realtime, etc.)
├── server/         # Shared server-side helpers (storage, invite codes, Solana helpers)
├── shared/         # Shared types and schemas
├── db/             # Database configuration
└── package.json
```

## Next Steps

1. Generate a wallet at `/generate-wallet`
2. Register an account at `/register`
3. Deposit some SOL at `/deposit` (simulated)
4. Browse markets and place bets!
5. Check your portfolio and transaction history

## Scheduled Jobs

- Run the expired-market resolution job manually (useful for Railway Cron):

```bash
npm run job:expired
```

This executes `/api/jobs/expired-markets` logic server-side and can be wired into a Railway schedule.

## Features

- ✅ User authentication with Solana wallets
- ✅ SOL balance tracking in database
- ✅ Real-time bet pools (YES/NO)
- ✅ Automatic probability calculation
- ✅ Automatic payouts when markets resolve
- ✅ Transaction history tracking
- ✅ Portfolio tracking

Enjoy building on Polymeme! 🚀

