-- Run this SQL directly in your Neon database to add the missing columns
-- You can run this via Neon's SQL Editor or psql

-- Add expiration date field (nullable)
ALTER TABLE markets 
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP;

-- Add creation timestamp field
ALTER TABLE markets 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP NOT NULL DEFAULT NOW();

-- Update existing markets to have a created_at timestamp if they don't have one
UPDATE markets 
SET created_at = NOW() 
WHERE created_at IS NULL;

-- Verify the columns were added
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'markets'
AND column_name IN ('expires_at', 'created_at');

