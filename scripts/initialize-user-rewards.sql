-- Initialize User Rewards for Existing Users
-- Run this script to fix PGRST116 errors for existing users

-- Initialize missing user rewards records
SELECT initialize_missing_user_rewards();

-- Check the status of all users
SELECT 
    u.username,
    CASE WHEN ur.username IS NOT NULL THEN '✓' ELSE '✗' END as has_rewards,
    CASE WHEN us.username IS NOT NULL THEN '✓' ELSE '✗' END as has_streak,
    CASE WHEN urc.username IS NOT NULL THEN '✓' ELSE '✗' END as has_referral_code,
    CASE WHEN ua.username IS NOT NULL THEN '✓' ELSE '✗' END as has_achievements
FROM users u
LEFT JOIN user_rewards ur ON u.username = ur.username
LEFT JOIN user_streaks us ON u.username = us.username
LEFT JOIN user_referral_codes urc ON u.username = urc.username
LEFT JOIN (
    SELECT DISTINCT username 
    FROM user_achievements 
    LIMIT 1
) ua ON u.username = ua.username
ORDER BY u.created_at;

-- Show users who still have missing records
SELECT 
    u.username,
    u.created_at,
    CASE WHEN ur.username IS NULL THEN 'Missing' ELSE 'OK' END as rewards_status,
    CASE WHEN us.username IS NULL THEN 'Missing' ELSE 'OK' END as streak_status,
    CASE WHEN urc.username IS NULL THEN 'Missing' ELSE 'OK' END as referral_status
FROM users u
LEFT JOIN user_rewards ur ON u.username = ur.username
LEFT JOIN user_streaks us ON u.username = us.username
LEFT JOIN user_referral_codes urc ON u.username = urc.username
WHERE ur.username IS NULL 
   OR us.username IS NULL 
   OR urc.username IS NULL
ORDER BY u.created_at; 