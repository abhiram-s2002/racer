-- Migration: Optimize Batch Rating Queries for Scale
-- Date: 2025-01-25
-- Description: Adds optimized batch rating queries for 100k+ users to reduce costs by 83%

-- ============================================================================
-- OPTIMIZED BATCH RATING FUNCTION
-- ============================================================================

-- Function for batch rating queries (replaces multiple get_user_rating_stats calls)
-- This reduces 6 individual function calls to 1 batch query per page load
-- For 100k users: 600k queries/day → 100k queries/day (83% reduction)
CREATE OR REPLACE FUNCTION get_batch_user_rating_stats(usernames text[])
RETURNS TABLE(
    rated_username text,
    average_rating numeric,
    total_ratings bigint
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ur.rated_username,
        ROUND(AVG(ur.rating)::numeric, 2) as average_rating,
        COUNT(*) as total_ratings
    FROM user_ratings ur
    WHERE ur.rated_username = ANY(usernames)
    GROUP BY ur.rated_username
    ORDER BY ur.rated_username;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- PERFORMANCE INDEXES
-- ============================================================================

-- Ensure we have optimal indexes for batch queries
CREATE INDEX IF NOT EXISTS idx_user_ratings_rated_username_rating 
ON user_ratings(rated_username, rating);

-- Composite index for efficient batch lookups
CREATE INDEX IF NOT EXISTS idx_user_ratings_batch_lookup 
ON user_ratings(rated_username) 
INCLUDE (rating);

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

-- Grant permissions on new function
GRANT EXECUTE ON FUNCTION get_batch_user_rating_stats(text[]) TO authenticated;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Verify the optimization was created
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.routines WHERE routine_name = 'get_batch_user_rating_stats') THEN
        RAISE EXCEPTION 'get_batch_user_rating_stats function was not created successfully';
    END IF;
    
    -- Test the function with sample data
    IF EXISTS (SELECT 1 FROM user_ratings LIMIT 1) THEN
        PERFORM get_batch_user_rating_stats(ARRAY['test_user']);
    END IF;
    
    RAISE NOTICE 'Rating query optimization created successfully for 100k+ users';
    RAISE NOTICE 'Expected cost reduction: 83%% (600k queries/day → 100k queries/day)';
END $$;
