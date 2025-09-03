-- ============================================================================
-- CHECK CLEANUP JOBS AND FUNCTIONS IN DATABASE
-- Run this in your Supabase SQL Editor to verify cleanup setup
-- ============================================================================

-- 1. Check if pg_cron extension is enabled
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') 
    THEN '✅ pg_cron extension is ENABLED'
    ELSE '❌ pg_cron extension is NOT ENABLED'
  END as cron_status;

-- 2. Check all scheduled jobs
SELECT 
  jobid,
  schedule,
  command,
  nodename,
  nodeport,
  database,
  username,
  active,
  jobname
FROM cron.job 
ORDER BY jobid;

-- 3. Check job execution history (last 10 runs)
SELECT 
  jobid,
  runid,
  job_pid,
  database,
  username,
  command,
  status,
  return_message,
  start_time,
  end_time
FROM cron.job_run_details 
ORDER BY start_time DESC 
LIMIT 10;

-- 4. Check if cleanup functions exist
SELECT 
  routine_name as function_name,
  routine_type,
  data_type as return_type
FROM information_schema.routines 
WHERE routine_name LIKE '%cleanup%' 
  AND routine_schema = 'public'
ORDER BY routine_name;

-- 5. Check function definitions
SELECT 
  proname as function_name,
  prosrc as function_body
FROM pg_proc 
WHERE proname LIKE '%cleanup%' 
  AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
ORDER BY proname;

-- 6. Test cleanup functions manually (optional - uncomment to run)
-- SELECT cleanup_expired_requests();
-- SELECT cleanup_expired_listings();
-- SELECT cleanup_old_pings();
-- SELECT cleanup_old_performance_metrics(7);
-- SELECT cleanup_expired_cache();

-- 7. Check database size and table sizes
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- 8. Check for old data that should be cleaned up
SELECT 'Expired Listings' as data_type, COUNT(*) as count
FROM listings 
WHERE expires_at <= now() AND is_active = true
UNION ALL
SELECT 'Old Pings (30+ days)', COUNT(*)
FROM pings 
WHERE created_at < now() - interval '30 days' AND status = 'pending'
UNION ALL
SELECT 'Old Performance Metrics (7+ days)', COUNT(*)
FROM performance_metrics 
WHERE created_at < now() - interval '7 days'
UNION ALL
SELECT 'Expired Cache Entries', COUNT(*)
FROM query_cache 
WHERE expires_at < now()
UNION ALL
SELECT 'Expired OTPs', COUNT(*)
FROM phone_verifications 
WHERE expires_at < now();

-- 9. Check recent activity in key tables
SELECT 'Recent Listings (last 24h)' as activity, COUNT(*) as count
FROM listings 
WHERE created_at > now() - interval '24 hours'
UNION ALL
SELECT 'Recent Pings (last 24h)', COUNT(*)
FROM pings 
WHERE created_at > now() - interval '24 hours'
UNION ALL
SELECT 'Recent Requests (last 24h)', COUNT(*)
FROM requests 
WHERE created_at > now() - interval '24 hours';
