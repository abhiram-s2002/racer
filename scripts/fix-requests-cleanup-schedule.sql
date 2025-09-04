-- ============================================================================
-- FIX REQUESTS CLEANUP SCHEDULE
-- ============================================================================
-- This script changes the cleanup-expired-requests job from hourly to daily at 1 AM
-- This will significantly reduce database costs

-- ============================================================================
-- STEP 1: CHECK CURRENT SCHEDULE
-- ============================================================================

-- Show current cleanup-expired-requests job details
SELECT 
    jobid,
    jobname,
    schedule,
    command,
    active,
    'CURRENT_SCHEDULE' as status
FROM cron.job 
WHERE jobname = 'cleanup-expired-requests';

-- ============================================================================
-- STEP 2: REMOVE CURRENT HOURLY JOB
-- ============================================================================

-- Remove the current hourly cleanup job
SELECT cron.unschedule('cleanup-expired-requests');

-- ============================================================================
-- STEP 3: CREATE NEW DAILY JOB AT 1 AM
-- ============================================================================

-- Schedule cleanup-expired-requests to run daily at 1 AM UTC
SELECT cron.schedule(
    'cleanup-expired-requests',
    '0 1 * * *', -- Daily at 1 AM UTC
    'SELECT cleanup_expired_requests();'
);

-- ============================================================================
-- STEP 4: VERIFY NEW SCHEDULE
-- ============================================================================

-- Verify the new schedule
SELECT 
    jobid,
    jobname,
    schedule,
    command,
    active,
    CASE 
        WHEN schedule = '0 1 * * *' THEN 'CORRECT: Daily at 1 AM UTC'
        WHEN schedule = '0 * * * *' THEN 'INCORRECT: Still hourly'
        ELSE 'CUSTOM_SCHEDULE'
    END as schedule_status
FROM cron.job 
WHERE jobname = 'cleanup-expired-requests';

-- ============================================================================
-- STEP 5: SHOW ALL CLEANUP JOBS WITH NEW SCHEDULES
-- ============================================================================

-- Show all cleanup jobs with their frequencies
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
        WHEN schedule LIKE '%0 1 * * *%' THEN 'DAILY_AT_1AM'
        WHEN schedule LIKE '%0 2 * * *%' THEN 'DAILY_AT_2AM'
        WHEN schedule LIKE '%0 3 * * *%' THEN 'DAILY_AT_3AM'
        WHEN schedule LIKE '%0 4 * * *%' THEN 'DAILY_AT_4AM'
        WHEN schedule LIKE '%0 5 * * *%' THEN 'DAILY_AT_5AM'
        WHEN schedule LIKE '%0 0 * * *%' THEN 'DAILY_AT_MIDNIGHT'
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
        WHEN schedule LIKE '%0 1 * * *%' THEN 9
        WHEN schedule LIKE '%0 2 * * *%' THEN 10
        WHEN schedule LIKE '%0 3 * * *%' THEN 11
        WHEN schedule LIKE '%0 4 * * *%' THEN 12
        WHEN schedule LIKE '%0 5 * * *%' THEN 13
        WHEN schedule LIKE '%0 0 * * *%' THEN 14
        WHEN schedule LIKE '%0 0 * * 0%' THEN 15
        ELSE 16
    END;

-- ============================================================================
-- STEP 6: COST IMPACT ANALYSIS
-- ============================================================================

-- Calculate cost savings
SELECT 
    'COST_SAVINGS_ANALYSIS' as analysis_type,
    'cleanup-expired-requests changed from hourly to daily' as change_made,
    '24 executions per day reduced to 1 execution per day' as execution_reduction,
    '96% reduction in cleanup job executions' as cost_savings,
    'This should significantly reduce database costs' as impact;

-- ============================================================================
-- STEP 7: SUMMARY
-- ============================================================================

SELECT 
    'REQUESTS_CLEANUP_SCHEDULE_FIXED' as status,
    'cleanup-expired-requests now runs daily at 1 AM UTC' as new_schedule,
    'This will reduce database costs by 96% for this job' as cost_impact,
    'Run the OTP cleanup removal script next' as next_steps;
