-- Quick check to see if user_ratings table exists
-- This is likely the cause of the "All object keys must match" error

SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_ratings') 
        THEN 'user_ratings table EXISTS' 
        ELSE 'user_ratings table MISSING - This is the problem!' 
    END as table_status;

-- If the table is missing, run the fix_rating_system.sql script to create it
