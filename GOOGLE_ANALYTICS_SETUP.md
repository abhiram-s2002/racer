# 📊 Google Analytics Setup Guide

## 🎯 **Overview**
This guide will help you set up Google Analytics 4 (GA4) for your GeoMart app, replacing the previous Supabase analytics system.

## ✅ **What's Already Done**
- ✅ Google Analytics package installed (`react-native-google-analytics-bridge`)
- ✅ Configuration file created (`utils/googleAnalytics.ts`)
- ✅ Environment variables updated
- ✅ App initialization configured
- ✅ Supabase analytics removed (reduces database load)

## 🚀 **Step 1: Create Google Analytics 4 Property**

### 1.1 Go to Google Analytics
1. Visit: https://analytics.google.com/
2. Sign in with your Google account
3. Click **"Start measuring"**

### 1.2 Create Account
1. **Account name**: `GeoMart Analytics`
2. **Account data sharing settings**: Choose your preferences
3. Click **"Next"**

### 1.3 Create Property
1. **Property name**: `GeoMart App`
2. **Reporting time zone**: Choose your timezone
3. **Currency**: Choose your currency
4. Click **"Next"**

### 1.4 Business Information
1. **Industry category**: `Technology` or `E-commerce`
2. **Business size**: Choose appropriate size
3. **How you plan to use Google Analytics**: Select relevant options
4. Click **"Create"**

## 🔑 **Step 2: Get Your Tracking ID**

### 2.1 Find Your Measurement ID
1. In your GA4 property, go to **Admin** (gear icon)
2. Under **Property**, click **Data Streams**
3. Click **"Add stream"** → **"iOS app"** or **"Android app"**
4. **App name**: `GeoMart`
5. **Bundle ID**: `com.geomart.app` (or your actual bundle ID)
6. Click **"Create stream"**
7. **Copy the Measurement ID** (format: `G-XXXXXXXXXX`)

### 2.2 Update Environment Variables
Replace the placeholder in your `eas.json`:

```json
{
  "development": {
    "env": {
      "EXPO_PUBLIC_GOOGLE_ANALYTICS_ID": "G-XXXXXXXXXX"
    }
  },
  "preview": {
    "env": {
      "EXPO_PUBLIC_GOOGLE_ANALYTICS_ID": "G-XXXXXXXXXX"
    }
  },
  "production": {
    "env": {
      "EXPO_PUBLIC_GOOGLE_ANALYTICS_ID": "G-XXXXXXXXXX"
    }
  }
}
```

## 📱 **Step 3: Configure App Events**

### 3.1 Key Events to Track
Your app is already configured to track these events:

- **User Registration**: `trackUserRegistration()`
- **User Login**: `trackUserLogin()`
- **Listing Views**: `trackListingView(listingId, category, price)`
- **Listing Creation**: `trackListingCreated(category, price)`
- **Ping Actions**: `trackPingSent()`, `trackPingAccepted()`, `trackPingRejected()`
- **Search**: `trackSearch(query, resultsCount)`
- **Filters**: `trackFilterUsed(filterType, filterValue)`

### 3.2 Screen Tracking
Add screen tracking to your navigation:

```typescript
import { trackScreenView } from '@/utils/googleAnalytics';

// In your screen components
useEffect(() => {
  trackScreenView('Home Screen');
}, []);
```

## 🧪 **Step 4: Test the Integration**

### 4.1 Development Testing
1. **Start your app**: `npm start`
2. **Check logs**: Look for "Google Analytics initialized successfully"
3. **Perform actions**: Create listings, send pings, etc.
4. **Check GA4 Real-time**: Go to GA4 → Reports → Real-time

### 4.2 Production Testing
1. **Build production app**: `eas build --profile production`
2. **Install on device**: Test with real users
3. **Monitor GA4**: Check for incoming data

## 📊 **Step 5: Configure GA4 Reports**

### 5.1 Custom Events
In GA4, go to **Configure** → **Events** to see your custom events:
- `listing_view`
- `ping_sent`
- `ping_accepted`
- `ping_rejected`
- `listing_created`
- `user_registration`
- `user_login`
- `search_query`
- `filter_used`

### 5.2 Custom Dimensions
Consider adding custom dimensions for:
- User location
- Listing category
- Price ranges
- User type (buyer/seller)

## 🔧 **Step 6: Remove Supabase Analytics (Optional)**

If you want to completely remove the Supabase analytics tables:

```sql
-- Run this in your Supabase SQL Editor
-- Copy and paste the contents of: supabase/remove_analytics_tables.sql
```

## 📈 **Benefits of This Setup**

### ✅ **Performance Benefits**
- **Zero database load** - No analytics writes to Supabase
- **Faster app performance** - No analytics queries slowing down your app
- **Lower costs** - Reduced Supabase usage

### ✅ **Analytics Benefits**
- **Professional insights** - Industry-standard Google Analytics
- **Real-time data** - See user behavior as it happens
- **Custom events** - Track exactly what matters for your marketplace
- **User acquisition** - See where users come from
- **Conversion tracking** - Track listing views, pings, etc.

### ✅ **Scalability Benefits**
- **Handles millions of events** - Google's infrastructure
- **No storage limits** - Google handles data storage
- **Automatic processing** - No manual analytics maintenance

## 🚨 **Important Notes**

1. **Privacy Compliance**: Update your Privacy Policy to mention Google Analytics
2. **GDPR**: Consider user consent for analytics (if applicable)
3. **Data Retention**: GA4 has built-in data retention policies
4. **Cost**: GA4 is free for up to 10 million events per month

## 🎯 **Next Steps**

1. **Create GA4 property** (follow steps above)
2. **Get your Measurement ID**
3. **Update eas.json** with your ID
4. **Test the integration**
5. **Monitor your analytics dashboard**

## 📞 **Support**

If you need help:
- **Google Analytics Help**: https://support.google.com/analytics
- **React Native Bridge Docs**: https://github.com/idehub/react-native-google-analytics-bridge

---

**Your app now has professional-grade analytics with zero database load! 🚀**
