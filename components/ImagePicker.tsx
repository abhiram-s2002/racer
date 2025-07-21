/* global console */
import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { MarketplaceImageService, MarketplaceImage, UploadProgress } from '@/utils/marketplaceImageService';
import { Camera, X, Trash2, Image as ImageIcon, Upload } from 'lucide-react-native';

const { width } = Dimensions.get('window');
const ITEM_SIZE = (width - 48) / 3; // 3 items per row with padding

interface ImageItem {
  id: string;
  uri: string;
  status: 'pending' | 'uploading' | 'uploaded' | 'error';
  progress?: number;
  uploadResult?: MarketplaceImage;
  error?: string;
}

interface ImagePickerProps {
  visible: boolean;
  onClose: () => void;
  onImagesSelected: (images: ImageItem[]) => void;
  maxImages?: number;
  bucket?: string;
}

export default function ImagePicker({
  visible,
  onClose,
  onImagesSelected,
  maxImages = 8,
  bucket = 'listings'
}: ImagePickerProps) {
  const [selectedImages, setSelectedImages] = useState<ImageItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});

  const handlePickImages = async () => {
    try {
      // Check if we can add more images
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
      console.error('Error picking images:', error);
      if (error instanceof Error && error.message !== 'Image selection cancelled') {
        Alert.alert('Error', 'Failed to pick images. Please try again.');
      }
    }
  };

  const handleTakePhoto = async () => {
    try {
      // Check if we can add more images
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
      console.error('Error taking photo:', error);
      if (error instanceof Error && error.message !== 'Photo capture cancelled') {
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

    try {
      // Upload images using MarketplaceImageService
      const uris = updatedImages.map(img => img.uri);
      const listingId = `temp_${Date.now()}`; // Generate temporary listing ID

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
        
        updatedImages[i] = {
          ...image,
          status: 'uploaded' as const,
          uploadResult: uploadResult.images[marketplaceIndex]
        };
        marketplaceIndex++;
      }

      setSelectedImages([...updatedImages]);

      // Success message
      const successCount = uploadResult.images.length;
      Alert.alert('Success', `${successCount} images uploaded successfully!`);

      // Pass uploaded images to parent
      onImagesSelected(updatedImages.filter(img => img.status === 'uploaded'));

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

  const getStatusIcon = (status: ImageItem['status']) => {
    switch (status) {
      case 'pending':
        return <Text style={styles.statusText}>⏳</Text>;
      case 'uploading':
        return <ActivityIndicator size="small" color="#3B82F6" />;
      case 'uploaded':
        return <Text style={styles.statusText}>✅</Text>;
      case 'error':
        return <Text style={styles.statusText}>❌</Text>;
    }
  };

  const getStatusColor = (status: ImageItem['status']) => {
    switch (status) {
      case 'pending':
        return '#6B7280';
      case 'uploading':
        return '#3B82F6';
      case 'uploaded':
        return '#10B981';
      case 'error':
        return '#EF4444';
    }
  };

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
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <X size={24} color="#64748B" />
          </TouchableOpacity>
          <Text style={styles.title}>Add Images</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Image Grid */}
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.imageGrid}>
            {/* Selected Images */}
            {selectedImages.map((image) => (
              <View key={image.id} style={styles.imageItem}>
                <Image source={{ uri: image.uri }} style={styles.image} />
                
                {/* Status Overlay */}
                <View style={styles.statusOverlay}>
                  {getStatusIcon(image.status)}
                </View>

                {/* Progress Bar */}
                {image.status === 'uploading' && uploadProgress[image.id] !== undefined && (
                  <View style={styles.progressContainer}>
                    <View style={styles.progressBar}>
                      <View 
                        style={[
                          styles.progressFill, 
                          { width: `${uploadProgress[image.id]}%` }
                        ]} 
                      />
                    </View>
                    <Text style={styles.progressText}>
                      {uploadProgress[image.id].toFixed(0)}%
                    </Text>
                  </View>
                )}

                {/* Error Message */}
                {image.status === 'error' && image.error && (
                  <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>{image.error}</Text>
                  </View>
                )}

                {/* Remove Button */}
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => handleRemoveImage(image.id)}
                  disabled={image.status === 'uploading'}
                >
                  <Trash2 size={16} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            ))}

            {/* Add Image Buttons */}
            {selectedImages.length < maxImages && (
              <>
                <TouchableOpacity style={styles.addButton} onPress={handlePickImages}>
                  <ImageIcon size={24} color="#64748B" />
                  <Text style={styles.addButtonText}>Gallery</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.addButton} onPress={handleTakePhoto}>
                  <Camera size={24} color="#64748B" />
                  <Text style={styles.addButtonText}>Camera</Text>
                </TouchableOpacity>
              </>
            )}
          </View>

          {/* Info Text */}
          <View style={styles.infoContainer}>
            <Text style={styles.infoText}>
              {selectedImages.length}/{maxImages} images selected
            </Text>
            <Text style={styles.infoText}>
              Supported formats: JPEG, PNG, WebP
            </Text>
            <Text style={styles.infoText}>
              Maximum size: 10MB per image
            </Text>
          </View>
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[
              styles.uploadButton,
              (selectedImages.length === 0 || isUploading) && styles.uploadButtonDisabled
            ]}
            onPress={handleUploadImages}
            disabled={selectedImages.length === 0 || isUploading}
          >
            {isUploading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Upload size={18} color="#FFFFFF" />
            )}
            <Text style={styles.uploadButtonText}>
              {isUploading ? 'Uploading...' : `Upload ${selectedImages.length} Images`}
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
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  closeButton: {
    padding: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  placeholder: {
    width: 32,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
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
  statusOverlay: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 12,
    color: '#FFFFFF',
  },
  progressContainer: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 4,
    padding: 4,
  },
  progressBar: {
    height: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 1,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#3B82F6',
  },
  progressText: {
    fontSize: 10,
    color: '#FFFFFF',
    textAlign: 'center',
    marginTop: 2,
  },
  errorContainer: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    right: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
    borderRadius: 4,
    padding: 4,
  },
  errorText: {
    fontSize: 10,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  removeButton: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButton: {
    width: ITEM_SIZE,
    height: ITEM_SIZE,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  addButtonText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
    textAlign: 'center',
  },
  infoContainer: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  infoText: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 4,
  },
  footer: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#22C55E',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  uploadButtonDisabled: {
    backgroundColor: '#94A3B8',
  },
  uploadButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
}); 