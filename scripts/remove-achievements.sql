-- ============================================================================
-- REMOVE ACHIEVEMENTS FROM SUPABASE DATABASE
-- ============================================================================
-- This script removes the "trend_setter" and "check_in_champion" achievements from the database

-- First, remove any user progress for the achievements
DELETE FROM user_achievements 
WHERE achievement_id IN ('trend_setter', 'check_in_champion');

-- Then remove the achievement definitions themselves
DELETE FROM achievements 
WHERE id IN ('trend_setter', 'check_in_champion');

-- Verify the removal
SELECT 'Achievement removal completed' as status;
SELECT COUNT(*) as remaining_achievements FROM achievements WHERE is_active = true;

-- Show all remaining active achievements
SELECT 
    id,
    title,
    description,
    icon,
    category,
    max_progress,
    omni_reward,
    rarity,
    is_active
FROM achievements 
WHERE is_active = true 
ORDER BY category, rarity, title;