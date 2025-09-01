-- Force refresh the rating function to fix parameter issues
-- Run this if you're still getting parameter mismatch errors

-- 1. Drop the function completely
DROP FUNCTION IF EXISTS can_rate_user(text, text);
DROP FUNCTION IF EXISTS can_rate_user(text, text, text);
DROP FUNCTION IF EXISTS can_rate_user(text, text, text, text);

-- 2. Recreate the function with correct parameters
CREATE OR REPLACE FUNCTION can_rate_user(
    rater_username_param text,
    rated_username_param text
)
RETURNS TABLE(
    can_rate boolean,
    pending_pings jsonb
) AS $$
DECLARE
    eligible_pings jsonb;
BEGIN
    -- Users cannot rate themselves
    IF rater_username_param = rated_username_param THEN
        RETURN QUERY SELECT false, '[]'::jsonb;
        RETURN;
    END IF;
    
    -- Get pings where the rater can rate the rated user
    -- User can rate if they have completed ping interactions
    SELECT jsonb_agg(
        jsonb_build_object(
            'ping_id', p.id,
            'listing_id', p.listing_id,
            'status', p.status,
            'created_at', p.created_at,
            'message', p.message
        )
    ) INTO eligible_pings
    FROM pings p
    WHERE (
        -- Rater sent a ping to rated user
        (p.sender_username = rater_username_param AND p.receiver_username = rated_username_param)
        OR
        -- Rater received a ping from rated user
        (p.sender_username = rated_username_param AND p.receiver_username = rater_username_param)
    )
    AND p.status IN ('accepted', 'rejected') -- Only completed interactions
    AND p.created_at > NOW() - INTERVAL '90 days' -- Recent interactions only
    AND NOT EXISTS (
        -- Check if rating already exists for this ping
        SELECT 1 FROM user_ratings ur 
        WHERE ur.ping_id = p.id 
        AND ur.rater_username = rater_username_param
    );
    
    -- Return whether user can rate and the list of eligible pings
    RETURN QUERY SELECT 
        COALESCE(eligible_pings IS NOT NULL AND jsonb_array_length(eligible_pings) > 0, false),
        COALESCE(eligible_pings, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Grant permissions
GRANT EXECUTE ON FUNCTION can_rate_user(text, text) TO authenticated;

-- 4. Test the function
SELECT 'Function recreated successfully' as status;

-- 5. Verify the function parameters
SELECT 
    specific_name, 
    parameter_name, 
    parameter_mode, 
    data_type
FROM information_schema.parameters 
WHERE specific_name LIKE '%can_rate_user%'
ORDER BY ordinal_position;
