-- Test Script for Referral Commission System
-- Run this in your Supabase SQL Editor to test the 10% commission system

-- Step 1: Create test users (if they don't exist)
-- Note: Replace with actual usernames from your system
-- INSERT INTO users (username, email, name) VALUES 
--   ('test_referrer', 'referrer@test.com', 'Test Referrer'),
--   ('test_referred', 'referred@test.com', 'Test Referred')
-- ON CONFLICT (username) DO NOTHING;

-- Step 2: Create a test referral
INSERT INTO referrals (
    referrer_username, 
    referred_username, 
    referral_code, 
    status, 
    commission_rate
) VALUES (
    'test_referrer',  -- Replace with actual referrer username
    'test_referred',  -- Replace with actual referred username
    'TEST-REF-CODE',
    'completed',
    0.10
) ON CONFLICT (referred_username) DO NOTHING;

-- Step 3: Create test reward transactions for the referred user
-- This will trigger the commission system automatically
INSERT INTO reward_transactions (
    username,
    transaction_type,
    amount,
    description,
    reference_type
) VALUES 
    ('test_referred', 'daily_checkin', 10, 'Daily check-in reward', 'checkin'),
    ('test_referred', 'achievement', 50, 'Achievement completion', 'achievement'),
    ('test_referred', 'bonus', 100, 'Welcome bonus', 'bonus')
ON CONFLICT DO NOTHING;

-- Step 4: Check the results
-- View all commission records
SELECT 
    rc.*,
    rt.description as source_description
FROM referral_commissions rc
JOIN reward_transactions rt ON rc.source_transaction_id = rt.id
ORDER BY rc.created_at DESC;

-- View total commissions earned by referrer
SELECT 
    username,
    SUM(amount) as total_commissions
FROM reward_transactions 
WHERE transaction_type = 'referral_commission' 
    AND username = 'test_referrer'
GROUP BY username;

-- View referral summary with commission totals
SELECT 
    r.*,
    COUNT(rc.id) as total_commission_transactions,
    COALESCE(SUM(rc.commission_amount), 0) as total_commissions_earned
FROM referrals r
LEFT JOIN referral_commissions rc ON r.id = rc.referral_id
WHERE r.referrer_username = 'test_referrer'
GROUP BY r.id, r.referrer_username, r.referred_username, r.referral_code, r.status, r.commission_rate, r.total_commission_earned, r.completed_at, r.created_at;
