-- ============================================================================
-- FIX REWARDS SCHEMA MISMATCH
-- Run this in Supabase SQL Editor to fix column mismatches
-- ============================================================================

-- 1. Add missing columns to match code expectations

-- Add id column to user_streaks (if code expects it)
ALTER TABLE user_streaks 
ADD COLUMN IF NOT EXISTS id uuid DEFAULT gen_random_uuid();

-- Add streak_day column to daily_checkins
ALTER TABLE daily_checkins 
ADD COLUMN IF NOT EXISTS streak_day integer DEFAULT 1;

-- Add current_progress column to user_achievements (alias for progress)
ALTER TABLE user_achievements 
ADD COLUMN IF NOT EXISTS current_progress integer DEFAULT 0;

-- 2. Update current_progress to match progress values
UPDATE user_achievements 
SET current_progress = COALESCE(progress, 0)
WHERE current_progress = 0;

-- 3. Create a view to handle the column aliases (alternative approach)
CREATE OR REPLACE VIEW user_achievements_view AS
SELECT 
  id,
  username,
  achievement_id,
  progress,
  progress as current_progress,  -- Alias for compatibility
  max_progress,
  completed,
  omni_earned,
  created_at,
  updated_at,
  completed_at,
  last_updated_at
FROM user_achievements;

-- 4. Fix duplicate achievements by cleaning up duplicates
-- First, let's see what duplicates exist
WITH duplicates AS (
  SELECT 
    username, 
    achievement_id, 
    COUNT(*) as count,
    MIN(id) as keep_id
  FROM user_achievements 
  GROUP BY username, achievement_id 
  HAVING COUNT(*) > 1
)
DELETE FROM user_achievements 
WHERE id IN (
  SELECT ua.id 
  FROM user_achievements ua
  JOIN duplicates d ON ua.username = d.username 
    AND ua.achievement_id = d.achievement_id
  WHERE ua.id != d.keep_id
);

-- 5. Add proper indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_streaks_id ON user_streaks(id);
CREATE INDEX IF NOT EXISTS idx_daily_checkins_streak_day ON daily_checkins(streak_day);
CREATE INDEX IF NOT EXISTS idx_user_achievements_current_progress ON user_achievements(current_progress);

-- 6. Verify the fixes
SELECT 'user_streaks columns' as table_name, column_name 
FROM information_schema.columns 
WHERE table_name = 'user_streaks' 
ORDER BY ordinal_position;

SELECT 'daily_checkins columns' as table_name, column_name 
FROM information_schema.columns 
WHERE table_name = 'daily_checkins' 
ORDER BY ordinal_position;

SELECT 'user_achievements columns' as table_name, column_name 
FROM information_schema.columns 
WHERE table_name = 'user_achievements' 
ORDER BY ordinal_position;
