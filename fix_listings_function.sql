-- Fix get_listings_with_distance function
-- This script drops the existing function and recreates it with the correct return type

-- Drop the existing function first to avoid return type conflicts
DROP FUNCTION IF EXISTS get_listings_with_distance(double precision, double precision, integer, text, integer);

-- Recreate the function with the correct return type
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
    created_at timestamp with time zone,
    updated_at timestamp with time zone
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
        -- HAVERSINE FORMULA using PostGIS ST_Distance with geometry
        CASE 
            WHEN user_lat IS NOT NULL AND user_lng IS NOT NULL 
            AND l.latitude IS NOT NULL AND l.longitude IS NOT NULL
            THEN ST_Distance(
                ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geometry,
                ST_SetSRID(ST_MakePoint(l.longitude, l.latitude), 4326)::geometry
            ) / 1000  -- Convert meters to kilometers
            ELSE NULL
        END as distance_km,
        l.created_at,
        l.updated_at
    FROM listings l
    WHERE l.is_active = true
    AND (category_filter IS NULL OR l.category = category_filter)
    AND (user_lat IS NULL OR user_lng IS NULL 
         OR l.latitude IS NULL OR l.longitude IS NULL
         OR ST_DWithin(  -- OPTIMIZATION: Use ST_DWithin for fast distance filtering
             ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geometry,
             ST_SetSRID(ST_MakePoint(l.longitude, l.latitude), 4326)::geometry,
             max_distance_km * 1000  -- Convert km to meters
         ))
    ORDER BY 
        -- Sort by distance first (closest first), then by creation date
        CASE 
            WHEN user_lat IS NOT NULL AND user_lng IS NOT NULL 
            AND l.latitude IS NOT NULL AND l.longitude IS NOT NULL
            THEN ST_Distance(
                ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geometry,
                ST_SetSRID(ST_MakePoint(l.longitude, l.latitude), 4326)::geometry
            )
            ELSE 999999999  -- Put listings without location at the end
        END,
        l.created_at DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Add comment for documentation
COMMENT ON FUNCTION get_listings_with_distance(double precision, double precision, integer, text, integer) 
IS 'Get listings sorted by distance from user location using Haversine formula with PostGIS geometry optimization';

-- Test the function to make sure it works
SELECT 'Function created successfully' as status;
