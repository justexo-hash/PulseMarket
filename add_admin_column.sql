-- Step 1: Add the is_admin column to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS is_admin INTEGER NOT NULL DEFAULT 0;

-- Step 2: Verify the column was added
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'users' AND column_name = 'is_admin';

-- Step 3: Make yourself an admin (replace with your wallet address)
UPDATE users 
SET is_admin = 1 
WHERE wallet_address = '5hBMqUs4jBFnfHReszjfq3NjW3BNXSRyJc5dHbfXojsN';

-- Step 4: Verify you're now an admin
SELECT id, wallet_address, is_admin 
FROM users 
WHERE wallet_address = '5hBMqUs4jBFnfHReszjfq3NjW3BNXSRyJc5dHbfXojsN';

