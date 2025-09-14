-- ============================================================================
-- COMPREHENSIVE LISTINGS FUNCTION DIAGNOSTIC
-- ============================================================================
-- This script checks all functions that might prevent listings from showing
-- on the home page and identifies any issues.

-- ============================================================================
-- 1. CHECK IF REQUIRED FUNCTIONS EXIST
-- ============================================================================

SELECT 
    'Function Existence Check' as test_category,
    routine_name as function_name,
    CASE 
        WHEN routine_name = 'get_listings_with_distance' THEN '✅ Main listings function'
        WHEN routine_name = 'get_listings_optimized_v2' THEN '✅ Optimized listings function'
        WHEN routine_name = 'get_listings_with_image_stats' THEN '✅ Image stats function'
        WHEN routine_name = 'get_user_listings_with_images' THEN '✅ User listings function'
        ELSE '⚠️ Other function'
    END as status,
    routine_definition as definition
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name LIKE '%listings%'
ORDER BY routine_name;

-- ============================================================================
-- 2. CHECK FUNCTION PARAMETERS AND RETURN TYPES
-- ============================================================================

SELECT 
    'Function Parameters Check' as test_category,
    p.routine_name as function_name,
    p.parameter_name,
    p.data_type,
    p.parameter_mode,
    CASE 
        WHEN p.parameter_name = 'user_lat' AND p.data_type = 'double precision' THEN '✅ Correct'
        WHEN p.parameter_name = 'user_lng' AND p.data_type = 'double precision' THEN '✅ Correct'
        WHEN p.parameter_name = 'max_distance_km' AND p.data_type = 'integer' THEN '✅ Correct'
        WHEN p.parameter_name = 'category_filter' AND p.data_type = 'text' THEN '✅ Correct'
        WHEN p.parameter_name = 'limit_count' AND p.data_type = 'integer' THEN '✅ Correct'
        ELSE '⚠️ Check needed'
    END as status
FROM information_schema.parameters p
WHERE p.specific_schema = 'public' 
AND p.routine_name LIKE '%listings%'
ORDER BY p.routine_name, p.ordinal_position;

-- ============================================================================
-- 3. CHECK IF FUNCTIONS ARE EXECUTABLE
-- ============================================================================

-- Test get_listings_with_distance function
SELECT 
    'Function Execution Test' as test_category,
    'get_listings_with_distance' as function_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM get_listings_with_distance(28.6139, 77.2090, 50, NULL, 5)
        ) THEN '✅ Function executes successfully'
        ELSE '❌ Function execution failed'
    END as status;

-- Test get_listings_optimized_v2 function
SELECT 
    'Function Execution Test' as test_category,
    'get_listings_optimized_v2' as function_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM get_listings_optimized_v2(28.6139, 77.2090, 50, NULL, 5)
        ) THEN '✅ Function executes successfully'
        ELSE '❌ Function execution failed'
    END as status;

-- ============================================================================
-- 4. CHECK LISTINGS TABLE STRUCTURE
-- ============================================================================

SELECT 
    'Table Structure Check' as test_category,
    column_name,
    data_type,
    is_nullable,
    column_default,
    CASE 
        WHEN column_name = 'id' AND data_type = 'uuid' THEN '✅ Correct'
        WHEN column_name = 'is_active' AND data_type = 'boolean' THEN '✅ Correct'
        WHEN column_name = 'latitude' AND data_type = 'double precision' THEN '✅ Correct'
        WHEN column_name = 'longitude' AND data_type = 'double precision' THEN '✅ Correct'
        WHEN column_name = 'expires_at' AND data_type = 'timestamp with time zone' THEN '✅ Correct'
        WHEN column_name = 'created_at' AND data_type = 'timestamp with time zone' THEN '✅ Correct'
        WHEN column_name = 'updated_at' AND data_type = 'timestamp with time zone' THEN '✅ Correct'
        ELSE '⚠️ Check needed'
    END as status
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'listings'
ORDER BY ordinal_position;

-- ============================================================================
-- 5. CHECK FOR ACTIVE LISTINGS
-- ============================================================================

SELECT 
    'Data Availability Check' as test_category,
    'Total Listings' as metric,
    COUNT(*) as count,
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ Data available'
        ELSE '❌ No listings found'
    END as status
FROM listings;

SELECT 
    'Data Availability Check' as test_category,
    'Active Listings' as metric,
    COUNT(*) as count,
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ Active listings available'
        ELSE '❌ No active listings found'
    END as status
