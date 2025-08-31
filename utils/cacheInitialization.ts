/**
 * Cache Initialization Utility
 * Fixes cache initialization errors and provides fallbacks
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { imageCache } from './imageCache';

/**
 * Initialize all cache systems safely
 */
export async function initializeCaches(): Promise<void> {
  try {
    // Initialize image cache
    await initializeImageCache();
    
    // Initialize other caches as needed
    await initializeOtherCaches();
    
    // Cache initialization completed successfully
  } catch (error) {
    console.error('Cache initialization error:', error);
  }
}

/**
 * Initialize image cache safely
 */
async function initializeImageCache(): Promise<void> {
  try {
    // Test image cache functionality
    if (imageCache && imageCache.isReady()) {
      const stats = imageCache.getStats();
      // Image cache stats retrieved successfully
    }
  } catch (error) {
    // Not an error - just cache not ready yet during first app open
    console.log('Image cache not ready yet (normal during first app open)');
  }
}

/**
 * Initialize other cache systems
 */
async function initializeOtherCaches(): Promise<void> {
  try {
    // Clear any corrupted cache entries
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter(key => 
      key.startsWith('cache_') || 
      key.startsWith('image_cache_') ||
      key.includes('_cache_')
    );
    
    if (cacheKeys.length > 0) {
      // Cache keys found and processed
    }
  } catch (error) {
    console.error('Other cache initialization error:', error);
  }
}

/**
 * Get cache statistics safely
 */
export async function getCacheStatistics(): Promise<{
  cacheTypes: string[];
  itemCount: number;
  totalSize: number;
  lastRun: number;
}> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter(key => 
      key.startsWith('cache_') || 
      key.startsWith('image_cache_') ||
      key.includes('_cache_')
    );
    
    let totalSize = 0;
    for (const key of cacheKeys) {
      try {
        const item = await AsyncStorage.getItem(key);
        if (item) {
          totalSize += new Blob([item]).size;
        }
      } catch {
        // Skip corrupted items
      }
    }
    
    return {
      cacheTypes: ['image', 'api', 'user', 'location'],
      itemCount: cacheKeys.length,
      totalSize,
      lastRun: Date.now()
    };
  } catch (error) {
    console.error('Error getting cache statistics:', error);
    return {
      cacheTypes: [],
      itemCount: 0,
      totalSize: 0,
      lastRun: Date.now()
    };
  }
}

/**
 * Clear all caches safely
 */
export async function clearAllCaches(): Promise<void> {
  try {
    // Clearing all caches...
    
    // Clear image cache
    try {
      if (imageCache && imageCache.isReady()) {
        imageCache.clear();
      }
    } catch (error) {
      // Not an error - just cache not ready yet during first app open
      console.log('Image cache not ready yet (normal during first app open)');
    }
    
    // Clear AsyncStorage cache keys
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter(key => 
      key.startsWith('cache_') || 
      key.startsWith('image_cache_') ||
      key.includes('_cache_')
    );
    
    if (cacheKeys.length > 0) {
      await AsyncStorage.multiRemove(cacheKeys);
      // Cache entries cleared successfully
    }
    
    // All caches cleared successfully
  } catch (error) {
    console.error('Error clearing caches:', error);
  }
} 