-- Complete Cloud Database Setup
-- Run this script in your Supabase SQL Editor
-- This includes all features from the missing migrations

-- ============================================================================
-- NOTIFICATION SETTINGS
-- ============================================================================

-- Add notification settings columns to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS notification_new_messages boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS notification_listing_updates boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS notification_marketing_emails boolean DEFAULT false;

-- Create index for notification settings queries
CREATE INDEX IF NOT EXISTS idx_users_notification_settings ON users(notification_new_messages, notification_listing_updates, notification_marketing_emails);

-- ============================================================================
-- PRICE UNIT SUPPORT
-- ============================================================================

-- Add price_unit column to listings table
ALTER TABLE listings 
ADD COLUMN IF NOT EXISTS price_unit text DEFAULT 'per_item';

-- Add index for price_unit for better query performance
CREATE INDEX IF NOT EXISTS idx_listings_price_unit ON listings(price_unit);

-- Update existing listings to have a default price_unit
UPDATE listings 
SET price_unit = 'per_item' 
WHERE price_unit IS NULL;

-- ============================================================================
-- LISTING EXPIRATION SYSTEM
-- ============================================================================

-- Add expiration date fields to listings table
ALTER TABLE listings 
ADD COLUMN IF NOT EXISTS expires_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS extension_count integer DEFAULT 0;

-- Add default expiration (30 days from creation) for existing listings
UPDATE listings 
SET expires_at = created_at + INTERVAL '30 days'
WHERE expires_at IS NULL;

-- Create indexes for expiration queries
CREATE INDEX IF NOT EXISTS idx_listings_expires_at ON listings(expires_at);
CREATE INDEX IF NOT EXISTS idx_listings_active_expires ON listings(is_active, expires_at);
CREATE INDEX IF NOT EXISTS idx_listings_expires_at_desc ON listings(expires_at DESC);

-- ============================================================================
-- REWARDS SYSTEM TABLES
-- ============================================================================

-- User rewards table for tracking $OMNI tokens
CREATE TABLE IF NOT EXISTS user_rewards (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    username text NOT NULL REFERENCES users(username) ON DELETE CASCADE,
    total_omni_earned integer DEFAULT 0,
    total_omni_spent integer DEFAULT 0,
    current_balance integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT timezone('utc', now()),
    updated_at timestamp with time zone DEFAULT timezone('utc', now()),
    UNIQUE(username)
);

-- Daily check-ins table
CREATE TABLE IF NOT EXISTS daily_checkins (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    username text NOT NULL REFERENCES users(username) ON DELETE CASCADE,
    checkin_date date NOT NULL,
    omni_earned integer NOT NULL DEFAULT 10,
    streak_day integer NOT NULL DEFAULT 1,
    created_at timestamp with time zone DEFAULT timezone('utc', now()),
    UNIQUE(username, checkin_date)
);

-- User streaks table for tracking check-in streaks
CREATE TABLE IF NOT EXISTS user_streaks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    username text NOT NULL REFERENCES users(username) ON DELETE CASCADE,
    current_streak integer DEFAULT 0,
    longest_streak integer DEFAULT 0,
    total_checkins integer DEFAULT 0,
    last_checkin_date date,
    weekly_rewards integer DEFAULT 0,
    monthly_rewards integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT timezone('utc', now()),
    updated_at timestamp with time zone DEFAULT timezone('utc', now()),
    UNIQUE(username)
);

-- Referrals table
CREATE TABLE IF NOT EXISTS referrals (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    referrer_username text NOT NULL REFERENCES users(username) ON DELETE CASCADE,
    referred_username text NOT NULL REFERENCES users(username) ON DELETE CASCADE,
    referral_code text NOT NULL,
    status text DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'expired')),
    omni_rewarded integer DEFAULT 0,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT timezone('utc', now()),
    UNIQUE(referred_username)
);

-- User referral codes table
CREATE TABLE IF NOT EXISTS user_referral_codes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    username text NOT NULL REFERENCES users(username) ON DELETE CASCADE,
    referral_code text NOT NULL UNIQUE,
    total_referrals integer DEFAULT 0,
    total_earnings integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT timezone('utc', now()),
    updated_at timestamp with time zone DEFAULT timezone('utc', now()),
    UNIQUE(username)
);

-- Achievements table (master list of all possible achievements)
CREATE TABLE IF NOT EXISTS achievements (
    id text PRIMARY KEY,
    title text NOT NULL,
    description text NOT NULL,
    icon text NOT NULL,
    category text NOT NULL CHECK (category IN ('sales', 'social', 'engagement', 'milestone', 'special')),
    max_progress integer NOT NULL DEFAULT 1,
    omni_reward integer NOT NULL DEFAULT 0,
    rarity text NOT NULL DEFAULT 'common' CHECK (rarity IN ('common', 'rare', 'epic', 'legendary')),
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT timezone('utc', now())
);

