-- Remove image_folder_path column from listings table
-- This migration removes the redundant image_folder_path column since images are stored in arrays

-- ============================================================================
-- STEP 1: UPDATE FUNCTIONS TO REMOVE IMAGE_FOLDER_PATH REFERENCES
-- ============================================================================

-- Drop and recreate get_listings_with_distance function without image_folder_path
DROP FUNCTION IF EXISTS get_listings_with_distance(double precision, double precision, integer, text, integer);

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
    thumbnail_images text[],
    preview_images text[],
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
        l.thumbnail_images,
        l.preview_images,
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

-- Drop and recreate get_user_listings_with_images function without image_folder_path
DROP FUNCTION IF EXISTS get_user_listings_with_images(text);

CREATE OR REPLACE FUNCTION get_user_listings_with_images(username_param text)
RETURNS TABLE(
    id uuid,
    title text,
    description text,
    price numeric,
    category text,
    thumbnail_images text[],
    preview_images text[],
    image_metadata jsonb,
    total_images integer,
    created_at timestamp with time zone
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        l.id,
        l.title,
        l.description,
        l.price,
        l.category,
        l.thumbnail_images,
        l.preview_images,
        l.image_metadata,
        COALESCE(array_length(l.thumbnail_images, 1), 0) + 
        COALESCE(array_length(l.preview_images, 1), 0) as total_images,
        l.created_at
    FROM listings l
    WHERE l.username = username_param
    ORDER BY l.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Drop and recreate get_listings_with_image_stats function without image_folder_path
DROP FUNCTION IF EXISTS get_listings_with_image_stats(integer, integer);

CREATE OR REPLACE FUNCTION get_listings_with_image_stats(
    page_num integer DEFAULT 1,
    page_size integer DEFAULT 10
)
RETURNS TABLE(
    id uuid,
    title text,
    description text,
    price numeric,
    category text,
    thumbnail_images text[],
    preview_images text[],
    is_active boolean,
    username text,
    latitude double precision,
    longitude double precision,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    image_count integer,
    has_images boolean
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        l.id,
        l.title,
        l.description,
        l.price,
        l.category,
        l.thumbnail_images,
        l.preview_images,
        l.is_active,
        l.username,
        l.latitude,
        l.longitude,
        l.created_at,
        l.updated_at,
        COALESCE(array_length(l.thumbnail_images, 1), 0) + 
        COALESCE(array_length(l.preview_images, 1), 0) as image_count,
        (COALESCE(array_length(l.thumbnail_images, 1), 0) + 
         COALESCE(array_length(l.preview_images, 1), 0)) > 0 as has_images
    FROM listings l
    WHERE l.is_active = true
    ORDER BY l.created_at DESC
    LIMIT page_size
    OFFSET (page_num - 1) * page_size;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- STEP 2: REMOVE THE IMAGE_FOLDER_PATH COLUMN
-- ============================================================================

-- Remove the image_folder_path column from listings table
ALTER TABLE listings DROP COLUMN IF EXISTS image_folder_path;

-- ============================================================================
-- STEP 3: VERIFICATION
-- ============================================================================

-- Verify the image_folder_path column is gone
SELECT 
    'Migration Status' as check_type,
    CASE 
        WHEN NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'listings' AND column_name = 'image_folder_path'
        ) 
        THEN '✅ image_folder_path column removed'
        ELSE '❌ image_folder_path column still exists'
    END as column_status,
    CASE 
        WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_listings_with_distance') 
        THEN '✅ get_listings_with_distance function updated'
        ELSE '❌ get_listings_with_distance function missing'
    END as function_status,
    CASE 
        WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_user_listings_with_images') 
        THEN '✅ get_user_listings_with_images function updated'
        ELSE '❌ get_user_listings_with_images function missing'
    END as user_function_status,
    CASE 
        WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_listings_with_image_stats') 
        THEN '✅ get_listings_with_image_stats function updated'
        ELSE '❌ get_listings_with_image_stats function missing'
    END as stats_function_status;

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON FUNCTION get_listings_with_distance IS 'Get listings sorted by distance from user location - updated without image_folder_path';
COMMENT ON FUNCTION get_user_listings_with_images IS 'Get user listings with image statistics - updated without image_folder_path';
COMMENT ON FUNCTION get_listings_with_image_stats IS 'Get paginated listings with image statistics - updated without image_folder_path';
