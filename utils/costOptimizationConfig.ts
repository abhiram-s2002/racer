/**
 * Cost Optimization Configuration
 * Centralized settings for reducing Supabase costs and bandwidth usage
 */

export const COST_OPTIMIZATION_CONFIG = {
  // ============================================================================
  // PAGINATION OPTIMIZATION
  // ============================================================================
  PAGINATION: {
    // Reduced page sizes to minimize bandwidth
    LISTINGS_PAGE_SIZE: 5, // Reduced from 10-20
    REQUESTS_PAGE_SIZE: 5, // Reduced from 10
    ACTIVITIES_PAGE_SIZE: 10, // Reduced from 20
    MESSAGES_PAGE_SIZE: 15, // Reduced from 20
    RATINGS_PAGE_SIZE: 10, // Reduced from 20
  },

  // ============================================================================
  // CACHING OPTIMIZATION
  // ============================================================================
  CACHING: {
    // Extended cache durations to reduce database queries
    LISTINGS_CACHE_DURATION: 3 * 60 * 60 * 1000, // 3 hours
    REQUESTS_CACHE_DURATION: 2 * 60 * 60 * 1000, // 2 hours
    USER_PROFILES_CACHE_DURATION: 6 * 60 * 60 * 1000, // 6 hours
    ACTIVITIES_CACHE_DURATION: 15 * 60 * 1000, // 15 minutes
    MESSAGES_CACHE_DURATION: 10 * 60 * 1000, // 10 minutes
    
    // Cache size limits
    MAX_CACHE_SIZE_MB: 50, // Reduced from 100MB
    MAX_CACHE_ENTRIES: 1000, // Maximum number of cache entries
  },

  // ============================================================================
  // IMAGE OPTIMIZATION
  // ============================================================================
  IMAGES: {
    // Aggressive compression settings
    MAX_FILE_SIZE_MB: 5, // Reduced from 10MB
    MAX_IMAGES_PER_LISTING: 6, // Reduced from 8
    
    // Compression quality settings
    LISTING_QUALITY: 0.7, // Reduced from 0.85
    THUMBNAIL_QUALITY: 0.6, // Reduced from 0.8
    PREVIEW_QUALITY: 0.6, // Reduced from 0.75
    AVATAR_QUALITY: 0.8, // Reduced from 0.9
    
    // Image dimensions
    LISTING_MAX_WIDTH: 1200, // Reduced from 1920
    LISTING_MAX_HEIGHT: 800, // Reduced from 1080
    THUMBNAIL_SIZE: 300, // Reduced from 400
    PREVIEW_MAX_WIDTH: 600, // Reduced from 800
    PREVIEW_MAX_HEIGHT: 450, // Reduced from 600
    
    // Storage optimization
    STORE_ONLY_THUMBNAILS: true, // Only store thumbnails, generate others on-demand
    USE_WEBP_FORMAT: true, // Use WebP for better compression
  },

  // ============================================================================
  // REAL-TIME OPTIMIZATION (DISABLED - NOT USED)
  // ============================================================================
  REALTIME: {
    // Real-time is completely disabled since it's not used
    ENABLED: false,
    
    // Polling intervals for offline queue (only thing that needs periodic updates)
    OFFLINE_QUEUE_POLL_INTERVAL: 60000, // 1 minute - can be even longer since no real-time
    ACTIVITY_UPDATE_INTERVAL: 120000, // 2 minutes
    MESSAGE_SYNC_INTERVAL: 90000, // 1.5 minutes
    
    // No connection limits needed since real-time is disabled
    MAX_CONCURRENT_CONNECTIONS: 0,
    CONNECTION_TIMEOUT: 0,
    RECONNECT_DELAY: 0,
    
    // All real-time features disabled
    DISABLE_REALTIME_FOR: [
      'all_features', // Disable everything
    ],
  },

  // ============================================================================
  // DATA CLEANUP OPTIMIZATION
  // ============================================================================
  CLEANUP: {
    // Automatic cleanup intervals
    CLEANUP_INTERVAL_HOURS: 24, // Run cleanup every 24 hours
    INITIAL_CLEANUP_DELAY_HOURS: 1, // Start cleanup after 1 hour
    
    // Data retention periods
    LISTINGS_RETENTION_DAYS: 90, // Keep inactive listings for 90 days
    MESSAGES_RETENTION_DAYS: 180, // Keep messages for 180 days
    ACTIVITIES_RETENTION_DAYS: 60, // Keep activities for 60 days
    PINGS_RETENTION_DAYS: 30, // Keep pings for 30 days
    ANALYTICS_RETENTION_DAYS: 365, // Keep analytics for 1 year
    CACHE_RETENTION_DAYS: 7, // Keep cache for 7 days
    
    // Batch cleanup limits
    MAX_DELETIONS_PER_BATCH: 100, // Limit deletions per cleanup operation
    CLEANUP_BATCH_DELAY_MS: 1000, // 1 second delay between batches
  },

  // ============================================================================
  // QUERY OPTIMIZATION
  // ============================================================================
  QUERIES: {
    // Query limits
    MAX_QUERY_RESULTS: 100, // Maximum results per query
    DEFAULT_QUERY_TIMEOUT: 10000, // 10 seconds timeout
    
    // Batch operation limits
    MAX_BATCH_SIZE: 50, // Maximum items per batch operation
    BATCH_DELAY_MS: 500, // Delay between batch operations
    
    // Query optimization
    USE_INDEXED_QUERIES: true, // Prefer indexed queries
    ENABLE_QUERY_CACHING: true, // Enable query result caching
    CACHE_QUERY_RESULTS_FOR: 300, // Cache query results for 5 minutes
  },

  // ============================================================================
  // BANDWIDTH OPTIMIZATION
  // ============================================================================
  BANDWIDTH: {
    // Data transfer limits
    MAX_RESPONSE_SIZE_KB: 500, // Maximum response size
    COMPRESS_RESPONSES: true, // Enable response compression
    
    // Lazy loading
    ENABLE_LAZY_LOADING: true, // Enable lazy loading for images
    LAZY_LOAD_THRESHOLD: 200, // Load images when 200px from viewport
    
    // Progressive loading
    LOAD_THUMBNAILS_FIRST: true, // Load thumbnails before full images
    PROGRESSIVE_IMAGE_QUALITY: true, // Progressive image quality loading
  },

  // ============================================================================
  // COST MONITORING
  // ============================================================================
  MONITORING: {
    // Monitoring intervals
    METRICS_UPDATE_INTERVAL: 60 * 60 * 1000, // Update metrics every hour
    ALERT_CHECK_INTERVAL: 30 * 60 * 1000, // Check alerts every 30 minutes
    
    // Cost thresholds
    STORAGE_WARNING_THRESHOLD_MB: 500, // Warn at 500MB storage
    STORAGE_CRITICAL_THRESHOLD_MB: 1000, // Critical at 1GB storage
    BANDWIDTH_WARNING_THRESHOLD_MB: 50, // Warn at 50MB bandwidth
    BANDWIDTH_CRITICAL_THRESHOLD_MB: 100, // Critical at 100MB bandwidth
    MONTHLY_COST_WARNING_USD: 25, // Warn at $25/month
    MONTHLY_COST_CRITICAL_USD: 50, // Critical at $50/month
    
    // Query limits
    DAILY_QUERY_WARNING_THRESHOLD: 5000, // Warn at 5k queries/day
    DAILY_QUERY_CRITICAL_THRESHOLD: 10000, // Critical at 10k queries/day
  },

  // ============================================================================
  // FEATURE FLAGS FOR COST OPTIMIZATION
  // ============================================================================
  FEATURES: {
    // Enable/disable features based on cost optimization needs
    ENABLE_AUTOMATIC_CLEANUP: true,
    ENABLE_COST_MONITORING: true, // Background monitoring only
    ENABLE_AGGRESSIVE_CACHING: true,
    ENABLE_IMAGE_OPTIMIZATION: true,
    ENABLE_QUERY_OPTIMIZATION: true,
    ENABLE_BANDWIDTH_OPTIMIZATION: true,
    
    // UI monitoring disabled
    ENABLE_UI_MONITORING: false, // No cache status or monitoring UI
    ENABLE_OFFLINE_QUEUE_UI: false, // No offline queue indicator UI
    
    // Disable expensive features when needed
    DISABLE_REALTIME_UPDATES: true, // Real-time is completely disabled
    DISABLE_ANALYTICS: false, // Set to true to disable analytics
    DISABLE_PERFORMANCE_MONITORING: false, // Set to true to disable performance monitoring
  },
};

