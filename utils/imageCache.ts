import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';



import React from 'react';

export interface CachedImage {
  uri: string;
  timestamp: number;
  size: number;
}

export class ImageCache {
  private static readonly CACHE_PREFIX = 'image_cache_';
  private static readonly MAX_CACHE_SIZE = 50 * 1024 * 1024; // 50MB
  private static readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

  /**
   * Get cached image URI if available and not expired
   */
  static async getCachedImage(url: string): Promise<string | null> {
    try {
      const key = this.CACHE_PREFIX + this.hashUrl(url);
      const cached = await AsyncStorage.getItem(key);
      
      if (cached) {
        const cacheEntry: CachedImage = JSON.parse(cached);
        
        // Check if cache is still valid
        if (Date.now() - cacheEntry.timestamp < this.CACHE_DURATION) {
          // Verify file still exists
          const fileInfo = await FileSystem.getInfoAsync(cacheEntry.uri);
          if (fileInfo.exists) {
            return cacheEntry.uri;
          }
        }
        
        // Remove expired or missing cache entry
        await this.removeCachedImage(url);
      }
      
      return null;
    } catch (error) {
      console.error('Image cache get error:', error);
      return null;
    }
  }

  /**
   * Cache image by downloading and storing locally
   */
  static async cacheImage(url: string): Promise<string | null> {
    try {
      const key = this.CACHE_PREFIX + this.hashUrl(url);
      const fileName = `${key}_${Date.now()}.jpg`;
      const fileUri = `${FileSystem.cacheDirectory}${fileName}`;

      // Download image
      const downloadResult = await FileSystem.downloadAsync(url, fileUri);
      
      if (downloadResult.status === 200) {
        const fileInfo = await FileSystem.getInfoAsync(fileUri, { size: true });
        
        const cacheEntry: CachedImage = {
          uri: fileUri,
          timestamp: Date.now(),
          size: fileInfo.exists && 'size' in fileInfo ? fileInfo.size : 0
        };

        // Store cache entry
        await AsyncStorage.setItem(key, JSON.stringify(cacheEntry));
        
        // Clean up old cache entries if needed
        await this.cleanupCache();
        
        return fileUri;
      }
      
      return null;
    } catch (error) {
      console.error('Image cache set error:', error);
      return null;
    }
  }

  /**
   * Remove specific cached image
   */
  static async removeCachedImage(url: string): Promise<void> {
    try {
      const key = this.CACHE_PREFIX + this.hashUrl(url);
      
      // Get cache entry to delete file
      const cached = await AsyncStorage.getItem(key);
      if (cached) {
        const cacheEntry: CachedImage = JSON.parse(cached);
        await FileSystem.deleteAsync(cacheEntry.uri, { idempotent: true });
      }
      
      // Remove cache entry
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error('Image cache remove error:', error);
    }
  }

  /**
   * Clear all cached images
   */
  static async clearCache(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith(this.CACHE_PREFIX));
      
      // Get all cache entries to delete files
      const cacheEntries = await AsyncStorage.multiGet(cacheKeys);
      
      // Delete all cached files
      for (const [key, value] of cacheEntries) {
        if (value) {
          const cacheEntry: CachedImage = JSON.parse(value);
          await FileSystem.deleteAsync(cacheEntry.uri, { idempotent: true });
        }
      }
      
      // Remove all cache entries
      await AsyncStorage.multiRemove(cacheKeys);
    } catch (error) {
      console.error('Image cache clear error:', error);
    }
  }

  /**
   * Get cache size and statistics
   */
  static async getCacheStats(): Promise<{
    totalSize: number;
    totalImages: number;
    oldestEntry: number;
    newestEntry: number;
  }> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith(this.CACHE_PREFIX));
      
      if (cacheKeys.length === 0) {
        return { totalSize: 0, totalImages: 0, oldestEntry: 0, newestEntry: 0 };
      }
      
      const cacheEntries = await AsyncStorage.multiGet(cacheKeys);
      let totalSize = 0;
      const timestamps: number[] = [];
      
      for (const [key, value] of cacheEntries) {
        if (value) {
          const cacheEntry: CachedImage = JSON.parse(value);
          totalSize += cacheEntry.size;
          timestamps.push(cacheEntry.timestamp);
        }
      }
      
      return {
        totalSize,
        totalImages: cacheKeys.length,
        oldestEntry: Math.min(...timestamps),
        newestEntry: Math.max(...timestamps)
      };
    } catch (error) {
      console.error('Image cache stats error:', error);
      return { totalSize: 0, totalImages: 0, oldestEntry: 0, newestEntry: 0 };
    }
  }

  /**
   * Clean up old cache entries to maintain size limit
   */
  private static async cleanupCache(): Promise<void> {
    try {
      const stats = await this.getCacheStats();
      
      if (stats.totalSize > this.MAX_CACHE_SIZE) {
        const keys = await AsyncStorage.getAllKeys();
        const cacheKeys = keys.filter(key => key.startsWith(this.CACHE_PREFIX));
        
        if (cacheKeys.length === 0) return;
        
        const cacheEntries = await AsyncStorage.multiGet(cacheKeys);
        const entries: Array<{ key: string; entry: CachedImage }> = [];
        
        // Parse all cache entries
        for (const [key, value] of cacheEntries) {
          if (value) {
            const cacheEntry: CachedImage = JSON.parse(value);
            entries.push({ key, entry: cacheEntry });
          }
        }
        
        // Sort by timestamp (oldest first)
        entries.sort((a, b) => a.entry.timestamp - b.entry.timestamp);
        
        // Remove oldest entries until under limit
        let currentSize = stats.totalSize;
        const keysToRemove: string[] = [];
        
        for (const { key, entry } of entries) {
          if (currentSize <= this.MAX_CACHE_SIZE) break;
          
          keysToRemove.push(key);
          currentSize -= entry.size;
        }
        
        // Remove selected entries
        if (keysToRemove.length > 0) {
          const entriesToRemove = await AsyncStorage.multiGet(keysToRemove);
          
          // Delete files
          for (const [key, value] of entriesToRemove) {
            if (value) {
              const cacheEntry: CachedImage = JSON.parse(value);
              await FileSystem.deleteAsync(cacheEntry.uri, { idempotent: true });
            }
          }
          
          // Remove cache entries
          await AsyncStorage.multiRemove(keysToRemove);
        }
      }
    } catch (error) {
      console.error('Image cache cleanup error:', error);
    }
  }

  /**
   * Hash URL to create consistent cache key
   */
  private static hashUrl(url: string): string {
    // Simple hash function for URLs
    let hash = 0;
    for (let i = 0; i < url.length; i++) {
      const char = url.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }
}

/**
 * Hook for using cached images in components
 */
export const useCachedImage = (url: string | null) => {
  const [imageUri, setImageUri] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(false);

  React.useEffect(() => {
    if (!url) {
      setImageUri(null);
      setLoading(false);
      setError(false);
      return;
    }

    const loadImage = async () => {
      try {
        setLoading(true);
        setError(false);

        // Check cache first
        let cachedUri = await ImageCache.getCachedImage(url);
        
        if (!cachedUri) {
          // Download and cache
          cachedUri = await ImageCache.cacheImage(url);
        }

        setImageUri(cachedUri);
      } catch (err) {
        console.error('Cached image load error:', err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    loadImage();
  }, [url]);

  return { imageUri, loading, error };
}; 