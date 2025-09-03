# 🐛 Sentry Setup Guide

## 📋 Overview
Sentry is now installed and configured in your app for error monitoring and crash reporting.

## 🚀 Setup Steps

### 1. Create Sentry Account
1. Go to https://sentry.io
2. Sign up for a free account
3. Create a new project
4. Select "React Native" as the platform

### 2. Get Your DSN
1. In your Sentry project, go to Settings → Client Keys (DSN)
2. Copy your DSN (looks like: `https://xxxxx@xxxxx.ingest.sentry.io/xxxxx`)

### 3. Update Environment Variables
Replace the placeholder DSN in your `eas.json` file:

**Development:**
```json
"EXPO_PUBLIC_SENTRY_DSN": "https://your-actual-dsn@sentry.io/project-id"
```

**Staging:**
```json
"EXPO_PUBLIC_SENTRY_DSN": "https://your-staging-dsn@sentry.io/project-id"
```

**Production:**
```json
"EXPO_PUBLIC_SENTRY_DSN": "https://your-production-dsn@sentry.io/project-id"
```

### 4. Test Sentry Integration
1. Build your app: `eas build --profile development`
2. Install the app on your device
3. Trigger an error (the app will handle it gracefully)
4. Check your Sentry dashboard for the error report

## 🔧 What's Already Configured

### ✅ Error Boundary Integration
- All React errors are automatically captured
- Component stack traces included
- Error context and metadata preserved

### ✅ Performance Monitoring
- Transaction tracking enabled
- Performance metrics collected
- Slow operations identified

### ✅ User Context
- User information attached to errors
- App version and environment tagged
- Custom breadcrumbs for debugging

### ✅ Smart Filtering
- Development errors filtered (optional)
- Sensitive data protection
- Environment-specific configuration

## 📊 Sentry Features You'll Get

### 🚨 Real-time Error Alerts
- Instant notifications when errors occur
- Email/Slack integration available
- Error frequency tracking

### 📈 Error Analytics
- Error trends over time
- Most common errors
- User impact analysis

### 🔍 Detailed Error Context
- Full stack traces
- User actions leading to error
- Device and app information
- Network conditions

### 🎯 Release Tracking
- Track errors by app version
- Monitor error rates after releases
- Identify regression issues

## 🛠️ Usage Examples

### Manual Error Reporting
```typescript
import { captureException, captureMessage } from '@/utils/sentryConfig';

// Capture an exception
try {
  // Some risky operation
} catch (error) {
  captureException(error, { operation: 'user_action' });
}

// Capture a message
captureMessage('User completed onboarding', 'info');
```

### User Context
```typescript
import { setUserContext } from '@/utils/sentryConfig';

// Set user context for better error tracking
setUserContext({
  id: user.id,
  username: user.username,
  email: user.email
});
```

### Performance Monitoring
```typescript
import { startTransaction, finishTransaction } from '@/utils/sentryConfig';

// Track performance
const transaction = startTransaction('api_call', 'http');
// ... perform operation
finishTransaction(transaction);
```

## 🎯 Next Steps

1. **Create Sentry account** and get your DSN
2. **Update eas.json** with real DSN values
3. **Build and test** your app
4. **Monitor your Sentry dashboard** for errors
5. **Set up alerts** for critical errors

## 💡 Pro Tips

- **Use different DSNs** for development, staging, and production
- **Set up alerts** for error spikes
- **Monitor performance** trends over time
- **Use breadcrumbs** to track user actions
- **Filter sensitive data** in error reports

## 🔒 Privacy & Security

- **No personal data** is sent to Sentry by default
- **User IDs are hashed** for privacy
- **Sensitive information** is filtered out
- **GDPR compliant** data handling

---

**Sentry is now ready to help you monitor and debug your app! 🎉**
