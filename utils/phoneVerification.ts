import { supabase } from './supabaseClient';
import { validatePhoneNumber } from './validation';

// SMS Provider Configuration
interface SMSProvider {
  name: string;
  apiUrl: string;
  apiKey: string;
  senderId: string;
  costPerSMS: number;
}

// Configure your SMS provider here
const SMS_PROVIDER: SMSProvider = {
  name: 'MSG91', // Change to your preferred provider
  apiUrl: 'https://api.msg91.com/api/v5/flow/', // Update with your provider's API
  apiKey: process.env.EXPO_PUBLIC_SMS_API_KEY || '',
  senderId: process.env.EXPO_PUBLIC_SMS_SENDER_ID || 'OMNIMKT',
  costPerSMS: 0.12 // Cost in INR
};

// OTP Configuration
const OTP_CONFIG = {
  length: 6,
  expiryMinutes: 10,
  maxAttempts: 3,
  resendCooldownMinutes: 2
};

// Phone verification status
export interface PhoneVerificationStatus {
  isVerified: boolean;
  phoneNumber: string;
  verifiedAt?: string;
  attempts: number;
  lastSentAt?: string;
}

// OTP verification result
export interface OTPVerificationResult {
  success: boolean;
  message: string;
  attemptsRemaining?: number;
  cooldownRemaining?: number;
}

/**
 * Generate a random OTP
 */
export function generateOTP(): string {
  const digits = '0123456789';
  let otp = '';
  for (let i = 0; i < OTP_CONFIG.length; i++) {
    otp += digits[Math.floor(Math.random() * digits.length)];
  }
  return otp;
}

/**
 * Store OTP in database with expiry using secure function
 */
async function storeOTP(phoneNumber: string, otp: string): Promise<void> {
  const { data, error } = await supabase
    .rpc('store_otp_secure', {
      phone_number: phoneNumber,
      otp_code: otp,
      expiry_minutes: OTP_CONFIG.expiryMinutes
    });

  if (error) {
    console.error('Error storing OTP:', error);
    throw new Error('Failed to store OTP');
  }

  if (!data) {
    throw new Error('Failed to store OTP');
  }
}

/**
 * Send SMS using configured provider
 */
async function sendSMS(phoneNumber: string, message: string): Promise<boolean> {
  try {
    // For development/testing, log the SMS instead of sending
    if (__DEV__ && !process.env.EXPO_PUBLIC_ENABLE_REAL_SMS) {
      // SMS logged for development (not sent)
      // OTP Code extracted for development
      return true;
    }

    // Real SMS sending implementation
    const response = await fetch(SMS_PROVIDER.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authkey': SMS_PROVIDER.apiKey
      },
      body: JSON.stringify({
        flow_id: process.env.EXPO_PUBLIC_SMS_FLOW_ID,
        sender: SMS_PROVIDER.senderId,
        mobiles: phoneNumber,
        VAR1: message // OTP variable
      })
    });

    const result = await response.json();
    
    if (result.type === 'success') {
      // SMS sent successfully
      return true;
    } else {
      console.error('SMS sending failed:', result);
      return false;
    }
  } catch (error) {
    console.error('Error sending SMS:', error);
    return false;
  }
}

/**
 * Send OTP to phone number
 */
