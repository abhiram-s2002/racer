-- Add verification data to get_requests_hierarchical function
-- This migration updates the function to include requester verification status

-- Drop the existing function
DROP FUNCTION IF EXISTS get_requests_hierarchical(text,text,text,text,integer,integer);

-- Recreate with verification data
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
  requester_name text,
  requester_verified boolean,
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
  updated_at timestamp with time zone,
  expires_at timestamp with time zone,
  urgency text,
  distance_km double precision
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.id,
    r.requester_username,
    u.name as requester_name,
    (u.verification_status = 'verified' AND (u.expires_at IS NULL OR u.expires_at > NOW())) as requester_verified,
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
    r.updated_at,
    r.expires_at,
    r.urgency,
    NULL::double precision as distance_km
  FROM requests r
  JOIN users u ON r.requester_username = u.username
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
      (user_city IS NOT NULL AND r.location_name = user_city)
      OR
      -- District match (second priority)
      (user_city IS NULL AND user_district IS NOT NULL AND r.location_district = user_district)
      OR
      -- State match (third priority)
      (user_city IS NULL AND user_district IS NULL AND user_state IS NOT NULL AND r.location_state = user_state)
      OR
      -- No location filter (show all)
      (user_city IS NULL AND user_district IS NULL AND user_state IS NULL)
    )
  ORDER BY
    -- Priority order: exact city match, then district, then state, then by updated_at
    CASE 
      WHEN user_city IS NOT NULL AND r.location_name = user_city THEN 1
      WHEN user_city IS NULL AND user_district IS NOT NULL AND r.location_district = user_district THEN 2
      WHEN user_city IS NULL AND user_district IS NULL AND user_state IS NOT NULL AND r.location_state = user_state THEN 3
      ELSE 4
    END,
    r.updated_at DESC
  LIMIT limit_count
  OFFSET offset_count;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_requests_hierarchical TO authenticated;

-- Add comment
COMMENT ON FUNCTION get_requests_hierarchical IS 'Fetches requests with hierarchical location sorting and includes requester verification status';
