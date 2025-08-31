/**
 * New Image Service for Organized Folder Structure
 * Works with the new username/timestamp/ folder organization
 */

export interface ImageSet {
  thumbnail: string;
  preview: string;
}

export interface ImageMetadata {
  folderPath: string;
  username: string;
  timestamp: string;
  imageCount: number;
  hasImages: boolean;
}

export class NewImageService {
  private static readonly SUPABASE_URL = 'https://vroanjodovwsyydxrmma.supabase.co';
  private static readonly BUCKET_NAME = 'listings';
  private static readonly FALLBACK_IMAGE = '';

  /**
   * Get the best image URL for a listing based on size requirements
   */
  static getBestImageUrl(
    thumbnailImages: string[] | null | undefined,
    previewImages: string[] | null | undefined,
    size: 'thumbnail' | 'preview' = 'thumbnail'
  ): string {
    // Try to get image from the appropriate array based on size
    let imageUrl: string | null = null;

    switch (size) {
      case 'thumbnail':
        // Prefer thumbnails, fall back to previews
        imageUrl = this.getFirstValidImage(thumbnailImages) ||
                   this.getFirstValidImage(previewImages);
        break;
      case 'preview':
        // Prefer previews, fall back to thumbnails
        imageUrl = this.getFirstValidImage(previewImages) ||
                   this.getFirstValidImage(thumbnailImages);
        break;
    }

    return imageUrl || this.FALLBACK_IMAGE;
  }

  /**
   * Get all image URLs for a listing
   */
  static getImageSet(
    thumbnailImages: string[] | null | undefined,
    previewImages: string[] | null | undefined
  ): ImageSet {
    return {
      thumbnail: this.getFirstValidImage(thumbnailImages) || this.FALLBACK_IMAGE,
      preview: this.getFirstValidImage(previewImages) || this.FALLBACK_IMAGE
    };
  }

  /**
   * Extract metadata from image folder path
   */
  static extractImageMetadata(folderPath: string | null | undefined): ImageMetadata {
    if (!folderPath) {
      return {
        folderPath: '',
        username: '',
        timestamp: '',
        imageCount: 0,
        hasImages: false
      };
    }

    const parts = folderPath.split('/');
    const encodedUsername = parts[0] || '';
    const timestamp = parts[1] || '';
    
    // Decode username to get the original value
    const username = decodeURIComponent(encodedUsername);

    return {
      folderPath,
      username,
      timestamp,
      imageCount: parts.length >= 2 ? 2 : 0, // Should have 2 images: thumbnail, preview
      hasImages: parts.length >= 2
    };
  }

  /**
   * Generate image URLs from folder path
   */
  static generateImageUrlsFromFolder(folderPath: string): ImageSet {
    if (!folderPath) {
      return {
        thumbnail: this.FALLBACK_IMAGE,
        preview: this.FALLBACK_IMAGE
      };
    }

    // Ensure the folder path is properly encoded for URL
    const encodedFolderPath = folderPath.split('/').map(part => encodeURIComponent(part)).join('/');
    const baseUrl = `${this.SUPABASE_URL}/storage/v1/object/public/${this.BUCKET_NAME}/${encodedFolderPath}`;

    return {
      thumbnail: `${baseUrl}/thumbnail.jpg`,
      preview: `${baseUrl}/preview.jpg`
    };
  }

  /**
   * Check if image URLs follow the new organized structure
   */
  static isOrganizedStructure(thumbnailImages: string[] | null | undefined): boolean {
    if (!thumbnailImages || thumbnailImages.length === 0) return false;

    const firstImage = thumbnailImages[0];
    return firstImage.includes('/storage/v1/object/public/listings/') && 
           firstImage.includes('/thumbnail.jpg');
  }

  /**
   * Migrate old image URLs to new structure
   */
  static migrateOldImageUrls(oldImages: string[]): ImageSet {
    if (!oldImages || oldImages.length === 0) {
      return {
        thumbnail: this.FALLBACK_IMAGE,
        preview: this.FALLBACK_IMAGE
      };
    }

    // For old structure, use the same image for all sizes
    const thumbnailUrl = oldImages[0] || this.FALLBACK_IMAGE;
    
    return {
      thumbnail: thumbnailUrl,
      preview: thumbnailUrl
    };
  }

  /**
   * Get optimized image URL with size parameters
   */
  static getOptimizedImageUrl(imageUrl: string, width?: number, height?: number): string {
    if (!imageUrl || !this.isSupabaseUrl(imageUrl)) return imageUrl;

    const separator = imageUrl.includes('?') ? '&' : '?';
    let optimizedUrl = imageUrl;

    if (width || height) {
      const transforms = [];
      if (width) transforms.push(`width=${width}`);
      if (height) transforms.push(`height=${height}`);
      optimizedUrl += `${separator}transform=${transforms.join(',')}`;
    }

    return optimizedUrl;
  }

  /**
   * Validate image URL
   */
  static validateImageUrl(url: string): boolean {
    if (!url || typeof url !== 'string') return false;
    
    // Check if it's a valid URL
    try {
      new URL(url);
    } catch {
      return false;
    }

    // Check for image extensions
    const validExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
    return validExtensions.some(ext => url.toLowerCase().includes(ext));
  }

  /**
   * Get fallback image URL
   */
  static getFallbackImageUrl(): string {
    return '';
  }

  /**
   * Get image source object for React Native Image component
   */
  static getImageSource(
    imageUrl: string, 
    options: {
      width?: number;
      height?: number;
      useCacheBusting?: boolean;
    } = {}
  ) {
    const { width, height, useCacheBusting = true } = options;
    
    let finalUrl = imageUrl;
    
    // Add cache busting if requested
    if (useCacheBusting) {
      finalUrl = this.addCacheBusting(finalUrl);
    }
    
    // Add optimization parameters
    if (width || height) {
      finalUrl = this.getOptimizedImageUrl(finalUrl, width, height);
    }

    return {
      uri: finalUrl,
      cache: 'reload' as const,
      headers: {
        'Accept': 'image/jpeg,image/png,image/webp,image/gif,*/*',
        'User-Agent': 'RacerApp/1.0'
      }
    };
  }

  /**
   * Add cache busting parameter
   */
  private static addCacheBusting(url: string): string {
    if (!url || typeof url !== 'string') return url;
    
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}t=${Date.now()}`;
  }

  /**
   * Check if URL is from Supabase storage
   */
  private static isSupabaseUrl(url: string): boolean {
    return url.includes('supabase.co') && url.includes('/storage/v1/object/public/');
  }

  /**
   * Get first valid image from array
   */
  private static getFirstValidImage(images: string[] | null | undefined): string | null {
    if (!images || images.length === 0) return null;
    
    for (const image of images) {
      if (this.validateImageUrl(image)) {
        return image;
      }
    }
    
    return null;
  }

  /**
   * Log image details for debugging
   */
  static logImageDetails(title: string, imageSet: ImageSet, metadata: ImageMetadata) {
    // Debug logging removed
  }
} 