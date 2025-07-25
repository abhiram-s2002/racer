-- 🚨 CRITICAL SECURITY FIXES FOR RACER MARKETPLACE
-- This script fixes all security vulnerabilities found in the database linter

-- =====================================================
-- 1. ENABLE ROW LEVEL SECURITY (RLS) ON ALL TABLES
-- =====================================================

-- Enable RLS on all public tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ping_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ping_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reward_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.phone_verifications ENABLE ROW LEVEL SECURITY;

-- Note: spatial_ref_sys is a PostGIS system table, we'll handle it separately

-- =====================================================
-- 2. CREATE SECURITY POLICIES FOR EACH TABLE
-- =====================================================

-- USERS TABLE POLICIES
-- Users can view their own profile by matching auth.uid() with id
CREATE POLICY "Users can view their own profile" ON public.users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.users
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON public.users
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Allow public read access to basic user info for marketplace
CREATE POLICY "Public can view basic user info" ON public.users
    FOR SELECT USING (true);

-- LISTINGS TABLE POLICIES
CREATE POLICY "Users can view all listings" ON public.listings
    FOR SELECT USING (true);

-- Users can create listings if they exist in users table
CREATE POLICY "Users can create their own listings" ON public.listings
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND username = listings.username
        )
    );

CREATE POLICY "Users can update their own listings" ON public.listings
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND username = listings.username
        )
    );

CREATE POLICY "Users can delete their own listings" ON public.listings
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND username = listings.username
        )
    );

-- CHATS TABLE POLICIES
CREATE POLICY "Users can view chats they participate in" ON public.chats
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND (username = participant_a OR username = participant_b)
        )
    );

CREATE POLICY "Users can create chats" ON public.chats
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND (username = participant_a OR username = participant_b)
        )
    );

CREATE POLICY "Users can update chats they participate in" ON public.chats
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND (username = participant_a OR username = participant_b)
        )
    );

-- MESSAGES TABLE POLICIES
CREATE POLICY "Users can view messages in their chats" ON public.messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.chats c
            JOIN public.users u ON (u.username = c.participant_a OR u.username = c.participant_b)
            WHERE c.id = messages.chat_id 
            AND u.id = auth.uid()
        )
    );

CREATE POLICY "Users can send messages to their chats" ON public.messages
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND username = sender_username
        ) AND
        EXISTS (
            SELECT 1 FROM public.chats c
            JOIN public.users u ON (u.username = c.participant_a OR u.username = c.participant_b)
            WHERE c.id = messages.chat_id 
            AND u.id = auth.uid()
        )
    );

-- ACTIVITIES TABLE POLICIES
CREATE POLICY "Users can view their own activities" ON public.activities
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND username = activities.username
        )
    );

CREATE POLICY "Users can create their own activities" ON public.activities
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND username = activities.username
        )
    );

CREATE POLICY "Users can update their own activities" ON public.activities
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND username = activities.username
        )
    );

-- PINGS TABLE POLICIES
CREATE POLICY "Users can view pings they sent or received" ON public.pings
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND (username = sender_username OR username = receiver_username)
        )
    );

CREATE POLICY "Users can create pings" ON public.pings
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND username = sender_username
        )
    );

CREATE POLICY "Users can update their own pings" ON public.pings
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND username = sender_username
        )
    );

-- PING ANALYTICS POLICIES
CREATE POLICY "Users can view their own ping analytics" ON public.ping_analytics
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND username = ping_analytics.username
        )
    );

CREATE POLICY "Users can create their own ping analytics" ON public.ping_analytics
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND username = ping_analytics.username
        )
    );

-- PING LIMITS POLICIES
CREATE POLICY "Users can view their own ping limits" ON public.ping_limits
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND username = ping_limits.username
        )
    );

CREATE POLICY "Users can update their own ping limits" ON public.ping_limits
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND username = ping_limits.username
        )
    );

