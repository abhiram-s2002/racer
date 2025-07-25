import React, { useState, useEffect } from 'react';
import { Image, ImageStyle, View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { NewImageService, ImageSet, ImageMetadata } from '../utils/newImageService';

interface NewRobustImageProps {
  // Image arrays from database
  images?: string[] | null;
  thumbnailImages?: string[] | null;
  previewImages?: string[] | null;
  imageFolderPath?: string | null;
  
  // Display options
  size?: 'original' | 'thumbnail' | 'preview';
  style?: ImageStyle;
  placeholder?: React.ReactNode;
  placeholderText?: string;
  onError?: (error: any, imageSet: ImageSet, metadata: ImageMetadata) => void;
  onLoad?: (imageSet: ImageSet, metadata: ImageMetadata) => void;
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'repeat' | 'center';
  showLoadingIndicator?: boolean;
  retryCount?: number;
  
  // Optimization options
  width?: number;
  height?: number;
  useCacheBusting?: boolean;
  
  // Debug options
  title?: string;
  debug?: boolean;
}

export const NewRobustImage: React.FC<NewRobustImageProps> = ({
  images,
  thumbnailImages,
  previewImages,
  imageFolderPath,
  size = 'original',
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
  title = 'Unknown',
  debug = false
}) => {
  const [imageSet, setImageSet] = useState<ImageSet>({
    original: NewImageService.getFallbackImageUrl(),
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
    if (images || thumbnailImages || previewImages) {
      newImageSet = NewImageService.getImageSet(images, thumbnailImages, previewImages);
      newMetadata = NewImageService.extractImageMetadata(imageFolderPath);
    } else if (imageFolderPath) {
      // Fallback to generating URLs from folder path if no arrays available
      newImageSet = NewImageService.generateImageUrlsFromFolder(imageFolderPath);
      newMetadata = NewImageService.extractImageMetadata(imageFolderPath);
    } else {
      // No images available
      newImageSet = {
        original: NewImageService.getFallbackImageUrl(),
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
    if (size === 'original') {
      // Prefer original images, fall back to preview then thumbnail
      currentUrl = images && images.length > 0 ? images[0] : 
                   previewImages && previewImages.length > 0 ? previewImages[0] :
                   thumbnailImages && thumbnailImages.length > 0 ? thumbnailImages[0] : '';
    } else if (size === 'thumbnail') {
      // Prefer thumbnail images, fall back to preview then original
      currentUrl = thumbnailImages && thumbnailImages.length > 0 ? thumbnailImages[0] :
                   previewImages && previewImages.length > 0 ? previewImages[0] :
                   images && images.length > 0 ? images[0] : '';
    } else if (size === 'preview') {
      // Prefer preview images, fall back to thumbnail then original
      currentUrl = previewImages && previewImages.length > 0 ? previewImages[0] :
                   thumbnailImages && thumbnailImages.length > 0 ? thumbnailImages[0] :
                   images && images.length > 0 ? images[0] : '';
    } else {
      currentUrl = NewImageService.getBestImageUrl(images, thumbnailImages, previewImages, size);
    }
    setCurrentImageUrl(currentUrl);

    setIsLoading(true);
    setHasError(false);
    setRetryAttempts(0);
  }, [images, thumbnailImages, previewImages, imageFolderPath, size, title, debug]);

  const handleLoad = () => {
    setIsLoading(false);
    setHasError(false);
    onLoad?.(imageSet, metadata);
  };

  const handleError = (error: any) => {
    console.warn('NewRobustImage load error:', {
      title,
      currentImageUrl,
      imageSet,
      metadata,
      error: error?.nativeEvent?.error || error,
      retryAttempts
    });

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