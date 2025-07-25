import AsyncStorage from '@react-native-async-storage/async-storage';
import { SecureStorage } from './encryption';

interface CacheConfig {
  ttl: number; // Time to live in seconds
  encrypted?: boolean; // Whether to encrypt the cached data
}

interface CacheItem<T> {
  data: T;
  timestamp: number;
  version: string;
}

interface MemoryCacheItem<T> extends CacheItem<T> {
  hits: number; // Track cache hits for optimization
}

// Default configurations for different cache types
const DEFAULT_CACHE_CONFIG: Record<string, CacheConfig> = {
  API: { ttl: 300, encrypted: false }, // 5 minutes for API responses
  USER: { ttl: 3600, encrypted: true }, // 1 hour for user data
  LOCATION: { ttl: 900, encrypted: false }, // 15 minutes for location
  LISTINGS: { ttl: 30, encrypted: false }, // 30 seconds for listings
  MESSAGES: { ttl: 3600, encrypted: true }, // 1 hour for messages
  IMAGES: { ttl: 86400, encrypted: false }, // 24 hours for images
};

class CacheManager {
  private static instance: CacheManager;
  private memoryCache: Map<string, MemoryCacheItem<any>>;
  private readonly APP_VERSION: string = '1.0.0'; // Should match your app version

  private constructor() {
    this.memoryCache = new Map();
  }

  public static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager();
    }
    return CacheManager.instance;
  }

  // Generate a unique cache key
  private generateKey(key: string, type: keyof typeof DEFAULT_CACHE_CONFIG): string {
    return `cache_${type.toLowerCase()}_${key}`;
  }

  // Check if cache is valid
  private isCacheValid<T>(cache: CacheItem<T>, ttl: number): boolean {
    const now = Date.now();
    return (
      cache &&
      cache.version === this.APP_VERSION &&
      now - cache.timestamp < ttl * 1000
    );
  }

  // Memory cache operations
  private async getFromMemory<T>(key: string): Promise<T | null> {
    const item = this.memoryCache.get(key);
    if (item && this.isCacheValid(item, DEFAULT_CACHE_CONFIG.API.ttl)) {
      item.hits++;
      return item.data;
    }
    return null;
  }

  private setToMemory<T>(key: string, data: T): void {
    this.memoryCache.set(key, {
      data,
      timestamp: Date.now(),
      version: this.APP_VERSION,
      hits: 1,
    });
  }

  // Persistent storage operations
  private async getFromStorage<T>(
    key: string,
    config: CacheConfig
  ): Promise<T | null> {
    try {
      let cached: string | null;
      
      if (config.encrypted) {
        cached = await SecureStorage.getEncryptedItem(key);
      } else {
        cached = await AsyncStorage.getItem(key);
      }
      
      if (!cached) return null;
      
      const item: CacheItem<T> = JSON.parse(cached);
      
      if (this.isCacheValid(item, config.ttl)) {
        return item.data;
      }
      
      // Clean up expired cache
      if (config.encrypted) {
        await SecureStorage.removeEncryptedItem(key);
      } else {
        await AsyncStorage.removeItem(key);
      }
      return null;
    } catch (error) {
      console.error('Cache read error:', error);
      return null;
    }
  }

  private async setToStorage<T>(
    key: string,
    data: T,
    config: CacheConfig
  ): Promise<void> {
    try {
      const item: CacheItem<T> = {
        data,
        timestamp: Date.now(),
        version: this.APP_VERSION,
      };
      
      if (config.encrypted) {
        await SecureStorage.setEncryptedItem(key, item);
      } else {
        await AsyncStorage.setItem(key, JSON.stringify(item));
      }
    } catch (error) {
      console.error('Cache write error:', error);
    }
  }

  // Public methods
  public async get<T>(
    key: string,
    type: keyof typeof DEFAULT_CACHE_CONFIG
  ): Promise<T | null> {
    const cacheKey = this.generateKey(key, type);
    const config = DEFAULT_CACHE_CONFIG[type];

    // Try memory cache first for API responses
    if (type === 'API') {
      const memoryData = await this.getFromMemory<T>(cacheKey);
      if (memoryData) return memoryData;
    }

    // Try persistent storage
    return await this.getFromStorage<T>(cacheKey, config);
  }

  public async set<T>(
    key: string,
    data: T,
    type: keyof typeof DEFAULT_CACHE_CONFIG
  ): Promise<void> {
    const cacheKey = this.generateKey(key, type);
    const config = DEFAULT_CACHE_CONFIG[type];

    // Store in memory if it's an API response
    if (type === 'API') {
      this.setToMemory(cacheKey, data);
    }

    // Store in persistent storage
    await this.setToStorage(cacheKey, data, config);
  }

  public async remove(
    key: string,
    type: keyof typeof DEFAULT_CACHE_CONFIG
  ): Promise<void> {
    const cacheKey = this.generateKey(key, type);
    const config = DEFAULT_CACHE_CONFIG[type];

    // Remove from memory cache
    this.memoryCache.delete(cacheKey);

    // Remove from persistent storage
    if (config.encrypted) {
      await SecureStorage.removeEncryptedItem(cacheKey);
    } else {
      await AsyncStorage.removeItem(cacheKey);
    }
  }

  public async clear(type?: keyof typeof DEFAULT_CACHE_CONFIG): Promise<void> {
    // Clear memory cache
    if (!type) {
      this.memoryCache.clear();
    } else {
      const prefix = `cache_${type.toLowerCase()}_`;
      for (const key of this.memoryCache.keys()) {
        if (key.startsWith(prefix)) {
          this.memoryCache.delete(key);
        }
      }
    }

    // Clear persistent storage
    try {
      if (!type) {
        await AsyncStorage.clear();
        // Clear secure storage separately
        const secureKeys = await AsyncStorage.getAllKeys();
        for (const key of secureKeys) {
          if (key.startsWith('encrypted_')) {
            await SecureStorage.removeEncryptedItem(key);
          }
        }
      } else {
        const keys = await AsyncStorage.getAllKeys();
        const prefix = `cache_${type.toLowerCase()}_`;
        const keysToRemove = keys.filter(key => key.startsWith(prefix));
        await AsyncStorage.multiRemove(keysToRemove);

        // Clear secure storage if needed
        if (DEFAULT_CACHE_CONFIG[type].encrypted) {
          const securePrefix = `encrypted_${prefix}`;
          for (const key of keys) {
            if (key.startsWith(securePrefix)) {
              await SecureStorage.removeEncryptedItem(key);
            }
          }
        }
      }
    } catch (error) {
      console.error('Cache clear error:', error);
    }
  }

  // Cache maintenance
  public async maintenance(): Promise<void> {
    try {
      // Clear expired memory cache items
      for (const [key, item] of this.memoryCache.entries()) {
        if (!this.isCacheValid(item, DEFAULT_CACHE_CONFIG.API.ttl)) {
          this.memoryCache.delete(key);
        }
      }

      // Clear expired persistent cache items
      const keys = await AsyncStorage.getAllKeys();
      for (const key of keys) {
        if (key.startsWith('cache_')) {
          const cached = await AsyncStorage.getItem(key);
          if (cached) {
            const item: CacheItem<any> = JSON.parse(cached);
            const type = key.split('_')[1].toUpperCase() as keyof typeof DEFAULT_CACHE_CONFIG;
            if (!this.isCacheValid(item, DEFAULT_CACHE_CONFIG[type].ttl)) {
              await AsyncStorage.removeItem(key);
            }
          }
        }
      }
    } catch (error) {
      console.error('Cache maintenance error:', error);
    }
  }
}

export const cacheManager = CacheManager.getInstance(); 