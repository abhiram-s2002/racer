-- ============================================================================
-- RATING SYSTEM FIX
-- ============================================================================
-- 
-- This script fixes the missing can_rate_user function that's causing rating errors
-- Run this in your Supabase database to enable the rating system
-- 
-- ============================================================================

-- Clean up any existing functions to avoid conflicts
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
-- After running this script, verify the function was created by running:
-- 
-- SELECT * FROM can_rate_user('test_user1', 'test_user2');
-- 
-- This should return a table with can_rate and pending_pings columns
-- 
-- ============================================================================
-- WHAT THIS SCRIPT FIXES:
-- ============================================================================
-- 
-- 1. Creates the missing can_rate_user function with correct parameters
-- 2. Creates the user_ratings table for storing ratings
-- 3. Sets up proper RLS policies for security
-- 4. Grants necessary permissions to authenticated users
-- 
-- After running this script, the rating system should work correctly
-- and users will be able to rate each other after completing ping interactions
-- 
-- ============================================================================
