-- Test script to check the can_rate_user function signature
-- Run this in your Supabase SQL editor to see what parameters the function expects

-- Check if the function exists
SELECT 
    routine_name,
    routine_type,
    data_type
FROM information_schema.routines 
WHERE routine_name = 'can_rate_user';

-- Check the function parameters
SELECT 
    specific_name, 
    parameter_name, 
    parameter_mode, 
    data_type,
    ordinal_position
FROM information_schema.parameters 
WHERE specific_name LIKE '%can_rate_user%'
ORDER BY ordinal_position;

-- Test the function with sample data
-- This should work if the function is properly defined
SELECT * FROM can_rate_user('test_user1', 'test_user2');

-- Check for any duplicate function definitions
SELECT 
    n.nspname as schema_name,
    p.proname as function_name,
    pg_get_function_arguments(p.oid) as arguments
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname = 'can_rate_user';
