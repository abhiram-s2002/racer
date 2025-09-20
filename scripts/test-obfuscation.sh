#!/bin/bash

echo "🧪 Testing ProGuard/R8 Obfuscation Setup"
echo "========================================"

# Check if ProGuard is enabled
echo "1. Checking ProGuard configuration..."
if grep -q "android.enableProguardInReleaseBuilds=true" android/gradle.properties; then
    echo "   ✅ ProGuard is enabled in gradle.properties"
else
    echo "   ❌ ProGuard is not enabled"
fi

if grep -q "android.enableShrinkResourcesInReleaseBuilds=true" android/gradle.properties; then
    echo "   ✅ Resource shrinking is enabled"
else
    echo "   ❌ Resource shrinking is not enabled"
fi

# Check ProGuard rules
echo ""
echo "2. Checking ProGuard rules..."
if grep -q "com.facebook.react" android/app/proguard-rules.pro; then
    echo "   ✅ React Native rules present"
else
    echo "   ❌ React Native rules missing"
fi

if grep -q "expo.modules" android/app/proguard-rules.pro; then
    echo "   ✅ Expo modules rules present"
else
    echo "   ❌ Expo modules rules missing"
fi

if grep -q "native <methods>" android/app/proguard-rules.pro; then
    echo "   ✅ Native methods protection present"
else
    echo "   ❌ Native methods protection missing"
fi

# Check build configuration
echo ""
echo "3. Checking build configuration..."
if grep -q "proguard-android-optimize.txt" android/app/build.gradle; then
    echo "   ✅ Optimized ProGuard configuration"
else
    echo "   ❌ Standard ProGuard configuration"
fi

echo ""
echo "📋 Next steps to test functionality:"
echo "   1. Build release version: eas build --profile production --platform android"
echo "   2. Install and test all app features"
echo "   3. Check crash reports after release"
echo ""
echo "🔍 Features to test specifically:"
echo "   • App startup and navigation"
echo "   • Google Maps functionality"
echo "   • Image upload/picker"
echo "   • Location services"
echo "   • Push notifications"
echo "   • Supabase API calls"
echo "   • In-app purchases (if applicable)"
echo "   • Data persistence (AsyncStorage)"
