-- Clean get_requests_hierarchical function without urgency column
-- This removes all references to non-existent columns

-- Drop the existing function
DROP FUNCTION IF EXISTS get_requests_hierarchical(text,text,text,text,integer,integer);

-- Create a clean working version
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
    COALESCE((u.verification_status = 'verified'), false) as requester_verified,
    r.title,
    r.description,
    r.budget_min,
    r.budget_max,
    r.category,
    r.location,
    r.location as location_name,
    r.location as location_district,
    r.location as location_state,
    r.latitude,
    r.longitude,
    r.updated_at,
    NULL::double precision as distance_km
  FROM requests r
  LEFT JOIN users u ON r.requester_username = u.username
  WHERE 
    -- Category filter
    (category_filter IS NULL OR r.category = category_filter)
  ORDER BY
    r.updated_at DESC
  LIMIT limit_count
  OFFSET offset_count;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_requests_hierarchical TO authenticated;

-- Test the function
SELECT 'Clean function created successfully' as status;
