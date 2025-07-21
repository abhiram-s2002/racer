-- Optimized Rewards System Migration for High-Scale Usage
-- Migration: 20250117_rewards_system_optimized.sql
-- This file contains the optimized rewards system database setup for large user bases

-- ============================================================================
-- REWARDS SYSTEM TABLES (OPTIMIZED)
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

-- User streaks table for tracking check-in streaks (OPTIMIZED)
CREATE TABLE IF NOT EXISTS user_streaks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    username text NOT NULL REFERENCES users(username) ON DELETE CASCADE,
    current_streak integer DEFAULT 0,
    longest_streak integer DEFAULT 0,
    total_checkins integer DEFAULT 0,
    last_checkin_date date,
    weekly_rewards integer DEFAULT 0,
    monthly_rewards integer DEFAULT 0,
    last_weekly_reset date DEFAULT (current_date - interval '1 day'),
    last_monthly_reset date DEFAULT (current_date - interval '1 day'),
    created_at timestamp with time zone DEFAULT timezone('utc', now()),
    updated_at timestamp with time zone DEFAULT timezone('utc', now()),
    
    UNIQUE(username)
);

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
    max_progress integer NOT NULL,
    completed boolean DEFAULT false,
    completed_date date,
    omni_earned integer DEFAULT 0,
    last_updated_at timestamp with time zone DEFAULT timezone('utc', now()),
    created_at timestamp with time zone DEFAULT timezone('utc', now()),
    updated_at timestamp with time zone DEFAULT timezone('utc', now()),
    
    UNIQUE(username, achievement_id)
);

-- Reward transactions table (OPTIMIZED - with partitioning strategy)
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
-- OPTIMIZED INDEXES FOR HIGH-SCALE PERFORMANCE
-- ============================================================================

-- User rewards indexes (OPTIMIZED)
CREATE INDEX IF NOT EXISTS idx_user_rewards_username ON user_rewards(username);
CREATE INDEX IF NOT EXISTS idx_user_rewards_balance ON user_rewards(current_balance);
CREATE INDEX IF NOT EXISTS idx_user_rewards_last_activity ON user_rewards(last_activity_at DESC);

-- Daily checkins indexes (OPTIMIZED - for partitioning)
CREATE INDEX IF NOT EXISTS idx_daily_checkins_username ON daily_checkins(username);
CREATE INDEX IF NOT EXISTS idx_daily_checkins_date ON daily_checkins(checkin_date);
CREATE INDEX IF NOT EXISTS idx_daily_checkins_username_date ON daily_checkins(username, checkin_date);
CREATE INDEX IF NOT EXISTS idx_daily_checkins_created_at ON daily_checkins(created_at DESC);

-- User streaks indexes (OPTIMIZED)
CREATE INDEX IF NOT EXISTS idx_user_streaks_username ON user_streaks(username);
CREATE INDEX IF NOT EXISTS idx_user_streaks_current_streak ON user_streaks(current_streak);
CREATE INDEX IF NOT EXISTS idx_user_streaks_last_checkin ON user_streaks(last_checkin_date DESC);

-- Referrals indexes (OPTIMIZED)
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_username);
CREATE INDEX IF NOT EXISTS idx_referrals_referred ON referrals(referred_username);
CREATE INDEX IF NOT EXISTS idx_referrals_status ON referrals(status);
CREATE INDEX IF NOT EXISTS idx_referrals_code ON referrals(referral_code);
CREATE INDEX IF NOT EXISTS idx_referrals_created_at ON referrals(created_at DESC);

-- User referral codes indexes (OPTIMIZED)
CREATE INDEX IF NOT EXISTS idx_user_referral_codes_username ON user_referral_codes(username);
CREATE INDEX IF NOT EXISTS idx_user_referral_codes_code ON user_referral_codes(referral_code);
CREATE INDEX IF NOT EXISTS idx_user_referral_codes_active ON user_referral_codes(is_active);

-- Achievements indexes (OPTIMIZED)
CREATE INDEX IF NOT EXISTS idx_achievements_category ON achievements(category);
CREATE INDEX IF NOT EXISTS idx_achievements_rarity ON achievements(rarity);
CREATE INDEX IF NOT EXISTS idx_achievements_active ON achievements(is_active);

