// Subscription Service for Google Play Billing
// Handles subscription purchases, validation, and management

import { 
  initConnection, 
  endConnection, 
  getProducts, 
  getSubscriptions, 
  requestPurchase, 
  requestSubscription, 
  getAvailablePurchases, 
  purchaseUpdatedListener,
  purchaseErrorListener,
  finishTransaction,
  clearTransactionIOS,
  type Product,
  type Subscription,
  type Purchase,
  type PurchaseError,
  type PurchaseResult,
  type SubscriptionPurchase
} from 'react-native-iap';

// Subscription product IDs (replace with your actual product IDs from Google Play Console)
export const SUBSCRIPTION_PRODUCTS = {
  MONTHLY_VERIFICATION: 'com.geomart.app.verification.monthly',
  ANNUAL_VERIFICATION: 'com.geomart.app.verification.annual',
} as const;

export const SUBSCRIPTION_GROUP = 'verification_plans';

export interface SubscriptionStatus {
  isActive: boolean;
  productId: string;
  purchaseToken: string;
  purchaseTime: number;
  expiryTime: number;
  autoRenewing: boolean;
  isTrialPeriod: boolean;
  isIntroductoryPricePeriod: boolean;
}

export interface SubscriptionError {
  code: string;
  message: string;
  userCancelled?: boolean;
}

// Extended Purchase interface to handle the actual properties we need
export interface ExtendedPurchase {
  productId: string;
  purchaseToken?: string;
  transactionId?: string;
  purchaseTime?: number;
  platform?: string;
  [key: string]: any; // Allow additional properties
}

class SubscriptionService {
  private isInitialized = false;
  private purchaseUpdateSubscription: any = null;
  private purchaseErrorSubscription: any = null;

  // Initialize the subscription service
  async initialize(): Promise<boolean> {
    try {
      if (this.isInitialized) {
        return true;
      }

      // Initialize connection
      const result = await initConnection();
      console.log('Subscription service initialized:', result);

      // Set up purchase listeners
      this.setupPurchaseListeners();

      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error('Failed to initialize subscription service:', error);
      return false;
    }
  }

  // Set up purchase update and error listeners
  private setupPurchaseListeners() {
    // Listen for purchase updates
    this.purchaseUpdateSubscription = purchaseUpdatedListener(
      async (purchase: Purchase) => {
        console.log('Purchase updated:', purchase);
        try {
          // Finish the transaction
          await finishTransaction({ purchase, isConsumable: false });
          
          // Handle the purchase
          await this.handlePurchaseUpdate(purchase);
        } catch (error) {
          console.error('Error handling purchase update:', error);
        }
      }
    );

    // Listen for purchase errors
    this.purchaseErrorSubscription = purchaseErrorListener(
      (error: PurchaseError) => {
        console.error('Purchase error:', error);
        this.handlePurchaseError(error);
      }
    );
  }

  // Handle purchase updates
  private async handlePurchaseUpdate(purchase: Purchase) {
    try {
      // Validate the purchase
      const isValid = await this.validatePurchase(purchase);
      
      if (isValid) {
        // Update user's subscription status in your backend
        await this.updateSubscriptionStatus(purchase);
      }
    } catch (error) {
      console.error('Error handling purchase update:', error);
    }
  }

  // Handle purchase errors
  private handlePurchaseError(error: PurchaseError) {
    // Handle different error types
    if (error.code === 'E_USER_CANCELLED') {
      console.log('User cancelled purchase');
    } else if (error.code === 'E_ITEM_UNAVAILABLE') {
      console.log('Item unavailable');
    } else {
      console.error('Purchase error:', error.message);
    }
  }

  // Get available subscription products
  async getAvailableSubscriptions(): Promise<Subscription[]> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      const subscriptions = await getSubscriptions({
        skus: Object.values(SUBSCRIPTION_PRODUCTS),
      });

