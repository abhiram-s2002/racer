import AsyncStorage from '@react-native-async-storage/async-storage';

// In-memory cache for frequently accessed data
const memoryCache = new Map<string, { data: any; timestamp: number; ttl: number }>();

export class CacheService {
  // Cache TTLs (Time To Live)
  private static readonly TTL = {
    CHAT_COUNT: 5 * 60 * 1000,        // 5 minutes
    UNREAD_COUNTS: 2 * 60 * 1000,     // 2 minutes
    CHAT_LIST: 3 * 60 * 1000,         // 3 minutes
    USER_PROFILES: 10 * 60 * 1000,    // 10 minutes
    MESSAGE_LIST: 1 * 60 * 1000,      // 1 minute
  };

  // Memory cache operations
  static setMemory(key: string, data: any, ttl: number = 5 * 60 * 1000): void {
    memoryCache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  static getMemory(key: string): any | null {
    const cached = memoryCache.get(key);
    if (!cached) return null;

    const isExpired = Date.now() - cached.timestamp > cached.ttl;
    if (isExpired) {
      memoryCache.delete(key);
      return null;
    }

    return cached.data;
  }

  // Persistent cache operations
  static async setPersistent(key: string, data: any): Promise<void> {
    try {
      await AsyncStorage.setItem(key, JSON.stringify({
        data,
        timestamp: Date.now()
      }));
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }

  static async getPersistent(key: string, maxAge: number = 5 * 60 * 1000): Promise<any | null> {
    try {
      const stored = await AsyncStorage.getItem(key);
      if (!stored) return null;

      const parsed = JSON.parse(stored);
      const isExpired = Date.now() - parsed.timestamp > maxAge;
      
      if (isExpired) {
        await AsyncStorage.removeItem(key);
        return null;
      }

      return parsed.data;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  // Smart cache invalidation
  static invalidateUserCache(username: string): void {
    const keysToDelete = Array.from(memoryCache.keys()).filter(key => 
      key.includes(username)
    );
    keysToDelete.forEach(key => memoryCache.delete(key));
  }

  // Batch cache operations for cost reduction
  static async batchGetChatCounts(usernames: string[]): Promise<Record<string, number>> {
    const results: Record<string, number> = {};
    const uncached: string[] = [];

    // Check memory cache first
    for (const username of usernames) {
      const cached = this.getMemory(`chat_count_${username}`);
      if (cached !== null) {
        results[username] = cached;
      } else {
        uncached.push(username);
      }
    }

    // Only query database for uncached users
    if (uncached.length > 0) {
      console.log('🔍 [CacheService] Batch querying', uncached.length, 'users from database');
      // This would be a single database call for multiple users
      // Implementation depends on your database structure
    }

    return results;
  }

  // Cache warming for active users
  static async warmCacheForActiveUsers(activeUsernames: string[]): Promise<void> {
    console.log('🔥 [CacheService] Warming cache for', activeUsernames.length, 'active users');
    
    // Pre-load frequently accessed data for active users
    for (const username of activeUsernames) {
      // Pre-load chat counts, recent chats, etc.
      // This reduces cold cache misses
    }
  }
}
