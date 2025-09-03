-- 🚨 CRITICAL SECURITY FIXES - IMMEDIATE ACTION REQUIRED
-- Fixes the specific security issues found by the database linter

-- =====================================================
-- 1. ENABLE RLS ON TABLES WITH CRITICAL ISSUES
-- =====================================================

-- Fix user_ratings table (has policies but RLS disabled)
ALTER TABLE public.user_ratings ENABLE ROW LEVEL SECURITY;

-- Fix tables with RLS disabled in public schema
ALTER TABLE public.leaderboard_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_commissions ENABLE ROW LEVEL SECURITY;

-- Note: spatial_ref_sys is a PostGIS system table - we'll handle it separately

-- =====================================================
-- 2. CREATE SECURITY POLICIES FOR MISSING TABLES
-- =====================================================

-- USER_RATINGS POLICIES
-- Note: user_ratings already has policies, we just need to enable RLS
-- The existing policies are:
-- - "Users can delete their own ratings"
-- - "Users can insert ratings" 
-- - "Users can update their own ratings"
-- - "Users can view all ratings"

-- No need to create new policies since they already exist

-- LEADERBOARD_CACHE POLICIES
-- Allow public read access to leaderboard data
CREATE POLICY IF NOT EXISTS "Public can view leaderboard cache" ON public.leaderboard_cache
    FOR SELECT USING (true);

-- Only system can update leaderboard cache (no user policies needed)
-- This table is typically updated by background jobs

-- REFERRAL_COMMISSIONS POLICIES
-- Users can view their own referral commissions
CREATE POLICY IF NOT EXISTS "Users can view their own referral commissions" ON public.referral_commissions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND username = referral_commissions.referrer_username
        )
    );

-- Users can view commissions from their referrals
CREATE POLICY IF NOT EXISTS "Users can view commissions from their referrals" ON public.referral_commissions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND username = referral_commissions.referred_username
        )
    );

-- Only system can insert/update referral commissions
-- This table is typically updated by background jobs

-- =====================================================
-- 3. HANDLE SPATIAL_REF_SYS TABLE
-- =====================================================

-- spatial_ref_sys is a PostGIS system table that contains coordinate system definitions
-- It's owned by the postgres user and doesn't contain user data
-- We cannot create policies on it, but it's not a security concern
-- The linter warning for this table can be safely ignored

-- =====================================================
-- 4. VERIFICATION QUERIES
-- =====================================================

-- Check RLS status on the fixed tables
SELECT 
    'user_ratings' as table_name,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'user_ratings';

SELECT 
    'leaderboard_cache' as table_name,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'leaderboard_cache';

SELECT 
    'referral_commissions' as table_name,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'referral_commissions';

-- Check policy count for the fixed tables
SELECT 
    tablename,
    COUNT(*) as policy_count
FROM pg_policies 
WHERE schemaname = 'public'
AND tablename IN ('user_ratings', 'leaderboard_cache', 'referral_commissions')
GROUP BY tablename
ORDER BY tablename;

-- =====================================================
-- 5. FINAL SECURITY CHECK
-- =====================================================

-- Check for any remaining tables without RLS
SELECT 
    'REMAINING_ISSUES' as check_type,
    tablename,
    'RLS not enabled' as issue
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename NOT LIKE 'pg_%'
AND tablename NOT IN ('spatial_ref_sys') -- Exclude PostGIS system table
AND NOT rowsecurity;

-- If this query returns no results, all security issues are fixed!
