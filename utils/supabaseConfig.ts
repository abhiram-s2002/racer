// Supabase Configuration
// Environment-based configuration for different deployment stages

// Environment detection
const isDevelopment = __DEV__;
const isProduction = !isDevelopment;

// Get environment from Expo constants
import Constants from 'expo-constants';

const getEnvironment = () => {
  // Check for explicit environment variable
  if (Constants.expoConfig?.extra?.environment) {
    return Constants.expoConfig.extra.environment;
  }
  
  // Fallback to development detection
  return isDevelopment ? 'development' : 'production';
};

const currentEnvironment = getEnvironment();

// Environment-specific configurations
const ENV_CONFIGS = {
  development: {
    supabaseUrl: 'https://vroanjodovwsyydxrmma.supabase.co',
    supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZyb2Fuam9kb3Z3c3l5ZHhybW1hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwODA4MDQsImV4cCI6MjA2ODY1NjgwNH0.cqtPBWKsjsmtv8QQuDWCffnWnSDYr6G5S5B1mv5b-Cw',
    apiTimeout: 10000,
    enableDebugLogging: true,
    enableErrorReporting: false,
    enableAnalytics: false,
    enablePerformanceMonitoring: false,
    imageOptimization: {
      enabled: false,
      maxSize: 10 * 1024 * 1024, // 10MB
      quality: 90,
    },
    rateLimiting: {
      enabled: false,
      maxRequestsPerMinute: 1000,
    },
  },
  staging: {
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://vroanjodovwsyydxrmma.supabase.co',
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZyb2Fuam9kb3Z3c3l5ZHhybW1hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwODA4MDQsImV4cCI6MjA2ODY1NjgwNH0.cqtPBWKsjsmtv8QQuDWCffnWnSDYr6G5S5B1mv5b-Cw',
    apiTimeout: 8000,
    enableDebugLogging: true,
    enableErrorReporting: true,
    enableAnalytics: true,
    enablePerformanceMonitoring: true,
    imageOptimization: {
      enabled: true,
      maxSize: 8 * 1024 * 1024, // 8MB
      quality: 85,
    },
    rateLimiting: {
      enabled: true,
      maxRequestsPerMinute: 100,
    },
  },
  production: {
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://vroanjodovwsyydxrmma.supabase.co',
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZyb2Fuam9kb3Z3c3l5ZHhybW1hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwODA4MDQsImV4cCI6MjA2ODY1NjgwNH0.cqtPBWKsjsmtv8QQuDWCffnWnSDYr6G5S5B1mv5b-Cw',
    apiTimeout: 5000,
    enableDebugLogging: false,
    enableErrorReporting: true,
    enableAnalytics: true,
    enablePerformanceMonitoring: true,
    imageOptimization: {
      enabled: true,
      maxSize: 5 * 1024 * 1024, // 5MB
      quality: 80,
    },
    rateLimiting: {
      enabled: true,
      maxRequestsPerMinute: 60,
    },
  },
};

// Get current environment configuration
const currentConfig = ENV_CONFIGS[currentEnvironment as keyof typeof ENV_CONFIGS] || ENV_CONFIGS.development;

// Export Supabase configuration
export const SUPABASE_CONFIG = {
  url: currentConfig.supabaseUrl,
  anonKey: currentConfig.supabaseAnonKey,
};

// Environment detection helpers
export const isLocalDevelopment = SUPABASE_CONFIG.url.includes('localhost') || SUPABASE_CONFIG.url.includes('192.168.1.10');
export const isCloudProduction = !isLocalDevelopment;

// Feature flags for different environments
export const FEATURE_FLAGS = {
  // Debug logging
  debugLogging: currentConfig.enableDebugLogging,
  
  // Error reporting
  errorReporting: currentConfig.enableErrorReporting,
  
  // Analytics
  analytics: currentConfig.enableAnalytics,
  
  // Performance monitoring
  performanceMonitoring: currentConfig.enablePerformanceMonitoring,
  
  // Rate limiting
  rateLimiting: currentConfig.rateLimiting,
  
  // Image optimization
  imageOptimization: currentConfig.imageOptimization,
  
  // API configuration
  apiTimeout: currentConfig.apiTimeout,
};

// Environment information
export const ENV_INFO = {
  environment: currentEnvironment,
  isDevelopment,
  isProduction,
  isStaging: currentEnvironment === 'staging',
  version: Constants.expoConfig?.version || '1.0.0',
  buildNumber: Constants.expoConfig?.ios?.buildNumber || Constants.expoConfig?.android?.versionCode || '1',
};

// Log environment info in development
if (isDevelopment) {
  console.log('🔧 Environment Configuration:', {
    environment: currentEnvironment,
    supabaseUrl: SUPABASE_CONFIG.url,
    features: {
      debugLogging: FEATURE_FLAGS.debugLogging,
      errorReporting: FEATURE_FLAGS.errorReporting,
      analytics: FEATURE_FLAGS.analytics,
      performanceMonitoring: FEATURE_FLAGS.performanceMonitoring,
      rateLimiting: FEATURE_FLAGS.rateLimiting.enabled,
      imageOptimization: FEATURE_FLAGS.imageOptimization.enabled,
    },
  });
} 