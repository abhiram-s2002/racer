// Cache maintenance operations placeholder
import { imageCache } from './imageCache';
import { apiCache } from './apiCache';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface MaintenanceConfig {
  maxTotalSize: number; // Maximum total cache size in bytes
  cleanupInterval: number; // Cleanup interval in milliseconds
  retentionPeriod: number; // How long to keep unused items (in milliseconds)
  maxEntries: number; // Maximum number of entries per cache type
}

const DEFAULT_CONFIG: MaintenanceConfig = {
  maxTotalSize: 200 * 1024 * 1024, // 200MB
  cleanupInterval: 30 * 60 * 1000, // 30 minutes
  retentionPeriod: 7 * 24 * 60 * 60 * 1000, // 7 days
  maxEntries: 1000,
};

class CacheMaintenance {
  private static instance: CacheMaintenance;
  private config: MaintenanceConfig;
  private maintenanceInterval: ReturnType<typeof setInterval> | null = null;
  private isRunning = false;

  private constructor(config: Partial<MaintenanceConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  public static getInstance(config?: Partial<MaintenanceConfig>): CacheMaintenance {
    if (!CacheMaintenance.instance) {
      CacheMaintenance.instance = new CacheMaintenance(config);
    }
    return CacheMaintenance.instance;
  }

  /**
   * Start automatic cache maintenance
   */
  public startAutoMaintenance(): void {
    if (this.maintenanceInterval) {
      return;
    }

    this.maintenanceInterval = setInterval(() => {
      this.runMaintenance().catch(err => {
        console.error('Cache maintenance error:', err);
      });
    }, this.config.cleanupInterval);

    // Run initial maintenance
    this.runMaintenance().catch(err => {
      console.error('Initial cache maintenance error:', err);
    });
  }

  /**
   * Stop automatic cache maintenance
   */
  public stopAutoMaintenance(): void {
    if (this.maintenanceInterval) {
      clearInterval(this.maintenanceInterval);
      this.maintenanceInterval = null;
    }
  }

  /**
   * Run cache maintenance manually
   */
  public async runMaintenance(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;

    try {
      // Get all cache keys
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith('cache_'));

      // Group keys by cache type
      const keysByType = cacheKeys.reduce((acc, key) => {
        const type = key.split('_')[1];
        if (!acc[type]) {
          acc[type] = [];
        }
        acc[type].push(key);
        return acc;
      }, {} as Record<string, string[]>);

      // Clean up each cache type
      for (const [type, keys] of Object.entries(keysByType)) {
        await this.cleanupCacheType(type, keys);
      }

      // Run specific maintenance for each cache system
      await Promise.all([
        this.maintainImageCache(),
        this.maintainApiCache(),
      ]);

      // Optimize storage
      await this.optimizeStorage();
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Clean up specific cache type
   */
  private async cleanupCacheType(type: string, keys: string[]): Promise<void> {
    const now = Date.now();
    const stats = await this.getCacheStats(type, keys);

    // Remove expired items
    for (const key of keys) {
      try {
        const item = await AsyncStorage.getItem(key);
        if (!item) continue;

        const cached = JSON.parse(item);
        const age = now - cached.timestamp;

        if (age > this.config.retentionPeriod) {
          await AsyncStorage.removeItem(key);
          continue;
        }
      } catch (error) {
        console.error(`Error processing cache key ${key}:`, error);
      }
    }

    // If still over limit, remove oldest items
    if (stats.totalSize > this.config.maxTotalSize || stats.count > this.config.maxEntries) {
      const items = await Promise.all(
        keys.map(async key => {
          const item = await AsyncStorage.getItem(key);
          return { key, item: item ? JSON.parse(item) : null };
        })
      );

      // Sort by timestamp (oldest first)
      items.sort((a, b) => (a.item?.timestamp || 0) - (b.item?.timestamp || 0));

      // Remove items until we're under the limits
      for (const { key } of items) {
        if (stats.totalSize <= this.config.maxTotalSize && stats.count <= this.config.maxEntries) {
          break;
        }
        await AsyncStorage.removeItem(key);
        stats.count--;
        stats.totalSize -= await this.getItemSize(key);
      }
    }
  }

  /**
   * Maintain image cache
   */
  private async maintainImageCache(): Promise<void> {
    try {
      // Use imported instance
      if (imageCache && imageCache.isReady()) {
        const stats = imageCache.getStats();
        if (stats.size > this.config.maxTotalSize) {
          imageCache.clear();
        }
      }
    } catch (error) {
      // Not an error - just cache not ready yet during first app open
      console.log('Image cache not ready yet (normal during first app open)');
    }
  }

  /**
   * Maintain API cache
   */
  private async maintainApiCache(): Promise<void> {
    try {
      // API cache maintenance
      try {
        // API cache maintenance skipped - runMaintenance method not available
        // TODO: Implement API cache maintenance if needed
      } catch (error) {
        console.error('API cache maintenance error:', error);
      }
    } catch (error) {
      console.error('API cache maintenance error:', error);
    }
  }

  /**
   * Get cache statistics
   */
  private async getCacheStats(type: string, keys: string[]): Promise<{
    totalSize: number;
    count: number;
  }> {
    let totalSize = 0;
    let count = 0;

    for (const key of keys) {
      try {
        const size = await this.getItemSize(key);
        totalSize += size;
        count++;
      } catch (error) {
        console.error(`Error getting size for ${key}:`, error);
      }
    }

    return { totalSize, count };
  }

  /**
   * Get size of cached item
   */
  private async getItemSize(key: string): Promise<number> {
    try {
      const item = await AsyncStorage.getItem(key);
      return item ? new Blob([item]).size : 0;
    } catch {
      return 0;
    }
  }

  /**
   * Optimize storage
   */
  private async optimizeStorage(): Promise<void> {
    try {
      // Get all keys
      const keys = await AsyncStorage.getAllKeys();
      
      // Group items for batch operations
      const batchSize = 100;
      const batches: Array<[string, string][]> = [];
      
      for (let i = 0; i < keys.length; i += batchSize) {
        const batch = keys.slice(i, i + batchSize);
        const items = await AsyncStorage.multiGet(batch);
        
        // Filter out invalid items and ensure string values
        const validItems = items
          .filter((pair): pair is [string, string] => pair[1] !== null)
          .map(([key, value]) => [key, value] as [string, string]);
        
        if (validItems.length > 0) {
          batches.push(validItems);
        }
      }
      
      // Clear storage
      await AsyncStorage.clear();
      
      // Restore valid items in batches
      for (const batch of batches) {
        await AsyncStorage.multiSet(batch);
      }
    } catch (error) {
      console.error('Storage optimization error:', error);
    }
  }

  /**
   * Get maintenance statistics
   */
  public async getMaintenanceStats(): Promise<{
    totalSize: number;
    itemCount: number;
    lastRun: number;
    cacheTypes: string[];
  }> {
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter(key => key.startsWith('cache_'));
    const stats = await this.getCacheStats('all', cacheKeys);
    
    const cacheTypes = [...new Set(cacheKeys.map(key => key.split('_')[1]))];

    return {
      totalSize: stats.totalSize,
      itemCount: stats.count,
      lastRun: Date.now(),
      cacheTypes,
    };
  }
}

// Export singleton instance
export const cacheMaintenance = CacheMaintenance.getInstance();

// Example usage:
// // Start automatic maintenance
// cacheMaintenance.startAutoMaintenance();
//
// // Run maintenance manually
// await cacheMaintenance.runMaintenance();
//
// // Get maintenance statistics
// const stats = await cacheMaintenance.getMaintenanceStats();
//
// // Stop automatic maintenance
// cacheMaintenance.stopAutoMaintenance(); 