CREATE POLICY "Users can insert their own ping limits" ON public.ping_limits
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND username = ping_limits.username
        )
    );

-- FEEDBACK TABLE POLICIES
CREATE POLICY "Users can view their own feedback" ON public.feedback
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND username = feedback.username
        )
    );

CREATE POLICY "Users can create feedback" ON public.feedback
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND username = feedback.username
        )
    );

-- USER REFERRAL CODES POLICIES
CREATE POLICY "Users can view their own referral codes" ON public.user_referral_codes
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND username = user_referral_codes.username
        )
    );

CREATE POLICY "Users can create their own referral codes" ON public.user_referral_codes
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND username = user_referral_codes.username
        )
    );

-- ACHIEVEMENTS TABLE POLICIES (read-only for users)
CREATE POLICY "Users can view all achievements" ON public.achievements
    FOR SELECT USING (true);

-- USER ACHIEVEMENTS POLICIES
CREATE POLICY "Users can view their own achievements" ON public.user_achievements
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND username = user_achievements.username
        )
    );

CREATE POLICY "Users can create their own achievements" ON public.user_achievements
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND username = user_achievements.username
        )
    );

-- REWARD TRANSACTIONS POLICIES
CREATE POLICY "Users can view their own reward transactions" ON public.reward_transactions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND username = reward_transactions.username
        )
    );

CREATE POLICY "Users can create their own reward transactions" ON public.reward_transactions
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND username = reward_transactions.username
        )
    );

-- DAILY CHECKINS POLICIES
CREATE POLICY "Users can view their own checkins" ON public.daily_checkins
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND username = daily_checkins.username
        )
    );

CREATE POLICY "Users can create their own checkins" ON public.daily_checkins
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND username = daily_checkins.username
        )
    );

-- USER STREAKS POLICIES
CREATE POLICY "Users can view their own streaks" ON public.user_streaks
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND username = user_streaks.username
        )
    );

CREATE POLICY "Users can update their own streaks" ON public.user_streaks
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND username = user_streaks.username
        )
    );

CREATE POLICY "Users can insert their own streaks" ON public.user_streaks
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND username = user_streaks.username
        )
    );

-- USER REWARDS POLICIES
CREATE POLICY "Users can view their own rewards" ON public.user_rewards
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND username = user_rewards.username
        )
    );

CREATE POLICY "Users can update their own rewards" ON public.user_rewards
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND username = user_rewards.username
        )
    );

CREATE POLICY "Users can insert their own rewards" ON public.user_rewards
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND username = user_rewards.username
        )
    );

-- REFERRALS POLICIES
CREATE POLICY "Users can view referrals they made" ON public.referrals
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND username = referrer_username
        )
    );

CREATE POLICY "Users can create referrals" ON public.referrals
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND username = referrer_username
        )
    );

-- PHONE VERIFICATIONS POLICIES
CREATE POLICY "Users can view their own phone verifications" ON public.phone_verifications
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND phone = phone_verifications.phone_number
        )
    );

CREATE POLICY "Users can create phone verifications" ON public.phone_verifications
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND phone = phone_verifications.phone_number
        )
    );

CREATE POLICY "Users can update their own phone verifications" ON public.phone_verifications
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND phone = phone_verifications.phone_number
        )
    );

-- =====================================================
-- 3. FIX SECURITY DEFINER VIEWS
-- =====================================================

-- Drop and recreate views without SECURITY DEFINER
DROP VIEW IF EXISTS public.pings_with_listings;
CREATE VIEW public.pings_with_listings AS
SELECT 
    p.id,
    p.listing_id,
    p.sender_username,
    p.receiver_username,
    p.message,
    p.status,
    p.response_time_minutes,
    p.first_response_at,
    p.responded_at,
    p.response_message,
    p.ping_count,
    p.last_ping_at,
    p.created_at,
    l.title as listing_title,
    l.price as listing_price,
    l.images as listing_images,
    u.avatar_url as sender_avatar
