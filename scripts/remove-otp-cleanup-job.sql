-- ============================================================================
-- REMOVE OTP CLEANUP JOB
-- ============================================================================
-- This script removes the cleanup-expired-otps cron job completely
-- as it runs every 6 hours and may cause unnecessary costs

-- ============================================================================
-- STEP 1: CHECK CURRENT OTP CLEANUP JOB
-- ============================================================================

-- Show current OTP cleanup job details
SELECT 
    jobid,
    jobname,
    schedule,
    command,
    active,
    'BEFORE_REMOVAL' as status
FROM cron.job 
WHERE jobname = 'cleanup-expired-otps';

-- ============================================================================
-- STEP 2: REMOVE THE OTP CLEANUP JOB
-- ============================================================================

-- Remove the cleanup-expired-otps job
SELECT cron.unschedule('cleanup-expired-otps');

-- ============================================================================
-- STEP 3: VERIFY REMOVAL
-- ============================================================================

-- Verify the job was removed
SELECT 
    CASE 
        WHEN COUNT(*) = 0 THEN 'SUCCESS: OTP cleanup job removed'
        ELSE 'WARNING: OTP cleanup job still exists'
    END as removal_status
FROM cron.job 
WHERE jobname = 'cleanup-expired-otps';

-- ============================================================================
-- STEP 4: CHECK REMAINING CLEANUP JOBS
-- ============================================================================

-- Show all remaining cleanup jobs
SELECT 
    jobid,
    jobname,
    schedule,
    command,
    active,
    CASE 
        WHEN schedule LIKE '%* * * * *%' THEN 'EVERY_MINUTE'
        WHEN schedule LIKE '%*/5 * * * *%' THEN 'EVERY_5_MINUTES'
        WHEN schedule LIKE '%*/10 * * * *%' THEN 'EVERY_10_MINUTES'
        WHEN schedule LIKE '%*/15 * * * *%' THEN 'EVERY_15_MINUTES'
        WHEN schedule LIKE '%*/30 * * * *%' THEN 'EVERY_30_MINUTES'
        WHEN schedule LIKE '%0 * * * *%' THEN 'EVERY_HOUR'
        WHEN schedule LIKE '%0 */2 * * *%' THEN 'EVERY_2_HOURS'
        WHEN schedule LIKE '%0 */6 * * *%' THEN 'EVERY_6_HOURS'
        WHEN schedule LIKE '%0 0 * * *%' THEN 'DAILY'
        WHEN schedule LIKE '%0 0 * * 0%' THEN 'WEEKLY'
        ELSE 'CUSTOM'
    END as frequency_type
FROM cron.job 
WHERE jobname LIKE '%cleanup%'
ORDER BY 
    CASE 
        WHEN schedule LIKE '%* * * * *%' THEN 1
        WHEN schedule LIKE '%*/5 * * * *%' THEN 2
        WHEN schedule LIKE '%*/10 * * * *%' THEN 3
        WHEN schedule LIKE '%*/15 * * * *%' THEN 4
        WHEN schedule LIKE '%*/30 * * * *%' THEN 5
        WHEN schedule LIKE '%0 * * * *%' THEN 6
        WHEN schedule LIKE '%0 */2 * * *%' THEN 7
        WHEN schedule LIKE '%0 */6 * * *%' THEN 8
        WHEN schedule LIKE '%0 0 * * *%' THEN 9
        WHEN schedule LIKE '%0 0 * * 0%' THEN 10
        ELSE 11
    END;

-- ============================================================================
-- STEP 5: VERIFY REQUESTS CLEANUP SCHEDULE
-- ============================================================================

-- Check the cleanup-expired-requests job schedule
SELECT 
    jobid,
    jobname,
    schedule,
    command,
    active,
    CASE 
        WHEN schedule = '0 1 * * *' THEN 'CORRECT: Daily at 1 AM'
        WHEN schedule = '0 * * * *' THEN 'INCORRECT: Every hour'
        ELSE 'CUSTOM_SCHEDULE'
    END as schedule_status
FROM cron.job 
WHERE jobname = 'cleanup-expired-requests';

-- ============================================================================
-- STEP 6: SUMMARY
-- ============================================================================

SELECT 
    'OTP_CLEANUP_REMOVAL_COMPLETE' as status,
    'cleanup-expired-otps job has been removed' as action_taken,
    'This will reduce database costs by eliminating 6-hourly cleanup runs' as cost_impact,
    'Review remaining cleanup jobs above' as next_steps;
