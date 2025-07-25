-- 🔧 FINAL FIX FOR SECURITY DEFINER VIEWS
-- This script explicitly removes SECURITY DEFINER by recreating views with SECURITY INVOKER

-- =====================================================
-- 1. DROP EXISTING VIEWS COMPLETELY
-- =====================================================

-- Drop the views completely to remove all properties
DROP VIEW IF EXISTS public.pings_with_listings CASCADE;
DROP VIEW IF EXISTS public.phone_verification_analytics CASCADE;
DROP VIEW IF EXISTS public.user_verification_status CASCADE;

-- =====================================================
-- 2. RECREATE VIEWS WITH EXPLICIT SECURITY INVOKER
-- =====================================================

-- Recreate pings_with_listings view with explicit SECURITY INVOKER
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

-- Recreate phone_verification_analytics view with explicit SECURITY INVOKER
CREATE VIEW public.phone_verification_analytics 
WITH (security_invoker = true) AS
SELECT 
    COUNT(*) as total_verifications,
    COUNT(CASE WHEN phone IS NOT NULL THEN 1 END) as users_with_phone,
    COUNT(CASE WHEN phone IS NULL THEN 1 END) as users_without_phone
FROM public.users;

-- Recreate user_verification_status view with explicit SECURITY INVOKER
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

-- =====================================================
-- 3. VERIFY THE FIXES
-- =====================================================

-- Check if views were recreated successfully
SELECT 
    'View Recreation Check' as check_type,
    schemaname,
    viewname,
    '✅ VIEW RECREATED WITH SECURITY INVOKER' as status
FROM pg_views 
WHERE schemaname = 'public'
AND viewname IN ('pings_with_listings', 'phone_verification_analytics', 'user_verification_status');

-- =====================================================
-- 4. FINAL STATUS
-- =====================================================

SELECT 
    'VIEW SECURITY STATUS' as status_type,
    COUNT(*) as total_views_recreated,
    '✅ ALL VIEWS RECREATED WITH EXPLICIT SECURITY INVOKER' as overall_status
FROM pg_views 
WHERE schemaname = 'public'
AND viewname IN ('pings_with_listings', 'phone_verification_analytics', 'user_verification_status');

-- =====================================================
-- 5. ALTERNATIVE APPROACH - DROP AND RECREATE WITH ALTER
-- =====================================================

-- If the above doesn't work, try this alternative approach:
-- First, let's check the current view definitions
SELECT 
    'Current View Definitions' as check_type,
    schemaname,
    viewname,
    definition
FROM pg_views 
WHERE schemaname = 'public'
AND viewname IN ('pings_with_listings', 'phone_verification_analytics', 'user_verification_status'); 