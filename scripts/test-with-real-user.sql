-- ============================================================================
-- TEST VERIFICATION-SUBSCRIPTION SYSTEM WITH REAL USER
-- ============================================================================

-- Step 1: Create a test user (if none exists)
INSERT INTO auth.users (
    id,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    role,
    aud
) VALUES (
    '11111111-1111-1111-1111-111111111111',
    'test@example.com',
    crypt('password123', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    '{"provider": "email", "providers": ["email"]}',
    '{}',
    false,
    'authenticated',
    'authenticated'
) ON CONFLICT (id) DO NOTHING;

-- Step 2: Create corresponding user profile
INSERT INTO public.users (
    id,
    username,
    name,
    email,
    phone,
    verification_status,
    created_at,
    updated_at
) VALUES (
    '11111111-1111-1111-1111-111111111111',
    'testuser',
    'Test User',
    'test@example.com',
    '+1234567890',
    'not_verified',
    NOW(),
    NOW()
) ON CONFLICT (id) DO NOTHING;

-- Step 3: Test validation with real user
SELECT 
    'Validation Test - Real User' as test_type,
    public.validate_subscription_purchase(
        '11111111-1111-1111-1111-111111111111'::uuid,
        'com.geomart.app.verification.monthly',
        'test_token_real_user_123456789'
    ) as validation_result;

-- Step 4: Test sync function with real user
SELECT 
    'Sync Test - Real User' as test_type,
    public.sync_subscription_with_verification(
        '11111111-1111-1111-1111-111111111111'::uuid,
        'com.geomart.app.verification.monthly',
        'test_token_real_user_123456789',
        extract(epoch from now()) * 1000,
        extract(epoch from now() + interval '30 days') * 1000,
        'android'
    ) as sync_result;

-- Step 5: Check user verification status after sync
SELECT 
    'User Status After Sync' as test_type,
    public.get_user_verification_status_complete(
        '11111111-1111-1111-1111-111111111111'::uuid
    ) as verification_status;

-- Step 6: Check database records
SELECT 
    'Database Records Check' as test_type,
    (SELECT verification_status FROM users WHERE id = '11111111-1111-1111-1111-111111111111') as user_verification_status,
    (SELECT COUNT(*) FROM user_subscriptions WHERE user_id = '11111111-1111-1111-1111-111111111111') as subscription_count,
    (SELECT COUNT(*) FROM subscription_transactions WHERE user_id = '11111111-1111-1111-1111-111111111111') as transaction_count;

-- Step 7: Cleanup test data (optional)
-- DELETE FROM subscription_transactions WHERE user_id = '11111111-1111-1111-1111-111111111111';
-- DELETE FROM user_subscriptions WHERE user_id = '11111111-1111-1111-1111-111111111111';
-- DELETE FROM users WHERE id = '11111111-1111-1111-1111-111111111111';
-- DELETE FROM auth.users WHERE id = '11111111-1111-1111-1111-111111111111';
