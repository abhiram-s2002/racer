-- 🔍 SECURITY VERIFICATION SCRIPT
-- Run this after applying security-fixes.sql to verify all issues are resolved

-- =====================================================
-- 1. CHECK RLS STATUS ON ALL TABLES
-- =====================================================

SELECT 
    'RLS Status Check' as check_type,
    schemaname,
    tablename,
    CASE 
        WHEN rowsecurity THEN '✅ ENABLED'
        ELSE '❌ DISABLED'
    END as rls_status
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename NOT LIKE 'pg_%'
AND tablename != 'spatial_ref_sys'  -- PostGIS system table
ORDER BY tablename;

-- =====================================================
-- 2. CHECK POLICY COUNT PER TABLE
-- =====================================================

SELECT 
    'Policy Count Check' as check_type,
    schemaname,
    tablename,
    COUNT(*) as policy_count,
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ POLICIES EXIST'
        ELSE '❌ NO POLICIES'
    END as policy_status
FROM pg_policies 
WHERE schemaname = 'public'
GROUP BY schemaname, tablename
ORDER BY tablename;

-- =====================================================
-- 3. CHECK SECURITY DEFINER VIEWS
-- =====================================================

SELECT 
    'Security Definer Views Check' as check_type,
    schemaname,
    viewname,
    CASE 
        WHEN security_definer THEN '❌ SECURITY DEFINER'
        ELSE '✅ SECURITY INVOKER'
    END as security_type
FROM pg_views 
WHERE schemaname = 'public'
AND viewname IN ('pings_with_listings', 'phone_verification_analytics', 'user_verification_status');

-- =====================================================
-- 4. TEST USER ACCESS PERMISSIONS
-- =====================================================

-- Test if users can only access their own data
-- (This should be run as a regular user, not superuser)

-- Test users table access
SELECT 
    'Users Table Access Test' as test_type,
    'Should only see own profile' as expected_behavior,
    COUNT(*) as accessible_records
FROM public.users;

-- Test listings table access  
SELECT 
    'Listings Table Access Test' as test_type,
    'Should see all listings' as expected_behavior,
    COUNT(*) as accessible_records
FROM public.listings;

-- Test chats table access
SELECT 
    'Chats Table Access Test' as test_type,
    'Should only see own chats' as expected_behavior,
    COUNT(*) as accessible_records
FROM public.chats;

-- =====================================================
-- 5. COMPREHENSIVE SECURITY AUDIT
-- =====================================================

-- Run the security audit function
SELECT 
    'Security Audit Results' as audit_type,
    issue_type,
    table_name,
    description,
    severity
FROM security_audit();

-- =====================================================
-- 6. CHECK OVERALL SECURITY STATUS
-- =====================================================

-- Run the security status check function
SELECT 
    'Overall Security Status' as status_type,
    table_name,
    CASE 
        WHEN rls_enabled THEN '✅ RLS Enabled'
        ELSE '❌ RLS Disabled'
    END as rls_status,
    policy_count,
    CASE 
        WHEN policy_count > 0 THEN '✅ Policies Exist'
        ELSE '❌ No Policies'
    END as policy_status
FROM check_security_status();

-- =====================================================
-- 7. VERIFICATION SUMMARY
-- =====================================================

WITH security_summary AS (
    SELECT 
        COUNT(*) as total_tables,
        COUNT(CASE WHEN rowsecurity THEN 1 END) as tables_with_rls,
        COUNT(CASE WHEN NOT rowsecurity THEN 1 END) as tables_without_rls
    FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename NOT LIKE 'pg_%'
    AND tablename != 'spatial_ref_sys'
),
policy_summary AS (
    SELECT 
        COUNT(DISTINCT tablename) as tables_with_policies
    FROM pg_policies 
    WHERE schemaname = 'public'
),
view_summary AS (
    SELECT 
        COUNT(*) as security_definer_views
    FROM pg_views 
    WHERE schemaname = 'public'
    AND security_definer
    AND viewname IN ('pings_with_listings', 'phone_verification_analytics', 'user_verification_status')
)
SELECT 
    'SECURITY VERIFICATION SUMMARY' as summary_type,
    s.total_tables,
    s.tables_with_rls,
    s.tables_without_rls,
    p.tables_with_policies,
    v.security_definer_views,
    CASE 
        WHEN s.tables_without_rls = 0 AND v.security_definer_views = 0 THEN '✅ ALL SECURITY ISSUES FIXED'
        ELSE '❌ SECURITY ISSUES REMAIN'
    END as overall_status
FROM security_summary s
CROSS JOIN policy_summary p
CROSS JOIN view_summary v;

-- =====================================================
-- 8. RECOMMENDATIONS
-- =====================================================

SELECT 
    'RECOMMENDATIONS' as section,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_tables 
            WHERE schemaname = 'public' 
            AND NOT rowsecurity 
            AND tablename NOT LIKE 'pg_%'
            AND tablename != 'spatial_ref_sys'
        ) THEN '❌ Enable RLS on remaining tables'
        ELSE '✅ All tables have RLS enabled'
    END as rls_recommendation,
    
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_tables t
            LEFT JOIN pg_policies p ON t.tablename = p.tablename AND t.schemaname = p.schemaname
            WHERE t.schemaname = 'public' 
            AND t.rowsecurity
            AND p.tablename IS NULL
        ) THEN '❌ Add policies to tables with RLS but no policies'
        ELSE '✅ All tables with RLS have policies'
    END as policy_recommendation,
    
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_views 
            WHERE schemaname = 'public'
            AND security_definer
            AND viewname IN ('pings_with_listings', 'phone_verification_analytics', 'user_verification_status')
        ) THEN '❌ Remove SECURITY DEFINER from views'
        ELSE '✅ All views use SECURITY INVOKER'
    END as view_recommendation; 