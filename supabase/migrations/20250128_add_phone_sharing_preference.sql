-- ============================================================================
-- PHONE SHARING PREFERENCE - TWO OPTIONS ONLY
-- ============================================================================
-- Migration: 20250128_add_phone_sharing_preference.sql
-- Two options: 'everyone' (public) or 'ping_confirmation' (only after ping acceptance)

-- Remove any existing phone sharing columns
ALTER TABLE users DROP COLUMN IF EXISTS phone_sharing_preference;
ALTER TABLE users DROP COLUMN IF EXISTS phone_sharing_enabled;

-- Add phone sharing preference column with two options only
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS phone_sharing_preference text DEFAULT 'ping_confirmation' 
CHECK (phone_sharing_preference IN ('everyone', 'ping_confirmation'));

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_users_phone_sharing_preference ON users(phone_sharing_preference);

-- Add comment for documentation
COMMENT ON COLUMN users.phone_sharing_preference IS 'Phone sharing options: everyone (public) or ping_confirmation (only after ping acceptance)';

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to get phone sharing preference
CREATE OR REPLACE FUNCTION get_phone_sharing_preference(user_id_param uuid)
RETURNS text AS $$
DECLARE
    preference text;
BEGIN
    SELECT phone_sharing_preference INTO preference
    FROM users
    WHERE id = user_id_param;
    
    RETURN COALESCE(preference, 'ping_confirmation');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update phone sharing preference
CREATE OR REPLACE FUNCTION update_phone_sharing_preference(
    user_id_param uuid,
    preference_param text
)
RETURNS boolean AS $$
BEGIN
    -- Validate preference value
    IF preference_param NOT IN ('everyone', 'ping_confirmation') THEN
        RAISE EXCEPTION 'Invalid phone sharing preference: %', preference_param;
    END IF;
    
    -- Update the preference
    UPDATE users 
    SET phone_sharing_preference = preference_param,
        updated_at = NOW()
    WHERE id = user_id_param;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user's phone should be visible to another user
CREATE OR REPLACE FUNCTION should_show_phone(
    phone_owner_id_param uuid,
    requesting_user_id_param uuid
)
RETURNS boolean AS $$
DECLARE
    sharing_preference text;
    has_phone_access boolean;
BEGIN
    -- Get phone sharing preference
    SELECT get_phone_sharing_preference(phone_owner_id_param) INTO sharing_preference;
    
    -- If preference is 'everyone', always show
    IF sharing_preference = 'everyone' THEN
        RETURN true;
    END IF;
    
    -- If preference is 'ping_confirmation', check if user has phone access
    IF sharing_preference = 'ping_confirmation' THEN
        SELECT can_see_phone(phone_owner_id_param, requesting_user_id_param) INTO has_phone_access;
        RETURN has_phone_access;
    END IF;
    
    -- Default to false for safety
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_phone_sharing_preference TO authenticated;
GRANT EXECUTE ON FUNCTION get_phone_sharing_preference TO anon;
GRANT EXECUTE ON FUNCTION update_phone_sharing_preference TO authenticated;
GRANT EXECUTE ON FUNCTION update_phone_sharing_preference TO anon;
GRANT EXECUTE ON FUNCTION should_show_phone TO authenticated;
GRANT EXECUTE ON FUNCTION should_show_phone TO anon;
