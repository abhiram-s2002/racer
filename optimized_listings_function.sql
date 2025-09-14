-- ============================================================================
-- ULTRA-OPTIMIZED LISTINGS FUNCTION FOR MINIMAL DATABASE CALLS & BANDWIDTH
-- ============================================================================
-- This version is optimized for:
-- 1. Minimal database calls (single RPC call per page)
-- 2. Essential data only (no unnecessary fields)
-- 3. Efficient caching and pagination
-- 4. Lower Supabase costs and bandwidth usage

-- Drop existing function
DROP FUNCTION IF EXISTS get_listings_with_distance(double precision, double precision, integer, text, integer);

-- Create ultra-optimized function with minimal data retrieval
CREATE OR REPLACE FUNCTION get_listings_with_distance(
    user_lat double precision DEFAULT NULL,
    user_lng double precision DEFAULT NULL,
    max_distance_km integer DEFAULT 50,
    category_filter text DEFAULT NULL,
    limit_count integer DEFAULT 20
)
RETURNS TABLE(
    -- ESSENTIAL FIELDS ONLY - No unnecessary data
    id uuid,
    username text,
    title text,
    price numeric,
    price_unit text,
    category text,
    thumbnail_images text[],  -- Only thumbnail images for list view
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
        l.price,
        l.price_unit,
        l.category,
        l.thumbnail_images,  -- Only thumbnails, not full preview images
        l.latitude,
        l.longitude,
        -- Optimized distance calculation
        CASE 
            WHEN user_lat IS NOT NULL AND user_lng IS NOT NULL 
            AND l.latitude IS NOT NULL AND l.longitude IS NOT NULL
            THEN ST_Distance(
                ST_GeogFromText('POINT(' || user_lng || ' ' || user_lat || ')'),
                ST_GeogFromText('POINT(' || l.longitude || ' ' || l.latitude || ')')
            ) / 1000
            ELSE NULL
        END as distance_km,
        l.created_at
    FROM listings l
    WHERE l.expires_at > NOW()
    AND (category_filter IS NULL OR l.category = category_filter)
    AND (user_lat IS NULL OR user_lng IS NULL 
         OR l.latitude IS NULL OR l.longitude IS NULL
         OR ST_DWithin(
             ST_GeogFromText('POINT(' || user_lng || ' ' || user_lat || ')'),
             ST_GeogFromText('POINT(' || l.longitude || ' ' || l.latitude || ')'),
             max_distance_km * 1000
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

-- Create a separate function for detailed listing data (only when needed)
CREATE OR REPLACE FUNCTION get_listing_details(listing_id uuid)
RETURNS TABLE(
    id uuid,
    username text,
    title text,
    description text,
    price numeric,
    price_unit text,
    category text,
    thumbnail_images text[],
    preview_images text[],  -- Full images only when viewing details
    latitude double precision,
    longitude double precision,
    distance_km double precision,
    created_at timestamp with time zone,
    view_count integer,
    ping_count integer
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
        NULL::double precision as distance_km,  -- No distance calculation for details
        l.created_at,
        COALESCE(l.view_count, 0) as view_count,
        COALESCE(l.ping_count, 0) as ping_count
    FROM listings l
    WHERE l.id = listing_id
    AND l.expires_at > NOW();
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_listings_with_distance(double precision, double precision, integer, text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION get_listings_with_distance(double precision, double precision, integer, text, integer) TO anon;
GRANT EXECUTE ON FUNCTION get_listing_details(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_listing_details(uuid) TO anon;

-- Create optimized indexes for better performance
CREATE INDEX IF NOT EXISTS idx_listings_optimized 
ON listings(expires_at, category, created_at DESC) 
WHERE expires_at > NOW();

-- Create a simpler location index using the built-in geography type
CREATE INDEX IF NOT EXISTS idx_listings_location_optimized 
ON listings USING GIST(location)
WHERE latitude IS NOT NULL AND longitude IS NOT NULL AND expires_at > NOW();

-- Create composite index for common queries
CREATE INDEX IF NOT EXISTS idx_listings_composite 
ON listings(expires_at, latitude, longitude, created_at DESC)
WHERE expires_at > NOW() AND latitude IS NOT NULL AND longitude IS NOT NULL;

-- Test the optimized function
SELECT 
    'Optimized Function Test' as test_name,
    COUNT(*) as result_count,
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ SUCCESS - Optimized function works'
        ELSE '❌ FAILED - No results'
    END as status
FROM get_listings_with_distance(11.3293328, 75.9871247, 50, NULL, 5);

-- Show data size comparison
SELECT 
    'Data Size Comparison' as test_name,
    'Optimized (Essential Fields Only)' as version,
    COUNT(*) as record_count,
    'Minimal bandwidth usage' as benefit
FROM get_listings_with_distance(11.3293328, 75.9871247, 50, NULL, 5);
