// Minimal shape needed for caching
type ImageFields = {
  thumbnail_images?: string[];
  preview_images?: string[];
};

interface CachedImageData {
  thumbnail_images: string[];
  preview_images: string[];
}

class ImageCache {
  private static instance: ImageCache;
  private cache: Map<string, CachedImageData> = new Map();
  // No automatic expiration - cache stays until manually cleared
  private isEnabled = true; // Can disable cache if it causes issues
  private isInitialized = false; // Track initialization status

  private constructor() {
    // Initialize the cache
    this.initialize();
  }

  static getInstance(): ImageCache {
    if (!ImageCache.instance) {
      ImageCache.instance = new ImageCache();
    }
    return ImageCache.instance;
  }

  private initialize(): void {
    try {
      // No cleanup interval needed - no automatic expiration
      
      // Mark as initialized
      this.isInitialized = true;
    } catch (error) {
      // Silent error handling
    }
  }

  // No cleanup interval needed - no automatic expiration

  // Check if cache is ready to use
  isReady(): boolean {
    return this.isInitialized && this.isEnabled;
  }

  // Enable/disable cache
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    if (!enabled) {
      this.clear();
    }
  }

  // Check if cache is enabled
  isCacheEnabled(): boolean {
    return this.isEnabled;
  }

  // Cache images for a listing/request
  setListingImages(listingId: string, listing: ImageFields): void {
    if (!this.isReady()) return;
    
    try {
      if (!listing.thumbnail_images && !listing.preview_images) {
        return; // Don't cache if no images
      }

      this.cache.set(listingId, {
        thumbnail_images: listing.thumbnail_images || [],
        preview_images: listing.preview_images || [],
      });
    } catch (error) {
      // Silent error handling
    }
  }

  // Get cached images for a listing
  getListingImages(listingId: string): CachedImageData | null {
    if (!this.isReady()) return null;
    
    try {
      const cached = this.cache.get(listingId);
      
      if (!cached) {
        return null;
      }

      // Cache is always valid - no automatic expiration

      return cached;
    } catch (error) {
      // Silent error handling
      return null;
    }
  }

  // Check if we have cached images for a listing
  hasListingImages(listingId: string): boolean {
    if (!this.isReady()) return false;
    
    try {
      return this.cache.has(listingId);
    } catch (error) {
      // Silent error handling
      return false;
    }
  }

  // No automatic cleanup - cache entries stay until manually cleared
  cleanup(): void {
    // Disabled - no automatic expiration
  }

  // Clear all cache
  clear(): void {
    try {
      this.cache.clear();
    } catch (error) {
      // Silent error handling
    }
  }

  // Get cache stats
  getStats(): { size: number; entries: string[] } {
    if (!this.isReady()) return { size: 0, entries: [] };
    
    try {
      return {
        size: this.cache.size,
        entries: Array.from(this.cache.keys())
      };
    } catch (error) {
      // Silent error handling
      return { size: 0, entries: [] };
    }
  }

  // Cleanup method for when the cache is no longer needed
  destroy(): void {
    try {
      // No cleanup interval to clear
      this.cache.clear();
      this.isInitialized = false;
    } catch (error) {
      // Silent error handling
    }
  }
}

// Create and export the singleton instance
export const imageCache = ImageCache.getInstance();

// Ensure cleanup on app exit (React Native doesn't have process.on('exit'))
if (typeof global !== 'undefined') {
  (global as typeof globalThis & { __imageCacheCleanup?: () => void }).__imageCacheCleanup = () => {
    if (imageCache) {
      imageCache.destroy();
    }
  };
} 