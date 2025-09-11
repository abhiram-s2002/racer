-- ============================================================================
-- COMPLETE VERIFICATION-SUBSCRIPTION SYNC SYSTEM
-- ============================================================================
-- This migration creates a complete system to sync subscription purchases
-- with user verification status using standard practices

-- ============================================================================
-- ENHANCED SUBSCRIPTION-VERIFICATION SYNC FUNCTION
-- ============================================================================

-- Function to sync subscription with verification status
CREATE OR REPLACE FUNCTION public.sync_subscription_with_verification(
    p_user_id uuid,
    p_product_id text,
    p_purchase_token text,
    p_purchase_time bigint,
    p_expiry_time bigint DEFAULT NULL,
    p_platform text DEFAULT 'android'
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_username text;
    v_verification_expires_at timestamp;
    v_result json;
BEGIN
    -- Get username for the user
    SELECT username INTO v_username
    FROM public.users
    WHERE id = p_user_id;
    
    IF v_username IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'User not found'
        );
    END IF;
    
    -- Calculate verification expiry based on product type
    IF p_product_id = 'com.geomart.app.verification.monthly' THEN
        -- Monthly subscription: 30 days from now
        v_verification_expires_at := NOW() + INTERVAL '30 days';
    ELSIF p_product_id = 'com.geomart.app.verification.annual' THEN
        -- Annual subscription: 365 days from now
        v_verification_expires_at := NOW() + INTERVAL '365 days';
    ELSE
        -- Default: 30 days
        v_verification_expires_at := NOW() + INTERVAL '30 days';
    END IF;
    
    -- Deactivate any existing subscription for this product
    UPDATE public.user_subscriptions 
    SET is_active = false, updated_at = now()
    WHERE user_id = p_user_id AND product_id = p_product_id AND is_active = true;
    
    -- Insert new subscription
    INSERT INTO public.user_subscriptions (
        user_id,
        username,
        product_id,
        purchase_token,
        purchase_time,
        expiry_time,
        platform
    ) VALUES (
        p_user_id,
        v_username,
        p_product_id,
        p_purchase_token,
        p_purchase_time,
        p_expiry_time,
        p_platform
    );
    
    -- Update user verification status
    UPDATE public.users
    SET 
        verification_status = 'verified',
        verified_at = NOW(),
        expires_at = v_verification_expires_at
    WHERE id = p_user_id;
    
    -- Log the transaction
    INSERT INTO public.subscription_transactions (
        user_id,
        username,
        product_id,
        transaction_type,
        purchase_token,
        platform,
        status
    ) VALUES (
        p_user_id,
        v_username,
        p_product_id,
        'purchase',
        p_purchase_token,
        p_platform,
        'completed'
    );
    
    -- Return success response
    v_result := json_build_object(
        'success', true,
        'user_id', p_user_id,
        'username', v_username,
        'product_id', p_product_id,
        'verification_expires_at', v_verification_expires_at,
        'message', 'Subscription and verification status updated successfully'
    );
    
    RETURN v_result;
END;
$$;

-- ============================================================================
-- ENHANCED VERIFICATION STATUS FUNCTION
-- ============================================================================

