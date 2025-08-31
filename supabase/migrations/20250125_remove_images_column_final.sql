-- Migration to remove the images column and update all dependent functions
-- This migration removes the unused images column and updates all functions to work without it

-- ============================================================================
-- STEP 1: DROP UNUSED VIEWS AND FUNCTIONS
-- ============================================================================

-- Drop the unused pings_with_listings view
DROP VIEW IF EXISTS pings_with_listings CASCADE;

-- Drop the unused get_listing_with_location function (it's not used in the app)
DROP FUNCTION IF EXISTS get_listing_with_location;

-- ============================================================================
-- STEP 2: UPDATE FUNCTIONS TO REMOVE IMAGES COLUMN REFERENCES
-- ============================================================================
-- Note: The app handles pagination by requesting more data than needed
-- and then slicing it client-side. This approach works well with
-- distance-based sorting since we need all data to calculate distances properly.

-- Drop the existing function first (it has a different return type)
DROP FUNCTION IF EXISTS get_listings_with_distance(double precision, double precision, integer, text, integer);

-- Now create the updated function without images column
-- Parameters:
--   user_lat: User's latitude for distance calculations
--   user_lng: User's longitude for distance calculations  
--   max_distance_km: Maximum distance to search (in km)
--   category_filter: Optional category filter (NULL = all categories)
--   limit_count: Total number of listings to return (for pagination)
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

-- Drop the existing function first
DROP FUNCTION IF EXISTS get_user_listings_with_images(text);

-- Now create the updated function without images column
CREATE OR REPLACE FUNCTION get_user_listings_with_images(username_param text)
RETURNS TABLE(
    id uuid,
    title text,
    description text,
    price numeric,
    category text,
    thumbnail_images text[],
    preview_images text[],
    image_folder_path text,
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
        l.image_folder_path,
        l.image_metadata,
        COALESCE(array_length(l.thumbnail_images, 1), 0) + 
        COALESCE(array_length(l.preview_images, 1), 0) as total_images,
        l.created_at
    FROM listings l
    WHERE l.username = username_param
    ORDER BY l.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Drop the existing function first
DROP FUNCTION IF EXISTS get_listings_with_image_stats(integer, integer);

-- Now create the updated function without images column
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
-- STEP 3: REMOVE THE IMAGES COLUMN
-- ============================================================================

-- Now we can safely remove the images column
ALTER TABLE listings DROP COLUMN IF EXISTS images;

-- ============================================================================
-- STEP 4: VERIFICATION
-- ============================================================================

-- Verify the images column is gone
SELECT 
    'Migration Status' as check_type,
    CASE 
        WHEN NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'listings' AND column_name = 'images'
        ) 
        THEN '✅ images column removed'
        ELSE '❌ images column still exists'
    END as column_status,
    CASE 
        WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_listings_with_distance') 
        THEN '✅ get_listings_with_distance function updated'
        ELSE '❌ get_listings_with_distance function missing'
    END as function_status,
    CASE 
        WHEN NOT EXISTS (SELECT 1 FROM pg_views WHERE viewname = 'pings_with_listings') 
        THEN '✅ pings_with_listings view removed'
        ELSE '❌ pings_with_listings view still exists'
    END as view_status;
