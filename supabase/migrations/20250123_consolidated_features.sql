-- Consolidated Features Migration
-- Migration: 20250123_consolidated_features.sql
-- This migration combines all feature additions into one comprehensive file

-- ============================================================================
-- ADD MISSING COLUMNS
-- ============================================================================

-- Create user_streaks table if it doesn't exist
CREATE TABLE IF NOT EXISTS user_streaks (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    username text NOT NULL UNIQUE,
    current_streak integer DEFAULT 0,
    longest_streak integer DEFAULT 0,
    total_activities integer DEFAULT 0,
    last_activity_date date,
    created_at timestamp with time zone DEFAULT NOW(),
    updated_at timestamp with time zone DEFAULT NOW()
);

-- Add missing columns to user_streaks table
ALTER TABLE user_streaks 
ADD COLUMN IF NOT EXISTS last_weekly_reset date DEFAULT (current_date - interval '1 day'),
ADD COLUMN IF NOT EXISTS last_monthly_reset date DEFAULT (current_date - interval '1 day');

-- Update existing records to have proper default values
UPDATE user_streaks 
SET 
    last_weekly_reset = COALESCE(last_weekly_reset, current_date - interval '1 day'),
    last_monthly_reset = COALESCE(last_monthly_reset, current_date - interval '1 day')
WHERE last_weekly_reset IS NULL OR last_monthly_reset IS NULL;

-- ============================================================================
-- OPTIMIZED REWARDS SYSTEM
-- ============================================================================

-- User rewards table for tracking $OMNI tokens (OPTIMIZED)
CREATE TABLE IF NOT EXISTS user_rewards (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    username text NOT NULL REFERENCES users(username) ON DELETE CASCADE,
    total_omni_earned integer DEFAULT 0,
    total_omni_spent integer DEFAULT 0,
    current_balance integer DEFAULT 0,
    last_activity_at timestamp with time zone DEFAULT timezone('utc', now()),
    created_at timestamp with time zone DEFAULT timezone('utc', now()),
    updated_at timestamp with time zone DEFAULT timezone('utc', now()),
    
    UNIQUE(username)
);

-- Daily check-ins table (OPTIMIZED - with partitioning strategy)
CREATE TABLE IF NOT EXISTS daily_checkins (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    username text NOT NULL REFERENCES users(username) ON DELETE CASCADE,
    checkin_date date NOT NULL,
    omni_earned integer NOT NULL DEFAULT 10,
    streak_day integer NOT NULL DEFAULT 1,
    created_at timestamp with time zone DEFAULT timezone('utc', now()),
    
    UNIQUE(username, checkin_date)
);

-- Update user_streaks table with rewards fields
ALTER TABLE user_streaks 
ADD COLUMN IF NOT EXISTS total_checkins integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS weekly_rewards integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS monthly_rewards integer DEFAULT 0;

-- Referrals table (OPTIMIZED)
CREATE TABLE IF NOT EXISTS referrals (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    referrer_username text NOT NULL REFERENCES users(username) ON DELETE CASCADE,
    referred_username text NOT NULL REFERENCES users(username) ON DELETE CASCADE,
    referral_code text NOT NULL,
    status text DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'expired')),
    omni_rewarded integer DEFAULT 0,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT timezone('utc', now()),
    
    UNIQUE(referred_username) -- Each user can only be referred once
);

-- User referral codes table (OPTIMIZED)
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

