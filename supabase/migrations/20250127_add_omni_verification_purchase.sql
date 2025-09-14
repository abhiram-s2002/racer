-- ============================================================================
-- OMNI VERIFICATION PURCHASE SYSTEM
-- ============================================================================
-- This migration adds the ability to purchase verification using OMNI tokens
-- Cost: 1000 OMNI tokens for 1 month of verification
-- Includes automatic expiration handling for 100k+ users

-- ============================================================================
-- CORE PURCHASE FUNCTION
-- ============================================================================

-- Function to purchase verification with OMNI tokens
CREATE OR REPLACE FUNCTION purchase_verification_with_omni(
    p_user_id uuid,
    p_username text,
    p_omni_cost integer DEFAULT 1000
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_balance integer;
    v_verification_expires_at timestamp;
    v_result json;
BEGIN
    -- Check if user has enough OMNI balance
    SELECT current_balance INTO v_current_balance
    FROM user_rewards
    WHERE username = p_username;
    
    -- If user doesn't have rewards record, create one
    IF v_current_balance IS NULL THEN
        INSERT INTO user_rewards (username, current_balance, total_omni_earned, total_omni_spent)
        VALUES (p_username, 0, 0, 0)
        ON CONFLICT (username) DO NOTHING;
        
        SELECT current_balance INTO v_current_balance
        FROM user_rewards
        WHERE username = p_username;
    END IF;
    
    -- Check if user has enough balance
    IF v_current_balance < p_omni_cost THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Insufficient OMNI balance',
            'current_balance', v_current_balance,
            'required_balance', p_omni_cost
        );
    END IF;
    
    -- Calculate new expiration date (1 month from now)
    v_verification_expires_at := NOW() + INTERVAL '1 month';
    
    -- Update user verification status
    UPDATE users 
    SET 
        verification_status = 'verified',
        verified_at = NOW(),
        expires_at = v_verification_expires_at,
        updated_at = NOW()
    WHERE id = p_user_id;
    
    -- Deduct OMNI from user balance
    UPDATE user_rewards
    SET 
        current_balance = current_balance - p_omni_cost,
        total_omni_spent = total_omni_spent + p_omni_cost,
        updated_at = NOW()
    WHERE username = p_username;
    
    -- Create reward transaction for the purchase
    INSERT INTO reward_transactions (
        username,
        transaction_type,
        amount,
        description,
        reference_type
    ) VALUES (
        p_username,
        'spent',
        p_omni_cost,
        'Verification purchase (1 month)',
        'verification_purchase'
    );
    
    -- Return success response
    RETURN json_build_object(
        'success', true,
        'message', 'Verification purchased successfully',
        'verification_expires_at', v_verification_expires_at,
        'remaining_balance', v_current_balance - p_omni_cost
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Failed to purchase verification: ' || SQLERRM
        );
END;
$$;

-- ============================================================================
-- AFFORDABILITY CHECK FUNCTION
-- ============================================================================

