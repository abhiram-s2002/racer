-- 🔍 SECURITY FIXES VERIFICATION SCRIPT
-- Run this after applying the security fixes to verify they worked

-- =====================================================
-- 1. CHECK RLS STATUS ON ALL PUBLIC TABLES
-- =====================================================

SELECT 
    'RLS_STATUS_CHECK' as check_type,
    tablename,
    CASE 
        WHEN rowsecurity THEN '✅ ENABLED' 
        ELSE '❌ DISABLED' 
    END as rls_status
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename NOT LIKE 'pg_%'
ORDER BY tablename;

-- =====================================================
-- 2. CHECK POLICY COUNT PER TABLE
-- =====================================================

SELECT 
    'POLICY_COUNT_CHECK' as check_type,
    t.tablename,
    COALESCE(p.policy_count, 0) as policy_count,
    CASE 
        WHEN COALESCE(p.policy_count, 0) > 0 THEN '✅ HAS POLICIES'
        WHEN t.rowsecurity THEN '⚠️ RLS ENABLED BUT NO POLICIES'
        ELSE '❌ NO POLICIES'
    END as policy_status
FROM pg_tables t
LEFT JOIN (
    SELECT 
        tablename,
        COUNT(*) as policy_count
    FROM pg_policies 
    WHERE schemaname = 'public'
    GROUP BY tablename
) p ON t.tablename = p.tablename
WHERE t.schemaname = 'public' 
AND t.tablename NOT LIKE 'pg_%'
ORDER BY t.tablename;

-- =====================================================
-- 3. SPECIFIC CHECK FOR CRITICAL TABLES
-- =====================================================

SELECT 
    'CRITICAL_TABLES_CHECK' as check_type,
    tablename,
    CASE 
        WHEN rowsecurity THEN '✅ RLS ENABLED' 
        ELSE '❌ RLS DISABLED' 
    END as rls_status,
    (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = t.tablename) as policy_count
FROM pg_tables t
WHERE schemaname = 'public' 
AND tablename IN ('user_ratings', 'leaderboard_cache', 'referral_commissions')
ORDER BY tablename;

-- =====================================================
-- 4. CHECK FOR SECURITY DEFINER VIEWS
-- =====================================================

SELECT 
    'SECURITY_DEFINER_CHECK' as check_type,
    viewname,
    CASE 
        WHEN definition LIKE '%SECURITY DEFINER%' THEN '❌ SECURITY DEFINER FOUND'
        ELSE '✅ NO SECURITY DEFINER'
    END as security_status
FROM pg_views 
WHERE schemaname = 'public'
ORDER BY viewname;

-- =====================================================
-- 5. OVERALL SECURITY SUMMARY
-- =====================================================

WITH security_summary AS (
    SELECT 
        COUNT(*) as total_tables,
        COUNT(CASE WHEN rowsecurity THEN 1 END) as tables_with_rls,
        COUNT(CASE WHEN NOT rowsecurity THEN 1 END) as tables_without_rls
    FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename NOT LIKE 'pg_%'
    AND tablename != 'spatial_ref_sys' -- Exclude PostGIS system table
)
SELECT 
    'SECURITY_SUMMARY' as check_type,
    total_tables,
    tables_with_rls,
    tables_without_rls,
    CASE 
        WHEN tables_without_rls = 0 THEN '🎉 ALL SECURITY ISSUES FIXED!'
        ELSE '⚠️ ' || tables_without_rls || ' TABLES STILL NEED RLS'
    END as status
FROM security_summary;

-- =====================================================
-- 6. FINAL VERIFICATION
-- =====================================================

-- This should return 0 rows if all security issues are fixed
SELECT 
    'REMAINING_ISSUES' as check_type,
    tablename,
    'RLS not enabled' as issue
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename NOT LIKE 'pg_%'
AND tablename NOT IN ('spatial_ref_sys') -- Exclude PostGIS system table
AND NOT rowsecurity;

-- If the above query returns no results, you're good to go! 🎉
