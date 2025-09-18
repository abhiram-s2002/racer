-- Migration to unify requests table with listings table structure
-- This adds missing columns to requests table to match listings schema

-- Add image fields to requests table
ALTER TABLE requests ADD COLUMN IF NOT EXISTS thumbnail_images TEXT[];
ALTER TABLE requests ADD COLUMN IF NOT EXISTS preview_images TEXT[];
ALTER TABLE requests ADD COLUMN IF NOT EXISTS image_url TEXT; -- Legacy field for backward compatibility

-- Add location geography field (same as listings)
ALTER TABLE requests ADD COLUMN IF NOT EXISTS location geography(POINT, 4326);

-- Add pricing fields (for budget display)
ALTER TABLE requests ADD COLUMN IF NOT EXISTS price DECIMAL(10,2);
ALTER TABLE requests ADD COLUMN IF NOT EXISTS price_unit TEXT DEFAULT 'per_item';

-- Add listing-like fields
ALTER TABLE requests ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;
ALTER TABLE requests ADD COLUMN IF NOT EXISTS ping_count INTEGER DEFAULT 0;

-- Add urgency field for requests
ALTER TABLE requests ADD COLUMN IF NOT EXISTS urgency TEXT DEFAULT 'normal' CHECK (urgency IN ('urgent', 'normal', 'flexible'));

-- Update existing requests to have proper data structure
UPDATE requests SET 
  price = COALESCE(budget_min, 0),
  price_unit = 'budget',
  thumbnail_images = '{}',
  preview_images = '{}'
WHERE price IS NULL;

-- Update location geography from lat/lng if available
UPDATE requests SET 
  location = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)
WHERE latitude IS NOT NULL 
  AND longitude IS NOT NULL 
  AND location IS NULL;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_requests_location ON requests USING GIST (location);
CREATE INDEX IF NOT EXISTS idx_requests_category ON requests (category);
CREATE INDEX IF NOT EXISTS idx_requests_urgency ON requests (urgency);
CREATE INDEX IF NOT EXISTS idx_requests_price ON requests (price);

