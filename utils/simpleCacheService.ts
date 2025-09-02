import AsyncStorage from '@react-native-async-storage/async-storage';

// Simple in-memory cache for 10k users
const memoryCache = new Map<string, { data: any; timestamp: number; ttl: number }>();

export class SimpleCacheService {
  // Optimized TTLs for 10k users (longer cache times = fewer DB calls)
  private static readonly TTL = {
    CHAT_COUNT: 10 * 60 * 1000,        // 10 minutes (was 5)
    UNREAD_COUNTS: 5 * 60 * 1000,      // 5 minutes (was 2)
    CHAT_LIST: 8 * 60 * 1000,          // 8 minutes (was 3)
    USER_PROFILES: 20 * 60 * 1000,     // 20 minutes (was 10)
    MESSAGE_LIST: 3 * 60 * 1000,       // 3 minutes (was 1)
  };

  // Set data in memory cache
  static set(key: string, data: any, ttl: number = 10 * 60 * 1000): void {
    memoryCache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
    console.log(`💾 [SimpleCache] Cached ${key} for ${ttl/1000}s`);
  }

  // Get data from memory cache
  static get(key: string): any | null {
    const cached = memoryCache.get(key);
    if (!cached) return null;

    const isExpired = Date.now() - cached.timestamp > cached.ttl;
    if (isExpired) {
      memoryCache.delete(key);
      console.log(`⏰ [SimpleCache] Cache expired for ${key}`);
      return null;
    }

    console.log(`✅ [SimpleCache] Cache hit for ${key}`);
    return cached.data;
  }

  // Set data in persistent storage (AsyncStorage)
  static async setPersistent(key: string, data: any, maxAge: number = 20 * 60 * 1000): Promise<void> {
    try {
      await AsyncStorage.setItem(key, JSON.stringify({
        data,
        timestamp: Date.now()
      }));
      console.log(`💾 [SimpleCache] Persistent cached ${key} for ${maxAge/1000}s`);
    } catch (error) {
      console.error('❌ [SimpleCache] Persistent cache set error:', error);
    }
  }

  // Get data from persistent storage
  static async getPersistent(key: string, maxAge: number = 20 * 60 * 1000): Promise<any | null> {
    try {
      const stored = await AsyncStorage.getItem(key);
      if (!stored) return null;

      const parsed = JSON.parse(stored);
      const isExpired = Date.now() - parsed.timestamp > maxAge;
      
      if (isExpired) {
        await AsyncStorage.removeItem(key);
        console.log(`⏰ [SimpleCache] Persistent cache expired for ${key}`);
        return null;
      }

      console.log(`✅ [SimpleCache] Persistent cache hit for ${key}`);
      return parsed.data;
    } catch (error) {
      console.error('❌ [SimpleCache] Persistent cache get error:', error);
      return null;
    }
  }

  // Smart cache invalidation for specific user
  static invalidateUserCache(username: string): void {
    const keysToDelete = Array.from(memoryCache.keys()).filter(key => 
      key.includes(username)
    );
    keysToDelete.forEach(key => {
      memoryCache.delete(key);
      console.log(`🗑️ [SimpleCache] Invalidated cache for ${key}`);
    });
  }

  // Get cache statistics
  static getStats(): { memorySize: number; memoryKeys: string[] } {
    return {
      memorySize: memoryCache.size,
      memoryKeys: Array.from(memoryCache.keys())
    };
  }

  // Clear all caches (for testing or memory management)
  static clearAll(): void {
    memoryCache.clear();
    console.log('🧹 [SimpleCache] All memory caches cleared');
  }

  // Get TTL for specific cache type
  static getTTL(cacheType: keyof typeof SimpleCacheService.TTL): number {
    return this.TTL[cacheType];
  }
}
