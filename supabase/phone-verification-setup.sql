-- Phone Verification System Setup
-- Run this in your Supabase SQL Editor

-- ============================================================================
-- ADD PHONE VERIFICATION COLUMNS TO USERS TABLE
-- ============================================================================

-- Add phone verification columns to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS phone_verified_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS phone_verification_attempts integer DEFAULT 0;

-- Create index for phone verification queries
CREATE INDEX IF NOT EXISTS idx_users_phone_verification ON users(phone, phone_verified_at);

-- ============================================================================
-- CREATE PHONE VERIFICATIONS TABLE
-- ============================================================================

-- Create phone_verifications table for OTP storage
CREATE TABLE IF NOT EXISTS phone_verifications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_number text NOT NULL,
    otp text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    attempts integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT timezone('utc', now()),
    updated_at timestamp with time zone DEFAULT timezone('utc', now()),
    UNIQUE(phone_number)
);

-- Create indexes for phone verification queries
CREATE INDEX IF NOT EXISTS idx_phone_verifications_phone ON phone_verifications(phone_number);
CREATE INDEX IF NOT EXISTS idx_phone_verifications_expires ON phone_verifications(expires_at);
CREATE INDEX IF NOT EXISTS idx_phone_verifications_created ON phone_verifications(created_at);

-- ============================================================================
-- CREATE CLEANUP FUNCTION FOR EXPIRED OTPs
-- ============================================================================

-- Function to clean up expired OTPs
CREATE OR REPLACE FUNCTION cleanup_expired_otps()
RETURNS void AS $$
BEGIN
    DELETE FROM phone_verifications 
    WHERE expires_at < now();
END;
$$ LANGUAGE plpgsql;

-- Create a scheduled job to clean up expired OTPs (runs every hour)
-- Note: This requires pg_cron extension which may not be available in all Supabase plans
-- You can run this manually or set up a cron job in your application

-- ============================================================================
-- CREATE PHONE VERIFICATION FUNCTIONS
-- ============================================================================

-- Function to get phone verification status
CREATE OR REPLACE FUNCTION get_phone_verification_status(user_id uuid)
RETURNS json AS $$
DECLARE
    result json;
BEGIN
    SELECT json_build_object(
        'isVerified', phone_verified_at IS NOT NULL,
        'phoneNumber', phone,
        'verifiedAt', phone_verified_at,
        'attempts', phone_verification_attempts
    ) INTO result
    FROM users
    WHERE id = user_id;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update phone verification status
CREATE OR REPLACE FUNCTION update_phone_verification_status(
    user_id uuid,
    phone_number text,
    is_verified boolean
)
RETURNS boolean AS $$
BEGIN
    UPDATE users 
    SET 
        phone = phone_number,
        phone_verified_at = CASE WHEN is_verified THEN now() ELSE NULL END,
        phone_verification_attempts = 0,
        updated_at = now()
    WHERE id = user_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- CREATE ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- Enable RLS on phone_verifications table
ALTER TABLE phone_verifications ENABLE ROW LEVEL SECURITY;

-- Policy for phone_verifications table
-- Users can only access their own phone verification records
CREATE POLICY "Users can manage their own phone verifications" ON phone_verifications
    FOR ALL USING (
        phone_number IN (
            SELECT phone FROM users WHERE id = auth.uid()
        )
    );

-- ============================================================================
-- CREATE TRIGGERS FOR AUTOMATIC UPDATES
-- ============================================================================

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_phone_verifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_phone_verifications_updated_at
    BEFORE UPDATE ON phone_verifications
    FOR EACH ROW
    EXECUTE FUNCTION update_phone_verifications_updated_at();

-- ============================================================================
-- ADD CONSTRAINTS AND VALIDATIONS
-- ============================================================================

-- Add constraint to ensure phone number format
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'check_phone_format' 
        AND table_name = 'users'
    ) THEN
        ALTER TABLE users 
        ADD CONSTRAINT check_phone_format 
        CHECK (phone IS NULL OR phone ~ '^\+?[1-9]\d{1,14}$');
    END IF;
END $$;

-- Add constraint to ensure OTP format (6 digits)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'check_otp_format' 
        AND table_name = 'phone_verifications'
    ) THEN
        ALTER TABLE phone_verifications 
        ADD CONSTRAINT check_otp_format 
        CHECK (otp ~ '^\d{6}$');
    END IF;
END $$;

-- ============================================================================
-- CREATE VIEWS FOR ANALYTICS
-- ============================================================================

-- View for phone verification analytics
CREATE OR REPLACE VIEW phone_verification_analytics AS
SELECT 
    DATE(created_at) as date,
    COUNT(*) as total_otps_sent,
    COUNT(CASE WHEN expires_at < now() THEN 1 END) as expired_otps,
    COUNT(CASE WHEN attempts > 0 THEN 1 END) as failed_attempts,
    AVG(attempts) as avg_attempts_per_otp
FROM phone_verifications
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- View for user verification status
CREATE OR REPLACE VIEW user_verification_status AS
SELECT 
    id,
    username,
    email,
    phone,
    phone_verified_at IS NOT NULL as is_phone_verified,
    phone_verified_at,
    phone_verification_attempts,
    created_at
FROM users
ORDER BY created_at DESC;

-- ============================================================================
-- SAMPLE DATA FOR TESTING (OPTIONAL)
-- ============================================================================

-- Insert sample phone verification records for testing
-- Uncomment the lines below if you want to add test data

/*
INSERT INTO phone_verifications (phone_number, otp, expires_at) VALUES
    ('+919876543210', '123456', now() + interval '10 minutes'),
    ('+919876543211', '654321', now() + interval '5 minutes')
ON CONFLICT (phone_number) DO NOTHING;
*/

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Query to verify the setup
SELECT 
    'Phone verification setup completed successfully' as status,
    COUNT(*) as total_users,
    COUNT(CASE WHEN phone IS NOT NULL THEN 1 END) as users_with_phone,
    COUNT(CASE WHEN phone_verified_at IS NOT NULL THEN 1 END) as verified_phones
FROM users; 