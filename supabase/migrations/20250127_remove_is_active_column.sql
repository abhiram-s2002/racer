-- Remove is_active column from listings table
-- This migration removes the availability status field from the listings table
-- since it's no longer needed in the UI

-- First, update any existing inactive listings to be active
-- (since we're removing the status field, all listings should be active)
UPDATE listings 
SET is_active = true 
WHERE is_active = false;

-- Remove the is_active and updated_at columns from the listings table
ALTER TABLE listings DROP COLUMN IF EXISTS is_active;
ALTER TABLE listings DROP COLUMN IF EXISTS updated_at;

-- ============================================================================
-- UPDATE ALL FUNCTIONS THAT REFERENCE is_active
-- ============================================================================

-- Update cleanup_expired_listings function
CREATE OR REPLACE FUNCTION cleanup_expired_listings()
RETURNS void AS $$
DECLARE
    expired_count integer;
    deleted_listing record;
BEGIN
    SELECT COUNT(*) INTO expired_count 
    FROM listings 
    WHERE expires_at <= now();
    
    RAISE NOTICE 'Cleaning up % expired listings', expired_count;
    
    FOR deleted_listing IN 
        SELECT id, username, title 
        FROM listings 
        WHERE expires_at <= now()
    LOOP
        RAISE NOTICE 'Deleting expired listing: % (ID: %, User: %)', 
            deleted_listing.title, deleted_listing.id, deleted_listing.username;
        DELETE FROM listings WHERE id = deleted_listing.id;
    END LOOP;
    
    RAISE NOTICE 'Cleanup completed. Deleted % expired listings', expired_count;
END;
$$ LANGUAGE plpgsql;

-- Update extend_listing_expiration function
CREATE OR REPLACE FUNCTION extend_listing_expiration(
    listing_id_param uuid,
    extension_days integer DEFAULT 30
)
RETURNS json AS $$
DECLARE
    listing_record record;
    new_expires_at timestamp with time zone;
BEGIN
    SELECT * INTO listing_record 
    FROM listings 
    WHERE id = listing_id_param;
    
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Listing not found'
        );
    END IF;
    
    -- Remove is_active check since all listings are now active
    IF listing_record.expires_at <= now() THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Cannot extend expired listing'
        );
    END IF;
    
    new_expires_at = GREATEST(listing_record.expires_at, now()) + (extension_days || ' days')::interval;
    
    UPDATE listings 
    SET 
        expires_at = new_expires_at,
        extension_count = extension_count + 1
    WHERE id = listing_id_param;
    
    RETURN json_build_object(
        'success', true,
        'new_expires_at', new_expires_at,
        'extension_count', listing_record.extension_count + 1
    );
END;
$$ LANGUAGE plpgsql;

-- Drop existing create_listing_with_expiration functions to resolve overloading conflicts
-- Use CASCADE to drop all variations and dependencies
DROP FUNCTION IF EXISTS create_listing_with_expiration CASCADE;

-- Update create_listing_with_expiration function
CREATE OR REPLACE FUNCTION create_listing_with_expiration(
    username_param text,
    title_param text,
    description_param text,
    price_param numeric,
    category_param text,
    thumbnail_images_param text[] DEFAULT '{}',
    preview_images_param text[] DEFAULT '{}',
    latitude_param double precision DEFAULT NULL,
    longitude_param double precision DEFAULT NULL,
    expiration_days integer DEFAULT 30
)
RETURNS uuid AS $$
DECLARE
    new_listing_id uuid;
    expires_at_calc timestamp with time zone;
BEGIN
    expires_at_calc = now() + (expiration_days || ' days')::interval;
    
    INSERT INTO listings (
        username,
        title,
        description,
        price,
        category,
        thumbnail_images,
        preview_images,
        latitude,
        longitude,
        expires_at
    ) VALUES (
        username_param,
        title_param,
        description_param,
        price_param,
        category_param,
        thumbnail_images_param,
        preview_images_param,
        latitude_param,
        longitude_param,
        expires_at_calc
    ) RETURNING id INTO new_listing_id;
    
    RETURN new_listing_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- UPDATE ALL VIEWS AND FUNCTIONS THAT FILTER BY is_active
