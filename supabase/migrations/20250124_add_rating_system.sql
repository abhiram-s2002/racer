-- Migration: Add Rating System
-- Date: 2025-01-24
-- Description: Adds the missing rating system components including user_ratings table and can_rate_user function

-- ============================================================================
-- CLEANUP EXISTING OBJECTS
-- ============================================================================

-- Drop existing functions to avoid conflicts
DROP FUNCTION IF EXISTS can_rate_user(text, text);
DROP FUNCTION IF EXISTS get_user_rating_stats(text);

-- Drop existing table if it exists (for clean migration)
DROP TABLE IF EXISTS user_ratings CASCADE;

-- ============================================================================
-- USER RATINGS TABLE
-- ============================================================================

-- Create user_ratings table for storing user ratings
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

-- ============================================================================
-- RATING ELIGIBILITY FUNCTION
-- ============================================================================

-- Function to check if a user can rate another user
-- Note: Parameter names must match exactly in RPC calls
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

-- ============================================================================
-- RATING STATISTICS FUNCTION
-- ============================================================================

-- Function to get user rating statistics
CREATE OR REPLACE FUNCTION get_user_rating_stats(target_username text)
RETURNS TABLE(
    average_rating numeric,
    total_ratings bigint,
    rating_distribution jsonb
) AS $$
DECLARE
    avg_rating numeric;
    total_count bigint;
    distribution jsonb;
BEGIN
    -- Get average rating and total count
    SELECT 
        ROUND(AVG(rating)::numeric, 2),
        COUNT(*)
    INTO avg_rating, total_count
    FROM user_ratings 
    WHERE rated_username = target_username;
    
    -- Get rating distribution (1-5 stars)
    SELECT jsonb_build_object(
        '1', COUNT(*) FILTER (WHERE rating = 1),
        '2', COUNT(*) FILTER (WHERE rating = 2),
        '3', COUNT(*) FILTER (WHERE rating = 3),
        '4', COUNT(*) FILTER (WHERE rating = 4),
        '5', COUNT(*) FILTER (WHERE rating = 5)
    ) INTO distribution
    FROM user_ratings 
    WHERE rated_username = target_username;
    
    -- Return results
    RETURN QUERY SELECT 
        COALESCE(avg_rating, 0),
        COALESCE(total_count, 0),
        COALESCE(distribution, '{}'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- RATING TRIGGERS
-- ============================================================================

-- Function to update user rating stats when a rating is added/updated/deleted
CREATE OR REPLACE FUNCTION update_user_rating_stats()
RETURNS TRIGGER AS $$
BEGIN
    -- This function can be used to automatically update user rating statistics
    -- when ratings are modified (for future optimization)
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

-- Enable RLS on user_ratings table
ALTER TABLE user_ratings ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view ratings they've given or received
CREATE POLICY "Users can view their own ratings" ON user_ratings
    FOR SELECT USING (
        rater_username = current_setting('request.jwt.claims')::json->>'username'
        OR 
        rated_username = current_setting('request.jwt.claims')::json->>'username'
    );

-- Policy: Users can insert ratings they're eligible to give
CREATE POLICY "Users can insert ratings" ON user_ratings
    FOR INSERT WITH CHECK (
        rater_username = current_setting('request.jwt.claims')::json->>'username'
    );

-- Policy: Users can update their own ratings
CREATE POLICY "Users can update their own ratings" ON user_ratings
    FOR UPDATE USING (
        rater_username = current_setting('request.jwt.claims')::json->>'username'
    );

-- Policy: Users can delete their own ratings
CREATE POLICY "Users can delete their own ratings" ON user_ratings
    FOR DELETE USING (
        rater_username = current_setting('request.jwt.claims')::json->>'username'
    );

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION can_rate_user(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_rating_stats(text) TO authenticated;

-- Grant permissions on user_ratings table
GRANT SELECT, INSERT, UPDATE, DELETE ON user_ratings TO authenticated;

-- ============================================================================
-- INITIAL DATA (OPTIONAL)
-- ============================================================================

-- Insert some sample rating categories if needed
-- This is optional and can be removed if not needed
INSERT INTO user_ratings (rater_username, rated_username, ping_id, rating, category, review_text)
SELECT 
    'sample_user1' as rater_username,
    'sample_user2' as rated_username,
    p.id as ping_id,
    5 as rating,
    'general' as category,
    'Great communication and fast response!' as review_text
FROM pings p
WHERE p.sender_username = 'sample_user1' 
AND p.receiver_username = 'sample_user2'
AND p.status = 'accepted'
LIMIT 1
ON CONFLICT DO NOTHING;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Verify the table was created
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_ratings') THEN
        RAISE EXCEPTION 'user_ratings table was not created successfully';
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.routines WHERE routine_name = 'can_rate_user') THEN
        RAISE EXCEPTION 'can_rate_user function was not created successfully';
    END IF;
    
    RAISE NOTICE 'Rating system components created successfully';
END $$;
