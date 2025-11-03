# Database Migration Guide - New Features

This migration adds expiration dates and creation timestamps to markets.

## New Fields Added to `markets` Table

1. **`expires_at`** (timestamp, nullable)
   - Optional expiration date for markets
   - If set, markets will show countdown timers
   - Markets can expire automatically (future feature)

2. **`created_at`** (timestamp, not null, default now)
   - Tracks when each market was created
   - Used for sorting and activity feed

## Migration Steps

### Option 1: Using Drizzle Push (Recommended for Development)

```bash
npm run db:push
```

This will automatically update your database schema based on the changes in `shared/schema.ts`.

### Option 2: Manual SQL Migration (For Production)

If you're running in production and want more control:

```sql
-- Add expiration date field (nullable)
ALTER TABLE markets 
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP;

-- Add creation timestamp field
ALTER TABLE markets 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP NOT NULL DEFAULT NOW();

-- Update existing markets to have a created_at timestamp
UPDATE markets 
SET created_at = NOW() 
WHERE created_at IS NULL;
```

## Verification

After migration, verify the changes:

```sql
-- Check table structure
\d markets

-- Or
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'markets'
AND column_name IN ('expires_at', 'created_at');
```

## Rollback (If Needed)

If you need to rollback:

```sql
ALTER TABLE markets DROP COLUMN IF EXISTS expires_at;
ALTER TABLE markets DROP COLUMN IF EXISTS created_at;
```

**Note**: Rolling back will lose expiration and creation date data.

