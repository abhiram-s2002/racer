/**
 * Cache Manager for State Management
 * Handles caching with TTL, encryption, and persistence
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export type CacheType = 'API' | 'USER' | 'SYSTEM';

export interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  ttl: number;
  encrypted?: boolean;
}

export interface CacheConfig {
  defaultTTL: number; // in seconds
  maxSize: number;
  enableEncryption: boolean;
  enablePersistence: boolean;
}

const DEFAULT_CONFIG: CacheConfig = {
  defaultTTL: 3600, // 1 hour
  maxSize: 1000,
  enableEncryption: false,
  enablePersistence: true
};

class CacheManager {
  private cache = new Map<string, CacheEntry>();
  private config: CacheConfig;
  private encryptionKey: string | null = null;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.initializeEncryption();
  }

  /**
   * Initialize encryption if enabled
   */
  private initializeEncryption(): void {
    if (this.config.enableEncryption) {
      // In a real app, you'd generate or retrieve a proper encryption key
      this.encryptionKey = 'demo-encryption-key';
    }
  }

  /**
   * Set a value in the cache
   */
  async set<T>(key: string, value: T, type: CacheType = 'API', ttl?: number): Promise<void> {
    try {
      const cacheKey = this.generateCacheKey(key, type);
      const entryTTL = ttl || this.config.defaultTTL;
      
      let data = value;
      let encrypted = false;

      // Encrypt data if needed
      if (this.config.enableEncryption && type === 'USER' && this.encryptionKey) {
        data = this.encrypt(JSON.stringify(value)) as T;
        encrypted = true;
      }

      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        ttl: entryTTL * 1000, // Convert to milliseconds
        encrypted
      };

      this.cache.set(cacheKey, entry);

      // Persist to AsyncStorage if enabled
      if (this.config.enablePersistence) {
        await this.persistToStorage(cacheKey, entry);
      }

      // Clean up old entries if cache is too large
      await this.cleanup();
    } catch (error) {
      console.error('Error setting cache entry:', error);
    }
  }

  /**
   * Get a value from the cache
   */
  async get<T>(key: string, type: CacheType = 'API'): Promise<T | null> {
    try {
      const cacheKey = this.generateCacheKey(key, type);
      
      // Try memory cache first
      let entry = this.cache.get(cacheKey);
      
      // If not in memory and persistence is enabled, try AsyncStorage
      if (!entry && this.config.enablePersistence) {
        const storedEntry = await this.loadFromStorage(cacheKey);
        if (storedEntry) {
          entry = storedEntry;
          this.cache.set(cacheKey, entry);
        }
      }

      if (!entry) {
        return null;
      }

      // Check if entry has expired
      if (this.isExpired(entry)) {
        this.cache.delete(cacheKey);
        if (this.config.enablePersistence) {
          this.removeFromStorage(cacheKey);
        }
        return null;
      }

      let data = entry.data;

      // Decrypt data if needed
      if (entry.encrypted && this.encryptionKey) {
        try {
          data = JSON.parse(this.decrypt(data as string));
        } catch (error) {
          console.error('Error decrypting cache entry:', error);
          return null;
        }
      }

      return data as T;
    } catch (error) {
      console.error('Error getting cache entry:', error);
      return null;
    }
  }

  /**
   * Delete a value from the cache
   */
  async delete(key: string, type: CacheType = 'API'): Promise<boolean> {
    try {
      const cacheKey = this.generateCacheKey(key, type);
      const deleted = this.cache.delete(cacheKey);
      
      if (this.config.enablePersistence) {
        await this.removeFromStorage(cacheKey);
      }
      
      return deleted;
    } catch (error) {
      console.error('Error deleting cache entry:', error);
      return false;
    }
  }

  /**
   * Clear all cache entries
   */
  async clear(): Promise<void> {
    try {
      this.cache.clear();
      
      if (this.config.enablePersistence) {
        await this.clearStorage();
      }
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  }

  /**
   * Clear cache entries by type
   */
  async clearByType(type: CacheType): Promise<void> {
    try {
      const prefix = this.getTypePrefix(type);
      const keysToDelete: string[] = [];
      
      for (const key of this.cache.keys()) {
        if (key.startsWith(prefix)) {
          keysToDelete.push(key);
        }
      }
      
      keysToDelete.forEach(key => {
        this.cache.delete(key);
        if (this.config.enablePersistence) {
          this.removeFromStorage(key);
        }
      });
    } catch (error) {
      console.error('Error clearing cache by type:', error);
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    maxSize: number;
    hitRate: number;
    entriesByType: Record<CacheType, number>;
  } {
    const entriesByType: Record<CacheType, number> = {
      API: 0,
      USER: 0,
      SYSTEM: 0
    };

    for (const key of this.cache.keys()) {
      if (key.startsWith('api_')) entriesByType.API++;
      else if (key.startsWith('user_')) entriesByType.USER++;
      else if (key.startsWith('system_')) entriesByType.SYSTEM++;
    }

    return {
      size: this.cache.size,
      maxSize: this.config.maxSize,
      hitRate: 0, // Would need to track hits/misses for real hit rate
      entriesByType
    };
  }

  /**
   * Generate cache key with type prefix
   */
  private generateCacheKey(key: string, type: CacheType): string {
    const prefix = this.getTypePrefix(type);
    return `${prefix}${key}`;
  }

  /**
   * Get type prefix for cache keys
   */
  private getTypePrefix(type: CacheType): string {
    switch (type) {
      case 'API': return 'api_';
      case 'USER': return 'user_';
      case 'SYSTEM': return 'system_';
      default: return 'api_';
    }
  }

  /**
   * Check if cache entry is expired
   */
  private isExpired(entry: CacheEntry): boolean {
    return Date.now() - entry.timestamp > entry.ttl;
  }

  /**
   * Clean up expired entries and enforce size limits
   */
  private async cleanup(): Promise<void> {
    // Remove expired entries
    for (const [key, entry] of this.cache.entries()) {
      if (this.isExpired(entry)) {
        this.cache.delete(key);
        if (this.config.enablePersistence) {
          await this.removeFromStorage(key);
        }
      }
    }

    // Enforce size limit (remove oldest entries)
    if (this.cache.size > this.config.maxSize) {
      const entries = Array.from(this.cache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      
      const toRemove = entries.slice(0, this.cache.size - this.config.maxSize);
      for (const [key] of toRemove) {
        this.cache.delete(key);
        if (this.config.enablePersistence) {
          await this.removeFromStorage(key);
        }
      }
    }
  }

  /**
   * Persist entry to AsyncStorage
   */
  private async persistToStorage(key: string, entry: CacheEntry): Promise<void> {
    try {
      await AsyncStorage.setItem(`cache_${key}`, JSON.stringify(entry));
    } catch (error) {
      console.error('Error persisting to storage:', error);
    }
  }

  /**
   * Load entry from AsyncStorage
   */
  private async loadFromStorage(key: string): Promise<CacheEntry | null> {
    try {
      const stored = await AsyncStorage.getItem(`cache_${key}`);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.error('Error loading from storage:', error);
      return null;
    }
  }

  /**
   * Remove entry from AsyncStorage
   */
  private async removeFromStorage(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(`cache_${key}`);
    } catch (error) {
      console.error('Error removing from storage:', error);
    }
  }

  /**
   * Clear all cache entries from AsyncStorage
   */
  private async clearStorage(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      if (keys) {
        const keysToRemove = keys.filter(key => key.startsWith('cache_'));
        if (keysToRemove.length > 0) {
          await AsyncStorage.multiRemove(keysToRemove);
        }
      }
    } catch (error) {
      console.error('Error clearing storage:', error);
    }
  }

  /**
   * Simple encryption (for demo purposes - use proper encryption in production)
   */
  private encrypt(data: string): string {
    if (!this.encryptionKey) return data;
    
    // Simple XOR encryption (not secure for production)
    let encrypted = '';
    for (let i = 0; i < data.length; i++) {
      encrypted += String.fromCharCode(
        data.charCodeAt(i) ^ this.encryptionKey.charCodeAt(i % this.encryptionKey.length)
      );
    }
    return btoa(encrypted);
  }

  /**
   * Simple decryption (for demo purposes - use proper decryption in production)
   */
  private decrypt(encryptedData: string): string {
    if (!this.encryptionKey) return encryptedData;
    
    try {
      const data = atob(encryptedData);
      let decrypted = '';
      for (let i = 0; i < data.length; i++) {
        decrypted += String.fromCharCode(
          data.charCodeAt(i) ^ this.encryptionKey.charCodeAt(i % this.encryptionKey.length)
        );
      }
      return decrypted;
    } catch (error) {
      console.error('Error decrypting data:', error);
      return encryptedData;
    }
  }
}

// Export singleton instance
export const cacheManager = new CacheManager();
