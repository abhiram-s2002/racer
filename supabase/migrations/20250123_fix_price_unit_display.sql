-- ============================================================================
-- FIX PRICE UNIT DISPLAY IN LISTINGS
-- ============================================================================

-- Update the get_listings_with_distance function to include price_unit field
CREATE OR REPLACE FUNCTION get_listings_with_distance(
    user_lat double precision DEFAULT NULL,
    user_lng double precision DEFAULT NULL,
    max_distance_km integer DEFAULT 50,
    category_filter text DEFAULT NULL,
    limit_count integer DEFAULT 50
)
RETURNS TABLE(
    id uuid,
    username text,
    title text,
    description text,
    price numeric,
    price_unit text,
    category text,
    images text[],
    thumbnail_images text[],
    preview_images text[],
    image_folder_path text,
    image_metadata jsonb,
    is_active boolean,
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
        l.images,
        l.thumbnail_images,
        l.preview_images,
        l.image_folder_path,
        l.image_metadata,
        l.is_active,
        l.latitude,
        l.longitude,
        CASE 
            WHEN user_lat IS NOT NULL AND user_lng IS NOT NULL 
            AND l.latitude IS NOT NULL AND l.longitude IS NOT NULL
            THEN ST_Distance(
                ST_MakePoint(user_lng, user_lat)::geography,
                ST_MakePoint(l.longitude, l.latitude)::geography
            ) / 1000
            ELSE NULL
        END as distance_km,
        l.created_at,
        l.updated_at
    FROM listings l
    WHERE l.is_active = true
    AND (category_filter IS NULL OR l.category = category_filter)
    AND (user_lat IS NULL OR user_lng IS NULL 
         OR l.latitude IS NULL OR l.longitude IS NULL
         OR ST_Distance(
             ST_MakePoint(user_lng, user_lat)::geography,
             ST_MakePoint(l.longitude, l.latitude)::geography
         ) <= max_distance_km * 1000)
    ORDER BY 
        CASE 
            WHEN user_lat IS NOT NULL AND user_lng IS NOT NULL 
            AND l.latitude IS NOT NULL AND l.longitude IS NOT NULL
            THEN ST_Distance(
                ST_MakePoint(user_lng, user_lat)::geography,
                ST_MakePoint(l.longitude, l.latitude)::geography
            )
            ELSE 999999999
        END,
        l.created_at DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Update the get_user_listings_with_images function to include price_unit field
CREATE OR REPLACE FUNCTION get_user_listings_with_images(username_param text)
RETURNS TABLE(
    id uuid,
    title text,
    description text,
    price numeric,
    price_unit text,
    category text,
    images text[],
    thumbnail_images text[],
    preview_images text[],
    image_folder_path text,
    image_metadata jsonb,
    is_active boolean,
    latitude double precision,
    longitude double precision,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        l.id,
        l.title,
        l.description,
        l.price,
        l.price_unit,
        l.category,
        l.images,
        l.thumbnail_images,
        l.preview_images,
        l.image_folder_path,
        l.image_metadata,
        l.is_active,
        l.latitude,
        l.longitude,
        l.created_at,
        l.updated_at
    FROM listings l
    WHERE l.username = username_param
    ORDER BY l.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Add comment to document the fix
COMMENT ON FUNCTION get_listings_with_distance(double precision, double precision, integer, text, integer) IS 'Get listings sorted by distance from user location - now includes price_unit field';

COMMENT ON FUNCTION get_user_listings_with_images(text) IS 'Get user listings with images - now includes price_unit field'; 