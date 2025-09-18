-- Quick OMNI Points Addition for 'raman sjddhh'
-- Run this directly in Supabase SQL Editor

-- Add 1500 OMNI points to 'raman sjddhh'
DO $$
DECLARE
    target_username text := 'raman sjddhh';
    omni_amount integer := 1500;
    user_current_balance integer;
    new_balance integer;
BEGIN
    -- Get or create user rewards record
    INSERT INTO user_rewards (username, current_balance, total_omni_earned, total_omni_spent)
    VALUES (target_username, 0, 0, 0)
    ON CONFLICT (username) DO NOTHING;
    
    -- Get current balance
    SELECT current_balance INTO user_current_balance
    FROM user_rewards
    WHERE username = target_username;
    
    -- Calculate new balance
    new_balance := user_current_balance + omni_amount;
    
    -- Update user rewards
    UPDATE user_rewards
    SET 
        current_balance = new_balance,
        total_omni_earned = total_omni_earned + omni_amount,
        updated_at = NOW()
    WHERE username = target_username;
    
    -- Create transaction record
    INSERT INTO reward_transactions (
        username,
        transaction_type,
        amount,
        description,
        reference_type
    ) VALUES (
        target_username,
        'bonus',
        omni_amount,
        'Manual OMNI points addition for testing',
        'admin_manual'
    );
    
    RAISE NOTICE 'Added % OMNI points to %. New balance: %', 
        omni_amount, target_username, new_balance;
END $$;

-- Verify the result
SELECT 
    username,
    current_balance,
    total_omni_earned,
    total_omni_spent
FROM user_rewards 
WHERE username = 'raman sjddhh';
