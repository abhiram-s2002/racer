-- Fix Phone Verification RLS Policy
-- This fixes the issue where OTP storage fails during signup

-- ============================================================================
-- DROP EXISTING RESTRICTIVE POLICY
-- ============================================================================

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Users can manage their own phone verifications" ON phone_verifications;

-- ============================================================================
-- CREATE NEW FLEXIBLE POLICIES
-- ============================================================================

-- Policy 1: Allow authenticated users to manage their own phone verifications
CREATE POLICY "Authenticated users can manage their own phone verifications" ON phone_verifications
    FOR ALL USING (
        auth.uid() IS NOT NULL AND
        phone_number IN (
            SELECT phone FROM users WHERE id = auth.uid()
        )
    );

-- Policy 2: Allow OTP creation for any phone number (for signup)
CREATE POLICY "Allow OTP creation for signup" ON phone_verifications
    FOR INSERT WITH CHECK (true);

-- Policy 3: Allow OTP verification for any phone number (for signup/login)
CREATE POLICY "Allow OTP verification" ON phone_verifications
    FOR SELECT USING (true);

-- Policy 4: Allow OTP updates for any phone number (for attempt tracking)
CREATE POLICY "Allow OTP updates" ON phone_verifications
    FOR UPDATE USING (true);

-- ============================================================================
-- CREATE SECURE FUNCTIONS FOR OTP MANAGEMENT
-- ============================================================================

-- Function to store OTP securely
CREATE OR REPLACE FUNCTION store_otp_secure(
    phone_number text,
    otp_code text,
    expiry_minutes integer DEFAULT 10
)
RETURNS boolean AS $$
BEGIN
    -- Insert or update OTP record
    INSERT INTO phone_verifications (phone_number, otp, expires_at)
    VALUES (phone_number, otp_code, now() + interval '1 minute' * expiry_minutes)
    ON CONFLICT (phone_number) 
    DO UPDATE SET 
        otp = EXCLUDED.otp,
        expires_at = EXCLUDED.expires_at,
        attempts = 0,
        updated_at = now();
    
    RETURN true;
EXCEPTION
    WHEN OTHERS THEN
        RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to verify OTP securely
CREATE OR REPLACE FUNCTION verify_otp_secure(
    phone_number text,
    otp_code text
)
RETURNS json AS $$
DECLARE
    otp_record phone_verifications%ROWTYPE;
    result json;
BEGIN
    -- Get the OTP record
    SELECT * INTO otp_record 
    FROM phone_verifications 
    WHERE phone_number = verify_otp_secure.phone_number;
    
    -- Check if OTP exists
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'message', 'OTP not found'
        );
    END IF;
    
    -- Check if OTP is expired
    IF otp_record.expires_at < now() THEN
        DELETE FROM phone_verifications WHERE phone_number = verify_otp_secure.phone_number;
        RETURN json_build_object(
            'success', false,
            'message', 'OTP has expired'
        );
    END IF;
    
    -- Check if too many attempts
    IF otp_record.attempts >= 5 THEN
        DELETE FROM phone_verifications WHERE phone_number = verify_otp_secure.phone_number;
        RETURN json_build_object(
            'success', false,
            'message', 'Too many failed attempts'
        );
    END IF;
    
    -- Verify OTP
    IF otp_record.otp = otp_code THEN
        -- Success - delete the OTP record
        DELETE FROM phone_verifications WHERE phone_number = verify_otp_secure.phone_number;
        
        -- Update user's phone verification status if authenticated
        IF auth.uid() IS NOT NULL THEN
            UPDATE users 
            SET 
                phone_verified_at = now(),
                phone_verification_attempts = 0,
                updated_at = now()
            WHERE id = auth.uid() AND phone = phone_number;
        END IF;
        
        RETURN json_build_object(
            'success', true,
            'message', 'OTP verified successfully'
        );
    ELSE
        -- Failed attempt - increment attempts
        UPDATE phone_verifications 
        SET 
            attempts = attempts + 1,
            updated_at = now()
        WHERE phone_number = verify_otp_secure.phone_number;
        
        RETURN json_build_object(
            'success', false,
            'message', 'Invalid OTP code'
        );
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

-- Grant execute permissions on secure functions
GRANT EXECUTE ON FUNCTION store_otp_secure(text, text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION store_otp_secure(text, text, integer) TO anon;
GRANT EXECUTE ON FUNCTION verify_otp_secure(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION verify_otp_secure(text, text) TO anon;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Check if policies are created correctly
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'phone_verifications'
ORDER BY policyname; 