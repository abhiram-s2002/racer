-- Step 5: Final Verification
-- Run this in your Supabase SQL Editor after completing all previous steps

-- ============================================================================
-- COMPREHENSIVE VERIFICATION
-- ============================================================================

-- 1. Verify all tables exist
SELECT 'Tables' as component, COUNT(*) as count
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
    'users', 'listings', 'pings', 'chats', 'messages',
    'user_rewards', 'reward_transactions', 'user_streaks', 
    'daily_checkins', 'referrals', 'achievements', 'user_achievements'
);

-- 2. Verify all functions exist
SELECT 'Functions' as component, COUNT(*) as count
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN (
    'validate_price_unit', 'validate_listing_price_unit',
    'update_user_rewards_balance', 'update_user_streak',
    'cleanup_expired_listings', 'extend_listing_expiration',
    'create_listing_with_expiration', 'get_listing_expiration_status',
    'get_chats_for_user', 'create_chat_from_ping',
    'get_or_create_chat', 'get_chat_messages', 'send_chat_message',
    'complete_referral_on_first_listing', 'award_achievement_completion'
);

-- 3. Verify all triggers exist
SELECT 'Triggers' as component, COUNT(*) as count
FROM information_schema.triggers 
WHERE trigger_schema = 'public' 
AND trigger_name IN (
    'trigger_validate_price_unit', 'trigger_update_user_rewards_balance',
    'trigger_update_user_streak', 'trigger_complete_referral_on_first_listing',
    'trigger_award_achievement_completion'
);

-- 4. Verify storage buckets exist
SELECT 'Storage Buckets' as component, COUNT(*) as count
FROM storage.buckets 
WHERE id IN ('listings', 'avatars', 'temp');

-- 5. Verify storage policies exist
SELECT 'Storage Policies' as component, COUNT(*) as count
FROM pg_policies 
WHERE tablename = 'objects' 
AND schemaname = 'storage';

-- 6. Verify extensions are enabled
SELECT 'Extensions' as component, COUNT(*) as count
FROM pg_extension 
WHERE extname IN ('earthdistance', 'cube', 'uuid-ossp', 'pgcrypto');

-- ============================================================================
-- DETAILED VERIFICATION
-- ============================================================================

-- List all tables with their row counts
SELECT 
    schemaname,
    tablename,
    (SELECT COUNT(*) FROM public.users) as user_count,
    (SELECT COUNT(*) FROM public.listings) as listing_count,
    (SELECT COUNT(*) FROM public.pings) as ping_count,
    (SELECT COUNT(*) FROM public.chats) as chat_count,
    (SELECT COUNT(*) FROM public.messages) as message_count
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('users', 'listings', 'pings', 'chats', 'messages')
ORDER BY tablename;

-- List all storage buckets with their configurations
SELECT 
    id as bucket_id,
    name as bucket_name,
    public,
    file_size_limit,
    allowed_mime_types
FROM storage.buckets 
WHERE id IN ('listings', 'avatars', 'temp')
ORDER BY id;

-- List all storage policies
SELECT 
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'objects' 
AND schemaname = 'storage'
ORDER BY policyname;

-- ============================================================================
-- TEST DATA INSERTION (Optional)
-- ============================================================================

-- Uncomment the following section if you want to insert test data

/*
-- Insert a test user
INSERT INTO public.users (id, username, email, name, avatar_url)
VALUES (
    gen_random_uuid(),
    'testuser',
    'test@example.com',
    'Test User',
    'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=400'
) ON CONFLICT (username) DO NOTHING;

-- Insert test achievements
INSERT INTO public.achievements (title, description, icon, omni_reward, criteria)
VALUES 
    ('First Listing', 'Create your first marketplace listing', '📝', 50, '{"listings_created": 1}'),
    ('Active Seller', 'Create 5 listings', '🏪', 100, '{"listings_created": 5}'),
    ('Social Butterfly', 'Send 10 pings', '💬', 75, '{"pings_sent": 10}')
ON CONFLICT DO NOTHING;

-- Insert test user rewards
INSERT INTO public.user_rewards (username, total_omni_earned, current_balance)
VALUES ('testuser', 0, 0)
ON CONFLICT (username) DO NOTHING;
*/

-- ============================================================================
-- MIGRATION COMPLETE MESSAGE
-- ============================================================================

SELECT 
    '🎉 MIGRATION COMPLETE!' as status,
    'Your marketplace application is now running on Supabase Cloud Storage!' as message,
    'Next steps:' as next_steps,
    '1. Test image uploads in your app' as step1,
    '2. Verify chat functionality' as step2,
    '3. Test rewards system' as step3,
    '4. Monitor storage usage in Supabase Dashboard' as step4; 