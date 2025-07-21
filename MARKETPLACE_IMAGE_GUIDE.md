# Marketplace Image Service Guide

## Overview

This guide explains how to use the optimized image upload and storage system for your OLX-like marketplace app. The system provides:

- **Smart compression** for optimal file sizes
- **Multiple image sizes** (original, thumbnail, preview)
- **OLX-style validation** and processing
- **Supabase storage integration** with your existing buckets
- **Progress tracking** and error handling

## Storage Buckets

Your Supabase storage is configured with three buckets:

### 1. `listings` Bucket
- **Purpose**: Listing images (public)
- **Max Size**: 5MB per image
- **Formats**: JPEG, PNG, WebP
- **Use Case**: Product photos, item images

### 2. `avatars` Bucket
- **Purpose**: User profile pictures (public)
- **Max Size**: 2MB per image
- **Formats**: JPEG, PNG
- **Use Case**: User avatars, profile photos

### 3. `temp` Bucket
- **Purpose**: Temporary uploads (private)
- **Max Size**: 10MB per image
- **Formats**: JPEG, PNG, WebP
- **Use Case**: Processing, temporary storage

## Image Processing Pipeline

### 1. Validation
```typescript
const validation = await MarketplaceImageService.validateImage(uri, 'listing');
if (!validation.isValid) {
  console.error('Validation errors:', validation.errors);
  return;
}
```

### 2. Processing
```typescript
// For listings: Creates original, thumbnail, and preview sizes
const processed = await MarketplaceImageService.processListingImage(uri, {
  quality: 0.85,
  maxWidth: 1200,
  maxHeight: 1200,
  onProgress: (progress) => {
    console.log(`Processing: ${progress.percentage}%`);
  }
});

// For avatars: Creates original and thumbnail sizes
const processed = await MarketplaceImageService.processAvatarImage(uri, {
  quality: 0.8,
  onProgress: (progress) => {
    console.log(`Processing: ${progress.percentage}%`);
  }
});
```

### 3. Upload
```typescript
// Upload listing images
const uploadResult = await MarketplaceImageService.uploadListingImages(
  uris,
  listingId,
  { onProgress: (progress) => console.log(`Upload: ${progress.percentage}%`) }
);

// Upload avatar
const avatar = await MarketplaceImageService.uploadAvatarImage(
  uri,
  username,
  { onProgress: (progress) => console.log(`Upload: ${progress.percentage}%`) }
);
```

## Usage Examples

### 1. Adding Images to a Listing

```typescript
import { MarketplaceImageService } from '@/utils/marketplaceImageService';

const handleAddListingImages = async () => {
  try {
    // Pick images from gallery
    const result = await MarketplaceImageService.pickListingImages(8);
    
    if (result.assets && result.assets.length > 0) {
      const uris = result.assets.map(asset => asset.uri);
      
      // Upload images
      const uploadResult = await MarketplaceImageService.uploadListingImages(
        uris,
        listingId,
        {
          onProgress: (progress) => {
            console.log(`Upload progress: ${progress.percentage}%`);
          }
        }
      );
      
      console.log('Uploaded images:', uploadResult.images);
      console.log('Primary image index:', uploadResult.primaryImageIndex);
    }
  } catch (error) {
    console.error('Error uploading images:', error);
  }
};
```

### 2. Taking a Photo for Listing

```typescript
const handleTakePhoto = async () => {
  try {
    const result = await MarketplaceImageService.takeListingPhoto();
    
    if (result.assets && result.assets[0]) {
      const uri = result.assets[0].uri;
      
      // Validate image
      const validation = await MarketplaceImageService.validateImage(uri, 'listing');
      if (!validation.isValid) {
        Alert.alert('Invalid Image', validation.errors.join('\n'));
        return;
      }
      
      // Upload single image
      const uploadResult = await MarketplaceImageService.uploadListingImages(
        [uri],
        listingId
      );
      
      console.log('Photo uploaded:', uploadResult.images[0]);
    }
  } catch (error) {
    console.error('Error taking photo:', error);
  }
};
```

### 3. Uploading User Avatar

```typescript
const handleUploadAvatar = async () => {
  try {
    const result = await MarketplaceImageService.pickAvatarImage();
    
    if (result.assets && result.assets[0]) {
      const uri = result.assets[0].uri;
      
      const avatar = await MarketplaceImageService.uploadAvatarImage(
        uri,
        username
      );
      
      console.log('Avatar uploaded:', avatar);
      // Update user profile with avatar URLs
      await updateUserProfile({
        avatar_url: avatar.originalUrl,
        avatar_thumbnail_url: avatar.thumbnailUrl
      });
    }
  } catch (error) {
    console.error('Error uploading avatar:', error);
  }
};
```

### 4. Using the MarketplaceImagePicker Component