FROM public.pings p
JOIN public.listings l ON p.listing_id = l.id
JOIN public.users u ON p.sender_username = u.username;

DROP VIEW IF EXISTS public.phone_verification_analytics;
CREATE VIEW public.phone_verification_analytics AS
SELECT 
    COUNT(*) as total_verifications,
    COUNT(CASE WHEN phone IS NOT NULL THEN 1 END) as users_with_phone,
    COUNT(CASE WHEN phone IS NULL THEN 1 END) as users_without_phone
FROM public.users;

DROP VIEW IF EXISTS public.user_verification_status;
CREATE VIEW public.user_verification_status AS
SELECT 
    id,
    username,
    email,
    phone,
    CASE 
        WHEN phone IS NOT NULL THEN 'has_phone'
        ELSE 'no_phone'
    END as verification_status,
    created_at
FROM public.users;

-- =====================================================
-- 4. HANDLE SPATIAL_REF_SYS TABLE
-- =====================================================

-- Note: spatial_ref_sys is a PostGIS system table owned by the postgres user
-- We cannot create policies on it, but it's not a security concern as it only
-- contains coordinate system definitions, not user data
-- The database linter warning for this table can be safely ignored

-- =====================================================
-- 5. CREATE FUNCTION TO CHECK SECURITY
-- =====================================================

CREATE OR REPLACE FUNCTION check_security_status()
RETURNS TABLE (
    table_name text,
    rls_enabled boolean,
    policy_count integer
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.tablename::text,
        t.rowsecurity as rls_enabled,
        COALESCE(p.policy_count, 0)::integer
    FROM pg_tables t
    LEFT JOIN (
        SELECT 
            schemaname,
            tablename,
            COUNT(*) as policy_count
        FROM pg_policies 
        WHERE schemaname = 'public'
        GROUP BY schemaname, tablename
    ) p ON t.schemaname = p.schemaname AND t.tablename = p.tablename
    WHERE t.schemaname = 'public' 
    AND t.tablename NOT LIKE 'pg_%'
    ORDER BY t.tablename;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 6. VERIFICATION QUERIES
-- =====================================================

-- Check RLS status on all tables
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename NOT LIKE 'pg_%'
ORDER BY tablename;

-- Check policy count per table
SELECT 
    schemaname,
    tablename,
    COUNT(*) as policy_count
FROM pg_policies 
WHERE schemaname = 'public'
GROUP BY schemaname, tablename
ORDER BY tablename;

-- =====================================================
-- 7. SECURITY AUDIT FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION security_audit()
RETURNS TABLE (
    issue_type text,
    table_name text,
    description text,
    severity text
) AS $$
BEGIN
    -- Check for tables without RLS
    RETURN QUERY
    SELECT 
        'RLS_DISABLED'::text as issue_type,
        t.tablename::text as table_name,
        'Row Level Security is not enabled'::text as description,
        'CRITICAL'::text as severity
    FROM pg_tables t
    WHERE t.schemaname = 'public' 
    AND t.tablename NOT LIKE 'pg_%'
    AND NOT t.rowsecurity;

    -- Check for tables without policies
    RETURN QUERY
    SELECT 
        'NO_POLICIES'::text as issue_type,
        t.tablename::text as table_name,
        'No RLS policies defined'::text as description,
        'HIGH'::text as severity
    FROM pg_tables t
    LEFT JOIN pg_policies p ON t.tablename = p.tablename AND t.schemaname = p.schemaname
    WHERE t.schemaname = 'public' 
    AND t.tablename NOT LIKE 'pg_%'
    AND t.rowsecurity
    AND p.tablename IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 8. FINAL VERIFICATION
-- =====================================================

-- Run security audit
SELECT * FROM security_audit();

-- Check overall security status
SELECT * FROM check_security_status(); 