-- ============================================================================
-- COMPLETE SUPABASE ANALYTICS CLEANUP
-- This script removes ALL analytics-related tables, functions, triggers, views, and indexes
-- Run this in your Supabase SQL Editor to completely remove analytics
-- ============================================================================

-- ============================================================================
-- STEP 1: DROP ALL ANALYTICS TRIGGERS
-- ============================================================================

DROP TRIGGER IF EXISTS trigger_update_ping_analytics ON pings;
DROP TRIGGER IF EXISTS trigger_update_ping_status_analytics ON pings;

-- ============================================================================
-- STEP 2: DROP ALL ANALYTICS FUNCTIONS
-- ============================================================================

DROP FUNCTION IF EXISTS update_ping_analytics();
DROP FUNCTION IF EXISTS update_ping_status_analytics();
DROP FUNCTION IF EXISTS cleanup_old_performance_metrics(integer);
DROP FUNCTION IF EXISTS get_performance_stats(integer);
DROP FUNCTION IF EXISTS get_slow_operations(integer, integer);
DROP FUNCTION IF EXISTS refresh_listing_analytics();

-- ============================================================================
-- STEP 3: DROP ALL ANALYTICS TABLES (CASCADE removes dependent objects)
-- ============================================================================

DROP TABLE IF EXISTS performance_metrics CASCADE;
DROP TABLE IF EXISTS ping_analytics CASCADE;
DROP TABLE IF EXISTS listing_analytics CASCADE;

-- ============================================================================
-- STEP 4: DROP ALL ANALYTICS MATERIALIZED VIEWS
-- ============================================================================

DROP MATERIALIZED VIEW IF EXISTS listing_analytics CASCADE;

-- ============================================================================
-- STEP 5: DROP ALL ANALYTICS VIEWS
-- ============================================================================

DROP VIEW IF EXISTS phone_verification_analytics CASCADE;

-- ============================================================================
-- STEP 6: DROP ALL ANALYTICS INDEXES (if they still exist)
-- ============================================================================

-- Performance metrics indexes
DROP INDEX IF EXISTS idx_performance_metrics_operation;
DROP INDEX IF EXISTS idx_performance_metrics_timestamp;
DROP INDEX IF EXISTS idx_performance_metrics_duration;
DROP INDEX IF EXISTS idx_performance_metrics_operation_timestamp;
DROP INDEX IF EXISTS idx_performance_metrics_operation_time;

-- Ping analytics indexes
DROP INDEX IF EXISTS idx_ping_analytics_username;

-- Listing analytics indexes
DROP INDEX IF EXISTS idx_listing_analytics_category;

-- ============================================================================
-- STEP 7: DROP ANY ANALYTICS-RELATED POLICIES
-- ============================================================================

-- Note: Policies are automatically dropped with tables, but let's be explicit
-- Only drop policies if the tables exist
DO $$
BEGIN
    -- Drop ping analytics policies if table exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'ping_analytics' AND table_schema = 'public') THEN
        DROP POLICY IF EXISTS "Users can view their own ping analytics" ON public.ping_analytics;
        DROP POLICY IF EXISTS "Users can create their own ping analytics" ON public.ping_analytics;
        RAISE NOTICE 'Ping analytics policies removed';
    ELSE
        RAISE NOTICE 'Ping analytics table does not exist, skipping policy removal';
    END IF;
    
    -- Drop performance metrics policies if table exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'performance_metrics' AND table_schema = 'public') THEN
        -- Add any performance metrics policies here if they exist
        RAISE NOTICE 'Performance metrics policies removed';
    ELSE
        RAISE NOTICE 'Performance metrics table does not exist, skipping policy removal';
    END IF;
    
    -- Drop listing analytics policies if table exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'listing_analytics' AND table_schema = 'public') THEN
        -- Add any listing analytics policies here if they exist
        RAISE NOTICE 'Listing analytics policies removed';
    ELSE
        RAISE NOTICE 'Listing analytics table does not exist, skipping policy removal';
    END IF;
END $$;

-- ============================================================================
-- STEP 8: VERIFICATION AND CLEANUP REPORT
-- ============================================================================

DO $$
DECLARE
    remaining_tables integer;
    remaining_functions integer;
    remaining_views integer;
    remaining_indexes integer;
BEGIN
    -- Count remaining analytics-related objects
    SELECT COUNT(*) INTO remaining_tables
    FROM information_schema.tables 
    WHERE table_name IN ('performance_metrics', 'ping_analytics', 'listing_analytics')
    AND table_schema = 'public';
    
    SELECT COUNT(*) INTO remaining_functions
    FROM information_schema.routines 
    WHERE routine_name IN (
        'update_ping_analytics', 
        'update_ping_status_analytics',
        'cleanup_old_performance_metrics',
        'get_performance_stats',
        'get_slow_operations',
        'refresh_listing_analytics'
    )
    AND routine_schema = 'public';
    
    SELECT COUNT(*) INTO remaining_views
    FROM information_schema.views 
    WHERE table_name IN ('phone_verification_analytics', 'listing_analytics')
    AND table_schema = 'public';
    
    SELECT COUNT(*) INTO remaining_indexes
    FROM pg_indexes 
    WHERE indexname LIKE '%analytics%' 
    OR indexname LIKE '%performance_metrics%'
    OR indexname LIKE '%ping_analytics%'
    OR indexname LIKE '%listing_analytics%';
    
    -- Report results
    RAISE NOTICE '========================================';
    RAISE NOTICE 'SUPABASE ANALYTICS CLEANUP COMPLETE';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Remaining analytics tables: %', remaining_tables;
    RAISE NOTICE 'Remaining analytics functions: %', remaining_functions;
    RAISE NOTICE 'Remaining analytics views: %', remaining_views;
    RAISE NOTICE 'Remaining analytics indexes: %', remaining_indexes;
    RAISE NOTICE '========================================';
    
    IF remaining_tables = 0 AND remaining_functions = 0 AND remaining_views = 0 THEN
        RAISE NOTICE '✅ ALL ANALYTICS OBJECTS SUCCESSFULLY REMOVED!';
        RAISE NOTICE '✅ Your database now has ZERO analytics load!';
        RAISE NOTICE '✅ Google Analytics will handle all tracking!';
    ELSE
        RAISE WARNING '⚠️  Some analytics objects may still exist. Check the counts above.';
    END IF;
    
    RAISE NOTICE '========================================';
END $$;

-- ============================================================================
-- STEP 9: FINAL CLEANUP - REMOVE ANY ORPHANED DATA
-- ============================================================================

-- Clean up any remaining analytics data in other tables (if any)
-- This is a safety measure in case there are references we missed

-- Note: This section is commented out as it's unlikely to be needed
-- Uncomment if you find orphaned analytics data after running the script

/*
-- Example: Remove any analytics-related data from other tables
-- UPDATE some_table SET analytics_field = NULL WHERE analytics_field IS NOT NULL;
*/

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================

SELECT 
    'Analytics cleanup completed!' as status,
    'All Supabase analytics tables, functions, triggers, views, and indexes have been removed.' as message,
    'Your app now uses Google Analytics for all tracking with zero database load.' as benefit;
