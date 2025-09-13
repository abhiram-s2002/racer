-- Remove notification columns from users table
-- This migration removes all notification-related columns since notifications are not implemented

-- ============================================================================
-- STEP 1: REMOVE NOTIFICATION COLUMNS
-- ============================================================================

-- Remove individual notification columns
ALTER TABLE users DROP COLUMN IF EXISTS notification_new_messages;
ALTER TABLE users DROP COLUMN IF EXISTS notification_listing_updates;
ALTER TABLE users DROP COLUMN IF EXISTS notification_marketing_emails;

-- Remove notification_settings jsonb column
ALTER TABLE users DROP COLUMN IF EXISTS notification_settings;

-- ============================================================================
-- STEP 2: REMOVE NOTIFICATION INDEXES
-- ============================================================================

-- Drop notification-related indexes
DROP INDEX IF EXISTS idx_users_notification_settings;

-- ============================================================================
-- STEP 3: REMOVE UNUSED COLUMNS
-- ============================================================================

-- Remove other unused columns identified in analysis
ALTER TABLE users DROP COLUMN IF EXISTS stats;
ALTER TABLE users DROP COLUMN IF EXISTS location;
ALTER TABLE users DROP COLUMN IF EXISTS phone_verified_at;
ALTER TABLE users DROP COLUMN IF EXISTS phone_verification_attempts;

-- Remove verification columns (not used)
ALTER TABLE users DROP COLUMN IF EXISTS verification_status;
ALTER TABLE users DROP COLUMN IF EXISTS verified_at;

-- Drop phone verification table completely
DROP TABLE IF EXISTS phone_verifications CASCADE;

-- ============================================================================
-- STEP 4: VERIFICATION
-- ============================================================================

-- Verify the columns are gone
SELECT 
    'Migration Status' as check_type,
    CASE 
        WHEN NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'users' AND column_name = 'notification_new_messages'
        ) 
        THEN '✅ notification_new_messages column removed'
        ELSE '❌ notification_new_messages column still exists'
    END as notification_new_messages_status,
    CASE 
        WHEN NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'users' AND column_name = 'notification_listing_updates'
        ) 
        THEN '✅ notification_listing_updates column removed'
        ELSE '❌ notification_listing_updates column still exists'
    END as notification_listing_updates_status,
    CASE 
        WHEN NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'users' AND column_name = 'notification_marketing_emails'
        ) 
        THEN '✅ notification_marketing_emails column removed'
        ELSE '❌ notification_marketing_emails column still exists'
    END as notification_marketing_emails_status,
    CASE 
        WHEN NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'users' AND column_name = 'notification_settings'
        ) 
        THEN '✅ notification_settings column removed'
        ELSE '❌ notification_settings column still exists'
    END as notification_settings_status,
    CASE 
        WHEN NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'users' AND column_name = 'stats'
        ) 
        THEN '✅ stats column removed'
        ELSE '❌ stats column still exists'
    END as stats_status,
    CASE 
        WHEN NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'users' AND column_name = 'location'
        ) 
        THEN '✅ location column removed'
        ELSE '❌ location column still exists'
    END as location_status,
    CASE 
        WHEN NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'users' AND column_name = 'phone_verified_at'
        ) 
        THEN '✅ phone_verified_at column removed'
        ELSE '❌ phone_verified_at column still exists'
    END as phone_verified_at_status,
    CASE 
        WHEN NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'users' AND column_name = 'phone_verification_attempts'
        ) 
        THEN '✅ phone_verification_attempts column removed'
        ELSE '❌ phone_verification_attempts column still exists'
    END as phone_verification_attempts_status,
    CASE 
        WHEN NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'users' AND column_name = 'verification_status'
        ) 
        THEN '✅ verification_status column removed'
        ELSE '❌ verification_status column still exists'
    END as verification_status_status,
    CASE 
        WHEN NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'users' AND column_name = 'verified_at'
        ) 
        THEN '✅ verified_at column removed'
        ELSE '❌ verified_at column still exists'
    END as verified_at_status,
    CASE 
        WHEN NOT EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_name = 'phone_verifications'
        ) 
        THEN '✅ phone_verifications table removed'
        ELSE '❌ phone_verifications table still exists'
    END as phone_verifications_table_status;

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE users IS 'Users table - cleaned up by removing unused notification, phone verification, and verification columns';
 