-- Update the RPC function to handle the new unified structure
CREATE OR REPLACE FUNCTION get_requests_hierarchical(
  user_state TEXT DEFAULT NULL,
  user_district TEXT DEFAULT NULL,
  user_city TEXT DEFAULT NULL,
  category_filter TEXT DEFAULT NULL,
  limit_count INTEGER DEFAULT 20,
  offset_count INTEGER DEFAULT 0
)
RETURNS TABLE (
  id TEXT,
  requester_username TEXT,
  title TEXT,
  description TEXT,
  budget_min DECIMAL(10,2),
  budget_max DECIMAL(10,2),
  price DECIMAL(10,2),
  price_unit TEXT,
  category TEXT,
  urgency TEXT,
  location TEXT,
  location_name TEXT,
  location_district TEXT,
  location_state TEXT,
  latitude DECIMAL,
  longitude DECIMAL,
  distance_km DECIMAL,
  thumbnail_images TEXT[],
  preview_images TEXT[],
  image_url TEXT,
  view_count INTEGER,
  ping_count INTEGER,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  WITH location_filter AS (
    SELECT 
      CASE 
        WHEN user_state IS NOT NULL THEN user_state
        WHEN user_district IS NOT NULL THEN user_district
        WHEN user_city IS NOT NULL THEN user_city
        ELSE NULL
      END as location_filter
  ),
  filtered_requests AS (
    SELECT 
      r.id,
      r.requester_username,
      r.title,
      r.description,
      r.budget_min,
      r.budget_max,
      r.price,
      r.price_unit,
      r.category,
      r.urgency,
      r.location,
      r.location_name,
      r.location_district,
      r.location_state,
      r.latitude,
      r.longitude,
      r.thumbnail_images,
      r.preview_images,
      r.image_url,
      r.view_count,
      r.ping_count,
      r.expires_at,
      r.created_at,
      r.updated_at
    FROM requests r
    CROSS JOIN location_filter lf
    WHERE 
      r.expires_at > NOW()
      AND (category_filter IS NULL OR r.category = category_filter)
      AND (
        lf.location_filter IS NULL 
        OR r.location_state = lf.location_filter
        OR r.location_district = lf.location_filter
        OR r.location_name = lf.location_filter
      )
    ORDER BY 
      CASE WHEN r.urgency = 'urgent' THEN 1 ELSE 2 END,
      r.created_at DESC
    LIMIT limit_count
    OFFSET offset_count
  )
  SELECT 
    fr.id,
    fr.requester_username,
    fr.title,
    fr.description,
    fr.budget_min,
    fr.budget_max,
    fr.price,
    fr.price_unit,
    fr.category,
    fr.urgency,
    fr.location::TEXT,
    fr.location_name,
    fr.location_district,
    fr.location_state,
    fr.latitude,
    fr.longitude,
    NULL::DECIMAL as distance_km, -- Will be calculated in application
    fr.thumbnail_images,
    fr.preview_images,
    fr.image_url,
    fr.view_count,
    fr.ping_count,
    fr.expires_at,
    fr.created_at,
    fr.updated_at
  FROM filtered_requests fr;
END;
$$ LANGUAGE plpgsql;

-- Create a new unified function that can handle both listings and requests with distance
CREATE OR REPLACE FUNCTION get_marketplace_items_with_distance(
  user_lat DECIMAL,
  user_lng DECIMAL,
  max_distance_km INTEGER DEFAULT 1000,
  item_type_filter TEXT DEFAULT NULL, -- 'listing', 'request', or NULL for both
  category_filter TEXT DEFAULT NULL,
  limit_count INTEGER DEFAULT 20
)
RETURNS TABLE (
  id TEXT,
  username TEXT,
  requester_username TEXT,
  title TEXT,
  description TEXT,
  price DECIMAL(10,2),
  price_unit TEXT,
  category TEXT,
  item_type TEXT,
  budget_min DECIMAL(10,2),
  budget_max DECIMAL(10,2),
  urgency TEXT,
  location geography,
  location_name TEXT,
  location_district TEXT,
  location_state TEXT,
  latitude DECIMAL,
  longitude DECIMAL,
  distance_km DECIMAL,
  thumbnail_images TEXT[],
  preview_images TEXT[],
  image_url TEXT,
  view_count INTEGER,
  ping_count INTEGER,
  extension_count INTEGER,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
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
      NULL::TEXT as requester_username,
      l.title,
      l.description,
      l.price,
      l.price_unit,
      l.category,
      'listing'::TEXT as item_type,
      NULL::DECIMAL(10,2) as budget_min,
      NULL::DECIMAL(10,2) as budget_max,
      NULL::TEXT as urgency,
      l.location,
      NULL::TEXT as location_name,
      NULL::TEXT as location_district,
      NULL::TEXT as location_state,
      l.latitude,
      l.longitude,
      ST_Distance(l.location, ul.point) / 1000 as distance_km,
      l.thumbnail_images,
      l.preview_images,
      l.image_url,
      l.view_count,
      l.ping_count,
      l.extension_count,
      l.expires_at,
      l.created_at,
      NULL::TIMESTAMPTZ as updated_at
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
      r.requester_username as username,
      r.requester_username,
      r.title,
      r.description,
      r.price,
      r.price_unit,
      r.category,
      'request'::TEXT as item_type,
      r.budget_min,
      r.budget_max,
      r.urgency,
      r.location,
      r.location_name,
      r.location_district,
      r.location_state,
      r.latitude,
      r.longitude,
      ST_Distance(r.location, ul.point) / 1000 as distance_km,
      r.thumbnail_images,
      r.preview_images,
      r.image_url,
      r.view_count,
      r.ping_count,
      NULL::INTEGER as extension_count,
      r.expires_at,
      r.created_at,
      r.updated_at
    FROM requests r
    CROSS JOIN user_location ul
    WHERE 
      r.expires_at > NOW()
      AND (item_type_filter IS NULL OR item_type_filter = 'request')
      AND (category_filter IS NULL OR r.category = category_filter)
      AND (max_distance_km IS NULL OR ST_Distance(r.location, ul.point) / 1000 <= max_distance_km)
  )
  SELECT * FROM unified_items
  ORDER BY 
    CASE WHEN item_type = 'request' AND urgency = 'urgent' THEN 1 ELSE 2 END,
    distance_km ASC,
    created_at DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Add RLS policies for the new columns
ALTER TABLE requests ENABLE ROW LEVEL SECURITY;

-- Policy for reading requests (same as before but with new columns)
DROP POLICY IF EXISTS "Requests are viewable by everyone" ON requests;
CREATE POLICY "Requests are viewable by everyone" ON requests
  FOR SELECT USING (true);

-- Policy for creating requests
DROP POLICY IF EXISTS "Users can create requests" ON requests;
CREATE POLICY "Users can create requests" ON requests
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND requester_username = auth.jwt() ->> 'username');

-- Policy for updating requests (only by requester)
DROP POLICY IF EXISTS "Users can update their own requests" ON requests;
CREATE POLICY "Users can update their own requests" ON requests
  FOR UPDATE USING (auth.uid() IS NOT NULL AND requester_username = auth.jwt() ->> 'username');

-- Policy for deleting requests (only by requester)
DROP POLICY IF EXISTS "Users can delete their own requests" ON requests;
CREATE POLICY "Users can delete their own requests" ON requests
  FOR DELETE USING (auth.uid() IS NOT NULL AND requester_username = auth.jwt() ->> 'username');

-- Add comments for documentation
COMMENT ON COLUMN requests.thumbnail_images IS 'Array of thumbnail image URLs for the request';
COMMENT ON COLUMN requests.preview_images IS 'Array of preview image URLs for the request';
COMMENT ON COLUMN requests.image_url IS 'Legacy single image URL field for backward compatibility';
COMMENT ON COLUMN requests.location IS 'PostGIS geography point for spatial queries';
COMMENT ON COLUMN requests.price IS 'Primary price field (maps to budget_min for requests)';
COMMENT ON COLUMN requests.price_unit IS 'Unit for the price field (budget for requests)';
COMMENT ON COLUMN requests.view_count IS 'Number of times this request has been viewed';
COMMENT ON COLUMN requests.ping_count IS 'Number of responses/pings this request has received';
COMMENT ON COLUMN requests.urgency IS 'Urgency level: urgent, normal, or flexible';
