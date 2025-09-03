-- Remove the request that has no location data
-- This request was likely created before the location system was implemented

-- First, let's see what we're about to delete
SELECT 
  id,
  requester_username,
  title,
  description,
  category,
  location,
  location_name,
  location_district,
  location_state,
  created_at
FROM requests
WHERE id = '21a28ef6-6df5-4c21-9a2b-0016834bc304';

-- Delete the request without location data
DELETE FROM requests 
WHERE id = '21a28ef6-6df5-4c21-9a2b-0016834bc304';

-- Verify the deletion and show remaining requests
SELECT 
  'After deletion' as status,
  COUNT(*) as total_requests,
  COUNT(location_name) as requests_with_location_name,
  COUNT(location_district) as requests_with_location_district,
  COUNT(location_state) as requests_with_location_state
FROM requests;

-- Show the remaining requests
SELECT 
  id,
  requester_username,
  title,
  location,
  location_name,
  location_district,
  location_state,
  created_at
FROM requests
ORDER BY created_at;
