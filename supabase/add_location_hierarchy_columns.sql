-- Add location hierarchy columns to requests table and populate them
-- This migration adds the missing columns and populates them from existing location data

-- Add the missing columns
ALTER TABLE requests 
ADD COLUMN IF NOT EXISTS location_name text,
ADD COLUMN IF NOT EXISTS location_district text,
ADD COLUMN IF NOT EXISTS location_state text;

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_requests_location_state 
ON requests(location_state) 
WHERE location_state IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_requests_location_district 
ON requests(location_district) 
WHERE location_district IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_requests_location_name 
ON requests(location_name) 
WHERE location_name IS NOT NULL;

-- Create composite index for hierarchical queries
CREATE INDEX IF NOT EXISTS idx_requests_location_hierarchy 
ON requests(location_state, location_district, location_name, updated_at DESC)
WHERE location_state IS NOT NULL;

-- Populate the new columns from existing location data
-- This is a simple parser that extracts location hierarchy from the location text
UPDATE requests 
SET 
  location_name = CASE 
    WHEN location IS NOT NULL AND location != '' THEN
      -- Extract the first part (usually city/area name)
      TRIM(SPLIT_PART(location, ',', 1))
    ELSE NULL
  END,
  location_district = CASE 
    WHEN location IS NOT NULL AND location != '' THEN
      -- Extract the second part (usually district)
      TRIM(SPLIT_PART(location, ',', 2))
    ELSE NULL
  END,
  location_state = CASE 
    WHEN location IS NOT NULL AND location != '' THEN
      -- Extract the last part (usually state)
      TRIM(SPLIT_PART(location, ',', -1))
    ELSE NULL
  END
WHERE location IS NOT NULL AND location != '';

-- Show the results
SELECT 
  'Migration completed' as status,
  COUNT(*) as total_requests,
  COUNT(location_name) as requests_with_location_name,
  COUNT(location_district) as requests_with_location_district,
  COUNT(location_state) as requests_with_location_state
FROM requests;