-- Achievements table (master list - OPTIMIZED)
CREATE TABLE IF NOT EXISTS achievements (
    id text PRIMARY KEY, -- e.g., 'first_sale', 'social_butterfly'
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

-- User achievements table (OPTIMIZED - with better indexing)
CREATE TABLE IF NOT EXISTS user_achievements (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    username text NOT NULL REFERENCES users(username) ON DELETE CASCADE,
    achievement_id text NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
    progress integer DEFAULT 0,
    completed boolean DEFAULT false,
    completed_at timestamp with time zone,
    omni_rewarded integer DEFAULT 0,
    last_updated_at timestamp with time zone DEFAULT timezone('utc', now()),
    created_at timestamp with time zone DEFAULT timezone('utc', now()),
    
    UNIQUE(username, achievement_id)
);

-- Reward transactions table (OPTIMIZED)
CREATE TABLE IF NOT EXISTS reward_transactions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    username text NOT NULL REFERENCES users(username) ON DELETE CASCADE,
    transaction_type text NOT NULL CHECK (transaction_type IN ('earned', 'spent', 'bonus', 'referral', 'achievement', 'checkin', 'refund')),
    amount integer NOT NULL,
    balance_before integer NOT NULL,
    balance_after integer NOT NULL,
    reference_type text, -- 'listing', 'ping', 'referral', 'achievement', etc.
    reference_id uuid, -- ID of the related record
    description text,
    created_at timestamp with time zone DEFAULT timezone('utc', now())
);

-- ============================================================================
-- CHAT FUNCTIONS
-- ============================================================================

-- Drop existing function first to avoid return type conflicts
DROP FUNCTION IF EXISTS get_chats_for_user(text);

