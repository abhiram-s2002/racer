-- Rewards System Migration
-- Migration: 20250117_rewards_system.sql
-- This file contains the complete rewards system database setup

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
-- INDEXES FOR PERFORMANCE
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
-- FUNCTIONS AND TRIGGERS
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
CREATE TRIGGER trigger_award_achievement_completion
    AFTER UPDATE ON user_achievements
    FOR EACH ROW
    EXECUTE FUNCTION award_achievement_completion();

-- ============================================================================
-- SEED DATA
-- ============================================================================

-- Insert default achievements
INSERT INTO achievements (id, title, description, icon, category, max_progress, omni_reward, rarity) VALUES
    ('first_sale', 'First Sale', 'Complete your first sale', 'ShoppingBag', 'sales', 1, 50, 'common'),
    ('sales_master', 'Sales Master', 'Complete 10 sales', 'Trophy', 'sales', 10, 200, 'rare'),
    ('social_butterfly', 'Social Butterfly', 'Send 20 messages', 'MessageCircle', 'social', 20, 100, 'common'),
    
    ('local_expert', 'Local Expert', 'List items in 3 different categories', 'MapPin', 'engagement', 3, 150, 'rare'),
    ('quick_responder', 'Quick Responder', 'Respond to messages within 1 hour', 'Phone', 'engagement', 10, 125, 'rare'),
    ('trend_setter', 'Trend Setter', 'Have a listing viewed 100+ times', 'TrendingUp', 'milestone', 100, 300, 'epic'),
    ('check_in_champion', 'Check-in Champion', 'Check in for 7 consecutive days', 'Flame', 'milestone', 7, 250, 'rare'),
    ('referral_king', 'Referral King', 'Refer 5 friends successfully', 'Crown', 'milestone', 5, 500, 'epic'),
    ('early_adopter', 'Early Adopter', 'Join during the first month of launch', 'Sparkles', 'special', 1, 1000, 'legendary'),
    ('perfect_seller', 'Perfect Seller', 'Maintain 5-star rating for 10 sales', 'Star', 'special', 10, 750, 'legendary')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- COMMENTS
-- ============================================================================

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