import * as ImageManipulator from 'expo-image-manipulator';
import { supabase } from './supabaseClient';
import { enhancedCache } from './enhancedCacheManager';
import { performanceMonitor } from './performanceMonitor';

export interface ImageProcessingOptions {
  quality?: number;
  maxWidth?: number;
  maxHeight?: number;
  format?: 'jpeg' | 'png' | 'webp';
  compression?: number;
}

export interface ImageUploadResult {
  url: string;
  thumbnailUrl?: string;
  size: number;
  width: number;
  height: number;
  format: string;
}

export interface CDNImageOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'jpeg' | 'png' | 'webp' | 'avif';
  fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
  crop?: 'top' | 'bottom' | 'left' | 'right' | 'center';
}

export class EnhancedImageService {
  private static instance: EnhancedImageService;
  private readonly maxFileSize = 10 * 1024 * 1024; // 10MB
  private readonly supportedFormats = ['image/jpeg', 'image/png', 'image/webp'];
  private readonly defaultOptions: ImageProcessingOptions = {
    quality: 0.8,
    maxWidth: 1920,
    maxHeight: 1080,
    format: 'jpeg',
    compression: 0.8,
  };

  static getInstance(): EnhancedImageService {
    if (!EnhancedImageService.instance) {
      EnhancedImageService.instance = new EnhancedImageService();
    }
    return EnhancedImageService.instance;
  }

  /**
   * Process and optimize image before upload
   */
  async processImage(
    imageUri: string,
    options: Partial<ImageProcessingOptions> = {}
  ): Promise<string> {
    return performanceMonitor.trackOperation('process_image', async () => {
      const config = { ...this.defaultOptions, ...options };
      
      // Get image info
      const imageInfo = await this.getImageInfo(imageUri);
      
      // Check if processing is needed
      if (this.shouldSkipProcessing(imageInfo, config)) {
        return imageUri;
      }
      
             // Process image
       const processedImage = await ImageManipulator.manipulateAsync(
         imageUri,
         [
           {
             resize: {
               width: config.maxWidth!,
               height: config.maxHeight!,
             },
           },
         ],
         {
           compress: config.compression!,
           format: ImageManipulator.SaveFormat.JPEG,
         }
       );
      
      return processedImage.uri;
    });
  }

  /**
   * Upload image with optimization
   */
  async uploadImage(
    imageUri: string,
    bucket = 'images',
    path?: string,
    options: Partial<ImageProcessingOptions> = {}
  ): Promise<ImageUploadResult> {
    return performanceMonitor.trackOperation('upload_image', async () => {
      // Process image first
      const processedUri = await this.processImage(imageUri, options);
      
      // Generate unique filename
      const filename = this.generateFilename(path);
      
             // Upload to Supabase Storage
       const { data, error } = await supabase.storage
         .from(bucket)
         .upload(filename, processedUri);
      
      if (error) {
        throw new Error(`Upload failed: ${error.message}`);
      }
      
      // Get public URL
      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(filename);
      
      // Create thumbnail
      const thumbnailUrl = await this.createThumbnail(processedUri, bucket);
      
      // Get image metadata
      const metadata = await this.getImageInfo(processedUri);
          
          return {
        url: urlData.publicUrl,
        thumbnailUrl,
        size: metadata.size,
        width: metadata.width,
        height: metadata.height,
        format: metadata.format,
      };
    });
  }

  /**
   * Create thumbnail for image
   */
  private async createThumbnail(imageUri: string, bucket: string): Promise<string> {
    try {
      const thumbnail = await ImageManipulator.manipulateAsync(
        imageUri,
        [
          {
            resize: {
              width: 300,
              height: 300,
            },
          },
        ],
        {
          compress: 0.7,
          format: ImageManipulator.SaveFormat.JPEG,
        }
      );
      
      const thumbnailFilename = `thumbnails/${this.generateFilename()}`;
      
             const { error } = await supabase.storage
         .from(bucket)
         .upload(thumbnailFilename, thumbnail.uri);
      
      if (error) {
        console.error('Thumbnail upload error:', error);
        return '';
      }
      
      const { data } = supabase.storage
        .from(bucket)
        .getPublicUrl(thumbnailFilename);
      
      return data.publicUrl;
    } catch (error) {
      console.error('Thumbnail creation error:', error);
      return '';
    }
  }

  /**
   * Get optimized CDN URL
   */
  getOptimizedImageUrl(
    originalUrl: string,
    options: CDNImageOptions = {}
  ): string {
    if (!originalUrl || !originalUrl.includes('supabase.co')) {
      return originalUrl;
    }
    
    const params = new URLSearchParams();
    
    if (options.width) params.append('width', options.width.toString());
    if (options.height) params.append('height', options.height.toString());
    if (options.quality) params.append('quality', options.quality.toString());
    if (options.format) params.append('format', options.format);
    if (options.fit) params.append('fit', options.fit);
    if (options.crop) params.append('crop', options.crop);
    
    const queryString = params.toString();
    return queryString ? `${originalUrl}?${queryString}` : originalUrl;
  }

  /**
   * Preload and cache images
   */
  async preloadImages(urls: string[], options: CDNImageOptions = {}): Promise<void> {
    return performanceMonitor.trackOperation('preload_images', async () => {
      const optimizedUrls = urls.map(url => this.getOptimizedImageUrl(url, options));
      
      // Cache optimized URLs
      await enhancedCache.batchSet(
        optimizedUrls.map(url => ({
          key: `image_${this.hashUrl(url)}`,
          data: { url, optimized: true },
          ttl: 3600000, // 1 hour
        }))
      );
    });
  }

