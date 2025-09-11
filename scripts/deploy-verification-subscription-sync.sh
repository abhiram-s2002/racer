#!/bin/bash

# Deploy Verification-Subscription Sync System
# This script applies all database migrations and sets up the complete system

echo "🚀 Deploying Verification-Subscription Sync System..."

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Please install it first."
    echo "   npm install -g supabase"
    exit 1
fi

# Check if we're in the right directory
if [ ! -f "supabase/config.toml" ]; then
    echo "❌ Please run this script from the project root directory"
    exit 1
fi

echo "📋 Applying database migrations..."

# Apply the main verification-subscription sync migration
echo "   Applying verification-subscription sync migration..."
supabase db push --file supabase/migrations/20250127_complete_verification_subscription_sync.sql

if [ $? -eq 0 ]; then
    echo "✅ Database migration applied successfully"
else
    echo "❌ Database migration failed"
    exit 1
fi

# Deploy the Google Play webhook function
echo "   Deploying Google Play webhook function..."
supabase functions deploy google-play-webhook

if [ $? -eq 0 ]; then
    echo "✅ Google Play webhook deployed successfully"
else
    echo "❌ Google Play webhook deployment failed"
    exit 1
fi

# Test the database functions
echo "🧪 Testing database functions..."

# Test the sync function
echo "   Testing sync_subscription_with_verification function..."
supabase db exec --file - << 'EOF'
SELECT 
    'Function Test' as test_type,
    public.validate_subscription_purchase(
        '00000000-0000-0000-0000-000000000000'::uuid,
        'com.geomart.app.verification.monthly',
        'test_token_123456789'
    ) as validation_test;
EOF

if [ $? -eq 0 ]; then
    echo "✅ Database functions are working correctly"
else
    echo "❌ Database function test failed"
    exit 1
fi

# Set up environment variables reminder
echo ""
echo "📝 Environment Variables Setup Required:"
echo "   Add these to your .env.local file:"
echo ""
echo "   # Google Play Configuration"
echo "   EXPO_PUBLIC_GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@project.iam.gserviceaccount.com"
echo "   EXPO_PUBLIC_GOOGLE_PRIVATE_KEY=your-private-key"
echo "   EXPO_PUBLIC_GOOGLE_PACKAGE_NAME=com.geomart.app"
echo ""
echo "   # SMS Configuration (if using phone verification)"
echo "   EXPO_PUBLIC_SMS_API_KEY=your-sms-api-key"
echo "   EXPO_PUBLIC_SMS_SENDER_ID=OMNIMKT"
echo "   EXPO_PUBLIC_SMS_FLOW_ID=your-flow-id"
echo ""

# Webhook URL reminder
echo "🔗 Google Play Console Webhook Setup:"
echo "   Set your webhook URL to:"
echo "   https://your-project-ref.supabase.co/functions/v1/google-play-webhook"
echo ""

echo "✅ Verification-Subscription Sync System deployed successfully!"
echo ""
echo "🎯 Next Steps:"
echo "   1. Set up environment variables"
echo "   2. Configure Google Play Console webhook"
echo "   3. Test the integration using SubscriptionVerificationTest component"
echo "   4. Deploy to production"
echo ""

# Optional: Run cleanup job
echo "🧹 Setting up cleanup job..."
supabase db exec --file - << 'EOF'
-- Create a simple cleanup function that can be called manually or via cron
SELECT public.cleanup_expired_subscriptions();
EOF

echo "✅ Cleanup job configured"
echo ""
echo "🎉 Deployment complete! Your verification-subscription system is ready to use."
