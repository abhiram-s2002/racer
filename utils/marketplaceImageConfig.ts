/**
 * Enhanced Marketplace Image Configuration
 * Centralized configuration for image processing, optimization, and features
 */

export const MARKETPLACE_IMAGE_CONFIG = {
  // ============================================================================
  // UPLOAD LIMITS & VALIDATION
  // ============================================================================
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_IMAGE_DIMENSION: 4096, // 4K max
  MIN_IMAGE_DIMENSION: 200, // 200px min
  SUPPORTED_FORMATS: ['image/jpeg', 'image/png', 'image/webp', 'image/heic'],
  MAX_IMAGES_PER_LISTING: 8,
  MAX_AVATAR_SIZE: 2 * 1024 * 1024, // 2MB for avatars

  // ============================================================================
  // IMAGE PROCESSING & OPTIMIZATION
  // ============================================================================
  COMPRESSION: {
    LISTING: {
      QUALITY: 0.85,
      MAX_WIDTH: 1920,
      MAX_HEIGHT: 1080,
      FORMAT: 'jpeg' as const,
    },
    THUMBNAIL: {
      QUALITY: 0.8,
      MAX_WIDTH: 400,
      MAX_HEIGHT: 400,
      FORMAT: 'jpeg' as const,
    },
    PREVIEW: {
      QUALITY: 0.75,
      MAX_WIDTH: 800,
      MAX_HEIGHT: 600,
      FORMAT: 'jpeg' as const,
    },
    AVATAR: {
      QUALITY: 0.9,
      MAX_WIDTH: 300,
      MAX_HEIGHT: 300,
      FORMAT: 'jpeg' as const,
    },
  },

  // ============================================================================
  // CACHING & PERFORMANCE
  // ============================================================================
  CACHE: {
    ENABLED: true,
    MAX_AGE: 7 * 24 * 60 * 60 * 1000, // 7 days
    MAX_SIZE: 100 * 1024 * 1024, // 100MB cache
  },

  // ============================================================================
  // UPLOAD FEATURES
  // ============================================================================
  FEATURES: {
    ENABLE_CROPPING: true,
    ENABLE_FILTERS: true,
    ENABLE_WATERMARKING: false,
    ENABLE_BULK_UPLOAD: true,
    ENABLE_DRAG_DROP: true,
    ENABLE_PROGRESS_TRACKING: true,
    ENABLE_RETRY_LOGIC: true,
  },

  // ============================================================================
  // SECURITY & MODERATION
  // ============================================================================
  SECURITY: {
    ENABLE_CONTENT_MODERATION: false, // Future feature
    ENABLE_VIRUS_SCANNING: false, // Future feature
    ENABLE_RATE_LIMITING: true,
    MAX_UPLOADS_PER_HOUR: 50,
    MAX_UPLOADS_PER_DAY: 200,
  },

  // ============================================================================
  // ANALYTICS & MONITORING
  // ============================================================================
  ANALYTICS: {
    ENABLE_UPLOAD_TRACKING: true,
    ENABLE_PERFORMANCE_MONITORING: true,
    ENABLE_ERROR_REPORTING: true,
    ENABLE_USAGE_STATS: true,
  },

  // ============================================================================
  // STORAGE BUCKETS
  // ============================================================================
  BUCKETS: {
    LISTINGS: 'listings',
    AVATARS: 'avatars',
    TEMP: 'temp',
    CACHE: 'image-cache',
  },

  // ============================================================================
  // ERROR MESSAGES
  // ============================================================================
  ERROR_MESSAGES: {
    FILE_TOO_LARGE: 'File size exceeds the maximum limit of 10MB',
    INVALID_FORMAT: 'Please select a valid image file (JPEG, PNG, WebP)',
    DIMENSION_TOO_SMALL: 'Image dimensions must be at least 200x200 pixels',
    DIMENSION_TOO_LARGE: 'Image dimensions must not exceed 4096x4096 pixels',
    UPLOAD_FAILED: 'Failed to upload image. Please try again.',
    RATE_LIMIT_EXCEEDED: 'Upload limit exceeded. Please try again later.',
    NETWORK_ERROR: 'Network error. Please check your connection and try again.',
  },

  // ============================================================================
  // SUCCESS MESSAGES
  // ============================================================================
  SUCCESS_MESSAGES: {
    UPLOAD_COMPLETE: 'Images uploaded successfully!',
    PROCESSING_COMPLETE: 'Image processing completed',
    CACHE_CLEARED: 'Image cache cleared successfully',
  },
};

// ============================================================================
// IMAGE QUALITY PRESETS
// ============================================================================
export const IMAGE_QUALITY_PRESETS = {
  HIGH: {
    quality: 0.9,
    maxWidth: 1920,
    maxHeight: 1080,
    format: 'jpeg' as const,
  },
  MEDIUM: {
    quality: 0.8,
    maxWidth: 1200,
    maxHeight: 800,
    format: 'jpeg' as const,
  },
  LOW: {
    quality: 0.7,
    maxWidth: 800,
    maxHeight: 600,
    format: 'jpeg' as const,
  },
  THUMBNAIL: {
    quality: 0.75,
    maxWidth: 400,
    maxHeight: 400,
    format: 'jpeg' as const,
  },
};

// ============================================================================
// IMAGE FILTERS & EFFECTS
// ============================================================================
export const IMAGE_FILTERS = {
  NONE: 'none',
  BRIGHTNESS: 'brightness',
  CONTRAST: 'contrast',
  SATURATION: 'saturation',
  BLUR: 'blur',
  SHARPEN: 'sharpen',
  GRAYSCALE: 'grayscale',
  SEPIA: 'sepia',
  VINTAGE: 'vintage',
  WARM: 'warm',
  COOL: 'cool',
};

// ============================================================================
// UPLOAD STATUS TYPES
// ============================================================================
export const UPLOAD_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  UPLOADING: 'uploading',
  UPLOADED: 'uploaded',
  ERROR: 'error',
  CANCELLED: 'cancelled',
} as const;

export type UploadStatus = typeof UPLOAD_STATUS[keyof typeof UPLOAD_STATUS]; 