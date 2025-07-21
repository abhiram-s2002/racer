-- Add missing columns to user_streaks table
-- Migration: 20250117_add_missing_columns.sql

-- Create user_streaks table if it doesn't exist
CREATE TABLE IF NOT EXISTS user_streaks (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    username text NOT NULL UNIQUE,
    current_streak integer DEFAULT 0,
    longest_streak integer DEFAULT 0,
    total_activities integer DEFAULT 0,
    last_activity_date date,
    created_at timestamp with time zone DEFAULT NOW(),
    updated_at timestamp with time zone DEFAULT NOW()
);

-- Add missing columns to user_streaks table
ALTER TABLE user_streaks 
ADD COLUMN IF NOT EXISTS last_weekly_reset date DEFAULT (current_date - interval '1 day'),
ADD COLUMN IF NOT EXISTS last_monthly_reset date DEFAULT (current_date - interval '1 day');

-- Update existing records to have proper default values
UPDATE user_streaks 
SET 
    last_weekly_reset = COALESCE(last_weekly_reset, current_date - interval '1 day'),
    last_monthly_reset = COALESCE(last_monthly_reset, current_date - interval '1 day')
WHERE last_weekly_reset IS NULL OR last_monthly_reset IS NULL;

-- Verify the columns exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_streaks' 
        AND column_name = 'last_weekly_reset'
    ) THEN
        RAISE EXCEPTION 'Column last_weekly_reset was not added successfully';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_streaks' 
        AND column_name = 'last_monthly_reset'
    ) THEN
        RAISE EXCEPTION 'Column last_monthly_reset was not added successfully';
    END IF;
    
    RAISE NOTICE 'Successfully added missing columns to user_streaks table';
END $$; 