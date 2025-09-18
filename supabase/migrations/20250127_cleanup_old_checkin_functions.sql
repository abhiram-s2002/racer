-- ============================================================================
-- CLEANUP OLD DAILY CHECK-IN FUNCTIONS
-- ============================================================================
-- This migration removes the old complex check-in functions since we now have
-- a unified system that handles both verified and non-verified users

-- ============================================================================
-- DROP OLD FUNCTIONS
-- ============================================================================

-- Drop the old verified check-in function
DROP FUNCTION IF EXISTS public.process_daily_checkin_with_verification(text, uuid);

-- Drop the old reward calculation function
DROP FUNCTION IF EXISTS public.calculate_daily_checkin_reward(text, boolean);

-- Drop the old verification status check function (if not used elsewhere)
-- Note: Keep this one as it might be used by other parts of the system
-- DROP FUNCTION IF EXISTS public.is_user_currently_verified(uuid);

-- Drop the old reward amounts helper function
DROP FUNCTION IF EXISTS public.get_reward_amounts();

-- ============================================================================
-- VERIFY CLEANUP
-- ============================================================================

-- Verify that the unified function still exists and works
DO $$
BEGIN
    -- Test that our unified function exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.routines 
        WHERE routine_name = 'process_daily_checkin' 
        AND routine_schema = 'public'
    ) THEN
        RAISE EXCEPTION 'Unified process_daily_checkin function not found!';
    END IF;
    
    RAISE NOTICE 'Cleanup completed successfully. Unified check-in system is ready.';
END $$;
