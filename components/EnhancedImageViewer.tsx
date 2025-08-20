import React, { useState } from 'react';
import {
  Modal,
  View,
  Image,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Text,
  StatusBar,
} from 'react-native';
import { PanGestureHandler, State, GestureHandlerRootView } from 'react-native-gesture-handler';
import { X, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react-native';
import { NewImageService, ImageSet, ImageMetadata } from '../utils/newImageService';

interface EnhancedImageViewerProps {
  visible: boolean;
  onClose: () => void;
  images?: string[] | null;
  thumbnailImages?: string[] | null;
  previewImages?: string[] | null;
  imageFolderPath?: string | null;
  initialImageIndex?: number;
  title?: string;
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export const EnhancedImageViewer: React.FC<EnhancedImageViewerProps> = ({
  visible,
  onClose,
  images,
  thumbnailImages,
  previewImages,
  imageFolderPath,
  initialImageIndex = 0,
  title = 'Image Viewer'
}) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(initialImageIndex);
  const [scale, setScale] = useState(1);
  const [translateX, setTranslateX] = useState(0);
  const [translateY, setTranslateY] = useState(0);

  // Get image set from the service
  const imageSet = NewImageService.getImageSet(images, thumbnailImages, previewImages);
  let imageUrls: string[] = [];
  
  // If we have direct image arrays, use them
  if (images && images.length > 0) {
    imageUrls = images.filter(url => url && url.trim() !== '');
  } else if (thumbnailImages && thumbnailImages.length > 0) {
    imageUrls = thumbnailImages.filter(url => url && url.trim() !== '');
  } else if (previewImages && previewImages.length > 0) {
    imageUrls = previewImages.filter(url => url && url.trim() !== '');
  }
  
  // If no direct images, try to generate from folder path
  if (imageUrls.length === 0 && imageFolderPath) {
    const generatedSet = NewImageService.generateImageUrlsFromFolder(imageFolderPath);
    if (generatedSet.original) {
      imageUrls.push(generatedSet.original);
    }
  }
  
  // Fallback to single image from imageSet if still no images
  if (imageUrls.length === 0 && imageSet.original && imageSet.original !== '') {
    imageUrls = [imageSet.original];
  }

  const currentImageUrl = imageUrls[currentImageIndex] || '';

  // Reset image state when component becomes visible
  React.useEffect(() => {
    if (visible) {
      resetImage();
      setCurrentImageIndex(initialImageIndex);
    }
  }, [visible, initialImageIndex]);

  const resetImage = () => {
    setScale(1);
    setTranslateX(0);
    setTranslateY(0);
  };

  const handleZoomIn = () => {
    setScale(prev => Math.min(prev * 1.5, 3));
  };

  const handleZoomOut = () => {
    setScale(prev => Math.max(prev / 1.5, 0.5));
  };

  const handlePanGestureEvent = (event: any) => {
    if (scale > 1) {
      const { translationX, translationY } = event.nativeEvent;
      setTranslateX(prev => prev + translationX);
      setTranslateY(prev => prev + translationY);
    }
  };

  const handlePanStateChange = (event: any) => {
    if (event.nativeEvent.state === State.END) {
      // Snap back to bounds if image is dragged too far
      const maxTranslateX = (scale - 1) * screenWidth / 2;
      const maxTranslateY = (scale - 1) * screenHeight / 2;
      
      setTranslateX(prev => Math.max(-maxTranslateX, Math.min(maxTranslateX, prev)));
      setTranslateY(prev => Math.max(-maxTranslateY, Math.min(maxTranslateY, prev)));
    }
  };

  const nextImage = () => {
    if (imageUrls.length > 1) {
      setCurrentImageIndex(prev => (prev + 1) % imageUrls.length);
      resetImage();
    }
  };

  const previousImage = () => {
    if (imageUrls.length > 1) {
      setCurrentImageIndex(prev => (prev - 1 + imageUrls.length) % imageUrls.length);
      resetImage();
    }
  };

  if (!visible || !currentImageUrl) return null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <StatusBar hidden={true} />
      <GestureHandlerRootView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <View style={styles.imageContainer}>
          <PanGestureHandler
            onGestureEvent={handlePanGestureEvent}
            onHandlerStateChange={handlePanStateChange}
          >
            <View style={styles.imageWrapper}>
              <Image
                source={{ uri: currentImageUrl }}
                style={[
                  styles.image,
                  {
                    transform: [
                      { scale },
                      { translateX },
                      { translateY }
                    ]
                  }
                ]}
                resizeMode="contain"
              />
            </View>
          </PanGestureHandler>
        </View>

        {imageUrls.length > 1 && (
          <View style={styles.navigationContainer}>
            <TouchableOpacity onPress={previousImage} style={styles.navButton}>
              <Text style={styles.navButtonText}>‹</Text>
            </TouchableOpacity>
            <Text style={styles.imageCounter}>
              {currentImageIndex + 1} / {imageUrls.length}
            </Text>
            <TouchableOpacity onPress={nextImage} style={styles.navButton}>
              <Text style={styles.navButtonText}>›</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.controls}>
          <TouchableOpacity onPress={handleZoomOut} style={styles.controlButton}>
            <ZoomOut size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity onPress={resetImage} style={styles.controlButton}>
            <RotateCcw size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleZoomIn} style={styles.controlButton}>
            <ZoomIn size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
    zIndex: 10,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  closeButton: {
    padding: 8,
  },
  imageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageWrapper: {
    width: screenWidth,
    height: screenHeight * 0.7,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  navigationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  navButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  navButtonText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
  },
  imageCounter: {
    color: '#FFFFFF',
    fontSize: 16,
    marginHorizontal: 20,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 40,
    gap: 20,
  },
  controlButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: 12,
    borderRadius: 25,
  },
});

export default EnhancedImageViewer;
