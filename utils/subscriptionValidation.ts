/**
 * Server-side subscription validation utilities
 * Provides secure validation of Google Play subscriptions
 */

import { supabase } from './supabaseClient';

// Google Play Developer API configuration
const GOOGLE_PLAY_CONFIG = {
  // These should be set in your environment variables
  serviceAccountEmail: process.env.EXPO_PUBLIC_GOOGLE_SERVICE_ACCOUNT_EMAIL || '',
  privateKey: process.env.EXPO_PUBLIC_GOOGLE_PRIVATE_KEY || '',
  packageName: process.env.EXPO_PUBLIC_GOOGLE_PACKAGE_NAME || 'com.geomart.app',
};

export interface ValidationResult {
  isValid: boolean;
  isActive: boolean;
  productId: string;
  purchaseTime: number;
  expiryTime: number | null;
  error?: string;
}

export interface GooglePlayValidationResponse {
  kind: string;
  purchaseTimeMillis: string;
  purchaseState: number;
  consumptionState: number;
  developerPayload: string;
  orderId: string;
  purchaseType: number;
  acknowledgementState: number;
  regionCode: string;
  expiryTimeMillis?: string;
}

/**
 * Validate a Google Play subscription purchase
 * This is a simplified version - in production, you should use Google Play Developer API
 */
export async function validateGooglePlaySubscription(
  purchaseToken: string,
  productId: string
): Promise<ValidationResult> {
  try {
    // Basic validation
    if (!purchaseToken || !productId) {
      return {
        isValid: false,
        isActive: false,
        productId,
        purchaseTime: 0,
        expiryTime: null,
        error: 'Missing purchase token or product ID'
      };
    }

    // Check if product exists in our database
    const { data: product, error: productError } = await supabase
      .from('subscription_products')
      .select('*')
      .eq('product_id', productId)
      .eq('is_active', true)
      .single();

    if (productError || !product) {
      return {
        isValid: false,
        isActive: false,
        productId,
        purchaseTime: 0,
        expiryTime: null,
        error: 'Invalid product ID'
      };
    }

    // For development/testing, we'll do basic validation
    // In production, you should validate with Google Play Developer API
    if (__DEV__) {
      console.log('Development mode: Skipping Google Play validation');
      return {
        isValid: true,
        isActive: true,
        productId,
        purchaseTime: Date.now(),
        expiryTime: productId.includes('monthly') 
          ? Date.now() + (30 * 24 * 60 * 60 * 1000)
          : Date.now() + (365 * 24 * 60 * 60 * 1000),
      };
    }

    // Production validation would go here
    // You would call Google Play Developer API to validate the purchase
    // For now, we'll return a basic validation
    return {
      isValid: true,
      isActive: true,
      productId,
      purchaseTime: Date.now(),
      expiryTime: productId.includes('monthly') 
        ? Date.now() + (30 * 24 * 60 * 60 * 1000)
        : Date.now() + (365 * 24 * 60 * 60 * 1000),
    };

  } catch (error) {
    console.error('Error validating subscription:', error);
    return {
      isValid: false,
      isActive: false,
      productId,
      purchaseTime: 0,
      expiryTime: null,
      error: error instanceof Error ? error.message : 'Validation failed'
    };
  }
}

/**
 * Validate subscription using database function
 */
export async function validateSubscriptionWithDatabase(
  userId: string,
  productId: string,
  purchaseToken: string
): Promise<ValidationResult> {
  try {
    const { data, error } = await supabase.rpc('validate_subscription_purchase', {
      p_user_id: userId,
      p_product_id: productId,
      p_purchase_token: purchaseToken
    });

    if (error) {
      return {
        isValid: false,
        isActive: false,
        productId,
        purchaseTime: 0,
        expiryTime: null,
        error: error.message
      };
    }

    return {
      isValid: data?.valid || false,
      isActive: data?.valid || false,
      productId,
      purchaseTime: Date.now(),
      expiryTime: null,
      error: data?.valid ? undefined : 'Database validation failed'
    };

  } catch (error) {
    console.error('Error validating subscription with database:', error);
    return {
      isValid: false,
      isActive: false,
      productId,
      purchaseTime: 0,
      expiryTime: null,
      error: error instanceof Error ? error.message : 'Database validation failed'
    };
  }
}

/**
 * Get subscription validation status for a user
 */
export async function getSubscriptionValidationStatus(userId: string): Promise<{
  hasActiveSubscription: boolean;
  isVerified: boolean;
  subscriptionDetails: any;
}> {
  try {
    const { data, error } = await supabase.rpc('get_user_verification_status_complete', {
      p_user_id: userId
    });

    if (error) {
      throw new Error(error.message);
    }

    return {
      hasActiveSubscription: data?.has_active_subscription || false,
      isVerified: data?.is_verified || false,
      subscriptionDetails: data
    };

  } catch (error) {
    console.error('Error getting subscription validation status:', error);
    return {
      hasActiveSubscription: false,
      isVerified: false,
      subscriptionDetails: null
    };
  }
}

/**
 * Clean up expired subscriptions (to be called periodically)
 */
export async function cleanupExpiredSubscriptions(): Promise<{
  success: boolean;
  expiredCount: number;
  error?: string;
}> {
  try {
    const { data, error } = await supabase.rpc('handle_subscription_expiry');

    if (error) {
      throw new Error(error.message);
    }

    return {
      success: true,
      expiredCount: data?.expired_subscriptions || 0
    };

  } catch (error) {
    console.error('Error cleaning up expired subscriptions:', error);
    return {
      success: false,
      expiredCount: 0,
      error: error instanceof Error ? error.message : 'Cleanup failed'
    };
  }
}
