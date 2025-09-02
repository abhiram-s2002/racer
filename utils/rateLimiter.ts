import AsyncStorage from '@react-native-async-storage/async-storage';

interface RateLimitConfig {
  maxCalls: number;
  timeWindow: number; // milliseconds
  cooldownPeriod: number; // milliseconds
}

interface UserRateLimit {
  username: string;
  calls: number;
  lastReset: number;
  lastCall: number;
  isBlocked: boolean;
  blockUntil: number;
}

export class RateLimiter {
  private static readonly DEFAULT_CONFIGS: Record<string, RateLimitConfig> = {
    // Database call limits per user
    'chat_count': { maxCalls: 10, timeWindow: 60000, cooldownPeriod: 300000 },      // 10 calls per minute, 5min cooldown
    'unread_count': { maxCalls: 20, timeWindow: 60000, cooldownPeriod: 300000 },    // 20 calls per minute, 5min cooldown
    'chat_list': { maxCalls: 5, timeWindow: 60000, cooldownPeriod: 600000 },        // 5 calls per minute, 10min cooldown
    'user_profile': { maxCalls: 3, timeWindow: 60000, cooldownPeriod: 900000 },     // 3 calls per minute, 15min cooldown
    'message_send': { maxCalls: 30, timeWindow: 60000, cooldownPeriod: 300000 },    // 30 messages per minute, 5min cooldown
    
    // Global app limits
    'global_db_calls': { maxCalls: 1000, timeWindow: 60000, cooldownPeriod: 600000 }, // 1000 calls per minute, 10min cooldown
    'global_api_calls': { maxCalls: 5000, timeWindow: 60000, cooldownPeriod: 300000 }, // 5000 API calls per minute, 5min cooldown
  };

  private static userLimits = new Map<string, UserRateLimit>();
  private static globalLimits = new Map<string, { calls: number; lastReset: number }>();

  // Check if user can make a specific type of call
  static async canMakeCall(username: string, callType: string): Promise<boolean> {
    const config = this.DEFAULT_CONFIGS[callType];
    if (!config) return true; // No limit for unknown types

    const userLimit = await this.getUserLimit(username, callType);
    const now = Date.now();

    // Check if user is blocked
    if (userLimit.isBlocked && now < userLimit.blockUntil) {
      console.log(`🚫 [RateLimiter] User ${username} blocked for ${callType} until ${new Date(userLimit.blockUntil)}`);
      return false;
    }

    // Reset counter if time window has passed
    if (now - userLimit.lastReset > config.timeWindow) {
      userLimit.calls = 0;
      userLimit.lastReset = now;
      userLimit.isBlocked = false;
    }

    // Check if user has exceeded limit
    if (userLimit.calls >= config.maxCalls) {
      // Block user for cooldown period
      userLimit.isBlocked = true;
      userLimit.blockUntil = now + config.cooldownPeriod;
      console.log(`🚫 [RateLimiter] User ${username} exceeded limit for ${callType}, blocked for ${config.cooldownPeriod/1000}s`);
      return false;
    }

    // Increment call count
    userLimit.calls++;
    userLimit.lastCall = now;
    await this.saveUserLimit(username, callType, userLimit);

    return true;
  }

  // Check global limits
  static canMakeGlobalCall(callType: string): boolean {
    const config = this.DEFAULT_CONFIGS[callType];
    if (!config) return true;

    const globalLimit = this.globalLimits.get(callType) || { calls: 0, lastReset: Date.now() };
    const now = Date.now();

    // Reset counter if time window has passed
    if (now - globalLimit.lastReset > config.timeWindow) {
      globalLimit.calls = 0;
      globalLimit.lastReset = now;
    }

    // Check if global limit exceeded
    if (globalLimit.calls >= config.maxCalls) {
      console.log(`🚫 [RateLimiter] Global limit exceeded for ${callType}`);
      return false;
    }

    // Increment call count
    globalLimit.calls++;
    this.globalLimits.set(callType, globalLimit);

    return true;
  }

  // Get user's current limit status
  private static async getUserLimit(username: string, callType: string): Promise<UserRateLimit> {
    const key = `rate_limit_${username}_${callType}`;
    const stored = await AsyncStorage.getItem(key);
    
    if (stored) {
      return JSON.parse(stored);
    }

    // Create new limit
    const newLimit: UserRateLimit = {
      username,
      calls: 0,
      lastReset: Date.now(),
      lastCall: 0,
      isBlocked: false,
      blockUntil: 0
    };

    await this.saveUserLimit(username, callType, newLimit);
    return newLimit;
  }

  // Save user limit to storage
  private static async saveUserLimit(username: string, callType: string, limit: UserRateLimit): Promise<void> {
    const key = `rate_limit_${username}_${callType}`;
    await AsyncStorage.setItem(key, JSON.stringify(limit));
  }

  // Get remaining calls for user
  static async getRemainingCalls(username: string, callType: string): Promise<number> {
    const config = this.DEFAULT_CONFIGS[callType];
    if (!config) return Infinity;

    const userLimit = await this.getUserLimit(username, callType);
    const now = Date.now();

    // Reset counter if time window has passed
    if (now - userLimit.lastReset > config.timeWindow) {
      return config.maxCalls;
    }

    return Math.max(0, config.maxCalls - userLimit.calls);
  }

  // Reset user limits (for testing or admin use)
  static async resetUserLimits(username: string): Promise<void> {
    for (const callType of Object.keys(this.DEFAULT_CONFIGS)) {
      const key = `rate_limit_${username}_${callType}`;
      await AsyncStorage.removeItem(key);
    }
    console.log(`🔄 [RateLimiter] Reset limits for user ${username}`);
  }

  // Get rate limit statistics
  static async getRateLimitStats(): Promise<Record<string, any>> {
    const stats: Record<string, any> = {};
    
    for (const [callType, config] of Object.entries(this.DEFAULT_CONFIGS)) {
      const globalLimit = this.globalLimits.get(callType);
      stats[callType] = {
        config,
        global: globalLimit || { calls: 0, lastReset: Date.now() },
        userCount: this.userLimits.size
      };
    }

    return stats;
  }
}

// Decorator for automatic rate limiting
export function rateLimit(callType: string) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      // Extract username from method context or arguments
      let username = 'anonymous';
      
      // Check if the instance has a username property
      if (this && typeof this === 'object' && 'username' in this && typeof this.username === 'string') {
        username = this.username;
      } else if (args[0]?.username && typeof args[0].username === 'string') {
        username = args[0].username;
      }

      // Check rate limit
      if (!(await RateLimiter.canMakeCall(username, callType))) {
        throw new Error(`Rate limit exceeded for ${callType}. Please wait before trying again.`);
      }

      // Check global limit
      if (!RateLimiter.canMakeGlobalCall(callType)) {
        throw new Error(`Global rate limit exceeded for ${callType}. Please try again later.`);
      }

      // Execute original method
      return method.apply(this, args);
    };

    return descriptor;
  };
}
