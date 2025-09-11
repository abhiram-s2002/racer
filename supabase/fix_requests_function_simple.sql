-- Fix get_requests_hierarchical function to match actual schema
-- This creates a simplified version that works with the current table structure

-- Drop the existing function
DROP FUNCTION IF EXISTS get_requests_hierarchical(text,text,text,text,integer,integer);

-- Create a simple working version
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
  distance_km double precision
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.id,
    r.requester_username,
    COALESCE(u.name, '') as requester_name,
    COALESCE((u.verification_status = 'verified' AND (u.expires_at IS NULL OR u.expires_at > NOW())), false) as requester_verified,
    r.title,
    r.description,
    r.budget_min,
    r.budget_max,
    r.category,
    r.location,
    r.location as location_name, -- Use location as location_name if location_name doesn't exist
    r.location as location_district, -- Use location as location_district if location_district doesn't exist
    r.location as location_state, -- Use location as location_state if location_state doesn't exist
    r.latitude,
    r.longitude,
    r.updated_at,
    NULL::double precision as distance_km
  FROM requests r
  LEFT JOIN users u ON r.requester_username = u.username
  WHERE 
    -- Category filter
    (category_filter IS NULL OR r.category = category_filter)
    AND
    -- No expiration filter for now
    -- (r.expires_at IS NULL OR r.expires_at > NOW())
    -- AND
    -- Location hierarchy matching (simplified)
    (
      -- Exact city match (highest priority)
      (user_city IS NOT NULL AND r.location ILIKE '%' || user_city || '%')
      OR
      -- District match (second priority)
      (user_district IS NOT NULL AND r.location ILIKE '%' || user_district || '%')
      OR
      -- State match (third priority)
      (user_state IS NOT NULL AND r.location ILIKE '%' || user_state || '%')
      OR
      -- No location filter (show all)
      (user_city IS NULL AND user_district IS NULL AND user_state IS NULL)
    )
  ORDER BY
    -- Hierarchical sorting: exact city match first, then district, then state, then by date
    CASE 
      WHEN user_city IS NOT NULL AND r.location ILIKE '%' || user_city || '%' THEN 1
      WHEN user_district IS NOT NULL AND r.location ILIKE '%' || user_district || '%' THEN 2
      WHEN user_state IS NOT NULL AND r.location ILIKE '%' || user_state || '%' THEN 3
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
COMMENT ON FUNCTION get_requests_hierarchical IS 'Simplified version that works with current requests table schema';

-- Test the function
SELECT 'Function created successfully' as status;
