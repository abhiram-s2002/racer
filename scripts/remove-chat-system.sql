-- ============================================================================
-- COMPLETE CHAT SYSTEM REMOVAL
-- ============================================================================
-- This script removes all chat-related tables, functions, and references
-- since the app now uses WhatsApp for messaging
-- SAFE TO RUN MULTIPLE TIMES
-- ============================================================================

-- 1. DROP ALL CHAT-RELATED FUNCTIONS
DROP FUNCTION IF EXISTS get_total_chat_count(TEXT);
DROP FUNCTION IF EXISTS get_recent_chats_for_user(TEXT, INTEGER);
DROP FUNCTION IF EXISTS get_chats_for_user(TEXT);
DROP FUNCTION IF EXISTS get_user_chats_with_requests(TEXT);
DROP FUNCTION IF EXISTS create_chat_from_ping(UUID, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS get_or_create_chat(UUID, TEXT, TEXT);
DROP FUNCTION IF EXISTS get_chat_messages(UUID);
DROP FUNCTION IF EXISTS send_chat_message(UUID, TEXT, TEXT);
DROP FUNCTION IF EXISTS update_chat_status(UUID, TEXT);
DROP FUNCTION IF EXISTS get_chat_with_user(TEXT, TEXT);
DROP FUNCTION IF EXISTS create_chat(UUID, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS send_message(UUID, TEXT, TEXT);

-- 2. DROP ALL CHAT-RELATED TABLES AND CASCADE
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS chats CASCADE;

-- 3. DROP CHAT-RELATED MATERIALIZED VIEWS
DROP MATERIALIZED VIEW IF EXISTS user_chat_summary CASCADE;

-- 4. DROP CHAT-RELATED INDEXES
DROP INDEX IF EXISTS idx_chats_participant_a;
DROP INDEX IF EXISTS idx_chats_participant_b;
DROP INDEX IF EXISTS idx_chats_listing;
DROP INDEX IF EXISTS idx_chats_participant_a_updated;
DROP INDEX IF EXISTS idx_chats_participant_b_updated;
DROP INDEX IF EXISTS idx_chats_updated_at;
DROP INDEX IF EXISTS idx_messages_chat_id;
DROP INDEX IF EXISTS idx_messages_sender;
DROP INDEX IF EXISTS idx_messages_created_at;
DROP INDEX IF EXISTS idx_messages_chat_sender_read;
DROP INDEX IF EXISTS idx_messages_chat_created;

-- 5. REMOVE CHAT-RELATED COLUMNS FROM USERS TABLE
ALTER TABLE users DROP COLUMN IF EXISTS notification_new_messages;

-- 6. DROP CHAT-RELATED RLS POLICIES (if any exist)
DROP POLICY IF EXISTS "Users can view chats they participate in" ON public.chats;
DROP POLICY IF EXISTS "Users can create chats" ON public.chats;
DROP POLICY IF EXISTS "Users can view their own messages" ON public.messages;
DROP POLICY IF EXISTS "Users can create messages in their chats" ON public.messages;

-- 7. CLEAN UP ANY REMAINING CHAT REFERENCES IN OTHER TABLES
-- Remove any foreign key references or triggers that might reference chats/messages

-- Success message
SELECT '✅ Chat System Completely Removed!' as status;
SELECT '📱 App now uses WhatsApp for all messaging' as result;
SELECT '🗑️ Removed: tables, functions, indexes, policies, and columns' as cleanup;
SELECT '💾 Database is now cleaner and more focused' as benefit;
