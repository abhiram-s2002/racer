-- Complete Leaderboard Setup SQL
-- Run this entire script in your Supabase SQL Editor
-- This will create everything needed for the leaderboard system

-- ===========================================
-- STEP 1: Create Leaderboard Cache Table
-- ===========================================

-- Create leaderboard cache table
CREATE TABLE IF NOT EXISTS leaderboard_cache (
    id SERIAL PRIMARY KEY,
    username TEXT REFERENCES users(username) ON DELETE CASCADE,
    total_omni_earned INTEGER NOT NULL,
    rank INTEGER NOT NULL,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(username)
);

-- ===========================================
-- STEP 2: Create Indexes for Performance
-- ===========================================

-- Create indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_leaderboard_cache_rank ON leaderboard_cache(rank);
CREATE INDEX IF NOT EXISTS idx_leaderboard_cache_username ON leaderboard_cache(username);

-- Add index to user_rewards for efficient ranking calculations
CREATE INDEX IF NOT EXISTS idx_user_rewards_total_omni_earned 
ON user_rewards(total_omni_earned DESC);

-- ===========================================
-- STEP 3: Populate Initial Data
-- ===========================================

-- Clear existing data (if any)
DELETE FROM leaderboard_cache;

-- Insert initial data with rankings
INSERT INTO leaderboard_cache (username, total_omni_earned, rank, last_updated)
SELECT 
    username,
    total_omni_earned,
    ROW_NUMBER() OVER (ORDER BY total_omni_earned DESC) as rank,
    NOW() as last_updated
FROM user_rewards 
WHERE total_omni_earned > 0
ORDER BY total_omni_earned DESC;

-- ===========================================
-- STEP 4: Create Function to Update Rankings
-- ===========================================

-- Create a PostgreSQL function to update rankings
CREATE OR REPLACE FUNCTION update_leaderboard_rankings()
RETURNS JSON AS $$
DECLARE
    user_count INTEGER;
    top_users JSON;
BEGIN
    -- Clear existing rankings
    DELETE FROM leaderboard_cache;
    
    -- Insert updated rankings
    INSERT INTO leaderboard_cache (username, total_omni_earned, rank, last_updated)
    SELECT 
        username,
        total_omni_earned,
        ROW_NUMBER() OVER (ORDER BY total_omni_earned DESC) as rank,
        NOW() as last_updated
    FROM user_rewards 
    WHERE total_omni_earned > 0
    ORDER BY total_omni_earned DESC;
    
    -- Get count of users processed
    GET DIAGNOSTICS user_count = ROW_COUNT;
    
    -- Get top 3 users for response
    SELECT json_agg(
        json_build_object(
            'username', username,
            'rank', rank,
            'total_omni_earned', total_omni_earned
        )
    ) INTO top_users
    FROM leaderboard_cache 
    WHERE rank <= 3;
    
    -- Return success response
    RETURN json_build_object(
        'success', true,
        'message', 'Leaderboard updated successfully',
        'usersProcessed', user_count,
        'topUsers', top_users,
        'lastUpdated', NOW()
    );
    
EXCEPTION WHEN OTHERS THEN
    -- Return error response
    RETURN json_build_object(
        'success', false,
        'error', SQLERRM,
        'timestamp', NOW()
    );
END;
$$ LANGUAGE plpgsql;

-- ===========================================
-- STEP 5: Create Cron Job Function
-- ===========================================

-- Create a function that can be called by cron
CREATE OR REPLACE FUNCTION cron_update_leaderboard()
RETURNS void AS $$
BEGIN
    -- Call the update function
    PERFORM update_leaderboard_rankings();
    
    -- Log the execution
    INSERT INTO logs (message, created_at) 
    VALUES ('Leaderboard cron job executed', NOW());
    
EXCEPTION WHEN OTHERS THEN
    -- Log any errors
    INSERT INTO logs (message, created_at) 
    VALUES ('Leaderboard cron job failed: ' || SQLERRM, NOW());
END;
$$ LANGUAGE plpgsql;

-- ===========================================
-- STEP 6: Create Logs Table (for monitoring)
-- ===========================================

-- Create logs table for monitoring
CREATE TABLE IF NOT EXISTS logs (
    id SERIAL PRIMARY KEY,
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on logs
CREATE INDEX IF NOT EXISTS idx_logs_created_at ON logs(created_at DESC);

-- ===========================================
-- STEP 7: Verify Setup
-- ===========================================

-- Check if everything was created successfully
DO $$
DECLARE
    table_exists BOOLEAN;
    function_exists BOOLEAN;
    user_count INTEGER;
BEGIN
    -- Check if leaderboard_cache table exists
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'leaderboard_cache'
    ) INTO table_exists;
    
    -- Check if function exists
    SELECT EXISTS (
        SELECT FROM information_schema.routines 
        WHERE routine_name = 'update_leaderboard_rankings'
    ) INTO function_exists;
    
    -- Get user count
    SELECT COUNT(*) INTO user_count FROM leaderboard_cache;
    
    -- Log results
    RAISE NOTICE 'Setup Verification:';
    RAISE NOTICE '- Leaderboard table exists: %', table_exists;
    RAISE NOTICE '- Update function exists: %', function_exists;
    RAISE NOTICE '- Users in leaderboard: %', user_count;
    
    IF table_exists AND function_exists THEN
        RAISE NOTICE '✅ Leaderboard setup completed successfully!';
    ELSE
        RAISE NOTICE '❌ Some components failed to create. Please check the errors above.';
    END IF;
END $$;

-- ===========================================
-- STEP 8: Show Current Leaderboard
-- ===========================================

-- Display current top 10 users
SELECT 
    rank,
    username,
    total_omni_earned,
    last_updated
FROM leaderboard_cache 
ORDER BY rank 
LIMIT 10;

-- ===========================================
-- USAGE INSTRUCTIONS
-- ===========================================

/*
AFTER RUNNING THIS SCRIPT:

1. MANUAL UPDATE (for testing):
   SELECT 
   
   
   update_leaderboard_rankings();

2. SET UP CRON JOB in Supabase Dashboard:
   - Go to Database → Functions
   - Create new function: cron_update_leaderboard
   - Schedule: 0 */6 * * * (every 6 hours)

3. TEST THE FUNCTION:
   SELECT cron_update_leaderboard();

4. MONITOR LOGS:
   SELECT * FROM logs ORDER BY created_at DESC LIMIT 10;

5. VIEW CURRENT RANKINGS:
   SELECT * FROM leaderboard_cache ORDER BY rank LIMIT 20;
*/
