-- ============================================================================
-- FIX DUPLICATE ACHIEVEMENTS
-- Run this in Supabase SQL Editor to clean up duplicate achievements
-- ============================================================================

-- 1. Check for duplicates first
SELECT 
  username, 
  achievement_id, 
  COUNT(*) as count
FROM user_achievements 
GROUP BY username, achievement_id 
HAVING COUNT(*) > 1
ORDER BY count DESC;

-- 2. Remove duplicates (keep the oldest record)
WITH duplicates AS (
  SELECT 
    username, 
    achievement_id, 
    COUNT(*) as count,
    MIN(created_at) as keep_created_at
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
  WHERE ua.created_at != d.keep_created_at
);

-- 3. Verify no more duplicates
SELECT 
  'Remaining duplicates' as status,
  COUNT(*) as count
FROM (
  SELECT username, achievement_id, COUNT(*) as count
  FROM user_achievements 
  GROUP BY username, achievement_id 
  HAVING COUNT(*) > 1
) duplicates;
