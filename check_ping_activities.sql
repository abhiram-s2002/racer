-- ============================================================================
-- PING-BASED ACTIVITIES DIAGNOSTIC
-- ============================================================================
-- This script checks the ping system which is used for activities in your app

-- ============================================================================
-- 1. CHECK PINGS TABLE STRUCTURE AND DATA
-- ============================================================================

SELECT 
    'Pings Table Structure' as test_category,
    column_name,
    data_type,
    is_nullable,
    CASE 
        WHEN column_name = 'id' AND data_type = 'uuid' THEN '✅ Correct'
        WHEN column_name = 'sender_username' AND data_type = 'text' THEN '✅ Correct'
        WHEN column_name = 'receiver_username' AND data_type = 'text' THEN '✅ Correct'
        WHEN column_name = 'listing_id' AND data_type = 'uuid' THEN '✅ Correct'
        WHEN column_name = 'status' AND data_type = 'text' THEN '✅ Correct'
        WHEN column_name = 'message' AND data_type = 'text' THEN '✅ Correct'
        WHEN column_name = 'created_at' AND data_type = 'timestamp with time zone' THEN '✅ Correct'
        ELSE '⚠️ Check needed'
    END as status
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'pings'
ORDER BY ordinal_position;

-- ============================================================================
-- 2. CHECK PINGS DATA COUNTS
-- ============================================================================

SELECT 
    'Pings Data Count' as test_category,
    'Total Pings' as metric,
    COUNT(*) as count,
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ Pings exist'
        ELSE '❌ No pings found'
    END as status
FROM pings;

SELECT 
    'Pings Data Count' as test_category,
    'Pending Pings' as metric,
    COUNT(*) as count,
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ Pending pings exist'
        ELSE '❌ No pending pings'
    END as status
FROM pings 
WHERE status = 'pending';

SELECT 
    'Pings Data Count' as test_category,
    'Accepted Pings' as metric,
    COUNT(*) as count,
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ Accepted pings exist'
        ELSE '❌ No accepted pings'
    END as status
FROM pings 
WHERE status = 'accepted';

SELECT 
    'Pings Data Count' as test_category,
    'Rejected Pings' as metric,
    COUNT(*) as count,
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ Rejected pings exist'
        ELSE '❌ No rejected pings'
    END as status
FROM pings 
WHERE status = 'rejected';

-- ============================================================================
-- 3. CHECK RECENT PINGS (LAST 7 DAYS)
-- ============================================================================

SELECT 
    'Recent Pings (Last 7 Days)' as test_category,
    'Recent Pings' as metric,
    COUNT(*) as count,
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ Recent pings found'
        ELSE '❌ No recent pings'
    END as status
FROM pings 
WHERE created_at > NOW() - INTERVAL '7 days';

-- ============================================================================
-- 4. CHECK PING FUNCTIONS
-- ============================================================================

SELECT 
    'Ping Functions Check' as test_category,
    routine_name as function_name,
    CASE 
        WHEN routine_name = 'create_ping_with_limits' THEN '✅ Ping creation function'
        WHEN routine_name = 'get_activities_with_listings' THEN '✅ Activities function'
        WHEN routine_name = 'get_batch_ping_statuses' THEN '✅ Ping status function'
        WHEN routine_name = 'increment_listing_pings' THEN '✅ Ping count function'
        ELSE '⚠️ Other function'
    END as status
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND (routine_name LIKE '%ping%' OR routine_name LIKE '%activit%')
ORDER BY routine_name;

-- ============================================================================
-- 5. SAMPLE PING DATA
-- ============================================================================

SELECT 
    'Sample Ping Data' as test_category,
    id,
    sender_username,
    receiver_username,
    status,
    message,
    created_at
FROM pings 
ORDER BY created_at DESC 
LIMIT 5;

-- ============================================================================
-- 6. CHECK PING ACTIVITIES BY USER
-- ============================================================================

SELECT 
    'Ping Activities by User' as test_category,
    sender_username as username,
    'Sent Pings' as activity_type,
    COUNT(*) as count
FROM pings 
GROUP BY sender_username
ORDER BY count DESC
LIMIT 5;

SELECT 
    'Ping Activities by User' as test_category,
    receiver_username as username,
    'Received Pings' as activity_type,
    COUNT(*) as count
FROM pings 
GROUP BY receiver_username
ORDER BY count DESC
LIMIT 5;

-- ============================================================================
-- 7. CHECK PINGS WITH LISTINGS
-- ============================================================================

SELECT 
    'Pings with Listings' as test_category,
    COUNT(*) as total_pings,
    COUNT(CASE WHEN l.id IS NOT NULL THEN 1 END) as pings_with_valid_listings,
    COUNT(CASE WHEN l.id IS NULL THEN 1 END) as pings_with_missing_listings
FROM pings p
LEFT JOIN listings l ON p.listing_id = l.id;

-- ============================================================================
-- 8. CHECK ACTIVITIES TABLE (IF IT EXISTS)
-- ============================================================================

SELECT 
    'Activities Table Check' as test_category,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'activities') 
        THEN '✅ Activities table exists'
        ELSE '❌ Activities table missing'
    END as table_exists,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'activities') 
        THEN (SELECT COUNT(*) FROM activities)
        ELSE 0
    END as activity_count;

-- ============================================================================
-- 9. FINAL SUMMARY
-- ============================================================================

SELECT 
    'FINAL PING ACTIVITIES SUMMARY' as test_category,
    'Overall Status' as summary_type,
    CASE 
        WHEN EXISTS (SELECT 1 FROM pings) 
        THEN '✅ Ping activities present in database'
        ELSE '❌ No ping activities found in database'
    END as overall_status;