  /**
   * Get image with caching and optimization
   */
  async getOptimizedImage(
    originalUrl: string,
    options: CDNImageOptions = {}
  ): Promise<string> {
    const cacheKey = `optimized_image_${this.hashUrl(originalUrl)}_${JSON.stringify(options)}`;
    
    // Check cache first
    const cached = await enhancedCache.get<{ url: string }>(cacheKey);
    if (cached) {
      return cached.url;
    }
    
    // Generate optimized URL
    const optimizedUrl = this.getOptimizedImageUrl(originalUrl, options);
    
    // Cache the result
    await enhancedCache.set(cacheKey, { url: optimizedUrl }, 3600000); // 1 hour
    
    return optimizedUrl;
  }

  /**
   * Batch upload multiple images
   */
  async batchUploadImages(
    imageUris: string[],
    bucket = 'images',
    options: Partial<ImageProcessingOptions> = {}
  ): Promise<ImageUploadResult[]> {
    return performanceMonitor.trackOperation('batch_upload_images', async () => {
      const results: ImageUploadResult[] = [];
      
      // Process images in parallel with concurrency limit
      const concurrencyLimit = 3;
      const chunks = this.chunkArray(imageUris, concurrencyLimit);
      
      for (const chunk of chunks) {
        const chunkResults = await Promise.all(
          chunk.map(uri => this.uploadImage(uri, bucket, undefined, options))
        );
        results.push(...chunkResults);
      }
      
      return results;
    });
  }

  /**
   * Validate image file
   */
  async validateImage(imageUri: string): Promise<{ valid: boolean; error?: string }> {
    try {
      const info = await this.getImageInfo(imageUri);
      
      if (!this.supportedFormats.includes(info.type)) {
        return { valid: false, error: 'Unsupported image format' };
      }
      
      if (info.size > this.maxFileSize) {
        return { valid: false, error: 'Image file too large' };
      }
      
      if (info.width < 100 || info.height < 100) {
        return { valid: false, error: 'Image dimensions too small' };
      }
      
      return { valid: true };
    } catch (error) {
      return { valid: false, error: 'Invalid image file' };
    }
  }

  /**
   * Get image information
   */
  private async getImageInfo(imageUri: string): Promise<{
    width: number;
    height: number;
    size: number;
    type: string;
    format: string;
  }> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        resolve({
          width: img.width,
          height: img.height,
          size: 0, // Would need to get actual file size
          type: 'image/jpeg', // Default
          format: 'jpeg',
        });
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = imageUri;
    });
  }

  /**
   * Check if image processing can be skipped
   */
  private shouldSkipProcessing(
    imageInfo: any,
    options: ImageProcessingOptions
  ): boolean {
    return (
      imageInfo.width <= options.maxWidth! &&
      imageInfo.height <= options.maxHeight! &&
      imageInfo.size <= 1024 * 1024 // 1MB
    );
  }

  /**
   * Generate unique filename
   */
  private generateFilename(path?: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    const filename = `${timestamp}_${random}.jpg`;
    return path ? `${path}/${filename}` : filename;
  }

  /**
   * Hash URL for caching
   */
  private hashUrl(url: string): string {
    return url.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50);
  }

  /**
   * Split array into chunks
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * Clean up old images
   */
  async cleanupOldImages(bucket = 'images', olderThanDays = 30): Promise<void> {
    return performanceMonitor.trackOperation('cleanup_old_images', async () => {
      try {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
        
        // List all files in bucket
        const { data: files, error } = await supabase.storage
          .from(bucket)
          .list();
        
        if (error) {
          throw error;
        }
        
        // Filter old files
        const oldFiles = files
          .filter(file => new Date(file.created_at) < cutoffDate)
          .map(file => file.name);
        
        if (oldFiles.length > 0) {
          await supabase.storage
            .from(bucket)
            .remove(oldFiles);
        }
      } catch (error) {
        console.error('Cleanup old images error:', error);
      }
    });
  }

  /**
   * Get image analytics
   */
  async getImageAnalytics(): Promise<{
    totalImages: number;
    totalSize: number;
    averageSize: number;
    formats: Record<string, number>;
  }> {
    return performanceMonitor.trackOperation('get_image_analytics', async () => {
      try {
        const { data: files, error } = await supabase.storage
          .from('images')
          .list();
        
        if (error) {
          throw error;
        }
        
        const totalImages = files.length;
        const totalSize = files.reduce((sum, file) => sum + (file.metadata?.size || 0), 0);
        const averageSize = totalImages > 0 ? totalSize / totalImages : 0;
        
        const formats: Record<string, number> = {};
        files.forEach(file => {
          const format = file.name.split('.').pop() || 'unknown';
          formats[format] = (formats[format] || 0) + 1;
        });

    return {
          totalImages,
          totalSize,
          averageSize,
          formats,
        };
      } catch (error) {
        console.error('Get image analytics error:', error);
        return {
          totalImages: 0,
          totalSize: 0,
          averageSize: 0,
          formats: {},
        };
      }
    });
  }
}

// Export singleton instance
export const enhancedImageService = EnhancedImageService.getInstance(); 