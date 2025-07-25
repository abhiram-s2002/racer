# 🔧 Environment Configuration Setup Guide

This guide will help you set up proper environment configuration for your Racer Marketplace app across different deployment stages.

## 📋 Overview

Your app now supports three environments:
- **Development** - Local development with debug features
- **Staging** - Pre-production testing with monitoring
- **Production** - Live app with optimized performance

## 🚀 Quick Setup

### 1. Create Environment Files

```bash
# Copy the template to create environment-specific files
npm run env:dev
npm run env:staging
npm run env:prod
```

### 2. Configure Your Environment Variables

Edit each `.env` file with your actual values:

```bash
# Development
nano .env.development

# Staging  
nano .env.staging

# Production
nano .env.production
```

## 🔑 Required Environment Variables

### **Essential (Required for all environments)**

```env
# App Configuration
EXPO_PUBLIC_ENV=development
EXPO_PUBLIC_APP_VERSION=1.0.0

# Supabase Configuration
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### **Recommended for Production**

```env
# Error Monitoring
EXPO_PUBLIC_SENTRY_DSN=your-sentry-dsn

# Analytics
EXPO_PUBLIC_FIREBASE_ANALYTICS_ID=your-firebase-analytics-id

# Performance Monitoring
EXPO_PUBLIC_FIREBASE_PERFORMANCE_ID=your-firebase-performance-id

# Maps
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your-google-maps-api-key
```

## 🌍 Environment-Specific Configurations

### **Development Environment**

**File:** `.env.development`

```env
# App Configuration
EXPO_PUBLIC_ENV=development
EXPO_PUBLIC_APP_VERSION=1.0.0

# Supabase Configuration
EXPO_PUBLIC_SUPABASE_URL=https://vroanjodovwsyydxrmma.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZyb2Fuam9kb3Z3c3l5ZHhybW1hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwODA4MDQsImV4cCI6MjA2ODY1NjgwNH0.cqtPBWKsjsmtv8QQuDWCffnWnSDYr6G5S5B1mv5b-Cw

# Development Features
EXPO_PUBLIC_DEBUG_MODE=true
EXPO_PUBLIC_ENABLE_MOCK_DATA=false
EXPO_PUBLIC_DEV_SERVER_URL=http://localhost:8081

# Feature Flags (Development)
EXPO_PUBLIC_ENABLE_ANALYTICS=false
EXPO_PUBLIC_ENABLE_ERROR_REPORTING=false
EXPO_PUBLIC_ENABLE_PERFORMANCE_MONITORING=false
EXPO_PUBLIC_ENABLE_PUSH_NOTIFICATIONS=false

# Rate Limiting (Relaxed for development)
EXPO_PUBLIC_RATE_LIMIT_ENABLED=false
EXPO_PUBLIC_RATE_LIMIT_MAX_REQUESTS=1000
EXPO_PUBLIC_RATE_LIMIT_WINDOW_MS=60000

# Caching (Minimal for development)
EXPO_PUBLIC_CACHE_ENABLED=false
EXPO_PUBLIC_CACHE_TTL=300000
EXPO_PUBLIC_IMAGE_CACHE_TTL=86400000
```

### **Staging Environment**

**File:** `.env.staging`

```env
# App Configuration
EXPO_PUBLIC_ENV=staging
EXPO_PUBLIC_APP_VERSION=1.0.0

# Supabase Configuration
EXPO_PUBLIC_SUPABASE_URL=https://vroanjodovwsyydxrmma.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZyb2Fuam9kb3Z3c3l5ZHhybW1hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwODA4MDQsImV4cCI6MjA2ODY1NjgwNH0.cqtPBWKsjsmtv8QQuDWCffnWnSDYr6G5S5B1mv5b-Cw

# Monitoring & Analytics (Staging)
EXPO_PUBLIC_SENTRY_DSN=your-sentry-dsn-staging
EXPO_PUBLIC_FIREBASE_ANALYTICS_ID=your-firebase-analytics-id-staging
EXPO_PUBLIC_FIREBASE_PERFORMANCE_ID=your-firebase-performance-id-staging

