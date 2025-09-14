-- Test OMNI Verification Purchase Functionality
-- Run this in Supabase SQL Editor to test the new functionality

-- ============================================================================
-- TEST SETUP
-- ============================================================================

-- Create a test user (if not exists)
INSERT INTO users (id, username, email, name, created_at, updated_at)
VALUES (
  'test-user-omni-verification',
  'test_omni_user',
  'test_omni@example.com',
  'Test OMNI User',
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Create user rewards record with 1500 OMNI (enough for verification)
INSERT INTO user_rewards (username, current_balance, total_omni_earned, total_omni_spent, created_at, updated_at)
VALUES (
  'test_omni_user',
  1500,
  1500,
  0,
  NOW(),
  NOW()
) ON CONFLICT (username) DO UPDATE SET
  current_balance = 1500,
  total_omni_earned = 1500,
  total_omni_spent = 0;

-- ============================================================================
-- TEST 1: Check Affordability
-- ============================================================================

SELECT 'TEST 1: Check Affordability' as test_name;

SELECT can_afford_verification('test_omni_user', 1000) as affordability_result;

-- Expected: {"can_afford": true, "current_balance": 1500, "required_balance": 1000, "shortfall": 0}

-- ============================================================================
-- TEST 2: Purchase Verification with OMNI
-- ============================================================================

SELECT 'TEST 2: Purchase Verification' as test_name;

SELECT purchase_verification_with_omni(
  'test-user-omni-verification'::uuid,
  'test_omni_user',
  1000
) as purchase_result;

-- Expected: Success with verification_expires_at set to 1 month from now

-- ============================================================================
-- TEST 3: Verify User Status
-- ============================================================================

SELECT 'TEST 3: Verify User Status' as test_name;

SELECT 
  username,
  verification_status,
  verified_at,
  expires_at,
  is_user_verified(id) as is_currently_verified
FROM users 
WHERE username = 'test_omni_user';

-- Expected: verification_status = 'verified', verified_at = now(), expires_at = now() + 1 month

-- ============================================================================
-- TEST 4: Check Updated OMNI Balance
-- ============================================================================

SELECT 'TEST 4: Check Updated Balance' as test_name;

SELECT 
  username,
  current_balance,
  total_omni_earned,
  total_omni_spent
FROM user_rewards 
WHERE username = 'test_omni_user';

-- Expected: current_balance = 500, total_omni_spent = 1000

-- ============================================================================
-- TEST 5: Check Transaction Record
-- ============================================================================

SELECT 'TEST 5: Check Transaction Record' as test_name;

SELECT 
  username,
  transaction_type,
  amount,
  description,
  reference_type,
  created_at
FROM reward_transactions 
WHERE username = 'test_omni_user' 
ORDER BY created_at DESC 
LIMIT 1;

-- Expected: transaction_type = 'spent', amount = 1000, description = 'Verification purchase (1 month)'

-- ============================================================================
-- TEST 6: Test Insufficient Balance
-- ============================================================================

SELECT 'TEST 6: Test Insufficient Balance' as test_name;

-- Try to purchase with insufficient balance
SELECT purchase_verification_with_omni(
  'test-user-omni-verification'::uuid,
  'test_omni_user',
  1000
) as insufficient_balance_result;

-- Expected: Error - insufficient balance

-- ============================================================================
-- CLEANUP
-- ============================================================================

-- Uncomment to clean up test data
-- DELETE FROM reward_transactions WHERE username = 'test_omni_user';
-- DELETE FROM user_rewards WHERE username = 'test_omni_user';
-- DELETE FROM users WHERE username = 'test_omni_user';

SELECT 'All tests completed!' as final_status;
