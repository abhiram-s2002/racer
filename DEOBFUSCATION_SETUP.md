# ProGuard/R8 Obfuscation and Deobfuscation Setup

This document explains how to set up ProGuard/R8 obfuscation for your Android app bundle and generate deobfuscation files for crash analysis.

## What's Been Configured

### 1. ProGuard/R8 Enabled
- ✅ Enabled in `android/gradle.properties`
- ✅ Resource shrinking enabled for smaller APK size
- ✅ Optimized ProGuard configuration using `proguard-android-optimize.txt`

### 2. ProGuard Rules Updated
- ✅ Comprehensive rules for React Native and Expo dependencies
- ✅ Rules for Firebase, Google Maps, Supabase, Sentry, and other libraries
- ✅ Proper handling of native methods, serialization, and reflection

### 3. Build Configuration
- ✅ EAS build configured for production with Hermes enabled
- ✅ Deobfuscation files will be generated automatically

## How to Build with Obfuscation

### Using EAS Build (Recommended)
```bash
# Build production version with obfuscation
eas build --profile production --platform android
```

### Local Build (Alternative)
```bash
cd android
./gradlew bundlePlayRelease
```

## Extracting Deobfuscation Files

After building your app bundle, you need to extract the deobfuscation files:

### On Windows:
```cmd
scripts\extract-deobfuscation-files.bat
```

### On macOS/Linux:
```bash
./scripts/extract-deobfuscation-files.sh
```

The script will:
1. Look for mapping files in your Android build output
2. Copy them to a `deobfuscation-files` directory
3. Provide instructions for uploading to Google Play Console

## Uploading to Google Play Console

1. **Go to Google Play Console** → Select your app
2. **Navigate to Release** → App bundle explorer
3. **Select your release** that was built with obfuscation
4. **Upload deobfuscation files**:
   - Look for the "Deobfuscation files" section
   - Upload the `mapping.txt` file from your `deobfuscation-files` directory

## Benefits of This Setup

### App Size Reduction
- **Code obfuscation**: Renames classes, methods, and fields to shorter names
- **Dead code elimination**: Removes unused code
- **Resource shrinking**: Removes unused resources
- **Expected size reduction**: 15-30% smaller APK/AAB

### Better Crash Analysis
- **Deobfuscated stack traces**: Google Play Console can show readable crash reports
- **ANR analysis**: Easier to debug Application Not Responding issues
- **Performance insights**: Better understanding of app performance issues

## Important Notes

### Keep Deobfuscation Files Safe
- ⚠️ **Never lose your mapping files** - you can't recover them once lost
- 💾 **Store them securely** - they're needed for every release to analyze crashes
- 📁 **Version control**: Consider storing them in a secure repository

### Testing Your Build
1. **Test thoroughly** after enabling obfuscation
2. **Check all features** - obfuscation might affect reflection-based code
3. **Monitor crash reports** after release to ensure everything works correctly

### Troubleshooting

#### If the build fails:
1. Check ProGuard rules for missing keep statements
2. Add specific keep rules for any libraries causing issues
3. Test with `minifyEnabled false` first to isolate the problem

#### If features break after obfuscation:
1. Add keep rules for the affected classes
2. Check for reflection-based code that needs protection
3. Review the ProGuard rules in `android/app/proguard-rules.pro`

## Files Modified

- `android/gradle.properties` - Enabled ProGuard and resource shrinking
- `android/app/build.gradle` - Updated ProGuard configuration
- `android/app/proguard-rules.pro` - Added comprehensive keep rules
- `eas.json` - Updated production build configuration
- `scripts/extract-deobfuscation-files.sh` - Script for Unix systems
- `scripts/extract-deobfuscation-files.bat` - Script for Windows

## Next Steps

1. **Build your app** with the new configuration
2. **Test thoroughly** to ensure everything works
3. **Extract deobfuscation files** using the provided scripts
4. **Upload to Google Play Console** following the instructions above
5. **Monitor crash reports** to verify the setup is working correctly

Your app will now have smaller size and better crash analysis capabilities! 🚀
