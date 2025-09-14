-- Quick activity check for @cgrr
-- Run this to see if there are any activities in the database

-- 1. Check if activity tables exist and have data
SELECT 
    'Activities Table' as table_name,
    COUNT(*) as total_count,
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ Has data'
        ELSE '❌ Empty'
    END as status
FROM activities;

SELECT 
    'Pings Table' as table_name,
    COUNT(*) as total_count,
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ Has data'
        ELSE '❌ Empty'
    END as status
FROM pings;

SELECT 
    'Requests Table' as table_name,
    COUNT(*) as total_count,
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ Has data'
        ELSE '❌ Empty'
    END as status
FROM requests;

-- 2. Show recent activities (last 3)
SELECT 
    'Recent Activities' as test_name,
    id,
    username,
    type,
    title,
    created_at
FROM activities 
ORDER BY created_at DESC 
LIMIT 3;

-- 3. Show recent pings (last 3)
SELECT 
    'Recent Pings' as test_name,
    id,
    sender_username,
    receiver_username,
    status,
    created_at
FROM pings 
ORDER BY created_at DESC 
LIMIT 3;

-- 4. Check if any users have activities
SELECT 
    'Users with Activities' as test_name,
    COUNT(DISTINCT username) as users_with_activities
FROM activities;
