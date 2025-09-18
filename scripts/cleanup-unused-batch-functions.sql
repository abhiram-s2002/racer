-- ============================================================================
-- CLEANUP UNUSED BATCH FUNCTIONS
-- ============================================================================
-- This script removes unused batch functions that were created for cost optimization
-- but never actually implemented in the application code.
-- SAFE TO RUN MULTIPLE TIMES
-- ============================================================================

-- Remove unused batch functions that were never implemented
DROP FUNCTION IF EXISTS get_batch_chat_counts(TEXT[]);
DROP FUNCTION IF EXISTS get_batch_unread_counts(JSONB);

-- Success message
SELECT '✅ Cleanup Complete: Unused Batch Functions Removed!' as status;
SELECT '📊 Database now only contains actively used functions' as result;
SELECT '🚀 Removed functions that were never implemented in app code' as cleanup;
