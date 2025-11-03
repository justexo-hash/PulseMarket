-- Reset all user balances to 0 SOL
-- This is useful when you've moved all SOL out of the treasury
-- and want to reset the database balances to match the on-chain state

UPDATE users 
SET balance = '0' 
WHERE balance != '0';

-- Verify the reset
SELECT 
    COUNT(*) as total_users,
    COUNT(CASE WHEN balance = '0' THEN 1 END) as users_with_zero_balance,
    COUNT(CASE WHEN balance != '0' THEN 1 END) as users_with_balance
FROM users;

