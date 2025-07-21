import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from './supabaseClient';
import { Platform } from 'react-native';
import { UploadHelper } from './uploadHelper';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface MarketplaceImage {
  id: string;
  originalUrl: string;
  thumbnailUrl: string;
  previewUrl: string;
  filename: string;
  size: number;
  width: number;
  height: number;
  uploadedAt: string;
}

export interface UploadProgress {
  percentage: number;
  loaded: number;
  total: number;
  stage: 'compressing' | 'uploading' | 'processing';
}

export interface ImageUploadOptions {
  quality?: number;
  maxWidth?: number;
  maxHeight?: number;
  generateThumbnails?: boolean;
  onProgress?: (progress: UploadProgress) => void;
}

export interface ListingImageUpload {
  images: MarketplaceImage[];
  primaryImageIndex: number;
}

// ============================================================================
// CONSTANTS & CONFIGURATION
// ============================================================================

const MARKETPLACE_CONFIG = {
  // File size limits (matching your Supabase buckets)
  MAX_FILE_SIZES: {
    LISTINGS: 5 * 1024 * 1024, // 5MB
    AVATARS: 2 * 1024 * 1024,  // 2MB
    TEMP: 10 * 1024 * 1024     // 10MB
  },
  
  // Image dimensions for different use cases
  DIMENSIONS: {
    LISTING: {
      ORIGINAL: { width: 1200, height: 1200 },
      THUMBNAIL: { width: 400, height: 400 },
      PREVIEW: { width: 200, height: 200 }
    },
    AVATAR: {
      ORIGINAL: { width: 400, height: 400 },
      THUMBNAIL: { width: 100, height: 100 }
    }
  },
  
  // Compression settings
  COMPRESSION: {
    LISTING: { quality: 0.85, format: 'jpeg' },
    AVATAR: { quality: 0.8, format: 'jpeg' },
    THUMBNAIL: { quality: 0.7, format: 'jpeg' }
  },
  
  // Supported formats
  SUPPORTED_FORMATS: ['image/jpeg', 'image/png', 'image/webp'],
  
  // Maximum images per listing
  MAX_LISTING_IMAGES: 8
} as const;

// ============================================================================
// IMAGE PICKING & VALIDATION
// ============================================================================

export class MarketplaceImageService {
  // ============================================================================
  // RECOMMENDED IMPROVEMENTS:
  // ============================================================================
  
  // 1. IMAGE OPTIMIZATION
  // - Add WebP format support for better compression
  // - Implement progressive JPEG loading
  // - Add image lazy loading for listings
  // - Implement image caching strategy
  
  // 2. PERFORMANCE ENHANCEMENTS
  // - Add image preloading for better UX
  // - Implement virtual scrolling for large image grids
  // - Add image resizing on client-side before upload
  // - Implement background upload with retry logic
  
  // 3. USER EXPERIENCE
  // - Add image cropping/editing before upload
  // - Implement drag-and-drop reordering
  // - Add image filters and effects
  // - Implement bulk image operations
  
  // 4. SECURITY & VALIDATION
  // - Add image watermarking for listings
  // - Implement image content moderation
  // - Add virus scanning for uploaded images
  // - Implement rate limiting for uploads
  
  // 5. ANALYTICS & MONITORING
  // - Track upload success/failure rates
  // - Monitor image storage usage
  // - Add performance metrics
  // - Implement error reporting

  /**
   * Pick images for listing (OLX-style)
   */
  static async pickListingImages(
    maxImages: number = MARKETPLACE_CONFIG.MAX_LISTING_IMAGES
  ): Promise<ImagePicker.ImagePickerResult> {
    try {
      // Request permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Gallery permission required');
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        selectionLimit: maxImages,
        quality: 1, // Get original quality for processing
        aspect: [4, 3], // Standard marketplace aspect ratio
      });

      if (result.canceled) {
        throw new Error('Image selection cancelled');
      }