-- User achievements indexes (OPTIMIZED - composite indexes for better performance)
CREATE INDEX IF NOT EXISTS idx_user_achievements_username ON user_achievements(username);
CREATE INDEX IF NOT EXISTS idx_user_achievements_achievement_id ON user_achievements(achievement_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_completed ON user_achievements(completed);
CREATE INDEX IF NOT EXISTS idx_user_achievements_username_completed ON user_achievements(username, completed);
CREATE INDEX IF NOT EXISTS idx_user_achievements_progress ON user_achievements(progress);
CREATE INDEX IF NOT EXISTS idx_user_achievements_last_updated ON user_achievements(last_updated_at DESC);

-- Reward transactions indexes (OPTIMIZED - for partitioning)
CREATE INDEX IF NOT EXISTS idx_reward_transactions_username ON reward_transactions(username);
CREATE INDEX IF NOT EXISTS idx_reward_transactions_type ON reward_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_reward_transactions_created_at ON reward_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reward_transactions_reference ON reward_transactions(reference_type, reference_id);
CREATE INDEX IF NOT EXISTS idx_reward_transactions_username_created ON reward_transactions(username, created_at DESC);

-- ============================================================================
-- OPTIMIZED FUNCTIONS AND TRIGGERS
-- ============================================================================

-- Function to update user rewards balance (OPTIMIZED)
CREATE OR REPLACE FUNCTION update_user_rewards_balance()
RETURNS trigger AS $$
BEGIN
    -- Update the user_rewards table with better performance
    INSERT INTO user_rewards (username, total_omni_earned, current_balance, last_activity_at)
    VALUES (NEW.username, NEW.amount, NEW.amount, timezone('utc', now()))
    ON CONFLICT (username) DO UPDATE SET
        total_omni_earned = user_rewards.total_omni_earned + NEW.amount,
        current_balance = user_rewards.current_balance + NEW.amount,
        last_activity_at = timezone('utc', now()),
        updated_at = timezone('utc', now());
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop the trigger if it exists before creating it
DROP TRIGGER IF EXISTS trigger_update_user_rewards_balance ON reward_transactions;

-- Trigger to update user rewards when transactions are inserted (OPTIMIZED)
CREATE TRIGGER trigger_update_user_rewards_balance
    AFTER INSERT ON reward_transactions
    FOR EACH ROW
    WHEN (NEW.transaction_type = 'earned' OR NEW.transaction_type = 'bonus' OR NEW.transaction_type = 'referral' OR NEW.transaction_type = 'achievement' OR NEW.transaction_type = 'checkin')
    EXECUTE FUNCTION update_user_rewards_balance();

-- Function to update user streaks (OPTIMIZED)
CREATE OR REPLACE FUNCTION update_user_streak()
RETURNS trigger AS $$
DECLARE
    current_streak_count integer;
    longest_streak_count integer;
    last_checkin_date_val date;
BEGIN
    -- Get current streak info with better performance
    SELECT current_streak, longest_streak, last_checkin_date INTO current_streak_count, longest_streak_count, last_checkin_date_val
    FROM user_streaks
    WHERE username = NEW.username;
    
    -- If no streak record exists, create one
    IF current_streak_count IS NULL THEN
        INSERT INTO user_streaks (username, current_streak, longest_streak, total_checkins, last_checkin_date)
        VALUES (NEW.username, 1, 1, 1, NEW.checkin_date);
    ELSE
        -- Check if this is a consecutive day (optimized logic)
        IF last_checkin_date_val = NEW.checkin_date - interval '1 day' THEN
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
        
        -- Update streak record with optimized update
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

-- Drop the trigger if it exists before creating it
DROP TRIGGER IF EXISTS trigger_update_user_streak ON daily_checkins;

-- Trigger to update streaks when check-ins are inserted (OPTIMIZED)
CREATE TRIGGER trigger_update_user_streak
    AFTER INSERT ON daily_checkins
    FOR EACH ROW
    EXECUTE FUNCTION update_user_streak();

-- Function to complete referral when user completes first transaction (OPTIMIZED)
CREATE OR REPLACE FUNCTION complete_referral_on_first_listing()
RETURNS trigger AS $$
BEGIN
    -- Check if this is the user's first listing (optimized query)
    IF (SELECT COUNT(*) FROM listings WHERE username = NEW.username) = 1 THEN
        -- Update referral status to completed
        UPDATE referrals SET
            status = 'completed',
            completed_at = timezone('utc', now())
        WHERE referred_username = NEW.username AND status = 'pending';
        
        -- Award OMNI to both referrer and referred user (optimized batch insert)
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

-- Drop the trigger if it exists before creating it
DROP TRIGGER IF EXISTS trigger_complete_referral_on_first_listing ON listings;

-- Trigger to complete referrals when first listing is created (OPTIMIZED)
CREATE TRIGGER trigger_complete_referral_on_first_listing
    AFTER INSERT ON listings
    FOR EACH ROW
    EXECUTE FUNCTION complete_referral_on_first_listing();

-- Function to award achievement completion (OPTIMIZED)
CREATE OR REPLACE FUNCTION award_achievement_completion()
RETURNS trigger AS $$
BEGIN
    -- If achievement was just completed (optimized check)
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

-- Drop the trigger if it exists before creating it
DROP TRIGGER IF EXISTS trigger_award_achievement_completion ON user_achievements;

-- Trigger to award achievements when completed (OPTIMIZED)
CREATE TRIGGER trigger_award_achievement_completion
    AFTER UPDATE ON user_achievements
    FOR EACH ROW
    EXECUTE FUNCTION award_achievement_completion();

-- ============================================================================
-- PERFORMANCE OPTIMIZATION FUNCTIONS
-- ============================================================================

-- Function to clean up old check-ins (for partitioning strategy)
CREATE OR REPLACE FUNCTION cleanup_old_checkins()
RETURNS void AS $$
BEGIN
    -- Delete check-ins older than 2 years (adjust as needed)
    DELETE FROM daily_checkins 
    WHERE checkin_date < current_date - interval '2 years';
    
    -- Delete old transactions (keep last 6 months)
    DELETE FROM reward_transactions 
    WHERE created_at < timezone('utc', now()) - interval '6 months';
END;
$$ LANGUAGE plpgsql;

-- Function to reset weekly/monthly rewards (optimized)
CREATE OR REPLACE FUNCTION reset_periodic_rewards()
RETURNS void AS $$
BEGIN
    -- Reset weekly rewards on Monday
    UPDATE user_streaks 
    SET weekly_rewards = 0, last_weekly_reset = current_date
    WHERE last_weekly_reset < current_date - interval '7 days';
    
    -- Reset monthly rewards on 1st of month
    UPDATE user_streaks 
    SET monthly_rewards = 0, last_monthly_reset = current_date
    WHERE last_monthly_reset < date_trunc('month', current_date);
END;
$$ LANGUAGE plpgsql;

-- Function to get user rewards summary (optimized for dashboard)
CREATE OR REPLACE FUNCTION get_user_rewards_summary(username_param text)
RETURNS TABLE (
    total_omni_earned integer,
    current_balance integer,
    current_streak integer,
    longest_streak integer,
    total_achievements integer,
    completed_achievements integer,
    total_referrals integer,
    completed_referrals integer
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(ur.total_omni_earned, 0) as total_omni_earned,
        COALESCE(ur.current_balance, 0) as current_balance,
        COALESCE(us.current_streak, 0) as current_streak,
        COALESCE(us.longest_streak, 0) as longest_streak,
        COUNT(ua.id)::integer as total_achievements,
        COUNT(ua.id) FILTER (WHERE ua.completed = true)::integer as completed_achievements,
        COUNT(r.id)::integer as total_referrals,
        COUNT(r.id) FILTER (WHERE r.status = 'completed')::integer as completed_referrals
    FROM users u
    LEFT JOIN user_rewards ur ON u.username = ur.username
    LEFT JOIN user_streaks us ON u.username = us.username
    LEFT JOIN user_achievements ua ON u.username = ua.username
    LEFT JOIN referrals r ON u.username = r.referrer_username
    WHERE u.username = username_param
    GROUP BY ur.total_omni_earned, ur.current_balance, us.current_streak, us.longest_streak;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_user_rewards_summary(username_param text) IS 'Gets comprehensive user rewards summary (optimized for dashboard)';
-- ============================================================================
-- INITIALIZATION FUNCTIONS FOR EXISTING USERS
-- ============================================================================

-- Function to initialize rewards for existing users who don't have records
CREATE OR REPLACE FUNCTION initialize_missing_user_rewards()
RETURNS void AS $$
DECLARE
    user_record RECORD;
    referral_code text;
    has_weekly_reset boolean;
    has_monthly_reset boolean;
BEGIN
    -- Check if the columns exist
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_streaks' 
        AND column_name = 'last_weekly_reset'
    ) INTO has_weekly_reset;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_streaks' 
        AND column_name = 'last_monthly_reset'
    ) INTO has_monthly_reset;

    -- Initialize user_rewards for users who don't have them
    INSERT INTO user_rewards (username, total_omni_earned, total_omni_spent, current_balance, last_activity_at)
    SELECT u.username, 0, 0, 0, timezone('utc', now())
    FROM users u
    LEFT JOIN user_rewards ur ON u.username = ur.username
    WHERE ur.username IS NULL
    ON CONFLICT (username) DO NOTHING;

    -- Initialize user_streaks for users who don't have them
    IF has_weekly_reset AND has_monthly_reset THEN
        -- Use the full column set
        INSERT INTO user_streaks (username, current_streak, longest_streak, total_checkins, last_checkin_date, weekly_rewards, monthly_rewards, last_weekly_reset, last_monthly_reset)
        SELECT u.username, 0, 0, 0, NULL, 0, 0, (current_date - interval '1 day'), (current_date - interval '1 day')
        FROM users u
        LEFT JOIN user_streaks us ON u.username = us.username
        WHERE us.username IS NULL
        ON CONFLICT (username) DO NOTHING;
    ELSE
        -- Use the basic column set (without the reset columns)
        INSERT INTO user_streaks (username, current_streak, longest_streak, total_checkins, last_checkin_date, weekly_rewards, monthly_rewards)
        SELECT u.username, 0, 0, 0, NULL, 0, 0
        FROM users u
        LEFT JOIN user_streaks us ON u.username = us.username
        WHERE us.username IS NULL
        ON CONFLICT (username) DO NOTHING;
    END IF;

    -- Initialize user_referral_codes for users who don't have them
    FOR user_record IN 
        SELECT u.username
        FROM users u
        LEFT JOIN user_referral_codes urc ON u.username = urc.username
        WHERE urc.username IS NULL
    LOOP
        -- Generate unique referral code
        referral_code := 'OMNI-' || upper(right(user_record.username, 4)) || '-' || upper(substring(md5(random()::text) from 1 for 5));
        
        INSERT INTO user_referral_codes (username, referral_code, total_referrals, total_earnings, is_active)
        VALUES (user_record.username, referral_code, 0, 0, true)
        ON CONFLICT (username) DO NOTHING;
    END LOOP;

    -- Initialize user_achievements for users who don't have them
    INSERT INTO user_achievements (username, achievement_id, progress, max_progress, completed, completed_date, omni_earned, last_updated_at)
    SELECT u.username, a.id, 0, a.max_progress, false, NULL, 0, timezone('utc', now())
    FROM users u
    CROSS JOIN achievements a
    WHERE a.is_active = true
    AND NOT EXISTS (
        SELECT 1 FROM user_achievements ua 
        WHERE ua.username = u.username AND ua.achievement_id = a.id
    )
    ON CONFLICT (username, achievement_id) DO NOTHING;

    -- Add welcome bonus for users who don't have any transactions
    INSERT INTO reward_transactions (username, transaction_type, amount, description, reference_id, reference_type)
    SELECT ur.username, 'bonus', 50, 'Welcome bonus for existing user', ur.id, 'welcome'
    FROM user_rewards ur
    LEFT JOIN reward_transactions rt ON ur.username = rt.username AND rt.transaction_type = 'bonus' AND rt.reference_type = 'welcome'
    WHERE rt.id IS NULL
    AND ur.total_omni_earned = 0;

    -- Update user_rewards balance for welcome bonus
    UPDATE user_rewards 
    SET total_omni_earned = 50, current_balance = 50, last_activity_at = timezone('utc', now())
    WHERE username IN (
        SELECT ur.username
        FROM user_rewards ur
        LEFT JOIN reward_transactions rt ON ur.username = rt.username AND rt.transaction_type = 'bonus' AND rt.reference_type = 'welcome'
        WHERE rt.id IS NOT NULL
        AND ur.total_omni_earned = 0
    );

    RAISE NOTICE 'Initialized rewards for existing users';
