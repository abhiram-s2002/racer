-- Cleanup and Consolidate Migration
-- Migration: 20250123_cleanup_and_consolidate.sql
-- This migration cleans up outdated image handling and consolidates the database

-- ============================================================================
-- REMOVE OUTDATED IMAGE FUNCTIONS
-- ============================================================================

-- Drop old image-related functions that are no longer needed
DROP FUNCTION IF EXISTS cleanup_orphaned_images() CASCADE;
DROP FUNCTION IF EXISTS update_image_fields() CASCADE;
DROP FUNCTION IF EXISTS get_listing_with_images(uuid) CASCADE;
DROP FUNCTION IF EXISTS get_listings_with_image_stats(text, integer, integer) CASCADE;

-- Drop old triggers
DROP TRIGGER IF EXISTS trigger_update_image_fields ON listings;

-- ============================================================================
-- CLEANUP OLD IMAGE COLUMNS
-- ============================================================================

-- Remove legacy image columns that are no longer used
ALTER TABLE listings DROP COLUMN IF EXISTS image_url;

-- ============================================================================
-- UPDATE EXISTING FUNCTIONS FOR NEW SYSTEM
-- ============================================================================

-- Update the get_listings_with_distance function to work with new image system
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

-- ============================================================================
-- ADD NEW HELPER FUNCTIONS
-- ============================================================================

-- Function to get user's listings with image metadata
CREATE OR REPLACE FUNCTION get_user_listings_with_images(username_param text)
RETURNS TABLE(
    id uuid,
    title text,
    description text,
    price numeric,
    category text,
    images text[],
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
        l.images,
        l.thumbnail_images,
        l.preview_images,
        l.image_folder_path,
        l.image_metadata,
        COALESCE(array_length(l.images, 1), 0) + 
        COALESCE(array_length(l.thumbnail_images, 1), 0) + 
        COALESCE(array_length(l.preview_images, 1), 0) as total_images,
        l.created_at
    FROM listings l
    WHERE l.username = username_param
    ORDER BY l.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to validate image upload structure
CREATE OR REPLACE FUNCTION validate_image_upload_structure(
    username_param text,
    original_images text[],
    thumbnail_images text[],
    preview_images text[]
)
RETURNS jsonb AS $$
DECLARE
    result jsonb;
BEGIN
    result := jsonb_build_object(
        'is_valid', true,
        'errors', jsonb_build_array(),
        'warnings', jsonb_build_array()
    );
    
    -- Check if all arrays have the same length
    IF array_length(original_images, 1) != array_length(thumbnail_images, 1) 
       OR array_length(original_images, 1) != array_length(preview_images, 1) THEN
        result := jsonb_set(result, '{is_valid}', 'false');
        result := jsonb_set(result, '{errors}', 
            result->'errors' || jsonb_build_object('message', 'Image arrays must have the same length'));
    END IF;
    
    -- Check if at least one image is provided
    IF array_length(original_images, 1) IS NULL OR array_length(original_images, 1) = 0 THEN
        result := jsonb_set(result, '{warnings}', 
            result->'warnings' || jsonb_build_object('message', 'No images provided for listing'));
    END IF;
    
    -- Check if username is provided
    IF username_param IS NULL OR username_param = '' THEN
        result := jsonb_set(result, '{is_valid}', 'false');
        result := jsonb_set(result, '{errors}', 
            result->'errors' || jsonb_build_object('message', 'Username is required'));
    END IF;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- UPDATE INDEXES FOR BETTER PERFORMANCE
-- ============================================================================

-- Drop old indexes that are no longer needed
DROP INDEX IF EXISTS idx_listings_has_images;

-- Create new optimized indexes
CREATE INDEX IF NOT EXISTS idx_listings_images_performance ON listings(username, is_active, created_at DESC) 
WHERE array_length(images, 1) > 0;

CREATE INDEX IF NOT EXISTS idx_listings_category_active ON listings(category, is_active, created_at DESC);

-- ============================================================================
-- VERIFICATION AND CLEANUP STATUS
-- ============================================================================

-- Check what was cleaned up
SELECT 
    'Cleanup Status' as check_type,
    CASE 
        WHEN NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'listings' AND column_name = 'image_url')
        THEN '✅ Legacy image_url column removed'
        ELSE '⚠️ Legacy image_url column still exists'
    END as cleanup_status,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'listings' AND column_name = 'image_folder_path')
        THEN '✅ New image_folder_path column exists'
        ELSE '❌ New image_folder_path column missing'
    END as new_structure_status,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'listings' AND column_name = 'image_metadata')
        THEN '✅ New image_metadata column exists'
        ELSE '❌ New image_metadata column missing'
    END as metadata_status;

-- Show current table structure
SELECT 
    'Current Listings Table Structure' as check_type,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'listings' 
AND table_schema = 'public'
ORDER BY ordinal_position; 