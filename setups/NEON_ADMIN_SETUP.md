# How to Make Yourself an Admin in Neon

## Step-by-Step Guide

### Step 1: Access Neon Dashboard
1. Go to [Neon Console](https://console.neon.tech/) (or your Neon dashboard URL)
2. Log in with your Neon account

### Step 2: Select Your Database
1. In the Neon dashboard, you'll see your projects
2. Click on the project that contains your PulseMarket database (usually named something like "neondb" or similar)

### Step 3: Open SQL Editor
1. In your project dashboard, look for a **"SQL Editor"** or **"Query"** button/tab
2. Click on it to open the SQL editor
3. You should see a query editor interface

### Step 4: Get Your Wallet Address
1. In your PulseMarket app, connect your wallet
2. Your wallet address is shown in the header (e.g., "4kaj...X7m2")
3. Or check your browser's developer console - it might be logged there
4. **Copy the full wallet address** (it should be a long string starting with a letter/number)

### Step 5: Run the Admin Query
1. In the Neon SQL Editor, paste this query:

```sql
UPDATE users 
SET is_admin = 1 
WHERE wallet_address = 'YOUR_WALLET_ADDRESS_HERE';
```

2. **Replace `YOUR_WALLET_ADDRESS_HERE`** with your actual Solana wallet address (keep the single quotes)
3. Example:
```sql
UPDATE users 
SET is_admin = 1 
WHERE wallet_address = '4kaj7Xm2...yourfulladdress';
```

4. Click **"Run"** or press `Ctrl+Enter` (Windows) / `Cmd+Enter` (Mac)

### Step 6: Verify It Worked
Run this query to check:

```sql
SELECT id, wallet_address, is_admin 
FROM users 
WHERE wallet_address = 'YOUR_WALLET_ADDRESS_HERE';
```

You should see `is_admin = 1` in the results.

### Step 7: Refresh Your App
1. Go back to your PulseMarket app
2. **Refresh the page** (or log out and log back in)
3. You should now see the **"Admin"** link in the header
4. Click it to access the Admin Panel at `/admin`

## Alternative: Using Neon CLI

If you prefer command line:

1. Install Neon CLI (if not already installed):
   ```bash
   npm install -g neonctl
   ```

2. Authenticate:
   ```bash
   neonctl auth
   ```

3. Connect to your database and run:
   ```bash
   neonctl sql "UPDATE users SET is_admin = 1 WHERE wallet_address = 'YOUR_WALLET_ADDRESS_HERE';"
   ```

## Troubleshooting

**Can't find SQL Editor?**
- Look for tabs like "Query", "SQL", "Query Editor", or "Data"
- It's usually in the top navigation of your Neon project

**Don't see your wallet address?**
- Connect your wallet in the PulseMarket app
- Check the browser console (F12) for logged wallet address
- Or look at the header where it shows your truncated address - click on it if it's clickable

**Query returns 0 rows?**
- Make sure you're using the exact wallet address (case-sensitive)
- Try finding your user first:
  ```sql
  SELECT * FROM users;
  ```
  Then use the exact `wallet_address` value from the results

**Still not working after refresh?**
- Make sure you're logged in with the correct wallet
- Try logging out and logging back in
- Clear browser cache and refresh

