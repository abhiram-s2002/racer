-- ============================================================================
-- HOME PAGE GEOMETRIC FUNCTION TEST
-- ============================================================================
-- Quick test script to identify issues with geometric functions in home page listings
-- This tests the exact functions used by the home page

-- ============================================================================
-- 1. QUICK POSTGIS CHECK
-- ============================================================================
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'postgis') 
        THEN 'PASS: PostGIS installed'
        ELSE 'FAIL: PostGIS missing - install with: CREATE EXTENSION IF NOT EXISTS postgis;'
    END as postgis_status;

-- ============================================================================
-- 2. TEST BASIC GEOMETRIC FUNCTIONS
-- ============================================================================
SELECT 
    'Testing ST_Distance...' as test_step,
    ST_Distance(
        ST_SetSRID(ST_MakePoint(77.2090, 28.6139), 4326)::geometry,
        ST_SetSRID(ST_MakePoint(77.1025, 28.7041), 4326)::geometry
    ) / 1000 as distance_km;

SELECT 
    'Testing ST_DWithin...' as test_step,
    ST_DWithin(
        ST_SetSRID(ST_MakePoint(77.2090, 28.6139), 4326)::geometry,
        ST_SetSRID(ST_MakePoint(77.1025, 28.7041), 4326)::geometry,
        10000
    ) as within_10km;

-- ============================================================================
-- 3. TEST WITH REAL LISTING DATA
-- ============================================================================
WITH test_user_location AS (
    SELECT ST_SetSRID(ST_MakePoint(77.2090, 28.6139), 4326)::geometry as user_point
),
sample_listings AS (
    SELECT 
        id,
        title,
        latitude,
        longitude
    FROM listings 
    WHERE latitude IS NOT NULL 
    AND longitude IS NOT NULL
    LIMIT 3
)
SELECT 
    'Testing with real data...' as test_step,
    sl.id,
    sl.title,
    CASE 
        WHEN sl.latitude IS NOT NULL AND sl.longitude IS NOT NULL THEN
            ST_Distance(
                tul.user_point,
                ST_SetSRID(ST_MakePoint(sl.longitude, sl.latitude), 4326)::geometry
            ) / 1000
        ELSE NULL
    END as distance_km,
    CASE 
        WHEN sl.latitude IS NOT NULL AND sl.longitude IS NOT NULL THEN
            ST_DWithin(
                tul.user_point,
                ST_SetSRID(ST_MakePoint(sl.longitude, sl.latitude), 4326)::geometry,
                50000
            )
        ELSE NULL
    END as within_50km
FROM sample_listings sl
CROSS JOIN test_user_location tul;

-- ============================================================================
-- 4. TEST THE ACTUAL HOME PAGE FUNCTION
-- ============================================================================
SELECT 
    'Testing get_listings_with_distance function...' as test_step,
    COUNT(*) as result_count
FROM get_listings_with_distance(28.6139, 77.2090, 50, NULL, 5);

-- ============================================================================
-- 5. CHECK FOR COMMON ISSUES
-- ============================================================================
SELECT 
    'Checking for common issues...' as test_step,
    COUNT(CASE WHEN latitude = 0 AND longitude = 0 THEN 1 END) as zero_coordinates,
    COUNT(CASE WHEN latitude IS NULL OR longitude IS NULL THEN 1 END) as null_coordinates,
    COUNT(CASE WHEN latitude < -90 OR latitude > 90 THEN 1 END) as invalid_latitude,
    COUNT(CASE WHEN longitude < -180 OR longitude > 180 THEN 1 END) as invalid_longitude
FROM listings;

-- ============================================================================
-- 6. PERFORMANCE CHECK
-- ============================================================================
SELECT 
    'Performance test (should complete quickly)...' as test_step;

-- This should execute quickly if indexes are proper
EXPLAIN (ANALYZE, BUFFERS) 
SELECT 
    l.id,
    l.title,
    ST_Distance(
        ST_SetSRID(ST_MakePoint(77.2090, 28.6139), 4326)::geometry,
        ST_SetSRID(ST_MakePoint(l.longitude, l.latitude), 4326)::geometry
    ) / 1000 as distance_km
FROM listings l
WHERE l.latitude IS NOT NULL 
AND l.longitude IS NOT NULL
AND ST_DWithin(
    ST_SetSRID(ST_MakePoint(77.2090, 28.6139), 4326)::geometry,
    ST_SetSRID(ST_MakePoint(l.longitude, l.latitude), 4326)::geometry,
    50000
)
ORDER BY distance_km
LIMIT 10;

-- ============================================================================
-- 7. ERROR DETECTION
-- ============================================================================
SELECT 
    '=== ERROR DETECTION ===' as section,
    CASE 
        WHEN NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'postgis') 
        THEN 'ERROR: PostGIS extension not installed'
        WHEN NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'st_distance') 
        THEN 'ERROR: ST_Distance function not available'
        WHEN NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'st_dwithin') 
        THEN 'ERROR: ST_DWithin function not available'
        WHEN NOT EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'get_listings_with_distance') 
        THEN 'ERROR: get_listings_with_distance function not found'
        ELSE 'SUCCESS: All geometric functions appear to be working'
    END as overall_status;
