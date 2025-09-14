-- ============================================================================
-- COMPREHENSIVE FIX FOR LISTINGS NOT SHOWING ON HOME PAGE
-- ============================================================================
-- This script fixes the most common issues that prevent listings from showing

-- ============================================================================
-- STEP 1: DROP AND RECREATE MAIN FUNCTION
-- ============================================================================

-- Drop existing function to avoid conflicts
DROP FUNCTION IF EXISTS get_listings_with_distance(double precision, double precision, integer, text, integer);

-- Create the main listings function
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
        l.created_at,
        l.updated_at
    FROM listings l
    WHERE l.is_active = true
    AND l.expires_at > NOW()  -- Only non-expired listings
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

-- ============================================================================
-- STEP 2: ENSURE REQUIRED COLUMNS EXIST
-- ============================================================================

-- Add is_active column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'listings' AND column_name = 'is_active') THEN
        ALTER TABLE listings ADD COLUMN is_active boolean DEFAULT true;
        UPDATE listings SET is_active = true WHERE is_active IS NULL;
    END IF;
END $$;

-- Add expires_at column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'listings' AND column_name = 'expires_at') THEN
        ALTER TABLE listings ADD COLUMN expires_at timestamp with time zone DEFAULT (NOW() + INTERVAL '30 days');
        UPDATE listings SET expires_at = (NOW() + INTERVAL '30 days') WHERE expires_at IS NULL;
    END IF;
END $$;

-- Add price_unit column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'listings' AND column_name = 'price_unit') THEN
        ALTER TABLE listings ADD COLUMN price_unit text DEFAULT 'INR';
        UPDATE listings SET price_unit = 'INR' WHERE price_unit IS NULL;
    END IF;
END $$;

-- ============================================================================
-- STEP 3: CREATE SAMPLE DATA IF NO LISTINGS EXIST
-- ============================================================================

-- Check if there are any active listings, if not create sample data
DO $$ 
DECLARE
    listing_count integer;
BEGIN
    SELECT COUNT(*) INTO listing_count FROM listings WHERE is_active = true AND expires_at > NOW();
    
    IF listing_count = 0 THEN
        -- Insert sample listings
        INSERT INTO listings (
            id, username, title, description, price, price_unit, category, 
            thumbnail_images, preview_images, latitude, longitude, 
            is_active, expires_at, created_at, updated_at
        ) VALUES 
        (
            gen_random_uuid(), 'sample_user', 'Sample Listing 1', 'This is a sample listing for testing', 
            100.00, 'INR', 'Electronics', 
            ARRAY['https://example.com/thumb1.jpg'], ARRAY['https://example.com/preview1.jpg'],
            28.6139, 77.2090, true, NOW() + INTERVAL '30 days', NOW(), NOW()
        ),
        (
            gen_random_uuid(), 'sample_user2', 'Sample Listing 2', 'Another sample listing for testing', 
            250.00, 'INR', 'Furniture', 
            ARRAY['https://example.com/thumb2.jpg'], ARRAY['https://example.com/preview2.jpg'],
            28.6140, 77.2091, true, NOW() + INTERVAL '30 days', NOW(), NOW()
        ),
        (
            gen_random_uuid(), 'sample_user3', 'Sample Listing 3', 'Third sample listing for testing', 
            500.00, 'INR', 'Clothing', 
            ARRAY['https://example.com/thumb3.jpg'], ARRAY['https://example.com/preview3.jpg'],
            28.6141, 77.2092, true, NOW() + INTERVAL '30 days', NOW(), NOW()
        );
        
        RAISE NOTICE 'Created 3 sample listings for testing';
    END IF;
END $$;

-- ============================================================================
-- STEP 4: GRANT PERMISSIONS
-- ============================================================================

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION get_listings_with_distance(double precision, double precision, integer, text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION get_listings_with_distance(double precision, double precision, integer, text, integer) TO anon;

-- ============================================================================
-- STEP 5: CREATE OPTIMIZED INDEXES
-- ============================================================================

-- Create index for active listings
CREATE INDEX IF NOT EXISTS idx_listings_active_expires 
ON listings(is_active, expires_at) 
WHERE is_active = true AND expires_at > NOW();

-- Create index for location-based queries
CREATE INDEX IF NOT EXISTS idx_listings_location_active 
ON listings(latitude, longitude, is_active) 
WHERE is_active = true AND latitude IS NOT NULL AND longitude IS NOT NULL;

-- ============================================================================
-- STEP 6: VERIFICATION
-- ============================================================================

-- Test the function
SELECT 
    'Function Test' as test_name,
    COUNT(*) as result_count,
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ SUCCESS - Function returns data'
        ELSE '❌ FAILED - Function returns no data'
    END as status
FROM get_listings_with_distance(28.6139, 77.2090, 50, NULL, 5);

-- Check data availability
SELECT 
    'Data Check' as test_name,
    COUNT(*) as total_listings,
    COUNT(CASE WHEN is_active = true THEN 1 END) as active_listings,
    COUNT(CASE WHEN expires_at > NOW() THEN 1 END) as non_expired_listings,
    COUNT(CASE WHEN is_active = true AND expires_at > NOW() THEN 1 END) as active_non_expired_listings
FROM listings;

-- Final status
SELECT 
    'FINAL STATUS' as status,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'get_listings_with_distance') 
        AND EXISTS (SELECT 1 FROM listings WHERE is_active = true AND expires_at > NOW())
        THEN '✅ ALL SYSTEMS OPERATIONAL - Listings should now be visible on home page'
        ELSE '❌ ISSUE PERSISTS - Check the error messages above'
    END as result;
