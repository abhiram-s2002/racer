# Google Play Subscription Setup Guide

This guide will help you set up Google Play subscription payments for your React Native app.

## Prerequisites

- Google Play Console account
- App published on Google Play (or in testing track)
- Android app with package name: `com.geomart.app`

## Step 1: Google Play Console Setup

### 1.1 Create Subscription Products

1. Go to [Google Play Console](https://play.google.com/console)
2. Select your app: **GeoMart**
3. Navigate to **Monetize** → **Subscriptions**
4. Click **Create subscription**

#### Monthly Verification Subscription:
- **Product ID**: `com.geomart.app.verification.monthly`
- **Name**: Monthly Verification
- **Description**: Get verified status for one month
- **Billing period**: 1 month
- **Price**: ₹19.00 (or your preferred price)
- **Subscription group**: Create new group "Verification Plans"

#### Annual Verification Subscription:
- **Product ID**: `com.geomart.app.verification.annual`
- **Name**: Annual Verification
- **Description**: Get verified status for one year
- **Billing period**: 1 year
- **Price**: ₹199.00 (or your preferred price)
- **Subscription group**: Use "Verification Plans" group

### 1.2 Configure Subscription Settings

1. **Base plan**: Create base plan for each subscription
2. **Pricing**: Set prices for your target markets
3. **Availability**: Make available in your target countries
4. **Grace period**: Set grace period for failed payments (recommended: 3 days)
5. **Trial period**: Optional - set free trial if desired

### 1.3 Upload App Bundle

1. Build your app with the new subscription code
2. Upload to Google Play Console (Internal Testing track first)
3. Test subscriptions before releasing to production

## Step 2: Database Setup

### 2.1 Run Database Migration

Execute the SQL script in your Supabase SQL Editor:

```sql
-- Copy and paste the contents of: supabase/subscription_tables.sql
```

This will create:
- `user_subscriptions` table
- `subscription_products` table  
- `subscription_transactions` table
- Required indexes and RLS policies
- Helper functions for subscription management

### 2.2 Verify Database Setup

Check that the tables were created successfully:

```sql
-- Check tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('user_subscriptions', 'subscription_products', 'subscription_transactions');

-- Check RLS is enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('user_subscriptions', 'subscription_products', 'subscription_transactions');
```

## Step 3: App Configuration

### 3.1 Update Product IDs

In `utils/subscriptionService.ts`, update the product IDs to match your Google Play Console setup:

```typescript
export const SUBSCRIPTION_PRODUCTS = {
  MONTHLY_VERIFICATION: 'com.geomart.app.verification.monthly',
  ANNUAL_VERIFICATION: 'com.geomart.app.verification.annual',
} as const;
```

### 3.2 Test Configuration

1. **Development Testing**:
   - Use Google Play Console's "License Testing" feature
   - Add test accounts in Google Play Console
   - Test with test credit cards

2. **Production Testing**:
   - Use Internal Testing track first
   - Test with real Google accounts
   - Verify subscription flow works correctly

## Step 4: Testing

### 4.1 Use Test Component

Add the test component to your app for development testing:

```typescript
import SubscriptionTestComponent from '@/components/SubscriptionTestComponent';

// Add to your test screen
<SubscriptionTestComponent />
```

### 4.2 Test Scenarios

Test the following scenarios:

1. **Initialization**: Service initializes correctly
2. **Load Subscriptions**: Available subscriptions load
3. **Purchase Flow**: User can purchase subscriptions
4. **Restore Purchases**: Previous purchases restore correctly
5. **Subscription Status**: App correctly detects active subscriptions
6. **Error Handling**: Graceful handling of purchase errors

### 4.3 Google Play Console Testing

1. **License Testing**:
   - Add test accounts in Google Play Console
   - Test purchases with test accounts
   - Verify subscription status updates

2. **Real Money Testing**:
   - Use Internal Testing track
   - Test with real Google accounts
   - Verify actual payment processing

## Step 5: Production Deployment

### 5.1 Pre-Launch Checklist

- [ ] Subscription products created in Google Play Console
- [ ] Database tables created and tested
- [ ] App builds successfully with subscription code
- [ ] Test purchases work in development
- [ ] Test purchases work in Internal Testing track
- [ ] Subscription status updates correctly
- [ ] Error handling works properly
- [ ] UI shows subscription status correctly

### 5.2 Launch Steps

1. **Upload to Production**:
   - Build production APK/AAB
   - Upload to Google Play Console
   - Submit for review

2. **Monitor After Launch**:
   - Check subscription analytics in Google Play Console
   - Monitor error logs for subscription issues
   - Verify user subscription status updates

## Step 6: Troubleshooting

### Common Issues

1. **"Item unavailable" error**:
   - Check product IDs match Google Play Console
   - Ensure app is published (even in testing track)
   - Verify subscription products are active

2. **"User cancelled" error**:
   - This is normal user behavior
   - Handle gracefully in your app

3. **"Service not available" error**:
   - Check Google Play Services is installed
   - Verify device has internet connection
   - Check Google Play Console for service issues

4. **Subscription not detected**:
   - Call `restorePurchases()` on app launch
   - Check database for subscription records
   - Verify purchase validation logic

### Debug Commands

```typescript
// Check subscription service status
console.log('Initialized:', await subscriptionService.initialize());

// Get available subscriptions
const subs = await subscriptionService.getAvailableSubscriptions();
console.log('Available subscriptions:', subs);

// Check current purchases
const purchases = await subscriptionService.getCurrentSubscriptions();
console.log('Current purchases:', purchases);
```

## Step 7: Monitoring and Analytics

### 7.1 Google Play Console Analytics

Monitor these metrics:
- Subscription conversion rate
- Churn rate
- Revenue per user
- Subscription renewal rate

### 7.2 App Analytics

Track these events:
- Subscription purchase initiated
- Subscription purchase completed
- Subscription purchase failed
- Subscription restored
- Subscription cancelled

## Support

For issues with this implementation:

1. Check Google Play Console documentation
2. Review react-native-iap documentation
3. Check Supabase logs for database issues
4. Test with Google Play Console's License Testing

## Files Modified

- `package.json` - Added react-native-iap dependency
- `app.config.js` - Added billing permission
- `utils/subscriptionService.ts` - Core subscription service
- `hooks/useSubscription.ts` - React hook for subscriptions
- `components/VerificationPricingCard.tsx` - Updated with Google Play integration
- `app/settings.tsx` - Added subscription management UI
- `supabase/subscription_tables.sql` - Database schema
- `components/SubscriptionTestComponent.tsx` - Test component

## Next Steps

1. Set up Google Play Console subscriptions
2. Run database migration
3. Test with development build
4. Deploy to Internal Testing track
5. Test with real accounts
6. Deploy to production
7. Monitor and optimize
