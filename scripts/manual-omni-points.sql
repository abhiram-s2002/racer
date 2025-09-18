-- Manual OMNI Points Addition Script
-- This script safely adds OMNI points to a user's account
-- Usage: Replace 'raman sjddhh' with the target username and adjust the amount

-- ============================================================================
-- MANUAL OMNI POINTS ADDITION FOR TESTING
-- ============================================================================

-- Step 1: Check current user rewards status
SELECT 
    username,
    current_balance,
    total_omni_earned,
    total_omni_spent,
    updated_at
FROM user_rewards 
WHERE username = 'raman sjddhh';

-- Step 2: Add OMNI points manually
-- This will add 1500 OMNI points to the user's account
DO $$
DECLARE
    target_username text := 'raman sjddhh';
    omni_amount integer := 1500;
    current_balance integer;
    new_balance integer;
BEGIN
    -- Get current balance or initialize if user doesn't have rewards record
    SELECT current_balance INTO current_balance
    FROM user_rewards
    WHERE username = target_username;
    
    -- If user doesn't have rewards record, create one
    IF current_balance IS NULL THEN
        INSERT INTO user_rewards (username, current_balance, total_omni_earned, total_omni_spent)
        VALUES (target_username, 0, 0, 0);
        current_balance := 0;
    END IF;
    
    -- Calculate new balance
    new_balance := current_balance + omni_amount;
    
    -- Update user rewards
    UPDATE user_rewards
    SET 
        current_balance = new_balance,
        total_omni_earned = total_omni_earned + omni_amount,
        updated_at = NOW()
    WHERE username = target_username;
    
    -- Create reward transaction for audit trail
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
    
    -- Log the operation
    RAISE NOTICE 'Successfully added % OMNI points to user %. New balance: %', 
        omni_amount, target_username, new_balance;
END $$;

-- Step 3: Verify the update
SELECT 
    username,
    current_balance,
    total_omni_earned,
    total_omni_spent,
    updated_at
FROM user_rewards 
WHERE username = 'raman sjddhh';

-- Step 4: Check the transaction record
SELECT 
    username,
    transaction_type,
    amount,
    description,
    created_at
FROM reward_transactions 
WHERE username = 'raman sjddhh' 
ORDER BY created_at DESC 
LIMIT 5;
