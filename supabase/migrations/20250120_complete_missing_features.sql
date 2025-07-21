-- Complete Missing Features Migration
-- Migration: 20250120_complete_missing_features.sql
-- This file contains all missing features not included in the base marketplace setup

-- ============================================================================
-- NOTIFICATION SETTINGS
-- ============================================================================

-- Add notification settings columns to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS notification_new_messages boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS notification_listing_updates boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS notification_marketing_emails boolean DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN users.notification_new_messages IS 'User preference for new message notifications';
COMMENT ON COLUMN users.notification_listing_updates IS 'User preference for listing update notifications';
COMMENT ON COLUMN users.notification_marketing_emails IS 'User preference for marketing email notifications';

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

-- Add comment to document the field
COMMENT ON COLUMN listings.price_unit IS 'Pricing unit for the listing (e.g., per_kg, per_hour, per_piece)';

-- Create a function to validate price units based on category
CREATE OR REPLACE FUNCTION validate_price_unit(category_param text, price_unit_param text)
RETURNS boolean AS $$
BEGIN
  -- Define valid price units for each category
  CASE category_param
    WHEN 'groceries' THEN
      RETURN price_unit_param IN ('per_kg', 'per_piece', 'per_pack', 'per_bundle', 'per_item');
    WHEN 'fruits' THEN
      RETURN price_unit_param IN ('per_kg', 'per_dozen', 'per_piece', 'per_basket', 'per_item');
    WHEN 'food' THEN
      RETURN price_unit_param IN ('per_plate', 'per_serving', 'per_piece', 'per_kg', 'per_item');
    WHEN 'services' THEN
      RETURN price_unit_param IN ('per_hour', 'per_service', 'per_session', 'per_day', 'per_item');
    WHEN 'art' THEN
      RETURN price_unit_param IN ('per_piece', 'per_commission', 'per_hour', 'per_project', 'per_item');
    WHEN 'rental' THEN
      RETURN price_unit_param IN ('per_day', 'per_week', 'per_month', 'per_hour', 'per_item');
    ELSE
      -- For unknown categories, allow common units
      RETURN price_unit_param IN ('per_item', 'per_piece', 'per_service', 'per_hour', 'per_day');
  END CASE;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to validate price_unit on insert/update
CREATE OR REPLACE FUNCTION validate_listing_price_unit()
RETURNS trigger AS $$
BEGIN
  -- Skip validation if price_unit is not provided (will use default)
  IF NEW.price_unit IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Validate price_unit against category
  IF NOT validate_price_unit(NEW.category, NEW.price_unit) THEN
    RAISE EXCEPTION 'Invalid price_unit "%" for category "%"', NEW.price_unit, NEW.category;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for price_unit validation
DROP TRIGGER IF EXISTS trigger_validate_price_unit ON listings;
CREATE TRIGGER trigger_validate_price_unit
  BEFORE INSERT OR UPDATE ON listings
  FOR EACH ROW
  EXECUTE FUNCTION validate_listing_price_unit();

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

-- Automatic cleanup function
CREATE OR REPLACE FUNCTION cleanup_expired_listings()
RETURNS void AS $$
DECLARE
    expired_count integer;
    deleted_listing record;
BEGIN
    SELECT COUNT(*) INTO expired_count 
    FROM listings 
    WHERE expires_at <= now() AND is_active = true;
    
    RAISE NOTICE 'Cleaning up % expired listings', expired_count;
    
    FOR deleted_listing IN 
        SELECT id, username, title 
        FROM listings 
        WHERE expires_at <= now() AND is_active = true
    LOOP
        RAISE NOTICE 'Deleting expired listing: % (ID: %, User: %)', 
            deleted_listing.title, deleted_listing.id, deleted_listing.username;
        DELETE FROM listings WHERE id = deleted_listing.id;
    END LOOP;
    
    RAISE NOTICE 'Cleanup completed. Deleted % expired listings', expired_count;
END;
$$ LANGUAGE plpgsql;

-- Extension function
CREATE OR REPLACE FUNCTION extend_listing_expiration(
    listing_id_param uuid,
    extension_days integer DEFAULT 30
)
RETURNS json AS $$
DECLARE
    listing_record record;
    new_expires_at timestamp with time zone;
