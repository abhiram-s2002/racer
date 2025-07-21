-- Migration: Fix create_ping_with_limits function
-- Date: 2025-01-18
-- Description: Fixes the ping creation function to handle all columns properly

-- Drop the existing function first
DROP FUNCTION IF EXISTS create_ping_with_limits(uuid, text, text, text);

-- Fix the create_ping_with_limits function to handle all columns properly
CREATE OR REPLACE FUNCTION create_ping_with_limits(
    listing_id_param uuid,
    sender_username_param text,
    receiver_username_param text,
    message_param text
)
RETURNS TABLE(
    success boolean,
    ping_id uuid,
    message text,
    created_at timestamp with time zone
) AS $$
DECLARE
    limit_check RECORD;
    time_check RECORD;
    new_ping_id uuid;
    new_created_at timestamp with time zone;
BEGIN
    -- Check ping limits
    SELECT * INTO limit_check 
    FROM check_ping_limits(sender_username_param);
    
    IF NOT limit_check.can_send THEN
        RETURN QUERY SELECT 
            false as success,
            NULL::uuid as ping_id,
            limit_check.message,
            NULL::timestamp with time zone as created_at;
        RETURN;
    END IF;
    
    -- Check time limit
    SELECT * INTO time_check 
    FROM check_ping_time_limit(sender_username_param, listing_id_param);
    
    IF NOT time_check.can_ping THEN
        RETURN QUERY SELECT 
            false as success,
            NULL::uuid as ping_id,
            time_check.message,
            NULL::timestamp with time zone as created_at;
        RETURN;
    END IF;
    
    -- Create the ping with explicit column specification
    INSERT INTO pings AS p (
        listing_id, 
        sender_username, 
        receiver_username, 
        message,
        status,
        ping_count,
        last_ping_at,
        created_at
    )
    VALUES (
        listing_id_param, 
        sender_username_param, 
        receiver_username_param, 
        message_param,
        'pending',
        1,
        NOW(),
        NOW()
    )
    RETURNING p.id, p.created_at INTO new_ping_id, new_created_at;
    
    -- Update ping count
    UPDATE ping_limits 
    SET daily_pings_sent = daily_pings_sent + 1
    WHERE username = sender_username_param;
    
    RETURN QUERY SELECT 
        true as success,
        new_ping_id as ping_id,
        'Ping created successfully' as message,
        new_created_at as created_at;
END;
$$ LANGUAGE plpgsql; 