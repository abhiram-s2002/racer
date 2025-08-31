import { Listing } from './types';

interface CachedImageData {
  thumbnail_images: string[];
  preview_images: string[];
  image_folder_path?: string; // Make optional since it might not exist
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
      console.warn('Failed to initialize image cache:', error);
      this.isEnabled = false;
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

  // Cache images for a listing
  setListingImages(listingId: string, listing: Partial<Listing>): void {
    if (!this.isReady()) return;
    
    try {
      if (!listing.thumbnail_images && !listing.preview_images) {
        return; // Don't cache if no images
      }

      this.cache.set(listingId, {
        thumbnail_images: listing.thumbnail_images || [],
        preview_images: listing.preview_images || [],
        image_folder_path: (listing as any).image_folder_path || '', // Cast to any for optional property
      });
    } catch (error) {
      console.warn('Image cache set error (non-critical):', error);
      // Disable cache if it's causing issues
      this.setEnabled(false);
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
      console.warn('Image cache get error (non-critical):', error);
      // Disable cache if it's causing issues
      this.setEnabled(false);
      return null;
    }
  }

  // Check if we have cached images for a listing
  hasListingImages(listingId: string): boolean {
    if (!this.isReady()) return false;
    
    try {
      return this.cache.has(listingId);
    } catch (error) {
      console.warn('Image cache has error (non-critical):', error);
      // Disable cache if it's causing issues
      this.setEnabled(false);
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
      console.warn('Image cache clear error (non-critical):', error);
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
      console.warn('Image cache stats error (non-critical):', error);
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
      console.warn('Image cache destroy error (non-critical):', error);
    }
  }
}

// Create and export the singleton instance
export const imageCache = ImageCache.getInstance();

// Ensure cleanup on app exit (React Native doesn't have process.on('exit'))
if (typeof global !== 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (global as any).__imageCacheCleanup = () => {
    if (imageCache) {
      imageCache.destroy();
    }
  };
} 