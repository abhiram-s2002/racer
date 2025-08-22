-- Create test referral codes for testing
-- Run this in your Supabase SQL editor

-- First, let's see what users exist
SELECT username FROM users LIMIT 5;

-- Create test referral codes for existing users
-- Replace 'test_user1', 'test_user2' with actual usernames from your users table

INSERT INTO user_referral_codes (username, referral_code, total_referrals, total_earnings, is_active)
VALUES 
  ('test_referrer', 'OMNI-TEST_REFERRER-F4734', 0, 0, true),
  ('test_referred', 'OMNI-TEST_REFERRED-703F0', 0, 0, true),
  ('admin', 'OMNI-ADMIN-12345', 0, 0, true),
  ('demo_user', 'OMNI-DEMO-67890', 0, 0, true);

-- Verify the codes were created
SELECT * FROM user_referral_codes WHERE is_active = true;

-- Also check if there are any existing codes
SELECT COUNT(*) as total_codes FROM user_referral_codes;
SELECT COUNT(*) as active_codes FROM user_referral_codes WHERE is_active = true;