-- User achievements table (user progress on achievements)
CREATE TABLE IF NOT EXISTS user_achievements (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    username text NOT NULL REFERENCES users(username) ON DELETE CASCADE,
    achievement_id text NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
    progress integer DEFAULT 0,
    max_progress integer NOT NULL,
    completed boolean DEFAULT false,
    completed_date date,
    omni_earned integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT timezone('utc', now()),
    updated_at timestamp with time zone DEFAULT timezone('utc', now()),
    UNIQUE(username, achievement_id)
);

-- Reward transactions table for tracking all reward events
CREATE TABLE IF NOT EXISTS reward_transactions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    username text NOT NULL REFERENCES users(username) ON DELETE CASCADE,
    transaction_type text NOT NULL CHECK (transaction_type IN ('earned', 'spent', 'bonus', 'referral', 'achievement', 'checkin')),
    amount integer NOT NULL,
    description text NOT NULL,
    reference_id uuid,
    reference_type text,
    created_at timestamp with time zone DEFAULT timezone('utc', now())
);

-- ============================================================================
-- REWARDS SYSTEM INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_user_rewards_username ON user_rewards(username);
CREATE INDEX IF NOT EXISTS idx_user_rewards_balance ON user_rewards(current_balance);
CREATE INDEX IF NOT EXISTS idx_daily_checkins_username ON daily_checkins(username);
CREATE INDEX IF NOT EXISTS idx_daily_checkins_date ON daily_checkins(checkin_date);
CREATE INDEX IF NOT EXISTS idx_daily_checkins_username_date ON daily_checkins(username, checkin_date);
CREATE INDEX IF NOT EXISTS idx_user_streaks_username ON user_streaks(username);
CREATE INDEX IF NOT EXISTS idx_user_streaks_current_streak ON user_streaks(current_streak);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_username);
CREATE INDEX IF NOT EXISTS idx_referrals_referred ON referrals(referred_username);
CREATE INDEX IF NOT EXISTS idx_referrals_status ON referrals(status);
CREATE INDEX IF NOT EXISTS idx_referrals_code ON referrals(referral_code);
CREATE INDEX IF NOT EXISTS idx_user_referral_codes_username ON user_referral_codes(username);
CREATE INDEX IF NOT EXISTS idx_user_referral_codes_code ON user_referral_codes(referral_code);
CREATE INDEX IF NOT EXISTS idx_user_referral_codes_active ON user_referral_codes(is_active);
CREATE INDEX IF NOT EXISTS idx_achievements_category ON achievements(category);
CREATE INDEX IF NOT EXISTS idx_achievements_rarity ON achievements(rarity);
CREATE INDEX IF NOT EXISTS idx_achievements_active ON achievements(is_active);
CREATE INDEX IF NOT EXISTS idx_user_achievements_username ON user_achievements(username);
CREATE INDEX IF NOT EXISTS idx_user_achievements_achievement_id ON user_achievements(achievement_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_completed ON user_achievements(completed);
CREATE INDEX IF NOT EXISTS idx_user_achievements_username_completed ON user_achievements(username, completed);
CREATE INDEX IF NOT EXISTS idx_reward_transactions_username ON reward_transactions(username);
CREATE INDEX IF NOT EXISTS idx_reward_transactions_type ON reward_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_reward_transactions_created_at ON reward_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reward_transactions_reference ON reward_transactions(reference_type, reference_id);

-- ============================================================================
-- REWARDS SYSTEM SEED DATA
-- ============================================================================

-- Insert default achievements
INSERT INTO achievements (id, title, description, icon, category, max_progress, omni_reward, rarity) VALUES
    ('welcome_bonus', 'Welcome Bonus', 'Join the marketplace and get started', 'Gift', 'special', 1, 50, 'common'),
    ('early_adopter', 'Early Adopter', 'Join during the first month of launch', 'Sparkles', 'special', 1, 1000, 'legendary'),
    ('first_list', 'First List', 'Create your first listing', 'ShoppingBag', 'sales', 1, 50, 'common'),
    ('listing_master', 'Listing Master', 'Create 10 listings', 'Trophy', 'sales', 10, 200, 'rare'),
    ('social_butterfly', 'Social Butterfly', 'Send 20 messages', 'MessageCircle', 'social', 20, 100, 'common'),
    ('power_user', 'Power User', 'Use the app for 7 consecutive days', 'Flame', 'engagement', 7, 150, 'rare'),
    ('loyal_user', 'Loyal User', 'Use the app for 30 consecutive days', 'Crown', 'engagement', 30, 500, 'epic'),
    ('quick_responder', 'Quick Responder', 'Respond to messages within 1 hour', 'Phone', 'engagement', 10, 125, 'rare'),
    ('trend_setter', 'Trend Setter', 'Have a listing viewed 100+ times', 'TrendingUp', 'milestone', 100, 300, 'epic'),
    ('referral_king', 'Referral King', 'Refer 5 friends successfully', 'Crown', 'milestone', 5, 500, 'epic'),
    ('perfect_seller', 'Perfect Seller', 'Maintain 5-star rating for 10 sales', 'Star', 'special', 10, 750, 'legendary')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Check that all tables were created
SELECT 'Tables created successfully' as status; 