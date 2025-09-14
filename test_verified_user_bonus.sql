-- ============================================================================
-- TEST VERIFIED USER DAILY CHECK-IN BONUS
-- ============================================================================
-- This file tests the verified user bonus system

-- ============================================================================
-- 1. SETUP TEST DATA
-- ============================================================================

-- Create verified user
INSERT INTO users (id, username, email, verification_status, verified_at, expires_at, created_at, updated_at)
VALUES (
    '11111111-1111-1111-1111-111111111111',
    'testuser_verified',
    'verified@example.com',
    'verified',
    NOW(),
    NOW() + INTERVAL '1 month',
    NOW(),
    NOW()
) ON CONFLICT (id) DO UPDATE SET
    username = EXCLUDED.username,
    email = EXCLUDED.email,
    verification_status = EXCLUDED.verification_status,
    verified_at = EXCLUDED.verified_at,
    expires_at = EXCLUDED.expires_at,
    updated_at = NOW();

-- Create non-verified user
INSERT INTO users (id, username, email, verification_status, created_at, updated_at)
VALUES (
    '22222222-2222-2222-2222-222222222222',
    'testuser_regular',
    'regular@example.com',
    'not_verified',
    NOW(),
    NOW()
) ON CONFLICT (id) DO UPDATE SET
    username = EXCLUDED.username,
    email = EXCLUDED.email,
    verification_status = EXCLUDED.verification_status,
    updated_at = NOW();

-- Create rewards records for both users
INSERT INTO user_rewards (username, current_balance, total_omni_earned, total_omni_spent, created_at, updated_at)
VALUES 
    ('testuser_verified', 100, 200, 100, NOW(), NOW()),
    ('testuser_regular', 50, 100, 50, NOW(), NOW())
ON CONFLICT (username) DO UPDATE SET
    current_balance = EXCLUDED.current_balance,
    total_omni_earned = EXCLUDED.total_omni_earned,
    total_omni_spent = EXCLUDED.total_omni_spent,
    updated_at = NOW();

-- ============================================================================
-- 2. TEST REWARD CALCULATION
-- ============================================================================

-- Test reward calculation for verified user
SELECT 'Testing reward calculation for verified user...' as test_step;
SELECT calculate_daily_checkin_reward('testuser_verified', true) as verified_reward;

-- Test reward calculation for regular user
SELECT 'Testing reward calculation for regular user...' as test_step;
SELECT calculate_daily_checkin_reward('testuser_regular', false) as regular_reward;

-- ============================================================================
-- 3. TEST VERIFICATION STATUS CHECK
-- ============================================================================

-- Test verification status check
SELECT 'Testing verification status check...' as test_step;
SELECT 
    'testuser_verified' as username,
    is_user_currently_verified('11111111-1111-1111-1111-111111111111') as is_verified
UNION ALL
SELECT 
    'testuser_regular' as username,
    is_user_currently_verified('22222222-2222-2222-2222-222222222222') as is_verified;

-- ============================================================================
-- 4. TEST DAILY CHECK-IN FOR VERIFIED USER
-- ============================================================================

-- Test daily check-in for verified user
SELECT 'Testing daily check-in for verified user...' as test_step;
SELECT process_daily_checkin_with_verification(
    'testuser_verified',
    '11111111-1111-1111-1111-111111111111'
) as verified_checkin_result;

-- Check verified user's balance after check-in
SELECT 'Checking verified user balance after check-in...' as test_step;
SELECT 
    username,
    current_balance,
    total_omni_earned,
    updated_at
FROM user_rewards 
WHERE username = 'testuser_verified';

-- ============================================================================
-- 5. TEST DAILY CHECK-IN FOR REGULAR USER
-- ============================================================================

-- Test daily check-in for regular user
SELECT 'Testing daily check-in for regular user...' as test_step;
SELECT process_daily_checkin_with_verification(
    'testuser_regular',
    '22222222-2222-2222-2222-222222222222'
) as regular_checkin_result;

-- Check regular user's balance after check-in
SELECT 'Checking regular user balance after check-in...' as test_step;
SELECT 
    username,
    current_balance,
    total_omni_earned,
    updated_at
FROM user_rewards 
WHERE username = 'testuser_regular';

-- ============================================================================
-- 6. CHECK TRANSACTION LOGS
-- ============================================================================

-- Check transaction logs for both users
SELECT 'Checking transaction logs...' as test_step;
SELECT 
    username,
    transaction_type,
    amount,
    description,
    reference_type,
    created_at
FROM reward_transactions 
WHERE username IN ('testuser_verified', 'testuser_regular')
ORDER BY username, created_at DESC;

-- ============================================================================
-- 7. TEST REWARD AMOUNTS FUNCTION
-- ============================================================================

-- Test reward amounts function
SELECT 'Testing reward amounts function...' as test_step;
SELECT get_reward_amounts() as reward_info;

-- ============================================================================
-- 8. TEST EXPIRED VERIFICATION
-- ============================================================================

-- Create user with expired verification
INSERT INTO users (id, username, email, verification_status, verified_at, expires_at, created_at, updated_at)
VALUES (
    '33333333-3333-3333-3333-333333333333',
    'testuser_expired',
    'expired@example.com',
    'verified',
    NOW() - INTERVAL '2 months',
    NOW() - INTERVAL '1 month',  -- Expired 1 month ago
    NOW(),
    NOW()
) ON CONFLICT (id) DO UPDATE SET
    username = EXCLUDED.username,
    email = EXCLUDED.email,
    verification_status = EXCLUDED.verification_status,
    verified_at = EXCLUDED.verified_at,
    expires_at = EXCLUDED.expires_at,
    updated_at = NOW();

INSERT INTO user_rewards (username, current_balance, total_omni_earned, total_omni_spent, created_at, updated_at)
VALUES (
    'testuser_expired',
    75, 150, 75, NOW(), NOW()
) ON CONFLICT (username) DO UPDATE SET
    current_balance = EXCLUDED.current_balance,
    total_omni_earned = EXCLUDED.total_omni_earned,
    total_omni_spent = EXCLUDED.total_omni_spent,
    updated_at = NOW();

-- Test daily check-in for expired user (should get regular reward)
SELECT 'Testing daily check-in for expired user...' as test_step;
SELECT process_daily_checkin_with_verification(
    'testuser_expired',
    '33333333-3333-3333-3333-333333333333'
) as expired_checkin_result;

-- ============================================================================
-- 9. CLEANUP TEST DATA
-- ============================================================================

-- Clean up test data
SELECT 'Cleaning up test data...' as test_step;

-- Delete test users
DELETE FROM users WHERE username IN ('testuser_verified', 'testuser_regular', 'testuser_expired');

-- Delete test rewards
DELETE FROM user_rewards WHERE username IN ('testuser_verified', 'testuser_regular', 'testuser_expired');

-- Delete test transactions
DELETE FROM reward_transactions WHERE username IN ('testuser_verified', 'testuser_regular', 'testuser_expired');

-- ============================================================================
-- 10. FINAL VERIFICATION
-- ============================================================================

-- Verify all functions exist
SELECT 'Verifying all functions exist...' as test_step;
SELECT 
    proname as function_name,
    proargnames as arguments,
    prorettype::regtype as return_type
FROM pg_proc 
WHERE proname IN (
    'calculate_daily_checkin_reward',
    'process_daily_checkin_with_verification',
    'is_user_currently_verified',
    'get_reward_amounts'
)
ORDER BY proname;

SELECT 'All verified user bonus tests completed successfully! 🚀' as final_result;
