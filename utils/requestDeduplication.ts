/**
 * Request Deduplication Utility
 * Prevents duplicate API calls and improves performance
 */

interface PendingRequest<T> {
  promise: Promise<T>;
  timestamp: number;
}

class RequestDeduplicator {
  private pendingRequests = new Map<string, PendingRequest<any>>();
  private readonly REQUEST_TIMEOUT = 30000; // 30 seconds

  /**
   * Deduplicate requests - if a request with the same key is already pending,
   * return the existing promise instead of making a new request
   */
  async deduplicate<T>(
    key: string,
    requestFn: () => Promise<T>,
    timeout?: number
  ): Promise<T> {
    const requestTimeout = timeout || this.REQUEST_TIMEOUT;
    const now = Date.now();

    // Check if there's already a pending request
    const existing = this.pendingRequests.get(key);
    if (existing) {
      // Check if the existing request is still valid (not timed out)
      if (now - existing.timestamp < requestTimeout) {
        return existing.promise;
      } else {
        // Remove timed out request
        this.pendingRequests.delete(key);
      }
    }

    // Create new request
    const promise = requestFn().finally(() => {
      // Clean up after request completes
      this.pendingRequests.delete(key);
    });

    // Store the request
    this.pendingRequests.set(key, {
      promise,
      timestamp: now
    });

    return promise;
  }

  /**
   * Clear all pending requests
   */
  clear(): void {
    this.pendingRequests.clear();
  }

  /**
   * Get current pending requests count
   */
  getPendingCount(): number {
    return this.pendingRequests.size;
  }

  /**
   * Get all pending request keys
   */
  getPendingKeys(): string[] {
    return Array.from(this.pendingRequests.keys());
  }

  /**
   * Remove specific pending request
   */
  remove(key: string): boolean {
    return this.pendingRequests.delete(key);
  }
}

// Global instance
export const requestDeduplicator = new RequestDeduplicator();

/**
 * Hook for using request deduplication in components
 */
export const useRequestDeduplication = () => {
  const deduplicate = React.useCallback(
    <T>(key: string, requestFn: () => Promise<T>, timeout?: number) => {
      return requestDeduplicator.deduplicate(key, requestFn, timeout);
    },
    []
  );

  return { deduplicate };
};

/**
 * Higher-order function to wrap API calls with deduplication
 */
export function withDeduplication<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  keyGenerator: (...args: T) => string
) {
  return async (...args: T): Promise<R> => {
    const key = keyGenerator(...args);
    return requestDeduplicator.deduplicate(key, () => fn(...args));
  };
}

/**
 * Utility to generate cache keys for different types of requests
 */
export const cacheKeys = {
  // Listings
  listings: (page: number, filters: any) => 
    `listings_${page}_${JSON.stringify(filters)}`,
  
  // User profile
  userProfile: (username: string) => 
    `user_profile_${username}`,
  
  // Chat messages
  chatMessages: (chatId: string, page: number) => 
    `chat_messages_${chatId}_${page}`,
  
  // User activities
  userActivities: (username: string, page: number) => 
    `user_activities_${username}_${page}`,
  
  // Ping data
  pingData: (username: string, status?: string) => 
    `ping_data_${username}_${status || 'all'}`,
  
  // Rewards data
  rewardsData: (username: string) => 
    `rewards_data_${username}`,
  
  // Location-based listings
  locationListings: (lat: number, lng: number, radius: number, page: number) => 
    `location_listings_${lat.toFixed(3)}_${lng.toFixed(3)}_${radius}_${page}`,
};

/**
 * Optimized API wrapper with built-in deduplication
 */
export const optimizedApi = {
  // Listings
  async getListings(page: number, filters: any = {}) {
    const key = cacheKeys.listings(page, filters);
    return requestDeduplicator.deduplicate(key, async () => {
      // Your actual API call here
      const response = await supabase
        .from('listings')
        .select('*')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .range((page - 1) * 20, page * 20 - 1);
      return response.data;
    });
  },

  // User profile
  async getUserProfile(username: string) {
    const key = cacheKeys.userProfile(username);
    return requestDeduplicator.deduplicate(key, async () => {
      const response = await supabase
        .from('users')
        .select('*')
        .eq('username', username)
        .single();
      return response.data;
    });
  },

  // Chat messages
  async getChatMessages(chatId: string, page = 1) {
    const key = cacheKeys.chatMessages(chatId, page);
    return requestDeduplicator.deduplicate(key, async () => {
      const response = await supabase
        .from('messages')
        .select('*')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: false })
        .range((page - 1) * 50, page * 50 - 1);
      return response.data;
    });
  },

  // User activities
  async getUserActivities(username: string, page = 1) {
    const key = cacheKeys.userActivities(username, page);
    return requestDeduplicator.deduplicate(key, async () => {
      const response = await supabase
        .from('activities')
        .select('*')
        .eq('username', username)
        .order('created_at', { ascending: false })
        .range((page - 1) * 20, page * 20 - 1);
      return response.data;
    });
  },

  // Ping data
  async getPingData(username: string, status?: string) {
    const key = cacheKeys.pingData(username, status);
    return requestDeduplicator.deduplicate(key, async () => {
      let query = supabase
        .from('pings')
        .select('*')
        .eq('sender_username', username);
      
      if (status) {
        query = query.eq('status', status);
      }
      
      const response = await query.order('created_at', { ascending: false });
      return response.data;
    });
  },

  // Rewards data
  async getRewardsData(username: string) {
    const key = cacheKeys.rewardsData(username);
    return requestDeduplicator.deduplicate(key, async () => {
      const [rewards, streaks, achievements] = await Promise.all([
        supabase.from('user_rewards').select('*').eq('username', username).single(),
        supabase.from('user_streaks').select('*').eq('username', username).single(),
        supabase.from('user_achievements').select('*').eq('username', username)
      ]);
      
      return {
        rewards: rewards.data,
        streaks: streaks.data,
        achievements: achievements.data
      };
    });
  },
};

// Import supabase client (you'll need to adjust this import based on your setup)
import { supabase } from './supabaseClient';
import React from 'react'; 