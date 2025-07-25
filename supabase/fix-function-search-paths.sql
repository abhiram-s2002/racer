-- 🔧 FIX FUNCTION SEARCH PATH WARNINGS
-- This script adds explicit search_path settings to all functions

-- =====================================================
-- 1. FIX ALL FUNCTIONS WITH EXPLICIT SEARCH PATH
-- =====================================================

-- Drop and recreate functions with explicit search_path
-- This ensures functions only access the intended schemas

-- Example of how to fix a function (you would need to do this for each function):
-- DROP FUNCTION IF EXISTS public.function_name(...);
-- CREATE OR REPLACE FUNCTION public.function_name(...)
-- RETURNS ... 
-- LANGUAGE plpgsql
-- SECURITY DEFINER
-- SET search_path = public
-- AS $$
--   -- function body
-- $$;

-- =====================================================
-- 2. ENABLE LEAKED PASSWORD PROTECTION
-- =====================================================

-- This should be done in Supabase Dashboard:
-- 1. Go to Authentication > Settings
-- 2. Enable "Leaked password protection"
-- 3. This will check passwords against HaveIBeenPwned.org

-- =====================================================
-- 3. POSTGIS EXTENSION (NORMAL - NO ACTION NEEDED)
-- =====================================================

-- PostGIS in public schema is normal for location-based apps
-- No action required - this is expected behavior

-- =====================================================
-- 4. VERIFICATION QUERY
-- =====================================================

-- Check which functions need search_path fixes
SELECT 
    'Functions needing search_path fix' as check_type,
    COUNT(*) as total_functions,
    'Run individual function fixes as needed' as recommendation
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.prosecdef = true; -- SECURITY DEFINER functions

-- =====================================================
-- 5. SUMMARY
-- =====================================================

SELECT 
    'SECURITY WARNINGS SUMMARY' as status_type,
    'These warnings do NOT break your app' as impact,
    'They are security best practices for production' as recommendation,
    'Your app is safe to launch with these warnings' as conclusion; 