-- ============================================================================
-- PING STATUS UPDATE FIXES
-- ============================================================================
-- 
-- This file fixes several critical issues with ping status management:
-- 
-- 1. Missing ping status update in create_chat_from_ping function
-- 2. Interfering increment_ping_count trigger function
-- 3. Adds debug function for troubleshooting
-- 4. FIXES RLS POLICY ISSUE - receivers can now update ping status
-- 5. FIXES UNIQUE CONSTRAINT ISSUE - allows multiple pings per listing
-- 6. RATING SYSTEM: Added missing can_rate_user function for the rating system
-- 
-- Run this SQL script in your Supabase database to fix the ping acceptance issues.
-- ============================================================================

-- CRITICAL FIX: Remove the problematic unique constraint that prevents multiple pings
-- This constraint was preventing status updates and multiple pings to the same listing
ALTER TABLE pings DROP CONSTRAINT IF EXISTS pings_sender_username_listing_id_status_key;

-- CRITICAL FIX: Update RLS policy to allow both sender and receiver to update ping status
-- The previous policy only allowed senders to update, preventing receivers from accepting/rejecting
DROP POLICY IF EXISTS "Users can update pings they sent or received" ON public.pings;

CREATE POLICY "Users can update pings they sent or received" ON public.pings
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND (username = sender_username OR username = receiver_username)
        )
    );

-- Fix for missing ping status update in create_chat_from_ping function
-- This function was missing the crucial ping status update that marks pings as accepted

CREATE OR REPLACE FUNCTION create_chat_from_ping(ping_id uuid)
RETURNS text AS $$
DECLARE
    ping_record RECORD;
    existing_chat_id uuid;
    new_chat_id uuid;
BEGIN
    -- Get ping details
    SELECT * INTO ping_record
    FROM pings
    WHERE id = ping_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Ping not found';
    END IF;
    
    -- Check if chat already exists between these two users (regardless of listing)
    SELECT id INTO existing_chat_id
    FROM chats
    WHERE (
        (participant_a = ping_record.sender_username AND participant_b = ping_record.receiver_username)
        OR (participant_a = ping_record.receiver_username AND participant_b = ping_record.sender_username)
    );
    
    -- If chat exists, return existing chat ID and add listing reference
    IF existing_chat_id IS NOT NULL THEN
        -- Add listing reference if not already present
        INSERT INTO chat_listings (chat_id, listing_id)
        VALUES (existing_chat_id, ping_record.listing_id)
        ON CONFLICT (chat_id, listing_id) DO NOTHING;
        
        -- Update the existing chat with the ping message
        UPDATE chats 
        SET 
            last_message = ping_record.message,
            last_sender = ping_record.sender_username,
            updated_at = NOW()
        WHERE id = existing_chat_id;
        
        -- Add the ping message to the chat
        INSERT INTO messages (chat_id, sender_username, text)
        VALUES (existing_chat_id, ping_record.sender_username, ping_record.message);
        
        -- Update ping status to accepted (since chat is created)
        UPDATE pings 
        SET status = 'accepted', responded_at = NOW()
        WHERE id = ping_id;
        
        RETURN existing_chat_id::text;
    END IF;
    
    -- Create new chat (without listing_id)
    INSERT INTO chats (participant_a, participant_b, last_message, last_sender)
    VALUES (ping_record.sender_username, ping_record.receiver_username, ping_record.message, ping_record.sender_username)
    RETURNING id INTO new_chat_id;
    
    -- Add listing reference
    INSERT INTO chat_listings (chat_id, listing_id)
    VALUES (new_chat_id, ping_record.listing_id);
    
    -- Add the ping message to the new chat
    INSERT INTO messages (chat_id, sender_username, text)
    VALUES (new_chat_id, ping_record.sender_username, ping_record.message);
    
    -- Update ping status to accepted (since chat is created)
    UPDATE pings 
    SET status = 'accepted', responded_at = NOW()
    WHERE id = ping_id;
    
    RETURN new_chat_id::text;
END;
$$ LANGUAGE plpgsql;

