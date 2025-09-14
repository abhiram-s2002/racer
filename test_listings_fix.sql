-- Test script to verify listings are working without is_active field

-- 1. First, run the fixed function
-- Copy and paste the contents of fix_function_no_is_active.sql here

-- 2. Then run this test
SELECT 
    'Testing listings without is_active field' as test_name,
    COUNT(*) as result_count,
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ SUCCESS - Listings are now visible'
        ELSE '❌ FAILED - Still no listings found'
    END as status
FROM get_listings_with_distance(28.6139, 77.2090, 50, NULL, 5);

-- 3. Check if there are any non-expired listings
SELECT 
    'Data availability check' as test_name,
    COUNT(*) as total_listings,
    COUNT(CASE WHEN expires_at > NOW() THEN 1 END) as non_expired_listings
FROM listings;
