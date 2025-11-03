-- Add transparency and provably fair fields to database

-- Add txSignature to transactions table
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS tx_signature TEXT;

-- Add commitment fields to markets table for provably fair resolution
ALTER TABLE markets 
ADD COLUMN IF NOT EXISTS commitment_hash TEXT;

ALTER TABLE markets 
ADD COLUMN IF NOT EXISTS commitment_secret TEXT;

-- Add commitment fields to bets table for provably fair betting
ALTER TABLE bets 
ADD COLUMN IF NOT EXISTS commitment_hash TEXT;

ALTER TABLE bets 
ADD COLUMN IF NOT EXISTS commitment_secret TEXT;

-- Create index on tx_signature for faster lookups
CREATE INDEX IF NOT EXISTS idx_transactions_tx_signature ON transactions(tx_signature);

-- Verify columns were added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'transactions' AND column_name = 'tx_signature'
UNION ALL
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'markets' AND column_name IN ('commitment_hash', 'commitment_secret')
UNION ALL
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'bets' AND column_name IN ('commitment_hash', 'commitment_secret');

