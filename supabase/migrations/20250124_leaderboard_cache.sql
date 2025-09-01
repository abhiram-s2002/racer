-- Migration: Create Leaderboard Cache Table
-- Date: 2025-01-24
-- Description: Creates leaderboard cache table for fast leaderboard queries

-- Create leaderboard cache table
CREATE TABLE IF NOT EXISTS leaderboard_cache (
    id SERIAL PRIMARY KEY,
    username TEXT REFERENCES users(username) ON DELETE CASCADE,
    total_omni_earned INTEGER NOT NULL,
    rank INTEGER NOT NULL,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(username)
);

-- Create indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_leaderboard_cache_rank ON leaderboard_cache(rank);
CREATE INDEX IF NOT EXISTS idx_leaderboard_cache_username ON leaderboard_cache(username);

-- Add index to user_rewards for efficient ranking calculations
CREATE INDEX IF NOT EXISTS idx_user_rewards_total_omni_earned 
ON user_rewards(total_omni_earned DESC);

-- Insert initial data (optional - will be populated by Edge Function)
-- This is just a placeholder, the actual data will be populated by the background service
INSERT INTO leaderboard_cache (username, total_omni_earned, rank)
SELECT 
    username,
    total_omni_earned,
    ROW_NUMBER() OVER (ORDER BY total_omni_earned DESC) as rank
FROM user_rewards 
WHERE total_omni_earned > 0
ON CONFLICT (username) DO UPDATE SET
    total_omni_earned = EXCLUDED.total_omni_earned,
    rank = EXCLUDED.rank,
    last_updated = NOW();
