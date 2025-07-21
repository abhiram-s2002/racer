-- Migration: 20250119_complete_listing_expiration.sql
-- Complete listing expiration system with simplified approach

-- Add expiration date fields to listings table
ALTER TABLE listings 
ADD COLUMN IF NOT EXISTS expires_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS extension_count integer DEFAULT 0;

-- Add default expiration (30 days from creation) for existing listings
UPDATE listings 
SET expires_at = created_at + INTERVAL '30 days'
WHERE expires_at IS NULL;

-- Create indexes for expiration queries
CREATE INDEX IF NOT EXISTS idx_listings_expires_at ON listings(expires_at);
CREATE INDEX IF NOT EXISTS idx_listings_active_expires ON listings(is_active, expires_at);
CREATE INDEX IF NOT EXISTS idx_listings_expires_at_desc ON listings(expires_at DESC);

-- Automatic cleanup function
CREATE OR REPLACE FUNCTION cleanup_expired_listings()
RETURNS void AS $$
DECLARE
    expired_count integer;
    deleted_listing record;
BEGIN
    SELECT COUNT(*) INTO expired_count 
    FROM listings 
    WHERE expires_at <= now() AND is_active = true;
    
    RAISE NOTICE 'Cleaning up % expired listings', expired_count;
    
    FOR deleted_listing IN 
        SELECT id, username, title 
        FROM listings 
        WHERE expires_at <= now() AND is_active = true
    LOOP
        RAISE NOTICE 'Deleting expired listing: % (ID: %, User: %)', 
            deleted_listing.title, deleted_listing.id, deleted_listing.username;
        DELETE FROM listings WHERE id = deleted_listing.id;
    END LOOP;
    
    RAISE NOTICE 'Cleanup completed. Deleted % expired listings', expired_count;
END;
$$ LANGUAGE plpgsql;

-- Extension function
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
    
    IF NOT listing_record.is_active THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Cannot extend inactive listing'
        );
    END IF;
    
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
        extension_count = extension_count + 1,
        updated_at = now()
    WHERE id = listing_id_param;
    
    RETURN json_build_object(
        'success', true,
        'new_expires_at', new_expires_at,
        'extension_count', listing_record.extension_count + 1
    );
END;
$$ LANGUAGE plpgsql;

-- Create listing with expiration
CREATE OR REPLACE FUNCTION create_listing_with_expiration(
    username_param text,
    title_param text,
    description_param text,
    price_param numeric,
    category_param text,
    images_param text[] DEFAULT '{}',
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
        images,
        latitude,
        longitude,
        expires_at,
        is_active
    ) VALUES (
        username_param,
        title_param,
        description_param,
        price_param,
        category_param,
        images_param,
        latitude_param,
        longitude_param,
        expires_at_calc,
        true
    ) RETURNING id INTO new_listing_id;
    
    RETURN new_listing_id;
END;
$$ LANGUAGE plpgsql;

-- Get listing expiration status
CREATE OR REPLACE FUNCTION get_listing_expiration_status(listing_id_param uuid)
RETURNS json AS $$
DECLARE
    listing_record record;
    days_until_expiry integer;
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
    
    days_until_expiry = EXTRACT(DAY FROM (listing_record.expires_at - now()))::integer;
    
    RETURN json_build_object(
        'success', true,
        'expires_at', listing_record.expires_at,
        'days_until_expiry', days_until_expiry,
        'is_expired', days_until_expiry <= 0,
        'extension_count', listing_record.extension_count
    );
END;
$$ LANGUAGE plpgsql;

-- Drop existing function first
DROP FUNCTION IF EXISTS get_listings_with_distance(double precision, double precision, integer, integer, integer);

-- Update get_listings_with_distance function
CREATE OR REPLACE FUNCTION get_listings_with_distance(
    user_lat double precision,
    user_lng double precision,
    page_num integer DEFAULT 1,
    page_size integer DEFAULT 20,
    max_distance_km integer DEFAULT 1000
)
RETURNS TABLE (
    id uuid,
    username text,
    title text,
    description text,
    price numeric,
    category text,
    images text[],
    thumbnail_images text[],
    preview_images text[],
    image_url text,
    is_active boolean,
    latitude double precision,
    longitude double precision,
    distance_km double precision,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    expires_at timestamp with time zone,
    extension_count integer,
    days_until_expiry integer
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
        l.image_url,
        l.is_active,
        l.latitude,
        l.longitude,
        ST_Distance(
            l.location::geography,
            ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography
        ) / 1000.0 as distance_km,
        l.created_at,
        l.updated_at,
        l.expires_at,
        l.extension_count,
        EXTRACT(DAY FROM (l.expires_at - now()))::integer as days_until_expiry
    FROM listings l
    WHERE l.is_active = true 
        AND l.expires_at > now()
        AND l.latitude IS NOT NULL 
        AND l.longitude IS NOT NULL
        AND ST_Distance(
            l.location::geography,
            ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography
        ) <= (max_distance_km * 1000)
    ORDER BY distance_km ASC
    LIMIT page_size
    OFFSET ((page_num - 1) * page_size);
END;
$$ LANGUAGE plpgsql;

-- Add comments
COMMENT ON COLUMN listings.expires_at IS 'Date when the listing automatically expires and becomes inactive';
COMMENT ON COLUMN listings.extension_count IS 'Number of times the listing has been extended (for tracking purposes)'; 