-- Fix for increment_ping_count function that might be interfering
-- This function should only increment count for NEW pings, not interfere with existing ones
CREATE OR REPLACE FUNCTION increment_ping_count()
RETURNS TRIGGER AS $$
BEGIN
    -- Only increment ping count for NEW pings (NEW.id will be different from existing ones)
    -- Don't interfere with pings that are being updated (like status changes)
    IF TG_OP = 'INSERT' THEN
        -- Increment ping count for existing ping with same sender/listing and pending status
        UPDATE pings 
        SET ping_count = ping_count + 1,
            last_ping_at = NOW()
        WHERE sender_username = NEW.sender_username 
        AND listing_id = NEW.listing_id 
        AND status = 'pending'
        AND id != NEW.id;  -- Don't update the newly inserted ping itself
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Debug function to check ping status
CREATE OR REPLACE FUNCTION debug_ping_status(ping_id_param uuid)
RETURNS TABLE(
    ping_id uuid,
    current_status text,
    created_at timestamp with time zone,
    responded_at timestamp with time zone,
    chat_exists boolean,
    chat_id uuid
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id as ping_id,
        p.status as current_status,
        p.created_at,
        p.responded_at,
        CASE WHEN c.id IS NOT NULL THEN true ELSE false END as chat_exists,
        c.id as chat_id
    FROM pings p
    LEFT JOIN chats c ON (
        (c.participant_a = p.sender_username AND c.participant_b = p.receiver_username)
        OR (c.participant_a = p.receiver_username AND c.participant_b = p.sender_username)
    )
    WHERE p.id = ping_id_param;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- USAGE INSTRUCTIONS
-- ============================================================================
-- 
-- After running this script, you can debug ping status issues using:
-- 
-- SELECT * FROM debug_ping_status('your-ping-id-here');
-- 
-- This will show you:
-- - Current ping status
-- - When the ping was created
-- - When it was responded to (if accepted/rejected)
-- - Whether a chat exists for this ping
-- - The chat ID if it exists
-- 
-- Example:
-- SELECT * FROM debug_ping_status('0b86de97-182d-449b-884f-4c14696effdd');
-- ============================================================================

-- ============================================================================
-- WHAT THIS SCRIPT FIXES:
-- ============================================================================
-- 
-- 1. RLS POLICY ISSUE: Previously only senders could update ping status,
--    now both senders and receivers can update (allowing acceptance/rejection)
-- 
-- 2. UNIQUE CONSTRAINT ISSUE: Removed the constraint that prevented multiple
--    pings to the same listing, which was interfering with status updates
-- 
-- 3. TRIGGER INTERFERENCE: Fixed the increment_ping_count function to not
--    interfere with status updates
-- 
-- 4. STATUS UPDATE: Ensured create_chat_from_ping properly updates ping status
-- 
-- 5. RATING SYSTEM: Added missing can_rate_user function for the rating system
-- 
-- ============================================================================

-- ============================================================================
-- RATING SYSTEM FIX
-- ============================================================================
-- 
-- The can_rate_user function is missing from the database, causing rating errors
-- This section adds the missing function with correct parameters
-- 

-- Drop existing function to avoid conflicts
DROP FUNCTION IF EXISTS can_rate_user(text, text);
DROP FUNCTION IF EXISTS can_rate_user(text, text, text);
DROP FUNCTION IF EXISTS can_rate_user(text, text, text, text);

-- Create the can_rate_user function with correct parameters
CREATE OR REPLACE FUNCTION can_rate_user(
    rater_username_param text,
    rated_username_param text
)
RETURNS TABLE(
    can_rate boolean,
    pending_pings jsonb
) AS $$
DECLARE
    eligible_pings jsonb;
BEGIN
    -- Users cannot rate themselves
    IF rater_username_param = rated_username_param THEN
        RETURN QUERY SELECT false, '[]'::jsonb;
        RETURN;
    END IF;
    
    -- Get pings where the rater can rate the rated user
    -- User can rate if they have completed ping interactions
    SELECT jsonb_agg(
        jsonb_build_object(
            'ping_id', p.id,
            'listing_id', p.listing_id,
            'status', p.status,
            'created_at', p.created_at,
            'message', p.message
        )
    ) INTO eligible_pings
    FROM pings p
    WHERE (
        -- Rater sent a ping to rated user
        (p.sender_username = rater_username_param AND p.receiver_username = rated_username_param)
        OR
        -- Rater received a ping from rated user
        (p.sender_username = rated_username_param AND p.receiver_username = rater_username_param)
    )
    AND p.status IN ('accepted', 'rejected') -- Only completed interactions
    AND p.created_at > NOW() - INTERVAL '90 days' -- Recent interactions only
    AND NOT EXISTS (
        -- Check if rating already exists for this ping
        SELECT 1 FROM user_ratings ur 
        WHERE ur.ping_id = p.id 
        AND ur.rater_username = rater_username_param
    );
    
    -- Return whether user can rate and the list of eligible pings
    RETURN QUERY SELECT 
        COALESCE(eligible_pings IS NOT NULL AND jsonb_array_length(eligible_pings) > 0, false),
        COALESCE(eligible_pings, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions on the function
GRANT EXECUTE ON FUNCTION can_rate_user(text, text) TO authenticated;

-- Create user_ratings table if it doesn't exist
CREATE TABLE IF NOT EXISTS user_ratings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    rater_username text NOT NULL REFERENCES users(username) ON DELETE CASCADE,
    rated_username text NOT NULL REFERENCES users(username) ON DELETE CASCADE,
    ping_id uuid NOT NULL REFERENCES pings(id) ON DELETE CASCADE,
    rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
    review_text text,
    category text NOT NULL DEFAULT 'general' CHECK (category IN ('general', 'communication', 'reliability', 'quality', 'speed')),
    created_at timestamp with time zone DEFAULT timezone('utc', now()),
    updated_at timestamp with time zone DEFAULT timezone('utc', now()),
    
    -- Ensure one rating per user per ping (prevents duplicate ratings for same interaction)
    UNIQUE(rater_username, ping_id),
    
    -- Ensure users cannot rate themselves
    CHECK (rater_username != rated_username)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_ratings_rater ON user_ratings(rater_username);
CREATE INDEX IF NOT EXISTS idx_user_ratings_rated ON user_ratings(rated_username);
CREATE INDEX IF NOT EXISTS idx_user_ratings_ping ON user_ratings(ping_id);
CREATE INDEX IF NOT EXISTS idx_user_ratings_created ON user_ratings(created_at DESC);

-- Enable RLS on user_ratings table
ALTER TABLE user_ratings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user_ratings
DROP POLICY IF EXISTS "Users can view their own ratings" ON user_ratings;
CREATE POLICY "Users can view their own ratings" ON user_ratings
    FOR SELECT USING (
        rater_username = current_setting('request.jwt.claims')::json->>'username'
        OR 
        rated_username = current_setting('request.jwt.claims')::json->>'username'
    );

DROP POLICY IF EXISTS "Users can insert ratings" ON user_ratings;
CREATE POLICY "Users can insert ratings" ON user_ratings
    FOR INSERT WITH CHECK (
        rater_username = current_setting('request.jwt.claims')::json->>'username'
    );

DROP POLICY IF EXISTS "Users can update their own ratings" ON user_ratings;
CREATE POLICY "Users can update their own ratings" ON user_ratings
    FOR UPDATE USING (
        rater_username = current_setting('request.jwt.claims')::json->>'username'
    );

DROP POLICY IF EXISTS "Users can delete their own ratings" ON user_ratings;
CREATE POLICY "Users can delete their own ratings" ON user_ratings
    FOR DELETE USING (
        rater_username = current_setting('request.jwt.claims')::json->>'username'
    );

-- Grant permissions on user_ratings table
GRANT SELECT, INSERT, UPDATE, DELETE ON user_ratings TO authenticated;

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- 
-- After running this script, verify the function was created:
-- 
-- SELECT * FROM can_rate_user('test_user1', 'test_user2');
-- 
-- This should return a table with can_rate and pending_pings columns
-- 
-- ============================================================================
