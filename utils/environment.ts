// Environment Configuration Utility
// Provides type-safe access to environment variables and configuration

import Constants from 'expo-constants';
// Environment info is handled via configuration functions

// Environment variable types
interface EnvironmentVariables {
  // App Configuration
  EXPO_PUBLIC_ENV: string;
  EXPO_PUBLIC_APP_VERSION: string;
  
  // Supabase Configuration
  EXPO_PUBLIC_SUPABASE_URL: string;
  EXPO_PUBLIC_SUPABASE_ANON_KEY: string;
  
  // Monitoring & Analytics
  EXPO_PUBLIC_SENTRY_DSN?: string;
  EXPO_PUBLIC_GOOGLE_ANALYTICS_ID?: string;
  
  // Image & Storage
  EXPO_PUBLIC_IMAGE_CDN_URL?: string;
  EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME?: string;
  EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET?: string;
  
  // Maps & Location
  EXPO_PUBLIC_GOOGLE_MAPS_API_KEY?: string;
  EXPO_PUBLIC_MAPBOX_API_KEY?: string;
  
  // Push Notifications
  EXPO_PUBLIC_EXPO_PUSH_TOKEN?: string;
  EXPO_PUBLIC_FIREBASE_MESSAGING_ID?: string;
  
  // Payment Processing
  EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY?: string;
  EXPO_PUBLIC_PAYPAL_CLIENT_ID?: string;
  
  // Social Authentication
  EXPO_PUBLIC_GOOGLE_CLIENT_ID?: string;
  EXPO_PUBLIC_APPLE_CLIENT_ID?: string;
  EXPO_PUBLIC_FACEBOOK_APP_ID?: string;
  
  // Email & Communication
  EXPO_PUBLIC_SENDGRID_FROM_EMAIL?: string;
  EXPO_PUBLIC_TWILIO_PHONE_NUMBER?: string;
  
  // Feature Flags
  EXPO_PUBLIC_ENABLE_ANALYTICS?: string;
  EXPO_PUBLIC_ENABLE_ERROR_REPORTING?: string;
  EXPO_PUBLIC_ENABLE_PERFORMANCE_MONITORING?: string;
  EXPO_PUBLIC_ENABLE_PUSH_NOTIFICATIONS?: string;
  EXPO_PUBLIC_ENABLE_LOCATION_SERVICES?: string;
  EXPO_PUBLIC_ENABLE_CAMERA_FEATURES?: string;
  
  // Rate Limiting
  EXPO_PUBLIC_RATE_LIMIT_ENABLED?: string;
  EXPO_PUBLIC_RATE_LIMIT_MAX_REQUESTS?: string;
  EXPO_PUBLIC_RATE_LIMIT_WINDOW_MS?: string;
  
  // Caching & Performance
  EXPO_PUBLIC_CACHE_ENABLED?: string;
  EXPO_PUBLIC_CACHE_TTL?: string;
  EXPO_PUBLIC_IMAGE_CACHE_TTL?: string;
  
  // Development
  EXPO_PUBLIC_DEV_SERVER_URL?: string;
  EXPO_PUBLIC_ENABLE_MOCK_DATA?: string;
  EXPO_PUBLIC_DEBUG_MODE?: string;
}

// Get environment variables with type safety
const getEnvVar = <K extends keyof EnvironmentVariables>(
  key: K,
  defaultValue?: EnvironmentVariables[K]
): EnvironmentVariables[K] => {
  const value = Constants.expoConfig?.extra?.[key] || process.env[key];
  return (value as EnvironmentVariables[K]) || defaultValue || ('' as EnvironmentVariables[K]);
};

// Environment configuration class
export class Environment {
  // App Configuration
  static get env(): string {
    return getEnvVar('EXPO_PUBLIC_ENV', 'development');
  }
  
  static get appVersion(): string {
    return getEnvVar('EXPO_PUBLIC_APP_VERSION', '1.0.0');
  }
  
  // Supabase Configuration
  static get supabaseUrl(): string {
    return getEnvVar('EXPO_PUBLIC_SUPABASE_URL', '');
  }
  
  static get supabaseAnonKey(): string {
    return getEnvVar('EXPO_PUBLIC_SUPABASE_ANON_KEY', '');
  }
  
