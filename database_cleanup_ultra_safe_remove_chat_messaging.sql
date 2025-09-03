-- ============================================================================
-- ULTRA SAFE DATABASE CLEANUP: Remove Chat and Messaging System
-- ============================================================================
-- This script safely removes chat and messaging related tables, functions, and data
-- It uses dynamic SQL to handle any function signatures gracefully
-- Run this script in your Supabase SQL editor to clean up the database

-- ============================================================================
-- 1. DROP FUNCTIONS FIRST (to avoid dependency issues)
-- ============================================================================

-- Drop chat-related functions dynamically
DO $$ 
DECLARE
    func_record RECORD;
BEGIN
    -- Drop all functions with chat-related names
    FOR func_record IN 
        SELECT proname, pg_get_function_identity_arguments(oid) as args
        FROM pg_proc 
        WHERE proname IN (
            'get_chats_for_user', 
            'create_chat_from_ping', 
            'get_or_create_chat', 
            'get_chat_messages', 
            'send_chat_message',
            'create_listing_with_expiration'
        )
    LOOP
        EXECUTE 'DROP FUNCTION ' || func_record.proname || '(' || func_record.args || ')';
        RAISE NOTICE 'Dropped function: %(%)', func_record.proname, func_record.args;
    END LOOP;
END $$;

-- ============================================================================
-- 2. DROP TRIGGERS (only if they exist)
-- ============================================================================

DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_set_listing_expiration') THEN
        DROP TRIGGER trigger_set_listing_expiration ON listings;
        RAISE NOTICE 'Dropped trigger: trigger_set_listing_expiration';
    END IF;
END $$;

-- ============================================================================
-- 3. DROP TABLES (only if they exist)
-- ============================================================================

DO $$ 
BEGIN
    -- Drop messages table first (has foreign key to chats)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'messages' AND table_schema = 'public') THEN
        DROP TABLE messages CASCADE;
        RAISE NOTICE 'Dropped table: messages';
    END IF;
    
    -- Drop chats table
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'chats' AND table_schema = 'public') THEN
        DROP TABLE chats CASCADE;
        RAISE NOTICE 'Dropped table: chats';
    END IF;
    
    -- Drop other chat-related tables
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'chat_participants' AND table_schema = 'public') THEN
        DROP TABLE chat_participants CASCADE;
        RAISE NOTICE 'Dropped table: chat_participants';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'message_reads' AND table_schema = 'public') THEN
        DROP TABLE message_reads CASCADE;
        RAISE NOTICE 'Dropped table: message_reads';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'chat_settings' AND table_schema = 'public') THEN
        DROP TABLE chat_settings CASCADE;
        RAISE NOTICE 'Dropped table: chat_settings';
    END IF;
END $$;

-- ============================================================================
-- 4. REMOVE CHAT-RELATED COLUMNS FROM EXISTING TABLES
-- ============================================================================

DO $$ 
BEGIN
    -- Remove chat_id column from pings table if it exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pings' AND column_name = 'chat_id' AND table_schema = 'public') THEN
        ALTER TABLE pings DROP COLUMN chat_id;
        RAISE NOTICE 'Dropped column: pings.chat_id';
    END IF;
    
    -- Remove other chat-related columns
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'listings' AND column_name = 'chat_enabled' AND table_schema = 'public') THEN
        ALTER TABLE listings DROP COLUMN chat_enabled;
        RAISE NOTICE 'Dropped column: listings.chat_enabled';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'chat_preferences' AND table_schema = 'public') THEN
        ALTER TABLE users DROP COLUMN chat_preferences;
        RAISE NOTICE 'Dropped column: users.chat_preferences';
    END IF;
END $$;

-- ============================================================================
-- 5. DROP INDEXES (only if they exist)
-- ============================================================================

DO $$ 
DECLARE
    index_record RECORD;
BEGIN
    -- Drop all chat-related indexes dynamically
    FOR index_record IN 
        SELECT indexname
        FROM pg_indexes 
        WHERE indexname IN (
            'idx_messages_chat_id',
            'idx_messages_created_at',
            'idx_chats_participant_a',
            'idx_chats_participant_b',
            'idx_chats_listing_id',
            'idx_chats_updated_at'
        )
    LOOP
        EXECUTE 'DROP INDEX ' || index_record.indexname;
        RAISE NOTICE 'Dropped index: %', index_record.indexname;
    END LOOP;
END $$;

-- ============================================================================
-- 6. DROP RLS POLICIES (only if they exist)
-- ============================================================================

DO $$ 
DECLARE
    policy_record RECORD;
BEGIN
    -- Drop all chat-related policies dynamically
    FOR policy_record IN 
        SELECT schemaname, tablename, policyname
        FROM pg_policies 
        WHERE tablename IN ('chats', 'messages')
        AND policyname IN (
            'Users can view their own chats',
            'Users can create chats',
            'Users can update their own chats',
            'Users can delete their own chats',
            'Users can view messages in their chats',
            'Users can send messages in their chats',
            'Users can update their own messages',
            'Users can delete their own messages'
        )
    LOOP
        EXECUTE 'DROP POLICY "' || policy_record.policyname || '" ON ' || policy_record.schemaname || '.' || policy_record.tablename;
        RAISE NOTICE 'Dropped policy: % on %.%', policy_record.policyname, policy_record.schemaname, policy_record.tablename;
    END LOOP;
END $$;

-- ============================================================================
-- VERIFICATION QUERIES
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
