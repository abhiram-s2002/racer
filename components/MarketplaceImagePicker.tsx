import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Alert,
  Modal,
  Dimensions,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { Camera, X, Trash2, Image as ImageIcon, Upload, Plus } from 'lucide-react-native';
import { MarketplaceImageService, MarketplaceImage, UploadProgress } from '@/utils/marketplaceImageService';

const { width } = Dimensions.get('window');
const ITEM_SIZE = (width - 48) / 3; // 3 items per row with padding

interface ImageItem {
  id: string;
  uri: string;
  status: 'pending' | 'processing' | 'uploading' | 'uploaded' | 'error';
  progress?: number;
  marketplaceImage?: MarketplaceImage;
  error?: string;
}

interface MarketplaceImagePickerProps {
  visible: boolean;
  onClose: () => void;
  onImagesSelected: (images: MarketplaceImage[]) => void;
  maxImages?: number;
  listingId?: string;
}

export default function MarketplaceImagePicker({
  visible,
  onClose,
  onImagesSelected,
  maxImages = 1,
  listingId = `listing_${Date.now()}`
}: MarketplaceImagePickerProps) {
  const [selectedImages, setSelectedImages] = useState<ImageItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});

  const handlePickImages = async () => {
    try {
      if (selectedImages.length >= maxImages) {
        Alert.alert('Maximum images reached', `You can select up to ${maxImages} images.`);
        return;
      }

      const result = await MarketplaceImageService.pickListingImages(maxImages - selectedImages.length);
      
      if (result.assets && result.assets.length > 0) {
        const newImages: ImageItem[] = result.assets.map((asset, index) => ({
          id: `image_${Date.now()}_${index}`,
          uri: asset.uri,
          status: 'pending' as const,
        }));

        setSelectedImages(prev => [...prev, ...newImages]);
      }
    } catch (error) {
      if (error instanceof Error && error.message !== 'Image selection cancelled') {
        console.error('Error picking images:', error);
        Alert.alert('Error', 'Failed to pick images. Please try again.');
      }
    }
  };

  const handleTakePhoto = async () => {
    try {
      if (selectedImages.length >= maxImages) {
        Alert.alert('Maximum images reached', `You can select up to ${maxImages} images.`);
        return;
      }

      const result = await MarketplaceImageService.takeListingPhoto();
      
      if (result.assets && result.assets[0]) {
        const newImage: ImageItem = {
          id: `image_${Date.now()}_camera`,
          uri: result.assets[0].uri,
          status: 'pending',
        };

        setSelectedImages(prev => [...prev, newImage]);
      }
    } catch (error) {
      if (error instanceof Error && error.message !== 'Photo capture cancelled') {
        console.error('Error taking photo:', error);
        Alert.alert('Error', 'Failed to take photo. Please try again.');
      }
    }
  };

  const handleRemoveImage = (imageId: string) => {
    setSelectedImages(prev => prev.filter(img => img.id !== imageId));
    setUploadProgress(prev => {
      const newProgress = { ...prev };
      delete newProgress[imageId];
      return newProgress;
    });
  };

  const handleUploadImages = async () => {
    if (selectedImages.length === 0) {
      Alert.alert('No images selected', 'Please select at least one image.');
      return;
    }

    setIsUploading(true);
    const updatedImages = [...selectedImages];
    const uploadedMarketplaceImages: MarketplaceImage[] = [];

    try {
      // Validate all images first
      for (let i = 0; i < updatedImages.length; i++) {
        const image = updatedImages[i];
        if (image.status === 'uploaded') continue;

        updatedImages[i] = { ...image, status: 'processing' as const };
        setSelectedImages([...updatedImages]);

        try {
          const validation = await MarketplaceImageService.validateImage(image.uri, 'listing');
          if (!validation.isValid) {
            throw new Error(validation.errors.join(', '));
          }
        } catch (error) {
          updatedImages[i] = {
            ...image,
            status: 'error' as const,
            error: error instanceof Error ? error.message : 'Validation failed'
          };
          setSelectedImages([...updatedImages]);
          continue;
        }
      }

      // Upload images
      const uris = updatedImages
        .filter(img => img.status !== 'error')
        .map(img => img.uri);

      if (uris.length === 0) {
        Alert.alert('No valid images to upload');
        return;
      }

      const onProgress = (progress: UploadProgress) => {
        setUploadProgress(prev => ({
          ...prev,
          overall: progress.percentage
        }));
      };

      const uploadResult = await MarketplaceImageService.uploadListingImages(
        uris,
        listingId,
        { onProgress }
      );

      // Update images with results
      let marketplaceIndex = 0;
      for (let i = 0; i < updatedImages.length; i++) {
        const image = updatedImages[i];
        if (image.status === 'error') continue;

        updatedImages[i] = {
          ...image,
          status: 'uploaded' as const,
          marketplaceImage: uploadResult.images[marketplaceIndex]
        };
        uploadedMarketplaceImages.push(uploadResult.images[marketplaceIndex]);
        marketplaceIndex++;
      }

      setSelectedImages([...updatedImages]);

      // Success message
      const successCount = uploadedMarketplaceImages.length;
      const errorCount = updatedImages.filter(img => img.status === 'error').length;

      if (errorCount > 0) {
        Alert.alert(
          'Upload Complete',
          `${successCount} images uploaded successfully.\n${errorCount} images failed.`
        );
      } else {
        Alert.alert('Success', `${successCount} images uploaded successfully!`);
      }

      // Pass uploaded images to parent
      onImagesSelected(uploadedMarketplaceImages);

    } catch (error) {
      console.error('Error uploading images:', error);
      Alert.alert('Error', 'Failed to upload images. Please try again.');
    } finally {
      setIsUploading(false);
      setUploadProgress({});
    }
  };

  const handleClose = () => {
    if (isUploading) {
      Alert.alert(
        'Upload in Progress',
        'Images are currently uploading. Are you sure you want to cancel?',
        [
          { text: 'Continue Upload', style: 'cancel' },
          { text: 'Cancel', style: 'destructive', onPress: onClose }
        ]
      );
    } else {
      onClose();
    }
  };

  const renderImageItem = ({ item }: { item: ImageItem }) => (
    <View style={styles.imageItem}>
      <Image source={{ uri: item.uri }} style={styles.image} />
      
      <View style={styles.imageOverlay}>
        {item.status === 'uploading' && (
          <View style={styles.progressContainer}>
            <ActivityIndicator size="small" color="#fff" />
            <Text style={styles.progressText}>
              {uploadProgress[item.id] || 0}%
            </Text>
          </View>
        )}
        
        {item.status === 'uploaded' && (
          <View style={styles.successContainer}>
            <Text style={styles.successText}>✅</Text>
          </View>
        )}
        
        {item.status === 'error' && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>❌</Text>
          </View>
        )}
      </View>
      
      <TouchableOpacity
        style={styles.removeButton}
        onPress={() => handleRemoveImage(item.id)}
      >
        <X size={16} color="#fff" />
      </TouchableOpacity>
    </View>
  );

  const renderAddButton = () => (
    <TouchableOpacity style={styles.addButton} onPress={handlePickImages}>
      <Plus size={24} color="#6B7280" />
      <Text style={styles.addButtonText}>Add Image</Text>
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Add Listing Images</Text>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <X size={24} color="#000" />
          </TouchableOpacity>
        </View>

        {/* Progress Bar */}
        {isUploading && (
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { width: `${uploadProgress.overall || 0}%` }
              ]} 
            />
          </View>
        )}

        {/* Image Grid */}
        <ScrollView style={styles.content}>
          <View style={styles.imageGrid}>
            {selectedImages.map((item) => (
              <View key={item.id} style={styles.imageItem}>
                <Image source={{ uri: item.uri }} style={styles.image} />
                
                <View style={styles.imageOverlay}>
                  {item.status === 'uploading' && (
                    <View style={styles.progressContainer}>
                      <ActivityIndicator size="small" color="#fff" />
                      <Text style={styles.progressText}>
                        {uploadProgress[item.id] || 0}%
                      </Text>
                    </View>
                  )}
                  
                  {item.status === 'uploaded' && (
                    <View style={styles.successContainer}>
                      <Text style={styles.successText}>✅</Text>
                    </View>
                  )}
                  
                  {item.status === 'error' && (
                    <View style={styles.errorContainer}>
                      <Text style={styles.errorText}>❌</Text>
                    </View>
                  )}
                </View>
                
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => handleRemoveImage(item.id)}
                >
                  <X size={16} color="#fff" />
                </TouchableOpacity>
              </View>
            ))}
            
            {selectedImages.length < maxImages && renderAddButton()}
          </View>
        </ScrollView>

        {/* Action Buttons */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.cameraButton}
            onPress={handleTakePhoto}
            disabled={isUploading || selectedImages.length >= maxImages}
          >
            <Camera size={20} color="#3B82F6" />
            <Text style={styles.cameraButtonText}>Camera</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.uploadButton,
              (isUploading || selectedImages.length === 0) && styles.uploadButtonDisabled
            ]}
            onPress={handleUploadImages}
            disabled={isUploading || selectedImages.length === 0}
          >
            {isUploading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Upload size={20} color="#fff" />
            )}
            <Text style={styles.uploadButtonText}>
              {isUploading ? 'Uploading...' : 'Upload Images'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  closeButton: {
    padding: 4,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#E5E7EB',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#3B82F6',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  imageItem: {
    width: ITEM_SIZE,
    height: ITEM_SIZE,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressContainer: {
    alignItems: 'center',
  },
  progressText: {
    color: '#fff',
    fontSize: 12,
    marginTop: 4,
  },
  successContainer: {
    alignItems: 'center',
  },
  successText: {
    fontSize: 24,
  },
  errorContainer: {
    alignItems: 'center',
  },
  errorText: {
    fontSize: 24,
  },
  removeButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButton: {
    width: ITEM_SIZE,
    height: ITEM_SIZE,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  addButtonText: {
    color: '#6B7280',
    fontSize: 12,
    marginTop: 4,
  },
  actions: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  cameraButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3B82F6',
    backgroundColor: '#fff',
  },
  cameraButtonText: {
    color: '#3B82F6',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
  },
  uploadButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#3B82F6',
  },
  uploadButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  uploadButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
  },
}); 