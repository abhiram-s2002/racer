-- Efficient view count and ping count increment functions
-- Optimized for minimal database load and maximum performance

-- ============================================================================
-- ADD MISSING COLUMNS TO LISTINGS TABLE
-- ============================================================================

-- Add view_count column (if not exists)
ALTER TABLE listings 
ADD COLUMN IF NOT EXISTS view_count integer DEFAULT 0;

-- Add ping_count column (if not exists)  
ALTER TABLE listings 
ADD COLUMN IF NOT EXISTS ping_count integer DEFAULT 0;

-- ============================================================================
-- EFFICIENT INCREMENT FUNCTIONS
-- ============================================================================

-- Drop existing functions to avoid conflicts
DROP FUNCTION IF EXISTS increment_view_count(uuid);
DROP FUNCTION IF EXISTS increment_ping_count(uuid);
DROP FUNCTION IF EXISTS increment_listing_view_count(uuid);
DROP FUNCTION IF EXISTS increment_listing_ping_count(uuid);

-- Function to increment view count (optimized for speed)
CREATE OR REPLACE FUNCTION increment_listing_views(listing_id_param uuid)
RETURNS void AS $$
BEGIN
    -- Single atomic operation - fastest possible
    UPDATE listings 
    SET view_count = view_count + 1
    WHERE id = listing_id_param;
END;
$$ LANGUAGE plpgsql;

-- Function to increment ping count (optimized for speed)
CREATE OR REPLACE FUNCTION increment_listing_pings(listing_id_param uuid)
RETURNS void AS $$
BEGIN
    -- Single atomic operation - fastest possible
    UPDATE listings 
    SET ping_count = ping_count + 1
    WHERE id = listing_id_param;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- PERFORMANCE OPTIMIZATIONS
-- ============================================================================

-- Index for fast lookups on view_count (for sorting popular listings)
CREATE INDEX IF NOT EXISTS idx_listings_view_count_desc ON listings(view_count DESC) 
WHERE view_count > 0;

-- Index for fast lookups on ping_count (for sorting in-demand listings)
CREATE INDEX IF NOT EXISTS idx_listings_ping_count_desc ON listings(ping_count DESC) 
WHERE ping_count > 0;

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION increment_listing_views TO authenticated;
GRANT EXECUTE ON FUNCTION increment_listing_pings TO authenticated;

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON FUNCTION increment_listing_views IS 'Efficiently increments view count for a listing';
COMMENT ON FUNCTION increment_listing_pings IS 'Efficiently increments ping count for a listing';
COMMENT ON COLUMN listings.view_count IS 'Total views of this listing';
COMMENT ON COLUMN listings.ping_count IS 'Total pings received for this listing';

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Test that functions work
SELECT 'Count increment functions created successfully' as status;