# Feature Flags (Staging)
EXPO_PUBLIC_ENABLE_ANALYTICS=true
EXPO_PUBLIC_ENABLE_ERROR_REPORTING=true
EXPO_PUBLIC_ENABLE_PERFORMANCE_MONITORING=true
EXPO_PUBLIC_ENABLE_PUSH_NOTIFICATIONS=true
EXPO_PUBLIC_ENABLE_LOCATION_SERVICES=true
EXPO_PUBLIC_ENABLE_CAMERA_FEATURES=true

# Rate Limiting (Moderate for staging)
EXPO_PUBLIC_RATE_LIMIT_ENABLED=true
EXPO_PUBLIC_RATE_LIMIT_MAX_REQUESTS=100
EXPO_PUBLIC_RATE_LIMIT_WINDOW_MS=60000

# Caching (Enabled for staging)
EXPO_PUBLIC_CACHE_ENABLED=true
EXPO_PUBLIC_CACHE_TTL=300000
EXPO_PUBLIC_IMAGE_CACHE_TTL=86400000

# Maps & Location
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your-google-maps-api-key-staging
```

### **Production Environment**

**File:** `.env.production`

```env
# App Configuration
EXPO_PUBLIC_ENV=production
EXPO_PUBLIC_APP_VERSION=1.0.0

# Supabase Configuration
EXPO_PUBLIC_SUPABASE_URL=https://vroanjodovwsyydxrmma.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZyb2Fuam9kb3Z3c3l5ZHhybW1hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwODA4MDQsImV4cCI6MjA2ODY1NjgwNH0.cqtPBWKsjsmtv8QQuDWCffnWnSDYr6G5S5B1mv5b-Cw

# Monitoring & Analytics (Production)
EXPO_PUBLIC_SENTRY_DSN=your-sentry-dsn-production
EXPO_PUBLIC_FIREBASE_ANALYTICS_ID=your-firebase-analytics-id-production
EXPO_PUBLIC_FIREBASE_PERFORMANCE_ID=your-firebase-performance-id-production

# Feature Flags (Production)
EXPO_PUBLIC_ENABLE_ANALYTICS=true
EXPO_PUBLIC_ENABLE_ERROR_REPORTING=true
EXPO_PUBLIC_ENABLE_PERFORMANCE_MONITORING=true
EXPO_PUBLIC_ENABLE_PUSH_NOTIFICATIONS=true
EXPO_PUBLIC_ENABLE_LOCATION_SERVICES=true
EXPO_PUBLIC_ENABLE_CAMERA_FEATURES=true

# Rate Limiting (Strict for production)
EXPO_PUBLIC_RATE_LIMIT_ENABLED=true
EXPO_PUBLIC_RATE_LIMIT_MAX_REQUESTS=60
EXPO_PUBLIC_RATE_LIMIT_WINDOW_MS=60000

# Caching (Optimized for production)
EXPO_PUBLIC_CACHE_ENABLED=true
EXPO_PUBLIC_CACHE_TTL=300000
EXPO_PUBLIC_IMAGE_CACHE_TTL=86400000

# Maps & Location
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your-google-maps-api-key-production

# Image Optimization
EXPO_PUBLIC_IMAGE_CDN_URL=https://your-cdn.com
EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME=your-cloud-name
EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET=your-upload-preset
```

## 🏗️ Build Configuration

### **EAS Build Profiles**

Your `eas.json` file is configured with three build profiles:

```json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "env": {
        "EXPO_PUBLIC_ENV": "development"
      }
    },
    "preview": {
      "distribution": "internal", 
      "env": {
        "EXPO_PUBLIC_ENV": "staging"
      }
    },
    "production": {
      "env": {
        "EXPO_PUBLIC_ENV": "production"
      }
    }
  }
}
```

### **Build Commands**

```bash
# Development build
npm run build:dev

