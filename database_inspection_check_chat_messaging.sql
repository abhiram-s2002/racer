-- ============================================================================
-- DATABASE INSPECTION: Check for Chat and Messaging Objects
-- ============================================================================
-- This script thoroughly checks your database for any chat/messaging related objects
-- Run this to see exactly what exists before cleanup

-- ============================================================================
-- 1. CHECK FOR CHAT/MESSAGE TABLES
-- ============================================================================

SELECT '🔍 CHECKING FOR CHAT/MESSAGE TABLES:' as section;

-- Check for exact table names
SELECT 
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ No chat/message tables found'
        ELSE '⚠️  Found ' || COUNT(*) || ' chat/message tables:'
    END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
    'chats', 'messages', 'chat_participants', 'message_reads', 
    'chat_settings', 'chat_listings', 'conversations', 'threads', 'discussions'
);

-- Show any chat/message tables found
SELECT table_name as chat_message_tables
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
    'chats', 'messages', 'chat_participants', 'message_reads', 
    'chat_settings', 'chat_listings', 'conversations', 'threads', 'discussions'
);

-- Check for tables with 'chat' or 'message' in the name
SELECT 'Tables containing "chat" or "message":' as info;
SELECT table_name
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND (table_name ILIKE '%chat%' OR table_name ILIKE '%message%')
ORDER BY table_name;

-- ============================================================================
-- 2. CHECK FOR CHAT/MESSAGE FUNCTIONS
-- ============================================================================

SELECT '🔍 CHECKING FOR CHAT/MESSAGE FUNCTIONS:' as section;

-- Check for exact function names
SELECT 
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ No chat/message functions found'
        ELSE '⚠️  Found ' || COUNT(*) || ' chat/message functions:'
    END as status
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN (
    'get_chats_for_user', 'create_chat_from_ping', 'get_or_create_chat', 
    'get_chat_messages', 'send_chat_message', 'create_listing_with_expiration',
    'create_chat', 'delete_chat', 'update_chat', 'get_messages',
    'send_message', 'delete_message', 'update_message',
    'get_batch_chat_counts', 'get_chat_for_ping', 'get_or_create_listing_chat',
    'get_or_create_request_chat', 'get_or_create_user_chat', 'get_recent_chats_for_user',
    'get_recent_chats_with_participants', 'get_total_chat_count', 'get_user_chats_with_requests',
    'refresh_user_chat_summary'
);

-- Show any chat/message functions found
SELECT routine_name as chat_message_functions
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN (
    'get_chats_for_user', 'create_chat_from_ping', 'get_or_create_chat', 
    'get_chat_messages', 'send_chat_message', 'create_listing_with_expiration',
    'create_chat', 'delete_chat', 'update_chat', 'get_messages',
    'send_message', 'delete_message', 'update_message',
    'get_batch_chat_counts', 'get_chat_for_ping', 'get_or_create_listing_chat',
    'get_or_create_request_chat', 'get_or_create_user_chat', 'get_recent_chats_for_user',
    'get_recent_chats_with_participants', 'get_total_chat_count', 'get_user_chats_with_requests',
    'refresh_user_chat_summary'
);

-- Check for functions with 'chat' or 'message' in the name
SELECT 'Functions containing "chat" or "message":' as info;
SELECT routine_name
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND (routine_name ILIKE '%chat%' OR routine_name ILIKE '%message%')
ORDER BY routine_name;

-- ============================================================================
-- 3. CHECK FOR CHAT/MESSAGE TRIGGERS
-- ============================================================================

SELECT '🔍 CHECKING FOR CHAT/MESSAGE TRIGGERS:' as section;

-- Check for triggers with 'chat' or 'message' in the name
SELECT 
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ No chat/message triggers found'
        ELSE '⚠️  Found ' || COUNT(*) || ' chat/message triggers:'
    END as status
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'public'
AND (t.tgname ILIKE '%chat%' OR t.tgname ILIKE '%message%');

-- Show any chat/message triggers found
SELECT 
    t.tgname as trigger_name,
    c.relname as table_name
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'public'
AND (t.tgname ILIKE '%chat%' OR t.tgname ILIKE '%message%')
ORDER BY t.tgname;

