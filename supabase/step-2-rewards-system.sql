-- Step 2: Create Rewards System Tables
-- Run this in your Supabase SQL Editor after Step 1

-- ============================================================================
-- REWARDS SYSTEM TABLES
-- ============================================================================

-- 1. User rewards table
CREATE TABLE IF NOT EXISTS public.user_rewards (
    username text PRIMARY KEY REFERENCES public.users(username) ON DELETE CASCADE,
    total_omni_earned integer DEFAULT 0,
    current_balance integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT timezone('utc', now()),
    updated_at timestamp with time zone DEFAULT timezone('utc', now())
);

-- 2. Reward transactions table
CREATE TABLE IF NOT EXISTS public.reward_transactions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    username text NOT NULL REFERENCES public.users(username) ON DELETE CASCADE,
    transaction_type text NOT NULL CHECK (transaction_type IN ('earned', 'spent', 'bonus', 'referral', 'achievement', 'checkin')),
    amount integer NOT NULL,
    description text,
    reference_id uuid,
    reference_type text,
    created_at timestamp with time zone DEFAULT timezone('utc', now())
);

-- 3. User streaks table
CREATE TABLE IF NOT EXISTS public.user_streaks (
    username text PRIMARY KEY REFERENCES public.users(username) ON DELETE CASCADE,
    current_streak integer DEFAULT 0,
    longest_streak integer DEFAULT 0,
    total_checkins integer DEFAULT 0,
    last_checkin_date date,
    created_at timestamp with time zone DEFAULT timezone('utc', now()),
    updated_at timestamp with time zone DEFAULT timezone('utc', now())
);

-- 4. Daily checkins table
CREATE TABLE IF NOT EXISTS public.daily_checkins (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    username text NOT NULL REFERENCES public.users(username) ON DELETE CASCADE,
    checkin_date date NOT NULL DEFAULT CURRENT_DATE,
    omni_earned integer DEFAULT 10,
    created_at timestamp with time zone DEFAULT timezone('utc', now()),
    UNIQUE(username, checkin_date)
);

-- 5. Referrals table
CREATE TABLE IF NOT EXISTS public.referrals (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    referrer_username text NOT NULL REFERENCES public.users(username) ON DELETE CASCADE,
    referred_username text NOT NULL REFERENCES public.users(username) ON DELETE CASCADE,
    status text DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'expired')),
    referral_code text,
    created_at timestamp with time zone DEFAULT timezone('utc', now()),
    completed_at timestamp with time zone,
    UNIQUE(referred_username)
);

-- 6. Achievements table
CREATE TABLE IF NOT EXISTS public.achievements (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    title text NOT NULL,
    description text,
    icon text,
    omni_reward integer DEFAULT 0,
    criteria jsonb,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT timezone('utc', now())
);

-- 7. User achievements table
CREATE TABLE IF NOT EXISTS public.user_achievements (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    username text NOT NULL REFERENCES public.users(username) ON DELETE CASCADE,
    achievement_id uuid NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
    completed boolean DEFAULT false,
    completed_at timestamp with time zone,
    progress integer DEFAULT 0,
    omni_earned integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT timezone('utc', now()),
    updated_at timestamp with time zone DEFAULT timezone('utc', now()),
    UNIQUE(username, achievement_id)
);

-- ============================================================================
-- INDEXES FOR REWARDS SYSTEM
-- ============================================================================

-- Indexes for reward transactions
CREATE INDEX IF NOT EXISTS idx_reward_transactions_username ON public.reward_transactions(username);
CREATE INDEX IF NOT EXISTS idx_reward_transactions_type ON public.reward_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_reward_transactions_created_at ON public.reward_transactions(created_at);

-- Indexes for daily checkins
CREATE INDEX IF NOT EXISTS idx_daily_checkins_username ON public.daily_checkins(username);
CREATE INDEX IF NOT EXISTS idx_daily_checkins_date ON public.daily_checkins(checkin_date);

-- Indexes for referrals
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON public.referrals(referrer_username);
CREATE INDEX IF NOT EXISTS idx_referrals_referred ON public.referrals(referred_username);
CREATE INDEX IF NOT EXISTS idx_referrals_status ON public.referrals(status);

-- Indexes for user achievements
CREATE INDEX IF NOT EXISTS idx_user_achievements_username ON public.user_achievements(username);
CREATE INDEX IF NOT EXISTS idx_user_achievements_achievement ON public.user_achievements(achievement_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_completed ON public.user_achievements(completed);

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Check that rewards tables were created successfully
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('user_rewards', 'reward_transactions', 'user_streaks', 'daily_checkins', 'referrals', 'achievements', 'user_achievements')
ORDER BY table_name; 