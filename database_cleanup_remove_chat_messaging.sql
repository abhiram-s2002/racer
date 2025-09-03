-- ============================================================================
-- DATABASE CLEANUP: Remove Chat and Messaging System
-- ============================================================================
-- This script removes all chat and messaging related tables, functions, and data
-- Run this script in your Supabase SQL editor to clean up the database

-- ============================================================================
-- 1. DROP FUNCTIONS FIRST (to avoid dependency issues)
-- ============================================================================

-- Drop chat-related functions
DROP FUNCTION IF EXISTS get_chats_for_user(text);
DROP FUNCTION IF EXISTS create_chat_from_ping(uuid);
DROP FUNCTION IF EXISTS get_or_create_chat(uuid, text, text);
DROP FUNCTION IF EXISTS get_chat_messages(uuid);
DROP FUNCTION IF EXISTS send_chat_message(uuid, text, text);
DROP FUNCTION IF EXISTS create_listing_with_expiration(text, text, text, numeric, text, text[], text[], numeric, numeric, integer);

-- ============================================================================
-- 2. DROP TRIGGERS
-- ============================================================================

-- Drop any triggers related to chats/messages
DROP TRIGGER IF EXISTS trigger_set_listing_expiration ON listings;

-- ============================================================================
-- 3. DROP TABLES (in reverse dependency order)
-- ============================================================================

-- Drop messages table first (has foreign key to chats)
DROP TABLE IF EXISTS messages CASCADE;

-- Drop chats table
DROP TABLE IF EXISTS chats CASCADE;

-- Drop any other chat-related tables
DROP TABLE IF EXISTS chat_participants CASCADE;
DROP TABLE IF EXISTS message_reads CASCADE;
DROP TABLE IF EXISTS chat_settings CASCADE;

-- ============================================================================
-- 4. REMOVE CHAT-RELATED COLUMNS FROM EXISTING TABLES
-- ============================================================================

-- Remove chat_id column from pings table if it exists
ALTER TABLE pings DROP COLUMN IF EXISTS chat_id;

-- Remove any other chat-related columns from other tables
ALTER TABLE listings DROP COLUMN IF EXISTS chat_enabled;
ALTER TABLE users DROP COLUMN IF EXISTS chat_preferences;

-- ============================================================================
-- 5. DROP INDEXES (if they exist)
-- ============================================================================

-- Drop any indexes related to chats/messages
DROP INDEX IF EXISTS idx_messages_chat_id;
DROP INDEX IF EXISTS idx_messages_created_at;
DROP INDEX IF EXISTS idx_chats_participant_a;
DROP INDEX IF EXISTS idx_chats_participant_b;
DROP INDEX IF EXISTS idx_chats_listing_id;
DROP INDEX IF EXISTS idx_chats_updated_at;

-- ============================================================================
-- 6. DROP RLS POLICIES (if they exist)
-- ============================================================================

-- Drop RLS policies for chats table
DROP POLICY IF EXISTS "Users can view their own chats" ON chats;
DROP POLICY IF EXISTS "Users can create chats" ON chats;
DROP POLICY IF EXISTS "Users can update their own chats" ON chats;
DROP POLICY IF EXISTS "Users can delete their own chats" ON chats;

-- Drop RLS policies for messages table
DROP POLICY IF EXISTS "Users can view messages in their chats" ON messages;
DROP POLICY IF EXISTS "Users can send messages in their chats" ON messages;
DROP POLICY IF EXISTS "Users can update their own messages" ON messages;
DROP POLICY IF EXISTS "Users can delete their own messages" ON messages;

-- ============================================================================
-- 7. DROP EXTENSIONS (if they were added specifically for chat)
-- ============================================================================

-- Only drop if you're sure they're not used elsewhere
-- DROP EXTENSION IF EXISTS "uuid-ossp";

-- ============================================================================
-- 8. CLEAN UP ANY REMAINING REFERENCES
-- ============================================================================

-- Update any tables that might reference chat functionality
-- (Add any specific cleanup for your app here)

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Run these queries to verify cleanup was successful:

-- Check if chat tables still exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('chats', 'messages', 'chat_participants', 'message_reads', 'chat_settings');

-- Check if chat functions still exist
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN (
    'get_chats_for_user', 
    'create_chat_from_ping', 
    'get_or_create_chat', 
    'get_chat_messages', 
    'send_chat_message'
);

-- Check remaining tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- ============================================================================
-- NOTES
-- ============================================================================

/*
IMPORTANT NOTES:

1. BACKUP FIRST: Always backup your database before running this script
2. TEST ENVIRONMENT: Test this script in a development environment first
3. DEPENDENCIES: This script removes all chat/messaging functionality
4. IRREVERSIBLE: This action cannot be undone easily
5. APP UPDATES: Make sure your app code no longer references these tables

WHAT THIS SCRIPT REMOVES:
- All chat and message tables
- All chat-related functions
- All chat-related triggers
- All chat-related indexes
- All chat-related RLS policies
- Chat-related columns from other tables

WHAT REMAINS:
- User profiles and authentication
- Listings and requests
- Pings and activities
- All other app functionality

After running this script, your database will be clean of all chat/messaging
functionality, and you can rely entirely on WhatsApp for communication.
*/
