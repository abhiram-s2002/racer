import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  ActivityIndicator,
  Text,
} from 'react-native';
import { Image } from 'expo-image';
import { ChevronLeft, ChevronRight, ArrowLeft } from 'lucide-react-native';
import NewRobustImage from './NewRobustImage';

const { width } = Dimensions.get('window');
const IMAGE_HEIGHT = width * 0.75; // 75% of screen width for good aspect ratio

interface ListingHeroImageProps {
  images: string[];
  thumbnailImages: string[];
  previewImages: string[];
  imageFolderPath: string;
  title: string;
  onBackPress?: () => void;
}

const ListingHeroImage: React.FC<ListingHeroImageProps> = React.memo(({
  images,
  thumbnailImages,
  previewImages,
  imageFolderPath,
  title,
  onBackPress,
}) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [imageLoading, setImageLoading] = useState(true);

  // Memoize the current image data to prevent unnecessary re-renders
  const currentImage = useMemo(() => {
    if (!images || images.length === 0) return null;
    return {
      full: images[currentImageIndex],
      thumbnail: thumbnailImages?.[currentImageIndex],
      preview: previewImages?.[currentImageIndex],
    };
  }, [images, thumbnailImages, previewImages, currentImageIndex]);

  // Handle next image
  const handleNext = useCallback(() => {
    if (images && images.length > 1) {
      setCurrentImageIndex((prev) => (prev + 1) % images.length);
    }
  }, [images]);

  // Handle previous image
  const handlePrevious = useCallback(() => {
    if (images && images.length > 1) {
      setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
    }
  }, [images]);

  // Handle image load
  const handleImageLoad = useCallback(() => {
    setImageLoading(false);
  }, []);

  // Handle image error
  const handleImageError = useCallback(() => {
    setImageLoading(false);
  }, []);

  // If no images, show placeholder
  if (!images || images.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.placeholderContainer}>
          <Text style={styles.placeholderText}>No Image Available</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Main Image */}
      <View style={styles.imageContainer}>
        <NewRobustImage
          images={images}
          thumbnailImages={thumbnailImages}
          previewImages={previewImages}
          imageFolderPath={imageFolderPath}
          size="thumbnail"
          style={styles.mainImage}
          placeholderText={title}
          onLoad={handleImageLoad}
          onError={handleImageError}
        />
        
        {/* Back Button - Top Left */}
        {onBackPress && (
          <TouchableOpacity
            style={styles.backButton}
            onPress={onBackPress}
            activeOpacity={0.8}
          >
            <View style={styles.backButtonContent}>
              <ArrowLeft size={20} color="#FFFFFF" />
            </View>
          </TouchableOpacity>
        )}
        
        {/* Loading Indicator */}
        {imageLoading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#22C55E" />
          </View>
        )}
      </View>

      {/* Navigation Arrows - Only show if multiple images */}
      {images.length > 1 && (
        <>
          {/* Previous Button */}
          <TouchableOpacity
            style={[styles.navButton, styles.prevButton]}
            onPress={handlePrevious}
            activeOpacity={0.7}
          >
            <ChevronLeft size={24} color="#FFFFFF" />
          </TouchableOpacity>

          {/* Next Button */}
          <TouchableOpacity
            style={[styles.navButton, styles.nextButton]}
            onPress={handleNext}
            activeOpacity={0.7}
          >
            <ChevronRight size={24} color="#FFFFFF" />
          </TouchableOpacity>

          {/* Image Counter */}
          <View style={styles.imageCounter}>
            <Text style={styles.counterText}>
              {currentImageIndex + 1} / {images.length}
            </Text>
          </View>
        </>
      )}

      {/* Image Dots Indicator */}
      {images.length > 1 && (
        <View style={styles.dotsContainer}>
          {images.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                index === currentImageIndex && styles.activeDot,
              ]}
            />
          ))}
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    backgroundColor: '#FFFFFF',
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    height: IMAGE_HEIGHT,
    backgroundColor: '#F1F5F9',
  },
  mainImage: {
    width: '100%',
    height: '100%',
  },
  placeholderContainer: {
    width: '100%',
    height: IMAGE_HEIGHT,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 16,
    color: '#64748B',
    fontFamily: 'Inter-Medium',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  navButton: {
    position: 'absolute',
    top: '50%',
    transform: [{ translateY: -20 }],
    width: 40,
    height: 40,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  prevButton: {
    left: 16,
  },
  nextButton: {
    right: 16,
  },
  imageCounter: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  counterText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: 'Inter-Medium',
  },
  dotsContainer: {
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  activeDot: {
    backgroundColor: '#FFFFFF',
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  
  // Back Button Styles
  backButton: {
    position: 'absolute',
    top: 16,
    left: 16,
    zIndex: 20,
  },
  backButtonContent: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
});

ListingHeroImage.displayName = 'ListingHeroImage';

export default ListingHeroImage;
