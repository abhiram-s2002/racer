# Enhanced Image Compression Guide

## 🎯 Overview

This guide covers the enhanced image compression system that addresses the "unknown image format" errors and other compression-related issues.

## 🔧 What's Been Fixed

### 1. **Enhanced Compression Service** (`utils/enhancedImageService.ts`)
- ✅ **Pre-compression validation** - Checks image integrity before processing
- ✅ **Post-compression validation** - Verifies compressed images are valid
- ✅ **Retry logic** - Multiple attempts with different settings
- ✅ **Fallback compression** - Conservative settings when standard fails
- ✅ **Emergency compression** - Last resort for problematic images
- ✅ **Detailed error reporting** - Specific error messages for debugging

### 2. **Updated Marketplace Service** (`utils/marketplaceImageService.ts`)
- ✅ **Integrated enhanced compression** - Uses the new service for all images
- ✅ **Graceful fallbacks** - Falls back to working images if compression fails
- ✅ **Better error handling** - More specific error messages
- ✅ **Progress tracking** - Real-time compression progress

### 3. **Diagnostic Tools**
- ✅ **SQL diagnostics** - Check for compression issues in Supabase
- ✅ **Test utilities** - Verify compression works correctly
- ✅ **Compression reports** - Detailed analysis of image compression

## 🚀 How to Use

### Basic Usage

```typescript
import { EnhancedImageService } from './utils/enhancedImageService';

// Simple compression
const result = await EnhancedImageService.compressImage(imageUri, {
  quality: 0.8,
  format: 'jpeg',
  maxWidth: 1200,
  maxHeight: 1200
});

if (result.success) {
  console.log(`Compressed: ${result.size} bytes (${(result.compressionRatio * 100).toFixed(1)}% of original)`);
} else {
  console.error(`Compression failed: ${result.error}`);
}
```

### Advanced Usage

```typescript
// With custom retry settings
const result = await EnhancedImageService.compressImage(imageUri, {
  quality: 0.85,
  format: 'jpeg',
  maxWidth: 1200,
  maxHeight: 1200,
  retryCount: 5,
  retryDelay: 2000
});
```

### Validation

```typescript
// Pre-compression validation
const validation = await EnhancedImageService.validateImageBeforeCompression(imageUri);
if (!validation.isValid) {
  console.error('Image validation failed:', validation.errors);
  return;
}

// Post-compression validation
const compressedValidation = await EnhancedImageService.validateCompressedImage(result.uri);
if (!compressedValidation.isValid) {
  console.error('Compressed image validation failed:', compressedValidation.errors);
}
```

## 🔍 Diagnostics

### Run SQL Diagnostics

1. **Simple Check** (Recommended):
   ```sql
   \i SIMPLE_COMPRESSION_CHECK.sql
   ```

2. **Comprehensive Analysis**:
   ```sql
   \i DIAGNOSE_COMPRESSION_ISSUES.sql
   ```

### Test Compression

```typescript
import { CompressionTester } from './utils/testCompression';

// Run all tests
const results = await CompressionTester.runCompressionTests();

// Test specific image
const report = await CompressionTester.generateCompressionReport(imageUri);
```

## 🛠️ Troubleshooting

### Common Issues

#### 1. **"Unknown image format" Error**
**Cause**: Compression created invalid/corrupted image
**Solution**: 
- Use enhanced compression service
- Check for zero-byte files in Supabase
- Verify MIME types are correct

#### 2. **Compression Fails Completely**
**Cause**: Image is corrupted or unsupported format
**Solution**:
- Run pre-compression validation
- Check image dimensions and size
- Try different quality settings

#### 3. **Compressed Images Too Small**
**Cause**: Over-compression or quality too low
**Solution**:
- Increase quality setting
- Check compression ratio
- Use fallback settings

### Debugging Steps

1. **Check Image Before Compression**:
   ```typescript
   const validation = await EnhancedImageService.validateImageBeforeCompression(uri);
   console.log('Validation:', validation);
   ```

2. **Test Different Settings**:
   ```typescript
   const qualityTests = await CompressionTester.testQualitySettings(uri);
   console.log('Quality tests:', qualityTests);
   ```

3. **Check Supabase Storage**:
   ```sql
   SELECT * FROM storage.objects 
   WHERE bucket_id = 'listings' 
   AND (metadata->>'size')::int = 0;
   ```

4. **Generate Compression Report**:
   ```typescript
   const report = await CompressionTester.generateCompressionReport(uri);
   console.log('Report:', report);
   ```

## 📊 Monitoring

### Compression Success Rate

