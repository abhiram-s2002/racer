@echo off
echo 🧪 Testing ProGuard/R8 Obfuscation Setup
echo ========================================

echo 1. Checking ProGuard configuration...
findstr /C:"android.enableProguardInReleaseBuilds=true" android\gradle.properties >nul
if %errorlevel%==0 (
    echo    ✅ ProGuard is enabled in gradle.properties
) else (
    echo    ❌ ProGuard is not enabled
)

findstr /C:"android.enableShrinkResourcesInReleaseBuilds=true" android\gradle.properties >nul
if %errorlevel%==0 (
    echo    ✅ Resource shrinking is enabled
) else (
    echo    ❌ Resource shrinking is not enabled
)

echo.
echo 2. Checking ProGuard rules...
findstr /C:"com.facebook.react" android\app\proguard-rules.pro >nul
if %errorlevel%==0 (
    echo    ✅ React Native rules present
) else (
    echo    ❌ React Native rules missing
)

findstr /C:"expo.modules" android\app\proguard-rules.pro >nul
if %errorlevel%==0 (
    echo    ✅ Expo modules rules present
) else (
    echo    ❌ Expo modules rules missing
)

findstr /C:"native <methods>" android\app\proguard-rules.pro >nul
if %errorlevel%==0 (
    echo    ✅ Native methods protection present
) else (
    echo    ❌ Native methods protection missing
)

echo.
echo 3. Checking build configuration...
findstr /C:"proguard-android-optimize.txt" android\app\build.gradle >nul
if %errorlevel%==0 (
    echo    ✅ Optimized ProGuard configuration
) else (
    echo    ❌ Standard ProGuard configuration
)

echo.
echo 📋 Next steps to test functionality:
echo    1. Build release version: eas build --profile production --platform android
echo    2. Install and test all app features
echo    3. Check crash reports after release
echo.
echo 🔍 Features to test specifically:
echo    • App startup and navigation
echo    • Google Maps functionality
echo    • Image upload/picker
echo    • Location services
echo    • Push notifications
echo    • Supabase API calls
echo    • In-app purchases (if applicable)
echo    • Data persistence (AsyncStorage)

pause
