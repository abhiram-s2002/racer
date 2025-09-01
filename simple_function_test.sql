-- Simple test to identify the issue with can_rate_user function
-- Run this in your Supabase SQL editor

-- 1. Check if user_ratings table exists
SELECT 'user_ratings table exists' as status, COUNT(*) as count 
FROM information_schema.tables 
WHERE table_name = 'user_ratings';

-- 2. Check if there are any pings
SELECT 'pings count' as status, COUNT(*) as count FROM pings;

-- 3. Check ping statuses
SELECT 'ping statuses' as status, status, COUNT(*) as count 
FROM pings 
GROUP BY status;

-- 4. Test the function with same username (should return false)
SELECT 'same username test' as status, * FROM can_rate_user('test', 'test');

-- 5. Test with actual usernames from your database
-- Replace these with actual usernames from your users table
SELECT 'actual usernames test' as status, * FROM can_rate_user('gsgsh', 'another_user');

-- 6. Check function definition for syntax errors
SELECT 'function definition' as status, 
       pg_get_functiondef(oid) as definition
FROM pg_proc 
WHERE proname = 'can_rate_user' 
AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
