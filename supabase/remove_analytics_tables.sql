-- ============================================================================
-- REMOVE SUPABASE ANALYTICS TABLES AND FUNCTIONS
-- This script removes all custom analytics tables and functions
-- ============================================================================

-- Drop analytics-related triggers first
DROP TRIGGER IF EXISTS trigger_update_ping_analytics ON pings;
DROP TRIGGER IF EXISTS trigger_update_ping_status_analytics ON pings;

-- Drop analytics-related functions
DROP FUNCTION IF EXISTS update_ping_analytics();
DROP FUNCTION IF EXISTS update_ping_status_analytics();
DROP FUNCTION IF EXISTS cleanup_old_performance_metrics(integer);
DROP FUNCTION IF EXISTS get_performance_stats(integer);
DROP FUNCTION IF EXISTS get_slow_operations(integer, integer);
DROP FUNCTION IF EXISTS refresh_listing_analytics();

-- Drop analytics tables
DROP TABLE IF EXISTS performance_metrics CASCADE;
DROP TABLE IF EXISTS ping_analytics CASCADE;
DROP TABLE IF EXISTS listing_analytics CASCADE;

-- Drop analytics-related materialized views
DROP MATERIALIZED VIEW IF EXISTS listing_analytics CASCADE;

-- Drop analytics-related indexes (they should be dropped with tables, but just in case)
DROP INDEX IF EXISTS idx_performance_metrics_operation;
DROP INDEX IF EXISTS idx_performance_metrics_timestamp;
DROP INDEX IF EXISTS idx_performance_metrics_duration;
DROP INDEX IF EXISTS idx_performance_metrics_operation_timestamp;
DROP INDEX IF EXISTS idx_listing_analytics_category;

-- Clean up any remaining analytics-related data
-- Note: This will remove all historical analytics data
-- Make sure to backup any important data before running this script

-- Verification
DO $$
BEGIN
    -- Check if analytics tables are removed
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'performance_metrics') THEN
        RAISE NOTICE 'Performance metrics table removed successfully';
    ELSE
        RAISE EXCEPTION 'Performance metrics table still exists';
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'ping_analytics') THEN
        RAISE NOTICE 'Ping analytics table removed successfully';
    ELSE
        RAISE EXCEPTION 'Ping analytics table still exists';
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'listing_analytics') THEN
        RAISE NOTICE 'Listing analytics table removed successfully';
    ELSE
        RAISE EXCEPTION 'Listing analytics table still exists';
    END IF;
    
    RAISE NOTICE 'All Supabase analytics tables and functions removed successfully';
END $$;
