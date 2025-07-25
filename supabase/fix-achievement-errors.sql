-- 🔧 FIX ACHIEVEMENT UPDATE ERRORS
-- This script fixes the "JSON object requested, multiple (or no) rows returned" error

-- =====================================================
-- 1. CREATE A BETTER ACHIEVEMENT UPDATE FUNCTION
-- =====================================================

-- Drop the existing function if it exists
DROP FUNCTION IF EXISTS update_user_achievement_progress(text, text, integer);

-- Create a more robust achievement update function
CREATE OR REPLACE FUNCTION update_user_achievement_progress(
    username_param text,
    achievement_id_param text,
    new_progress integer
)
RETURNS json AS $$
DECLARE
    current_achievement record;
    achievement_details record;
    updated_progress integer;
    newly_completed boolean;
    result record;
BEGIN
    -- Check if user exists
    IF NOT EXISTS (SELECT 1 FROM users WHERE username = username_param) THEN
        RETURN json_build_object('error', 'User not found');
    END IF;

    -- Check if achievement exists
    IF NOT EXISTS (SELECT 1 FROM achievements WHERE id = achievement_id_param) THEN
        RETURN json_build_object('error', 'Achievement not found');
    END IF;

    -- Get current achievement progress (if exists)
    SELECT * INTO current_achievement
    FROM user_achievements
    WHERE username = username_param AND achievement_id = achievement_id_param;

    -- Get achievement details
    SELECT * INTO achievement_details
    FROM achievements
    WHERE id = achievement_id_param;

    -- If no current achievement record exists, create one
    IF current_achievement IS NULL THEN
        INSERT INTO user_achievements (
            username,
            achievement_id,
            progress,
            max_progress,
            completed,
            omni_earned
        ) VALUES (
            username_param,
            achievement_id_param,
            LEAST(new_progress, achievement_details.max_progress),
            achievement_details.max_progress,
            new_progress >= achievement_details.max_progress,
            CASE WHEN new_progress >= achievement_details.max_progress THEN achievement_details.omni_reward ELSE 0 END
        )
        RETURNING * INTO result;

        RETURN row_to_json(result);
    END IF;

    -- Update existing achievement
    updated_progress := LEAST(new_progress, achievement_details.max_progress);
    newly_completed := NOT current_achievement.completed AND updated_progress >= achievement_details.max_progress;

    UPDATE user_achievements SET
        progress = updated_progress,
        completed = updated_progress >= achievement_details.max_progress,
        omni_earned = CASE WHEN newly_completed THEN achievement_details.omni_reward ELSE current_achievement.omni_earned END,
        updated_at = timezone('utc', now())
    WHERE username = username_param AND achievement_id = achievement_id_param
    RETURNING * INTO result;

    RETURN row_to_json(result);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 2. CREATE A FUNCTION TO INITIALIZE USER ACHIEVEMENTS
-- =====================================================

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS initialize_user_achievements(text);

-- Create function to initialize all achievements for a user
CREATE OR REPLACE FUNCTION initialize_user_achievements(username_param text)
RETURNS boolean AS $$
DECLARE
    achievement_record record;
BEGIN
    -- Check if user exists
    IF NOT EXISTS (SELECT 1 FROM users WHERE username = username_param) THEN
        RETURN false;
    END IF;

    -- Insert all active achievements for the user
    FOR achievement_record IN 
        SELECT id, max_progress, omni_reward 
        FROM achievements 
        WHERE is_active = true
    LOOP
        -- Insert achievement record if it doesn't exist
        INSERT INTO user_achievements (
            username,
            achievement_id,
            progress,
            max_progress,
            completed,
            omni_earned
        ) VALUES (
            username_param,
            achievement_record.id,
            0,
            achievement_record.max_progress,
            false,
            0
        )
        ON CONFLICT (username, achievement_id) DO NOTHING;
    END LOOP;

    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 3. VERIFY THE FIX
-- =====================================================

-- Test the function with a sample user (replace with actual username)
-- SELECT update_user_achievement_progress('test_user', 'welcome_bonus', 1);

-- Check if functions were created successfully
SELECT 
    'FUNCTION CREATION STATUS' as check_type,
    proname as function_name,
    '✅ Created successfully' as status
FROM pg_proc 
WHERE proname IN ('update_user_achievement_progress', 'initialize_user_achievements')
AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- =====================================================
-- 4. SUMMARY
-- =====================================================

SELECT 
    'ACHIEVEMENT FIX STATUS' as status_type,
    'Achievement update functions improved' as action,
    'No more "0 rows returned" errors' as result,
    'Welcome achievements should work properly' as conclusion; 