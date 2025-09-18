-- ============================================================================
-- SAFE MIGRATION SCRIPT - HANDLES EXISTING TABLES AND COLUMNS
-- ============================================================================

-- ============================================================================
-- ENSURE REQUESTS TABLE EXISTS WITH PROPER STRUCTURE
-- ============================================================================

-- First, check if requests table exists and create if not
CREATE TABLE IF NOT EXISTS public.requests (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    requester_username text NOT NULL,
    title text NOT NULL,
    description text,
    budget_min numeric(10,2),
    budget_max numeric(10,2),
    category text NOT NULL,
    location text, -- Human readable location
    latitude double precision,
    longitude double precision,
    expires_at timestamp with time zone -- Variable expiry (no default)
);

-- ============================================================================
-- ADD UNIFIED COLUMNS TO REQUESTS TABLE (SAFELY)
-- ============================================================================

-- Add unified fields to requests table
ALTER TABLE requests ADD COLUMN IF NOT EXISTS username text;
ALTER TABLE requests ADD COLUMN IF NOT EXISTS price numeric(10,2) DEFAULT 0;
ALTER TABLE requests ADD COLUMN IF NOT EXISTS price_unit text DEFAULT 'budget';
ALTER TABLE requests ADD COLUMN IF NOT EXISTS item_type text DEFAULT 'request';

-- Add image fields
ALTER TABLE requests ADD COLUMN IF NOT EXISTS thumbnail_images text[] DEFAULT '{}';
ALTER TABLE requests ADD COLUMN IF NOT EXISTS preview_images text[] DEFAULT '{}';
ALTER TABLE requests ADD COLUMN IF NOT EXISTS image_url text;
ALTER TABLE requests ADD COLUMN IF NOT EXISTS image_folder_path text;

-- Add location geometry field (CRITICAL: must be geometry type for GIST index)
ALTER TABLE requests ADD COLUMN IF NOT EXISTS location_geometry geometry(POINT, 4326);

-- Add pickup and delivery options
ALTER TABLE requests ADD COLUMN IF NOT EXISTS pickup_available boolean DEFAULT false;
ALTER TABLE requests ADD COLUMN IF NOT EXISTS delivery_available boolean DEFAULT false;

-- Add engagement metrics
ALTER TABLE requests ADD COLUMN IF NOT EXISTS view_count integer DEFAULT 0;
ALTER TABLE requests ADD COLUMN IF NOT EXISTS ping_count integer DEFAULT 0;

-- Add created_at if missing (no updated_at needed)
ALTER TABLE requests ADD COLUMN IF NOT EXISTS created_at timestamp with time zone DEFAULT timezone('utc', now());

-- ============================================================================
-- UPDATE DATA TO MATCH UNIFIED STRUCTURE
-- ============================================================================

-- Update username to match requester_username for consistency
UPDATE requests SET username = requester_username WHERE username IS NULL;

-- Update price to match budget_min for unified pricing
UPDATE requests SET price = budget_min WHERE price IS NULL AND budget_min IS NOT NULL;

-- Remove price_unit for requests (requests don't use pricing units)
UPDATE requests SET price_unit = NULL WHERE price_unit IS NOT NULL;

-- Update location geometry from lat/lng if available
UPDATE requests SET 
  location_geometry = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)
WHERE latitude IS NOT NULL 
  AND longitude IS NOT NULL 
  AND location_geometry IS NULL;

-- ============================================================================
-- CREATE INDEXES (SAFELY)
-- ============================================================================

-- Spatial index for location queries (ONLY on geometry column)
CREATE INDEX IF NOT EXISTS idx_requests_location_geometry ON requests USING GIST (location_geometry);

-- Regular indexes for common queries
CREATE INDEX IF NOT EXISTS idx_requests_requester_username ON requests(requester_username);
CREATE INDEX IF NOT EXISTS idx_requests_username ON requests(username);
CREATE INDEX IF NOT EXISTS idx_requests_category ON requests(category);
CREATE INDEX IF NOT EXISTS idx_requests_price ON requests(price);
CREATE INDEX IF NOT EXISTS idx_requests_created_at ON requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_requests_expires_at ON requests(expires_at);
CREATE INDEX IF NOT EXISTS idx_requests_view_count ON requests(view_count DESC);
CREATE INDEX IF NOT EXISTS idx_requests_ping_count ON requests(ping_count DESC);
CREATE INDEX IF NOT EXISTS idx_requests_pickup_available ON requests(pickup_available);
CREATE INDEX IF NOT EXISTS idx_requests_delivery_available ON requests(delivery_available);