      return result;
    } catch (error) {
      // Don't log cancellation as an error
      if (error instanceof Error && !error.message.includes('cancelled')) {
        console.error('Error picking listing images:', error);
      }
      throw error;
    }
  }

  /**
   * Take photo for listing
   */
  static async takeListingPhoto(): Promise<ImagePicker.ImagePickerResult> {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Camera permission required');
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1,
      });

      if (result.canceled) {
        throw new Error('Photo capture cancelled');
      }

      return result;
    } catch (error) {
      // Don't log cancellation as an error
      if (error instanceof Error && !error.message.includes('cancelled')) {
        console.error('Error taking listing photo:', error);
      }
      throw error;
    }
  }

  /**
   * Pick avatar image
   */
  static async pickAvatarImage(): Promise<ImagePicker.ImagePickerResult> {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Gallery permission required');
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1], // Square for avatars
        quality: 1,
      });

      if (result.canceled) {
        throw new Error('Avatar selection cancelled');
      }

      return result;
    } catch (error) {
      // Don't log cancellation as an error
      if (error instanceof Error && !error.message.includes('cancelled')) {
        console.error('Error picking avatar:', error);
      }
      throw error;
    }
  }

  /**
   * Validate image for marketplace upload
   */
  static async validateImage(
    uri: string,
    type: 'listing' | 'avatar'
  ): Promise<{ isValid: boolean; errors: string[]; warnings: string[] }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Get image info
      const imageInfo = await ImageManipulator.manipulateAsync(
        uri,
        [],
        { format: ImageManipulator.SaveFormat.JPEG, compress: 1 }
      );

      // Check file size
      const fileInfo = await this.getFileInfo(uri);
      const maxSize = type === 'listing' 
        ? MARKETPLACE_CONFIG.MAX_FILE_SIZES.LISTINGS 
        : MARKETPLACE_CONFIG.MAX_FILE_SIZES.AVATARS;

      if (fileInfo.size > maxSize) {
        errors.push(`File too large. Maximum size is ${maxSize / (1024 * 1024)}MB`);
      }

      // Check dimensions
      const maxDimensions = type === 'listing' 
        ? MARKETPLACE_CONFIG.DIMENSIONS.LISTING.ORIGINAL
        : MARKETPLACE_CONFIG.DIMENSIONS.AVATAR.ORIGINAL;

      if (imageInfo.width > maxDimensions.width || imageInfo.height > maxDimensions.height) {
        warnings.push(`Image will be resized to ${maxDimensions.width}x${maxDimensions.height}`);
      }

      // Check aspect ratio for listings
      if (type === 'listing') {
        const aspectRatio = imageInfo.width / imageInfo.height;
        if (aspectRatio < 0.5 || aspectRatio > 2) {
          warnings.push('Consider using a 4:3 aspect ratio for better display');
        }
      }

      return { isValid: errors.length === 0, errors, warnings };
    } catch (error) {
      console.error('Image validation error:', error);
      errors.push('Failed to validate image');
      return { isValid: false, errors, warnings };
    }
  }

  // ============================================================================
  // IMAGE PROCESSING
  // ============================================================================

  /**
   * Process image for marketplace listing
   */
  static async processListingImage(
    uri: string,
    options: ImageUploadOptions = {}
  ): Promise<{
    original: { uri: string; width: number; height: number; size: number };
    thumbnail: { uri: string; width: number; height: number; size: number };
    preview: { uri: string; width: number; height: number; size: number };
  }> {
    const {
      quality = MARKETPLACE_CONFIG.COMPRESSION.LISTING.quality,
      maxWidth = MARKETPLACE_CONFIG.DIMENSIONS.LISTING.ORIGINAL.width,
      maxHeight = MARKETPLACE_CONFIG.DIMENSIONS.LISTING.ORIGINAL.height,
      onProgress
    } = options;

    try {
      // Update progress
      onProgress?.({ percentage: 10, loaded: 0, total: 100, stage: 'compressing' });

      // Process original image
      const original = await ImageManipulator.manipulateAsync(
        uri,
        [
          {
            resize: {
              width: maxWidth,
              height: maxHeight,
            },
          },
        ],
        {
          compress: quality,
          format: ImageManipulator.SaveFormat.JPEG,
        }
      );

      onProgress?.({ percentage: 40, loaded: 40, total: 100, stage: 'compressing' });

      // Generate thumbnail
      const thumbnail = await ImageManipulator.manipulateAsync(
        uri,
        [
          {
            resize: {
              width: MARKETPLACE_CONFIG.DIMENSIONS.LISTING.THUMBNAIL.width,
              height: MARKETPLACE_CONFIG.DIMENSIONS.LISTING.THUMBNAIL.height,
            },
          },
        ],
        {
          compress: MARKETPLACE_CONFIG.COMPRESSION.THUMBNAIL.quality,
          format: ImageManipulator.SaveFormat.JPEG,
        }
      );

      onProgress?.({ percentage: 70, loaded: 70, total: 100, stage: 'compressing' });

      // Generate preview
      const preview = await ImageManipulator.manipulateAsync(
        uri,
        [
          {
            resize: {
              width: MARKETPLACE_CONFIG.DIMENSIONS.LISTING.PREVIEW.width,
              height: MARKETPLACE_CONFIG.DIMENSIONS.LISTING.PREVIEW.height,
            },
          },
        ],
        {
          compress: MARKETPLACE_CONFIG.COMPRESSION.THUMBNAIL.quality,
          format: ImageManipulator.SaveFormat.JPEG,
        }
      );

      onProgress?.({ percentage: 100, loaded: 100, total: 100, stage: 'compressing' });

      return {
        original: {
          uri: original.uri,
          width: original.width,
          height: original.height,
          size: await this.getFileSize(original.uri),
        },
        thumbnail: {
          uri: thumbnail.uri,
          width: thumbnail.width,
          height: thumbnail.height,
          size: await this.getFileSize(thumbnail.uri),
        },
        preview: {
          uri: preview.uri,
          width: preview.width,
          height: preview.height,
          size: await this.getFileSize(preview.uri),
        },
      };
    } catch (error) {
      console.error('Error processing listing image:', error);
      throw new Error('Failed to process image');
    }
  }

  /**
   * Process avatar image
   */
  static async processAvatarImage(
    uri: string,
    options: ImageUploadOptions = {}
  ): Promise<{
    original: { uri: string; width: number; height: number; size: number };
    thumbnail: { uri: string; width: number; height: number; size: number };
  }> {
    const {
      quality = MARKETPLACE_CONFIG.COMPRESSION.AVATAR.quality,
      onProgress
    } = options;

    try {
      onProgress?.({ percentage: 20, loaded: 20, total: 100, stage: 'compressing' });

      // Process original avatar
      const original = await ImageManipulator.manipulateAsync(
        uri,
        [
          {
            resize: {
              width: MARKETPLACE_CONFIG.DIMENSIONS.AVATAR.ORIGINAL.width,
              height: MARKETPLACE_CONFIG.DIMENSIONS.AVATAR.ORIGINAL.height,
            },
          },
        ],
        {
          compress: quality,
          format: ImageManipulator.SaveFormat.JPEG,
        }
      );

      onProgress?.({ percentage: 60, loaded: 60, total: 100, stage: 'compressing' });

      // Generate thumbnail
      const thumbnail = await ImageManipulator.manipulateAsync(
        uri,
        [
          {
            resize: {
              width: MARKETPLACE_CONFIG.DIMENSIONS.AVATAR.THUMBNAIL.width,
              height: MARKETPLACE_CONFIG.DIMENSIONS.AVATAR.THUMBNAIL.height,
            },
          },
        ],
        {
          compress: MARKETPLACE_CONFIG.COMPRESSION.THUMBNAIL.quality,
          format: ImageManipulator.SaveFormat.JPEG,
        }
      );

      onProgress?.({ percentage: 100, loaded: 100, total: 100, stage: 'compressing' });

      return {
        original: {
          uri: original.uri,
          width: original.width,
          height: original.height,
          size: await this.getFileSize(original.uri),
        },
        thumbnail: {
          uri: thumbnail.uri,
          width: thumbnail.width,
          height: thumbnail.height,
          size: await this.getFileSize(thumbnail.uri),
        },
      };
    } catch (error) {
      console.error('Error processing avatar image:', error);
      throw new Error('Failed to process avatar');
    }
  }

  // ============================================================================
  // UPLOAD FUNCTIONS
  // ============================================================================

  /**
   * Upload listing images (OLX-style)
   */
  static async uploadListingImages(
    uris: string[],
    listingId: string,
    options: ImageUploadOptions = {}
  ): Promise<ListingImageUpload> {
    const images: MarketplaceImage[] = [];
    let primaryImageIndex = 0;

    try {
      for (let i = 0; i < uris.length; i++) {
        const uri = uris[i];
        const isPrimary = i === 0; // First image is primary

        // Process image
        const processed = await this.processListingImage(uri, {
          ...options,
          onProgress: (progress) => {
            options.onProgress?.({
              ...progress,
              percentage: (progress.percentage / uris.length) + (i * (100 / uris.length)),
            });
          },
        });

        // Generate unique filename
        const timestamp = Date.now();
        const filename = `listing_${listingId}_${timestamp}_${i}`;

        // Upload original
        const originalUrl = await this.uploadToSupabase(
          processed.original.uri,
          'listings',
          `${filename}_original.jpg`,
          listingId
        );

        // Upload thumbnail
        const thumbnailUrl = await this.uploadToSupabase(
          processed.thumbnail.uri,
          'listings',
          `${filename}_thumb.jpg`,
          listingId
        );

        // Upload preview
        const previewUrl = await this.uploadToSupabase(
          processed.preview.uri,
          'listings',
          `${filename}_preview.jpg`,
          listingId
        );

        // Create marketplace image object
        const marketplaceImage: MarketplaceImage = {
          id: `${listingId}_${i}`,
          originalUrl,
          thumbnailUrl,
          previewUrl,
          filename,
          size: processed.original.size,
          width: processed.original.width,
          height: processed.original.height,
          uploadedAt: new Date().toISOString(),
        };

        images.push(marketplaceImage);
      }

      return { images, primaryImageIndex };
    } catch (error) {
      console.error('Error uploading listing images:', error);
      throw new Error('Failed to upload listing images');
    }
  }

  /**
   * Upload avatar image
   */
  static async uploadAvatarImage(
    uri: string,
    username: string,
    options: ImageUploadOptions = {}
  ): Promise<MarketplaceImage> {
    try {
      // Process avatar
      const processed = await this.processAvatarImage(uri, options);

      // Generate filename
      const timestamp = Date.now();
      const filename = `avatar_${username}_${timestamp}`;

      // Upload original
      const originalUrl = await this.uploadToSupabase(
        processed.original.uri,
        'avatars',
        `${filename}_original.jpg`,
        username
      );

      // Upload thumbnail
      const thumbnailUrl = await this.uploadToSupabase(
        processed.thumbnail.uri,
        'avatars',
        `${filename}_thumb.jpg`,
        username
      );

      return {
        id: `avatar_${username}`,
        originalUrl,
        thumbnailUrl,
        previewUrl: thumbnailUrl, // Use thumbnail as preview for avatars
        filename,
        size: processed.original.size,
        width: processed.original.width,
        height: processed.original.height,
        uploadedAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Error uploading avatar:', error);
      throw new Error('Failed to upload avatar');
    }
  }

  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================

  /**
   * Upload file to Supabase Storage
   */
  private static async uploadToSupabase(
    uri: string,
    bucket: string,
    filename: string,
    username?: string
  ): Promise<string> {
          try {
        // Create proper file path with user folder
        const filePath = username ? `${username}/${filename}` : filename;
        console.log(`Uploading ${filePath} to bucket ${bucket}...`);
        
        // Validate URI first
        const isValid = await UploadHelper.validateUri(uri);
        if (!isValid) {
          throw new Error(`Invalid URI: ${uri}`);
        }
        
        let uploadResult;
        
        if (Platform.OS === 'web') {
          // Web: use blob upload
          const blob = await UploadHelper.uriToBlob(uri);
          console.log(`Blob created, size: ${blob.size} bytes`);
          
          uploadResult = await supabase.storage
            .from(bucket)
            .upload(filePath, blob, {
              contentType: 'image/jpeg',
              cacheControl: '3600',
              upsert: false,
            });
        } else {
          // React Native: use direct file upload
          console.log(`Direct file upload for React Native...`);
          
          // Get MIME type from filename
          const mimeType = this.getMimeTypeFromFilename(filename);
          console.log(`Using MIME type: ${mimeType}`);
          
          uploadResult = await supabase.storage
            .from(bucket)
            .upload(filePath, uri, {
              contentType: mimeType,
              cacheControl: '3600',
              upsert: false,
            });
        }

      if (uploadResult.error) {
        console.error('Supabase upload error:', uploadResult.error);
        throw new Error(`Upload failed: ${uploadResult.error.message}`);
      }

      console.log(`Upload successful for ${filename}`);

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath);

      return urlData.publicUrl;
    } catch (error) {
      console.error('Error in uploadToSupabase:', error);
      throw new Error(`Failed to upload to storage: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get file size from URI
   */
  private static async getFileSize(uri: string): Promise<number> {
    try {
      return await UploadHelper.getFileSize(uri);
    } catch (error) {
      console.error('Error getting file size:', error);
      return 0;
    }
  }

  /**
   * Get MIME type from filename
   */
  private static getMimeTypeFromFilename(filename: string): string {
    const extension = filename.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'jpg':
      case 'jpeg':
        return 'image/jpeg';
      case 'png':
        return 'image/png';
      case 'webp':
        return 'image/webp';
      case 'gif':
        return 'image/gif';
      default:
        return 'image/jpeg'; // Default fallback
    }
  }

  /**
   * Get file info (for local files)
   */
  private static async getFileInfo(uri: string): Promise<{ size: number }> {
    try {
      if (Platform.OS === 'web') {
        const response = await fetch(uri);
        const blob = await response.blob();
        return { size: blob.size };
      } else {
        // For React Native, we'll use a different approach
        const response = await fetch(uri);
        const blob = await response.blob();
        return { size: blob.size };
      }
    } catch (error) {
      console.error('Error getting file info:', error);
      return { size: 0 };
    }
  }

  /**
   * Delete image from storage
   */
  static async deleteImage(bucket: string, filename: string): Promise<void> {
    try {
      const { error } = await supabase.storage
        .from(bucket)
        .remove([filename]);

      if (error) {
        console.error('Error deleting image:', error);
        throw new Error('Failed to delete image');
      }
    } catch (error) {
      console.error('Error in deleteImage:', error);
      throw error;
    }
  }

  /**
   * Delete listing images
   */
  static async deleteListingImages(listingId: string): Promise<void> {
    try {
      // List all files in the listings bucket for this listing
      const { data: files, error } = await supabase.storage
        .from('listings')
        .list('', {
          search: `listing_${listingId}_`,
        });

      if (error) {
        console.error('Error listing files:', error);
        return;
      }

      if (files && files.length > 0) {
        const filenames = files.map(file => file.name);
        await supabase.storage
          .from('listings')
          .remove(filenames);
      }
    } catch (error) {
      console.error('Error deleting listing images:', error);
    }
  }
} 