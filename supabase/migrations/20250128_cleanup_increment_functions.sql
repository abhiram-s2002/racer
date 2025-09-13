-- ============================================================================
-- CLEANUP INCREMENT FUNCTIONS - REMOVE OLD CONFLICTING FUNCTIONS
-- ============================================================================
-- This migration cleans up the conflicting increment function names
-- and ensures only the correct functions exist in the database

-- ============================================================================
-- DROP OLD CONFLICTING FUNCTIONS
-- ============================================================================

-- Drop the old function names that were causing conflicts
DROP FUNCTION IF EXISTS increment_listing_views(uuid);
DROP FUNCTION IF EXISTS increment_listing_pings(uuid);

-- Drop any other old increment functions that might exist
DROP FUNCTION IF EXISTS increment_view_count(uuid);
DROP FUNCTION IF EXISTS increment_ping_count(uuid);

-- ============================================================================
-- ENSURE CORRECT FUNCTIONS EXIST
-- ============================================================================

-- Recreate the correct increment_listing_view_count function
CREATE OR REPLACE FUNCTION increment_listing_view_count(listing_id_param uuid)
RETURNS void AS $$
BEGIN
    -- Increment view count for the specified listing
    UPDATE listings 
    SET view_count = view_count + 1
    WHERE id = listing_id_param;
    
EXCEPTION
    WHEN OTHERS THEN
        -- Log error but don't fail the request
        RAISE WARNING 'Failed to increment view count for listing %: %', listing_id_param, SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- Recreate the correct increment_listing_ping_count function
CREATE OR REPLACE FUNCTION increment_listing_ping_count(listing_id_param uuid)
RETURNS void AS $$
BEGIN
    -- Increment ping count for the specified listing
    UPDATE listings 
    SET ping_count = ping_count + 1
    WHERE id = listing_id_param;
    
EXCEPTION
    WHEN OTHERS THEN
        -- Log error but don't fail the request
        RAISE WARNING 'Failed to increment ping count for listing %: %', listing_id_param, SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION increment_listing_view_count TO authenticated;
GRANT EXECUTE ON FUNCTION increment_listing_ping_count TO authenticated;

-- ============================================================================
-- VERIFY CLEANUP
-- ============================================================================

-- Check that old functions are gone and new ones exist
DO $$
DECLARE
    old_views_exists boolean;
    old_pings_exists boolean;
    new_views_exists boolean;
    new_pings_exists boolean;
BEGIN
    -- Check if old functions still exist (should be false)
    SELECT EXISTS (
        SELECT 1 FROM pg_proc 
        WHERE proname = 'increment_listing_views'
    ) INTO old_views_exists;
    
    SELECT EXISTS (
        SELECT 1 FROM pg_proc 
        WHERE proname = 'increment_listing_pings'
    ) INTO old_pings_exists;
    
    -- Check if new functions exist (should be true)
    SELECT EXISTS (
        SELECT 1 FROM pg_proc 
        WHERE proname = 'increment_listing_view_count'
    ) INTO new_views_exists;
    
    SELECT EXISTS (
        SELECT 1 FROM pg_proc 
        WHERE proname = 'increment_listing_ping_count'
    ) INTO new_pings_exists;
    
    -- Report results
    RAISE NOTICE 'Cleanup Results:';
    RAISE NOTICE 'Old increment_listing_views function removed: %', NOT old_views_exists;
    RAISE NOTICE 'Old increment_listing_pings function removed: %', NOT old_pings_exists;
    RAISE NOTICE 'New increment_listing_view_count function exists: %', new_views_exists;
    RAISE NOTICE 'New increment_listing_ping_count function exists: %', new_pings_exists;
    
    -- Verify success
    IF NOT old_views_exists AND NOT old_pings_exists AND new_views_exists AND new_pings_exists THEN
        RAISE NOTICE 'SUCCESS: Function cleanup completed successfully!';
    ELSE
        RAISE WARNING 'WARNING: Some functions may not be in expected state';
    END IF;
END $$;

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON FUNCTION increment_listing_view_count IS 'Efficiently increments view count for a listing - cleaned up version';
COMMENT ON FUNCTION increment_listing_ping_count IS 'Efficiently increments ping count for a listing - cleaned up version';

-- ============================================================================
-- FINAL VERIFICATION
-- ============================================================================

SELECT 
    'Function Cleanup Complete' as status,
    'Old conflicting functions removed' as old_functions,
    'Correct functions ensured' as new_functions,
    NOW() as cleanup_timestamp;