      return subscriptions;
    } catch (error) {
      console.error('Error getting subscriptions:', error);
      throw error;
    }
  }

  // Request a subscription purchase
  async requestSubscription(productId: string): Promise<PurchaseResult | SubscriptionPurchase | SubscriptionPurchase[] | null | void> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      const result = await requestSubscription({
        sku: productId,
        ...(productId === SUBSCRIPTION_PRODUCTS.ANNUAL_VERIFICATION && {
          subscriptionOffers: [{ sku: productId, offerToken: 'default' }]
        })
      });

      return result;
    } catch (error) {
      console.error('Error requesting subscription:', error);
      throw error;
    }
  }

  // Validate a purchase
  async validatePurchase(purchase: Purchase): Promise<boolean> {
    try {
      // For now, we'll assume purchases are valid
      // In production, you should validate with your backend server
      // that verifies the purchase with Google Play Console
      return true;
    } catch (error) {
      console.error('Error validating purchase:', error);
      return false;
    }
  }

  // Update subscription status in your backend
  private async updateSubscriptionStatus(purchase: Purchase) {
    try {
      console.log('Updating subscription status for purchase:', purchase);
      
      // Import supabase client
      const { supabase } = await import('./supabaseClient');
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }
      
      // Cast to extended purchase to access additional properties
      const extendedPurchase = purchase as ExtendedPurchase;
      
      // Calculate expiry time based on product type
      let expiryTime: number | null = null;
      if (purchase.productId === SUBSCRIPTION_PRODUCTS.MONTHLY_VERIFICATION) {
        // 30 days from now
        expiryTime = Date.now() + (30 * 24 * 60 * 60 * 1000);
      } else if (purchase.productId === SUBSCRIPTION_PRODUCTS.ANNUAL_VERIFICATION) {
        // 365 days from now
        expiryTime = Date.now() + (365 * 24 * 60 * 60 * 1000);
      }
      
      // Extract purchase token safely
      const purchaseToken = extendedPurchase.purchaseToken || extendedPurchase.transactionId || '';
      
      // Call the database function to sync subscription with verification
      const { data, error } = await supabase.rpc('sync_subscription_with_verification', {
        p_user_id: user.id,
        p_product_id: purchase.productId,
        p_purchase_token: purchaseToken,
        p_purchase_time: extendedPurchase.purchaseTime || Date.now(),
        p_expiry_time: expiryTime,
        p_platform: extendedPurchase.platform || 'android'
      });
      
      if (error) {
        console.error('Database sync error:', error);
        throw new Error(`Failed to sync subscription: ${error.message}`);
      }
      
      if (data && data.success) {
        console.log('Subscription and verification status updated successfully:', data);
      } else {
        console.error('Subscription sync failed:', data);
        throw new Error('Failed to sync subscription with verification status');
      }
      
    } catch (error) {
      console.error('Error updating subscription status:', error);
      throw error;
    }
  }

  // Get user's current subscriptions
  async getCurrentSubscriptions(): Promise<Purchase[]> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      const purchases = await getAvailablePurchases();
      return purchases;
    } catch (error) {
      console.error('Error getting current subscriptions:', error);
      throw error;
    }
  }

  // Check if user has an active subscription
  async hasActiveSubscription(): Promise<boolean> {
    try {
      const subscriptions = await this.getCurrentSubscriptions();
      return subscriptions.length > 0;
    } catch (error) {
      console.error('Error checking subscription status:', error);
      return false;
    }
  }

  // Get subscription status for a specific product
  async getSubscriptionStatus(productId: string): Promise<SubscriptionStatus | null> {
    try {
      const subscriptions = await this.getCurrentSubscriptions();
      const subscription = subscriptions.find(sub => sub.productId === productId);
      
      if (!subscription) {
        return null;
      }

      return {
        isActive: true, // You might want to check expiry time
        productId: subscription.productId,
        purchaseToken: subscription.purchaseToken || '',
        purchaseTime: Date.now(), // Use current time as fallback
        expiryTime: Date.now() + (365 * 24 * 60 * 60 * 1000), // Example: 1 year
        autoRenewing: true,
        isTrialPeriod: false,
        isIntroductoryPricePeriod: false,
      };
    } catch (error) {
      console.error('Error getting subscription status:', error);
      return null;
    }
  }

  // Get comprehensive verification status including subscription
  async getVerificationStatus(): Promise<{
    isVerified: boolean;
    verificationStatus: string;
    verifiedAt: string | null;
    verificationExpiresAt: string | null;
    hasActiveSubscription: boolean;
    subscriptionProductId: string | null;
  } | null> {
    try {
      const { supabase } = await import('./supabaseClient');
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return null;
      }

      const { data, error } = await supabase.rpc('get_user_verification_status_complete', {
        p_user_id: user.id
      });

      if (error) {
        console.error('Error getting verification status:', error);
        return null;
      }

      return {
        isVerified: data?.is_verified || false,
        verificationStatus: data?.verification_status || 'not_verified',
        verifiedAt: data?.verified_at || null,
        verificationExpiresAt: data?.verification_expires_at || null,
        hasActiveSubscription: data?.has_active_subscription || false,
        subscriptionProductId: data?.subscription_product_id || null,
      };
    } catch (error) {
      console.error('Error getting verification status:', error);
      return null;
    }
  }

  // Restore purchases
  async restorePurchases(): Promise<Purchase[]> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      const purchases = await getAvailablePurchases();
      return purchases;
    } catch (error) {
      console.error('Error restoring purchases:', error);
      throw error;
    }
  }

  // Clean up resources
  async cleanup() {
    try {
      if (this.purchaseUpdateSubscription) {
        this.purchaseUpdateSubscription.remove();
        this.purchaseUpdateSubscription = null;
      }

      if (this.purchaseErrorSubscription) {
        this.purchaseErrorSubscription.remove();
        this.purchaseErrorSubscription = null;
      }

      await endConnection();
      this.isInitialized = false;
    } catch (error) {
      console.error('Error cleaning up subscription service:', error);
    }
  }
}

// Export singleton instance
export const subscriptionService = new SubscriptionService();
export default subscriptionService;