  // Monitoring & Analytics
  static get sentryDsn(): string | undefined {
    return getEnvVar('EXPO_PUBLIC_SENTRY_DSN');
  }
  
  static get googleAnalyticsId(): string | undefined {
    return getEnvVar('EXPO_PUBLIC_GOOGLE_ANALYTICS_ID');
  }
  
  // Image & Storage
  static get imageCdnUrl(): string | undefined {
    return getEnvVar('EXPO_PUBLIC_IMAGE_CDN_URL');
  }
  
  static get cloudinaryCloudName(): string | undefined {
    return getEnvVar('EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME');
  }
  
  static get cloudinaryUploadPreset(): string | undefined {
    return getEnvVar('EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET');
  }
  
  // Maps & Location
  static get googleMapsApiKey(): string | undefined {
    return getEnvVar('EXPO_PUBLIC_GOOGLE_MAPS_API_KEY');
  }
  
  static get mapboxApiKey(): string | undefined {
    return getEnvVar('EXPO_PUBLIC_MAPBOX_API_KEY');
  }
  
  // Push Notifications
  static get expoPushToken(): string | undefined {
    return getEnvVar('EXPO_PUBLIC_EXPO_PUSH_TOKEN');
  }
  
  static get firebaseMessagingId(): string | undefined {
    return getEnvVar('EXPO_PUBLIC_FIREBASE_MESSAGING_ID');
  }
  
  // Payment Processing
  static get stripePublishableKey(): string | undefined {
    return getEnvVar('EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY');
  }
  
  static get paypalClientId(): string | undefined {
    return getEnvVar('EXPO_PUBLIC_PAYPAL_CLIENT_ID');
  }
  
  // Social Authentication
  static get googleClientId(): string | undefined {
    return getEnvVar('EXPO_PUBLIC_GOOGLE_CLIENT_ID');
  }
  
  static get appleClientId(): string | undefined {
    return getEnvVar('EXPO_PUBLIC_APPLE_CLIENT_ID');
  }
  
  static get facebookAppId(): string | undefined {
    return getEnvVar('EXPO_PUBLIC_FACEBOOK_APP_ID');
  }
  
  // Email & Communication
  static get sendgridFromEmail(): string | undefined {
    return getEnvVar('EXPO_PUBLIC_SENDGRID_FROM_EMAIL');
  }
  
  static get twilioPhoneNumber(): string | undefined {
    return getEnvVar('EXPO_PUBLIC_TWILIO_PHONE_NUMBER');
  }
  
  // Feature Flags
  static get enableAnalytics(): boolean {
    return getEnvVar('EXPO_PUBLIC_ENABLE_ANALYTICS', 'true') === 'true';
  }
  
  static get enableErrorReporting(): boolean {
    return getEnvVar('EXPO_PUBLIC_ENABLE_ERROR_REPORTING', 'true') === 'true';
  }
  
  static get enablePerformanceMonitoring(): boolean {
    return getEnvVar('EXPO_PUBLIC_ENABLE_PERFORMANCE_MONITORING', 'true') === 'true';
  }
  
  static get enablePushNotifications(): boolean {
    return getEnvVar('EXPO_PUBLIC_ENABLE_PUSH_NOTIFICATIONS', 'true') === 'true';
  }
  
  static get enableLocationServices(): boolean {
    return getEnvVar('EXPO_PUBLIC_ENABLE_LOCATION_SERVICES', 'true') === 'true';
  }
  
  static get enableCameraFeatures(): boolean {
    return getEnvVar('EXPO_PUBLIC_ENABLE_CAMERA_FEATURES', 'true') === 'true';
  }
  
  // Rate Limiting
  static get rateLimitEnabled(): boolean {
    return getEnvVar('EXPO_PUBLIC_RATE_LIMIT_ENABLED', 'true') === 'true';
  }
  
  static get rateLimitMaxRequests(): number {
    const value = getEnvVar('EXPO_PUBLIC_RATE_LIMIT_MAX_REQUESTS', '60');
    return parseInt(value || '60', 10);
  }
  
  static get rateLimitWindowMs(): number {
    const value = getEnvVar('EXPO_PUBLIC_RATE_LIMIT_WINDOW_MS', '60000');
    return parseInt(value || '60000', 10);
  }
  
