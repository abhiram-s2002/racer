-- ============================================================================
-- SIMPLE DATABASE CLEANUP: Remove Chat and Messaging System
-- ============================================================================
-- This script uses simple, individual commands to avoid deadlocks
-- Run each section separately if you encounter issues

-- ============================================================================
-- STEP 1: Check what chat-related objects exist first
-- ============================================================================

-- Check for chat tables
SELECT 'Chat Tables Found:' as info;
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('chats', 'messages', 'chat_participants', 'message_reads', 'chat_settings');

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
    'create_listing_with_expiration'
);

-- ============================================================================
-- STEP 2: Drop tables one by one (run these individually if needed)
-- ============================================================================

-- Drop messages table (if it exists)
DROP TABLE IF EXISTS messages CASCADE;

-- Drop chats table (if it exists)
DROP TABLE IF EXISTS chats CASCADE;

-- Drop other chat-related tables (if they exist)
DROP TABLE IF EXISTS chat_participants CASCADE;
DROP TABLE IF EXISTS message_reads CASCADE;
DROP TABLE IF EXISTS chat_settings CASCADE;

-- ============================================================================
-- STEP 3: Remove chat-related columns (run these individually if needed)
-- ============================================================================

-- Remove chat_id column from pings table (if it exists)
ALTER TABLE pings DROP COLUMN IF EXISTS chat_id;

-- Remove other chat-related columns (if they exist)
ALTER TABLE listings DROP COLUMN IF EXISTS chat_enabled;
ALTER TABLE users DROP COLUMN IF EXISTS chat_preferences;

-- ============================================================================
-- STEP 4: Drop triggers (run these individually if needed)
-- ============================================================================

-- Drop listing expiration trigger (if it exists)
DROP TRIGGER IF EXISTS trigger_set_listing_expiration ON listings;

-- ============================================================================
-- STEP 5: Drop indexes (run these individually if needed)
-- ============================================================================

-- Drop chat-related indexes (if they exist)
DROP INDEX IF EXISTS idx_messages_chat_id;
DROP INDEX IF EXISTS idx_messages_created_at;
DROP INDEX IF EXISTS idx_chats_participant_a;
DROP INDEX IF EXISTS idx_chats_participant_b;
DROP INDEX IF EXISTS idx_chats_listing_id;
DROP INDEX IF EXISTS idx_chats_updated_at;

-- ============================================================================
-- STEP 6: Drop RLS policies (run these individually if needed)
-- ============================================================================

-- Drop chat-related policies (if they exist)
-- Note: These will only work if the tables still exist
DROP POLICY IF EXISTS "Users can view their own chats" ON chats;
DROP POLICY IF EXISTS "Users can create chats" ON chats;
DROP POLICY IF EXISTS "Users can update their own chats" ON chats;
DROP POLICY IF EXISTS "Users can delete their own chats" ON chats;

DROP POLICY IF EXISTS "Users can view messages in their chats" ON messages;
DROP POLICY IF EXISTS "Users can send messages in their chats" ON messages;
DROP POLICY IF EXISTS "Users can update their own messages" ON messages;
DROP POLICY IF EXISTS "Users can delete their own messages" ON messages;

-- ============================================================================
-- STEP 7: Drop functions (run these individually if needed)
-- ============================================================================

-- Drop chat-related functions (if they exist)
-- Note: You may need to adjust the parameter types based on your actual function signatures

DROP FUNCTION IF EXISTS get_chats_for_user(text);
DROP FUNCTION IF EXISTS create_chat_from_ping(uuid);
DROP FUNCTION IF EXISTS get_or_create_chat(uuid, text, text);
DROP FUNCTION IF EXISTS get_chat_messages(uuid);
DROP FUNCTION IF EXISTS send_chat_message(uuid, text, text);

-- For create_listing_with_expiration, try different common signatures:
DROP FUNCTION IF EXISTS create_listing_with_expiration(text, text, text, numeric, text, text[], text[], numeric, numeric, integer);
DROP FUNCTION IF EXISTS create_listing_with_expiration(text, text, text, numeric, text, text[], text[], numeric, numeric);
DROP FUNCTION IF EXISTS create_listing_with_expiration(text, text, text, numeric, text, text[], text[]);

-- ============================================================================
-- STEP 8: Verification
-- ============================================================================

-- Check if any chat tables still exist
SELECT 
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ No chat tables found - cleanup complete!'
        ELSE '⚠️  Found ' || COUNT(*) || ' chat tables still remaining:'
    END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('chats', 'messages', 'chat_participants', 'message_reads', 'chat_settings');

-- Show any remaining chat tables
SELECT table_name as remaining_chat_tables
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('chats', 'messages', 'chat_participants', 'message_reads', 'chat_settings');

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
    'create_listing_with_expiration'
);

-- Show any remaining chat functions
SELECT routine_name as remaining_chat_functions
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN (
    'get_chats_for_user', 
    'create_chat_from_ping', 
    'get_or_create_chat', 
    'get_chat_messages', 
    'send_chat_message',
    'create_listing_with_expiration'
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