BEGIN
    SELECT * INTO listing_record 
    FROM listings 
    WHERE id = listing_id_param;
    
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Listing not found'
        );
    END IF;
    
    IF NOT listing_record.is_active THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Cannot extend inactive listing'
        );
    END IF;
    
    IF listing_record.expires_at <= now() THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Cannot extend expired listing'
        );
    END IF;
    
    new_expires_at = GREATEST(listing_record.expires_at, now()) + (extension_days || ' days')::interval;
    
    UPDATE listings 
    SET 
        expires_at = new_expires_at,
        extension_count = extension_count + 1,
        updated_at = now()
    WHERE id = listing_id_param;
    
    RETURN json_build_object(
        'success', true,
        'new_expires_at', new_expires_at,
        'extension_count', listing_record.extension_count + 1
    );
END;
$$ LANGUAGE plpgsql;

-- Create listing with expiration
CREATE OR REPLACE FUNCTION create_listing_with_expiration(
    username_param text,
    title_param text,
    description_param text,
    price_param numeric,
    category_param text,
    images_param text[] DEFAULT '{}',
    latitude_param double precision DEFAULT NULL,
    longitude_param double precision DEFAULT NULL,
    expiration_days integer DEFAULT 30
)
RETURNS uuid AS $$
DECLARE
    new_listing_id uuid;
    expires_at_calc timestamp with time zone;
BEGIN
    expires_at_calc = now() + (expiration_days || ' days')::interval;
    
    INSERT INTO listings (
        username,
        title,
        description,
        price,
        category,
        images,
        latitude,
        longitude,
        expires_at,
        is_active
    ) VALUES (
        username_param,
        title_param,
        description_param,
        price_param,
        category_param,
        images_param,
        latitude_param,
        longitude_param,
        expires_at_calc,
        true
    ) RETURNING id INTO new_listing_id;
    
    RETURN new_listing_id;
END;
$$ LANGUAGE plpgsql;

-- Get listing expiration status
CREATE OR REPLACE FUNCTION get_listing_expiration_status(listing_id_param uuid)
RETURNS json AS $$
DECLARE
    listing_record record;
    days_until_expiry integer;
BEGIN
    SELECT * INTO listing_record 
    FROM listings 
    WHERE id = listing_id_param;
    
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Listing not found'
        );
    END IF;
    
    days_until_expiry = EXTRACT(DAY FROM (listing_record.expires_at - now()))::integer;
    
    RETURN json_build_object(
        'success', true,
        'expires_at', listing_record.expires_at,
        'days_until_expiry', days_until_expiry,
        'is_expired', days_until_expiry <= 0,
        'extension_count', listing_record.extension_count
    );
END;
$$ LANGUAGE plpgsql;

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
    
    UNIQUE(referred_username) -- Each user can only be referred once
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
    reference_id uuid, -- ID of related record (achievement, referral, etc.)
    reference_type text, -- Type of reference (achievement, referral, checkin, etc.)
    created_at timestamp with time zone DEFAULT timezone('utc', now())
);

-- ============================================================================
-- REWARDS SYSTEM INDEXES
-- ============================================================================

-- User rewards indexes
CREATE INDEX IF NOT EXISTS idx_user_rewards_username ON user_rewards(username);
CREATE INDEX IF NOT EXISTS idx_user_rewards_balance ON user_rewards(current_balance);

-- Daily checkins indexes
CREATE INDEX IF NOT EXISTS idx_daily_checkins_username ON daily_checkins(username);
CREATE INDEX IF NOT EXISTS idx_daily_checkins_date ON daily_checkins(checkin_date);
CREATE INDEX IF NOT EXISTS idx_daily_checkins_username_date ON daily_checkins(username, checkin_date);

-- User streaks indexes
CREATE INDEX IF NOT EXISTS idx_user_streaks_username ON user_streaks(username);
CREATE INDEX IF NOT EXISTS idx_user_streaks_current_streak ON user_streaks(current_streak);

