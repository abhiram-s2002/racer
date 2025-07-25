import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabaseClient';

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  keyPrefix: string;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
}

export class AdvancedRateLimiter {
  private static instance: AdvancedRateLimiter;
  private storagePrefix = 'rate_limit_';
  private defaultConfigs: Map<string, RateLimitConfig> = new Map([
    ['auth', { maxRequests: 5, windowMs: 300000, keyPrefix: 'auth' }], // 5 requests per 5 minutes
    ['ping', { maxRequests: 10, windowMs: 60000, keyPrefix: 'ping' }], // 10 pings per minute
    ['listing', { maxRequests: 20, windowMs: 300000, keyPrefix: 'listing' }], // 20 listings per 5 minutes
    ['message', { maxRequests: 30, windowMs: 60000, keyPrefix: 'message' }], // 30 messages per minute
    ['upload', { maxRequests: 5, windowMs: 60000, keyPrefix: 'upload' }], // 5 uploads per minute
    ['api', { maxRequests: 100, windowMs: 60000, keyPrefix: 'api' }], // 100 API calls per minute
  ]);

  static getInstance(): AdvancedRateLimiter {
    if (!AdvancedRateLimiter.instance) {
      AdvancedRateLimiter.instance = new AdvancedRateLimiter();
    }
    return AdvancedRateLimiter.instance;
  }

  /**
   * Check if request is allowed based on rate limit
   */
  async checkRateLimit(
    key: string,
    type: string = 'api',
    customConfig?: Partial<RateLimitConfig>
  ): Promise<RateLimitResult> {
    try {
      const defaultConfig = this.defaultConfigs.get(type);
      if (!defaultConfig) {
        return { allowed: true, remaining: 999, resetTime: Date.now() };
      }
      
      const config = { ...defaultConfig, ...customConfig };

      const rateKey = `${this.storagePrefix}${config.keyPrefix}_${this.hashKey(key)}`;
      const now = Date.now();
      const windowStart = now - config.windowMs;

      // Get current rate limit data
      const rateData = await this.getRateLimitData(rateKey);
      
      // Clean old requests outside the window
      const validRequests = rateData.requests.filter(timestamp => timestamp > windowStart);
      
      if (validRequests.length >= config.maxRequests) {
        const oldestRequest = Math.min(...validRequests);
        const retryAfter = oldestRequest + config.windowMs - now;
        
        return {
          allowed: false,
          remaining: 0,
          resetTime: oldestRequest + config.windowMs,
          retryAfter: Math.max(0, retryAfter),
        };
      }

      // Add current request
      validRequests.push(now);
      await this.setRateLimitData(rateKey, validRequests);

      return {
        allowed: true,
        remaining: config.maxRequests - validRequests.length,
        resetTime: now + config.windowMs,
      };
    } catch (error) {
      console.error('Rate limit check error:', error);
      // Allow request on error to prevent blocking users
      return { allowed: true, remaining: 999, resetTime: Date.now() };
    }
  }

  /**
   * Check rate limit with user context
   */
  async checkUserRateLimit(
    userId: string,
    type: string = 'api',
    customConfig?: Partial<RateLimitConfig>
  ): Promise<RateLimitResult> {
    return this.checkRateLimit(`user_${userId}`, type, customConfig);
  }

  /**
   * Check rate limit with IP context (for server-side)
   */
  async checkIPRateLimit(
    ip: string,
    type: string = 'api',
    customConfig?: Partial<RateLimitConfig>
  ): Promise<RateLimitResult> {
    return this.checkRateLimit(`ip_${ip}`, type, customConfig);
  }

  /**
   * Get rate limit data from storage
   */
  private async getRateLimitData(key: string): Promise<{ requests: number[] }> {
    try {
      const data = await AsyncStorage.getItem(key);
      if (data) {
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('Get rate limit data error:', error);
    }
    return { requests: [] };
  }

  /**
   * Set rate limit data to storage
   */
  private async setRateLimitData(key: string, requests: number[]): Promise<void> {
    try {
      await AsyncStorage.setItem(key, JSON.stringify({ requests }));
    } catch (error) {
      console.error('Set rate limit data error:', error);
    }
  }

  /**
   * Hash key for consistent storage
   */
  private hashKey(key: string): string {
    return key.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50);
  }

