-- ============================================================================
-- ADD REQUESTER NAME TO REQUESTS QUERIES
-- ============================================================================

-- Drop the existing function first
DROP FUNCTION IF EXISTS get_requests_hierarchical(text,text,text,text,integer,integer);

-- Recreate the get_requests_hierarchical function with requester name
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
    u.name as requester_name,
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
  LEFT JOIN users u ON r.requester_username = u.username
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
      -- District match (second priority)
      (user_district IS NOT NULL AND r.location_district ILIKE '%' || user_district || '%')
      OR
      -- State match (third priority)
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
-- VERIFICATION
-- ============================================================================

-- Verify the function has been updated
SELECT 
  'Migration Status' as check_type,
  'get_requests_hierarchical function updated with requester_name' as status;