-- Referrals indexes
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_username);
CREATE INDEX IF NOT EXISTS idx_referrals_referred ON referrals(referred_username);
CREATE INDEX IF NOT EXISTS idx_referrals_status ON referrals(status);
CREATE INDEX IF NOT EXISTS idx_referrals_code ON referrals(referral_code);

-- User referral codes indexes
CREATE INDEX IF NOT EXISTS idx_user_referral_codes_username ON user_referral_codes(username);
CREATE INDEX IF NOT EXISTS idx_user_referral_codes_code ON user_referral_codes(referral_code);
CREATE INDEX IF NOT EXISTS idx_user_referral_codes_active ON user_referral_codes(is_active);

-- Achievements indexes
CREATE INDEX IF NOT EXISTS idx_achievements_category ON achievements(category);
CREATE INDEX IF NOT EXISTS idx_achievements_rarity ON achievements(rarity);
CREATE INDEX IF NOT EXISTS idx_achievements_active ON achievements(is_active);

-- User achievements indexes
CREATE INDEX IF NOT EXISTS idx_user_achievements_username ON user_achievements(username);
CREATE INDEX IF NOT EXISTS idx_user_achievements_achievement_id ON user_achievements(achievement_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_completed ON user_achievements(completed);
CREATE INDEX IF NOT EXISTS idx_user_achievements_username_completed ON user_achievements(username, completed);

-- Reward transactions indexes
CREATE INDEX IF NOT EXISTS idx_reward_transactions_username ON reward_transactions(username);
CREATE INDEX IF NOT EXISTS idx_reward_transactions_type ON reward_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_reward_transactions_created_at ON reward_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reward_transactions_reference ON reward_transactions(reference_type, reference_id);

-- ============================================================================
-- REWARDS SYSTEM FUNCTIONS AND TRIGGERS
-- ============================================================================

-- Function to update user rewards balance
CREATE OR REPLACE FUNCTION update_user_rewards_balance()
RETURNS trigger AS $$
BEGIN
    -- Update the user_rewards table
    INSERT INTO user_rewards (username, total_omni_earned, current_balance)
    VALUES (NEW.username, NEW.amount, NEW.amount)
    ON CONFLICT (username) DO UPDATE SET
        total_omni_earned = user_rewards.total_omni_earned + NEW.amount,
        current_balance = user_rewards.current_balance + NEW.amount,
        updated_at = timezone('utc', now());
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update user rewards when transactions are inserted
DROP TRIGGER IF EXISTS trigger_update_user_rewards_balance ON reward_transactions;
CREATE TRIGGER trigger_update_user_rewards_balance
    AFTER INSERT ON reward_transactions
    FOR EACH ROW
    WHEN (NEW.transaction_type = 'earned' OR NEW.transaction_type = 'bonus' OR NEW.transaction_type = 'referral' OR NEW.transaction_type = 'achievement' OR NEW.transaction_type = 'checkin')
    EXECUTE FUNCTION update_user_rewards_balance();

-- Function to update user streaks
CREATE OR REPLACE FUNCTION update_user_streak()
RETURNS trigger AS $$
DECLARE
    current_streak_count integer;
    longest_streak_count integer;
BEGIN
    -- Get current streak info
    SELECT current_streak, longest_streak INTO current_streak_count, longest_streak_count
    FROM user_streaks
    WHERE username = NEW.username;
    
    -- If no streak record exists, create one
    IF current_streak_count IS NULL THEN
        INSERT INTO user_streaks (username, current_streak, longest_streak, total_checkins, last_checkin_date)
        VALUES (NEW.username, 1, 1, 1, NEW.checkin_date);
    ELSE
        -- Check if this is a consecutive day
        IF NEW.checkin_date = (NEW.checkin_date - interval '1 day')::date THEN
            -- Consecutive day
            current_streak_count := current_streak_count + 1;
        ELSE
            -- Break in streak, reset to 1
            current_streak_count := 1;
        END IF;
        
        -- Update longest streak if current is longer
        IF current_streak_count > longest_streak_count THEN
            longest_streak_count := current_streak_count;
        END IF;
        
        -- Update streak record
        UPDATE user_streaks SET
            current_streak = current_streak_count,
            longest_streak = longest_streak_count,
            total_checkins = total_checkins + 1,
            last_checkin_date = NEW.checkin_date,
            updated_at = timezone('utc', now())
        WHERE username = NEW.username;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update streaks when check-ins are inserted
DROP TRIGGER IF EXISTS trigger_update_user_streak ON daily_checkins;
CREATE TRIGGER trigger_update_user_streak
    AFTER INSERT ON daily_checkins
    FOR EACH ROW
    EXECUTE FUNCTION update_user_streak();

-- Function to complete referral when user completes first transaction
CREATE OR REPLACE FUNCTION complete_referral_on_first_listing()
RETURNS trigger AS $$
BEGIN
    -- Check if this is the user's first listing
    IF (SELECT COUNT(*) FROM listings WHERE username = NEW.username) = 1 THEN
        -- Update referral status to completed
        UPDATE referrals SET
            status = 'completed',
            completed_at = timezone('utc', now())
        WHERE referred_username = NEW.username AND status = 'pending';
        
        -- Award OMNI to both referrer and referred user
        INSERT INTO reward_transactions (username, transaction_type, amount, description, reference_id, reference_type)
        SELECT 
            referrer_username,
            'referral',
            100,
            'Referral bonus for ' || NEW.username,
            id,
            'referral'
        FROM referrals 
        WHERE referred_username = NEW.username AND status = 'completed';
        
        INSERT INTO reward_transactions (username, transaction_type, amount, description, reference_id, reference_type)
        VALUES (
            NEW.username,
            'referral',
            100,
            'Welcome bonus for being referred',
            (SELECT id FROM referrals WHERE referred_username = NEW.username AND status = 'completed'),
            'referral'
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to complete referrals when first listing is created
DROP TRIGGER IF EXISTS trigger_complete_referral_on_first_listing ON listings;
CREATE TRIGGER trigger_complete_referral_on_first_listing
    AFTER INSERT ON listings
    FOR EACH ROW
    EXECUTE FUNCTION complete_referral_on_first_listing();

-- Function to award achievement completion
CREATE OR REPLACE FUNCTION award_achievement_completion()
RETURNS trigger AS $$
BEGIN
    -- If achievement was just completed
    IF NEW.completed = true AND (OLD.completed = false OR OLD.completed IS NULL) THEN
        -- Award OMNI tokens
        INSERT INTO reward_transactions (username, transaction_type, amount, description, reference_id, reference_type)
        VALUES (
            NEW.username,
            'achievement',
            NEW.omni_earned,
            'Achievement completed: ' || (SELECT title FROM achievements WHERE id = NEW.achievement_id),
            NEW.id,
            'achievement'
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to award achievements when completed
DROP TRIGGER IF EXISTS trigger_award_achievement_completion ON user_achievements;
CREATE TRIGGER trigger_award_achievement_completion
    AFTER UPDATE ON user_achievements
    FOR EACH ROW
    EXECUTE FUNCTION award_achievement_completion();

-- ============================================================================
-- CHAT FUNCTIONS
-- ============================================================================

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
    INSERT INTO chats (
        listing_id,
        participant_a,
        participant_b,
        last_message,
        last_sender,
        status
    )
    VALUES (
        ping_record.listing_id,
        ping_record.sender_username,
        ping_record.receiver_username,
        ping_record.message,
        ping_record.sender_username,
        'active'
    )
    RETURNING id INTO new_chat_id;
    
    -- Add the ping message to the new chat
    INSERT INTO messages (chat_id, sender_username, text)
    VALUES (new_chat_id, ping_record.sender_username, ping_record.message);
    
    -- Update ping status to accepted (since chat is created)
    UPDATE pings 
    SET status = 'accepted', responded_at = NOW()
    WHERE id = ping_id;
    
    RETURN new_chat_id::text;
END;
$$ LANGUAGE plpgsql;

-- Function to get or create chat for two users and a listing
CREATE OR REPLACE FUNCTION get_or_create_chat(
    listing_id_param uuid,
    user1_param text,
    user2_param text
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
        (participant_a = user1_param AND participant_b = user2_param)
        OR (participant_a = user2_param AND participant_b = user1_param)
    );
    
    -- If chat exists, return existing chat ID
    IF existing_chat_id IS NOT NULL THEN
        RETURN existing_chat_id;
    END IF;
    
    -- Create new chat
    INSERT INTO chats (
        listing_id,
        participant_a,
        participant_b,
        status
    )
    VALUES (
        listing_id_param,
        user1_param,
        user2_param,
        'active'
    )
    RETURNING id INTO new_chat_id;
    
    RETURN new_chat_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get messages for a chat
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

-- Function to send a message in a chat
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
    
    -- Update chat with last message info
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
-- UPDATED FUNCTIONS WITH ALL FEATURES
-- ============================================================================

-- Drop existing function first
DROP FUNCTION IF EXISTS get_listings_with_distance(double precision, double precision, integer, integer, integer);

-- Update the get_listings_with_distance function to include all features
CREATE OR REPLACE FUNCTION get_listings_with_distance(
    user_lat double precision,
    user_lng double precision,
    page_num integer DEFAULT 1,
    page_size integer DEFAULT 20,
    max_distance_km integer DEFAULT 1000
)
RETURNS TABLE(
    id uuid,
    title text,
    description text,
    price numeric,
    price_unit text,
    category text,
    images text[],
    thumbnail_images text[],
    preview_images text[],
    is_active boolean,
    username text,
    latitude double precision,
    longitude double precision,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    distance_km double precision,
    image_count integer,
    has_images boolean,
    expires_at timestamp with time zone,
    extension_count integer,
    days_until_expiry integer
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        l.id,
        l.title,
        l.description,
        l.price,
        l.price_unit,
        l.category,
        l.images,
        l.thumbnail_images,
        l.preview_images,
        l.is_active,
        l.username,
        l.latitude,
        l.longitude,
        l.created_at,
        l.updated_at,
        ST_Distance(
            l.location::geography,
            ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography
        ) / 1000 as distance_km,
        array_length(l.images, 1) as image_count,
        array_length(l.images, 1) > 0 as has_images,
        l.expires_at,
        l.extension_count,
        EXTRACT(DAY FROM (l.expires_at - now()))::integer as days_until_expiry
    FROM listings l
    WHERE l.is_active = true
    AND l.expires_at > now()
    AND l.latitude IS NOT NULL 
    AND l.longitude IS NOT NULL
    AND ST_Distance(
        l.location::geography,
        ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography
    ) <= (max_distance_km * 1000)
    ORDER BY distance_km ASC, l.created_at DESC
    LIMIT page_size
    OFFSET (page_num - 1) * page_size;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- REWARDS SYSTEM SEED DATA
-- ============================================================================

-- Insert default achievements
INSERT INTO achievements (id, title, description, icon, category, max_progress, omni_reward, rarity) VALUES
    ('welcome_bonus', 'Welcome Bonus', 'Join the marketplace and get started', 'Gift', 'special', 1, 50, 'common'),
    ('early_adopter', 'Early Adopter', 'Join during the first month of launch', 'Sparkles', 'special', 1, 1000, 'legendary'),
    ('first_sale', 'First Sale', 'Complete your first sale', 'ShoppingBag', 'sales', 1, 50, 'common'),
    ('sales_master', 'Sales Master', 'Complete 10 sales', 'Trophy', 'sales', 10, 200, 'rare'),
    ('social_butterfly', 'Social Butterfly', 'Send 20 messages', 'MessageCircle', 'social', 20, 100, 'common'),
    ('power_user', 'Power User', 'Use the app for 7 consecutive days', 'Flame', 'engagement', 7, 150, 'rare'),
    ('loyal_user', 'Loyal User', 'Use the app for 30 consecutive days', 'Crown', 'engagement', 30, 500, 'epic'),
    ('local_expert', 'Local Expert', 'List items in 3 different categories', 'MapPin', 'engagement', 3, 150, 'rare'),
    ('quick_responder', 'Quick Responder', 'Respond to messages within 1 hour', 'Phone', 'engagement', 10, 125, 'rare'),
    ('trend_setter', 'Trend Setter', 'Have a listing viewed 100+ times', 'TrendingUp', 'milestone', 100, 300, 'epic'),
    ('check_in_champion', 'Check-in Champion', 'Check in for 7 consecutive days', 'Flame', 'milestone', 7, 250, 'rare'),
    ('referral_king', 'Referral King', 'Refer 5 friends successfully', 'Crown', 'milestone', 5, 500, 'epic'),
    ('perfect_seller', 'Perfect Seller', 'Maintain 5-star rating for 10 sales', 'Star', 'special', 10, 750, 'legendary')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON COLUMN listings.price_unit IS 'Pricing unit for the listing (e.g., per_kg, per_hour, per_piece)';
COMMENT ON COLUMN listings.expires_at IS 'Date when the listing automatically expires and becomes inactive';
COMMENT ON COLUMN listings.extension_count IS 'Number of times the listing has been extended (for tracking purposes)';

COMMENT ON TABLE user_rewards IS 'Tracks user OMNI token balances and earnings';
COMMENT ON TABLE daily_checkins IS 'Records daily check-ins for streak tracking';
COMMENT ON TABLE user_streaks IS 'Tracks user check-in streaks and statistics';
COMMENT ON TABLE referrals IS 'Tracks referral relationships between users';
COMMENT ON TABLE user_referral_codes IS 'Stores unique referral codes for each user';
COMMENT ON TABLE achievements IS 'Master list of all available achievements';
COMMENT ON TABLE user_achievements IS 'Tracks user progress on achievements';
COMMENT ON TABLE reward_transactions IS 'Audit trail of all reward transactions';

COMMENT ON FUNCTION update_user_rewards_balance() IS 'Updates user reward balance when transactions are added';
COMMENT ON FUNCTION update_user_streak() IS 'Updates user streak information when check-ins are recorded';
COMMENT ON FUNCTION complete_referral_on_first_listing() IS 'Completes referral when user creates first listing';
COMMENT ON FUNCTION award_achievement_completion() IS 'Awards OMNI tokens when achievements are completed';
COMMENT ON FUNCTION validate_price_unit(text, text) IS 'Validates price unit against category';
COMMENT ON FUNCTION cleanup_expired_listings() IS 'Automatically cleans up expired listings';
COMMENT ON FUNCTION extend_listing_expiration(uuid, integer) IS 'Extends listing expiration date';
COMMENT ON FUNCTION create_listing_with_expiration(text, text, text, numeric, text, text[], double precision, double precision, integer) IS 'Creates listing with automatic expiration';
COMMENT ON FUNCTION get_chats_for_user(text) IS 'Gets all chats for a user with participant information';
COMMENT ON FUNCTION create_chat_from_ping(uuid) IS 'Creates or finds chat from ping interaction';
COMMENT ON FUNCTION get_or_create_chat(uuid, text, text) IS 'Gets existing chat or creates new one for users and listing';
COMMENT ON FUNCTION get_chat_messages(uuid) IS 'Gets all messages for a chat with sender information';
COMMENT ON FUNCTION send_chat_message(uuid, text, text) IS 'Sends message in chat and updates chat metadata';

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify all tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
    'user_rewards', 'daily_checkins', 'user_streaks', 'referrals', 
    'user_referral_codes', 'achievements', 'user_achievements', 'reward_transactions'
)
ORDER BY table_name;

-- Verify all functions exist
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_type = 'FUNCTION'
AND routine_name IN (
    'update_user_rewards_balance',
    'update_user_streak',
    'complete_referral_on_first_listing',
    'award_achievement_completion',
    'validate_price_unit',
    'validate_listing_price_unit',
    'cleanup_expired_listings',
    'extend_listing_expiration',
    'create_listing_with_expiration',
    'get_listing_expiration_status',
    'get_chats_for_user',
    'create_chat_from_ping',
    'get_or_create_chat',
    'get_chat_messages',
    'send_chat_message',
    'get_listings_with_distance'
)
ORDER BY routine_name;

-- Verify columns were added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'listings' 
AND column_name IN ('price_unit', 'expires_at', 'extension_count')
ORDER BY column_name;

SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name IN ('notification_new_messages', 'notification_listing_updates', 'notification_marketing_emails')
ORDER BY column_name; 