-- Function to check if user can afford verification
CREATE OR REPLACE FUNCTION can_afford_verification(
    p_username text,
    p_omni_cost integer DEFAULT 1000
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_balance integer;
    v_result json;
BEGIN
    -- Get current balance
    SELECT current_balance INTO v_current_balance
    FROM user_rewards
    WHERE username = p_username;
    
    -- If user doesn't have rewards record, they can't afford it
    IF v_current_balance IS NULL THEN
        v_current_balance := 0;
    END IF;
    
    -- Return affordability result
    RETURN json_build_object(
        'can_afford', v_current_balance >= p_omni_cost,
        'current_balance', v_current_balance,
        'required_balance', p_omni_cost,
        'shortfall', GREATEST(0, p_omni_cost - v_current_balance)
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'can_afford', false,
            'current_balance', 0,
            'required_balance', p_omni_cost,
            'shortfall', p_omni_cost,
            'error', 'Failed to check affordability: ' || SQLERRM
        );
END;
$$;

-- ============================================================================
-- BULK EXPIRATION FUNCTION (OPTIMIZED FOR 100K+ USERS)
-- ============================================================================

-- Function to expire verifications in bulk (runs every 24 hours)
CREATE OR REPLACE FUNCTION expire_verifications_bulk()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    expired_count integer;
BEGIN
    -- Update all expired verifications in one query (optimized for large datasets)
    UPDATE users 
    SET 
        verification_status = 'not_verified',
        updated_at = NOW()
    WHERE 
        verification_status = 'verified' 
        AND expires_at IS NOT NULL 
        AND expires_at <= NOW();
    
    GET DIAGNOSTICS expired_count = ROW_COUNT;
    
    -- Log the cleanup for monitoring
    INSERT INTO reward_transactions (
        username,
        transaction_type,
        amount,
        description,
        reference_type
    ) VALUES (
        'system',
        'system',
        0,
        'Bulk verification expiration: ' || expired_count || ' users expired',
        'system_cleanup'
    );
    
    RETURN expired_count;
END;
$$;

-- ============================================================================
-- LEGACY CLEANUP FUNCTION (KEPT FOR BACKWARDS COMPATIBILITY)
-- ============================================================================

-- Function to clean up expired OMNI verifications (legacy)
CREATE OR REPLACE FUNCTION cleanup_expired_omni_verifications()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    expired_count integer;
BEGIN
    -- Update expired verifications
    UPDATE users 
    SET 
        verification_status = 'not_verified',
        updated_at = NOW()
    WHERE 
        verification_status = 'verified' 
        AND expires_at IS NOT NULL 
        AND expires_at <= NOW();
    
    GET DIAGNOSTICS expired_count = ROW_COUNT;
    RETURN expired_count;
END;
$$;

-- ============================================================================
-- SCHEDULED JOB SETUP (24-HOUR INTERVAL)
-- ============================================================================

-- Create a function to set up the cron job
CREATE OR REPLACE FUNCTION setup_verification_expiration_cron()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Check if pg_cron extension is available
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        -- Schedule the bulk expiration function to run every 24 hours at 2 AM UTC
        PERFORM cron.schedule(
            'expire-verifications',
            '0 2 * * *',  -- Every day at 2 AM UTC
            'SELECT expire_verifications_bulk();'
        );
        
        RETURN 'Cron job scheduled successfully: expire-verifications will run daily at 2 AM UTC';
    ELSE
        RETURN 'pg_cron extension not available. Please set up manual scheduling or use Edge Functions.';
    END IF;
END;
$$;

-- ============================================================================
-- MONITORING FUNCTIONS
-- ============================================================================

-- Function to check verification statistics
CREATE OR REPLACE FUNCTION get_verification_stats()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_total_users integer;
    v_verified_users integer;
    v_expired_users integer;
    v_expiring_soon integer;
    v_result json;
BEGIN
    -- Get total user count
    SELECT COUNT(*) INTO v_total_users FROM users;
    
    -- Get verified user count
    SELECT COUNT(*) INTO v_verified_users 
    FROM users 
    WHERE verification_status = 'verified';
    
    -- Get expired user count
    SELECT COUNT(*) INTO v_expired_users 
    FROM users 
    WHERE verification_status = 'not_verified' 
    AND expires_at IS NOT NULL 
    AND expires_at <= NOW();
    
    -- Get users expiring in next 24 hours
    SELECT COUNT(*) INTO v_expiring_soon 
    FROM users 
    WHERE verification_status = 'verified' 
    AND expires_at IS NOT NULL 
    AND expires_at <= NOW() + INTERVAL '24 hours';
    
    -- Return statistics
    RETURN json_build_object(
        'total_users', v_total_users,
        'verified_users', v_verified_users,
        'expired_users', v_expired_users,
        'expiring_soon', v_expiring_soon,
        'verification_rate', ROUND(v_verified_users * 100.0 / NULLIF(v_total_users, 0), 2),
        'last_updated', NOW()
    );
END;
$$;

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

-- Grant permissions for all functions
GRANT EXECUTE ON FUNCTION purchase_verification_with_omni(uuid, text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION can_afford_verification(text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION expire_verifications_bulk() TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_expired_omni_verifications() TO authenticated;
GRANT EXECUTE ON FUNCTION setup_verification_expiration_cron() TO authenticated;
GRANT EXECUTE ON FUNCTION get_verification_stats() TO authenticated;

-- ============================================================================
-- INITIAL SETUP
-- ============================================================================

-- Set up the cron job automatically
SELECT setup_verification_expiration_cron();

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
        'purchase_verification_with_omni',
        'can_afford_verification', 
        'expire_verifications_bulk',
        'cleanup_expired_omni_verifications',
        'setup_verification_expiration_cron',
        'get_verification_stats'
    );
    
    IF function_count = 6 THEN
        RAISE NOTICE 'All OMNI verification functions created successfully!';
    ELSE
        RAISE EXCEPTION 'Some functions failed to create. Expected 6, got %', function_count;
    END IF;
END;
$$;