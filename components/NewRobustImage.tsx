import React, { useState, useEffect } from 'react';
import { Image, ImageStyle, View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { enhancedImageService } from '../utils/enhancedImageService';

// Define the missing interfaces
export interface ImageSet {
  thumbnail: string;
  preview: string;
}

export interface ImageMetadata {
  folderPath: string;
  username: string;
  timestamp: string;
  imageCount: number;
  hasImages: boolean;
}

// Create a simple image service wrapper to match the expected interface
class NewImageService {
  static getFallbackImageUrl(): string {
    return 'https://via.placeholder.com/300x300?text=No+Image';
  }

  static getImageSet(thumbnailImages?: string[] | null, previewImages?: string[] | null): ImageSet {
    return {
      thumbnail: thumbnailImages && thumbnailImages.length > 0 ? thumbnailImages[0] : this.getFallbackImageUrl(),
      preview: previewImages && previewImages.length > 0 ? previewImages[0] : this.getFallbackImageUrl()
    };
  }

  static extractImageMetadata(imageFolderPath?: string | null): ImageMetadata {
    if (!imageFolderPath) {
      return {
        folderPath: '',
        username: '',
        timestamp: '',
        imageCount: 0,
        hasImages: false
      };
    }

    // Extract metadata from folder path
    const parts = imageFolderPath.split('/');
    const username = parts[1] || '';
    const timestamp = parts[2] || '';
    
    return {
      folderPath: imageFolderPath,
      username,
      timestamp,
      imageCount: 1, // Assuming 1 image per listing
      hasImages: true
    };
  }

  static generateImageUrlsFromFolder(imageFolderPath: string): ImageSet {
    const baseUrl = 'https://your-supabase-url.supabase.co/storage/v1/object/public/images';
    return {
      thumbnail: `${baseUrl}/${imageFolderPath}/thumbnail.jpg`,
      preview: `${baseUrl}/${imageFolderPath}/preview.jpg`
    };
  }

  static getBestImageUrl(thumbnailImages?: string[] | null, previewImages?: string[] | null, size: 'thumbnail' | 'preview' = 'thumbnail'): string {
    if (size === 'thumbnail') {
      return thumbnailImages && thumbnailImages.length > 0 ? thumbnailImages[0] : 
             previewImages && previewImages.length > 0 ? previewImages[0] : 
             this.getFallbackImageUrl();
    } else {
      return previewImages && previewImages.length > 0 ? previewImages[0] : 
             thumbnailImages && thumbnailImages.length > 0 ? thumbnailImages[0] : 
             this.getFallbackImageUrl();
    }
  }

  static getImageSource(url: string, options: { useCacheBusting?: boolean } = {}): { uri: string } {
    if (options.useCacheBusting) {
      const separator = url.includes('?') ? '&' : '?';
      return { uri: `${url}${separator}t=${Date.now()}` };
    }
    return { uri: url };
  }
}

interface NewRobustImageProps {
  thumbnailImages?: string[] | null;
  previewImages?: string[] | null;
  imageFolderPath?: string | null;
  size?: 'thumbnail' | 'preview';
  style?: any;
  placeholder?: React.ReactNode;
  placeholderText?: string;
  onError?: (error: any, imageSet: ImageSet, metadata: ImageMetadata) => void;
  onLoad?: (imageSet: ImageSet, metadata: ImageMetadata) => void;
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'repeat' | 'center';
  showLoadingIndicator?: boolean;
  retryCount?: number;
  width?: number;
  height?: number;
  useCacheBusting?: boolean;
  title?: string;
}

export const NewRobustImage: React.FC<NewRobustImageProps> = ({
  thumbnailImages,
  previewImages,
  imageFolderPath,
  size = 'thumbnail',
  style,
  placeholder,
  placeholderText = 'No Image',
  onError,
  onLoad,
  resizeMode = 'cover',
  showLoadingIndicator = true,
  retryCount = 2,
  width,
  height,
  useCacheBusting = true,
  title = 'Unknown'
}) => {
  const [imageSet, setImageSet] = useState<ImageSet>({
    thumbnail: NewImageService.getFallbackImageUrl(),
    preview: NewImageService.getFallbackImageUrl()
  });
  const [metadata, setMetadata] = useState<ImageMetadata>({
    folderPath: '',
    username: '',
    timestamp: '',
    imageCount: 0,
    hasImages: false
  });
  const [currentImageUrl, setCurrentImageUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [retryAttempts, setRetryAttempts] = useState(0);

  // Add timeout to force loading state to end (temporary fix)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (isLoading) {
        setIsLoading(false);
      }
    }, 500); // 0.5 seconds

    return () => clearTimeout(timer);
  }, [isLoading, title]);

  // Initialize image set and metadata
  useEffect(() => {
    let newImageSet: ImageSet;
    let newMetadata: ImageMetadata;

    // Always use the image arrays from database if available (they have the actual URLs)
    if (thumbnailImages || previewImages) {
      newImageSet = NewImageService.getImageSet(thumbnailImages, previewImages);
      newMetadata = NewImageService.extractImageMetadata(imageFolderPath);
    } else if (imageFolderPath) {
      // Fallback to generating URLs from folder path if no arrays available
      newImageSet = NewImageService.generateImageUrlsFromFolder(imageFolderPath);
      newMetadata = NewImageService.extractImageMetadata(imageFolderPath);
    } else {
      // No images available
      newImageSet = {
        thumbnail: NewImageService.getFallbackImageUrl(),
        preview: NewImageService.getFallbackImageUrl()
      };
      newMetadata = {
        folderPath: '',
        username: '',
        timestamp: '',
        imageCount: 0,
        hasImages: false
      };
    }

    setImageSet(newImageSet);
    setMetadata(newMetadata);

    // Set the current image URL based on size preference with fallback
    let currentUrl: string;
    if (size === 'thumbnail') {
      // Prefer thumbnail images, fall back to preview
      currentUrl = thumbnailImages && thumbnailImages.length > 0 ? thumbnailImages[0] :
                   previewImages && previewImages.length > 0 ? previewImages[0] : '';
    } else if (size === 'preview') {
      // Prefer preview images, fall back to thumbnail
      currentUrl = previewImages && previewImages.length > 0 ? previewImages[0] :
                   thumbnailImages && thumbnailImages.length > 0 ? thumbnailImages[0] : '';
    } else {
      // Ensure size is always a valid value
      const validSize = size === 'thumbnail' || size === 'preview' ? size : 'thumbnail';
      currentUrl = NewImageService.getBestImageUrl(thumbnailImages, previewImages, validSize);
    }
    setCurrentImageUrl(currentUrl);

    setIsLoading(true);
    setHasError(false);
    setRetryAttempts(0);
  }, [thumbnailImages, previewImages, imageFolderPath, size, title]);

  const handleLoad = () => {
    setIsLoading(false);
    setHasError(false);
    onLoad?.(imageSet, metadata);
  };

  const handleError = (error: any) => {
    // NewRobustImage load error

    if (retryAttempts < retryCount) {
      // Retry with cache busting
      const retryUrl = NewImageService.getImageSource(currentImageUrl, { useCacheBusting: true }).uri;
      setCurrentImageUrl(retryUrl);
      setRetryAttempts(prev => prev + 1);
      setIsLoading(true);
    } else {
      // Use fallback
      setCurrentImageUrl(NewImageService.getFallbackImageUrl());
      setHasError(true);
      setIsLoading(false);
      onError?.(error, imageSet, metadata);
    }
  };

  const renderContent = () => {
    if (isLoading && showLoadingIndicator) {
      return (
        <View style={[styles.loadingContainer, style]}>
          <ActivityIndicator size="small" color="#666" />
        </View>
      );
    }

    if (hasError && placeholder) {
      return (
        <View style={[styles.placeholderContainer, style]}>
          {placeholder}
        </View>
      );
    }

    if (!currentImageUrl || currentImageUrl === NewImageService.getFallbackImageUrl()) {
      return (
        <View style={[styles.errorContainer, style]}>
          <Text style={styles.errorText}>{placeholderText}</Text>
        </View>
      );
    }

    // Use simple image source for debugging
    const imageSource = { uri: currentImageUrl };

    return (
      <Image
        source={imageSource}
        style={style}
        resizeMode={resizeMode}
        onLoad={handleLoad}
        onError={handleError}
      />
    );
  };

  return renderContent();
};

const styles = StyleSheet.create({
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  placeholderContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  errorContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  errorText: {
    color: '#666',
    fontSize: 12,
  },
});

export default NewRobustImage; 