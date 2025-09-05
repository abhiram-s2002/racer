-- ============================================================================
-- ADD VERIFICATION SYSTEM TO USERS TABLE
-- ============================================================================

-- Add verification columns to users table
ALTER TABLE users ADD COLUMN verification_status text DEFAULT 'not_verified' 
  CHECK (verification_status IN ('verified', 'not_verified'));

ALTER TABLE users ADD COLUMN verified_at timestamp;

ALTER TABLE users ADD COLUMN expires_at timestamp;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_verification_status ON users(verification_status);
CREATE INDEX IF NOT EXISTS idx_users_expires_at ON users(expires_at);

-- ============================================================================
-- VERIFICATION HELPER FUNCTIONS
-- ============================================================================

-- Function to check if user is currently verified (not expired)
CREATE OR REPLACE FUNCTION is_user_verified(user_id_param uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users 
    WHERE id = user_id_param 
    AND verification_status = 'verified' 
    AND (expires_at IS NULL OR expires_at > NOW())
  );
END;
$$ LANGUAGE plpgsql;

-- Function to get verification status for display
CREATE OR REPLACE FUNCTION get_user_verification_status(user_id_param uuid)
RETURNS text AS $$
DECLARE
  status text;
BEGIN
  SELECT verification_status INTO status
  FROM users 
  WHERE id = user_id_param;
  
  -- If verified but expired, return not_verified
  IF status = 'verified' THEN
    IF EXISTS (
      SELECT 1 FROM users 
      WHERE id = user_id_param 
      AND expires_at IS NOT NULL 
      AND expires_at <= NOW()
    ) THEN
      RETURN 'not_verified';
    END IF;
  END IF;
  
  RETURN COALESCE(status, 'not_verified');
END;
$$ LANGUAGE plpgsql;

-- Function to expire old verifications (run daily)
CREATE OR REPLACE FUNCTION expire_old_verifications()
RETURNS integer AS $$
DECLARE
  expired_count integer;
BEGIN
  UPDATE users 
  SET verification_status = 'not_verified'
  WHERE verification_status = 'verified' 
  AND expires_at IS NOT NULL 
  AND expires_at <= NOW();
  
  GET DIAGNOSTICS expired_count = ROW_COUNT;
  RETURN expired_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- UPDATE EXISTING QUERIES TO INCLUDE VERIFICATION STATUS
-- ============================================================================

-- Update the get_requests_hierarchical function to include verification status
DROP FUNCTION IF EXISTS get_requests_hierarchical(text,text,text,text,integer,integer);

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
  updated_at timestamp with time zone
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.id,
    r.requester_username,
    u.name as requester_name,
    is_user_verified(u.id) as requester_verified,
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

-- Verify the migration
SELECT 
  'Migration Status' as check_type,
  'Verification system added to users table' as status;

-- Test the verification functions
SELECT 
  'Function Test' as test_type,
  is_user_verified('00000000-0000-0000-0000-000000000000'::uuid) as test_result;