  // Caching & Performance
  static get cacheEnabled(): boolean {
    return getEnvVar('EXPO_PUBLIC_CACHE_ENABLED', 'true') === 'true';
  }
  
  static get cacheTtl(): number {
    const value = getEnvVar('EXPO_PUBLIC_CACHE_TTL', '300000');
    return parseInt(value || '300000', 10);
  }
  
  static get imageCacheTtl(): number {
    const value = getEnvVar('EXPO_PUBLIC_IMAGE_CACHE_TTL', '86400000');
    return parseInt(value || '86400000', 10);
  }
  
  // Development
  static get devServerUrl(): string | undefined {
    return getEnvVar('EXPO_PUBLIC_DEV_SERVER_URL');
  }
  
  static get enableMockData(): boolean {
    return getEnvVar('EXPO_PUBLIC_ENABLE_MOCK_DATA', 'false') === 'true';
  }
  
  static get debugMode(): boolean {
    return getEnvVar('EXPO_PUBLIC_DEBUG_MODE', 'false') === 'true';
  }
  
  // Environment checks
  static get isDevelopment(): boolean {
    return this.env === 'development';
  }
  
  static get isStaging(): boolean {
    return this.env === 'staging';
  }
  
  static get isProduction(): boolean {
    return this.env === 'production';
  }
  
  // Feature availability checks
  static get hasSentry(): boolean {
    return !!this.sentryDsn && this.enableErrorReporting;
  }
  
  static get hasGoogleAnalytics(): boolean {
    return !!this.googleAnalyticsId && this.enableAnalytics;
  }
  
  static get hasGoogleMaps(): boolean {
    return !!this.googleMapsApiKey;
  }
  
  static get hasMapbox(): boolean {
    return !!this.mapboxApiKey;
  }
  
  static get hasStripe(): boolean {
    return !!this.stripePublishableKey;
  }
  
  static get hasPayPal(): boolean {
    return !!this.paypalClientId;
  }
  
  // Configuration validation
  static validate(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Required variables
    if (!this.supabaseUrl) {
      errors.push('EXPO_PUBLIC_SUPABASE_URL is required');
    }
    
    if (!this.supabaseAnonKey) {
      errors.push('EXPO_PUBLIC_SUPABASE_ANON_KEY is required');
    }
    
    // Environment-specific validations
    if (this.isProduction) {
      if (!this.sentryDsn) {
        errors.push('EXPO_PUBLIC_SENTRY_DSN is recommended for production');
      }
      
      if (!this.googleAnalyticsId) {
        errors.push('EXPO_PUBLIC_GOOGLE_ANALYTICS_ID is recommended for production');
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
  
  // Get all configuration for debugging
  static getConfig(): Record<string, any> {
    return {
      environment: this.env,
      appVersion: this.appVersion,
      supabaseUrl: this.supabaseUrl,
      hasSentry: this.hasSentry,
      hasGoogleAnalytics: this.hasGoogleAnalytics,
      hasGoogleMaps: this.hasGoogleMaps,
      hasMapbox: this.hasMapbox,
      hasStripe: this.hasStripe,
      hasPayPal: this.hasPayPal,
      featureFlags: {
        analytics: this.enableAnalytics,
        errorReporting: this.enableErrorReporting,
        performanceMonitoring: this.enablePerformanceMonitoring,
        pushNotifications: this.enablePushNotifications,
        locationServices: this.enableLocationServices,
        cameraFeatures: this.enableCameraFeatures,
      },
      rateLimiting: {
        enabled: this.rateLimitEnabled,
        maxRequests: this.rateLimitMaxRequests,
        windowMs: this.rateLimitWindowMs,
      },
      caching: {
        enabled: this.cacheEnabled,
        ttl: this.cacheTtl,
        imageTtl: this.imageCacheTtl,
      },
      development: {
        mockData: this.enableMockData,
        debugMode: this.debugMode,
        devServerUrl: this.devServerUrl,
      },
    };
  }
}

// Export convenience functions
export const isDevelopment = Environment.isDevelopment;
export const isStaging = Environment.isStaging;
export const isProduction = Environment.isProduction;

// Log configuration in development
if (Environment.isDevelopment) {
  // Environment configuration loaded silently in development
  
  const validation = Environment.validate();
  if (!validation.isValid) {
    // Environment validation warnings
  }
} 