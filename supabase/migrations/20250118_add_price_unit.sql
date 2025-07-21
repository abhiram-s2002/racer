-- Migration: Add price_unit field to listings table
-- Date: 2025-01-18
-- Description: Adds price_unit field to support category-specific pricing units

-- Add price_unit column to listings table
ALTER TABLE listings 
ADD COLUMN IF NOT EXISTS price_unit text DEFAULT 'per_item';

-- Add index for price_unit for better query performance
CREATE INDEX IF NOT EXISTS idx_listings_price_unit ON listings(price_unit);

-- Update existing listings to have a default price_unit
UPDATE listings 
SET price_unit = 'per_item' 
WHERE price_unit IS NULL;

-- Add comment to document the field
COMMENT ON COLUMN listings.price_unit IS 'Pricing unit for the listing (e.g., per_kg, per_hour, per_piece)';

-- Create a function to validate price units based on category
CREATE OR REPLACE FUNCTION validate_price_unit(category_param text, price_unit_param text)
RETURNS boolean AS $$
BEGIN
  -- Define valid price units for each category
  CASE category_param
    WHEN 'groceries' THEN
      RETURN price_unit_param IN ('per_kg', 'per_piece', 'per_pack', 'per_bundle', 'per_item');
    WHEN 'fruits' THEN
      RETURN price_unit_param IN ('per_kg', 'per_dozen', 'per_piece', 'per_basket', 'per_item');
    WHEN 'food' THEN
      RETURN price_unit_param IN ('per_plate', 'per_serving', 'per_piece', 'per_kg', 'per_item');
    WHEN 'services' THEN
      RETURN price_unit_param IN ('per_hour', 'per_service', 'per_session', 'per_day', 'per_item');
    WHEN 'art' THEN
      RETURN price_unit_param IN ('per_piece', 'per_commission', 'per_hour', 'per_project', 'per_item');
    WHEN 'rental' THEN
      RETURN price_unit_param IN ('per_day', 'per_week', 'per_month', 'per_hour', 'per_item');
    ELSE
      -- For unknown categories, allow common units
      RETURN price_unit_param IN ('per_item', 'per_piece', 'per_service', 'per_hour', 'per_day');
  END CASE;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to validate price_unit on insert/update
CREATE OR REPLACE FUNCTION validate_listing_price_unit()
RETURNS trigger AS $$
BEGIN
  -- Skip validation if price_unit is not provided (will use default)
  IF NEW.price_unit IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Validate price_unit against category
  IF NOT validate_price_unit(NEW.category, NEW.price_unit) THEN
    RAISE EXCEPTION 'Invalid price_unit "%" for category "%"', NEW.price_unit, NEW.category;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for price_unit validation
DROP TRIGGER IF EXISTS trigger_validate_price_unit ON listings;
CREATE TRIGGER trigger_validate_price_unit
  BEFORE INSERT OR UPDATE ON listings
  FOR EACH ROW
  EXECUTE FUNCTION validate_listing_price_unit();

-- Drop the existing function first, then recreate with price_unit
DROP FUNCTION IF EXISTS get_listings_with_distance(double precision, double precision, integer, integer, integer);

-- Fix the create_ping_with_limits function to handle all columns properly
DROP FUNCTION IF EXISTS create_ping_with_limits(uuid, text, text, text);

-- Update the get_listings_with_distance function to include price_unit
CREATE OR REPLACE FUNCTION get_listings_with_distance(
  user_lat double precision,
  user_lng double precision,
  page_num integer DEFAULT 1,
  page_size integer DEFAULT 20,
  max_distance_km integer DEFAULT 1000
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
  image_url text,
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
    l.image_url,
    l.is_active,
    l.latitude,
    l.longitude,
    ST_Distance(
      l.location::geography,
      ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography
    ) / 1000.0 as distance_km,
    l.created_at,
    l.updated_at
  FROM listings l
  WHERE l.is_active = true
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