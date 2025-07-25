-- ============================================================================
-- PERFORMANCE METRICS TABLE
-- Creates table for storing performance monitoring data
-- ============================================================================

-- Create performance_metrics table if it doesn't exist
CREATE TABLE IF NOT EXISTS performance_metrics (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    operation text NOT NULL,
    duration_ms integer NOT NULL,
    user_count integer DEFAULT 0,
    timestamp timestamp with time zone DEFAULT timezone('utc', now()),
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT timezone('utc', now())
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_performance_metrics_operation 
ON performance_metrics (operation);

CREATE INDEX IF NOT EXISTS idx_performance_metrics_timestamp 
ON performance_metrics (timestamp);

CREATE INDEX IF NOT EXISTS idx_performance_metrics_duration 
ON performance_metrics (duration_ms);

-- Create composite index for common queries
CREATE INDEX IF NOT EXISTS idx_performance_metrics_operation_timestamp 
ON performance_metrics (operation, timestamp);

-- Add RLS policies (optional - for multi-tenant apps)
-- ALTER TABLE performance_metrics ENABLE ROW LEVEL SECURITY;

-- Create policy to allow authenticated users to insert metrics
-- CREATE POLICY "Allow authenticated users to insert performance metrics" 
-- ON performance_metrics FOR INSERT 
-- WITH CHECK (auth.role() = 'authenticated');

-- Create policy to allow users to view their own metrics (if needed)
-- CREATE POLICY "Allow users to view performance metrics" 
-- ON performance_metrics FOR SELECT 
-- USING (auth.role() = 'authenticated');

-- Function to cleanup old performance metrics
CREATE OR REPLACE FUNCTION cleanup_old_performance_metrics(days_to_keep integer DEFAULT 7)
RETURNS integer AS $$
DECLARE
    deleted_count integer;
BEGIN
    DELETE FROM performance_metrics 
    WHERE created_at < NOW() - INTERVAL '1 day' * days_to_keep;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get performance statistics
CREATE OR REPLACE FUNCTION get_performance_stats(
    time_window_hours integer DEFAULT 24
)
RETURNS TABLE(
    operation text,
    avg_duration_ms numeric,
    total_operations bigint,
    slow_operations bigint
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pm.operation,
        AVG(pm.duration_ms)::numeric as avg_duration_ms,
        COUNT(*)::bigint as total_operations,
        COUNT(CASE WHEN pm.duration_ms > 1000 THEN 1 END)::bigint as slow_operations
    FROM performance_metrics pm
    WHERE pm.timestamp >= NOW() - INTERVAL '1 hour' * time_window_hours
    GROUP BY pm.operation
    ORDER BY avg_duration_ms DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to get slow operations
CREATE OR REPLACE FUNCTION get_slow_operations(
    threshold_ms integer DEFAULT 1000,
    limit_count integer DEFAULT 100
)
RETURNS TABLE(
    operation text,
    duration_ms integer,
    timestamp timestamp with time zone,
    metadata jsonb
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pm.operation,
        pm.duration_ms,
        pm.timestamp,
        pm.metadata
    FROM performance_metrics pm
    WHERE pm.duration_ms > threshold_ms
    ORDER BY pm.duration_ms DESC, pm.timestamp DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Create a scheduled job to cleanup old metrics (optional)
-- This requires pg_cron extension to be enabled
-- SELECT cron.schedule('cleanup-performance-metrics', '0 2 * * *', 'SELECT cleanup_old_performance_metrics(7);');

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Test the table creation
DO $$
BEGIN
    -- Check if table exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'performance_metrics') THEN
        RAISE NOTICE 'Performance metrics table created successfully';
    ELSE
        RAISE EXCEPTION 'Performance metrics table was not created';
    END IF;
    
    -- Check if indexes exist
    IF EXISTS (SELECT FROM pg_indexes WHERE indexname = 'idx_performance_metrics_operation') THEN
        RAISE NOTICE 'Performance metrics indexes created successfully';
    ELSE
        RAISE EXCEPTION 'Performance metrics indexes were not created';
    END IF;
END $$; 