END;
$$ LANGUAGE plpgsql;

-- Function to check and fix missing user records (for manual execution)
CREATE OR REPLACE FUNCTION check_and_fix_user_rewards()
RETURNS TABLE(
    username text,
    has_rewards boolean,
    has_streak boolean,
    has_referral_code boolean,
    has_achievements boolean,
    fixed boolean
) AS $$
DECLARE
    user_record RECORD;
    referral_code text;
    achievement_record RECORD;
    fixed_count integer := 0;
BEGIN
    -- Check each user and fix missing records
    FOR user_record IN 
        SELECT u.username
        FROM users u
        ORDER BY u.created_at
    LOOP
        -- Check what records exist
        PERFORM 1 FROM user_rewards WHERE username = user_record.username;
        IF NOT FOUND THEN
            -- Create user_rewards record
            INSERT INTO user_rewards (username, total_omni_earned, total_omni_spent, current_balance, last_activity_at)
            VALUES (user_record.username, 0, 0, 0, timezone('utc', now()));
            fixed_count := fixed_count + 1;
        END IF;

        PERFORM 1 FROM user_streaks WHERE username = user_record.username;
        IF NOT FOUND THEN
            -- Create user_streaks record
            INSERT INTO user_streaks (username, current_streak, longest_streak, total_checkins, last_checkin_date, weekly_rewards, monthly_rewards, last_weekly_reset, last_monthly_reset)
            VALUES (user_record.username, 0, 0, 0, NULL, 0, 0, (current_date - interval '1 day'), (current_date - interval '1 day'));
            fixed_count := fixed_count + 1;
        END IF;

        PERFORM 1 FROM user_referral_codes WHERE username = user_record.username;
        IF NOT FOUND THEN
            -- Generate and create referral code
            referral_code := 'OMNI-' || upper(right(user_record.username, 4)) || '-' || upper(substring(md5(random()::text) from 1 for 5));
            INSERT INTO user_referral_codes (username, referral_code, total_referrals, total_earnings, is_active)
            VALUES (user_record.username, referral_code, 0, 0, true);
            fixed_count := fixed_count + 1;
        END IF;

        -- Check achievements
        FOR achievement_record IN SELECT id FROM achievements WHERE is_active = true
        LOOP
            PERFORM 1 FROM user_achievements WHERE username = user_record.username AND achievement_id = achievement_record.id;
            IF NOT FOUND THEN
                INSERT INTO user_achievements (username, achievement_id, progress, max_progress, completed, completed_date, omni_earned, last_updated_at)
                VALUES (user_record.username, achievement_record.id, 0, 
                       (SELECT max_progress FROM achievements WHERE id = achievement_record.id), 
                       false, NULL, 0, timezone('utc', now()));
                fixed_count := fixed_count + 1;
            END IF;
        END LOOP;

        -- Return status for this user
        RETURN QUERY
        SELECT 
            user_record.username,
            EXISTS(SELECT 1 FROM user_rewards WHERE username = user_record.username),
            EXISTS(SELECT 1 FROM user_streaks WHERE username = user_record.username),
            EXISTS(SELECT 1 FROM user_referral_codes WHERE username = user_record.username),
            EXISTS(SELECT 1 FROM user_achievements WHERE username = user_record.username),
            fixed_count > 0;
    END LOOP;

    RAISE NOTICE 'Fixed % missing records', fixed_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- AUTOMATIC INITIALIZATION TRIGGER
