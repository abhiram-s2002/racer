-- Unify pings to support both listings and requests
-- Adds request_id and item_type to pings, updates constraints and RPC

-- 1) Table changes
ALTER TABLE pings
  ADD COLUMN IF NOT EXISTS request_id uuid REFERENCES requests(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS item_type text CHECK (item_type IN ('listing','request'));

-- Ensure either listing_id or request_id is present (but not both)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'pings_listing_or_request_chk'
  ) THEN
    ALTER TABLE pings
    ADD CONSTRAINT pings_listing_or_request_chk
    CHECK (
      (listing_id IS NOT NULL AND request_id IS NULL AND item_type = 'listing') OR
      (request_id IS NOT NULL AND listing_id IS NULL AND item_type = 'request')
    );
  END IF;
END $$;

-- Replace old uniqueness to consider target item uniqueness
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conrelid = 'pings'::regclass AND conname = 'pings_sender_username_listing_id_status_key'
  ) THEN
    ALTER TABLE pings DROP CONSTRAINT pings_sender_username_listing_id_status_key;
  END IF;
END $$;

-- New partial unique indexes to prevent duplicate pending pings per target and sender
CREATE UNIQUE INDEX IF NOT EXISTS uniq_pending_listing_ping
  ON pings(sender_username, listing_id)
  WHERE status = 'pending' AND listing_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_pending_request_ping
  ON pings(sender_username, request_id)
  WHERE status = 'pending' AND request_id IS NOT NULL;

-- 2) RPC: create unified ping with limits
DROP FUNCTION IF EXISTS create_ping_with_limits(uuid,text,text,text);

CREATE OR REPLACE FUNCTION create_ping_with_limits_unified(
    listing_id_param uuid,
    request_id_param uuid,
    item_type_param text,
    sender_username_param text,
    receiver_username_param text,
    message_param text
)
RETURNS TABLE(
    success boolean,
    ping_id uuid,
    created_at timestamptz,
    error text,
    message text,
    time_remaining_minutes integer,
    ping_count integer,
    first_response_at timestamptz,
    responded_at timestamptz,
    response_message text,
    last_ping_at timestamptz
) AS $$
DECLARE
    can_record RECORD;
    current_time timestamptz := now();
    cooldown interval := interval '1 minute';
    recent_ping RECORD;
BEGIN
    -- Validate item_type and target ids
    IF item_type_param NOT IN ('listing','request') THEN
      RETURN QUERY SELECT false, NULL::uuid, NULL::timestamptz, 'invalid_item_type', 'Invalid item type', NULL::int, NULL::int, NULL::timestamptz, NULL::timestamptz, NULL::text, NULL::timestamptz;
      RETURN;
    END IF;

    IF (item_type_param = 'listing' AND listing_id_param IS NULL) OR (item_type_param = 'request' AND request_id_param IS NULL) THEN
      RETURN QUERY SELECT false, NULL::uuid, NULL::timestamptz, 'invalid_target', 'Missing target id', NULL::int, NULL::int, NULL::timestamptz, NULL::timestamptz, NULL::text, NULL::timestamptz;
      RETURN;
    END IF;

    -- Daily limit check
    SELECT * INTO can_record FROM check_ping_limits(sender_username_param);
    IF NOT can_record.can_send THEN
      RETURN QUERY SELECT false, NULL::uuid, NULL::timestamptz, 'daily_limit', can_record.message, NULL::int, NULL::int, NULL::timestamptz, NULL::timestamptz, NULL::text, NULL::timestamptz;
      RETURN;
    END IF;

    -- Cooldown check per target
    IF item_type_param = 'listing' THEN
      SELECT * INTO recent_ping FROM pings p
      WHERE p.sender_username = sender_username_param
        AND p.listing_id = listing_id_param
        AND p.status = 'pending'
        AND p.created_at > current_time - cooldown
      ORDER BY p.created_at DESC
      LIMIT 1;
    ELSE
      SELECT * INTO recent_ping FROM pings p
      WHERE p.sender_username = sender_username_param
        AND p.request_id = request_id_param
        AND p.status = 'pending'
        AND p.created_at > current_time - cooldown
      ORDER BY p.created_at DESC
      LIMIT 1;
    END IF;

    IF recent_ping IS NOT NULL THEN
      RETURN QUERY SELECT false, NULL::uuid, NULL::timestamptz, 'time_limit', 'You can ping again later', CEIL(EXTRACT(EPOCH FROM ((recent_ping.created_at + cooldown) - current_time)) / 60)::int, NULL::int, NULL::timestamptz, NULL::timestamptz, NULL::text, NULL::timestamptz;
      RETURN;
    END IF;

    -- Create ping
    INSERT INTO pings (
      listing_id,
      request_id,
      item_type,
      sender_username,
      receiver_username,
      message,
      status,
      created_at,
      ping_count,
      last_ping_at
    ) VALUES (
      CASE WHEN item_type_param = 'listing' THEN listing_id_param ELSE NULL END,
      CASE WHEN item_type_param = 'request' THEN request_id_param ELSE NULL END,
      item_type_param,
      sender_username_param,
      receiver_username_param,
      message_param,
      'pending',
      current_time,
      1,
      current_time
    ) RETURNING id, created_at INTO STRICT recent_ping;

    -- Increment engagement counters
    IF item_type_param = 'listing' THEN
      PERFORM increment_listing_ping_count(listing_id_param);
    END IF;

    RETURN QUERY SELECT true,
      recent_ping.id,
      recent_ping.created_at,
      NULL::text,
      'Ping created',
      NULL::int,
      1,
      NULL::timestamptz,
      NULL::timestamptz,
      NULL::text,
      current_time;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION create_ping_with_limits_unified(uuid,uuid,text,text,text,text) TO authenticated;

-- 3) Set daily ping limit to 5 and align existing records
ALTER TABLE ping_limits
  ALTER COLUMN daily_pings_limit SET DEFAULT 5;

UPDATE ping_limits
  SET daily_pings_limit = 5
  WHERE daily_pings_limit IS NULL OR daily_pings_limit <> 5;

-- Convenience view for unified activity (optional; used by client selects)
CREATE OR REPLACE VIEW v_pings_unified AS
SELECT p.*,
       l.title AS listing_title,
       l.price AS listing_price,
       l.thumbnail_images AS listing_thumbnail_images,
       l.preview_images AS listing_preview_images,
       NULL::jsonb AS listing_image_metadata,
       l.latitude AS listing_latitude,
       l.longitude AS listing_longitude,
       r.title AS request_title,
       r.budget_min AS request_budget_min,
       r.thumbnail_images AS request_thumbnail_images,
       r.preview_images AS request_preview_images,
       r.latitude AS request_latitude,
       r.longitude AS request_longitude
FROM pings p
LEFT JOIN listings l ON p.listing_id = l.id
LEFT JOIN requests r ON p.request_id = r.id;


