-- Quick ping activities check for @cgrr
-- This checks the ping system which is used for activities

-- 1. Check if pings table has data
SELECT 
    'Pings Table' as table_name,
    COUNT(*) as total_count,
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ Has pings'
        ELSE '❌ Empty'
    END as status
FROM pings;

-- 2. Check ping statuses
SELECT 
    'Ping Statuses' as test_name,
    status,
    COUNT(*) as count
FROM pings 
GROUP BY status
ORDER BY count DESC;

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

-- 4. Check if any users have sent/received pings
SELECT 
    'Users with Ping Activity' as test_name,
    COUNT(DISTINCT sender_username) as users_who_sent,
    COUNT(DISTINCT receiver_username) as users_who_received
FROM pings;