-- Function to get chats for a user (grouped by participant)
CREATE OR REPLACE FUNCTION get_chats_for_user(username_param text)
RETURNS TABLE(
    id uuid,
    listing_id uuid,
    participant_a text,
    participant_b text,
    last_message text,
    last_sender text,
    status text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    other_participant text,
    other_participant_name text,
    other_participant_avatar text
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id,
        c.listing_id,
        c.participant_a,
        c.participant_b,
        c.last_message,
        c.last_sender,
        c.status,
        c.created_at,
        c.updated_at,
        CASE 
            WHEN c.participant_a = username_param THEN c.participant_b
            ELSE c.participant_a
        END as other_participant,
        u.name as other_participant_name,
        u.avatar_url as other_participant_avatar
    FROM chats c
    LEFT JOIN users u ON (
        CASE 
            WHEN c.participant_a = username_param THEN c.participant_b
            ELSE c.participant_a
        END = u.username
    )
    WHERE c.participant_a = username_param OR c.participant_b = username_param
    ORDER BY c.updated_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Drop existing function first to avoid return type conflicts
DROP FUNCTION IF EXISTS create_chat_from_ping(uuid);

-- Function to create a chat from a ping (or find existing chat)
CREATE OR REPLACE FUNCTION create_chat_from_ping(ping_id uuid)
RETURNS text AS $$
DECLARE
    ping_record RECORD;
    existing_chat_id uuid;
    new_chat_id uuid;
BEGIN
    -- Get ping details
    SELECT * INTO ping_record
    FROM pings
    WHERE id = ping_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Ping not found';
    END IF;
    
    -- Check if chat already exists for this listing and participants
    SELECT id INTO existing_chat_id
    FROM chats
    WHERE listing_id = ping_record.listing_id
    AND (
        (participant_a = ping_record.sender_username AND participant_b = ping_record.receiver_username)
        OR (participant_a = ping_record.receiver_username AND participant_b = ping_record.sender_username)
    );
    
    -- If chat exists, return existing chat ID
    IF existing_chat_id IS NOT NULL THEN
        -- Update the existing chat with the ping message
        UPDATE chats 
        SET 
            last_message = ping_record.message,
            last_sender = ping_record.sender_username,
            updated_at = NOW()
        WHERE id = existing_chat_id;
        
        -- Add the ping message to the chat
        INSERT INTO messages (chat_id, sender_username, text)
        VALUES (existing_chat_id, ping_record.sender_username, ping_record.message);
        
        RETURN existing_chat_id::text;
    END IF;
    
    -- Create new chat
    INSERT INTO chats (listing_id, participant_a, participant_b, last_message, last_sender)
    VALUES (ping_record.listing_id, ping_record.sender_username, ping_record.receiver_username, ping_record.message, ping_record.sender_username)
    RETURNING id INTO new_chat_id;
    
    -- Add the ping message to the new chat
    INSERT INTO messages (chat_id, sender_username, text)
    VALUES (new_chat_id, ping_record.sender_username, ping_record.message);
    
    RETURN new_chat_id::text;
END;
$$ LANGUAGE plpgsql;

-- Function to get or create a chat between two users for a listing
CREATE OR REPLACE FUNCTION get_or_create_chat(
    listing_id_param uuid,
    participant_a_param text,
    participant_b_param text,
    initial_message text DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
    existing_chat_id uuid;
    new_chat_id uuid;
BEGIN
    -- Check if chat already exists
    SELECT id INTO existing_chat_id
    FROM chats
    WHERE listing_id = listing_id_param
    AND (
        (participant_a = participant_a_param AND participant_b = participant_b_param)
        OR (participant_a = participant_b_param AND participant_b = participant_a_param)
    );
    
    -- If chat exists, return it
    IF existing_chat_id IS NOT NULL THEN
        -- Update last message if provided
        IF initial_message IS NOT NULL THEN
            UPDATE chats 
            SET 
                last_message = initial_message,
                last_sender = participant_a_param,
                updated_at = NOW()
            WHERE id = existing_chat_id;
            
            -- Add the message
            INSERT INTO messages (chat_id, sender_username, text)
            VALUES (existing_chat_id, participant_a_param, initial_message);
        END IF;
        
        RETURN existing_chat_id;
    END IF;
    
    -- Create new chat
    INSERT INTO chats (listing_id, participant_a, participant_b, last_message, last_sender)
    VALUES (listing_id_param, participant_a_param, participant_b_param, initial_message, participant_a_param)
    RETURNING id INTO new_chat_id;
    
    -- Add initial message if provided
    IF initial_message IS NOT NULL THEN
        INSERT INTO messages (chat_id, sender_username, text)
        VALUES (new_chat_id, participant_a_param, initial_message);
    END IF;
    
    RETURN new_chat_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get chat messages
CREATE OR REPLACE FUNCTION get_chat_messages(chat_id_param uuid)
RETURNS TABLE(
    id uuid,
    chat_id uuid,
    sender_username text,
    text text,
    status text,
    created_at timestamp with time zone,
    sender_name text,
    sender_avatar text
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        m.id,
        m.chat_id,
        m.sender_username,
        m.text,
        m.status,
        m.created_at,
        u.name as sender_name,
        u.avatar_url as sender_avatar
    FROM messages m
    LEFT JOIN users u ON m.sender_username = u.username
    WHERE m.chat_id = chat_id_param
    ORDER BY m.created_at ASC;
END;
$$ LANGUAGE plpgsql;

-- Function to send a chat message
CREATE OR REPLACE FUNCTION send_chat_message(
    chat_id_param uuid,
    sender_username_param text,
    message_text text
)
RETURNS uuid AS $$
DECLARE
    new_message_id uuid;
BEGIN
    -- Insert the message
    INSERT INTO messages (chat_id, sender_username, text)
    VALUES (chat_id_param, sender_username_param, message_text)
    RETURNING id INTO new_message_id;
    
    -- Update the chat's last message
    UPDATE chats 
    SET 
        last_message = message_text,
        last_sender = sender_username_param,
        updated_at = NOW()
    WHERE id = chat_id_param;
    
    RETURN new_message_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- NOTIFICATION SETTINGS
-- ============================================================================

-- Add notification settings to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS notification_settings jsonb DEFAULT '{
    "pings": true,
    "messages": true,
    "listings": true,
    "rewards": true,
    "marketing": false
}'::jsonb;

-- ============================================================================
-- PRICE UNIT SYSTEM
-- ============================================================================

-- Add price_unit column to listings table
ALTER TABLE listings 
ADD COLUMN IF NOT EXISTS price_unit text DEFAULT 'per_item';

-- Add price_unit column to activities table
ALTER TABLE activities 
ADD COLUMN IF NOT EXISTS price_unit text DEFAULT 'per_item';

-- ============================================================================
-- LISTING EXPIRATION SYSTEM
-- ============================================================================

-- Add expiration fields to listings table
ALTER TABLE listings 
ADD COLUMN IF NOT EXISTS expiration_days integer DEFAULT 30,
ADD COLUMN IF NOT EXISTS expires_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS auto_renew boolean DEFAULT false;

-- Function to set expiration date
CREATE OR REPLACE FUNCTION set_listing_expiration()
RETURNS trigger AS $$
BEGIN
    -- Set expiration date when listing is created or updated
    IF NEW.expiration_days IS NOT NULL THEN
        NEW.expires_at = NOW() + (NEW.expiration_days || ' days')::interval;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for expiration
DROP TRIGGER IF EXISTS trigger_set_listing_expiration ON listings;
CREATE TRIGGER trigger_set_listing_expiration
    BEFORE INSERT OR UPDATE ON listings
    FOR EACH ROW
    EXECUTE FUNCTION set_listing_expiration();

-- Function to expire old listings
CREATE OR REPLACE FUNCTION expire_old_listings()
RETURNS void AS $$
BEGIN
    UPDATE listings 
    SET is_active = false
    WHERE expires_at < NOW() 
    AND is_active = true;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- MISSING FEATURES
-- ============================================================================

-- Add missing columns to various tables
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS last_seen_at timestamp with time zone DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS is_verified boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS verification_token text,
ADD COLUMN IF NOT EXISTS reset_password_token text,
ADD COLUMN IF NOT EXISTS reset_password_expires_at timestamp with time zone;

ALTER TABLE listings 
ADD COLUMN IF NOT EXISTS view_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS favorite_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_featured boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS featured_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS condition_rating integer CHECK (condition_rating >= 1 AND condition_rating <= 5);

ALTER TABLE pings 
ADD COLUMN IF NOT EXISTS is_read boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS read_at timestamp with time zone;

-- ============================================================================
-- CHAT CONSTRAINTS
-- ============================================================================

-- Ensure one chat per user pair per listing
ALTER TABLE chats 
DROP CONSTRAINT IF EXISTS unique_chat_per_listing_participants;

ALTER TABLE chats 
ADD CONSTRAINT unique_chat_per_listing_participants 
UNIQUE (listing_id, participant_a, participant_b);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Rewards system indexes
CREATE INDEX IF NOT EXISTS idx_user_rewards_username ON user_rewards(username);
CREATE INDEX IF NOT EXISTS idx_user_rewards_balance ON user_rewards(current_balance);
CREATE INDEX IF NOT EXISTS idx_user_rewards_last_activity ON user_rewards(last_activity_at DESC);

CREATE INDEX IF NOT EXISTS idx_daily_checkins_username ON daily_checkins(username);
CREATE INDEX IF NOT EXISTS idx_daily_checkins_date ON daily_checkins(checkin_date);
CREATE INDEX IF NOT EXISTS idx_daily_checkins_username_date ON daily_checkins(username, checkin_date);
CREATE INDEX IF NOT EXISTS idx_daily_checkins_created_at ON daily_checkins(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_streaks_username ON user_streaks(username);
CREATE INDEX IF NOT EXISTS idx_user_streaks_current_streak ON user_streaks(current_streak);
CREATE INDEX IF NOT EXISTS idx_user_streaks_last_checkin ON user_streaks(last_checkin_date DESC);

CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_username);
CREATE INDEX IF NOT EXISTS idx_referrals_referred ON referrals(referred_username);
CREATE INDEX IF NOT EXISTS idx_referrals_status ON referrals(status);
CREATE INDEX IF NOT EXISTS idx_referrals_code ON referrals(referral_code);
CREATE INDEX IF NOT EXISTS idx_referrals_created_at ON referrals(created_at DESC);

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
CREATE INDEX IF NOT EXISTS idx_user_achievements_progress ON user_achievements(progress);
CREATE INDEX IF NOT EXISTS idx_user_achievements_last_updated ON user_achievements(last_updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_reward_transactions_username ON reward_transactions(username);
CREATE INDEX IF NOT EXISTS idx_reward_transactions_type ON reward_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_reward_transactions_created_at ON reward_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reward_transactions_reference ON reward_transactions(reference_type, reference_id);
CREATE INDEX IF NOT EXISTS idx_reward_transactions_username_created ON reward_transactions(username, created_at DESC);

-- Listing expiration indexes
CREATE INDEX IF NOT EXISTS idx_listings_expires_at ON listings(expires_at);
CREATE INDEX IF NOT EXISTS idx_listings_active_expires ON listings(is_active, expires_at);

-- Price unit indexes
CREATE INDEX IF NOT EXISTS idx_listings_price_unit ON listings(price_unit);
CREATE INDEX IF NOT EXISTS idx_activities_price_unit ON activities(price_unit);

-- ============================================================================
-- REWARDS SYSTEM FUNCTIONS
-- ============================================================================

-- Function to update user rewards balance
CREATE OR REPLACE FUNCTION update_user_rewards_balance()
RETURNS trigger AS $$
BEGIN
    -- Update user_rewards table when a transaction is added
    INSERT INTO user_rewards (username, total_omni_earned, total_omni_spent, current_balance, last_activity_at)
    VALUES (
        NEW.username,
        CASE WHEN NEW.transaction_type IN ('earned', 'bonus', 'referral', 'achievement', 'checkin') THEN NEW.amount ELSE 0 END,
        CASE WHEN NEW.transaction_type = 'spent' THEN NEW.amount ELSE 0 END,
        NEW.balance_after,
        NOW()
    )
    ON CONFLICT (username) DO UPDATE SET
        total_omni_earned = user_rewards.total_omni_earned + 
            CASE WHEN NEW.transaction_type IN ('earned', 'bonus', 'referral', 'achievement', 'checkin') THEN NEW.amount ELSE 0 END,
        total_omni_spent = user_rewards.total_omni_spent + 
            CASE WHEN NEW.transaction_type = 'spent' THEN NEW.amount ELSE 0 END,
        current_balance = NEW.balance_after,
        last_activity_at = NOW(),
        updated_at = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for rewards balance updates
DROP TRIGGER IF EXISTS trigger_update_user_rewards_balance ON reward_transactions;
CREATE TRIGGER trigger_update_user_rewards_balance
    AFTER INSERT ON reward_transactions
    FOR EACH ROW
    WHEN (NEW.transaction_type = 'earned' OR NEW.transaction_type = 'bonus' OR NEW.transaction_type = 'referral' OR NEW.transaction_type = 'achievement' OR NEW.transaction_type = 'checkin')
    EXECUTE FUNCTION update_user_rewards_balance();

-- Function to update user streak
CREATE OR REPLACE FUNCTION update_user_streak()
RETURNS trigger AS $$
DECLARE
    current_streak_val integer;
    longest_streak_val integer;
    last_checkin_date_val date;
BEGIN
    -- Get current streak info
    SELECT 
        current_streak,
        longest_streak,
        last_checkin_date
    INTO current_streak_val, longest_streak_val, last_checkin_date_val
    FROM user_streaks
    WHERE username = NEW.username;
    
    -- If no streak record exists, create one
    IF NOT FOUND THEN
        INSERT INTO user_streaks (username, current_streak, longest_streak, last_checkin_date, total_checkins)
        VALUES (NEW.username, 1, 1, NEW.checkin_date, 1);
        RETURN NEW;
    END IF;
    
    -- Check if this is a consecutive day
    IF last_checkin_date_val = NEW.checkin_date - INTERVAL '1 day' THEN
        -- Consecutive day - increment streak
        current_streak_val := current_streak_val + 1;
        IF current_streak_val > longest_streak_val THEN
            longest_streak_val := current_streak_val;
        END IF;
    ELSIF last_checkin_date_val != NEW.checkin_date THEN
        -- Not consecutive - reset streak
        current_streak_val := 1;
    END IF;
    
    -- Update streak record
    UPDATE user_streaks
    SET 
        current_streak = current_streak_val,
        longest_streak = longest_streak_val,
        last_checkin_date = NEW.checkin_date,
        total_checkins = total_checkins + 1,
        updated_at = NOW()
    WHERE username = NEW.username;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for streak updates
DROP TRIGGER IF EXISTS trigger_update_user_streak ON daily_checkins;
CREATE TRIGGER trigger_update_user_streak
    AFTER INSERT ON daily_checkins
    FOR EACH ROW
    EXECUTE FUNCTION update_user_streak();

-- Function to complete referral on first listing
CREATE OR REPLACE FUNCTION complete_referral_on_first_listing()
RETURNS trigger AS $$
DECLARE
    referral_record RECORD;
BEGIN
    -- Check if this is the user's first listing
    IF (SELECT COUNT(*) FROM listings WHERE username = NEW.username) = 1 THEN
        -- Find pending referral for this user
        SELECT * INTO referral_record
        FROM referrals
        WHERE referred_username = NEW.username
        AND status = 'pending';
        
        IF FOUND THEN
            -- Complete the referral
            UPDATE referrals
            SET 
                status = 'completed',
                completed_at = NOW(),
                omni_rewarded = 50 -- Reward for first listing
            WHERE id = referral_record.id;
            
            -- Award OMNI to referrer
            INSERT INTO reward_transactions (username, transaction_type, amount, balance_before, balance_after, reference_type, reference_id, description)
            VALUES (
                referral_record.referrer_username,
                'referral',
                50,
                COALESCE((SELECT current_balance FROM user_rewards WHERE username = referral_record.referrer_username), 0),
                COALESCE((SELECT current_balance FROM user_rewards WHERE username = referral_record.referrer_username), 0) + 50,
                'referral',
                referral_record.id,
                'Referral bonus for ' || NEW.username || 's first listing'
            );
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for referral completion
DROP TRIGGER IF EXISTS trigger_complete_referral_on_first_listing ON listings;
CREATE TRIGGER trigger_complete_referral_on_first_listing
    AFTER INSERT ON listings
    FOR EACH ROW
    EXECUTE FUNCTION complete_referral_on_first_listing();

-- Function to award achievement completion
CREATE OR REPLACE FUNCTION award_achievement_completion()
RETURNS trigger AS $$
BEGIN
    -- If achievement was just completed, award OMNI
    IF NEW.completed = true AND OLD.completed = false THEN
        INSERT INTO reward_transactions (username, transaction_type, amount, balance_before, balance_after, reference_type, reference_id, description)
        VALUES (
            NEW.username,
            'achievement',
            (SELECT omni_reward FROM achievements WHERE id = NEW.achievement_id),
            COALESCE((SELECT current_balance FROM user_rewards WHERE username = NEW.username), 0),
            COALESCE((SELECT current_balance FROM user_rewards WHERE username = NEW.username), 0) + 
            (SELECT omni_reward FROM achievements WHERE id = NEW.achievement_id),
            'achievement',
            NEW.id,
            'Achievement completed: ' || (SELECT title FROM achievements WHERE id = NEW.achievement_id)
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for achievement rewards
DROP TRIGGER IF EXISTS trigger_award_achievement_completion ON user_achievements;
CREATE TRIGGER trigger_award_achievement_completion
    AFTER UPDATE ON user_achievements
    FOR EACH ROW
    EXECUTE FUNCTION award_achievement_completion();

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Verify the migration worked correctly
SELECT 
    'Consolidated Features Migration Status' as check_type,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_rewards') 
        THEN '✅ Rewards system tables created'
        ELSE '❌ Rewards system tables missing'
    END as rewards_status,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'listings' AND column_name = 'price_unit') 
        THEN '✅ Price unit system added'
        ELSE '❌ Price unit system missing'
    END as price_unit_status,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'listings' AND column_name = 'expires_at') 
        THEN '✅ Expiration system added'
        ELSE '❌ Expiration system missing'
    END as expiration_status,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'notification_settings') 
        THEN '✅ Notification settings added'
        ELSE '❌ Notification settings missing'
    END as notifications_status; 