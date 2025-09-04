-- ============================================================================
-- CHECK FOR EXPENSIVE DATABASE OPERATIONS
-- This script identifies triggers, functions, and scheduled jobs that may cause high costs
-- ============================================================================

-- 1. CHECK ALL ACTIVE TRIGGERS
SELECT 
    'TRIGGERS' as operation_type,
    trigger_name,
    event_object_table,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers 
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

-- 2. CHECK ALL SCHEDULED CRON JOBS
SELECT 
    'CRON JOBS' as operation_type,
    jobid,
    jobname,
    schedule,
    command,
    active,
    nodename
FROM cron.job 
ORDER BY jobid;

-- 3. CHECK CRON JOB EXECUTION HISTORY (last 20 runs)
SELECT 
    'CRON EXECUTION HISTORY' as operation_type,
    jobid,
    jobname,
    status,
    return_message,
    start_time,
    end_time,
    EXTRACT(EPOCH FROM (end_time - start_time)) as duration_seconds
FROM cron.job_run_details 
ORDER BY start_time DESC 
LIMIT 20;

-- 4. CHECK ALL FUNCTIONS THAT MIGHT BE EXPENSIVE
SELECT 
    'FUNCTIONS' as operation_type,
    routine_name,
    routine_type,
    data_type as return_type,
    CASE 
        WHEN routine_name LIKE '%cleanup%' THEN 'CLEANUP'
        WHEN routine_name LIKE '%update%' THEN 'UPDATE'
        WHEN routine_name LIKE '%process%' THEN 'PROCESS'
        WHEN routine_name LIKE '%batch%' THEN 'BATCH'
        ELSE 'OTHER'
    END as function_category
FROM information_schema.routines 
WHERE routine_schema = 'public'
    AND routine_name NOT LIKE 'pg_%'
    AND routine_name NOT LIKE 'information_schema%'
ORDER BY routine_name;

-- 5. CHECK FOR FUNCTIONS WITH COMPLEX QUERIES (potential performance issues)
SELECT 
    'COMPLEX FUNCTIONS' as operation_type,
    proname as function_name,
    CASE 
        WHEN prosrc LIKE '%FOR %IN%' THEN 'LOOP'
        WHEN prosrc LIKE '%CURSOR%' THEN 'CURSOR'
        WHEN prosrc LIKE '%RECURSIVE%' THEN 'RECURSIVE'
        WHEN prosrc LIKE '%UNION%' THEN 'UNION'
        WHEN prosrc LIKE '%JOIN%' THEN 'JOIN'
        ELSE 'SIMPLE'
    END as complexity_type,
    LENGTH(prosrc) as function_size_chars
FROM pg_proc 
WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    AND proname NOT LIKE 'pg_%'
ORDER BY LENGTH(prosrc) DESC;

-- 6. CHECK TABLE SIZES (large tables = expensive operations)
SELECT 
    'TABLE SIZES' as operation_type,
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
    pg_total_relation_size(schemaname||'.'||tablename) as size_bytes
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- 7. CHECK FOR FREQUENTLY UPDATED TABLES (based on triggers)
SELECT 
    'FREQUENTLY UPDATED TABLES' as operation_type,
    event_object_table,
    COUNT(*) as trigger_count,
    STRING_AGG(trigger_name, ', ') as triggers
FROM information_schema.triggers 
WHERE trigger_schema = 'public'
GROUP BY event_object_table
ORDER BY trigger_count DESC;

-- 8. CHECK FOR POTENTIAL COST-INTENSIVE OPERATIONS
SELECT 
    'COST ANALYSIS' as operation_type,
    'High-frequency triggers' as concern,
    COUNT(*) as count,
    'Tables with multiple triggers may cause high costs' as description
FROM (
    SELECT event_object_table, COUNT(*) as trigger_count
    FROM information_schema.triggers 
    WHERE trigger_schema = 'public'
    GROUP BY event_object_table
    HAVING COUNT(*) > 2
) as high_trigger_tables

UNION ALL

SELECT 
    'COST ANALYSIS' as operation_type,
    'Scheduled jobs' as concern,
    COUNT(*) as count,
    'Cron jobs run automatically and may cause costs' as description
FROM cron.job 
WHERE active = true

UNION ALL

SELECT 
    'COST ANALYSIS' as operation_type,
    'Large tables' as concern,
    COUNT(*) as count,
    'Tables over 100MB may cause expensive operations' as description
FROM (
    SELECT schemaname, tablename
    FROM pg_tables 
    WHERE schemaname = 'public'
    AND pg_total_relation_size(schemaname||'.'||tablename) > 100 * 1024 * 1024
) as large_tables;

-- 9. RECOMMENDATIONS
SELECT 
    'RECOMMENDATIONS' as operation_type,
    CASE 
        WHEN EXISTS (SELECT 1 FROM cron.job WHERE active = true) 
        THEN 'Consider reviewing scheduled jobs frequency'
        ELSE 'No active scheduled jobs found'
    END as recommendation_1,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.triggers 
            WHERE trigger_schema = 'public' 
            AND event_object_table IN ('reward_transactions', 'daily_checkins', 'listings')
        )
        THEN 'High-frequency triggers detected - monitor costs'
        ELSE 'No high-frequency triggers detected'
    END as recommendation_2;