Monitor these metrics:
- **Zero-byte files**: Should be 0%
- **Tiny files (< 1KB)**: Should be < 5%
- **Missing MIME types**: Should be 0%
- **Wrong MIME types**: Should be 0%

### Performance Metrics

- **Compression ratio**: Target 20-80% of original size
- **Processing time**: Should be < 5 seconds per image
- **Retry attempts**: Should be < 2 on average

## 🔄 Migration Guide

### From Old Compression

1. **Update imports**:
   ```typescript
   // Old
   import * as ImageManipulator from 'expo-image-manipulator';
   
   // New
   import { EnhancedImageService } from './utils/enhancedImageService';
   ```

2. **Replace compression calls**:
   ```typescript
   // Old
   const result = await ImageManipulator.manipulateAsync(uri, operations, options);
   
   // New
   const result = await EnhancedImageService.compressImage(uri, options);
   ```

3. **Add error handling**:
   ```typescript
   if (!result.success) {
     console.error('Compression failed:', result.error);
     // Handle failure
   }
   ```

### Testing Migration

1. **Run compression tests**:
   ```typescript
   await CompressionTester.runCompressionTests();
   ```

2. **Check existing images**:
   ```sql
   \i SIMPLE_COMPRESSION_CHECK.sql
   ```

3. **Test with sample images**:
   ```typescript
   const report = await CompressionTester.generateCompressionReport(testImageUri);
   ```

## 🎯 Best Practices

### 1. **Quality Settings**
- **High quality photos**: 0.8-0.9
- **Standard listings**: 0.7-0.8
- **Thumbnails**: 0.6-0.7
- **Avatars**: 0.7-0.8

### 2. **Dimensions**
- **Listing images**: 1200x1200 max
- **Thumbnails**: 400x400
- **Previews**: 200x200
- **Avatars**: 400x400

### 3. **Error Handling**
- Always check `result.success`
- Log compression errors for debugging
- Provide fallback images when possible
- Monitor compression success rates

### 4. **Performance**
- Use appropriate quality settings
- Don't over-compress small images
- Cache compressed images when possible
- Monitor processing times

## 📝 Configuration

### Default Settings

```typescript
const DEFAULT_COMPRESSION = {
  quality: 0.85,
  format: 'jpeg',
  maxWidth: 1200,
  maxHeight: 1200,
  retryCount: 3,
  retryDelay: 1000
};
```

### Fallback Settings

```typescript
const FALLBACK_COMPRESSION = {
  quality: 0.6,
  format: 'jpeg',
  maxWidth: 800,
  maxHeight: 800,
  retryCount: 1,
  retryDelay: 500
};
```

### Emergency Settings

```typescript
const EMERGENCY_COMPRESSION = {
  quality: 0.4,
  format: 'jpeg',
  maxWidth: 600,
  maxHeight: 600,
  retryCount: 1,
  retryDelay: 0
};
```

## 🚨 Emergency Procedures

### If Compression Completely Fails

1. **Check expo-image-manipulator installation**:
   ```bash
   npm list expo-image-manipulator
   ```

2. **Verify image format support**:
   ```typescript
   const validation = await EnhancedImageService.validateImageBeforeCompression(uri);
   ```

3. **Try emergency compression**:
   ```typescript
   const result = await EnhancedImageService.compressImage(uri, {
     quality: 0.4,
     format: 'jpeg',
     maxWidth: 600,
     maxHeight: 600
   });
   ```

4. **Use original image as fallback**:
   ```typescript
   if (!result.success) {
     // Use original image without compression
     return { uri: originalUri, size: originalSize };
   }
   ```

### If Database Has Corrupted Images

1. **Identify corrupted images**:
   ```sql
   SELECT * FROM storage.objects 
   WHERE (metadata->>'size')::int = 0 
   OR (metadata->>'size')::int < 1024;
   ```

2. **Delete corrupted images**:
   ```sql
   DELETE FROM storage.objects 
   WHERE (metadata->>'size')::int = 0;
   ```

3. **Re-upload with enhanced compression**:
   ```typescript
   const result = await EnhancedImageService.compressImage(uri);
   if (result.success) {
     await uploadToSupabase(result.uri, bucket, filename);
   }
   ```

## 📞 Support

If you encounter issues:

1. **Check the logs** for detailed error messages
2. **Run diagnostics** to identify the problem
3. **Test with sample images** to verify functionality
4. **Check Supabase storage** for corrupted files
5. **Review compression settings** for optimal performance

The enhanced compression service should resolve the "unknown image format" errors and provide robust image processing for your marketplace application. 