# Staging build
npm run build:staging

# Production build
npm run build:prod

# Platform-specific builds
npm run build:ios
npm run build:android
npm run build:all
```

## 🔧 Using Environment Configuration in Code

### **Import the Environment Utility**

```typescript
import { Environment } from '@/utils/environment';

// Check current environment
if (Environment.isDevelopment) {
  console.log('Running in development mode');
}

// Access environment variables
const supabaseUrl = Environment.supabaseUrl;
const hasSentry = Environment.hasSentry;
const enableAnalytics = Environment.enableAnalytics;
```

### **Feature Flag Usage**

```typescript
import { Environment } from '@/utils/environment';

// Conditional feature rendering
if (Environment.enableAnalytics) {
  // Initialize analytics
  initializeAnalytics();
}

// Rate limiting
if (Environment.rateLimitEnabled) {
  const maxRequests = Environment.rateLimitMaxRequests;
  // Apply rate limiting
}
```

### **Environment Validation**

```typescript
import { Environment } from '@/utils/environment';

// Validate configuration
const validation = Environment.validate();
if (!validation.isValid) {
  console.error('Environment validation failed:', validation.errors);
}

// Get full configuration for debugging
const config = Environment.getConfig();
console.log('Current configuration:', config);
```

## 🔒 Security Best Practices

### **1. Never Commit Secrets**

```bash
# Add to .gitignore
.env
.env.local
.env.development
.env.staging
.env.production
*.key
google-service-account.json
```

### **2. Use Different Keys per Environment**

- **Development**: Use development Supabase project
- **Staging**: Use staging Supabase project  
- **Production**: Use production Supabase project

### **3. Rotate Keys Regularly**

- Update API keys quarterly
- Monitor for unauthorized usage
- Use key management services

## 🚨 Troubleshooting

### **Common Issues**

#### **1. Environment Variables Not Loading**

```bash
# Check if variables are set
echo $EXPO_PUBLIC_SUPABASE_URL

# Restart development server
npm run clean
npm run dev
```

#### **2. Build Failures**

```bash
# Validate environment configuration
npm run type-check

# Check for missing variables
npm run prebuild
```

#### **3. Feature Flags Not Working**

```typescript
// Debug feature flags
import { Environment } from '@/utils/environment';
console.log('Feature flags:', Environment.getConfig().featureFlags);
```

### **Validation Commands**

```bash
# Type checking
npm run type-check

# Linting
npm run lint

# Full validation
npm run prebuild
```

## 📊 Environment Monitoring

### **Configuration Logging**

In development, the app automatically logs configuration:

```
🔧 Environment Configuration: {
  environment: "development",
  appVersion: "1.0.0",
  supabaseUrl: "https://...",
  hasSentry: false,
  hasFirebaseAnalytics: false,
  featureFlags: {
    analytics: false,
    errorReporting: false,
    performanceMonitoring: false
  }
}
```

### **Validation Warnings**

```
⚠️ Environment validation warnings: [
  "EXPO_PUBLIC_SENTRY_DSN is recommended for production"
]
```

## 🎯 Next Steps

1. **Set up your environment files** using the templates
2. **Configure your Supabase project** for each environment
3. **Set up monitoring services** (Sentry, Firebase)
4. **Test builds** for each environment
5. **Deploy to staging** for testing
6. **Deploy to production** when ready

## 📚 Additional Resources

- [Expo Environment Variables](https://docs.expo.dev/guides/environment-variables/)
- [EAS Build Configuration](https://docs.expo.dev/build/eas-json/)
- [Supabase Environment Setup](https://supabase.com/docs/guides/getting-started/environment-variables)
- [Sentry React Native Setup](https://docs.sentry.io/platforms/react-native/)
- [Firebase React Native Setup](https://rnfirebase.io/)

---

**Need Help?** Check the troubleshooting section or create an issue in the repository. 