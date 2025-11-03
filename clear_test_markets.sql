-- Clear all test markets from the database
-- This will also cascade delete all bets associated with these markets
-- Transactions will remain but with marketId set to null (for audit trail)

-- Delete all markets (bets will be cascade deleted)
DELETE FROM markets;

-- Optional: If you also want to clear all bets manually (though they should be deleted by cascade)
-- DELETE FROM bets;

-- Optional: If you want to clear market-related transactions (keeps deposits/payouts)
-- UPDATE transactions SET market_id = NULL, bet_id = NULL WHERE market_id IS NOT NULL;

-- Reset market ID sequence (optional, keeps IDs starting from 1)
-- ALTER SEQUENCE markets_id_seq RESTART WITH 1;
-- ALTER SEQUENCE bets_id_seq RESTART WITH 1;

