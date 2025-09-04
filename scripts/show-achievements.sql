-- ============================================================================
-- SHOW ALL ACTIVE ACHIEVEMENTS IN SUPABASE DATABASE
-- ============================================================================
-- This script displays all active achievements without making any changes

-- Show count of active achievements
SELECT COUNT(*) as total_active_achievements FROM achievements WHERE is_active = true;

-- Show all active achievements with details
SELECT 
    id,
    title,
    description,
    icon,
    category,
    max_progress,
    omni_reward,
    rarity,
    is_active,
    created_at
FROM achievements 
WHERE is_active = true 
ORDER BY category, rarity, title;

-- Show achievements by category
SELECT 
    category,
    COUNT(*) as count,
    STRING_AGG(title, ', ' ORDER BY title) as achievements
FROM achievements 
WHERE is_active = true 
GROUP BY category 
ORDER BY category;

-- Show achievements by rarity
SELECT 
    rarity,
    COUNT(*) as count,
    STRING_AGG(title, ', ' ORDER BY title) as achievements
FROM achievements 
WHERE is_active = true 
GROUP BY rarity 
ORDER BY 
    CASE rarity 
        WHEN 'common' THEN 1
        WHEN 'rare' THEN 2
        WHEN 'epic' THEN 3
        WHEN 'legendary' THEN 4
    END;