-- Composite indexes
CREATE INDEX IF NOT EXISTS idx_requests_category_created ON requests(category, created_at DESC);

-- ============================================================================
-- ENSURE LISTINGS TABLE HAS PROPER STRUCTURE
-- ============================================================================

-- Add missing columns to listings table if they don't exist
ALTER TABLE listings ADD COLUMN IF NOT EXISTS thumbnail_images text[] DEFAULT '{}';
ALTER TABLE listings ADD COLUMN IF NOT EXISTS preview_images text[] DEFAULT '{}';
ALTER TABLE listings ADD COLUMN IF NOT EXISTS image_url text;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS image_folder_path text;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS price_unit text DEFAULT 'per_item';
ALTER TABLE listings ADD COLUMN IF NOT EXISTS location geometry(POINT, 4326);
ALTER TABLE listings ADD COLUMN IF NOT EXISTS view_count integer DEFAULT 0;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS ping_count integer DEFAULT 0;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS extension_count integer DEFAULT 0;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS expires_at timestamp with time zone; -- Variable expiry (no default)

-- Add pickup and delivery options for listings
ALTER TABLE listings ADD COLUMN IF NOT EXISTS pickup_available boolean DEFAULT false;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS delivery_available boolean DEFAULT false;

-- ============================================================================
-- CREATE LISTINGS INDEXES (SAFELY)
-- ============================================================================

-- Spatial index for listings location (ONLY on geometry column)
CREATE INDEX IF NOT EXISTS idx_listings_location_geometry ON listings USING GIST (location);

-- Regular indexes for listings
CREATE INDEX IF NOT EXISTS idx_listings_username ON listings(username);
CREATE INDEX IF NOT EXISTS idx_listings_category ON listings(category);
CREATE INDEX IF NOT EXISTS idx_listings_price ON listings(price);
CREATE INDEX IF NOT EXISTS idx_listings_created_at ON listings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_listings_expires_at ON listings(expires_at);
CREATE INDEX IF NOT EXISTS idx_listings_view_count ON listings(view_count DESC);
CREATE INDEX IF NOT EXISTS idx_listings_ping_count ON listings(ping_count DESC);
CREATE INDEX IF NOT EXISTS idx_listings_pickup_available ON listings(pickup_available);
CREATE INDEX IF NOT EXISTS idx_listings_delivery_available ON listings(delivery_available);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

-- Enable RLS on requests table
ALTER TABLE requests ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Requests are viewable by everyone" ON requests;
DROP POLICY IF EXISTS "Users can create requests" ON requests;
DROP POLICY IF EXISTS "Users can update their own requests" ON requests;
DROP POLICY IF EXISTS "Users can delete their own requests" ON requests;

-- Create new policies
CREATE POLICY "Requests are viewable by everyone" ON requests
  FOR SELECT USING (true);

CREATE POLICY "Users can create requests" ON requests
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND requester_username = auth.jwt() ->> 'username');

CREATE POLICY "Users can update their own requests" ON requests
  FOR UPDATE USING (auth.uid() IS NOT NULL AND requester_username = auth.jwt() ->> 'username');

CREATE POLICY "Users can delete their own requests" ON requests
  FOR DELETE USING (auth.uid() IS NOT NULL AND requester_username = auth.jwt() ->> 'username');

-- ============================================================================
-- ESSENTIAL FUNCTIONS
-- ============================================================================

-- Function to increment request view count
CREATE OR REPLACE FUNCTION increment_request_views(request_id_param uuid)
RETURNS void AS $$
BEGIN
    UPDATE requests 
    SET view_count = view_count + 1
    WHERE id = request_id_param;
END;
$$ LANGUAGE plpgsql;

-- Function to increment request ping count
CREATE OR REPLACE FUNCTION increment_request_pings(request_id_param uuid)
RETURNS void AS $$
BEGIN
    UPDATE requests 
    SET ping_count = ping_count + 1
    WHERE id = request_id_param;
END;
$$ LANGUAGE plpgsql;