-- ============================================================================

-- Update send_ping_optimized function
DROP FUNCTION IF EXISTS send_ping_optimized(text, text, uuid, text);
CREATE OR REPLACE FUNCTION send_ping_optimized(
  sender_username TEXT,
  receiver_username TEXT,
  listing_id UUID,
  message TEXT DEFAULT ''
) RETURNS JSON AS $$
DECLARE
  ping_id UUID;
  chat_id UUID;
  message_id UUID;
  receiver_exists BOOLEAN;
  listing_exists BOOLEAN;
BEGIN
  -- Validate receiver and listing in single query
  SELECT EXISTS(SELECT 1 FROM users WHERE username = receiver_username AND isAvailable = true) INTO receiver_exists;
  SELECT EXISTS(SELECT 1 FROM listings WHERE id = listing_id) INTO listing_exists;
  
  IF NOT receiver_exists THEN
    RETURN json_build_object('success', false, 'error', 'Receiver not found or unavailable');
  END IF;
  
  IF NOT listing_exists THEN
    RETURN json_build_object('success', false, 'error', 'Listing not found');
  END IF;
  
  -- Single transaction for all operations
  INSERT INTO pings (sender_username, receiver_username, listing_id, message)
  VALUES (sender_username, receiver_username, listing_id, message)
  RETURNING id INTO ping_id;
  
  -- Upsert chat
  INSERT INTO chats (listing_id, participant_a, participant_b)
  VALUES (listing_id, sender_username, receiver_username)
  ON CONFLICT (listing_id, participant_a, participant_b) 
  DO UPDATE SET updated_at = NOW()
  RETURNING id INTO chat_id;
  
  -- Add message if provided
  IF message != '' THEN
    INSERT INTO messages (chat_id, sender_username, text)
    VALUES (chat_id, sender_username, message)
    RETURNING id INTO message_id;
  END IF;
  
  RETURN json_build_object(
    'success', true,
    'ping_id', ping_id,
    'chat_id', chat_id,
    'message_id', message_id
  );
END;
$$ LANGUAGE plpgsql;