  /**
   * Clean up expired rate limit data
   */
  async cleanupExpiredData(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const rateLimitKeys = keys.filter(key => key.startsWith(this.storagePrefix));
      
      for (const key of rateLimitKeys) {
        const data = await this.getRateLimitData(key);
        const now = Date.now();
        
        // Remove data older than 1 hour
        const validRequests = data.requests.filter(timestamp => now - timestamp < 3600000);
        
        if (validRequests.length === 0) {
          await AsyncStorage.removeItem(key);
        } else if (validRequests.length !== data.requests.length) {
          await this.setRateLimitData(key, validRequests);
        }
      }
    } catch (error) {
      console.error('Cleanup rate limit data error:', error);
    }
  }

  /**
   * Get rate limit statistics
   */
  async getStats(): Promise<{ totalKeys: number; totalRequests: number }> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const rateLimitKeys = keys.filter(key => key.startsWith(this.storagePrefix));
      
      let totalRequests = 0;
      for (const key of rateLimitKeys) {
        const data = await this.getRateLimitData(key);
        totalRequests += data.requests.length;
      }
      
      return {
        totalKeys: rateLimitKeys.length,
        totalRequests,
      };
    } catch (error) {
      console.error('Get rate limit stats error:', error);
      return { totalKeys: 0, totalRequests: 0 };
    }
  }

  /**
   * Reset rate limit for a specific key
   */
  async resetRateLimit(key: string, type: string = 'api'): Promise<void> {
    try {
      const config = this.defaultConfigs.get(type);
      if (!config) return;
      
      const rateKey = `${this.storagePrefix}${config.keyPrefix}_${this.hashKey(key)}`;
      await AsyncStorage.removeItem(rateKey);
    } catch (error) {
      console.error('Reset rate limit error:', error);
    }
  }

  /**
   * Check if user is rate limited for authentication
   */
  async checkAuthRateLimit(userId: string): Promise<RateLimitResult> {
    return this.checkUserRateLimit(userId, 'auth', {
      maxRequests: 3, // 3 attempts per 5 minutes
      windowMs: 300000,
    });
  }

  /**
   * Check if user can send a ping
   */
  async checkPingRateLimit(userId: string): Promise<RateLimitResult> {
    return this.checkUserRateLimit(userId, 'ping', {
      maxRequests: 5, // 5 pings per minute
      windowMs: 60000,
    });
  }

  /**
   * Check if user can upload images
   */
  async checkUploadRateLimit(userId: string): Promise<RateLimitResult> {
    return this.checkUserRateLimit(userId, 'upload', {
      maxRequests: 3, // 3 uploads per minute
      windowMs: 60000,
    });
  }

  /**
   * Check if user can create listings
   */
  async checkListingRateLimit(userId: string): Promise<RateLimitResult> {
    return this.checkUserRateLimit(userId, 'listing', {
      maxRequests: 5, // 5 listings per 5 minutes
      windowMs: 300000,
    });
  }

  /**
   * Check if user can send messages
   */
  async checkMessageRateLimit(userId: string): Promise<RateLimitResult> {
    return this.checkUserRateLimit(userId, 'message', {
      maxRequests: 20, // 20 messages per minute
      windowMs: 60000,
    });
  }

  /**
   * Server-side rate limiting with database
   */
  async checkServerRateLimit(
    key: string,
    maxRequests: number = 30,
    windowMinutes: number = 5
  ): Promise<RateLimitResult> {
    try {
      const { data, error } = await supabase.rpc('check_rate_limit', {
        rate_key: key,
        max_requests: maxRequests,
        window_minutes: windowMinutes,
      });

      if (error) {
        console.error('Server rate limit check error:', error);
        return { allowed: true, remaining: 999, resetTime: Date.now() };
      }

      return {
        allowed: data,
        remaining: data ? maxRequests - 1 : 0,
        resetTime: Date.now() + (windowMinutes * 60 * 1000),
      };
    } catch (error) {
      console.error('Server rate limit error:', error);
      return { allowed: true, remaining: 999, resetTime: Date.now() };
    }
  }

  /**
   * Get rate limit headers for API responses
   */
  getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
    return {
      'X-RateLimit-Limit': '100',
      'X-RateLimit-Remaining': result.remaining.toString(),
      'X-RateLimit-Reset': result.resetTime.toString(),
      ...(result.retryAfter && { 'Retry-After': Math.ceil(result.retryAfter / 1000).toString() }),
    };
  }

  /**
   * Check if request should be blocked based on suspicious patterns
   */
  async checkSuspiciousActivity(userId: string): Promise<boolean> {
    try {
      // Check for rapid-fire requests
      const pingResult = await this.checkPingRateLimit(userId);
      const messageResult = await this.checkMessageRateLimit(userId);
      const uploadResult = await this.checkUploadRateLimit(userId);

      // Block if multiple rate limits are exceeded
      const exceededLimits = [pingResult, messageResult, uploadResult]
        .filter(result => !result.allowed).length;

      return exceededLimits >= 2;
    } catch (error) {
      console.error('Suspicious activity check error:', error);
      return false;
    }
  }

  /**
   * Apply rate limiting to API calls
   */
  async withRateLimit<T>(
    operation: () => Promise<T>,
    userId: string,
    type: string = 'api'
  ): Promise<T> {
    const rateLimit = await this.checkUserRateLimit(userId, type);
    
    if (!rateLimit.allowed) {
      throw new Error(`Rate limit exceeded. Try again in ${Math.ceil((rateLimit.retryAfter || 0) / 1000)} seconds.`);
    }
    
    return operation();
  }
}

// Export singleton instance
export const advancedRateLimiter = AdvancedRateLimiter.getInstance(); 