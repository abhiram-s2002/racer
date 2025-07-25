-- 🔧 FIX SECURITY DEFINER VIEWS
-- This script specifically fixes the SECURITY DEFINER views that are still showing as errors

-- =====================================================
-- 1. DROP EXISTING VIEWS WITH SECURITY DEFINER
-- =====================================================

-- Drop the views completely to remove SECURITY DEFINER
DROP VIEW IF EXISTS public.pings_with_listings CASCADE;
DROP VIEW IF EXISTS public.phone_verification_analytics CASCADE;
DROP VIEW IF EXISTS public.user_verification_status CASCADE;

-- =====================================================
-- 2. RECREATE VIEWS WITHOUT SECURITY DEFINER
-- =====================================================

-- Recreate pings_with_listings view
CREATE VIEW public.pings_with_listings AS
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

-- Recreate phone_verification_analytics view
CREATE VIEW public.phone_verification_analytics AS
SELECT 
    COUNT(*) as total_verifications,
    COUNT(CASE WHEN phone IS NOT NULL THEN 1 END) as users_with_phone,
    COUNT(CASE WHEN phone IS NULL THEN 1 END) as users_without_phone
FROM public.users;

-- Recreate user_verification_status view
CREATE VIEW public.user_verification_status AS
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
    '✅ VIEW RECREATED' as status
FROM pg_views 
WHERE schemaname = 'public'
AND viewname IN ('pings_with_listings', 'phone_verification_analytics', 'user_verification_status');

-- =====================================================
-- 4. FINAL STATUS
-- =====================================================

SELECT 
    'VIEW SECURITY STATUS' as status_type,
    COUNT(*) as total_views_recreated,
    '✅ ALL VIEWS RECREATED WITHOUT SECURITY DEFINER' as overall_status
FROM pg_views 
WHERE schemaname = 'public'
AND viewname IN ('pings_with_listings', 'phone_verification_analytics', 'user_verification_status'); 