-- ============================================================================
-- COMPLETE OMNI VERIFICATION TEST SUITE
-- ============================================================================
-- This file tests the entire OMNI verification purchase flow
-- Run this after deploying the migration to verify everything works

-- ============================================================================
-- 1. SETUP TEST DATA
-- ============================================================================

-- Create test user
INSERT INTO users (id, username, email, verification_status, created_at, updated_at)
VALUES (
    '11111111-1111-1111-1111-111111111111',
    'testuser_omni',
    'test@example.com',
    'not_verified',
    NOW(),
    NOW()
) ON CONFLICT (id) DO UPDATE SET
    username = EXCLUDED.username,
    email = EXCLUDED.email,
    verification_status = EXCLUDED.verification_status,
    updated_at = NOW();

-- Create test user rewards with enough OMNI
INSERT INTO user_rewards (username, current_balance, total_omni_earned, total_omni_spent, created_at, updated_at)
VALUES (
    'testuser_omni',
    1500,  -- Enough for verification
    2000,
    500,
    NOW(),
    NOW()
) ON CONFLICT (username) DO UPDATE SET
    current_balance = EXCLUDED.current_balance,
    total_omni_earned = EXCLUDED.total_omni_earned,
    total_omni_spent = EXCLUDED.total_omni_spent,
    updated_at = NOW();

-- ============================================================================
-- 2. TEST AFFORDABILITY CHECK
-- ============================================================================

-- Test if user can afford verification
SELECT 'Testing affordability check...' as test_step;
SELECT can_afford_verification('testuser_omni', 1000) as affordability_result;

-- ============================================================================
-- 3. TEST PURCHASE WITH SUFFICIENT BALANCE
-- ============================================================================

-- Test purchase with sufficient balance
SELECT 'Testing purchase with sufficient balance...' as test_step;
SELECT purchase_verification_with_omni(
    '11111111-1111-1111-1111-111111111111',
    'testuser_omni',
    1000
) as purchase_result;

-- ============================================================================
-- 4. VERIFY PURCHASE SUCCESS
-- ============================================================================

-- Check user verification status
SELECT 'Checking user verification status...' as test_step;
SELECT 
    username,
    verification_status,
    verified_at,
    expires_at,
    updated_at
FROM users 
WHERE username = 'testuser_omni';

-- Check user OMNI balance after purchase
SELECT 'Checking OMNI balance after purchase...' as test_step;
SELECT 
    username,
    current_balance,
    total_omni_spent,
    updated_at
FROM user_rewards 
WHERE username = 'testuser_omni';

-- Check transaction log
SELECT 'Checking transaction log...' as test_step;
SELECT 
    username,
    transaction_type,
    amount,
    description,
    reference_type,
    created_at
FROM reward_transactions 
WHERE username = 'testuser_omni'
ORDER BY created_at DESC;

-- ============================================================================
-- 5. TEST PURCHASE WITH INSUFFICIENT BALANCE
-- ============================================================================

-- Create user with insufficient balance
INSERT INTO users (id, username, email, verification_status, created_at, updated_at)
VALUES (
    '22222222-2222-2222-2222-222222222222',
    'testuser_poor',
    'poor@example.com',
    'not_verified',
    NOW(),
    NOW()
) ON CONFLICT (id) DO UPDATE SET
    username = EXCLUDED.username,
    email = EXCLUDED.email,
    verification_status = EXCLUDED.verification_status,
    updated_at = NOW();

INSERT INTO user_rewards (username, current_balance, total_omni_earned, total_omni_spent, created_at, updated_at)
VALUES (
    'testuser_poor',
    500,  -- Not enough for verification
    1000,
    500,
    NOW(),
    NOW()
) ON CONFLICT (username) DO UPDATE SET
    current_balance = EXCLUDED.current_balance,
    total_omni_earned = EXCLUDED.total_omni_earned,
    total_omni_spent = EXCLUDED.total_omni_spent,
    updated_at = NOW();

-- Test affordability check for poor user
SELECT 'Testing affordability check for poor user...' as test_step;
SELECT can_afford_verification('testuser_poor', 1000) as poor_affordability;

-- Test purchase with insufficient balance
SELECT 'Testing purchase with insufficient balance...' as test_step;
SELECT purchase_verification_with_omni(
    '22222222-2222-2222-2222-222222222222',
    'testuser_poor',
    1000
) as poor_purchase_result;

-- ============================================================================
-- 6. TEST BULK EXPIRATION
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

-- Test bulk expiration function
SELECT 'Testing bulk expiration...' as test_step;
SELECT expire_verifications_bulk() as expired_count;

-- Check if expired user was updated
SELECT 'Checking expired user status...' as test_step;
SELECT 
    username,
    verification_status,
    verified_at,
    expires_at,
    updated_at
FROM users 
WHERE username = 'testuser_expired';

-- ============================================================================
-- 7. TEST VERIFICATION STATISTICS
-- ============================================================================

-- Get verification statistics
SELECT 'Getting verification statistics...' as test_step;
SELECT get_verification_stats() as stats;

-- ============================================================================
-- 8. TEST CRON JOB SETUP
-- ============================================================================

-- Test cron job setup
SELECT 'Testing cron job setup...' as test_step;
SELECT setup_verification_expiration_cron() as cron_setup_result;

-- Check if cron job exists
SELECT 'Checking cron job status...' as test_step;
SELECT 
    jobname,
    schedule,
    command,
    active,
    jobid
FROM cron.job 
WHERE jobname = 'expire-verifications';

-- ============================================================================
-- 9. CLEANUP TEST DATA
-- ============================================================================

-- Clean up test data
SELECT 'Cleaning up test data...' as test_step;

-- Delete test users
DELETE FROM users WHERE username IN ('testuser_omni', 'testuser_poor', 'testuser_expired');

-- Delete test rewards
DELETE FROM user_rewards WHERE username IN ('testuser_omni', 'testuser_poor', 'testuser_expired');

-- Delete test transactions
DELETE FROM reward_transactions WHERE username IN ('testuser_omni', 'testuser_poor', 'testuser_expired');

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
    'purchase_verification_with_omni',
    'can_afford_verification',
    'expire_verifications_bulk',
    'cleanup_expired_omni_verifications',
    'setup_verification_expiration_cron',
    'get_verification_stats'
)
ORDER BY proname;

-- Check permissions
SELECT 'Checking function permissions...' as test_step;
SELECT 
    routine_name,
    grantee,
    privilege_type
FROM information_schema.routine_privileges 
WHERE routine_name IN (
    'purchase_verification_with_omni',
    'can_afford_verification',
    'expire_verifications_bulk',
    'cleanup_expired_omni_verifications',
    'setup_verification_expiration_cron',
    'get_verification_stats'
)
AND grantee = 'authenticated'
ORDER BY routine_name, privilege_type;

