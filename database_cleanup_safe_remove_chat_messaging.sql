-- ============================================================================
-- SAFE DATABASE CLEANUP: Remove Chat and Messaging System
-- ============================================================================
-- This script safely removes chat and messaging related tables, functions, and data
-- It checks for existence before attempting to drop anything
-- Run this script in your Supabase SQL editor to clean up the database

-- ============================================================================
-- 1. DROP FUNCTIONS FIRST (to avoid dependency issues)
-- ============================================================================

-- Drop chat-related functions (only if they exist)
DO $$ 
BEGIN
    -- Drop functions one by one with existence checks
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_chats_for_user') THEN
        DROP FUNCTION get_chats_for_user(text);
        RAISE NOTICE 'Dropped function: get_chats_for_user';
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'create_chat_from_ping') THEN
        DROP FUNCTION create_chat_from_ping(uuid);
        RAISE NOTICE 'Dropped function: create_chat_from_ping';
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_or_create_chat') THEN
        DROP FUNCTION get_or_create_chat(uuid, text, text);
        RAISE NOTICE 'Dropped function: get_or_create_chat';
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_chat_messages') THEN
        DROP FUNCTION get_chat_messages(uuid);
        RAISE NOTICE 'Dropped function: get_chat_messages';
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'send_chat_message') THEN
        DROP FUNCTION send_chat_message(uuid, text, text);
        RAISE NOTICE 'Dropped function: send_chat_message';
    END IF;
    
    -- Drop create_listing_with_expiration function with any signature
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'create_listing_with_expiration') THEN
        -- Get all function signatures and drop them
        FOR rec IN 
            SELECT pg_get_function_identity_arguments(oid) as args
            FROM pg_proc 
            WHERE proname = 'create_listing_with_expiration'
        LOOP
            EXECUTE 'DROP FUNCTION create_listing_with_expiration(' || rec.args || ')';
            RAISE NOTICE 'Dropped function: create_listing_with_expiration(%)', rec.args;
        END LOOP;
    END IF;
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
BEGIN
    -- Drop indexes one by one
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_messages_chat_id') THEN
        DROP INDEX idx_messages_chat_id;
        RAISE NOTICE 'Dropped index: idx_messages_chat_id';
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_messages_created_at') THEN
        DROP INDEX idx_messages_created_at;
        RAISE NOTICE 'Dropped index: idx_messages_created_at';
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_chats_participant_a') THEN
        DROP INDEX idx_chats_participant_a;
        RAISE NOTICE 'Dropped index: idx_chats_participant_a';
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_chats_participant_b') THEN
        DROP INDEX idx_chats_participant_b;
        RAISE NOTICE 'Dropped index: idx_chats_participant_b';
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_chats_listing_id') THEN
        DROP INDEX idx_chats_listing_id;
        RAISE NOTICE 'Dropped index: idx_chats_listing_id';
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_chats_updated_at') THEN
        DROP INDEX idx_chats_updated_at;
        RAISE NOTICE 'Dropped index: idx_chats_updated_at';
    END IF;
END $$;

-- ============================================================================
-- 6. DROP RLS POLICIES (only if they exist)
-- ============================================================================

DO $$ 
BEGIN
    -- Drop RLS policies for chats table (only if table exists)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'chats' AND table_schema = 'public') THEN
        IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'chats' AND policyname = 'Users can view their own chats') THEN
            DROP POLICY "Users can view their own chats" ON chats;
            RAISE NOTICE 'Dropped policy: Users can view their own chats';
        END IF;
        
        IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'chats' AND policyname = 'Users can create chats') THEN
            DROP POLICY "Users can create chats" ON chats;
            RAISE NOTICE 'Dropped policy: Users can create chats';
        END IF;
        
        IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'chats' AND policyname = 'Users can update their own chats') THEN
            DROP POLICY "Users can update their own chats" ON chats;
            RAISE NOTICE 'Dropped policy: Users can update their own chats';
        END IF;
        
        IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'chats' AND policyname = 'Users can delete their own chats') THEN
            DROP POLICY "Users can delete their own chats" ON chats;
            RAISE NOTICE 'Dropped policy: Users can delete their own chats';
        END IF;
    END IF;
    
    -- Drop RLS policies for messages table (only if table exists)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'messages' AND table_schema = 'public') THEN
        IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'messages' AND policyname = 'Users can view messages in their chats') THEN
            DROP POLICY "Users can view messages in their chats" ON messages;
            RAISE NOTICE 'Dropped policy: Users can view messages in their chats';
        END IF;
        
        IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'messages' AND policyname = 'Users can send messages in their chats') THEN
            DROP POLICY "Users can send messages in their chats" ON messages;
            RAISE NOTICE 'Dropped policy: Users can send messages in their chats';
        END IF;
        
        IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'messages' AND policyname = 'Users can update their own messages') THEN
            DROP POLICY "Users can update their own messages" ON messages;
            RAISE NOTICE 'Dropped policy: Users can update their own messages';
        END IF;
        
        IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'messages' AND policyname = 'Users can delete their own messages') THEN
            DROP POLICY "Users can delete their own messages" ON messages;
            RAISE NOTICE 'Dropped policy: Users can delete their own messages';
        END IF;
    END IF;
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
    'send_chat_message'
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
    'send_chat_message'
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
