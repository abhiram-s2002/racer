-- Add notification settings to users table
-- Migration: 20250118_add_notification_settings.sql

-- Add notification settings columns to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS notification_new_messages boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS notification_listing_updates boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS notification_marketing_emails boolean DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN users.notification_new_messages IS 'User preference for new message notifications';
COMMENT ON COLUMN users.notification_listing_updates IS 'User preference for listing update notifications';
COMMENT ON COLUMN users.notification_marketing_emails IS 'User preference for marketing email notifications';

-- Create index for notification settings queries
CREATE INDEX IF NOT EXISTS idx_users_notification_settings ON users(notification_new_messages, notification_listing_updates, notification_marketing_emails); 