-- Function to increment listing view count
CREATE OR REPLACE FUNCTION increment_listing_views(listing_id_param uuid)
RETURNS void AS $$
BEGIN
    UPDATE listings 
    SET view_count = view_count + 1
    WHERE id = listing_id_param;
END;
$$ LANGUAGE plpgsql;

-- Function to increment listing ping count
CREATE OR REPLACE FUNCTION increment_listing_pings(listing_id_param uuid)
RETURNS void AS $$
BEGIN
    UPDATE listings 
    SET ping_count = ping_count + 1
    WHERE id = listing_id_param;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- UNIFIED MARKETPLACE FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION get_marketplace_items_with_distance(
    user_lat double precision,
    user_lng double precision,
    max_distance_km integer DEFAULT 1000,
    item_type_filter text DEFAULT NULL,
    category_filter text DEFAULT NULL,
    limit_count integer DEFAULT 20
)
RETURNS TABLE(
    id uuid,
    username text,
    title text,
    description text,
    price numeric(10,2),
    price_unit text,
    category text,
    item_type text,
    thumbnail_images text[],
    preview_images text[],
    image_url text,
    latitude double precision,
    longitude double precision,
    distance_km double precision,
    expires_at timestamp with time zone,
    view_count integer,
    ping_count integer,
    extension_count integer,
    budget_min numeric(10,2),
    budget_max numeric(10,2),
    created_at timestamp with time zone
) AS $$
BEGIN
    RETURN QUERY
    WITH user_location AS (
        SELECT ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326) as point
    ),
    unified_items AS (
        -- Listings
        SELECT 
            l.id,
            l.username,
            l.title,
            l.description,
            l.price,
            l.price_unit,
            l.category,
            'listing'::text as item_type,
            l.thumbnail_images,
            l.preview_images,
            l.image_url,
            l.latitude,
            l.longitude,
            ST_Distance(l.location, ul.point) / 1000 as distance_km,
            l.expires_at,
            l.view_count,
            l.ping_count,
            l.extension_count,
            NULL::numeric(10,2) as budget_min,
            NULL::numeric(10,2) as budget_max,
            l.created_at
        FROM listings l
        CROSS JOIN user_location ul
        WHERE 
            l.expires_at > NOW()
            AND (item_type_filter IS NULL OR item_type_filter = 'listing')
            AND (category_filter IS NULL OR l.category = category_filter)
            AND (max_distance_km IS NULL OR ST_Distance(l.location, ul.point) / 1000 <= max_distance_km)
        
        UNION ALL
        
        -- Requests
        SELECT 
            r.id,
            r.username,
            r.title,
            r.description,
            r.price,
            r.price_unit,
            r.category,
            'request'::text as item_type,
            r.thumbnail_images,
            r.preview_images,
            r.image_url,
            r.latitude,
            r.longitude,
            ST_Distance(r.location_geometry, ul.point) / 1000 as distance_km,
            r.expires_at,
            r.view_count,
            r.ping_count,
            NULL::integer as extension_count,
            r.budget_min,
            r.budget_max,
            r.created_at
        FROM requests r
        CROSS JOIN user_location ul
        WHERE 
            r.expires_at > NOW()
            AND (item_type_filter IS NULL OR item_type_filter = 'request')
            AND (category_filter IS NULL OR r.category = category_filter)
            AND (max_distance_km IS NULL OR ST_Distance(r.location_geometry, ul.point) / 1000 <= max_distance_km)
    )
    SELECT * FROM unified_items
        ORDER BY 
        distance_km ASC,
        created_at DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE requests IS 'Marketplace requests table with unified structure';
COMMENT ON COLUMN requests.username IS 'Unified field name (same as requester_username)';
COMMENT ON COLUMN requests.price IS 'Unified price field (maps to budget_min for requests)';
COMMENT ON COLUMN requests.price_unit IS 'Unified pricing unit (budget for requests)';
COMMENT ON COLUMN requests.location_geometry IS 'PostGIS geometry point for spatial queries';
COMMENT ON COLUMN requests.item_type IS 'Item type identifier for unified queries (always request)';
COMMENT ON COLUMN requests.pickup_available IS 'Whether pickup is available for this request';
COMMENT ON COLUMN requests.delivery_available IS 'Whether delivery is available for this request';
COMMENT ON COLUMN listings.pickup_available IS 'Whether pickup is available for this listing';
COMMENT ON COLUMN listings.delivery_available IS 'Whether delivery is available for this listing';
