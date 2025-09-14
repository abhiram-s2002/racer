-- Manual fix for get_user_favorites function
-- Run this directly in Supabase SQL Editor

-- First, drop the function completely
DROP FUNCTION IF EXISTS get_user_favorites(UUID, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS get_user_favorites(UUID);
DROP FUNCTION IF EXISTS get_user_favorites;

-- Recreate the function with correct types
CREATE OR REPLACE FUNCTION get_user_favorites(
    p_user_id UUID,
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    title TEXT,
    description TEXT,
    price NUMERIC,
    price_unit TEXT,
    category TEXT,
    username TEXT,
    name TEXT,
    avatar_url TEXT,
    location_display TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    thumbnail_images TEXT[],
    preview_images TEXT[],
    created_at TIMESTAMP WITH TIME ZONE,
    view_count INTEGER,
    ping_count INTEGER,
    expires_at TIMESTAMP WITH TIME ZONE,
    favorited_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        l.id,
        l.title,
        l.description,
        l.price,
        l.price_unit,
        l.category,
        l.username,
        u.name,
        u.avatar_url,
        u.location_display,
        l.latitude,
        l.longitude,
        l.thumbnail_images,
        l.preview_images,
        l.created_at,
        COALESCE(l.view_count, 0) as view_count,
        COALESCE(l.ping_count, 0) as ping_count,
        l.expires_at,
        f.created_at as favorited_at
    FROM public.user_favorites f
    JOIN public.listings l ON f.listing_id = l.id
    JOIN public.users u ON l.username = u.username
    WHERE f.user_id = p_user_id
    ORDER BY f.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_user_favorites TO authenticated;

-- Test the function
SELECT 'Function recreated successfully' as status;
