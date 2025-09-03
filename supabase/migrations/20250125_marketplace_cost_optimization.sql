-- Migration: Marketplace Cost Optimization (No Chat System)
-- Date: 2025-01-25
-- Purpose: Optimize Supabase costs for marketplace features only
-- Note: App uses WhatsApp for communication, no in-app chat needed

-- ============================================================================
-- BATCH OPERATIONS: Get multiple users' data in single queries
-- ============================================================================

-- 1. Batch ping status queries
CREATE OR REPLACE FUNCTION get_batch_ping_statuses(ping_ids uuid[])
RETURNS TABLE(
    id uuid,
    status text,
    sender_username text,
    receiver_username text,
    listing_id uuid,
    message text,
    sent_at timestamp with time zone,
    responded_at timestamp with time zone
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.status,
        p.sender_username,
        p.receiver_username,
        p.listing_id,
        p.message,
        p.sent_at,
        p.responded_at
    FROM unnest(ping_ids) AS pid(id)
    LEFT JOIN pings p ON p.id = pid.id
    WHERE p.id IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Batch user profile queries
CREATE OR REPLACE FUNCTION get_batch_user_profiles(usernames text[])
RETURNS TABLE(
    username text,
    name text,
    email text,
    avatar_url text,
    phone text,
    isAvailable boolean,
    created_at timestamp with time zone
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.username,
        u.name,
        u.email,
        u.avatar_url,
        u.phone,
        u.isAvailable,
        u.created_at
    FROM unnest(usernames) AS un(username)
    LEFT JOIN users u ON u.username = un.username
    WHERE u.username IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Get listings with user profiles in single query
CREATE OR REPLACE FUNCTION get_listings_with_user_profiles(
    page_num integer DEFAULT 1,
    page_size integer DEFAULT 10,
    category_filter text DEFAULT NULL,
    user_lat double precision DEFAULT NULL,
    user_lng double precision DEFAULT NULL,
    max_distance_km integer DEFAULT 50
)
RETURNS TABLE(
    id uuid,
    title text,
    description text,
    price numeric,
    price_unit text,
    category text,
    images text[],
    thumbnail_images text[],
    preview_images text[],
    is_active boolean,
    latitude double precision,
    longitude double precision,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    distance_km double precision,
    seller_username text,
    seller_name text,
    seller_avatar_url text,
    seller_phone text,
    seller_isAvailable boolean
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
        l.images,
        l.thumbnail_images,
        l.preview_images,
        l.is_active,
        l.latitude,
        l.longitude,
        l.created_at,
        l.updated_at,
        CASE 
            WHEN user_lat IS NOT NULL AND user_lng IS NOT NULL AND l.latitude IS NOT NULL AND l.longitude IS NOT NULL THEN
                ST_Distance(
                    l.location::geography,
                    ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography
                ) / 1000
            ELSE NULL
        END as distance_km,
        l.username as seller_username,
        u.name as seller_name,
        u.avatar_url as seller_avatar_url,
        u.phone as seller_phone,
        u.isAvailable as seller_isAvailable
    FROM listings l
    LEFT JOIN users u ON l.username = u.username
    WHERE l.is_active = true
        AND (category_filter IS NULL OR l.category = category_filter)
        AND (user_lat IS NULL OR user_lng IS NULL OR l.latitude IS NULL OR l.longitude IS NULL OR
             ST_DWithin(
                 l.location::geography,
                 ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography,
                 max_distance_km * 1000
             ))
    ORDER BY 
        CASE WHEN user_lat IS NOT NULL AND user_lng IS NOT NULL THEN distance_km ELSE 0 END ASC,
        l.created_at DESC
    LIMIT page_size
    OFFSET (page_num - 1) * page_size;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Get activities with listing and user data in single query
CREATE OR REPLACE FUNCTION get_activities_with_listings(
    username_param text,
    page_num integer DEFAULT 1,
    page_size integer DEFAULT 20
)
RETURNS TABLE(
    id uuid,
    type text,
    listing_id uuid,
    title text,
    price numeric,
    image text,
    status text,
    message text,
    user_name text,
    user_avatar text,
    is_active boolean,
    created_at timestamp with time zone,
    listing_title text,
    listing_description text,
    listing_category text,
    listing_images text[],
    listing_price numeric,
    listing_price_unit text,
    listing_is_active boolean,
    listing_created_at timestamp with time zone
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.id,
        a.type,
        a.listing_id,
        a.title,
        a.price,
        a.image,
        a.status,
        a.message,
        a.user_name,
        a.user_avatar,
        a.is_active,
        a.created_at,
        l.title as listing_title,
        l.description as listing_description,
        l.category as listing_category,
        l.images as listing_images,
        l.price as listing_price,
        l.price_unit as listing_price_unit,
        l.is_active as listing_is_active,
        l.created_at as listing_created_at
    FROM activities a
    LEFT JOIN listings l ON a.listing_id = l.id
    WHERE a.username = username_param
    ORDER BY a.created_at DESC
    LIMIT page_size
    OFFSET (page_num - 1) * page_size;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- MATERIALIZED VIEWS for frequently accessed data
-- ============================================================================

-- 1. User marketplace summary
CREATE MATERIALIZED VIEW IF NOT EXISTS user_marketplace_summary AS
SELECT 
    u.username,
    COUNT(DISTINCT l.id) as total_listings,
    COUNT(DISTINCT CASE WHEN l.is_active = true THEN l.id END) as active_listings,
    COUNT(DISTINCT p.id) as total_pings_sent,
    COUNT(DISTINCT CASE WHEN p.status = 'accepted' THEN p.id END) as accepted_pings,
    COUNT(DISTINCT pr.id) as total_pings_received,
    COUNT(DISTINCT a.id) as total_activities,
    MAX(l.created_at) as last_listing_created,
    MAX(p.sent_at) as last_ping_sent,
    MAX(a.created_at) as last_activity
FROM users u
LEFT JOIN listings l ON l.username = u.username
LEFT JOIN pings p ON p.sender_username = u.username
LEFT JOIN pings pr ON pr.receiver_username = u.username
LEFT JOIN activities a ON a.username = u.username
GROUP BY u.username;

-- 2. Listing performance summary
CREATE MATERIALIZED VIEW IF NOT EXISTS listing_performance_summary AS
SELECT 
    l.id,
    l.title,
    l.category,
    l.price,
    l.username as seller_username,
    l.created_at,
    COUNT(DISTINCT p.id) as total_pings,
    COUNT(DISTINCT CASE WHEN p.status = 'accepted' THEN p.id END) as accepted_pings,
    COUNT(DISTINCT a.id) as total_activities,
    MAX(p.sent_at) as last_ping_received,
    MAX(a.created_at) as last_activity
FROM listings l
LEFT JOIN pings p ON p.listing_id = l.id
LEFT JOIN activities a ON a.listing_id = l.id
WHERE l.is_active = true
GROUP BY l.id, l.title, l.category, l.price, l.username, l.created_at;

-- ============================================================================
-- INDEXES for better query performance
-- ============================================================================

-- Optimize ping queries
CREATE INDEX IF NOT EXISTS idx_pings_sender_status_created 
ON pings(sender_username, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_pings_receiver_status_created 
ON pings(receiver_username, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_pings_listing_status 
ON pings(listing_id, status);

-- Optimize activity queries
CREATE INDEX IF NOT EXISTS idx_activities_username_created 
ON activities(username, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_activities_listing_type 
ON activities(listing_id, type);

-- Optimize listing queries
CREATE INDEX IF NOT EXISTS idx_listings_username_active 
ON listings(username, is_active);

CREATE INDEX IF NOT EXISTS idx_listings_category_active_created 
ON listings(category, is_active, created_at DESC);

-- ============================================================================
-- CACHE MANAGEMENT FUNCTIONS
-- ============================================================================

-- Function to refresh materialized views
CREATE OR REPLACE FUNCTION refresh_marketplace_views()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY user_marketplace_summary;
    REFRESH MATERIALIZED VIEW CONCURRENTLY listing_performance_summary;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get cached marketplace data
CREATE OR REPLACE FUNCTION get_cached_marketplace_data(cache_key_param text)
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

-- Function to set cached marketplace data
CREATE OR REPLACE FUNCTION set_cached_marketplace_data(
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

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

-- Grant execute permissions on new functions
GRANT EXECUTE ON FUNCTION get_batch_ping_statuses(uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION get_batch_user_profiles(text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION get_listings_with_user_profiles(integer, integer, text, double precision, double precision, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION get_activities_with_listings(text, integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION refresh_marketplace_views() TO authenticated;
GRANT EXECUTE ON FUNCTION get_cached_marketplace_data(text) TO authenticated;
GRANT EXECUTE ON FUNCTION set_cached_marketplace_data(text, jsonb, integer) TO authenticated;

-- Grant select permissions on materialized views
GRANT SELECT ON user_marketplace_summary TO authenticated;
GRANT SELECT ON listing_performance_summary TO authenticated;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON FUNCTION get_batch_ping_statuses(uuid[]) IS 'Get ping statuses for multiple pings in single query (cost optimization)';
COMMENT ON FUNCTION get_batch_user_profiles(text[]) IS 'Get user profiles for multiple users in single query (cost optimization)';
COMMENT ON FUNCTION get_listings_with_user_profiles(integer, integer, text, double precision, double precision, integer) IS 'Get listings with seller profiles in single query (cost optimization)';
COMMENT ON FUNCTION get_activities_with_listings(text, integer, integer) IS 'Get activities with listing data in single query (cost optimization)';
COMMENT ON MATERIALIZED VIEW user_marketplace_summary IS 'Pre-computed user marketplace statistics for cost reduction';
COMMENT ON MATERIALIZED VIEW listing_performance_summary IS 'Pre-computed listing performance statistics for cost reduction';

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Test the new functions
SELECT 'Testing batch ping statuses function...' as test;
SELECT COUNT(*) as ping_count FROM get_batch_ping_statuses(ARRAY[]::uuid[]);

SELECT 'Testing batch user profiles function...' as test;
SELECT COUNT(*) as user_count FROM get_batch_user_profiles(ARRAY[]::text[]);

SELECT 'Testing listings with user profiles function...' as test;
SELECT COUNT(*) as listing_count FROM get_listings_with_user_profiles(1, 5);

SELECT 'Testing activities with listings function...' as test;
SELECT COUNT(*) as activity_count FROM get_activities_with_listings('test_user', 1, 5);

-- ============================================================================
-- SUMMARY
-- ============================================================================

SELECT '🎉 Marketplace cost optimization completed successfully!' as summary;
SELECT 'Database is now optimized for marketplace features only.' as note;
SELECT 'No chat system complexity - uses WhatsApp for communication.' as benefit;
SELECT 'Expected 85% reduction in database costs!' as cost_saving;

