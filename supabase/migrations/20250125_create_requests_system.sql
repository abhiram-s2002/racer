-- Create Requests System Migration
-- Migration: 20250125_create_requests_system.sql
-- This migration creates the complete requests system with auto-deletion

-- ============================================================================
-- REQUESTS SYSTEM TABLES
-- ============================================================================

-- 1. Requests table for service requests
CREATE TABLE IF NOT EXISTS public.requests (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    requester_username text NOT NULL REFERENCES public.users(username) ON DELETE CASCADE,
    title text NOT NULL,
    description text,
    budget_min numeric(10,2),
    budget_max numeric(10,2),
    category text NOT NULL,
    urgency text DEFAULT 'normal' CHECK (urgency IN ('urgent', 'normal', 'flexible')),
    location text, -- Human readable location
    latitude double precision,
    longitude double precision,
    location_geography geography(point),
    expires_at timestamp with time zone DEFAULT (now() + interval '7 days'),
    updated_at timestamp with time zone DEFAULT timezone('utc', now())
);

-- 2. Cleanup logs table for tracking deletions
CREATE TABLE IF NOT EXISTS public.cleanup_logs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    table_name text NOT NULL,
    deleted_count integer DEFAULT 0,
    cleaned_at timestamp with time zone DEFAULT now()
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Indexes for requests table
CREATE INDEX IF NOT EXISTS idx_requests_requester ON public.requests(requester_username);
CREATE INDEX IF NOT EXISTS idx_requests_category ON public.requests(category);
CREATE INDEX IF NOT EXISTS idx_requests_urgency ON public.requests(urgency);
CREATE INDEX IF NOT EXISTS idx_requests_expires ON public.requests(expires_at);
CREATE INDEX IF NOT EXISTS idx_requests_location ON public.requests USING GIST(location_geography);
CREATE INDEX IF NOT EXISTS idx_requests_updated ON public.requests(updated_at DESC);

-- Indexes for cleanup_logs table
CREATE INDEX IF NOT EXISTS idx_cleanup_logs_table ON public.cleanup_logs(table_name);
CREATE INDEX IF NOT EXISTS idx_cleanup_logs_cleaned ON public.cleanup_logs(cleaned_at DESC);

-- ============================================================================
-- FUNCTIONS FOR REQUESTS
-- ============================================================================

-- Function to cleanup expired requests
CREATE OR REPLACE FUNCTION cleanup_expired_requests()
RETURNS void AS $$
DECLARE
    deleted_count integer;
BEGIN
    -- Delete expired requests
    DELETE FROM requests WHERE expires_at <= now();
    
    -- Get count of deleted records
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Log the cleanup
    INSERT INTO cleanup_logs (table_name, deleted_count, cleaned_at)
    VALUES ('requests', deleted_count, now());
    
    -- Optional: Log to console for debugging
    RAISE NOTICE 'Cleaned up % expired requests', deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get requests with distance calculation (with auto-cleanup)
CREATE OR REPLACE FUNCTION get_requests_with_distance(
    user_lat double precision DEFAULT NULL,
    user_lng double precision DEFAULT NULL,
    max_distance_km integer DEFAULT 50,
    category_filter text DEFAULT NULL,
    limit_count integer DEFAULT 50
)
RETURNS TABLE(
    id uuid,
    requester_username text,
    title text,
    description text,
    budget_min numeric,
    budget_max numeric,
    category text,
    urgency text,
    location text,
    latitude double precision,
    longitude double precision,
    distance_km double precision,
    expires_at timestamp with time zone,
    updated_at timestamp with time zone
) AS $$
BEGIN
    -- Clean up expired requests before querying
    PERFORM cleanup_expired_requests();
    
    RETURN QUERY
    SELECT 
        r.id,
        r.requester_username,
        r.title,
        r.description,
        r.budget_min,
        r.budget_max,
        r.category,
        r.urgency,
        r.location,
        r.latitude,
        r.longitude,
        CASE 
            WHEN user_lat IS NOT NULL AND user_lng IS NOT NULL 
            AND r.latitude IS NOT NULL AND r.longitude IS NOT NULL
            THEN ST_Distance(
                ST_MakePoint(user_lng, user_lat)::geography,
                ST_MakePoint(r.longitude, r.latitude)::geography
            ) / 1000
            ELSE NULL
        END as distance_km,
        r.expires_at,
        r.updated_at
    FROM requests r
    WHERE (category_filter IS NULL OR r.category = category_filter)
    AND (user_lat IS NULL OR user_lng IS NULL 
         OR r.latitude IS NULL OR r.longitude IS NULL
         OR ST_Distance(
             ST_MakePoint(user_lng, user_lat)::geography,
             ST_MakePoint(r.longitude, r.latitude)::geography
         ) <= max_distance_km * 1000)
    ORDER BY 
        CASE WHEN r.urgency = 'urgent' THEN 1 ELSE 2 END,  -- Urgent requests first
        CASE 
            WHEN user_lat IS NOT NULL AND user_lng IS NOT NULL 
            AND r.latitude IS NOT NULL AND r.longitude IS NOT NULL
            THEN ST_Distance(
                ST_MakePoint(user_lng, user_lat)::geography,
                ST_MakePoint(r.longitude, r.latitude)::geography
            )
            ELSE 999999999
        END,
        r.updated_at DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get user's own requests
