import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabaseClient';

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  accessCount: number;
  lastAccessed: number;
}

export interface CacheStats {
  totalEntries: number;
  totalSize: number;
  hitRate: number;
  memoryUsage: number;
}

export class EnhancedCacheManager {
  private static instance: EnhancedCacheManager;
  private cachePrefix = 'enhanced_cache_';
  private maxCacheSize = 100 * 1024 * 1024; // 100MB
  private maxEntries = 1000;
  private stats = {
    hits: 0,
    misses: 0,
    totalRequests: 0,
  };

  static getInstance(): EnhancedCacheManager {
    if (!EnhancedCacheManager.instance) {
      EnhancedCacheManager.instance = new EnhancedCacheManager();
    }
    return EnhancedCacheManager.instance;
  }

  /**
   * Get cached data with automatic TTL checking
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      this.stats.totalRequests++;
      const cacheKey = this.cachePrefix + this.hashKey(key);
      const cached = await AsyncStorage.getItem(cacheKey);
      
      if (!cached) {
        this.stats.misses++;
        return null;
      }

      const entry: CacheEntry<T> = JSON.parse(cached);
      const now = Date.now();

      // Check if expired
      if (now - entry.timestamp > entry.ttl) {
        await this.delete(key);
        this.stats.misses++;
        return null;
      }

      // Update access stats
      entry.accessCount++;
      entry.lastAccessed = now;
      await AsyncStorage.setItem(cacheKey, JSON.stringify(entry));

      this.stats.hits++;
      return entry.data;
    } catch (error) {
      // Cache get error
      this.stats.misses++;
      return null;
    }
  }

  /**
   * Set cached data with TTL
   */
  async set<T>(key: string, data: T, ttl = 300000): Promise<void> {
    try {
      const cacheKey = this.cachePrefix + this.hashKey(key);
      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        ttl,
        accessCount: 0,
        lastAccessed: Date.now(),
      };

      // Check cache size before adding
      await this.ensureCacheSize();
      
      await AsyncStorage.setItem(cacheKey, JSON.stringify(entry));
    } catch (error) {
      // Cache set error
    }
  }

  /**
   * Delete cached data
   */
  async delete(key: string): Promise<void> {
    try {
      const cacheKey = this.cachePrefix + this.hashKey(key);
      await AsyncStorage.removeItem(cacheKey);
    } catch (error) {
      // Cache delete error
    }
  }

  /**
   * Clear all cached data
   */
  async clear(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith(this.cachePrefix));
      await AsyncStorage.multiRemove(cacheKeys);
    } catch (error) {
      // Cache clear error
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<CacheStats> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith(this.cachePrefix));
      
      let totalSize = 0;
      for (const key of cacheKeys) {
        const value = await AsyncStorage.getItem(key);
        if (value) {
          totalSize += new Blob([value]).size;
        }
      }

      const hitRate = this.stats.totalRequests > 0 
        ? (this.stats.hits / this.stats.totalRequests) * 100 
        : 0;

      return {
        totalEntries: cacheKeys.length,
        totalSize,
        hitRate,
        memoryUsage: totalSize / this.maxCacheSize * 100,
      };
    } catch (error) {
      // Cache stats error
      return {
        totalEntries: 0,
        totalSize: 0,
        hitRate: 0,
        memoryUsage: 0,
      };
    }
  }

  /**
   * Ensure cache doesn't exceed size limits
   */
  private async ensureCacheSize(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith(this.cachePrefix));
      
      if (cacheKeys.length >= this.maxEntries) {
        // Remove least recently used entries
        const entries = await Promise.all(
          cacheKeys.map(async (key) => {
            const value = await AsyncStorage.getItem(key);
            if (value) {
              const entry: CacheEntry<any> = JSON.parse(value);
              return { key, entry };
            }
            return null;
          })
        );

        const validEntries = entries.filter(entry => entry !== null);
        validEntries.sort((a, b) => a!.entry.lastAccessed - b!.entry.lastAccessed);

        // Remove 20% of oldest entries
        const toRemove = Math.ceil(validEntries.length * 0.2);
        const keysToRemove = validEntries.slice(0, toRemove).map(entry => entry!.key);
        
        await AsyncStorage.multiRemove(keysToRemove);
      }
    } catch (error) {
      // Cache size management error
    }
  }

  /**
   * Hash key for consistent storage
   */
  private hashKey(key: string): string {
    return key.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50);
  }

  /**
   * Preload frequently accessed data
   */
  async preloadData(): Promise<void> {
    try {
      // Preload user profile
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const profile = await this.getUserProfile(user.id);
        if (profile) {
          await this.set(`user_profile_${user.id}`, profile, 600000); // 10 minutes
        }
      }

      // Preload categories
      const categories = await this.getCategories();
      if (categories) {
        await this.set('categories', categories, 1800000); // 30 minutes
      }
    } catch (error) {
      // Preload error
    }
  }

  /**
   * Get user profile with caching
   */
  async getUserProfile(userId: string) {
    const cacheKey = `user_profile_${userId}`;
    let profile = await this.get(cacheKey);
    
    if (!profile) {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (data && !error) {
        profile = data;
        await this.set(cacheKey, profile, 600000); // 10 minutes
      }
    }
    
    return profile;
  }

  /**
   * Get categories with caching
   */
  async getCategories() {
    let categories = await this.get('categories');
    
    if (!categories) {
      const { data, error } = await supabase
        .from('listing_analytics')
        .select('category')
        .order('total_listings', { ascending: false });
      
      if (data && !error) {
        categories = data.map(item => item.category);
        await this.set('categories', categories, 1800000); // 30 minutes
      }
    }
    
    return categories;
  }

  /**
   * Cache listings with intelligent invalidation
   */
  async cacheListings(key: string, listings: any[], ttl = 300000) {
    await this.set(key, listings, ttl);
    
    // Also cache individual listings for quick access
    for (const listing of listings) {
      await this.set(`listing_${listing.id}`, listing, ttl);
    }
  }

  /**
   * Invalidate related cache entries
   */
  async invalidateRelated(pattern: string): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => 
        key.startsWith(this.cachePrefix) && key.includes(pattern)
      );
      
      if (cacheKeys.length > 0) {
        await AsyncStorage.multiRemove(cacheKeys);
      }
    } catch (error) {
      // Cache invalidation error
    }
  }

  /**
   * Batch operations for better performance
   */
  async batchGet(keys: string[]): Promise<Map<string, any>> {
    const result = new Map<string, any>();
    
    try {
      const cacheKeys = keys.map(key => this.cachePrefix + this.hashKey(key));
      const values = await AsyncStorage.multiGet(cacheKeys);
      
      for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        const value = values[i][1];
        
        if (value) {
          const entry: CacheEntry<any> = JSON.parse(value);
          const now = Date.now();
          
          if (now - entry.timestamp <= entry.ttl) {
            result.set(key, entry.data);
            this.stats.hits++;
          } else {
            await this.delete(key);
          }
        } else {
          this.stats.misses++;
        }
        
        this.stats.totalRequests++;
      }
    } catch (error) {
      // Batch get error
    }
    
    return result;
  }

  async batchSet(entries: Array<{ key: string; data: any; ttl?: number }>): Promise<void> {
    try {
      await this.ensureCacheSize();
      
      const operations = entries.map(({ key, data, ttl = 300000 }) => {
        const cacheKey = this.cachePrefix + this.hashKey(key);
        const entry: CacheEntry<any> = {
          data,
          timestamp: Date.now(),
          ttl,
          accessCount: 0,
          lastAccessed: Date.now(),
        };
        return [cacheKey, JSON.stringify(entry)] as [string, string];
      });
      
      await AsyncStorage.multiSet(operations);
    } catch (error) {
      // Batch set error
    }
  }
}

// Export singleton instance
export const enhancedCache = EnhancedCacheManager.getInstance(); 