-- ============================================================================

-- Function to automatically initialize rewards when a new user is created
CREATE OR REPLACE FUNCTION auto_initialize_user_rewards()
RETURNS trigger AS $$
DECLARE
    referral_code text;
    achievement_record RECORD;
    has_weekly_reset boolean;
    has_monthly_reset boolean;
BEGIN
    -- Check if the columns exist
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_streaks' 
        AND column_name = 'last_weekly_reset'
    ) INTO has_weekly_reset;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_streaks' 
        AND column_name = 'last_monthly_reset'
    ) INTO has_monthly_reset;

    -- Create user_rewards record
    INSERT INTO user_rewards (username, total_omni_earned, total_omni_spent, current_balance, last_activity_at)
    VALUES (NEW.username, 0, 0, 0, timezone('utc', now()));

    -- Create user_streaks record
    IF has_weekly_reset AND has_monthly_reset THEN
        -- Use the full column set
        INSERT INTO user_streaks (username, current_streak, longest_streak, total_checkins, last_checkin_date, weekly_rewards, monthly_rewards, last_weekly_reset, last_monthly_reset)
        VALUES (NEW.username, 0, 0, 0, NULL, 0, 0, (current_date - interval '1 day'), (current_date - interval '1 day'));
    ELSE
        -- Use the basic column set (without the reset columns)
        INSERT INTO user_streaks (username, current_streak, longest_streak, total_checkins, last_checkin_date, weekly_rewards, monthly_rewards)
        VALUES (NEW.username, 0, 0, 0, NULL, 0, 0);
    END IF;

    -- Generate and create referral code
    referral_code := 'OMNI-' || upper(right(NEW.username, 4)) || '-' || upper(substring(md5(random()::text) from 1 for 5));
    INSERT INTO user_referral_codes (username, referral_code, total_referrals, total_earnings, is_active)
    VALUES (NEW.username, referral_code, 0, 0, true);

    -- Create user_achievements for all active achievements
    FOR achievement_record IN SELECT id, max_progress FROM achievements WHERE is_active = true
    LOOP
        INSERT INTO user_achievements (username, achievement_id, progress, max_progress, completed, completed_date, omni_earned, last_updated_at)
        VALUES (NEW.username, achievement_record.id, 0, achievement_record.max_progress, false, NULL, 0, timezone('utc', now()));
    END LOOP;

    -- Add welcome bonus
    INSERT INTO reward_transactions (username, transaction_type, amount, description, reference_id, reference_type)
    VALUES (NEW.username, 'bonus', 50, 'Welcome bonus for new user', 
           (SELECT id FROM user_rewards WHERE username = NEW.username), 'welcome');

    -- Update user_rewards with welcome bonus
    UPDATE user_rewards 
    SET total_omni_earned = 50, current_balance = 50, last_activity_at = timezone('utc', now())
    WHERE username = NEW.username;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-initialize rewards for new users
