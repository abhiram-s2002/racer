// Custom hook for managing subscriptions
// Provides easy access to subscription functionality throughout the app

import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import subscriptionService, { 
  SUBSCRIPTION_PRODUCTS, 
  type SubscriptionStatus,
  type SubscriptionError 
} from '../utils/subscriptionService';
import type { Subscription, Purchase } from 'react-native-iap';

interface UseSubscriptionReturn {
  // State
  isLoading: boolean;
  isInitialized: boolean;
  subscriptions: Subscription[];
  currentSubscriptions: Purchase[];
  hasActiveSubscription: boolean;
  error: string | null;

  // Actions
  initialize: () => Promise<void>;
  loadSubscriptions: () => Promise<void>;
  purchaseSubscription: (productId: string) => Promise<void>;
  restorePurchases: () => Promise<void>;
  checkSubscriptionStatus: (productId: string) => Promise<SubscriptionStatus | null>;
  clearError: () => void;
}

export function useSubscription(): UseSubscriptionReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [currentSubscriptions, setCurrentSubscriptions] = useState<Purchase[]>([]);
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize subscription service
  const initialize = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const success = await subscriptionService.initialize();
      setIsInitialized(success);
      
      if (success) {
        // Load available subscriptions
        await loadSubscriptions();
        // Check current subscriptions
        await checkCurrentSubscriptions();
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to initialize subscriptions';
      setError(errorMessage);
      console.error('Subscription initialization error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load available subscription products
  const loadSubscriptions = useCallback(async () => {
    try {
      setError(null);
      const availableSubscriptions = await subscriptionService.getAvailableSubscriptions();
      setSubscriptions(availableSubscriptions);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load subscriptions';
      setError(errorMessage);
      console.error('Error loading subscriptions:', err);
    }
  }, []);

  // Check current user subscriptions
  const checkCurrentSubscriptions = useCallback(async () => {
    try {
      const purchases = await subscriptionService.getCurrentSubscriptions();
      setCurrentSubscriptions(purchases);
      setHasActiveSubscription(purchases.length > 0);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to check subscriptions';
      setError(errorMessage);
      console.error('Error checking current subscriptions:', err);
    }
  }, []);

  // Purchase a subscription
  const purchaseSubscription = useCallback(async (productId: string) => {
    try {
      setIsLoading(true);
      setError(null);

      // Validate product ID
      if (!Object.values(SUBSCRIPTION_PRODUCTS).includes(productId as any)) {
        throw new Error('Invalid subscription product');
      }

      // Request the subscription
      const result = await subscriptionService.requestSubscription(productId);
      
      if (result && typeof result === 'object' && 'responseCode' in result && result.responseCode === 0) {
        // Success - the purchase will be handled by the purchase listener
        Alert.alert(
          'Success!',
          'Your subscription has been activated. You now have access to verified features.',
          [{ text: 'OK' }]
        );
        
        // Refresh current subscriptions
        await checkCurrentSubscriptions();
      } else {
        throw new Error('Purchase failed');
      }
    } catch (err) {
      let errorMessage = 'Failed to purchase subscription';
      
      if (err instanceof Error) {
        if (err.message.includes('cancelled') || err.message.includes('canceled')) {
          // User cancelled - don't show error
          return;
        }
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      Alert.alert(
        'Purchase Failed',
        errorMessage,
        [{ text: 'OK' }]
      );
      console.error('Purchase error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [checkCurrentSubscriptions]);

  // Restore previous purchases
  const restorePurchases = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const purchases = await subscriptionService.restorePurchases();
      setCurrentSubscriptions(purchases);
      setHasActiveSubscription(purchases.length > 0);

      if (purchases.length > 0) {
        Alert.alert(
          'Purchases Restored',
          'Your previous purchases have been restored successfully.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          'No Purchases Found',
          'No previous purchases were found to restore.',
          [{ text: 'OK' }]
        );
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to restore purchases';
      setError(errorMessage);
      Alert.alert(
        'Restore Failed',
        errorMessage,
        [{ text: 'OK' }]
      );
      console.error('Restore purchases error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Check subscription status for a specific product
  const checkSubscriptionStatus = useCallback(async (productId: string): Promise<SubscriptionStatus | null> => {
    try {
      return await subscriptionService.getSubscriptionStatus(productId);
    } catch (err) {
      console.error('Error checking subscription status:', err);
      return null;
    }
  }, []);

  // Clear error state
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Initialize on mount
  useEffect(() => {
    initialize();
  }, [initialize]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      subscriptionService.cleanup();
    };
  }, []);

  return {
    // State
    isLoading,
    isInitialized,
    subscriptions,
    currentSubscriptions,
    hasActiveSubscription,
    error,

    // Actions
    initialize,
    loadSubscriptions,
    purchaseSubscription,
    restorePurchases,
    checkSubscriptionStatus,
    clearError,
  };
}

// Helper hook for checking if user has specific subscription
export function useSubscriptionStatus(productId: string) {
  const [status, setStatus] = useState<SubscriptionStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { checkSubscriptionStatus } = useSubscription();

  const checkStatus = useCallback(async () => {
    try {
      setIsLoading(true);
      const subscriptionStatus = await checkSubscriptionStatus(productId);
      setStatus(subscriptionStatus);
    } catch (error) {
      console.error('Error checking subscription status:', error);
      setStatus(null);
    } finally {
      setIsLoading(false);
    }
  }, [productId, checkSubscriptionStatus]);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  return {
    status,
    isLoading,
    isActive: status?.isActive || false,
    checkStatus,
  };
}

export default useSubscription;
