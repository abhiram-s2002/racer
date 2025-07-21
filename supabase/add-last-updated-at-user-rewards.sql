-- Migration: add-last-updated-at-user-rewards.sql
-- Purpose: Add last_updated_at column to user_rewards before any indexes or functions reference it

ALTER TABLE user_rewards
ADD COLUMN IF NOT EXISTS last_updated_at timestamp with time zone DEFAULT timezone('utc', now());

-- Verification
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'user_rewards'
  AND column_name = 'last_updated_at'; 