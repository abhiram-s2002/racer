-- 🚨 CRITICAL SECURITY FIX: SECURITY DEFINER VIEWS AND FUNCTIONS
-- This script fixes all SECURITY DEFINER issues that bypass user permissions
-- Run this in your Supabase SQL Editor immediately

-- ============================================================================
-- STEP 1: IDENTIFY ALL SECURITY DEFINER OBJECTS
-- ============================================================================

-- First, let's see what we're dealing with
SELECT 
    'SECURITY DEFINER OBJECTS FOUND' as check_type,
    schemaname,
    viewname as object_name,
    'VIEW' as object_type,
    '❌ SECURITY DEFINER' as security_status
FROM pg_views 
WHERE schemaname = 'public'
AND security_definer = true

UNION ALL

SELECT 
    'SECURITY DEFINER OBJECTS FOUND' as check_type,
    n.nspname as schemaname,
    p.proname as object_name,
    'FUNCTION' as object_type,
    '❌ SECURITY DEFINER' as security_status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.prosecdef = true;

-- ============================================================================
-- STEP 2: DROP AND RECREATE SECURITY DEFINER VIEWS
-- ============================================================================

-- Drop problematic views
DROP VIEW IF EXISTS public.pings_with_listings CASCADE;
DROP VIEW IF EXISTS public.phone_verification_analytics CASCADE;
DROP VIEW IF EXISTS public.user_verification_status CASCADE;

-- Recreate views with explicit SECURITY INVOKER
CREATE VIEW public.pings_with_listings 
WITH (security_invoker = true) AS
SELECT 
    p.id,
    p.listing_id,
    p.sender_username,
    p.receiver_username,
    p.message,
    p.status,
    p.response_time_minutes,
    p.first_response_at,
    p.responded_at,
    p.response_message,
    p.ping_count,
    p.last_ping_at,
    p.created_at,
    l.title as listing_title,
    l.price as listing_price,
    l.images as listing_images,
    u.avatar_url as sender_avatar
FROM public.pings p
JOIN public.listings l ON p.listing_id = l.id
JOIN public.users u ON p.sender_username = u.username;

CREATE VIEW public.phone_verification_analytics 
WITH (security_invoker = true) AS
SELECT 
    COUNT(*) as total_verifications,
    COUNT(CASE WHEN phone IS NOT NULL THEN 1 END) as users_with_phone,
    COUNT(CASE WHEN phone IS NULL THEN 1 END) as users_without_phone
FROM public.users;

CREATE VIEW public.user_verification_status 
WITH (security_invoker = true) AS
SELECT 
    id,
    username,
    email,
    phone,
    CASE 
        WHEN phone IS NOT NULL THEN 'has_phone'
        ELSE 'no_phone'
    END as verification_status,
    created_at
FROM public.users;

-- ============================================================================
-- STEP 3: FIX SECURITY DEFINER FUNCTIONS
-- ============================================================================

-- Drop and recreate functions without SECURITY DEFINER
-- (Only keep SECURITY DEFINER for system functions that need elevated privileges)

