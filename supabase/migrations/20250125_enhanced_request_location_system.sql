-- Enhanced Request Location System Migration
-- Migration: 20250125_enhanced_request_location_system.sql
-- This migration adds hierarchical location fields to the requests table for better performance and cost optimization

-- ============================================================================
-- ENHANCE REQUESTS TABLE WITH LOCATION HIERARCHY
-- ============================================================================

-- Add hierarchical location fields to requests table
ALTER TABLE requests 
ADD COLUMN IF NOT EXISTS location_name text,
ADD COLUMN IF NOT EXISTS location_district text,
ADD COLUMN IF NOT EXISTS location_state text;

-- Add indexes for efficient hierarchical location queries
CREATE INDEX IF NOT EXISTS idx_requests_location_state 
ON requests(location_state) 
WHERE location_state IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_requests_location_district 
ON requests(location_district) 
WHERE location_district IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_requests_location_name 
ON requests(location_name) 
WHERE location_name IS NOT NULL;

-- Composite index for hierarchical sorting
CREATE INDEX IF NOT EXISTS idx_requests_location_hierarchy
ON requests(location_state, location_district, location_name, updated_at DESC)
WHERE location_state IS NOT NULL;

-- Index for expiration cleanup
CREATE INDEX IF NOT EXISTS idx_requests_expires_at
ON requests(expires_at)
WHERE expires_at IS NOT NULL;

-- ============================================================================
-- LOCATION PARSING FUNCTION
-- ============================================================================

-- Function to parse location text into hierarchical components
CREATE OR REPLACE FUNCTION parse_location_hierarchy(location_text text)
RETURNS TABLE (
  location_name text,
  location_district text,
  location_state text
) AS $$
DECLARE
  parts text[];
  part_count integer;
BEGIN
  -- Return empty if no location text
  IF location_text IS NULL OR trim(location_text) = '' THEN
    RETURN;
  END IF;

  -- Split by comma and clean up
  parts := string_to_array(trim(location_text), ',');
  part_count := array_length(parts, 1);

  -- Clean up each part (remove extra spaces)
  FOR i IN 1..part_count LOOP
    parts[i] := trim(parts[i]);
  END LOOP;

  -- Parse based on number of parts (India-specific: city, district, state)
  CASE part_count
    WHEN 1 THEN
      -- Single part - could be city, district, or state
      RETURN QUERY SELECT parts[1], NULL, NULL;
    WHEN 2 THEN
      -- Two parts - likely city, state or district, state
      RETURN QUERY SELECT parts[1], NULL, parts[2];
    WHEN 3 THEN
      -- Three parts - likely city, district, state
      RETURN QUERY SELECT parts[1], parts[2], parts[3];
    ELSE
      -- More than 3 parts - take first 3 (city, district, state)
      RETURN QUERY SELECT parts[1], parts[2], parts[3];
  END CASE;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- ENHANCED REQUEST QUERY FUNCTIONS
-- ============================================================================

