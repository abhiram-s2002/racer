-- Update Leaderboard Cache to Include All Users with OMNI
-- This script ensures all users with total_omni_earned > 0 are included in the leaderboard

-- Clear existing leaderboard cache
DELETE FROM leaderboard_cache;

-- Insert all users with OMNI balance into leaderboard cache
INSERT INTO leaderboard_cache (username, total_omni_earned, rank, last_updated)
SELECT 
    username,
    total_omni_earned,
    ROW_NUMBER() OVER (ORDER BY total_omni_earned DESC) as rank,
    NOW() as last_updated
FROM user_rewards 
WHERE total_omni_earned > 0
ORDER BY total_omni_earned DESC;

-- Verify the update
SELECT 
    COUNT(*) as total_users_in_leaderboard,
    MIN(total_omni_earned) as min_omni,
    MAX(total_omni_earned) as max_omni,
    AVG(total_omni_earned)::integer as avg_omni
FROM leaderboard_cache;