-- Update get_listings_optimized_v2 function (first version)
DROP FUNCTION IF EXISTS get_listings_optimized_v2(double precision, double precision, integer, integer, integer, text);
CREATE OR REPLACE FUNCTION get_listings_optimized_v2(
  user_lat double precision,
  user_lng double precision,
  page_num integer DEFAULT 1,
  page_size integer DEFAULT 20,
  max_distance_km integer DEFAULT 50,
  category_filter text DEFAULT NULL
) RETURNS TABLE(
  id uuid,
  title text,
  description text,
  price numeric,
  price_unit text,
  category text,
  latitude double precision,
  longitude double precision,
  distance_km double precision,
  image_count integer,
  has_images boolean,
  created_at timestamp with time zone,
  seller_username text
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
    l.latitude,
    l.longitude,
    ST_Distance(
      l.location::geography,
      ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography
    ) / 1000 as distance_km,
    COALESCE(array_length(l.thumbnail_images, 1), 0) as image_count,
    COALESCE(array_length(l.thumbnail_images, 1), 0) > 0 as has_images,
    l.created_at,
    l.username as seller_username
  FROM listings l
  WHERE l.latitude IS NOT NULL 
    AND l.longitude IS NOT NULL
    AND ST_DWithin(
      l.location::geography,
      ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography,
      max_distance_km * 1000
    )
    AND (category_filter IS NULL OR l.category = category_filter)
  ORDER BY distance_km ASC, l.created_at DESC
  LIMIT page_size
  OFFSET (page_num - 1) * page_size;
END;
$$ LANGUAGE plpgsql;

-- Update get_listings_with_distance function
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
    image_folder_path text,
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
        l.image_folder_path,
        l.latitude,
        l.longitude,
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
    WHERE (category_filter IS NULL OR l.category = category_filter)
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

-- Update get_listings_optimized_v2 function (second version)
DROP FUNCTION IF EXISTS get_listings_optimized_v2(double precision, double precision, integer, text, integer);
CREATE OR REPLACE FUNCTION get_listings_optimized_v2(
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
    image_folder_path text,
    latitude double precision,
    longitude double precision,
    distance_km double precision,
    created_at timestamp with time zone,
    seller_username text,
    seller_name text,
    seller_avatar_url text,
    seller_phone text,
    seller_isAvailable boolean
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
        l.latitude,
        l.longitude,
        CASE 
            WHEN user_lat IS NOT NULL AND user_lng IS NOT NULL AND l.latitude IS NOT NULL AND l.longitude IS NOT NULL THEN
                ST_Distance(
                    ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geometry,
                    ST_SetSRID(ST_MakePoint(l.longitude, l.latitude), 4326)::geometry
                ) / 1000
            ELSE NULL
        END as distance_km,
        l.created_at,
        l.username as seller_username,
        u.name as seller_name,
        u.avatar_url as seller_avatar_url,
        u.phone as seller_phone,
        u.isAvailable as seller_isAvailable
    FROM listings l
    LEFT JOIN users u ON l.username = u.username
    WHERE (category_filter IS NULL OR l.category = category_filter)
        AND (user_lat IS NULL OR user_lng IS NULL OR l.latitude IS NULL OR l.longitude IS NULL OR
             ST_DWithin(
                 ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geometry,
                 ST_SetSRID(ST_MakePoint(l.longitude, l.latitude), 4326)::geometry,
                 max_distance_km * 1000
             ))
    ORDER BY 
        CASE WHEN user_lat IS NOT NULL AND user_lng IS NOT NULL THEN distance_km ELSE 0 END ASC,
        l.created_at DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Update materialized view for analytics
DROP MATERIALIZED VIEW IF EXISTS listing_analytics;
CREATE MATERIALIZED VIEW listing_analytics AS
SELECT 
  category,
  COUNT(*) as total_listings,
  COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') as new_this_week,
  AVG(price) as avg_price,
  COUNT(*) FILTER (WHERE array_length(thumbnail_images, 1) > 0) as listings_with_images
FROM listings 
GROUP BY category;

CREATE UNIQUE INDEX IF NOT EXISTS idx_listing_analytics_category 
ON listing_analytics(category);

-- ============================================================================
-- DROP AND RECREATE INDEXES THAT REFERENCE is_active
-- ============================================================================

-- Drop indexes that include is_active
DROP INDEX IF EXISTS idx_listings_is_active;
DROP INDEX IF EXISTS idx_listings_active_expires;
DROP INDEX IF EXISTS idx_listings_category_active;
DROP INDEX IF EXISTS idx_listings_images_performance;

-- Recreate indexes without is_active
CREATE INDEX IF NOT EXISTS idx_listings_expires ON listings(expires_at);
CREATE INDEX IF NOT EXISTS idx_listings_category_created ON listings(category, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_listings_username_created ON listings(username, created_at DESC);

-- ============================================================================
-- UPDATE ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- Drop existing RLS policies that reference is_active
DROP POLICY IF EXISTS "Enable read access for active listings" ON listings;

-- Create or replace RLS policy without is_active filter
DROP POLICY IF EXISTS "Enable read access for all listings" ON listings;
CREATE POLICY "Enable read access for all listings" ON listings
FOR SELECT USING (true);

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE 'is_active and updated_at columns removed from listings table';
    RAISE NOTICE 'All listings are now considered active by default';
    RAISE NOTICE 'All functions updated to remove is_active and updated_at references';
    RAISE NOTICE 'All indexes recreated without is_active column';
END $$;
