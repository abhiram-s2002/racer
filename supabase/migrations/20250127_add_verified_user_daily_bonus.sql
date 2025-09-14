-- ============================================================================
-- VERIFIED USER DAILY CHECK-IN BONUS
-- ============================================================================
-- This migration adds a bonus OMNI reward for verified users on daily check-ins
-- Verified users get 20 OMNI instead of the standard amount

-- ============================================================================
-- DAILY CHECK-IN BONUS FUNCTION
-- ============================================================================

-- Function to calculate daily check-in rewards with verification bonus
CREATE OR REPLACE FUNCTION calculate_daily_checkin_reward(
    p_username text,
    p_is_verified boolean DEFAULT false
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    base_reward integer := 10;  -- Standard daily check-in reward
    verified_bonus integer := 10;  -- Extra reward for verified users
    total_reward integer;
BEGIN
    -- Calculate total reward
    IF p_is_verified THEN
        total_reward := base_reward + verified_bonus;  -- 20 OMNI for verified users
    ELSE
        total_reward := base_reward;  -- 10 OMNI for regular users
    END IF;
    
    RETURN total_reward;
END;
$$;

-- ============================================================================
-- ENHANCED DAILY CHECK-IN FUNCTION
-- ============================================================================

-- Function to process daily check-in with verification bonus
CREATE OR REPLACE FUNCTION process_daily_checkin_with_verification(
    p_username text,
    p_user_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_is_verified boolean;
    v_reward_amount integer;
    v_current_balance integer;
    v_result json;
BEGIN
    -- Check if user is verified
    SELECT 
        verification_status = 'verified' AND 
        (expires_at IS NULL OR expires_at > NOW())
    INTO v_is_verified
    FROM users 
    WHERE id = p_user_id;
    
    -- Calculate reward amount
    v_reward_amount := calculate_daily_checkin_reward(p_username, v_is_verified);
    
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
        current_balance = current_balance + v_reward_amount,
        total_omni_earned = total_omni_earned + v_reward_amount,
        updated_at = NOW()
    WHERE username = p_username;
    
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
        v_reward_amount,
        CASE 
            WHEN v_is_verified THEN 'Daily check-in (Verified User Bonus)'
            ELSE 'Daily check-in'
        END,
        'daily_checkin'
    );
    
    -- Return success response
    RETURN json_build_object(
        'success', true,
        'reward_amount', v_reward_amount,
        'is_verified', v_is_verified,
        'new_balance', v_current_balance + v_reward_amount,
        'message', CASE 
            WHEN v_is_verified THEN 'Daily check-in completed! You earned 20 OMNI (10 + 10 verified bonus)'
            ELSE 'Daily check-in completed! You earned 10 OMNI'
        END
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Failed to process daily check-in: ' || SQLERRM
        );
END;
$$;

-- ============================================================================
-- VERIFICATION STATUS CHECK FUNCTION
-- ============================================================================

-- Function to check if user is currently verified
CREATE OR REPLACE FUNCTION is_user_currently_verified(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_is_verified boolean;
BEGIN
    SELECT 
        verification_status = 'verified' AND 
        (expires_at IS NULL OR expires_at > NOW())
    INTO v_is_verified
    FROM users 
    WHERE id = p_user_id;
    
    RETURN COALESCE(v_is_verified, false);
END;
$$;

-- ============================================================================
-- REWARD CALCULATION HELPER
-- ============================================================================

-- Function to get reward amounts for different user types
CREATE OR REPLACE FUNCTION get_reward_amounts()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN json_build_object(
        'daily_checkin_regular', 10,
        'daily_checkin_verified', 20,
        'verified_bonus', 10,
        'description', 'Verified users get 20 OMNI for daily check-in (10 base + 10 bonus)'
    );
END;
$$;

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

-- Grant permissions for all functions
GRANT EXECUTE ON FUNCTION calculate_daily_checkin_reward(text, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION process_daily_checkin_with_verification(text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION is_user_currently_verified(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_reward_amounts() TO authenticated;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Verify all functions were created successfully
DO $$
DECLARE
    function_count integer;
BEGIN
    SELECT COUNT(*) INTO function_count
    FROM pg_proc 
    WHERE proname IN (
        'calculate_daily_checkin_reward',
        'process_daily_checkin_with_verification',
        'is_user_currently_verified',
        'get_reward_amounts'
    );
    
    IF function_count = 4 THEN
        RAISE NOTICE 'All verified user bonus functions created successfully!';
    ELSE
        RAISE EXCEPTION 'Some functions failed to create. Expected 4, got %', function_count;
    END IF;
END;
$$;
