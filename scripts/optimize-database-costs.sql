-- ============================================================================
-- DATABASE COST OPTIMIZATION SCRIPT
-- ============================================================================
-- This script helps optimize database costs by providing options to:
-- 1. Disable expensive triggers temporarily
-- 2. Adjust cron job frequencies
-- 3. Monitor current costs
-- 4. Re-enable operations when needed

-- ============================================================================
-- STEP 1: ANALYZE CURRENT TRIGGERS AND THEIR IMPACT
-- ============================================================================

-- Show all triggers with their execution context
SELECT 
    t.trigger_name,
    t.event_manipulation,
    t.event_object_table,
    t.action_timing,
    t.action_statement,
    CASE 
        WHEN t.event_manipulation IN ('INSERT', 'UPDATE', 'DELETE') THEN 'HIGH_FREQUENCY'
        ELSE 'LOW_FREQUENCY'
    END as frequency_risk
FROM information_schema.triggers t
WHERE t.trigger_schema = 'public'
ORDER BY frequency_risk DESC, t.event_object_table;

-- ============================================================================
-- STEP 2: ANALYZE CRON JOBS AND THEIR FREQUENCY
-- ============================================================================

-- Show all scheduled jobs with their frequency
SELECT 
    jobid,
    schedule,
    command,
    nodename,
    nodeport,
    database,
    username,
    active,
    jobname,
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
-- STEP 3: COST OPTIMIZATION RECOMMENDATIONS
-- ============================================================================

-- Create a temporary table to store recommendations
CREATE TEMP TABLE IF NOT EXISTS cost_recommendations (
    operation_type TEXT,
    operation_name TEXT,
    current_frequency TEXT,
    recommended_frequency TEXT,
    estimated_cost_savings TEXT,
    risk_level TEXT,
    action_required TEXT
);

-- Insert recommendations based on analysis
INSERT INTO cost_recommendations VALUES
-- High-frequency triggers
('TRIGGER', 'trigger_update_user_rewards_balance', 'ON_EVERY_INSERT_UPDATE', 'BATCH_PROCESSING', 'HIGH', 'MEDIUM', 'Consider batching reward updates'),
('TRIGGER', 'trigger_update_user_streak', 'ON_EVERY_CHECKIN', 'DAILY_BATCH', 'MEDIUM', 'LOW', 'Consider daily streak updates'),
('TRIGGER', 'trigger_award_achievement_completion', 'ON_EVERY_ACHIEVEMENT', 'IMMEDIATE_OK', 'LOW', 'LOW', 'Keep as-is for user experience'),

-- Scheduled jobs
('CRON_JOB', 'cleanup-expired-requests', 'HOURLY', 'EVERY_2_HOURS', 'MEDIUM', 'LOW', 'Reduce frequency to every 2 hours'),
('CRON_JOB', 'cleanup-old-pings', 'DAILY', 'DAILY', 'LOW', 'LOW', 'Keep as-is'),
('CRON_JOB', 'cleanup-orphaned-images', 'DAILY', 'DAILY', 'LOW', 'LOW', 'Keep as-is'),
('CRON_JOB', 'cleanup-expired-listings', 'DAILY', 'DAILY', 'LOW', 'LOW', 'Keep as-is');

-- Show recommendations
SELECT * FROM cost_recommendations ORDER BY estimated_cost_savings DESC, risk_level;

-- ============================================================================
-- STEP 4: OPTIMIZATION ACTIONS (COMMENTED OUT - UNCOMMENT TO APPLY)
-- ============================================================================

-- OPTION 1: Disable high-frequency triggers temporarily
-- Uncomment the lines below to disable expensive triggers

/*
-- Disable reward balance trigger (HIGHEST COST IMPACT)
DROP TRIGGER IF EXISTS trigger_update_user_rewards_balance ON listings;
DROP TRIGGER IF EXISTS trigger_update_user_rewards_balance ON user_achievements;

-- Disable streak update trigger (MEDIUM COST IMPACT)
DROP TRIGGER IF EXISTS trigger_update_user_streak ON user_activities;
*/

-- OPTION 2: Reduce cron job frequency
-- Uncomment the lines below to reduce job frequency

/*
-- Reduce cleanup-expired-requests from hourly to every 2 hours
SELECT cron.alter_job(
    (SELECT jobid FROM cron.job WHERE jobname = 'cleanup-expired-requests'),
    schedule := '0 */2 * * *'
);
*/

-- OPTION 3: Create batch processing functions
-- Uncomment to create more efficient batch processing

/*
-- Create batch reward update function
CREATE OR REPLACE FUNCTION batch_update_user_rewards()
RETURNS void AS $$
BEGIN
    -- Update rewards for all users who have pending changes
    UPDATE users 
    SET omni_balance = (
        SELECT COALESCE(SUM(omni_reward), 0)
        FROM user_achievements ua
        JOIN achievements a ON ua.achievement_id = a.id
        WHERE ua.user_id = users.id AND ua.completed_at IS NOT NULL
    )
    WHERE id IN (
        SELECT DISTINCT user_id 
        FROM user_achievements 
        WHERE completed_at > NOW() - INTERVAL '1 hour'
    );
END;
$$ LANGUAGE plpgsql;

-- Schedule batch processing to run every hour instead of on every trigger
SELECT cron.schedule(
    'batch-update-rewards',
    '0 * * * *', -- Every hour
    'SELECT batch_update_user_rewards();'
);
*/

-- ============================================================================
-- STEP 5: MONITORING QUERIES
-- ============================================================================

-- Check current database size
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
LIMIT 10;

-- Check recent cron job executions
SELECT 
    j.jobname,
    j.schedule,
    jr.status,
    jr.return_message,
    jr.start_time,
    jr.end_time,
    jr.end_time - jr.start_time as duration
FROM cron.job j
LEFT JOIN cron.job_run_details jr ON j.jobid = jr.jobid
WHERE jr.start_time > NOW() - INTERVAL '24 hours'
ORDER BY jr.start_time DESC
LIMIT 20;

-- ============================================================================
-- STEP 6: ROLLBACK INSTRUCTIONS
-- ============================================================================

-- If you need to re-enable triggers, use these commands:
/*
-- Re-enable reward balance trigger
CREATE TRIGGER trigger_update_user_rewards_balance
    AFTER INSERT OR UPDATE ON listings
    FOR EACH ROW
    EXECUTE FUNCTION update_user_rewards_balance();

CREATE TRIGGER trigger_update_user_rewards_balance
    AFTER INSERT OR UPDATE ON user_achievements
    FOR EACH ROW
    EXECUTE FUNCTION update_user_rewards_balance();

-- Re-enable streak update trigger
CREATE TRIGGER trigger_update_user_streak
    AFTER INSERT ON user_activities
    FOR EACH ROW
    EXECUTE FUNCTION update_user_streak();
*/

-- ============================================================================
-- SUMMARY
-- ============================================================================

SELECT 
    'OPTIMIZATION COMPLETE' as status,
    'Review recommendations above and uncomment desired optimizations' as next_steps,
    'Monitor costs after applying changes' as monitoring_advice;
