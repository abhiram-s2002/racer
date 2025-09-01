-- Debug script to check what ratings exist for a specific ping
-- Replace 'YOUR_PING_ID_HERE' with the actual ping ID you're testing

-- Check all ratings for a specific ping
SELECT 
    id,
    rater_username,
    rated_username,
    ping_id,
    rating,
    category,
    created_at,
    updated_at
FROM user_ratings 
WHERE ping_id = 'YOUR_PING_ID_HERE';

-- Check if there are multiple ratings for the same ping
SELECT 
    ping_id,
    COUNT(*) as rating_count,
    STRING_AGG(rater_username || '->' || rated_username, ', ') as rating_pairs
FROM user_ratings 
GROUP BY ping_id 
HAVING COUNT(*) > 1
ORDER BY rating_count DESC;

-- Check recent ratings to see the pattern
SELECT 
    id,
    rater_username,
    rated_username,
    ping_id,
    rating,
    category,
    created_at
FROM user_ratings 
ORDER BY created_at DESC 
LIMIT 10;
