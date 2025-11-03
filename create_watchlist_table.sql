-- Create watchlist table for user favorites
CREATE TABLE IF NOT EXISTS watchlist (
  id serial PRIMARY KEY,
  user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  market_id integer NOT NULL REFERENCES markets(id) ON DELETE CASCADE,
  created_at timestamp NOT NULL DEFAULT now(),
  UNIQUE(user_id, market_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_watchlist_user_id ON watchlist(user_id);
CREATE INDEX IF NOT EXISTS idx_watchlist_market_id ON watchlist(market_id);

