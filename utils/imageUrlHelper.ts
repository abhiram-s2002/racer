/**
 * Image URL Helper Utilities
 * Helps validate and fix image URLs to prevent display issues
 */

export class ImageUrlHelper {
  /**
   * Validate if an image URL is accessible and has proper format
   */
  static async validateImageUrl(url: string): Promise<{ isValid: boolean; error?: string }> {
    try {
      if (!url || typeof url !== 'string') {
        return { isValid: false, error: 'Invalid URL' };
      }

      // Check if URL is properly formatted
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        return { isValid: false, error: 'URL must start with http:// or https://' };
      }

      // Check for common image file extensions
      const validExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
      const hasValidExtension = validExtensions.some(ext => 
        url.toLowerCase().includes(ext)
      );

      if (!hasValidExtension) {
        return { isValid: false, error: 'URL does not contain valid image extension' };
      }

      return { isValid: true };
    } catch (error) {
      return { isValid: false, error: 'URL validation failed' };
    }
  }

  /**
   * Get a fallback image URL if the original fails
   */
  static getFallbackImageUrl(): string {
    return 'https://images.pexels.com/photos/1327838/pexels-photo-1327838.jpeg?auto=compress&cs=tinysrgb&w=400';
  }

  /**
   * Add cache busting parameter to URL
   */
  static addCacheBusting(url: string): string {
    if (!url || typeof url !== 'string') return url;
    
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}t=${Date.now()}`;
  }

  /**
   * Get proper image source object with headers
   */
  static getImageSource(uri: string, useCacheBusting: boolean = true) {
    const finalUri = useCacheBusting ? this.addCacheBusting(uri) : uri;
    
    return {
      uri: finalUri,
      cache: 'reload' as const,
      headers: {
        'Accept': 'image/jpeg,image/png,image/webp,image/gif,*/*',
        'User-Agent': 'RacerApp/1.0'
      }
    };
  }

  /**
   * Check if URL is a Supabase storage URL
   */
  static isSupabaseUrl(url: string): boolean {
    return url.includes('supabase.co') && url.includes('/storage/v1/object/public/');
  }

  /**
   * Get optimized image URL for Supabase storage
   */
  static getOptimizedSupabaseUrl(url: string, width?: number, height?: number): string {
    if (!this.isSupabaseUrl(url)) return url;
    
    // Add transformation parameters for Supabase storage
    const separator = url.includes('?') ? '&' : '?';
    let optimizedUrl = url;
    
    if (width || height) {
      const transforms = [];
      if (width) transforms.push(`width=${width}`);
      if (height) transforms.push(`height=${height}`);
      optimizedUrl += `${separator}transform=${transforms.join(',')}`;
    }
    
    return optimizedUrl;
  }

  /**
   * Create a safe image source with error handling
   */
  static createSafeImageSource(
    primaryUrl: string | null | undefined, 
    fallbackUrl?: string
  ) {
    const url = primaryUrl || fallbackUrl || this.getFallbackImageUrl();
    
    // Additional validation for Supabase URLs
    if (this.isSupabaseUrl(url)) {
      // For Supabase URLs, try to optimize them
      const optimizedUrl = this.getOptimizedSupabaseUrl(url, 400, 300);
      return this.getImageSource(optimizedUrl);
    }
    
    return this.getImageSource(url);
  }

  /**
   * Create a robust image source with multiple fallbacks
   */
  static createRobustImageSource(
    primaryUrl: string | null | undefined,
    fallbackUrl?: string,
    options?: {
      width?: number;
      height?: number;
      quality?: number;
    }
  ) {
    const url = primaryUrl || fallbackUrl || this.getFallbackImageUrl();
    
    // For Supabase URLs, apply optimizations
    if (this.isSupabaseUrl(url)) {
      const optimizedUrl = this.getOptimizedSupabaseUrl(url, options?.width, options?.height);
      return this.getImageSource(optimizedUrl, false); // Don't add cache busting for Supabase
    }
    
    return this.getImageSource(url);
  }

  /**
   * Validate and fix image URL if needed
   */
  static validateAndFixUrl(url: string): string {
    if (!url || typeof url !== 'string') {
      return this.getFallbackImageUrl();
    }

    // Check if it's a valid image URL
    const validExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
    const hasValidExtension = validExtensions.some(ext => 
      url.toLowerCase().includes(ext)
    );

    if (!hasValidExtension) {
      console.warn(`Invalid image URL (no valid extension): ${url}`);
      return this.getFallbackImageUrl();
    }

    // For Supabase URLs, ensure they're properly formatted
    if (this.isSupabaseUrl(url)) {
      // Remove any existing cache busting parameters
      const cleanUrl = url.split('?')[0];
      return cleanUrl;
    }

    return url;
  }

  /**
   * Log image loading details for debugging
   */
  static logImageDetails(title: string, url: string, type: 'listing' | 'avatar' = 'listing') {
    // Debug logging removed
  }

  /**
   * Handle image loading errors with fallback
   */
  static handleImageError(error: any, originalUrl: string, title: string): string {
    console.warn(`Image load error for "${title}":`, {
      error: error?.nativeEvent?.error || error,
      originalUrl,
      isSupabase: this.isSupabaseUrl(originalUrl)
    });

    // Return fallback URL
    return this.getFallbackImageUrl();
  }

  /**
   * Check if image URL is likely to work
   */
  static isLikelyValidImageUrl(url: string): boolean {
    if (!url || typeof url !== 'string') return false;
    
    // Must be HTTP/HTTPS
    if (!url.startsWith('http://') && !url.startsWith('https://')) return false;
    
    // Must have valid image extension
    const validExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
    const hasValidExtension = validExtensions.some(ext => 
      url.toLowerCase().includes(ext)
    );
    
    return hasValidExtension;
  }

  /**
   * Extract the storage file path from a Supabase public image URL
   * Example: https://xyz.supabase.co/storage/v1/object/public/listings/folder/file.jpg
   * Returns: folder/file.jpg
   */
  static extractStoragePathFromUrl(url: string): string | null {
    if (!this.isSupabaseUrl(url)) return null;
    // Find the part after '/storage/v1/object/public/listings/'
    const match = url.match(/\/storage\/v1\/object\/public\/listings\/(.+)$/);
    return match ? match[1] : null;
  }
} 