-- ============================================================================
-- SETUP VERIFICATION EXPIRATION CRON JOB
-- ============================================================================
-- This script sets up a 24-hour scheduled job to expire verifications
-- Run this after deploying the Edge Function

-- 1. Deploy the Edge Function first:
-- supabase functions deploy expire-verifications

-- 2. Set up the cron job (run this in Supabase SQL Editor):
-- This will call the Edge Function every 24 hours at 2 AM UTC

-- Note: You'll need to replace YOUR_PROJECT_REF with your actual Supabase project reference
-- and YOUR_ANON_KEY with your actual anon key

-- Example cron job setup (adjust the URL and key):
/*
INSERT INTO cron.job (schedule, command, nodename, nodeport, database, username, active)
VALUES (
  '0 2 * * *',  -- Every day at 2 AM UTC
  'curl -X POST "https://YOUR_PROJECT_REF.supabase.co/functions/v1/expire-verifications" -H "Authorization: Bearer YOUR_ANON_KEY" -H "Content-Type: application/json"',
  'localhost',
  5432,
  'postgres',
  'postgres',
  true
);
*/

-- Alternative: Use pg_cron extension if available
-- SELECT cron.schedule('expire-verifications', '0 2 * * *', 'SELECT expire_verifications_bulk();');

-- ============================================================================
-- MANUAL TESTING
-- ============================================================================

-- Test the bulk expiration function manually:
-- SELECT expire_verifications_bulk();

-- Check current verification status:
-- SELECT 
--   verification_status,
--   COUNT(*) as user_count,
--   MIN(expires_at) as earliest_expiry,
--   MAX(expires_at) as latest_expiry
-- FROM users 
-- WHERE verification_status = 'verified'
-- GROUP BY verification_status;

-- ============================================================================
-- MONITORING QUERIES
-- ============================================================================

-- Check how many verifications will expire in the next 24 hours:
-- SELECT COUNT(*) as expiring_soon
-- FROM users 
-- WHERE verification_status = 'verified' 
--   AND expires_at IS NOT NULL 
--   AND expires_at <= NOW() + INTERVAL '24 hours';

-- Check verification distribution:
-- SELECT 
--   verification_status,
--   COUNT(*) as count,
--   ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage
-- FROM users 
-- GROUP BY verification_status;
