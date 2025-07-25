-- Migration to fix ping location data
-- This migration updates the ping queries to include location data

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS get_listing_with_location;

-- Create function to get listing with location data
CREATE OR REPLACE FUNCTION get_listing_with_location(listing_id_param uuid)
RETURNS TABLE (
  id uuid,
  title text,
  price numeric,
  images text[],
  thumbnail_images text[],
  preview_images text[],
  image_folder_path text,
  username text,
  latitude double precision,
  longitude double precision
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    l.id,
    l.title,
    l.price,
    l.images,
    l.thumbnail_images,
    l.preview_images,
    l.image_folder_path,
    l.username,
    l.latitude,
    l.longitude
  FROM listings l
  WHERE l.id = listing_id_param;
END;
$$ LANGUAGE plpgsql;

-- Update the pings table to include a view that joins with listings
CREATE OR REPLACE VIEW pings_with_listings AS
SELECT 
  p.*,
  l.title as listing_title,
  l.price as listing_price,
  l.images as listing_images,
  l.thumbnail_images as listing_thumbnail_images,
  l.preview_images as listing_preview_images,
  l.image_folder_path as listing_image_folder_path,
  l.latitude as listing_latitude,
  l.longitude as listing_longitude,
  l.username as listing_username
FROM pings p
JOIN listings l ON p.listing_id = l.id;

-- Grant necessary permissions
GRANT SELECT ON pings_with_listings TO authenticated;
GRANT EXECUTE ON FUNCTION get_listing_with_location TO authenticated;

-- Verify the changes
SELECT 
  'Migration Status' as check_type,
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_listing_with_location') 
    THEN '✅ get_listing_with_location function created'
    ELSE '❌ get_listing_with_location function missing'
  END as function_status,
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_views WHERE viewname = 'pings_with_listings') 
    THEN '✅ pings_with_listings view created'
    ELSE '❌ pings_with_listings view missing'
  END as view_status; 