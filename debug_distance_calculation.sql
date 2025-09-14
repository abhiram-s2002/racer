-- Debug distance calculation issue
-- This script tests the distance calculation to see why everything shows as 0km

-- 1. Test basic distance calculation with known coordinates
SELECT 
    'Basic Distance Test' as test_name,
    ST_Distance(
        ST_SetSRID(ST_MakePoint(77.2090, 28.6139), 4326)::geometry,
        ST_SetSRID(ST_MakePoint(77.2091, 28.6140), 4326)::geometry
    ) / 1000 as distance_km;

-- 2. Test with a larger distance (should be ~1.4km)
SELECT 
    'Larger Distance Test' as test_name,
    ST_Distance(
        ST_SetSRID(ST_MakePoint(77.2090, 28.6139), 4326)::geometry,
        ST_SetSRID(ST_MakePoint(77.2200, 28.6200), 4326)::geometry
    ) / 1000 as distance_km;

-- 3. Check if there are any listings with coordinates
SELECT 
    'Listings with Coordinates' as test_name,
    COUNT(*) as total_listings,
    COUNT(CASE WHEN latitude IS NOT NULL AND longitude IS NOT NULL THEN 1 END) as with_coordinates,
    COUNT(CASE WHEN latitude IS NULL OR longitude IS NULL THEN 1 END) as without_coordinates
FROM listings;

-- 4. Show sample coordinates from listings
SELECT 
    'Sample Listing Coordinates' as test_name,
    id,
    title,
    latitude,
    longitude,
    CASE 
        WHEN latitude IS NOT NULL AND longitude IS NOT NULL 
        THEN ST_Distance(
            ST_SetSRID(ST_MakePoint(77.2090, 28.6139), 4326)::geometry,
            ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geometry
        ) / 1000
        ELSE NULL
    END as distance_km
FROM listings 
WHERE latitude IS NOT NULL AND longitude IS NOT NULL
LIMIT 5;

-- 5. Test the function with sample data
SELECT 
    'Function Test with Sample Data' as test_name,
    COUNT(*) as result_count,
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ Function returns data'
        ELSE '❌ Function returns no data'
    END as status
FROM get_listings_with_distance(28.6139, 77.2090, 50, NULL, 5);

-- 6. Show actual results from the function
SELECT 
    'Actual Function Results' as test_name,
    id,
    title,
    latitude,
    longitude,
    distance_km
FROM get_listings_with_distance(28.6139, 77.2090, 50, NULL, 5)
LIMIT 3;
