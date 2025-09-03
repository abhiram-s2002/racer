-- ============================================================================
-- ENABLE ADDITIONAL CLEANUP JOBS
-- Run this in Supabase SQL Editor to schedule more cleanup functions
-- ============================================================================

-- 1. Schedule expired listings cleanup (daily at 2 AM)
SELECT cron.schedule(
  'cleanup-expired-listings',
  '0 2 * * *', -- Daily at 2 AM UTC
  'SELECT cleanup_expired_listings();'
);

-- 2. Schedule old pings cleanup (daily at 3 AM)
SELECT cron.schedule(
  'cleanup-old-pings',
  '0 3 * * *', -- Daily at 3 AM UTC
  'SELECT cleanup_old_pings();'
);

-- 3. Schedule expired OTPs cleanup (every 6 hours)
SELECT cron.schedule(
  'cleanup-expired-otps',
  '0 */6 * * *', -- Every 6 hours
  'SELECT cleanup_expired_otps();'
);

-- 4. Schedule old checkins cleanup (weekly on Sunday at 4 AM)
SELECT cron.schedule(
  'cleanup-old-checkins',
  '0 4 * * 0', -- Weekly on Sunday at 4 AM UTC
  'SELECT cleanup_old_checkins();'
);

-- 5. Schedule orphaned images cleanup (weekly on Monday at 5 AM)
SELECT cron.schedule(
  'cleanup-orphaned-images',
  '0 5 * * 1', -- Weekly on Monday at 5 AM UTC
  'SELECT cleanup_orphaned_images();'
);

-- Verify all jobs are scheduled
SELECT 
  jobname,
  schedule,
  command,
  active
FROM cron.job 
WHERE jobname LIKE '%cleanup%'
ORDER BY jobname;