// ============================================================================
// OPTIMIZATION PRESETS
// ============================================================================

export const OPTIMIZATION_PRESETS = {
  // Maximum cost savings (may impact user experience)
  MAXIMUM_SAVINGS: {
    ...COST_OPTIMIZATION_CONFIG,
    PAGINATION: {
      LISTINGS_PAGE_SIZE: 3,
      REQUESTS_PAGE_SIZE: 3,
      ACTIVITIES_PAGE_SIZE: 5,
      MESSAGES_PAGE_SIZE: 10,
      RATINGS_PAGE_SIZE: 5,
    },
    CACHING: {
      ...COST_OPTIMIZATION_CONFIG.CACHING,
      LISTINGS_CACHE_DURATION: 4 * 60 * 60 * 1000, // 4 hours
      REQUESTS_CACHE_DURATION: 3 * 60 * 60 * 1000, // 3 hours
    },
    REALTIME: {
      ...COST_OPTIMIZATION_CONFIG.REALTIME,
      OFFLINE_QUEUE_POLL_INTERVAL: 60000, // 1 minute
      DISABLE_REALTIME_FOR: [
        'listing_views',
        'user_activity',
        'analytics_events',
        'message_read_status',
        'typing_indicators',
      ],
    },
  },

  // Balanced optimization (good savings with minimal UX impact)
  BALANCED: {
    ...COST_OPTIMIZATION_CONFIG,
  },

  // Minimal optimization (small savings, no UX impact)
  MINIMAL: {
    ...COST_OPTIMIZATION_CONFIG,
    PAGINATION: {
      LISTINGS_PAGE_SIZE: 8,
      REQUESTS_PAGE_SIZE: 8,
      ACTIVITIES_PAGE_SIZE: 15,
      MESSAGES_PAGE_SIZE: 20,
      RATINGS_PAGE_SIZE: 15,
    },
    CACHING: {
      ...COST_OPTIMIZATION_CONFIG.CACHING,
      LISTINGS_CACHE_DURATION: 2 * 60 * 60 * 1000, // 2 hours
      REQUESTS_CACHE_DURATION: 1 * 60 * 60 * 1000, // 1 hour
    },
  },
};

// Current optimization level (can be changed based on cost needs)
export const CURRENT_OPTIMIZATION_LEVEL = 'BALANCED' as keyof typeof OPTIMIZATION_PRESETS;

// Export the current configuration
export const CURRENT_CONFIG = OPTIMIZATION_PRESETS[CURRENT_OPTIMIZATION_LEVEL];