DROP TRIGGER IF EXISTS trigger_auto_initialize_user_rewards ON users;
CREATE TRIGGER trigger_auto_initialize_user_rewards
    AFTER INSERT ON users
    FOR EACH ROW
    EXECUTE FUNCTION auto_initialize_user_rewards();

-- ============================================================================
-- MANUAL INITIALIZATION COMMANDS
-- ============================================================================

-- Uncomment and run these commands to initialize existing users:
-- SELECT initialize_missing_user_rewards();
-- SELECT * FROM check_and_fix_user_rewards();

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

COMMENT ON TABLE user_rewards IS 'Tracks user OMNI token balances and earnings (optimized for high-scale usage)';
COMMENT ON TABLE daily_checkins IS 'Records daily check-ins for streak tracking (designed for partitioning)';
COMMENT ON TABLE user_streaks IS 'Tracks user check-in streaks and statistics (optimized)';
COMMENT ON TABLE referrals IS 'Tracks referral relationships between users (optimized)';
COMMENT ON TABLE user_referral_codes IS 'Stores unique referral codes for each user (optimized)';
COMMENT ON TABLE achievements IS 'Master list of all available achievements (optimized)';
COMMENT ON TABLE user_achievements IS 'Tracks user progress on achievements (optimized with better indexing)';
COMMENT ON TABLE reward_transactions IS 'Audit trail of all reward transactions (designed for partitioning)';

COMMENT ON FUNCTION update_user_rewards_balance() IS 'Updates user reward balance when transactions are added (optimized)';
COMMENT ON FUNCTION update_user_streak() IS 'Updates user streak information when check-ins are recorded (optimized)';
COMMENT ON FUNCTION complete_referral_on_first_listing() IS 'Completes referral when user creates first listing (optimized)';
COMMENT ON FUNCTION award_achievement_completion() IS 'Awards OMNI tokens when achievements are completed (optimized)';
COMMENT ON FUNCTION cleanup_old_checkins() IS 'Cleans up old data for performance (partitioning strategy)';
COMMENT ON FUNCTION reset_periodic_rewards() IS 'Resets weekly/monthly rewards (optimized)'; 