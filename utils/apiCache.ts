import { cacheManager } from './cacheManager';
import { SupabaseClient } from '@supabase/supabase-js';

interface ApiCacheConfig {
  enabled: boolean;
  defaultTTL: number; // Time to live in seconds
  maxEntries: number; // Maximum number of cached entries
}

interface SupabaseResponse<T> {
  data: T[] | null;
  error: Error | null;
  count: number | null;
  status: number;
  statusText: string;
}

const DEFAULT_CONFIG: ApiCacheConfig = {
  enabled: true,
  defaultTTL: 300, // 5 minutes
  maxEntries: 100,
};

class ApiCache {
  private static instance: ApiCache;
  private config: ApiCacheConfig;
  private cacheHits: Map<string, number>;

  private constructor(config: Partial<ApiCacheConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.cacheHits = new Map();
  }

  public static getInstance(config?: Partial<ApiCacheConfig>): ApiCache {
    if (!ApiCache.instance) {
      ApiCache.instance = new ApiCache(config);
    }
    return ApiCache.instance;
  }

  /**
   * Generate a cache key from request parameters
   */
  private generateCacheKey(table: string, query: string, params: any = {}): string {
    return `${table}:${query}:${JSON.stringify(params)}`;
  }

  /**
   * Cache-wrapped select query
   */
  public async select<T>(
    supabase: SupabaseClient,
    table: string,
    query: string = '*',
    params: any = {}
  ): Promise<SupabaseResponse<T>> {
    if (!this.config.enabled) {
      const response = await supabase.from(table).select(query);
      return {
        data: response.data as T[] | null,
        error: response.error,
        count: response.count,
        status: response.status,
        statusText: response.statusText,
      };
    }

    const cacheKey = this.generateCacheKey(table, query, params);

    // Try to get from cache
    const cached = await cacheManager.get<SupabaseResponse<T>>(cacheKey, 'API');
    if (cached) {
      // Update cache hit count
      const hits = (this.cacheHits.get(cacheKey) || 0) + 1;
      this.cacheHits.set(cacheKey, hits);
      return cached;
    }

    // Execute query
    const response = await supabase.from(table).select(query);
    const formattedResponse: SupabaseResponse<T> = {
      data: response.data as T[] | null,
      error: response.error,
      count: response.count,
      status: response.status,
      statusText: response.statusText,
    };

    // Only cache successful responses
    if (!formattedResponse.error && formattedResponse.data) {
      await cacheManager.set(cacheKey, formattedResponse, 'API');
      this.cacheHits.set(cacheKey, 1);
      await this.optimizeCache();
    }

    return formattedResponse;
  }

  /**
   * Invalidate cache for a specific table
   */
  public async invalidateTable(table: string): Promise<void> {
    const keys = await cacheManager.get<string[]>('api_cache_keys', 'API') || [];
    const tableKeys = keys.filter(key => key.startsWith(`${table}:`));
    
    for (const key of tableKeys) {
      await cacheManager.remove(key, 'API');
      this.cacheHits.delete(key);
    }
  }

  /**
   * Clear all API cache
   */
  public async clearCache(): Promise<void> {
    await cacheManager.clear('API');
    this.cacheHits.clear();
  }

  /**
   * Get cache statistics
   */
  public getCacheStats(): {
    enabled: boolean;
    entries: number;
    hits: Map<string, number>;
  } {
    return {
      enabled: this.config.enabled,
      entries: this.cacheHits.size,
      hits: this.cacheHits,
    };
  }

  /**
   * Enable or disable caching
   */
  public setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
    if (!enabled) {
      this.clearCache();
    }
  }

  /**
   * Update cache configuration
   */
  public updateConfig(config: Partial<ApiCacheConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Optimize cache based on usage
   */
  private async optimizeCache(): Promise<void> {
    if (this.cacheHits.size <= this.config.maxEntries) {
      return;
    }

    // Sort by hits (least used first)
    const sortedEntries = Array.from(this.cacheHits.entries())
      .sort(([, hitsA], [, hitsB]) => hitsA - hitsB);

    // Remove least used entries until we're under the limit
    while (this.cacheHits.size > this.config.maxEntries) {
      const [key] = sortedEntries.shift()!;
      await cacheManager.remove(key, 'API');
      this.cacheHits.delete(key);
    }
  }
}

// Export singleton instance
export const apiCache = ApiCache.getInstance();

// Example usage:
// interface User {
//   id: number;
//   name: string;
// }
//
// const { data, error } = await apiCache.select<User>(
//   supabase,
//   'users',
//   '*',
//   { limit: 10 }
// );
//
// // Invalidate cache for a table
// await apiCache.invalidateTable('users');
//
// // Clear all cache
// await apiCache.clearCache(); 