-- ============================================================================
-- 4. CHECK FOR CHAT/MESSAGE INDEXES
-- ============================================================================

SELECT '🔍 CHECKING FOR CHAT/MESSAGE INDEXES:' as section;

-- Check for indexes with 'chat' or 'message' in the name
SELECT 
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ No chat/message indexes found'
        ELSE '⚠️  Found ' || COUNT(*) || ' chat/message indexes:'
    END as status
FROM pg_indexes 
WHERE schemaname = 'public'
AND (indexname ILIKE '%chat%' OR indexname ILIKE '%message%');

-- Show any chat/message indexes found
SELECT 
    indexname,
    tablename
FROM pg_indexes 
WHERE schemaname = 'public'
AND (indexname ILIKE '%chat%' OR indexname ILIKE '%message%')
ORDER BY indexname;

-- ============================================================================
-- 5. CHECK FOR CHAT/MESSAGE COLUMNS
-- ============================================================================

SELECT '🔍 CHECKING FOR CHAT/MESSAGE COLUMNS:' as section;

-- Check for columns with 'chat' or 'message' in the name
SELECT 
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ No chat/message columns found'
        ELSE '⚠️  Found ' || COUNT(*) || ' chat/message columns:'
    END as status
FROM information_schema.columns 
WHERE table_schema = 'public'
AND (column_name ILIKE '%chat%' OR column_name ILIKE '%message%');

-- Show any chat/message columns found
SELECT 
    table_name,
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_schema = 'public'
AND (column_name ILIKE '%chat%' OR column_name ILIKE '%message%')
ORDER BY table_name, column_name;

-- ============================================================================
-- 6. CHECK FOR CHAT/MESSAGE RLS POLICIES
-- ============================================================================

SELECT '🔍 CHECKING FOR CHAT/MESSAGE RLS POLICIES:' as section;

-- Check for policies with 'chat' or 'message' in the name
SELECT 
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ No chat/message RLS policies found'
        ELSE '⚠️  Found ' || COUNT(*) || ' chat/message RLS policies:'
    END as status
FROM pg_policies 
WHERE schemaname = 'public'
AND (policyname ILIKE '%chat%' OR policyname ILIKE '%message%');

-- Show any chat/message policies found
SELECT 
    schemaname,
    tablename,
    policyname
FROM pg_policies 
WHERE schemaname = 'public'
AND (policyname ILIKE '%chat%' OR policyname ILIKE '%message%')
ORDER BY tablename, policyname;

-- ============================================================================
-- 7. CHECK FOR CHAT/MESSAGE VIEWS
-- ============================================================================

SELECT '🔍 CHECKING FOR CHAT/MESSAGE VIEWS:' as section;

-- Check for views with 'chat' or 'message' in the name
SELECT 
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ No chat/message views found'
        ELSE '⚠️  Found ' || COUNT(*) || ' chat/message views:'
    END as status
FROM information_schema.views 
WHERE table_schema = 'public'
AND (table_name ILIKE '%chat%' OR table_name ILIKE '%message%');

-- Show any chat/message views found
SELECT table_name as chat_message_views
FROM information_schema.views 
WHERE table_schema = 'public'
AND (table_name ILIKE '%chat%' OR table_name ILIKE '%message%')
ORDER BY table_name;

-- ============================================================================
-- 8. SUMMARY OF ALL TABLES IN YOUR DATABASE
-- ============================================================================

SELECT '📋 ALL TABLES IN YOUR DATABASE:' as section;
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- ============================================================================
-- 9. SUMMARY OF ALL FUNCTIONS IN YOUR DATABASE
-- ============================================================================

SELECT '📋 ALL FUNCTIONS IN YOUR DATABASE:' as section;
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
ORDER BY routine_name;

-- ============================================================================
-- FINAL SUMMARY
-- ============================================================================

SELECT '🎯 INSPECTION COMPLETE!' as summary;
SELECT 'Review the results above to see if any chat/messaging objects exist.' as note;
SELECT 'If no chat/messaging objects are found, your database is already clean!' as result;
