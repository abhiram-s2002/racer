-- Critical Database Optimizations for 10k+ Users
-- Migration: 20250124_scalability_optimizations.sql

-- 1. Add composite indexes for high-traffic queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_listings_location_active_category 
ON listings(latitude, longitude, is_active, category) 
WHERE is_active = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_listings_active_created_distance 
ON listings(is_active, created_at DESC, latitude, longitude) 
WHERE is_active = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_chat_created 
ON messages(chat_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pings_sender_status_created 
ON pings(sender_username, status, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pings_receiver_status_created 
ON pings(receiver_username, status, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_username_active 
ON users(username, isAvailable) 
WHERE isAvailable = true;

-- 2. Add partial indexes for recent data
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_listings_active_recent 
ON listings(created_at DESC) 
WHERE is_active = true AND created_at > NOW() - INTERVAL '30 days';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pings_recent 
ON pings(created_at DESC) 
WHERE created_at > NOW() - INTERVAL '7 days';

-- 3. Optimize ping system with single operation
CREATE OR REPLACE FUNCTION send_ping_optimized(
  sender_username TEXT,
  receiver_username TEXT,
  listing_id UUID,
  message TEXT DEFAULT ''
) RETURNS JSON AS $$
DECLARE
  ping_id UUID;
  chat_id UUID;
  message_id UUID;
  receiver_exists BOOLEAN;
  listing_exists BOOLEAN;
BEGIN
  -- Validate receiver and listing in single query
  SELECT EXISTS(SELECT 1 FROM users WHERE username = receiver_username AND isAvailable = true) INTO receiver_exists;
  SELECT EXISTS(SELECT 1 FROM listings WHERE id = listing_id AND is_active = true) INTO listing_exists;
  
  IF NOT receiver_exists THEN
    RETURN json_build_object('success', false, 'error', 'Receiver not found or unavailable');
  END IF;
  
  IF NOT listing_exists THEN
    RETURN json_build_object('success', false, 'error', 'Listing not found or inactive');
  END IF;
  
  -- Single transaction for all operations
  INSERT INTO pings (sender_username, receiver_username, listing_id, message)
  VALUES (sender_username, receiver_username, listing_id, message)
  RETURNING id INTO ping_id;
  
  -- Upsert chat
  INSERT INTO chats (listing_id, participant_a, participant_b)
  VALUES (listing_id, sender_username, receiver_username)
  ON CONFLICT (listing_id, participant_a, participant_b) 
  DO UPDATE SET updated_at = NOW()
  RETURNING id INTO chat_id;
  
  -- Add message if provided
  IF message != '' THEN
    INSERT INTO messages (chat_id, sender_username, text)
    VALUES (chat_id, sender_username, message)
    RETURNING id INTO message_id;
  END IF;
  
  RETURN json_build_object(
    'success', true,
    'ping_id', ping_id,
    'chat_id', chat_id,
    'message_id', message_id
  );
END;
$$ LANGUAGE plpgsql;

-- 4. Optimized listings query with distance calculation
CREATE OR REPLACE FUNCTION get_listings_optimized_v2(
  user_lat double precision,
  user_lng double precision,
  page_num integer DEFAULT 1,
  page_size integer DEFAULT 20,
  max_distance_km integer DEFAULT 50,
  category_filter text DEFAULT NULL
) RETURNS TABLE(
  id uuid,
  title text,
  description text,
  price numeric,
  price_unit text,
  category text,
  latitude double precision,
  longitude double precision,
  distance_km double precision,
  image_count integer,
  has_images boolean,
  created_at timestamp with time zone,
  seller_username text
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    l.id,
    l.title,
    l.description,
    l.price,
    l.price_unit,
    l.category,
    l.latitude,
    l.longitude,
    ST_Distance(
      l.location::geography,
      ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography
    ) / 1000 as distance_km,
    COALESCE(array_length(l.images, 1), 0) as image_count,
    COALESCE(array_length(l.images, 1), 0) > 0 as has_images,
    l.created_at,
    l.seller_username
  FROM listings l
  WHERE l.is_active = true
    AND l.latitude IS NOT NULL 
    AND l.longitude IS NOT NULL
    AND ST_DWithin(
      l.location::geography,
      ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography,
      max_distance_km * 1000
    )
    AND (category_filter IS NULL OR l.category = category_filter)
  ORDER BY distance_km ASC, l.created_at DESC
  LIMIT page_size
  OFFSET (page_num - 1) * page_size;
END;
$$ LANGUAGE plpgsql;

-- 5. Add query result caching table
CREATE TABLE IF NOT EXISTS query_cache (
  cache_key text PRIMARY KEY,
  result_data jsonb NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  expires_at timestamp with time zone NOT NULL,
  access_count integer DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_query_cache_expires 
ON query_cache(expires_at);

-- 6. Cache management functions
CREATE OR REPLACE FUNCTION get_cached_result(cache_key_param text)
RETURNS jsonb AS $$
DECLARE
  cached_result jsonb;
BEGIN
  SELECT result_data INTO cached_result
  FROM query_cache
  WHERE cache_key = cache_key_param
    AND expires_at > now();
  
  IF cached_result IS NOT NULL THEN
    UPDATE query_cache 
    SET access_count = access_count + 1
    WHERE cache_key = cache_key_param;
  END IF;
  
  RETURN cached_result;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION set_cached_result(
  cache_key_param text,
  result_data_param jsonb,
  ttl_seconds integer DEFAULT 300
)
RETURNS void AS $$
BEGIN
  INSERT INTO query_cache (cache_key, result_data, expires_at)
  VALUES (cache_key_param, result_data_param, now() + interval '1 second' * ttl_seconds)
  ON CONFLICT (cache_key) 
  DO UPDATE SET 
    result_data = result_data_param,
    expires_at = now() + interval '1 second' * ttl_seconds,
    access_count = 0;
END;
$$ LANGUAGE plpgsql;

-- 7. Cleanup old cache entries
CREATE OR REPLACE FUNCTION cleanup_expired_cache()
RETURNS integer AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM query_cache 
  WHERE expires_at < now();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- 8. Add performance monitoring table
CREATE TABLE IF NOT EXISTS performance_metrics (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  operation text NOT NULL,
  duration_ms integer NOT NULL,
  user_count integer DEFAULT 0,
  timestamp timestamp with time zone DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_performance_metrics_operation_time 
ON performance_metrics(operation, timestamp);

-- 9. Optimize connection settings
-- Note: These require database restart
-- ALTER SYSTEM SET max_connections = 200;
-- ALTER SYSTEM SET shared_buffers = '256MB';
-- ALTER SYSTEM SET effective_cache_size = '1GB';
-- ALTER SYSTEM SET work_mem = '4MB';
-- ALTER SYSTEM SET maintenance_work_mem = '64MB';

-- 10. Add RLS policies for performance
CREATE POLICY IF NOT EXISTS "Enable read access for active listings" ON listings
FOR SELECT USING (is_active = true);

CREATE POLICY IF NOT EXISTS "Enable read access for public users" ON users
FOR SELECT USING (isAvailable = true);

-- 11. Create materialized view for analytics
CREATE MATERIALIZED VIEW IF NOT EXISTS listing_analytics AS
SELECT 
  category,
  COUNT(*) as total_listings,
  COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') as new_this_week,
  AVG(price) as avg_price,
  COUNT(*) FILTER (WHERE array_length(images, 1) > 0) as listings_with_images
FROM listings 
WHERE is_active = true
GROUP BY category;

CREATE UNIQUE INDEX IF NOT EXISTS idx_listing_analytics_category 
ON listing_analytics(category);

-- 12. Function to refresh analytics
CREATE OR REPLACE FUNCTION refresh_listing_analytics()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY listing_analytics;
END;
$$ LANGUAGE plpgsql;

-- 13. Schedule analytics refresh (requires pg_cron extension)
-- SELECT cron.schedule('refresh-analytics', '0 */6 * * *', 'SELECT refresh_listing_analytics();');

-- 14. Add rate limiting table
CREATE TABLE IF NOT EXISTS rate_limits (
  key text PRIMARY KEY,
  requests integer DEFAULT 1,
  window_start timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_window 
ON rate_limits(window_start);

-- 15. Rate limiting function
CREATE OR REPLACE FUNCTION check_rate_limit(
  rate_key text,
  max_requests integer DEFAULT 30,
  window_minutes integer DEFAULT 5
)
RETURNS boolean AS $$
DECLARE
  current_requests integer;
BEGIN
  -- Clean old entries
  DELETE FROM rate_limits 
  WHERE window_start < now() - interval '1 minute' * window_minutes;
  
  -- Get current request count
  SELECT requests INTO current_requests
  FROM rate_limits
  WHERE key = rate_key;
  
  IF current_requests IS NULL THEN
    -- First request
    INSERT INTO rate_limits (key, requests, window_start)
    VALUES (rate_key, 1, now());
    RETURN true;
  ELSIF current_requests < max_requests THEN
    -- Increment request count
    UPDATE rate_limits 
    SET requests = requests + 1
    WHERE key = rate_key;
    RETURN true;
  ELSE
    -- Rate limit exceeded
    RETURN false;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 16. Add database monitoring
CREATE OR REPLACE FUNCTION get_database_stats()
RETURNS json AS $$
DECLARE
  stats json;
BEGIN
  SELECT json_build_object(
    'active_connections', (SELECT count(*) FROM pg_stat_activity WHERE state = 'active'),
    'total_connections', (SELECT count(*) FROM pg_stat_activity),
    'cache_hit_ratio', (
      SELECT round(100.0 * sum(heap_blks_hit) / (sum(heap_blks_hit) + sum(heap_blks_read)), 2)
      FROM pg_statio_user_tables
    ),
    'slow_queries', (
      SELECT count(*) 
      FROM pg_stat_activity 
      WHERE state = 'active' 
        AND query_start < now() - interval '5 seconds'
    )
  ) INTO stats;
  
  RETURN stats;
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION send_ping_optimized(text, text, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_listings_optimized_v2(double precision, double precision, integer, integer, integer, text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_cached_result(text) TO authenticated;
GRANT EXECUTE ON FUNCTION set_cached_result(text, jsonb, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION check_rate_limit(text, integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION get_database_stats() TO service_role;

-- Insert initial analytics data
INSERT INTO listing_analytics 
SELECT 
  category,
  COUNT(*) as total_listings,
  COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') as new_this_week,
  AVG(price) as avg_price,
  COUNT(*) FILTER (WHERE array_length(images, 1) > 0) as listings_with_images
FROM listings 
WHERE is_active = true
GROUP BY category
ON CONFLICT (category) DO NOTHING; 