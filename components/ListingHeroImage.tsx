import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  ActivityIndicator,
  Text,
} from 'react-native';
import { ChevronLeft, ChevronRight, ArrowLeft } from 'lucide-react-native';
import NewRobustImage from './NewRobustImage';

const { width } = Dimensions.get('window');
const IMAGE_HEIGHT = width * 0.75; // 75% of screen width for good aspect ratio

interface ListingHeroImageProps {
  images: string[];
  thumbnailImages: string[];
  previewImages: string[];
  title: string;
  onBackPress?: () => void;
  category?: string;
  itemType?: 'listing' | 'request';
}

const ListingHeroImage: React.FC<ListingHeroImageProps> = React.memo(({
  images,
  thumbnailImages,
  previewImages,
  title,
  onBackPress,
  category,
  itemType = 'listing',
}) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [imageLoading, setImageLoading] = useState(true);



  // Handle next image
  const handleNext = useCallback(() => {
    if (thumbnailImages && thumbnailImages.length > 1) {
      setCurrentImageIndex((prev) => (prev + 1) % thumbnailImages.length);
    }
  }, [thumbnailImages]);

  // Handle previous image
  const handlePrevious = useCallback(() => {
    if (thumbnailImages && thumbnailImages.length > 1) {
      setCurrentImageIndex((prev) => (prev - 1 + thumbnailImages.length) % thumbnailImages.length);
    }
  }, [thumbnailImages]);

  // Handle image load
  const handleImageLoad = useCallback(() => {
    setImageLoading(false);
  }, []);

  // Handle image error
  const handleImageError = useCallback(() => {
    setImageLoading(false);
  }, []);

  // If no images, show placeholder
  if (!thumbnailImages || thumbnailImages.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.placeholderContainer}>
          <NewRobustImage
            thumbnailImages={[]}
            previewImages={[]}
            size="thumbnail"
            style={styles.mainImage}
            placeholderText={title}
            title={title}
            category={category}
            itemType={itemType}
          />
        </View>
        {/* Back Button - Top Left (also show in no-image state) */}
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
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Main Image */}
      <View style={styles.imageContainer}>
        <NewRobustImage
          thumbnailImages={thumbnailImages}
          previewImages={previewImages}
          size="thumbnail"
          style={styles.mainImage}
          placeholderText={title}
          title={title}
          category={category}
          itemType={itemType}
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
      {thumbnailImages.length > 1 && (
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
              {currentImageIndex + 1} / {thumbnailImages.length}
            </Text>
          </View>
        </>
      )}

      {/* Image Dots Indicator */}
      {thumbnailImages.length > 1 && (
        <View style={styles.dotsContainer}>
          {thumbnailImages.map((_, index) => (
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
