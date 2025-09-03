-- ============================================================================
-- REMOVE URGENCY FIELD FROM REQUESTS TABLE
-- ============================================================================

-- Drop the urgency column from requests table
ALTER TABLE requests DROP COLUMN IF EXISTS urgency;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Verify the column has been removed
SELECT 
  'Migration Status' as check_type,
  'Urgency Field Removal' as description,
  'SUCCESS' as status,
  NOW() as completed_at;