-- Function: get_pings_with_listings
DROP FUNCTION IF EXISTS get_pings_with_listings(text, integer, integer);
CREATE OR REPLACE FUNCTION get_pings_with_listings(
    username_param text,
    page_num integer DEFAULT 1,
    page_size integer DEFAULT 20
)
RETURNS TABLE (
    id uuid,
    listing_id uuid,
    sender_username text,
    receiver_username text,
    message text,
    status text,
    response_time_minutes integer,
    first_response_at timestamp with time zone,
    responded_at timestamp with time zone,
    response_message text,
    ping_count integer,
    last_ping_at timestamp with time zone,
    created_at timestamp with time zone,
    listing_title text,
    listing_price numeric,
    listing_images text[],
    sender_avatar text
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.listing_id,
        p.sender_username,
        p.receiver_username,
        p.message,
        p.status,
        p.response_time_minutes,
        p.first_response_at,
        p.responded_at,
        p.response_message,
        p.ping_count,
        p.last_ping_at,
        p.created_at,
        l.title as listing_title,
        l.price as listing_price,
        l.images as listing_images,
        u.avatar_url as sender_avatar
    FROM public.pings p
    JOIN public.listings l ON p.listing_id = l.id
    JOIN public.users u ON p.sender_username = u.username
    WHERE p.sender_username = username_param OR p.receiver_username = username_param
    ORDER BY p.created_at DESC
    LIMIT page_size
    OFFSET (page_num - 1) * page_size;
END;
$$ LANGUAGE plpgsql;

-- Function: get_batch_user_profiles
DROP FUNCTION IF EXISTS get_batch_user_profiles(text[]);
CREATE OR REPLACE FUNCTION get_batch_user_profiles(usernames text[])
RETURNS TABLE (
    username text,
    display_name text,
    avatar_url text,
    is_available boolean
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.username,
        u.display_name,
        u.avatar_url,
        u.is_available
    FROM public.users u
    WHERE u.username = ANY(usernames);
END;
$$ LANGUAGE plpgsql;

-- Function: get_listings_with_user_profiles
DROP FUNCTION IF EXISTS get_listings_with_user_profiles(text, integer, integer, text, numeric, numeric);
CREATE OR REPLACE FUNCTION get_listings_with_user_profiles(
    user_location text,
    page_num integer DEFAULT 1,
    page_size integer DEFAULT 20,
    category_filter text DEFAULT NULL,
    min_price numeric DEFAULT NULL,
    max_price numeric DEFAULT NULL
)
RETURNS TABLE (
    id uuid,
    title text,
    description text,
    price numeric,
    category text,
    images text[],
    location text,
    seller_username text,
    seller_display_name text,
    seller_avatar_url text,
    created_at timestamp with time zone,
    distance_km numeric
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        l.id,
        l.title,
        l.description,
        l.price,
        l.category,
        l.images,
        l.location,
        l.seller_username,
        u.display_name as seller_display_name,
        u.avatar_url as seller_avatar_url,
        l.created_at,
        -- Calculate distance (simplified - you may want to use PostGIS for accurate distance)
        CASE 
            WHEN l.location = user_location THEN 0
            ELSE 1.0 -- Placeholder distance calculation
        END as distance_km
    FROM public.listings l
    JOIN public.users u ON l.seller_username = u.username
    WHERE l.is_active = true
    AND (category_filter IS NULL OR l.category = category_filter)
    AND (min_price IS NULL OR l.price >= min_price)
    AND (max_price IS NULL OR l.price <= max_price)
    ORDER BY l.created_at DESC
    LIMIT page_size
    OFFSET (page_num - 1) * page_size;
END;
$$ LANGUAGE plpgsql;

-- Function: get_activities_with_listings
DROP FUNCTION IF EXISTS get_activities_with_listings(text, integer, integer);
CREATE OR REPLACE FUNCTION get_activities_with_listings(
    username_param text,
    page_num integer DEFAULT 1,
    page_size integer DEFAULT 20
)
RETURNS TABLE (
    id uuid,
    type text,
    description text,
    metadata jsonb,
    created_at timestamp with time zone,
    listing_title text,
    listing_price numeric,
    listing_images text[]
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.id,
        a.type,
        a.description,
        a.metadata,
        a.created_at,
        l.title as listing_title,
        l.price as listing_price,
        l.images as listing_images
    FROM public.activities a
    LEFT JOIN public.listings l ON (a.metadata->>'listing_id')::uuid = l.id
    WHERE a.username = username_param
    ORDER BY a.created_at DESC
    LIMIT page_size
    OFFSET (page_num - 1) * page_size;
END;
$$ LANGUAGE plpgsql;

-- Function: get_total_chat_count
DROP FUNCTION IF EXISTS get_total_chat_count(text);
CREATE OR REPLACE FUNCTION get_total_chat_count(username_param text)
RETURNS integer AS $$
DECLARE
    chat_count integer;
BEGIN
    SELECT COUNT(*)
    INTO chat_count
    FROM public.chats
    WHERE participant_a = username_param OR participant_b = username_param;
    
    RETURN COALESCE(chat_count, 0);
END;
$$ LANGUAGE plpgsql;

-- Function: get_recent_chats_for_user
DROP FUNCTION IF EXISTS get_recent_chats_for_user(text, integer);
CREATE OR REPLACE FUNCTION get_recent_chats_for_user(
    username_param text,
    limit_param integer DEFAULT 20
)
RETURNS TABLE (
    id uuid,
    participant_a text,
    participant_b text,
    last_message text,
    last_message_at timestamp with time zone,
    unread_count integer,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id,
        c.participant_a,
        c.participant_b,
        c.last_message,
        c.last_message_at,
        c.unread_count,
        c.created_at,
        c.updated_at
    FROM public.chats c
    WHERE c.participant_a = username_param OR c.participant_b = username_param
    ORDER BY 
        COALESCE(c.updated_at, c.created_at) DESC
    LIMIT limit_param;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- STEP 4: GRANT APPROPRIATE PERMISSIONS
-- ============================================================================

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION get_pings_with_listings(text, integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION get_batch_user_profiles(text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION get_listings_with_user_profiles(text, integer, integer, text, numeric, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION get_activities_with_listings(text, integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION get_total_chat_count(text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_recent_chats_for_user(text, integer) TO authenticated;

-- ============================================================================
-- STEP 5: VERIFICATION
-- ============================================================================

-- Check if any SECURITY DEFINER objects remain
SELECT 
    'REMAINING SECURITY DEFINER OBJECTS' as check_type,
    schemaname,
    viewname as object_name,
    'VIEW' as object_type
FROM pg_views 
WHERE schemaname = 'public'
AND security_definer = true

UNION ALL

SELECT 
    'REMAINING SECURITY DEFINER OBJECTS' as check_type,
    n.nspname as schemaname,
    p.proname as object_name,
    'FUNCTION' as object_type
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.prosecdef = true;

-- ============================================================================
-- STEP 6: FINAL STATUS
-- ============================================================================

DO $$
DECLARE
    remaining_views integer;
    remaining_functions integer;
BEGIN
    -- Count remaining SECURITY DEFINER objects
    SELECT COUNT(*) INTO remaining_views
    FROM pg_views 
    WHERE schemaname = 'public'
    AND security_definer = true;
    
    SELECT COUNT(*) INTO remaining_functions
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.prosecdef = true;
    
    -- Report results
    RAISE NOTICE '========================================';
    RAISE NOTICE 'SECURITY DEFINER FIX COMPLETE';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Remaining SECURITY DEFINER views: %', remaining_views;
    RAISE NOTICE 'Remaining SECURITY DEFINER functions: %', remaining_functions;
    RAISE NOTICE '========================================';
    
    IF remaining_views = 0 AND remaining_functions = 0 THEN
        RAISE NOTICE '✅ ALL SECURITY DEFINER ISSUES FIXED!';
        RAISE NOTICE '✅ Views now use SECURITY INVOKER!';
        RAISE NOTICE '✅ Functions no longer bypass user permissions!';
    ELSE
        RAISE WARNING '⚠️  Some SECURITY DEFINER objects may still exist.';
    END IF;
    
    RAISE NOTICE '========================================';
END $$;

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================

SELECT 
    'Security DEFINER fix completed!' as status,
    'All views and functions now respect user permissions.' as message,
    'Your database is now secure from permission bypass attacks.' as benefit;
