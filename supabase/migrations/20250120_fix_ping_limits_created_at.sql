-- Fix ping_limits table to use only updated_at column
-- Remove created_at column and update any functions that reference it

BEGIN;

-- 1. Ensure created_at column is dropped from ping_limits table
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'ping_limits' 
    AND column_name = 'created_at'
  ) THEN
    ALTER TABLE public.ping_limits DROP COLUMN created_at;
  END IF;
END $$;

-- 2. Update any indexes that might reference created_at on ping_limits
DROP INDEX IF EXISTS idx_ping_limits_created_at;
CREATE INDEX IF NOT EXISTS idx_ping_limits_updated_at ON ping_limits(updated_at DESC);

-- 3. Update the check_ping_limits function to ensure it uses updated_at
-- Drop the function first to avoid return type conflicts
DROP FUNCTION IF EXISTS check_ping_limits(text);

CREATE OR REPLACE FUNCTION check_ping_limits(username_param text)
RETURNS TABLE(
    can_send boolean,
    daily_pings_sent integer,
    daily_pings_limit integer,
    cooldown_until timestamp with time zone,
    message text
) AS $$
DECLARE
    user_limit RECORD;
    current_time timestamp with time zone := NOW();
BEGIN
    -- Reset limits if it's a new day
    PERFORM reset_daily_ping_limits();
    
    -- Get user's ping limits
    SELECT * INTO user_limit 
    FROM ping_limits 
    WHERE username = username_param;
    
    -- If no record exists, create one
    IF user_limit IS NULL THEN
        INSERT INTO ping_limits (username, daily_pings_sent, daily_pings_limit, updated_at)
        VALUES (username_param, 0, 50, current_time)
        RETURNING * INTO user_limit;
    END IF;
    
    -- Check cooldown
    IF user_limit.cooldown_until IS NOT NULL AND user_limit.cooldown_until > current_time THEN
        RETURN QUERY SELECT 
            false as can_send,
            user_limit.daily_pings_sent,
            user_limit.daily_pings_limit,
            user_limit.cooldown_until,
            'You are in cooldown period. Please wait before sending another ping.' as message;
        RETURN;
    END IF;
    
    -- Check daily limit
    IF user_limit.daily_pings_sent >= user_limit.daily_pings_limit THEN
        RETURN QUERY SELECT 
            false as can_send,
            user_limit.daily_pings_sent,
            user_limit.daily_pings_limit,
            user_limit.cooldown_until,
            'Daily ping limit reached. Try again tomorrow.' as message;
        RETURN;
    END IF;
    
    -- Can send ping
    RETURN QUERY SELECT 
        true as can_send,
        user_limit.daily_pings_sent,
        user_limit.daily_pings_limit,
        user_limit.cooldown_until,
        'OK' as message;
END;
$$ LANGUAGE plpgsql;

-- 4. Update the reset_daily_ping_limits function to use updated_at
CREATE OR REPLACE FUNCTION reset_daily_ping_limits()
RETURNS void AS $$
BEGIN
    UPDATE ping_limits 
    SET daily_pings_sent = 0, 
        last_reset_date = current_date,
        updated_at = NOW()
    WHERE last_reset_date < current_date;
END;
$$ LANGUAGE plpgsql;

COMMIT;
