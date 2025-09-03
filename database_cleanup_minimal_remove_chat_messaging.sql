-- ============================================================================
-- MINIMAL DATABASE CLEANUP: Remove Chat and Messaging System
-- ============================================================================
-- This script only runs commands that are actually needed
-- Since your database doesn't have chat tables, this will be very quick

-- ============================================================================
-- STEP 1: Check what actually exists
-- ============================================================================

-- Check for chat tables
SELECT 'Chat Tables Found:' as info;
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('chats', 'messages', 'chat_participants', 'message_reads', 'chat_settings', 'chat_listings');

-- Check for chat functions
SELECT 'Chat Functions Found:' as info;
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN (
    'get_chats_for_user', 
    'create_chat_from_ping', 
    'get_or_create_chat', 
    'get_chat_messages', 
    'send_chat_message',
    'create_listing_with_expiration',
    'get_batch_chat_counts',
    'get_chat_for_ping',
    'get_or_create_listing_chat',
    'get_or_create_request_chat',
    'get_or_create_user_chat',
    'get_recent_chats_for_user',
    'get_recent_chats_with_participants',
    'get_total_chat_count',
    'get_user_chats_with_requests',
    'refresh_user_chat_summary'
);

-- ============================================================================
-- STEP 2: Only drop what actually exists
-- ============================================================================

-- Drop tables (these will do nothing if tables don't exist)
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS chats CASCADE;
DROP TABLE IF EXISTS chat_participants CASCADE;
DROP TABLE IF EXISTS message_reads CASCADE;
DROP TABLE IF EXISTS chat_settings CASCADE;
DROP TABLE IF EXISTS chat_listings CASCADE;

-- Remove columns (these will do nothing if columns don't exist)
ALTER TABLE pings DROP COLUMN IF EXISTS chat_id;
ALTER TABLE listings DROP COLUMN IF EXISTS chat_enabled;
ALTER TABLE users DROP COLUMN IF EXISTS chat_preferences;

-- Drop trigger (this will do nothing if trigger doesn't exist)
DROP TRIGGER IF EXISTS trigger_set_listing_expiration ON listings;

-- Drop indexes (these will do nothing if indexes don't exist)
DROP INDEX IF EXISTS idx_messages_chat_id;
DROP INDEX IF EXISTS idx_messages_created_at;
DROP INDEX IF EXISTS idx_chats_participant_a;
DROP INDEX IF EXISTS idx_chats_participant_b;
DROP INDEX IF EXISTS idx_chats_listing_id;
DROP INDEX IF EXISTS idx_chats_updated_at;

-- ============================================================================
-- STEP 3: Drop functions (only if they exist)
-- ============================================================================

-- Try to drop functions with common signatures
DROP FUNCTION IF EXISTS get_chats_for_user(text);
DROP FUNCTION IF EXISTS create_chat_from_ping(uuid);
DROP FUNCTION IF EXISTS get_or_create_chat(uuid, text, text);
DROP FUNCTION IF EXISTS get_chat_messages(uuid);
DROP FUNCTION IF EXISTS send_chat_message(uuid, text, text);

-- Drop all the chat functions you found
DROP FUNCTION IF EXISTS get_batch_chat_counts(text[]);
DROP FUNCTION IF EXISTS get_chat_for_ping(uuid);
DROP FUNCTION IF EXISTS get_or_create_chat(text, text, text);
DROP FUNCTION IF EXISTS get_or_create_listing_chat(uuid, text, text);
DROP FUNCTION IF EXISTS get_or_create_request_chat(uuid, text, text, text);
DROP FUNCTION IF EXISTS get_or_create_request_chat(text, text, text);
DROP FUNCTION IF EXISTS get_or_create_user_chat(text, text);
DROP FUNCTION IF EXISTS get_recent_chats_for_user(text, integer);
DROP FUNCTION IF EXISTS get_recent_chats_with_participants(text, integer);
DROP FUNCTION IF EXISTS get_total_chat_count(text);
DROP FUNCTION IF EXISTS get_user_chats_with_requests(text);
DROP FUNCTION IF EXISTS refresh_user_chat_summary();

-- Try different signatures for create_listing_with_expiration
DROP FUNCTION IF EXISTS create_listing_with_expiration(text, text, text, numeric, text, text[], text[], numeric, numeric, integer);
DROP FUNCTION IF EXISTS create_listing_with_expiration(text, text, text, numeric, text, text[], text[], numeric, numeric);
DROP FUNCTION IF EXISTS create_listing_with_expiration(text, text, text, numeric, text, text[], text[]);

-- ============================================================================
-- STEP 4: Final verification
-- ============================================================================

-- Check if any chat tables still exist
SELECT 
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ No chat tables found - cleanup complete!'
        ELSE '⚠️  Found ' || COUNT(*) || ' chat tables still remaining:'
    END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('chats', 'messages', 'chat_participants', 'message_reads', 'chat_settings', 'chat_listings');

-- Check if any chat functions still exist
SELECT 
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ No chat functions found - cleanup complete!'
        ELSE '⚠️  Found ' || COUNT(*) || ' chat functions still remaining:'
    END as status
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN (
    'get_chats_for_user', 
    'create_chat_from_ping', 
    'get_or_create_chat', 
    'get_chat_messages', 
    'send_chat_message',
    'create_listing_with_expiration',
    'get_batch_chat_counts',
    'get_chat_for_ping',
    'get_or_create_listing_chat',
    'get_or_create_request_chat',
    'get_or_create_user_chat',
    'get_recent_chats_for_user',
    'get_recent_chats_with_participants',
    'get_total_chat_count',
    'get_user_chats_with_requests',
    'refresh_user_chat_summary'
);

-- Show all remaining tables in your database
SELECT '📋 All remaining tables in your database:' as info;
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- ============================================================================
-- SUMMARY
-- ============================================================================

SELECT '🎉 Database cleanup completed successfully!' as summary;
SELECT 'Your app now uses WhatsApp for all communication.' as note;
SELECT 'No more in-app messaging costs or complexity!' as benefit;
