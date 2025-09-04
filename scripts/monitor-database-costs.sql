-- ============================================================================
-- DATABASE COST MONITORING SCRIPT
-- ============================================================================
-- This script helps monitor database costs over time by tracking:
-- 1. Trigger execution frequency
-- 2. Cron job performance
-- 3. Database size growth
-- 4. Query performance metrics
-- 5. Cost trends

-- ============================================================================
-- STEP 1: CREATE MONITORING TABLES (IF NOT EXISTS)
-- ============================================================================

-- Create table to track daily cost metrics
CREATE TABLE IF NOT EXISTS daily_cost_metrics (
    id SERIAL PRIMARY KEY,
    date DATE DEFAULT CURRENT_DATE,
    total_triggers INTEGER DEFAULT 0,
    total_cron_jobs INTEGER DEFAULT 0,
    database_size_mb NUMERIC DEFAULT 0,
    active_connections INTEGER DEFAULT 0,
    slow_queries INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create table to track trigger performance
CREATE TABLE IF NOT EXISTS trigger_performance_log (
    id SERIAL PRIMARY KEY,
    trigger_name TEXT,
    table_name TEXT,
    execution_count INTEGER,
    avg_execution_time_ms NUMERIC,
    date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- STEP 2: CURRENT COST METRICS
-- ============================================================================

-- Get current database size
WITH db_size AS (
    SELECT 
        pg_database_size(current_database()) / (1024 * 1024) as size_mb
),
trigger_count AS (
    SELECT COUNT(*) as count
    FROM information_schema.triggers
    WHERE trigger_schema = 'public'
),
cron_count AS (
    SELECT COUNT(*) as count
    FROM cron.job
    WHERE active = true
),
connection_count AS (
    SELECT COUNT(*) as count
    FROM pg_stat_activity
    WHERE state = 'active'
)
SELECT 
    'CURRENT_METRICS' as metric_type,
    ds.size_mb as database_size_mb,
    tc.count as active_triggers,
    cc.count as active_cron_jobs,
    conn.count as active_connections,
    CURRENT_DATE as date
FROM db_size ds, trigger_count tc, cron_count cc, connection_count conn;

-- ============================================================================
-- STEP 3: TRIGGER PERFORMANCE ANALYSIS
-- ============================================================================

-- Analyze trigger usage patterns
SELECT 
    'TRIGGER_ANALYSIS' as analysis_type,
    t.trigger_name,
    t.event_object_table,
    t.event_manipulation,
    t.action_timing,
    CASE 
        WHEN t.event_manipulation IN ('INSERT', 'UPDATE', 'DELETE') THEN 'HIGH_FREQUENCY'
        ELSE 'LOW_FREQUENCY'
    END as frequency_risk,
    'Monitor for cost impact' as recommendation
FROM information_schema.triggers t
WHERE t.trigger_schema = 'public'
ORDER BY frequency_risk DESC, t.event_object_table;

-- ============================================================================
-- STEP 4: CRON JOB PERFORMANCE ANALYSIS
-- ============================================================================

-- Analyze cron job performance over last 24 hours
SELECT 
    'CRON_JOB_ANALYSIS' as analysis_type,
    j.jobname,
    j.schedule,
    COUNT(jr.jobid) as executions_24h,
    AVG(EXTRACT(EPOCH FROM (jr.end_time - jr.start_time))) as avg_duration_seconds,
    COUNT(CASE WHEN jr.status = 'failed' THEN 1 END) as failed_executions,
    COUNT(CASE WHEN jr.status = 'succeeded' THEN 1 END) as successful_executions,
    CASE 
        WHEN COUNT(jr.jobid) > 24 THEN 'HIGH_FREQUENCY'
        WHEN COUNT(jr.jobid) > 12 THEN 'MEDIUM_FREQUENCY'
        ELSE 'LOW_FREQUENCY'
    END as frequency_risk
FROM cron.job j
LEFT JOIN cron.job_run_details jr ON j.jobid = jr.jobid
WHERE jr.start_time > NOW() - INTERVAL '24 hours' OR jr.start_time IS NULL
GROUP BY j.jobid, j.jobname, j.schedule
ORDER BY frequency_risk DESC, executions_24h DESC;

-- ============================================================================
-- STEP 5: TABLE SIZE MONITORING
-- ============================================================================

-- Monitor table sizes and growth
SELECT 
    'TABLE_SIZE_MONITORING' as monitoring_type,
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
    pg_total_relation_size(schemaname||'.'||tablename) / (1024 * 1024) as size_mb,
    CASE 
        WHEN pg_total_relation_size(schemaname||'.'||tablename) > 100 * 1024 * 1024 THEN 'LARGE_TABLE'
        WHEN pg_total_relation_size(schemaname||'.'||tablename) > 10 * 1024 * 1024 THEN 'MEDIUM_TABLE'
        ELSE 'SMALL_TABLE'
    END as size_category
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- ============================================================================
-- STEP 6: COST TREND ANALYSIS
-- ============================================================================

-- Show cost trends over the last 7 days
SELECT 
    'COST_TRENDS' as analysis_type,
    date,
    total_triggers,
    total_cron_jobs,
    database_size_mb,
    active_connections,
    slow_queries,
    CASE 
        WHEN LAG(database_size_mb) OVER (ORDER BY date) IS NOT NULL 
        THEN database_size_mb - LAG(database_size_mb) OVER (ORDER BY date)
        ELSE 0
    END as size_growth_mb
FROM daily_cost_metrics
WHERE date >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY date DESC;

-- ============================================================================
-- STEP 7: EXPENSIVE OPERATIONS ALERT
-- ============================================================================

-- Identify potentially expensive operations
WITH expensive_operations AS (
    SELECT 
        'EXPENSIVE_OPERATIONS_ALERT' as alert_type,
        'TRIGGER' as operation_type,
        t.trigger_name as operation_name,
        t.event_object_table as target_table,
        'HIGH_FREQUENCY' as risk_level,
        'Consider batching or reducing frequency' as recommendation
    FROM information_schema.triggers t
    WHERE t.trigger_schema = 'public'
    AND t.event_manipulation IN ('INSERT', 'UPDATE', 'DELETE')
    
    UNION ALL
    
    SELECT 
        'EXPENSIVE_OPERATIONS_ALERT' as alert_type,
        'CRON_JOB' as operation_type,
        j.jobname as operation_name,
        'SCHEDULED' as target_table,
        CASE 
            WHEN j.schedule LIKE '%* * * * *%' THEN 'VERY_HIGH_FREQUENCY'
            WHEN j.schedule LIKE '%*/5 * * * *%' THEN 'HIGH_FREQUENCY'
            WHEN j.schedule LIKE '%*/10 * * * *%' THEN 'MEDIUM_FREQUENCY'
            ELSE 'LOW_FREQUENCY'
        END as risk_level,
        'Monitor execution time and frequency' as recommendation
    FROM cron.job j
    WHERE j.active = true
)
SELECT * FROM expensive_operations
ORDER BY 
    CASE risk_level
        WHEN 'VERY_HIGH_FREQUENCY' THEN 1
        WHEN 'HIGH_FREQUENCY' THEN 2
        WHEN 'MEDIUM_FREQUENCY' THEN 3
        ELSE 4
    END;

-- ============================================================================
-- STEP 8: COST OPTIMIZATION RECOMMENDATIONS
-- ============================================================================

-- Generate specific cost optimization recommendations
SELECT 
    'COST_OPTIMIZATION_RECOMMENDATIONS' as recommendation_type,
    CASE 
        WHEN (SELECT COUNT(*) FROM information_schema.triggers WHERE trigger_schema = 'public' AND event_manipulation IN ('INSERT', 'UPDATE', 'DELETE')) > 2
        THEN 'Consider disabling high-frequency triggers and implementing batch processing'
        ELSE 'Trigger frequency is acceptable'
    END as trigger_recommendation,
    
    CASE 
        WHEN (SELECT COUNT(*) FROM cron.job WHERE active = true AND schedule LIKE '%* * * * *%') > 0
        THEN 'Consider reducing frequency of minute-based cron jobs'
        ELSE 'Cron job frequency is acceptable'
    END as cron_recommendation,
    
    CASE 
        WHEN (SELECT MAX(pg_total_relation_size(schemaname||'.'||tablename)) FROM pg_tables WHERE schemaname = 'public') > 100 * 1024 * 1024
        THEN 'Large tables detected - consider archiving old data'
        ELSE 'Table sizes are manageable'
    END as table_recommendation;

-- ============================================================================
-- STEP 9: DAILY METRICS INSERTION
-- ============================================================================

-- Insert today's metrics (run this daily)
INSERT INTO daily_cost_metrics (
    date,
    total_triggers,
    total_cron_jobs,
    database_size_mb,
    active_connections,
    slow_queries
)
SELECT 
    CURRENT_DATE,
    (SELECT COUNT(*) FROM information_schema.triggers WHERE trigger_schema = 'public'),
    (SELECT COUNT(*) FROM cron.job WHERE active = true),
    pg_database_size(current_database()) / (1024 * 1024),
    (SELECT COUNT(*) FROM pg_stat_activity WHERE state = 'active'),
    0 -- Placeholder for slow queries count
WHERE NOT EXISTS (
    SELECT 1 FROM daily_cost_metrics WHERE date = CURRENT_DATE
);

-- ============================================================================
-- STEP 10: SUMMARY REPORT
-- ============================================================================

-- Generate a summary report
SELECT 
    'MONITORING_SUMMARY' as report_type,
    'Database cost monitoring completed' as status,
    'Run this script daily to track cost trends' as recommendation,
    'Review expensive operations alerts above' as next_steps,
    CURRENT_TIMESTAMP as generated_at;
