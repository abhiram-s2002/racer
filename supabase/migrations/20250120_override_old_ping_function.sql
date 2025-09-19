-- Override any old ping functions that still reference created_at
-- This ensures the correct function with updated_at is used

BEGIN;

-- Drop the old function that references created_at
DROP FUNCTION IF EXISTS create_ping_with_limits_unified(uuid,uuid,text,text,text,text);

-- Create the correct function that uses updated_at
CREATE OR REPLACE FUNCTION create_ping_with_limits_unified(
  target_id_param uuid,
  item_type_param text,
  sender_username_param text,
  receiver_username_param text,
  message_param text
)
RETURNS table(
  success boolean,
  ping_id uuid,
  updated_at timestamptz,
  error text,
  message text,
  time_remaining_minutes integer,
  ping_count integer,
  first_response_at timestamptz,
  responded_at timestamptz,
  response_message text,
  last_ping_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  can_record record;
  current_ts timestamptz := now();
  cooldown interval := interval '1 minute';
  recent_ping record;
  new_ping_id uuid;
BEGIN
  IF item_type_param NOT IN ('listing','request') THEN
    RETURN QUERY SELECT false, null::uuid, null::timestamptz, 'invalid_type', 'Invalid item type', null::int, null::int, null::timestamptz, null::timestamptz, null::text, null::timestamptz; 
    RETURN;
  END IF;
  
  IF target_id_param IS NULL THEN
    RETURN QUERY SELECT false, null::uuid, null::timestamptz, 'invalid_target', 'Missing target id', null::int, null::int, null::timestamptz, null::timestamptz, null::text, null::timestamptz; 
    RETURN;
  END IF;

  SELECT * INTO can_record FROM public.check_ping_limits(sender_username_param);
  IF NOT can_record.can_send THEN
    RETURN QUERY SELECT false, null::uuid, null::timestamptz, 'daily_limit', can_record.message, null::int, null::int, null::timestamptz, null::timestamptz, null::text, null::timestamptz; 
    RETURN;
  END IF;

  -- Cooldown check for pending pings from same sender to same target
  SELECT * INTO recent_ping FROM public.pings p
  WHERE p.sender_username = sender_username_param
    AND p.target_id = target_id_param
    AND p.status = 'pending'
    AND p.updated_at > current_ts - cooldown
  ORDER BY p.updated_at DESC
  LIMIT 1;

  IF recent_ping IS NOT NULL THEN
    RETURN QUERY SELECT false, null::uuid, null::timestamptz, 'time_limit', 'You can ping again later', CEIL(EXTRACT(EPOCH FROM ((recent_ping.updated_at + cooldown) - current_ts)) / 60)::int, null::int, null::timestamptz, null::timestamptz, null::text, null::timestamptz; 
    RETURN;
  END IF;

  -- Insert ping using new schema only (no legacy columns)
  INSERT INTO public.pings (
    item_type,
    target_id,
    sender_username,
    receiver_username,
    message,
    status,
    updated_at
  ) VALUES (
    item_type_param,
    target_id_param,
    sender_username_param,
    receiver_username_param,
    message_param,
    'pending',
    current_ts
  ) RETURNING id INTO new_ping_id;

  RETURN QUERY SELECT true,
    new_ping_id,
    current_ts,
    null::text,
    'Ping created',
    null::int,
    1,
    null::timestamptz,
    null::timestamptz,
    null::text,
    current_ts;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION create_ping_with_limits_unified(uuid,text,text,text,text) TO authenticated;

COMMIT;
