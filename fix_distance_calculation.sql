-- ============================================================================
-- FIX DISTANCE CALCULATION - USE GEOGRAPHY INSTEAD OF GEOMETRY
-- ============================================================================
-- The issue is that we're using ::geometry instead of ::geography for distance calculations
-- Geography gives accurate distances on Earth's surface, geometry gives flat distances

-- Drop existing function
DROP FUNCTION IF EXISTS get_listings_with_distance(double precision, double precision, integer, text, integer);

-- Create the function with correct geography-based distance calculation
CREATE OR REPLACE FUNCTION get_listings_with_distance(
    user_lat double precision DEFAULT NULL,
    user_lng double precision DEFAULT NULL,
    max_distance_km integer DEFAULT 50,
    category_filter text DEFAULT NULL,
    limit_count integer DEFAULT 20
)
RETURNS TABLE(
    id uuid,
    username text,
    title text,
    description text,
    price numeric,
    price_unit text,
    category text,
    thumbnail_images text[],
    preview_images text[],
    latitude double precision,
    longitude double precision,
    distance_km double precision,
    created_at timestamp with time zone
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        l.id,
        l.username,
        l.title,
        l.description,
        l.price,
        l.price_unit,
        l.category,
        l.thumbnail_images,
        l.preview_images,
        l.latitude,
        l.longitude,
        -- FIXED: Use geography for accurate Earth distance calculation
        CASE 
            WHEN user_lat IS NOT NULL AND user_lng IS NOT NULL 
            AND l.latitude IS NOT NULL AND l.longitude IS NOT NULL
            THEN ST_Distance(
                ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography,
                ST_SetSRID(ST_MakePoint(l.longitude, l.latitude), 4326)::geography
            ) / 1000  -- Convert meters to kilometers
            ELSE NULL
        END as distance_km,
        l.created_at
    FROM listings l
    WHERE l.expires_at > NOW()  -- Only non-expired listings
    AND (category_filter IS NULL OR l.category = category_filter)
    AND (user_lat IS NULL OR user_lng IS NULL 
         OR l.latitude IS NULL OR l.longitude IS NULL
         OR ST_DWithin(
             ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography,
             ST_SetSRID(ST_MakePoint(l.longitude, l.latitude), 4326)::geography,
             max_distance_km * 1000  -- Convert km to meters
         ))
    ORDER BY 
        CASE 
            WHEN user_lat IS NOT NULL AND user_lng IS NOT NULL 
            AND l.latitude IS NOT NULL AND l.longitude IS NOT NULL
            THEN ST_Distance(
                ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography,
                ST_SetSRID(ST_MakePoint(l.longitude, l.latitude), 4326)::geography
            )
            ELSE 999999999
        END,
        l.created_at DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_listings_with_distance(double precision, double precision, integer, text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION get_listings_with_distance(double precision, double precision, integer, text, integer) TO anon;

-- Test the fixed function
SELECT 
    'Fixed Function Test' as test_name,
    COUNT(*) as result_count,
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ SUCCESS - Function returns data'
        ELSE '❌ FAILED - Function returns no data'
    END as status
FROM get_listings_with_distance(28.6139, 77.2090, 50, NULL, 5);

-- Show sample results with distances
SELECT 
    'Sample Results with Distances' as test_name,
    id,
    title,
    latitude,
    longitude,
    distance_km,
    CASE 
        WHEN distance_km IS NULL THEN 'No distance calculated'
        WHEN distance_km = 0 THEN 'Distance is 0 - check coordinates'
        WHEN distance_km < 0.001 THEN 'Very close (< 1m)'
        WHEN distance_km < 1 THEN 'Close (< 1km)'
        ELSE 'Normal distance'
    END as distance_status
FROM get_listings_with_distance(28.6139, 77.2090, 50, NULL, 5)
LIMIT 5;