-- Function to get comprehensive verification status including subscription
CREATE OR REPLACE FUNCTION public.get_user_verification_status_complete(
    p_user_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_record record;
    v_subscription_record record;
    v_result json;
BEGIN
    -- Get user verification data
    SELECT 
        verification_status,
        verified_at,
        expires_at
    INTO v_user_record
    FROM public.users
    WHERE id = p_user_id;
    
    -- Get active subscription data
    SELECT 
        product_id,
        purchase_time,
        expiry_time,
        is_active,
        auto_renewing
    INTO v_subscription_record
    FROM public.user_subscriptions
    WHERE user_id = p_user_id 
    AND is_active = true
    AND (expiry_time IS NULL OR expiry_time > extract(epoch from now()) * 1000)
    ORDER BY created_at DESC
    LIMIT 1;
    
    -- Build comprehensive result
    v_result := json_build_object(
        'user_id', p_user_id,
        'is_verified', COALESCE(
            (v_user_record.verification_status = 'verified' AND 
             (v_user_record.expires_at IS NULL OR v_user_record.expires_at > NOW())), 
            false
        ),
        'verification_status', COALESCE(v_user_record.verification_status, 'not_verified'),
        'verified_at', v_user_record.verified_at,
        'verification_expires_at', v_user_record.expires_at,
        'has_active_subscription', v_subscription_record IS NOT NULL,
        'subscription_product_id', v_subscription_record.product_id,
        'subscription_purchase_time', v_subscription_record.purchase_time,
        'subscription_expiry_time', v_subscription_record.expiry_time,
        'subscription_auto_renewing', v_subscription_record.auto_renewing
    );
    
    RETURN v_result;
END;
$$;

-- ============================================================================
-- SUBSCRIPTION EXPIRY CLEANUP FUNCTION
-- ============================================================================

-- Function to handle subscription and verification expiry
CREATE OR REPLACE FUNCTION public.handle_subscription_expiry()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_expired_subscriptions integer;
    v_expired_verifications integer;
    v_result json;
BEGIN
    -- Deactivate expired subscriptions
    UPDATE public.user_subscriptions 
    SET is_active = false, updated_at = now()
    WHERE is_active = true 
    AND expiry_time IS NOT NULL 
    AND expiry_time <= extract(epoch from now()) * 1000;
    
    GET DIAGNOSTICS v_expired_subscriptions = ROW_COUNT;
    
    -- Update verification status for users with expired subscriptions
    UPDATE public.users
    SET verification_status = 'not_verified'
    WHERE verification_status = 'verified'
    AND expires_at IS NOT NULL 
    AND expires_at <= NOW();
    
    GET DIAGNOSTICS v_expired_verifications = ROW_COUNT;
    
    v_result := json_build_object(
        'success', true,
        'expired_subscriptions', v_expired_subscriptions,
        'expired_verifications', v_expired_verifications,
        'processed_at', NOW()
    );
    
    RETURN v_result;
END;
$$;

-- ============================================================================
-- SUBSCRIPTION VALIDATION FUNCTION
-- ============================================================================

-- Function to validate subscription purchase (for server-side validation)
CREATE OR REPLACE FUNCTION public.validate_subscription_purchase(
    p_user_id uuid,
    p_product_id text,
    p_purchase_token text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_product_exists boolean;
    v_user_exists boolean;
    v_result json;
BEGIN
    -- Check if product exists and is active
    SELECT EXISTS(
        SELECT 1 FROM public.subscription_products 
        WHERE product_id = p_product_id AND is_active = true
    ) INTO v_product_exists;
    
    -- Check if user exists
    SELECT EXISTS(
        SELECT 1 FROM public.users 
        WHERE id = p_user_id
    ) INTO v_user_exists;
    
    -- Validate purchase token format (basic validation)
    IF p_purchase_token IS NULL OR length(p_purchase_token) < 10 THEN
        v_result := json_build_object(
            'valid', false,
            'error', 'Invalid purchase token'
        );
        RETURN v_result;
    END IF;
    
    -- Build validation result
    v_result := json_build_object(
        'valid', v_product_exists AND v_user_exists,
        'product_exists', v_product_exists,
        'user_exists', v_user_exists,
        'product_id', p_product_id,
        'user_id', p_user_id
    );
    
    RETURN v_result;
END;
$$;

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.sync_subscription_with_verification TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_verification_status_complete TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_subscription_expiry TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_subscription_purchase TO authenticated;

-- ============================================================================
-- CREATE SCHEDULED JOB FOR EXPIRY CLEANUP
-- ============================================================================

-- Create a function to be called by cron for cleanup
CREATE OR REPLACE FUNCTION public.cleanup_expired_subscriptions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    PERFORM public.handle_subscription_expiry();
END;
$$;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Test the new functions
SELECT 
    'Migration Status' as check_type,
    'Verification-subscription sync system created' as status;

-- Test function creation
SELECT 
    'Function Test' as test_type,
    public.validate_subscription_purchase(
        '00000000-0000-0000-0000-000000000000'::uuid,
        'com.geomart.app.verification.monthly',
        'test_token_123456789'
    ) as validation_test;
