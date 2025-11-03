# Admin Setup Guide

## Making a User an Admin

To make a user an admin, you need to update the `is_admin` field in the database. The `is_admin` field is an integer where:
- `0` = Not an admin (default)
- `1` = Admin

### Option 1: Using SQL (Recommended)

Run this SQL query in your Neon database SQL editor or via psql:

```sql
-- Make a user an admin by wallet address
UPDATE users 
SET is_admin = 1 
WHERE wallet_address = 'YOUR_WALLET_ADDRESS_HERE';

-- Verify the user is now an admin
SELECT id, wallet_address, is_admin 
FROM users 
WHERE wallet_address = 'YOUR_WALLET_ADDRESS_HERE';
```

### Option 2: Using Drizzle (For development)

You can also update it programmatically by creating a temporary script:

```typescript
// scripts/make-admin.ts (create this file)
import { db } from "../db";
import { users } from "../shared/schema";
import { eq } from "drizzle-orm";

const walletAddress = "YOUR_WALLET_ADDRESS_HERE";

async function makeAdmin() {
  await db
    .update(users)
    .set({ isAdmin: 1 })
    .where(eq(users.walletAddress, walletAddress));
  
  console.log(`User ${walletAddress} is now an admin`);
  process.exit(0);
}

makeAdmin();
```

Then run: `npx tsx scripts/make-admin.ts`

## Admin Features

Once a user is an admin, they will have access to:

1. **Admin Panel** (`/admin`):
   - View all active markets
   - Resolve markets as YES or NO
   - Refund markets that cannot be determined
   - See market details (volume, pools, expiration)

2. **Market Detail Page**:
   - Resolution buttons (YES/NO) for active markets
   - Refund button for markets that can't be determined
   - Only visible to admins

3. **API Endpoints** (protected by admin middleware):
   - `POST /api/markets/:id/resolve` - Resolve a market
   - `POST /api/markets/:id/refund` - Refund all bets

## Security Notes

- Admin status is checked on every admin action
- Only authenticated users with `isAdmin = 1` can resolve/refund markets
- Regular users cannot see or access admin controls
- Auto-resolve for expired markets still works (doesn't require admin)

## Making Multiple Admins

You can have multiple admins. Just update the `is_admin` field to `1` for each user:

```sql
-- Make multiple users admins
UPDATE users 
SET is_admin = 1 
WHERE wallet_address IN (
  'WALLET_ADDRESS_1',
  'WALLET_ADDRESS_2',
  'WALLET_ADDRESS_3'
);
```

## Removing Admin Status

```sql
UPDATE users 
SET is_admin = 0 
WHERE wallet_address = 'WALLET_ADDRESS_HERE';
```

