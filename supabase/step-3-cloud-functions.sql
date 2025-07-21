-- Step 3: Deploy Cloud Functions
-- Run this in your Supabase SQL Editor after Step 2

-- ============================================================================
-- CLOUD FUNCTIONS DEPLOYMENT
-- ============================================================================

-- Copy the entire content from your cloud-functions.sql file here
-- This includes all the functions for:
-- - Price unit validation
-- - Listing expiration management
-- - Rewards system
-- - Chat functions
-- - Triggers

-- For now, let's deploy the essential functions:

-- ============================================================================
-- PRICE UNIT VALIDATION FUNCTIONS
-- ============================================================================

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
-- REWARDS SYSTEM FUNCTIONS
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

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Trigger to update user rewards when transactions are inserted
DROP TRIGGER IF EXISTS trigger_update_user_rewards_balance ON reward_transactions;
CREATE TRIGGER trigger_update_user_rewards_balance
    AFTER INSERT ON reward_transactions
    FOR EACH ROW
    WHEN (NEW.transaction_type = 'earned' OR NEW.transaction_type = 'bonus' OR NEW.transaction_type = 'referral' OR NEW.transaction_type = 'achievement' OR NEW.transaction_type = 'checkin')
    EXECUTE FUNCTION update_user_rewards_balance();

-- Trigger to update streaks when check-ins are inserted
DROP TRIGGER IF EXISTS trigger_update_user_streak ON daily_checkins;
CREATE TRIGGER trigger_update_user_streak
    AFTER INSERT ON daily_checkins
    FOR EACH ROW
    EXECUTE FUNCTION update_user_streak();

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Check that functions were created successfully
SELECT 
    routine_name,
    routine_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('validate_price_unit', 'validate_listing_price_unit', 'update_user_rewards_balance', 'update_user_streak')
ORDER BY routine_name;

-- Check that triggers were created successfully
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table
FROM information_schema.triggers 
WHERE trigger_schema = 'public' 
AND trigger_name IN ('trigger_validate_price_unit', 'trigger_update_user_rewards_balance', 'trigger_update_user_streak')
ORDER BY trigger_name; 