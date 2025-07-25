import LRUCache from 'lru-cache';

interface CacheOptions {
  max: number; // Maximum number of items
  ttl: number; // Time to live in milliseconds
}

interface CacheItem<T> {
  value: T;
  timestamp: number;
}

class MemoryCache {
  private static instance: MemoryCache;
  private cache: LRUCache<string, CacheItem<any>>;
  private subscribers: Map<string, Set<(value: any) => void>>;

  private constructor() {
    this.cache = new LRUCache<string, CacheItem<any>>({
      max: 1000, // Store max 1000 items
      ttl: 1000 * 60 * 60, // Default TTL: 1 hour
      updateAgeOnGet: true, // Update item age on access
    });

    this.subscribers = new Map();

    // Periodic cleanup
    setInterval(() => {
      this.cleanup();
    }, 1000 * 60 * 5); // Every 5 minutes
  }

  public static getInstance(): MemoryCache {
    if (!MemoryCache.instance) {
      MemoryCache.instance = new MemoryCache();
    }
    return MemoryCache.instance;
  }

  /**
   * Set a value in cache
   */
  public set<T>(key: string, value: T, options?: Partial<CacheOptions>): void {
    const item: CacheItem<T> = {
      value,
      timestamp: Date.now(),
    };

    this.cache.set(key, item, {
      ttl: options?.ttl,
      max: options?.max,
    });

    // Notify subscribers
    this.notifySubscribers(key, value);
  }

  /**
   * Get a value from cache
   */
  public get<T>(key: string): T | undefined {
    const item = this.cache.get(key) as CacheItem<T> | undefined;
    return item?.value;
  }

  /**
   * Delete a value from cache
   */
  public delete(key: string): void {
    this.cache.delete(key);
    // Notify subscribers
    this.notifySubscribers(key, undefined);
  }

  /**
   * Clear all cache
   */
  public clear(): void {
    this.cache.clear();
    // Notify all subscribers
    this.subscribers.forEach((subscribers, key) => {
      this.notifySubscribers(key, undefined);
    });
  }

  /**
   * Subscribe to cache changes
   */
  public subscribe<T>(key: string, callback: (value: T | undefined) => void): () => void {
    if (!this.subscribers.has(key)) {
      this.subscribers.set(key, new Set());
    }

    const subscribers = this.subscribers.get(key)!;
    subscribers.add(callback);

    // Return unsubscribe function
    return () => {
      subscribers.delete(callback);
      if (subscribers.size === 0) {
        this.subscribers.delete(key);
      }
    };
  }

  /**
   * Get multiple values from cache
   */
  public getMany<T>(keys: string[]): (T | undefined)[] {
    return keys.map(key => this.get<T>(key));
  }

  /**
   * Set multiple values in cache
   */
  public setMany(items: { key: string; value: any; options?: Partial<CacheOptions> }[]): void {
    items.forEach(({ key, value, options }) => {
      this.set(key, value, options);
    });
  }

  /**
   * Check if key exists in cache
   */
  public has(key: string): boolean {
    return this.cache.has(key);
  }

  /**
   * Get cache size
   */
  public size(): number {
    return this.cache.size;
  }

  /**
   * Get all keys in cache
   */
  public keys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Cleanup expired items
   */
  private cleanup(): void {
    const now = Date.now();
    this.cache.forEach((item: CacheItem<unknown>, key: string) => {
      if (now - item.timestamp > (this.cache.ttl || 0)) {
        this.delete(key);
      }
    });
  }

  /**
   * Notify subscribers of changes
   */
  private notifySubscribers(key: string, value: any): void {
    const subscribers = this.subscribers.get(key);
    if (subscribers) {
      subscribers.forEach(callback => {
        try {
          callback(value);
        } catch (error) {
          console.error('Error in cache subscriber:', error);
        }
      });
    }
  }

  /**
   * Get cache statistics
   */
  public getStats(): {
    size: number;
    maxSize: number;
    hits: number;
    misses: number;
    ttl: number;
  } {
    return {
      size: this.cache.size,
      maxSize: this.cache.max,
      hits: this.cache.hits,
      misses: this.cache.misses,
      ttl: this.cache.ttl || 0,
    };
  }
}

// Export singleton instance
export const memoryCache = MemoryCache.getInstance(); 