FROM listings 
WHERE is_active = true;

SELECT 
    'Data Availability Check' as test_category,
    'Non-Expired Listings' as metric,
    COUNT(*) as count,
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ Non-expired listings available'
        ELSE '❌ No non-expired listings found'
    END as status
FROM listings 
WHERE expires_at > NOW();

SELECT 
    'Data Availability Check' as test_category,
    'Active & Non-Expired Listings' as metric,
    COUNT(*) as count,
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ Active non-expired listings available'
        ELSE '❌ No active non-expired listings found'
    END as status
FROM listings 
WHERE is_active = true AND expires_at > NOW();

-- ============================================================================
-- 6. CHECK FOR LISTINGS WITH LOCATION DATA
-- ============================================================================

SELECT 
    'Location Data Check' as test_category,
    'Listings with Location' as metric,
    COUNT(*) as count,
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ Listings with location available'
        ELSE '❌ No listings with location found'
    END as status
FROM listings 
WHERE is_active = true 
AND expires_at > NOW()
AND latitude IS NOT NULL 
AND longitude IS NOT NULL;

-- ============================================================================
-- 7. TEST FUNCTION WITH SAMPLE DATA
-- ============================================================================

-- Test with Delhi coordinates (28.6139, 77.2090)
SELECT 
    'Function Test with Sample Data' as test_category,
    'get_listings_with_distance (Delhi)' as test_name,
    COUNT(*) as result_count,
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ Function returns data'
        ELSE '❌ Function returns no data'
    END as status
FROM get_listings_with_distance(28.6139, 77.2090, 50, NULL, 5);

-- Test without location
SELECT 
    'Function Test with Sample Data' as test_category,
    'get_listings_with_distance (No Location)' as test_name,
    COUNT(*) as result_count,
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ Function returns data without location'
        ELSE '❌ Function returns no data without location'
    END as status
FROM get_listings_with_distance(NULL, NULL, 50, NULL, 5);

-- ============================================================================
-- 8. CHECK FOR MISSING COLUMNS THAT MIGHT CAUSE ERRORS
-- ============================================================================

SELECT 
    'Missing Columns Check' as test_category,
    'Required Columns' as check_type,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'listings' AND column_name = 'is_active') 
        THEN '✅ is_active column exists'
        ELSE '❌ is_active column missing'
    END as is_active_status,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'listings' AND column_name = 'expires_at') 
        THEN '✅ expires_at column exists'
        ELSE '❌ expires_at column missing'
    END as expires_at_status,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'listings' AND column_name = 'latitude') 
        THEN '✅ latitude column exists'
        ELSE '❌ latitude column missing'
    END as latitude_status,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'listings' AND column_name = 'longitude') 
        THEN '✅ longitude column exists'
        ELSE '❌ longitude column missing'
    END as longitude_status;

-- ============================================================================
-- 9. CHECK FOR RECENT MIGRATIONS THAT MIGHT HAVE BROKEN FUNCTIONS
-- ============================================================================

SELECT 
    'Migration Impact Check' as test_category,
    'Recent Migrations' as check_type,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'listings' AND column_name = 'images') 
        THEN '⚠️ Old images column still exists (might cause conflicts)'
        ELSE '✅ Old images column removed'
    END as images_column_status,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'listings' AND column_name = 'image_folder_path') 
        THEN '⚠️ image_folder_path column still exists (might cause conflicts)'
        ELSE '✅ image_folder_path column removed'
    END as image_folder_path_status;

-- ============================================================================
-- 10. FINAL DIAGNOSTIC SUMMARY
-- ============================================================================

SELECT 
    'FINAL DIAGNOSTIC SUMMARY' as test_category,
    'Check Results' as summary_type,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'get_listings_with_distance') 
        AND EXISTS (SELECT 1 FROM listings WHERE is_active = true AND expires_at > NOW())
        THEN '✅ All systems operational - listings should be visible'
        WHEN EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'get_listings_with_distance') 
        AND NOT EXISTS (SELECT 1 FROM listings WHERE is_active = true AND expires_at > NOW())
        THEN '⚠️ Function exists but no active listings found'
        WHEN NOT EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'get_listings_with_distance') 
        THEN '❌ Main function missing - this is the problem'
        ELSE '❌ Unknown issue'
    END as overall_status;
