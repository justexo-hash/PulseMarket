-- PulseProfiles foundational schema changes

-- 1. Extend users table with profile fields
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS username TEXT,
  ADD COLUMN IF NOT EXISTS display_name TEXT,
  ADD COLUMN IF NOT EXISTS bio TEXT,
  ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Backfill usernames for existing rows
UPDATE users
SET username = CONCAT('forecaster-', id)
WHERE username IS NULL;

ALTER TABLE users
  ALTER COLUMN username SET NOT NULL;

ALTER TABLE users
  ADD CONSTRAINT IF NOT EXISTS users_username_key UNIQUE (username);

-- 2. Create user_stats table for PulseProfiles metrics
CREATE TABLE IF NOT EXISTS user_stats (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  realized_pnl NUMERIC(20,9) NOT NULL DEFAULT 0,
  total_predictions INTEGER NOT NULL DEFAULT 0,
  correct_predictions INTEGER NOT NULL DEFAULT 0,
  calibration_score NUMERIC(6,3) NOT NULL DEFAULT 0,
  calibration_buckets JSONB NOT NULL DEFAULT '[]'::jsonb,
  sector_specialization JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 3. Create follower graph table
CREATE TABLE IF NOT EXISTS user_followers (
  id SERIAL PRIMARY KEY,
  follower_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  followee_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT user_followers_unique UNIQUE (follower_id, followee_id),
  CONSTRAINT user_followers_self_follow CHECK (follower_id <> followee_id)
);

CREATE INDEX IF NOT EXISTS idx_user_followers_followee ON user_followers (followee_id);
CREATE INDEX IF NOT EXISTS idx_user_followers_follower ON user_followers (follower_id);

