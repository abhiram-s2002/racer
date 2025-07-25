-- 🔧 FIX NEW USER OMNI BALANCE
-- This script fixes new users starting with 550 OMNI instead of 0 OMNI

-- =====================================================
-- 1. UPDATE USER REWARDS INITIALIZATION
-- =====================================================

-- Drop the existing function that gives automatic welcome bonus
DROP FUNCTION IF EXISTS initialize_user_rewards_record(text);

-- Create a new function that starts users with 0 OMNI
CREATE OR REPLACE FUNCTION initialize_user_rewards_record(username_param text)
RETURNS json AS $$
DECLARE
    result record;
BEGIN
    -- Check if user exists
    IF NOT EXISTS (SELECT 1 FROM users WHERE username = username_param) THEN
        RETURN json_build_object('error', 'User not found');
    END IF;

    -- Check if user already has rewards record
    IF EXISTS (SELECT 1 FROM user_rewards WHERE username = username_param) THEN
        SELECT * INTO result FROM user_rewards WHERE username = username_param;
        RETURN row_to_json(result);
    END IF;

    -- Create new rewards record with 0 OMNI balance
    INSERT INTO user_rewards (
        username,
        total_omni_earned,
        total_omni_spent,
        current_balance,
        last_activity_at
    ) VALUES (
        username_param,
        0,  -- Start with 0 earned
        0,  -- Start with 0 spent
        0,  -- Start with 0 balance
        timezone('utc', now())
    )
    RETURNING * INTO result;

    RETURN row_to_json(result);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 2. UPDATE WELCOME ACHIEVEMENTS FUNCTION
-- =====================================================

-- Drop the existing function
DROP FUNCTION IF EXISTS award_welcome_achievements(text);

-- Create a new function that doesn't automatically award achievements
CREATE OR REPLACE FUNCTION award_welcome_achievements(username_param text)
RETURNS boolean AS $$
DECLARE
    existing_achievement record;
BEGIN
    -- Check if user exists
    IF NOT EXISTS (SELECT 1 FROM users WHERE username = username_param) THEN
        RETURN false;
    END IF;

    -- Only award Welcome Bonus if user doesn't have it yet
    SELECT * INTO existing_achievement
    FROM user_achievements
    WHERE username = username_param AND achievement_id = 'welcome_bonus';

    IF existing_achievement IS NULL THEN
        -- Create welcome bonus achievement with 0 progress (not completed)
        INSERT INTO user_achievements (
            username,
            achievement_id,
            progress,
            max_progress,
            completed,
            omni_earned
        ) VALUES (
            username_param,
            'welcome_bonus',
            0,  -- Start with 0 progress
            1,  -- Need 1 to complete
            false,  -- Not completed yet
            0   -- No OMNI earned yet
        );
    END IF;

    -- Only award Early Adopter if user doesn't have it yet
    SELECT * INTO existing_achievement
    FROM user_achievements
    WHERE username = username_param AND achievement_id = 'early_adopter';

    IF existing_achievement IS NULL THEN
        -- Create early adopter achievement with 0 progress (not completed)
        INSERT INTO user_achievements (
            username,
            achievement_id,
            progress,
            max_progress,
            completed,
            omni_earned
        ) VALUES (
            username_param,
            'early_adopter',
            0,  -- Start with 0 progress
            1,  -- Need 1 to complete
            false,  -- Not completed yet
            0   -- No OMNI earned yet
        );
    END IF;

    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 3. CREATE FUNCTION TO CLAIM WELCOME BONUS
-- =====================================================

-- Function for users to manually claim their welcome bonus
CREATE OR REPLACE FUNCTION claim_welcome_bonus(username_param text)
RETURNS json AS $$
DECLARE
    achievement_record record;
    result record;
BEGIN
    -- Check if user exists
    IF NOT EXISTS (SELECT 1 FROM users WHERE username = username_param) THEN
        RETURN json_build_object('error', 'User not found');
    END IF;

    -- Get welcome bonus achievement
    SELECT * INTO achievement_record
    FROM user_achievements
    WHERE username = username_param AND achievement_id = 'welcome_bonus';

    -- If achievement doesn't exist, create it
    IF achievement_record IS NULL THEN
        INSERT INTO user_achievements (
            username,
            achievement_id,
            progress,
            max_progress,
            completed,
            omni_earned
        ) VALUES (
            username_param,
            'welcome_bonus',
            0,
            1,
            false,
            0
        )
        RETURNING * INTO achievement_record;
    END IF;

    -- If already completed, return error
    IF achievement_record.completed THEN
        RETURN json_build_object('error', 'Welcome bonus already claimed');
    END IF;

    -- Complete the achievement and award OMNI
    UPDATE user_achievements SET
        progress = 1,
        completed = true,
        omni_earned = 50,
        completed_at = timezone('utc', now()),
        updated_at = timezone('utc', now())
    WHERE username = username_param AND achievement_id = 'welcome_bonus'
    RETURNING * INTO result;

    -- Add OMNI to user balance
    UPDATE user_rewards SET
        total_omni_earned = total_omni_earned + 50,
        current_balance = current_balance + 50,
        last_activity_at = timezone('utc', now())
    WHERE username = username_param;

    -- Create reward transaction
    INSERT INTO reward_transactions (
        username,
        transaction_type,
        amount,
        description,
        reference_type
    ) VALUES (
        username_param,
        'achievement',
        50,
        'Welcome Bonus achievement completed',
        'achievement'
    );

    RETURN row_to_json(result);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 4. VERIFY THE FIX
-- =====================================================

-- Check if functions were created successfully
SELECT 
    'FUNCTION CREATION STATUS' as check_type,
    proname as function_name,
    '✅ Created successfully' as status
FROM pg_proc 
WHERE proname IN ('initialize_user_rewards_record', 'award_welcome_achievements', 'claim_welcome_bonus')
AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- =====================================================
-- 5. SUMMARY
-- =====================================================

SELECT 
    'NEW USER BALANCE FIX STATUS' as status_type,
    'New users will start with 0 OMNI' as action,
    'Welcome bonus must be claimed manually' as result,
    'No more automatic 550 OMNI balance' as conclusion; 