```typescript
import MarketplaceImagePicker from '@/components/MarketplaceImagePicker';

const [showImagePicker, setShowImagePicker] = useState(false);
const [uploadedImages, setUploadedImages] = useState([]);

const handleImagesSelected = (images) => {
  setUploadedImages(images);
  setShowImagePicker(false);
};

// In your JSX
<MarketplaceImagePicker
  visible={showImagePicker}
  onClose={() => setShowImagePicker(false)}
  onImagesSelected={handleImagesSelected}
  maxImages={8}
  listingId={listingId}
/>
```

## Image Optimization Features

### 1. Smart Compression
- **Listings**: 85% quality, max 1200x1200px
- **Avatars**: 80% quality, max 400x400px
- **Thumbnails**: 70% quality, optimized sizes

### 2. Multiple Sizes Generated
- **Original**: High quality for full view
- **Thumbnail**: Medium size for grid views
- **Preview**: Small size for quick loading

### 3. Format Optimization
- **JPEG**: Best for photos and complex images
- **PNG**: Preserved for transparency needs
- **WebP**: Modern format with better compression

## Error Handling

### Common Errors and Solutions

1. **File Too Large**
   ```typescript
   // Error: File too large. Maximum size is 5MB
   // Solution: Images are automatically compressed
   ```

2. **Invalid Format**
   ```typescript
   // Error: Unsupported file format
   // Solution: Only JPEG, PNG, WebP are supported
   ```

3. **Permission Denied**
   ```typescript
   // Error: Camera/Gallery permission required
   // Solution: Request permissions before picking
   ```

4. **Upload Failed**
   ```typescript
   // Error: Network or storage issues
   // Solution: Retry with exponential backoff
   ```

## Performance Best Practices

### 1. Image Selection
- Use `allowsEditing: true` for better aspect ratios
- Set `aspect: [4, 3]` for listings
- Set `aspect: [1, 1]` for avatars

### 2. Upload Strategy
- Upload images sequentially to avoid overwhelming the server
- Show progress indicators for better UX
- Implement retry logic for failed uploads

### 3. Storage Management
- Delete old images when updating listings
- Use temporary storage for processing
- Implement cleanup for abandoned uploads

### 4. Caching
- Cache thumbnail URLs for faster loading
- Use CDN URLs for better performance
- Implement lazy loading for image grids

## Database Integration

### Listing Images Table Structure
```sql
CREATE TABLE listing_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID REFERENCES listings(id) ON DELETE CASCADE,
  original_url TEXT NOT NULL,
  thumbnail_url TEXT NOT NULL,
  preview_url TEXT NOT NULL,
  filename TEXT NOT NULL,
  size INTEGER NOT NULL,
  width INTEGER NOT NULL,
  height INTEGER NOT NULL,
  is_primary BOOLEAN DEFAULT FALSE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### User Avatars Table Structure
```sql
CREATE TABLE user_avatars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  original_url TEXT NOT NULL,
  thumbnail_url TEXT NOT NULL,
  filename TEXT NOT NULL,
  size INTEGER NOT NULL,
  width INTEGER NOT NULL,
  height INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Security Considerations

### 1. File Validation
- Validate file types on client and server
- Check file sizes before upload
- Scan for malicious content

### 2. Access Control
- Use RLS (Row Level Security) in Supabase
- Restrict bucket access based on user roles
- Implement signed URLs for private content

### 3. Cleanup
- Delete orphaned files regularly
- Implement file lifecycle management
- Monitor storage usage

## Testing

### 1. Unit Tests
```typescript
describe('MarketplaceImageService', () => {
  test('should validate image correctly', async () => {
    const validation = await MarketplaceImageService.validateImage(testUri, 'listing');
    expect(validation.isValid).toBe(true);
  });
  
  test('should process image with correct dimensions', async () => {
    const processed = await MarketplaceImageService.processListingImage(testUri);
    expect(processed.original.width).toBeLessThanOrEqual(1200);
    expect(processed.original.height).toBeLessThanOrEqual(1200);
  });
});
```

### 2. Integration Tests
```typescript
test('should upload listing images end-to-end', async () => {
  const result = await MarketplaceImageService.uploadListingImages(
    [testImageUri],
    testListingId
  );
  
  expect(result.images).toHaveLength(1);
  expect(result.images[0].originalUrl).toBeDefined();
  expect(result.images[0].thumbnailUrl).toBeDefined();
});
```

## Troubleshooting

### Common Issues

1. **Images not loading**
   - Check Supabase storage permissions
   - Verify bucket public access settings
   - Check network connectivity

2. **Upload failures**
   - Verify file size limits
   - Check supported formats
   - Ensure proper authentication

3. **Performance issues**
   - Optimize image compression settings
   - Use appropriate thumbnail sizes
   - Implement proper caching

4. **Storage quota exceeded**
   - Implement cleanup procedures
   - Monitor storage usage
   - Consider upgrading plan

## Conclusion

This marketplace image service provides a robust, scalable solution for handling images in your OLX-like marketplace app. It follows industry best practices for image optimization, storage, and delivery while maintaining excellent user experience.

For additional support or customization, refer to the Supabase documentation and React Native image handling guides. 