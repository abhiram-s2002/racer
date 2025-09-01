-- Test script to check if the can_rate_user function can execute properly
-- Run this in your Supabase SQL editor to see what's happening

-- First, check if the user_ratings table exists
SELECT 
    table_name,
    table_schema
FROM information_schema.tables 
WHERE table_name = 'user_ratings';

-- Check if there are any pings in the database
SELECT COUNT(*) as total_pings FROM pings;

-- Check if there are any pings with 'accepted' or 'rejected' status
SELECT 
    status,
    COUNT(*) as count
FROM pings 
GROUP BY status;

-- Try to call the function with actual data from your database
-- Replace 'your_username_here' with an actual username from your users table
SELECT * FROM can_rate_user('your_username_here', 'another_username_here');

-- Check for any active queries that might be calling can_rate_user
SELECT 
    query,
    state,
    backend_start
FROM pg_stat_activity 
WHERE state = 'active' 
AND query LIKE '%can_rate_user%';

-- Test the function with a simple case
-- This should return false and empty array for same username
SELECT * FROM can_rate_user('test_user', 'test_user');

-- Check if the function has any syntax errors by looking at its definition
SELECT 
    pg_get_functiondef(oid) as function_definition
FROM pg_proc 
WHERE proname = 'can_rate_user' 
AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