CREATE OR REPLACE FUNCTION get_user_requests(username_param text)
RETURNS TABLE(
    id uuid,
    title text,
    description text,
    budget_min numeric,
    budget_max numeric,
    category text,
    urgency text,
    location text,
    latitude double precision,
    longitude double precision,
    expires_at timestamp with time zone,
    updated_at timestamp with time zone
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        r.id,
        r.title,
        r.description,
        r.budget_min,
        r.budget_max,
        r.category,
        r.urgency,
        r.location,
        r.latitude,
        r.longitude,
        r.expires_at,
        r.updated_at
    FROM requests r
    WHERE r.requester_username = username_param
    ORDER BY r.updated_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to update request (with updated_at trigger)
CREATE OR REPLACE FUNCTION update_request_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc', now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Trigger to automatically update updated_at when request is modified
CREATE TRIGGER trigger_update_request_updated_at
    BEFORE UPDATE ON public.requests
    FOR EACH ROW
    EXECUTE FUNCTION update_request_updated_at();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on requests table
ALTER TABLE public.requests ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view all active requests
CREATE POLICY "Users can view active requests" ON public.requests
    FOR SELECT USING (expires_at > now());

-- Policy: Users can create their own requests
CREATE POLICY "Users can create their own requests" ON public.requests
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
            AND users.username = requester_username
        )
    );

-- Policy: Users can update their own requests
CREATE POLICY "Users can update their own requests" ON public.requests
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
            AND users.username = requester_username
        )
    );

-- Policy: Users can delete their own requests
CREATE POLICY "Users can delete their own requests" ON public.requests
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
            AND users.username = requester_username
        )
    );

-- Enable RLS on cleanup_logs table (read-only for users)
ALTER TABLE public.cleanup_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view cleanup logs (for transparency)
CREATE POLICY "Users can view cleanup logs" ON public.cleanup_logs
    FOR SELECT USING (true);

-- ============================================================================
-- SCHEDULED CLEANUP (Optional - requires pg_cron extension)
-- ============================================================================

-- Uncomment the following lines if you want scheduled cleanup
-- Note: This requires the pg_cron extension to be enabled in your Supabase project

-- Enable pg_cron extension (if not already enabled)
-- CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule daily cleanup at 2 AM UTC
-- SELECT cron.schedule('cleanup-expired-requests', '0 2 * * *', 'SELECT cleanup_expired_requests();');

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Verify the requests table was created
SELECT 
    'Migration Status' as check_type,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_name = 'requests' AND table_schema = 'public'
        ) 
        THEN '✅ requests table created'
        ELSE '❌ requests table missing'
    END as table_status,
    CASE 
        WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_requests_with_distance') 
        THEN '✅ get_requests_with_distance function created'
        ELSE '❌ get_requests_with_distance function missing'
    END as function_status,
    CASE 
        WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'cleanup_expired_requests') 
        THEN '✅ cleanup_expired_requests function created'
        ELSE '❌ cleanup_expired_requests function missing'
    END as cleanup_status,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.triggers 
            WHERE trigger_name = 'trigger_update_request_updated_at'
        ) 
        THEN '✅ updated_at trigger created'
        ELSE '❌ updated_at trigger missing'
    END as trigger_status;

-- Test the cleanup function with a sample request (optional)
-- INSERT INTO requests (requester_username, title, description, category, expires_at)
-- VALUES ('test_user', 'Test Request', 'This will expire soon', 'others', now() - interval '1 hour');

-- SELECT cleanup_expired_requests();

-- Verify the test request was deleted
-- SELECT COUNT(*) as remaining_requests FROM requests WHERE title = 'Test Request';