export async function sendOTP(phoneNumber: string): Promise<{ success: boolean; message: string }> {
  try {
    // Validate phone number
    const validation = validatePhoneNumber(phoneNumber);
    if (!validation.isValid) {
      return { success: false, message: validation.error || 'Invalid phone number' };
    }

    const sanitizedPhone = validation.sanitizedValue || phoneNumber;

    // Check if user exists and get verification status
    const { data: existingUser } = await supabase
      .from('users')
      .select('phone, phone_verified_at')
      .eq('phone', sanitizedPhone)
      .single();

    // Check cooldown period
    const { data: lastVerification } = await supabase
      .from('phone_verifications')
      .select('created_at')
      .eq('phone_number', sanitizedPhone)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (lastVerification) {
      const lastSent = new Date(lastVerification.created_at);
      const now = new Date();
      const minutesSinceLastSent = (now.getTime() - lastSent.getTime()) / (1000 * 60);
      
      if (minutesSinceLastSent < OTP_CONFIG.resendCooldownMinutes) {
        const remainingMinutes = Math.ceil(OTP_CONFIG.resendCooldownMinutes - minutesSinceLastSent);
        return { 
          success: false, 
          message: `Please wait ${remainingMinutes} minutes before requesting another OTP` 
        };
      }
    }

    // Generate OTP
    const otp = generateOTP();
    
    // For now, skip database storage to test SMS sending
    // await storeOTP(sanitizedPhone, otp);

    // Send SMS
    const message = `Your OmniMarketplace verification code is: ${otp}. Valid for ${OTP_CONFIG.expiryMinutes} minutes.`;
    const smsSent = await sendSMS(sanitizedPhone, message);

    if (smsSent) {
      return { 
        success: true, 
        message: `OTP sent to ${sanitizedPhone}` 
      };
    } else {
      return { 
        success: false, 
        message: 'Failed to send OTP. Please try again.' 
      };
    }
  } catch (error) {
    console.error('Error in sendOTP:', error);
    return { 
      success: false, 
      message: 'An error occurred. Please try again.' 
    };
  }
}

/**
 * Verify OTP
 */
export async function verifyOTP(phoneNumber: string, otp: string): Promise<OTPVerificationResult> {
  try {
    // Use secure function to verify OTP
    const { data, error } = await supabase
      .rpc('verify_otp_secure', {
        phone_number: phoneNumber,
        otp_code: otp
      });

    if (error) {
      console.error('Error verifying OTP:', error);
      return { 
        success: false, 
        message: 'An error occurred. Please try again.' 
      };
    }

    if (!data) {
      return { 
        success: false, 
        message: 'Verification failed. Please try again.' 
      };
    }

    const result = data as { success: boolean; message: string };

    return { 
      success: result.success, 
      message: result.message,
      attemptsRemaining: result.success ? undefined : 3 // Default attempts remaining
    };
  } catch (error) {
    console.error('Error in verifyOTP:', error);
    return { 
      success: false, 
      message: 'An error occurred. Please try again.' 
    };
  }
}

/**
 * Get phone verification status for a user
 */
export async function getPhoneVerificationStatus(userId: string): Promise<PhoneVerificationStatus | null> {
  try {
    const { data: user } = await supabase
      .from('users')
      .select('phone, phone_verified_at')
      .eq('id', userId)
      .single();

    if (!user) return null;

    return {
      isVerified: !!user.phone_verified_at,
      phoneNumber: user.phone || '',
      verifiedAt: user.phone_verified_at,
      attempts: 0,
      lastSentAt: undefined
    };
  } catch (error) {
    console.error('Error getting phone verification status:', error);
    return null;
  }
}

/**
 * Update user's phone number
 */
export async function updateUserPhone(userId: string, phoneNumber: string): Promise<{ success: boolean; message: string }> {
  try {
    const validation = validatePhoneNumber(phoneNumber);
    if (!validation.isValid) {
      return { success: false, message: validation.error || 'Invalid phone number' };
    }

    const sanitizedPhone = validation.sanitizedValue || phoneNumber;

    // Check if phone number is already used by another user
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('phone', sanitizedPhone)
      .neq('id', userId)
      .single();

    if (existingUser) {
      return { success: false, message: 'This phone number is already registered with another account.' };
    }

    // Update user's phone number
    const { error } = await supabase
      .from('users')
      .update({ 
        phone: sanitizedPhone,
        phone_verified_at: null // Reset verification status
      })
      .eq('id', userId);

    if (error) {
      return { success: false, message: 'Failed to update phone number.' };
    }

    return { success: true, message: 'Phone number updated successfully.' };
  } catch (error) {
    console.error('Error updating phone number:', error);
    return { success: false, message: 'An error occurred. Please try again.' };
  }
}

/**
 * Get SMS provider information
 */
export function getSMSProviderInfo() {
  return {
    name: SMS_PROVIDER.name,
    costPerSMS: SMS_PROVIDER.costPerSMS,
    currency: 'INR'
  };
} 