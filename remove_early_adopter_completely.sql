-- ============================================================================
-- COMPLETE REMOVAL OF EARLY ADOPTER ACHIEVEMENT
-- ============================================================================
-- This script completely removes the early_adopter achievement from the system
-- Run this in Supabase SQL Editor to clean up all references

-- ============================================================================
-- 1. REMOVE FROM USER ACHIEVEMENTS TABLE
-- ============================================================================

-- Delete all user_achievements records for early_adopter
DELETE FROM user_achievements 
WHERE achievement_id = 'early_adopter';

-- ============================================================================
-- 2. REMOVE FROM ACHIEVEMENTS TABLE
-- ============================================================================

-- Delete the early_adopter achievement from the master achievements table
DELETE FROM achievements 
WHERE id = 'early_adopter';

-- ============================================================================
-- 3. REMOVE FROM REWARD TRANSACTIONS
-- ============================================================================

-- Delete any reward transactions related to early_adopter
DELETE FROM reward_transactions 
WHERE description ILIKE '%early%adopter%' 
   OR description ILIKE '%early adopter%'
   OR reference_type = 'early_adopter';

-- ============================================================================
-- 4. UPDATE ACHIEVEMENT INITIALIZATION FUNCTIONS
-- ============================================================================

-- Update the initializeUserAchievements function to exclude early_adopter
CREATE OR REPLACE FUNCTION initializeUserAchievements(p_username text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    achievement_record RECORD;
    v_achievement_id text;
BEGIN
    -- Insert user achievements for all active achievements except early_adopter
    FOR achievement_record IN 
        SELECT id, title, description, icon, category, max_progress, omni_reward, rarity
        FROM achievements 
        WHERE is_active = true 
        AND id != 'early_adopter'  -- Exclude early_adopter
        ORDER BY id
    LOOP
        -- Insert user achievement record
        INSERT INTO user_achievements (
            username,
            achievement_id,
            progress,
            max_progress,
            completed,
            omni_earned,
            created_at,
            updated_at
        ) VALUES (
            p_username,
            achievement_record.id,
            0,
            achievement_record.max_progress,
            false,
            0,
            NOW(),
            NOW()
        ) ON CONFLICT (username, achievement_id) DO NOTHING;
    END LOOP;
    
    RETURN true;
EXCEPTION
    WHEN OTHERS THEN
        RETURN false;
END;
$$;

-- ============================================================================
-- 5. UPDATE ACHIEVEMENT PROGRESS FUNCTIONS
-- ============================================================================

-- Update updateUserAchievementProgressSafe to handle early_adopter removal
CREATE OR REPLACE FUNCTION updateUserAchievementProgressSafe(
    p_username text,
    p_achievement_id text,
    p_new_progress integer
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_achievement RECORD;
    v_updated_progress integer;
    v_result json;
BEGIN
    -- Check if achievement exists and is not early_adopter
    IF p_achievement_id = 'early_adopter' THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Early adopter achievement has been removed'
        );
    END IF;
    
    -- Get achievement details
    SELECT max_progress, omni_reward INTO v_achievement
    FROM achievements 
    WHERE id = p_achievement_id AND is_active = true;
    
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Achievement not found or inactive'
        );
    END IF;
    
    v_updated_progress := LEAST(p_new_progress, v_achievement.max_progress);
    
    -- Upsert user achievement
    INSERT INTO user_achievements (
        username,
        achievement_id,
        progress,
        max_progress,
        completed,
        omni_earned,
        updated_at
    ) VALUES (
        p_username,
        p_achievement_id,
        v_updated_progress,
        v_achievement.max_progress,
        v_updated_progress >= v_achievement.max_progress,
        CASE WHEN v_updated_progress >= v_achievement.max_progress THEN v_achievement.omni_reward ELSE 0 END,
        NOW()
    ) ON CONFLICT (username, achievement_id) 
    DO UPDATE SET
        progress = v_updated_progress,
        completed = v_updated_progress >= v_achievement.max_progress,
        omni_earned = CASE WHEN v_updated_progress >= v_achievement.max_progress THEN v_achievement.omni_reward ELSE user_achievements.omni_earned END,
        updated_at = NOW()
    RETURNING * INTO v_result;
    
    RETURN json_build_object(
        'success', true,
        'data', v_result
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Failed to update achievement: ' || SQLERRM
        );
END;
$$;

-- ============================================================================
-- 6. CLEAN UP ACHIEVEMENT STATISTICS
-- ============================================================================

