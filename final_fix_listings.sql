-- ============================================================================
-- FINAL FIX FOR LISTINGS WITHOUT is_active AND updated_at FIELDS
-- ============================================================================
-- This script creates the get_listings_with_distance function without using 
-- is_active or updated_at fields

-- Drop existing function to avoid conflicts
DROP FUNCTION IF EXISTS get_listings_with_distance(double precision, double precision, integer, text, integer);

-- Create the main listings function WITHOUT is_active and updated_at fields
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
        -- Distance calculation using PostGIS
        CASE 
            WHEN user_lat IS NOT NULL AND user_lng IS NOT NULL 
            AND l.latitude IS NOT NULL AND l.longitude IS NOT NULL
            THEN ST_Distance(
                ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geometry,
                ST_SetSRID(ST_MakePoint(l.longitude, l.latitude), 4326)::geometry
            ) / 1000
            ELSE NULL
        END as distance_km,
        l.created_at
    FROM listings l
    WHERE l.expires_at > NOW()  -- Only non-expired listings
    AND (category_filter IS NULL OR l.category = category_filter)
    AND (user_lat IS NULL OR user_lng IS NULL 
         OR l.latitude IS NULL OR l.longitude IS NULL
         OR ST_DWithin(
             ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geometry,
             ST_SetSRID(ST_MakePoint(l.longitude, l.latitude), 4326)::geometry,
             max_distance_km * 1000
         ))
    ORDER BY 
        CASE 
            WHEN user_lat IS NOT NULL AND user_lng IS NOT NULL 
            AND l.latitude IS NOT NULL AND l.longitude IS NOT NULL
            THEN ST_Distance(
                ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geometry,
                ST_SetSRID(ST_MakePoint(l.longitude, l.latitude), 4326)::geometry
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

-- Test the function
SELECT 
    'Function Test' as test_name,
    COUNT(*) as result_count,
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ SUCCESS - Function returns data'
        ELSE '❌ FAILED - Function returns no data'
    END as status
FROM get_listings_with_distance(28.6139, 77.2090, 50, NULL, 5);

-- Check if there are any non-expired listings
SELECT 
    'Data Check' as test_name,
    COUNT(*) as total_listings,
    COUNT(CASE WHEN expires_at > NOW() THEN 1 END) as non_expired_listings
FROM listings;

-- Final verification
SELECT 
    'FINAL STATUS' as status,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'get_listings_with_distance') 
        AND EXISTS (SELECT 1 FROM listings WHERE expires_at > NOW())
        THEN '✅ ALL SYSTEMS OPERATIONAL - Listings should now be visible on home page'
        ELSE '❌ ISSUE PERSISTS - Check the error messages above'
    END as result;
