-- ============================================================================
-- QUICK CLEANUP STATUS CHECK
-- Run this in Supabase SQL Editor for a quick overview
-- ============================================================================

-- 1. Check if pg_cron is enabled
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') 
    THEN '✅ pg_cron ENABLED'
    ELSE '❌ pg_cron NOT ENABLED - Enable it in Database > Extensions'
  END as cron_status;

-- 2. Check active scheduled jobs
SELECT 
  jobname,
  schedule,
  command,
  active
FROM cron.job 
WHERE active = true;

-- 3. Check cleanup functions exist
SELECT routine_name as cleanup_function
FROM information_schema.routines 
WHERE routine_name LIKE '%cleanup%' 
  AND routine_schema = 'public'
ORDER BY routine_name;

-- 4. Check data that needs cleanup
SELECT 
  'Expired Listings' as type, 
  COUNT(*) as count
FROM listings 
WHERE expires_at <= now() AND is_active = true
UNION ALL
SELECT 'Old Pings (30+ days)', COUNT(*)
FROM pings 
WHERE created_at < now() - interval '30 days' AND status = 'pending'
UNION ALL
SELECT 'Expired Cache', COUNT(*)
FROM query_cache 
WHERE expires_at < now();
