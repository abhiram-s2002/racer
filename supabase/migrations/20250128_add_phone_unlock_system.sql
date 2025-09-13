-- ============================================================================
-- PHONE UNLOCK SYSTEM - ULTRA SIMPLE VERSION
-- ============================================================================

-- Create phone_unlocks table for tracking who can see whose phone
CREATE TABLE IF NOT EXISTS phone_unlocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_owner_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  unlocked_by_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  unlocked_at timestamp with time zone DEFAULT NOW(),
  
  -- Ensure unique relationship per phone owner/unlocker pair
  UNIQUE(phone_owner_id, unlocked_by_id)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_phone_unlocks_owner ON phone_unlocks(phone_owner_id);
CREATE INDEX IF NOT EXISTS idx_phone_unlocks_unlocked_by ON phone_unlocks(unlocked_by_id);
CREATE INDEX IF NOT EXISTS idx_phone_unlocks_unlocked_at ON phone_unlocks(unlocked_at);

-- Enable Row Level Security
ALTER TABLE phone_unlocks ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own phone unlocks" ON phone_unlocks
  FOR SELECT USING (
    auth.uid() = phone_owner_id OR 
    auth.uid() = unlocked_by_id
  );

CREATE POLICY "Users can grant phone access" ON phone_unlocks
  FOR INSERT WITH CHECK (auth.uid() = phone_owner_id);

CREATE POLICY "Users can revoke phone access" ON phone_unlocks
  FOR DELETE USING (auth.uid() = phone_owner_id);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to check if user can see another user's phone
CREATE OR REPLACE FUNCTION can_see_phone(
  phone_owner_id_param uuid,
  requesting_user_id_param uuid
)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM phone_unlocks 
    WHERE phone_owner_id = phone_owner_id_param 
    AND unlocked_by_id = requesting_user_id_param
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to grant phone access (when ping is accepted)
CREATE OR REPLACE FUNCTION grant_phone_access(
  phone_owner_id_param uuid,
  unlocked_by_id_param uuid
)
RETURNS boolean AS $$
BEGIN
  -- Insert or update the unlock record
  INSERT INTO phone_unlocks (phone_owner_id, unlocked_by_id, unlocked_at)
  VALUES (phone_owner_id_param, unlocked_by_id_param, NOW())
  ON CONFLICT (phone_owner_id, unlocked_by_id) 
  DO UPDATE SET unlocked_at = NOW();
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to revoke phone access
CREATE OR REPLACE FUNCTION revoke_phone_access(
  phone_owner_id_param uuid,
  unlocked_by_id_param uuid
)
RETURNS boolean AS $$
BEGIN
  DELETE FROM phone_unlocks 
  WHERE phone_owner_id = phone_owner_id_param 
  AND unlocked_by_id = unlocked_by_id_param;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get phone access list for a user
CREATE OR REPLACE FUNCTION get_phone_access_list(phone_owner_id_param uuid)
RETURNS TABLE (
  unlocked_by_id uuid,
  unlocked_by_username text,
  unlocked_by_name text,
  unlocked_at timestamp with time zone
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pu.unlocked_by_id,
    u.username as unlocked_by_username,
    u.name as unlocked_by_name,
    pu.unlocked_at
  FROM phone_unlocks pu
  JOIN users u ON u.id = pu.unlocked_by_id
  WHERE pu.phone_owner_id = phone_owner_id_param
  ORDER BY pu.unlocked_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- MIGRATION FROM OLD SYSTEM
-- ============================================================================

-- Remove the old phone_sharing_preference column since we're using the new unlock system
ALTER TABLE users DROP COLUMN IF EXISTS phone_sharing_preference;

-- Drop the old index
DROP INDEX IF EXISTS idx_users_phone_sharing_preference;

-- Drop the old function
DROP FUNCTION IF EXISTS get_phone_sharing_preference(uuid);
