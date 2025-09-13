-- Update the ping creation function to increment listing ping count
-- This ensures that when a ping is created, the listing's ping_count is also incremented

-- Drop the existing function first to avoid return type conflicts
DROP FUNCTION IF EXISTS create_ping_with_limits(uuid,text,text,text);

-- Create the new version that includes listing ping count increment
CREATE OR REPLACE FUNCTION create_ping_with_limits(
    listing_id_param uuid,
    sender_username_param text,
    receiver_username_param text,
    message_param text
)
RETURNS TABLE(
    success boolean,
    ping_id uuid,
    created_at timestamp with time zone,
    error text,
    message text,
    time_remaining_minutes integer
) AS $$
DECLARE
    ping_limit_record RECORD;
    new_ping_id uuid;
    current_time timestamp with time zone := NOW();
    time_limit_minutes integer := 60; -- 1 hour cooldown between pings
BEGIN
    -- Check if user can send pings (daily limits)
    SELECT * INTO ping_limit_record
    FROM check_ping_limits(sender_username_param);
    
    IF NOT ping_limit_record.can_send THEN
        RETURN QUERY SELECT 
            false as success,
            NULL::uuid as ping_id,
            NULL::timestamp with time zone as created_at,
            'daily_limit' as error,
            ping_limit_record.message as message,
            NULL::integer as time_remaining_minutes;
        RETURN;
    END IF;
    
    -- Check time-based cooldown (prevent spam)
    IF EXISTS (
        SELECT 1 FROM pings 
        WHERE sender_username = sender_username_param 
        AND listing_id = listing_id_param 
        AND sent_at > (current_time - interval '1 hour')
        AND status = 'pending'
    ) THEN
        -- Calculate remaining time
        SELECT EXTRACT(EPOCH FROM (
            (sent_at + interval '1 hour') - current_time
        )) / 60 INTO time_limit_minutes
        FROM pings 
        WHERE sender_username = sender_username_param 
        AND listing_id = listing_id_param 
        AND sent_at > (current_time - interval '1 hour')
        AND status = 'pending'
        ORDER BY sent_at DESC 
        LIMIT 1;
        
        RETURN QUERY SELECT 
            false as success,
            NULL::uuid as ping_id,
            NULL::timestamp with time zone as created_at,
            'time_limit' as error,
            'You can ping again in ' || CEIL(time_limit_minutes) || ' minutes' as message,
            CEIL(time_limit_minutes) as time_remaining_minutes;
        RETURN;
    END IF;
    
    -- Create the ping
    INSERT INTO pings (
        listing_id,
        sender_username,
        receiver_username,
        message,
        status,
        sent_at
    ) VALUES (
        listing_id_param,
        sender_username_param,
        receiver_username_param,
        message_param,
        'pending',
        current_time
    ) RETURNING id INTO new_ping_id;
    
    -- Increment the listing's ping count
    PERFORM increment_listing_ping_count(listing_id_param);
    
    -- Update daily ping limits
    UPDATE ping_limits 
    SET daily_pings_sent = daily_pings_sent + 1,
        updated_at = current_time
    WHERE username = sender_username_param;
    
    -- Return success
    RETURN QUERY SELECT 
        true as success,
        new_ping_id as ping_id,
        current_time as created_at,
        NULL::text as error,
        'Ping sent successfully' as message,
        NULL::integer as time_remaining_minutes;
        
EXCEPTION
    WHEN OTHERS THEN
        -- Return error
        RETURN QUERY SELECT 
            false as success,
            NULL::uuid as ping_id,
            NULL::timestamp with time zone as created_at,
            'database_error' as error,
            'Failed to create ping: ' || SQLERRM as message,
            NULL::integer as time_remaining_minutes;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION create_ping_with_limits TO authenticated;

-- Add comment
COMMENT ON FUNCTION create_ping_with_limits IS 'Creates a new ping with limits checking and increments listing ping count';

-- Test the function
SELECT 'Ping creation function updated successfully' as status;
