-- ============================================================================
-- COMPREHENSIVE ACTIVITY DIAGNOSTIC
-- ============================================================================
-- This script checks all activity-related tables and data in the database

-- ============================================================================
-- 1. CHECK ACTIVITY-RELATED TABLES EXISTENCE
-- ============================================================================

SELECT 
    'Table Existence Check' as test_category,
    table_name,
    CASE 
        WHEN table_name = 'activities' THEN '✅ Activities table'
        WHEN table_name = 'pings' THEN '✅ Pings table'
        WHEN table_name = 'requests' THEN '✅ Requests table'
        WHEN table_name = 'chats' THEN '✅ Chats table'
        WHEN table_name = 'messages' THEN '✅ Messages table'
        ELSE '⚠️ Other table'
    END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('activities', 'pings', 'requests', 'chats', 'messages')
ORDER BY table_name;

-- ============================================================================
-- 2. CHECK DATA COUNTS IN EACH TABLE
-- ============================================================================

-- Activities count
SELECT 
    'Data Count Check' as test_category,
    'Activities' as table_name,
    COUNT(*) as total_count,
    COUNT(CASE WHEN is_active = true THEN 1 END) as active_count,
    COUNT(CASE WHEN type = 'listing' THEN 1 END) as listing_activities,
    COUNT(CASE WHEN type = 'received_ping' THEN 1 END) as received_ping_activities,
    COUNT(CASE WHEN type = 'sent_ping' THEN 1 END) as sent_ping_activities
FROM activities;

-- Pings count
SELECT 
    'Data Count Check' as test_category,
    'Pings' as table_name,
    COUNT(*) as total_count,
    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_pings,
    COUNT(CASE WHEN status = 'accepted' THEN 1 END) as accepted_pings,
    COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected_pings
FROM pings;

-- Requests count
SELECT 
    'Data Count Check' as test_category,
    'Requests' as table_name,
    COUNT(*) as total_count,
    COUNT(CASE WHEN expires_at > NOW() THEN 1 END) as active_requests,
    COUNT(CASE WHEN expires_at <= NOW() THEN 1 END) as expired_requests
FROM requests;

-- Chats count
SELECT 
    'Data Count Check' as test_category,
    'Chats' as table_name,
    COUNT(*) as total_count,
    COUNT(CASE WHEN status = 'active' THEN 1 END) as active_chats,
    COUNT(CASE WHEN status = 'archived' THEN 1 END) as archived_chats
FROM chats;

-- Messages count
SELECT 
    'Data Count Check' as test_category,
    'Messages' as table_name,
    COUNT(*) as total_count,
    COUNT(CASE WHEN status = 'sent' THEN 1 END) as sent_messages,
    COUNT(CASE WHEN status = 'delivered' THEN 1 END) as delivered_messages,
    COUNT(CASE WHEN status = 'read' THEN 1 END) as read_messages
FROM messages;

-- ============================================================================
-- 3. CHECK RECENT ACTIVITIES (LAST 7 DAYS)
-- ============================================================================

SELECT 
    'Recent Activities (Last 7 Days)' as test_category,
    'Activities' as table_name,
    COUNT(*) as count,
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ Recent activities found'
        ELSE '❌ No recent activities'
    END as status
FROM activities 
WHERE created_at > NOW() - INTERVAL '7 days';

SELECT 
    'Recent Activities (Last 7 Days)' as test_category,
    'Pings' as table_name,
    COUNT(*) as count,
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ Recent pings found'
        ELSE '❌ No recent pings'
    END as status
FROM pings 
WHERE created_at > NOW() - INTERVAL '7 days';

-- ============================================================================
-- 4. CHECK SAMPLE DATA FROM EACH TABLE
-- ============================================================================

-- Sample activities
SELECT 
    'Sample Activities' as test_category,
    id,
    username,
    type,
    title,
    status,
    created_at
FROM activities 
ORDER BY created_at DESC 
LIMIT 5;

-- Sample pings
SELECT 
    'Sample Pings' as test_category,
    id,
    sender_username,
    receiver_username,
    status,
    created_at
FROM pings 
ORDER BY created_at DESC 
LIMIT 5;

-- Sample requests
SELECT 
    'Sample Requests' as test_category,
    id,
    username,
    title,
    category,
    expires_at,
    created_at
FROM requests 
ORDER BY created_at DESC 
LIMIT 5;

-- ============================================================================
-- 5. CHECK FOR USERS WITH ACTIVITIES
-- ============================================================================

SELECT 
    'Users with Activities' as test_category,
    COUNT(DISTINCT username) as users_with_activities,
    COUNT(DISTINCT sender_username) as users_who_sent_pings,
    COUNT(DISTINCT receiver_username) as users_who_received_pings
FROM (
    SELECT username FROM activities
    UNION ALL
    SELECT sender_username FROM pings
    UNION ALL
    SELECT receiver_username FROM pings
) as all_users;

-- ============================================================================
-- 6. CHECK ACTIVITY FUNCTIONS
-- ============================================================================

SELECT 
    'Activity Functions Check' as test_category,
    routine_name as function_name,
    CASE 
        WHEN routine_name = 'get_activities_with_listings' THEN '✅ Main activities function'
        WHEN routine_name = 'get_batch_ping_statuses' THEN '✅ Ping status function'
        WHEN routine_name = 'get_requests_hierarchical' THEN '✅ Requests function'
        ELSE '⚠️ Other function'
    END as status
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name LIKE '%activit%' OR routine_name LIKE '%ping%' OR routine_name LIKE '%request%'
ORDER BY routine_name;

-- ============================================================================
-- 7. FINAL SUMMARY
-- ============================================================================

SELECT 
    'FINAL ACTIVITY SUMMARY' as test_category,
    'Overall Status' as summary_type,
    CASE 
        WHEN EXISTS (SELECT 1 FROM activities) OR EXISTS (SELECT 1 FROM pings) OR EXISTS (SELECT 1 FROM requests)
        THEN '✅ Activities present in database'
        ELSE '❌ No activities found in database'
    END as overall_status;