-- Function to get requests with hierarchical location sorting (cost-optimized)
CREATE OR REPLACE FUNCTION get_requests_hierarchical(
  user_state text DEFAULT NULL,
  user_district text DEFAULT NULL,
  user_city text DEFAULT NULL,
  category_filter text DEFAULT NULL,
  limit_count integer DEFAULT 20,
  offset_count integer DEFAULT 0
)
RETURNS TABLE(
  id uuid,
  requester_username text,
  title text,
  description text,
  budget_min numeric,
  budget_max numeric,
  category text,
  location text,
  location_name text,
  location_district text,
  location_state text,
  latitude double precision,
  longitude double precision,
  updated_at timestamp with time zone
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.id,
    r.requester_username,
    r.title,
    r.description,
    r.budget_min,
    r.budget_max,
    r.category,
    r.location,
    r.location_name,
    r.location_district,
    r.location_state,
    r.latitude,
    r.longitude,
    r.updated_at
  FROM requests r
  WHERE 
    -- Category filter
    (category_filter IS NULL OR r.category = category_filter)
    AND
    -- Exclude expired requests
    (r.expires_at IS NULL OR r.expires_at > NOW())
    AND
    -- Location hierarchy matching (most specific to least specific)
    (
      -- Exact city match (highest priority)
      (user_city IS NOT NULL AND r.location_name ILIKE '%' || user_city || '%')
      OR
      -- Same district match (second priority)
      (user_district IS NOT NULL AND r.location_district ILIKE '%' || user_district || '%')
      OR
      -- Same state match (third priority)
      (user_state IS NOT NULL AND r.location_state ILIKE '%' || user_state || '%')
      OR
      -- No location filter (show all)
      (user_city IS NULL AND user_district IS NULL AND user_state IS NULL)
    )
  ORDER BY
    -- Hierarchical sorting: exact city match first, then district, then state, then by date
    CASE 
      WHEN user_city IS NOT NULL AND r.location_name ILIKE '%' || user_city || '%' THEN 1
      WHEN user_district IS NOT NULL AND r.location_district ILIKE '%' || user_district || '%' THEN 2
      WHEN user_state IS NOT NULL AND r.location_state ILIKE '%' || user_state || '%' THEN 3
      ELSE 4
         END,
     r.updated_at DESC
  LIMIT limit_count
  OFFSET offset_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- LOCATION UPDATE TRIGGER
-- ============================================================================

-- Function to automatically parse location hierarchy when location text is updated
CREATE OR REPLACE FUNCTION update_request_location_hierarchy()
RETURNS TRIGGER AS $$
DECLARE
  parsed_location record;
BEGIN
  -- Only update if location text has changed
  IF NEW.location IS DISTINCT FROM OLD.location THEN
    -- Parse the location text into hierarchy
    SELECT * INTO parsed_location 
    FROM parse_location_hierarchy(NEW.location);
    
    -- Update the hierarchical fields
    NEW.location_name := parsed_location.location_name;
    NEW.location_district := parsed_location.location_district;
    NEW.location_state := parsed_location.location_state;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic location hierarchy parsing
DROP TRIGGER IF EXISTS trigger_update_request_location_hierarchy ON requests;
CREATE TRIGGER trigger_update_request_location_hierarchy
  BEFORE INSERT OR UPDATE ON requests
  FOR EACH ROW
  EXECUTE FUNCTION update_request_location_hierarchy();

-- ============================================================================
-- BACKFILL EXISTING DATA
-- ============================================================================

-- Update existing requests with parsed location hierarchy
UPDATE requests 
SET 
  location_name = parsed.location_name,
  location_district = parsed.location_district,
  location_state = parsed.location_state
FROM (
  SELECT 
    id,
    (parse_location_hierarchy(location)).*
  FROM requests 
  WHERE location IS NOT NULL AND location != ''
) AS parsed
WHERE requests.id = parsed.id;

-- ============================================================================
-- AUTOMATIC EXPIRATION CLEANUP
-- ============================================================================

-- Function to automatically delete expired requests
CREATE OR REPLACE FUNCTION cleanup_expired_requests()
RETURNS integer AS $$
DECLARE
  deleted_count integer;
BEGIN
  -- Delete requests that have expired
  DELETE FROM requests 
  WHERE expires_at IS NOT NULL 
    AND expires_at < NOW();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- Log the cleanup (optional - can be removed in production)
  IF deleted_count > 0 THEN
    RAISE NOTICE 'Cleaned up % expired requests', deleted_count;
  END IF;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Create a scheduled job to run cleanup every hour
-- Note: This requires pg_cron extension to be enabled in Supabase
-- You can also call this function manually or set up a cron job externally
SELECT cron.schedule(
  'cleanup-expired-requests',
  '0 * * * *', -- Every hour at minute 0
  'SELECT cleanup_expired_requests();'
);

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION parse_location_hierarchy TO authenticated;
GRANT EXECUTE ON FUNCTION get_requests_hierarchical TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_expired_requests TO authenticated;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Verify the migration
SELECT 
  'Migration Status' as check_type,
  'Enhanced Request Location System' as description,
  'SUCCESS' as status,
  now() as completed_at;
