-- Fix for requests function - create a working version that doesn't rely on missing columns
-- This script creates a simplified version of get_requests_hierarchical that works with the current table structure

-- Drop all existing versions of the function (comprehensive cleanup)
DO $$ 
DECLARE
    func_record RECORD;
BEGIN
    -- Find and drop all versions of get_requests_hierarchical
    FOR func_record IN 
        SELECT proname, oidvectortypes(proargtypes) as argtypes
        FROM pg_proc 
        WHERE proname = 'get_requests_hierarchical'
    LOOP
        EXECUTE 'DROP FUNCTION IF EXISTS ' || func_record.proname || '(' || func_record.argtypes || ') CASCADE';
    END LOOP;
END $$;

-- Create a simplified version that works with the current requests table structure
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
  ORDER BY r.updated_at DESC
  LIMIT limit_count
  OFFSET offset_count;
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION get_requests_hierarchical TO authenticated;

-- Test the function
SELECT 'Function created successfully' as status;

-- Verify the function exists and show its signature
SELECT 
    proname as function_name,
    oidvectortypes(proargtypes) as argument_types,
    prorettype::regtype as return_type
FROM pg_proc 
WHERE proname = 'get_requests_hierarchical';

-- Test the function with sample parameters
SELECT * FROM get_requests_hierarchical(NULL, NULL, NULL, NULL, 5, 0) LIMIT 1;
