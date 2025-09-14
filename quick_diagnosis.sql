-- Quick diagnosis for listings not showing on home page
-- Run this in Supabase SQL Editor to identify the issue

-- 1. Check if main function exists
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'get_listings_with_distance') 
        THEN '✅ get_listings_with_distance function exists'
        ELSE '❌ get_listings_with_distance function MISSING - THIS IS THE PROBLEM'
    END as function_check;

-- 2. Check if there are any non-expired listings
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM listings WHERE expires_at > NOW()) 
        THEN '✅ Non-expired listings exist'
        ELSE '❌ No non-expired listings found - THIS IS THE PROBLEM'
    END as data_check;

-- 3. Count total listings by status
SELECT 
    'Total Listings' as status,
    COUNT(*) as count
FROM listings
UNION ALL
SELECT 
    'Non-Expired Listings',
    COUNT(*)
FROM listings 
WHERE expires_at > NOW();

-- 4. Test the function directly
SELECT 
    'Function Test' as test,
    COUNT(*) as result_count
FROM get_listings_with_distance(28.6139, 77.2090, 50, NULL, 5);

-- 5. Check for required columns
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'listings' AND column_name = 'expires_at') 
        THEN '✅ expires_at column exists'
        ELSE '❌ expires_at column MISSING'
    END as expires_at_column;
