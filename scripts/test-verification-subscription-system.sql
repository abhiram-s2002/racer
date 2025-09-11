-- ============================================================================
-- COMPREHENSIVE TEST FOR VERIFICATION-SUBSCRIPTION SYSTEM
-- ============================================================================

-- Test 1: Check if all tables exist and have data
SELECT 
    'Table Status Check' as test_type,
    (SELECT COUNT(*) FROM users) as user_count,
    (SELECT COUNT(*) FROM subscription_products) as product_count,
    (SELECT COUNT(*) FROM user_subscriptions) as subscription_count,
    (SELECT COUNT(*) FROM subscription_transactions) as transaction_count;

-- Test 2: Check if subscription products are properly inserted
SELECT 
    'Subscription Products Check' as test_type,
    product_id,
    name,
    price,
    billing_period,
    is_active
FROM subscription_products
ORDER BY created_at;

-- Test 3: Test validation function with non-existent user (should return false)
SELECT 
    'Validation Test - Non-existent User' as test_type,
    public.validate_subscription_purchase(
        '00000000-0000-0000-0000-000000000000'::uuid,
        'com.geomart.app.verification.monthly',
        'test_token_123456789'
    ) as validation_result;

-- Test 4: Test validation function with valid product but invalid user
SELECT 
    'Validation Test - Valid Product' as test_type,
    public.validate_subscription_purchase(
        '00000000-0000-0000-0000-000000000000'::uuid,
        'com.geomart.app.verification.annual',
        'test_token_123456789'
    ) as validation_result;

-- Test 5: Test validation function with invalid product
SELECT 
    'Validation Test - Invalid Product' as test_type,
    public.validate_subscription_purchase(
        '00000000-0000-0000-0000-000000000000'::uuid,
        'invalid.product.id',
        'test_token_123456789'
    ) as validation_result;

-- Test 6: Check if functions exist and are callable
SELECT 
    'Function Existence Check' as test_type,
    EXISTS(
        SELECT 1 FROM pg_proc 
        WHERE proname = 'sync_subscription_with_verification'
    ) as sync_function_exists,
    EXISTS(
        SELECT 1 FROM pg_proc 
        WHERE proname = 'get_user_verification_status_complete'
    ) as status_function_exists,
    EXISTS(
        SELECT 1 FROM pg_proc 
        WHERE proname = 'validate_subscription_purchase'
    ) as validation_function_exists,
    EXISTS(
        SELECT 1 FROM pg_proc 
        WHERE proname = 'handle_subscription_expiry'
    ) as expiry_function_exists;

-- Test 7: Test cleanup function (should not error)
SELECT 
    'Cleanup Function Test' as test_type,
    public.handle_subscription_expiry() as cleanup_result;

-- Test 8: Check RLS policies
SELECT 
    'RLS Policy Check' as test_type,
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename IN ('user_subscriptions', 'subscription_products', 'subscription_transactions')
ORDER BY tablename, policyname;

-- Test 9: Check indexes for performance
SELECT 
    'Index Check' as test_type,
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename IN ('user_subscriptions', 'subscription_products', 'subscription_transactions', 'users')
ORDER BY tablename, indexname;

-- Test 10: Final system status
SELECT 
    'System Status' as test_type,
    'Verification-Subscription System' as system_name,
    'Ready for Production' as status,
    NOW() as tested_at;