-- Update any functions that might reference early_adopter in statistics
CREATE OR REPLACE FUNCTION getAchievementStats(p_username text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_total_achievements integer;
    v_completed_achievements integer;
    v_total_omni_earned integer;
    v_result json;
BEGIN
    -- Count total active achievements (excluding early_adopter)
    SELECT COUNT(*) INTO v_total_achievements
    FROM achievements 
    WHERE is_active = true AND id != 'early_adopter';
    
    -- Count completed achievements for user
    SELECT COUNT(*) INTO v_completed_achievements
    FROM user_achievements ua
    JOIN achievements a ON ua.achievement_id = a.id
    WHERE ua.username = p_username 
    AND ua.completed = true
    AND a.is_active = true
    AND a.id != 'early_adopter';
    
    -- Calculate total OMNI earned from achievements
    SELECT COALESCE(SUM(ua.omni_earned), 0) INTO v_total_omni_earned
    FROM user_achievements ua
    JOIN achievements a ON ua.achievement_id = a.id
    WHERE ua.username = p_username 
    AND a.is_active = true
    AND a.id != 'early_adopter';
    
    v_result := json_build_object(
        'total_achievements', v_total_achievements,
        'completed_achievements', v_completed_achievements,
        'completion_rate', CASE 
            WHEN v_total_achievements > 0 THEN 
                ROUND((v_completed_achievements::decimal / v_total_achievements) * 100, 2)
            ELSE 0 
        END,
        'total_omni_earned', v_total_omni_earned
    );
    
    RETURN v_result;
END;
$$;

-- ============================================================================
-- 7. UPDATE ACHIEVEMENT LISTING FUNCTIONS
-- ============================================================================

-- Update getUserAchievements to exclude early_adopter
CREATE OR REPLACE FUNCTION getUserAchievements(p_username text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_achievements json;
BEGIN
    SELECT json_agg(
        json_build_object(
            'id', ua.achievement_id,
            'title', a.title,
            'description', a.description,
            'icon', a.icon,
            'category', a.category,
            'progress', ua.progress,
            'max_progress', ua.max_progress,
            'completed', ua.completed,
            'completed_date', ua.completed_date,
            'omni_earned', ua.omni_earned,
            'rarity', a.rarity
        )
        ORDER BY 
            CASE a.rarity 
                WHEN 'legendary' THEN 1
                WHEN 'epic' THEN 2
                WHEN 'rare' THEN 3
                WHEN 'common' THEN 4
            END,
            a.title
    ) INTO v_achievements
    FROM user_achievements ua
    JOIN achievements a ON ua.achievement_id = a.id
    WHERE ua.username = p_username 
    AND a.is_active = true
    AND a.id != 'early_adopter';  -- Exclude early_adopter
    
    RETURN COALESCE(v_achievements, '[]'::json);
END;
$$;

-- ============================================================================
-- 8. VERIFICATION QUERIES
-- ============================================================================

-- Verify early_adopter has been completely removed
DO $$
DECLARE
    v_user_achievements_count integer;
    v_achievements_count integer;
    v_transactions_count integer;
BEGIN
    -- Check user_achievements table
    SELECT COUNT(*) INTO v_user_achievements_count
    FROM user_achievements 
    WHERE achievement_id = 'early_adopter';
    
    -- Check achievements table
    SELECT COUNT(*) INTO v_achievements_count
    FROM achievements 
    WHERE id = 'early_adopter';
    
    -- Check reward_transactions table
    SELECT COUNT(*) INTO v_transactions_count
    FROM reward_transactions 
    WHERE description ILIKE '%early%adopter%' 
       OR description ILIKE '%early adopter%'
       OR reference_type = 'early_adopter';
    
    -- Report results
    RAISE NOTICE 'Early Adopter Removal Verification:';
    RAISE NOTICE 'User achievements records: %', v_user_achievements_count;
    RAISE NOTICE 'Achievements master records: %', v_achievements_count;
    RAISE NOTICE 'Reward transactions records: %', v_transactions_count;
    
    IF v_user_achievements_count = 0 AND v_achievements_count = 0 AND v_transactions_count = 0 THEN
        RAISE NOTICE 'SUCCESS: Early adopter completely removed from all tables!';
    ELSE
        RAISE NOTICE 'WARNING: Some early adopter records may still exist.';
    END IF;
END;
$$;

-- ============================================================================
-- 9. FINAL CLEANUP
-- ============================================================================

-- Update any remaining references in comments or documentation
-- (This is just for reference - no actual changes needed)

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================

SELECT 'Early adopter achievement has been completely removed from the system!' as message;
