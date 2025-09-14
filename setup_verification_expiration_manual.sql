-- ============================================================================
-- MANUAL SETUP FOR VERIFICATION EXPIRATION (24-HOUR SCHEDULE)
-- ============================================================================
-- Run this in Supabase SQL Editor after deploying the migration

-- ============================================================================
-- 1. CHECK IF PG_CRON IS AVAILABLE
-- ============================================================================

-- Check if pg_cron extension is installed
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') 
        THEN 'pg_cron is available - can use automatic scheduling'
        ELSE 'pg_cron not available - use Edge Functions or manual scheduling'
    END as cron_status;

-- ============================================================================
-- 2. SET UP AUTOMATIC SCHEDULING (IF PG_CRON AVAILABLE)
-- ============================================================================

-- Option A: Use the setup function (recommended)
SELECT setup_verification_expiration_cron();

-- Option B: Manual cron setup
-- Uncomment and run if pg_cron is available:
/*
SELECT cron.schedule(
    'expire-verifications',
    '0 2 * * *',  -- Every day at 2 AM UTC
    'SELECT expire_verifications_bulk();'
);
*/

-- ============================================================================
-- 3. VERIFY CRON JOB IS SCHEDULED
-- ============================================================================

-- Check if the cron job was created successfully
SELECT 
    jobname,
    schedule,
    command,
    active,
    jobid
FROM cron.job 
WHERE jobname = 'expire-verifications';

-- ============================================================================
-- 4. MANUAL TESTING
-- ============================================================================

-- Test the bulk expiration function manually
SELECT expire_verifications_bulk() as expired_count;

-- Check verification statistics
SELECT get_verification_stats();

-- Check current verification status distribution
SELECT 
    verification_status,
    COUNT(*) as user_count,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage
FROM users 
GROUP BY verification_status
ORDER BY user_count DESC;

-- ============================================================================
-- 5. MONITORING QUERIES
-- ============================================================================

-- Check how many verifications will expire in the next 24 hours
SELECT 
    COUNT(*) as expiring_soon,
    MIN(expires_at) as earliest_expiry,
    MAX(expires_at) as latest_expiry
FROM users 
WHERE verification_status = 'verified' 
  AND expires_at IS NOT NULL 
  AND expires_at <= NOW() + INTERVAL '24 hours';

-- Check recent expiration runs (from system cleanup logs)
SELECT 
    created_at,
    description,
    amount
FROM reward_transactions 
WHERE reference_type = 'system_cleanup' 
ORDER BY created_at DESC 
LIMIT 10;

-- Check users with expired verifications
SELECT 
    username,
    verification_status,
    verified_at,
    expires_at,
    updated_at
FROM users 
WHERE verification_status = 'not_verified' 
  AND expires_at IS NOT NULL 
  AND expires_at <= NOW()
ORDER BY expires_at DESC
LIMIT 10;

-- ============================================================================
-- 6. EDGE FUNCTION SETUP (ALTERNATIVE TO PG_CRON)
-- ============================================================================

-- If pg_cron is not available, use this Edge Function URL for external scheduling:
-- https://YOUR_PROJECT_REF.supabase.co/functions/v1/expire-verifications
-- 
-- Set up external cron job (like GitHub Actions, Vercel Cron, etc.) to call:
-- POST https://YOUR_PROJECT_REF.supabase.co/functions/v1/expire-verifications
-- Headers: Authorization: Bearer YOUR_ANON_KEY

-- ============================================================================
-- 7. PERFORMANCE MONITORING
-- ============================================================================

-- Check function execution times
SELECT 
    schemaname,
    funcname,
    calls,
    total_time,
    mean_time,
    stddev_time
FROM pg_stat_user_functions 
WHERE funcname IN (
    'expire_verifications_bulk',
    'purchase_verification_with_omni',
    'can_afford_verification'
)
ORDER BY total_time DESC;

-- Check table sizes and indexes
SELECT 
    schemaname,
    tablename,
    attname,
    n_distinct,
    correlation
FROM pg_stats 
WHERE tablename IN ('users', 'user_rewards', 'reward_transactions')
  AND attname IN ('verification_status', 'expires_at', 'username')
ORDER BY tablename, attname;
