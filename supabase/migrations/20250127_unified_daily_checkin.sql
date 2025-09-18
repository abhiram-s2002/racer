-- ============================================================================
-- UNIFIED DAILY CHECK-IN SYSTEM
-- ============================================================================
-- This migration creates a single, unified daily check-in function that handles
-- both verified and non-verified users intelligently in one place

-- ============================================================================
-- UNIFIED DAILY CHECK-IN FUNCTION
-- ============================================================================

-- Single function that handles all daily check-ins
CREATE OR REPLACE FUNCTION public.process_daily_checkin(
    p_username text,
    p_user_id uuid DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_is_verified boolean := false;
    v_reward_amount integer;
    v_current_balance integer;
    v_streak_bonus integer := 0;
    v_total_reward integer;
    v_result json;
    v_existing_checkin boolean;
BEGIN
    -- Check if user already checked in today
    SELECT EXISTS(
        SELECT 1 FROM daily_checkins 
        WHERE username = p_username 
        AND checkin_date = CURRENT_DATE
    ) INTO v_existing_checkin;
    
    IF v_existing_checkin THEN
        RETURN json_build_object(
            'success', true,
            'reward_amount', 0,
            'is_verified', false,
            'new_balance', 0,
            'message', 'Already checked in today!',
            'already_checked_in', true
        );
    END IF;
    
    -- Check if user is verified (only if user_id provided)
    IF p_user_id IS NOT NULL THEN
        SELECT 
            verification_status = 'verified' AND 
            (expires_at IS NULL OR expires_at > NOW())
        INTO v_is_verified
        FROM users 
        WHERE id = p_user_id;
    END IF;
    
    -- Calculate base reward
    v_reward_amount := CASE 
        WHEN v_is_verified THEN 20  -- 20 OMNI for verified users
        ELSE 10                     -- 10 OMNI for regular users
    END;
    
    -- Calculate streak bonus (if user has streak data)
    IF p_user_id IS NOT NULL THEN
        SELECT 
            CASE 
                WHEN current_streak >= 30 THEN 1000  -- Monthly bonus
                WHEN current_streak >= 7 THEN 200    -- Weekly bonus
                ELSE 0
            END
        INTO v_streak_bonus
        FROM user_streaks 
        WHERE username = p_username;
    END IF;
    
    -- Calculate total reward
    v_total_reward := v_reward_amount + COALESCE(v_streak_bonus, 0);
    
    -- Get current balance
    SELECT current_balance INTO v_current_balance
    FROM user_rewards
    WHERE username = p_username;
    
    -- If user doesn't have rewards record, create one
    IF v_current_balance IS NULL THEN
        INSERT INTO user_rewards (username, current_balance, total_omni_earned, total_omni_spent)
        VALUES (p_username, 0, 0, 0)
        ON CONFLICT (username) DO NOTHING;
        
        v_current_balance := 0;
    END IF;
    
    -- Add reward to user balance
    UPDATE user_rewards
    SET 
        current_balance = current_balance + v_total_reward,
        total_omni_earned = total_omni_earned + v_total_reward,
        updated_at = NOW()
    WHERE username = p_username;
    
    -- Create check-in record
    INSERT INTO daily_checkins (username, checkin_date, omni_earned)
    VALUES (p_username, CURRENT_DATE, v_total_reward)
    ON CONFLICT (username, checkin_date) DO NOTHING;
    
    -- Create reward transaction
    INSERT INTO reward_transactions (
        username,
        transaction_type,
        amount,
        description,
        reference_type
    ) VALUES (
        p_username,
        'earned',
        v_total_reward,
        CASE 
            WHEN v_is_verified AND v_streak_bonus > 0 THEN 
                'Daily check-in (Verified + ' || v_streak_bonus || ' streak bonus)'
            WHEN v_is_verified THEN 'Daily check-in (Verified User Bonus)'
            WHEN v_streak_bonus > 0 THEN 
                'Daily check-in (' || v_streak_bonus || ' streak bonus)'
            ELSE 'Daily check-in'
        END,
        'daily_checkin'
    );
    
    -- Update user streak
    IF p_user_id IS NOT NULL THEN
        INSERT INTO user_streaks (username, current_streak, last_checkin_date)
        VALUES (p_username, 1, CURRENT_DATE)
        ON CONFLICT (username) DO UPDATE SET
            current_streak = CASE 
                WHEN user_streaks.last_checkin_date = CURRENT_DATE - INTERVAL '1 day' 
                THEN user_streaks.current_streak + 1
                ELSE 1
            END,
            last_checkin_date = CURRENT_DATE,
            updated_at = NOW();
    END IF;
    
    -- Return success response
    RETURN json_build_object(
        'success', true,
        'reward_amount', v_total_reward,
        'base_reward', v_reward_amount,
        'streak_bonus', COALESCE(v_streak_bonus, 0),
        'is_verified', v_is_verified,
        'new_balance', v_current_balance + v_total_reward,
        'message', CASE 
            WHEN v_is_verified AND v_streak_bonus > 0 THEN 
                'Daily check-in completed! You earned ' || v_total_reward || ' OMNI (20 verified + ' || v_streak_bonus || ' streak bonus)'
            WHEN v_is_verified THEN 
                'Daily check-in completed! You earned 20 OMNI (10 + 10 verified bonus)'
            WHEN v_streak_bonus > 0 THEN 
                'Daily check-in completed! You earned ' || v_total_reward || ' OMNI (10 base + ' || v_streak_bonus || ' streak bonus)'
            ELSE 
                'Daily check-in completed! You earned 10 OMNI'
        END,
        'already_checked_in', false
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'reward_amount', 0,
            'is_verified', false,
            'new_balance', 0,
            'message', 'Failed to process daily check-in',
            'error', 'Failed to process daily check-in: ' || SQLERRM,
            'already_checked_in', false
        );
END;
$$;

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

GRANT EXECUTE ON FUNCTION public.process_daily_checkin(text, uuid) TO authenticated;

-- ============================================================================
-- CLEANUP OLD FUNCTIONS (Optional - can be done later)
-- ============================================================================

-- Note: The old functions can be dropped later once the new system is confirmed working
-- DROP FUNCTION IF EXISTS public.process_daily_checkin_with_verification(text, uuid);
-- DROP FUNCTION IF EXISTS public.calculate_daily_checkin_reward(text, boolean);
