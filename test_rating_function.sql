-- Test script for rating system functions
-- Run this after the migration to verify everything works

-- Test 1: Check if function exists
SELECT 
    specific_name, 
    parameter_name, 
    parameter_mode, 
    data_type
FROM information_schema.parameters 
WHERE specific_name LIKE '%can_rate_user%'
ORDER BY ordinal_position;

-- Test 2: Check if table exists
SELECT 
    table_name, 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'user_ratings'
ORDER BY ordinal_position;

-- Test 2b: Simple table existence check
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_name = 'user_ratings'
) as table_exists;

-- Test 3: Test the function with sample data (if you have users)
-- Replace 'user1' and 'user2' with actual usernames from your database
-- SELECT * FROM can_rate_user('user1', 'user2');

-- Test 3b: Check if functions exist in routines table
SELECT 
    routine_name, 
    routine_type,
    security_type
FROM information_schema.routines 
WHERE routine_name IN ('can_rate_user', 'get_user_rating_stats');

-- Test 4: Verify RLS policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'user_ratings';

-- Test 5: Test the function directly with sample data
-- This will help identify if the function itself works
-- Replace 'test_user1' and 'test_user2' with actual usernames from your database

-- Test 5a: Check if we have any users to test with
SELECT username FROM users LIMIT 5;

-- Test 5b: Test the function with actual usernames (uncomment and modify)
-- SELECT * FROM can_rate_user('test_user1', 'test_user2');

-- Test 5c: Check if there are any pings to test with
SELECT 
    sender_username, 
    receiver_username, 
    status, 
    created_at 
FROM pings 
WHERE status IN ('accepted', 'rejected')
LIMIT 5;

-- Test 6: Check what pings exist for specific users
-- Replace 'aabhi' with your actual username to see your ping history
SELECT 
    sender_username,
    receiver_username,
    status,
    created_at,
    CASE 
        WHEN created_at > NOW() - INTERVAL '90 days' THEN 'Recent'
        ELSE 'Old'
    END as age_status
FROM pings 
WHERE sender_username = 'aabhi' OR receiver_username = 'aabhi'
ORDER BY created_at DESC
LIMIT 10;

-- Test 7: Check if there are any completed interactions for rating
SELECT 
    sender_username,
    receiver_username,
    status,
    created_at
FROM pings 
WHERE (sender_username = 'aabhi' OR receiver_username = 'aabhi')
AND status IN ('accepted', 'rejected')
AND created_at > NOW() - INTERVAL '90 days'
ORDER BY created_at DESC;
