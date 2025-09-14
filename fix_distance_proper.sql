-- ============================================================================
-- PROPER FIX FOR DISTANCE CALCULATION
-- ============================================================================
-- The issue is that we need to use geography consistently and fix the coordinate order

-- First, let's test the correct distance calculation
SELECT 
    'Correct Distance Test' as test_name,
    -- Test with Delhi coordinates (28.6139, 77.2090) to nearby point
    ST_Distance(
        ST_GeogFromText('POINT(77.2090 28.6139)'),
        ST_GeogFromText('POINT(77.2200 28.6200)')
    ) / 1000 as distance_km;

-- Test with your actual coordinates (11.3293328, 75.9871247) to nearby point
SELECT 
    'Your Area Distance Test' as test_name,
    ST_Distance(
        ST_GeogFromText('POINT(75.9871247 11.3293328)'),
        ST_GeogFromText('POINT(76.0532965 11.331294)')
    ) / 1000 as distance_km;

-- Now fix the function with proper geography usage
DROP FUNCTION IF EXISTS get_listings_with_distance(double precision, double precision, integer, text, integer);

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
        -- FIXED: Use ST_GeogFromText for proper geography distance calculation
        CASE 
            WHEN user_lat IS NOT NULL AND user_lng IS NOT NULL 
            AND l.latitude IS NOT NULL AND l.longitude IS NOT NULL
            THEN ST_Distance(
                ST_GeogFromText('POINT(' || user_lng || ' ' || user_lat || ')'),
                ST_GeogFromText('POINT(' || l.longitude || ' ' || l.latitude || ')')
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
             ST_GeogFromText('POINT(' || user_lng || ' ' || user_lat || ')'),
             ST_GeogFromText('POINT(' || l.longitude || ' ' || l.latitude || ')'),
             max_distance_km * 1000  -- Convert km to meters
         ))
    ORDER BY 
        CASE 
            WHEN user_lat IS NOT NULL AND user_lng IS NOT NULL 
            AND l.latitude IS NOT NULL AND l.longitude IS NOT NULL
            THEN ST_Distance(
                ST_GeogFromText('POINT(' || user_lng || ' ' || user_lat || ')'),
                ST_GeogFromText('POINT(' || l.longitude || ' ' || l.latitude || ')')
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

-- Test the fixed function with your actual coordinates
SELECT 
    'Fixed Function Test with Your Coordinates' as test_name,
    COUNT(*) as result_count,
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ SUCCESS - Function returns data'
        ELSE '❌ FAILED - Function returns no data'
    END as status
FROM get_listings_with_distance(11.3293328, 75.9871247, 50, NULL, 5);

-- Show sample results with proper distances
SELECT 
    'Sample Results with Proper Distances' as test_name,
    id,
    title,
    latitude,
    longitude,
    distance_km,
    CASE 
        WHEN distance_km IS NULL THEN 'No distance calculated'
        WHEN distance_km < 0.001 THEN 'Very close (< 1m)'
        WHEN distance_km < 1 THEN 'Close (' || ROUND(distance_km * 1000) || 'm)'
        ELSE 'Normal distance (' || ROUND(distance_km, 1) || 'km)'
    END as distance_status
FROM get_listings_with_distance(11.3293328, 75.9871247, 50, NULL, 5)
LIMIT 5;
