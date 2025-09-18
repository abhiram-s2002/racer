import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Alert,
  ScrollView,
  Image,
} from 'react-native';
import { X, MapPin, Upload, Camera, Image as ImageIcon } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { useLocation } from '@/hooks/useLocation';
import { supabase } from '@/utils/supabaseClient';
import { withErrorHandling } from '@/utils/errorHandler';
import { 
  validateListingTitle, 
  validateListingDescription, 
  validatePrice, 
  validateCategory,
  validateForm,
  logSecurityEvent 
} from '@/utils/validation';
import { Category, ItemType } from '@/utils/types';

interface UnifiedRequestModalProps {
  visible: boolean;
  onClose: () => void;
  preSelectedCategory?: Category;
  sellerUsername: string;
}

function UnifiedRequestModal({ visible, onClose, preSelectedCategory, sellerUsername }: UnifiedRequestModalProps) {
  const [formData, setFormData] = useState<{
    title: string;
    category: string;
    price: string; // This will be budget_min
    description: string;
    budget_min: string;
    budget_max: string;
    images: string[];
    pickup_available: boolean;
    delivery_available: boolean;
  }>({
    title: '',
    category: preSelectedCategory || '',
    price: '',
    description: '',
    budget_min: '',
    budget_max: '',
    images: [],
    pickup_available: false,
    delivery_available: false,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Location hook for capturing request location
  const location = useLocation();

  // Prefill form for category
  useEffect(() => {
    if (preSelectedCategory) {
      setFormData(prev => ({
        ...prev,
        category: preSelectedCategory
      }));
    }
  }, [preSelectedCategory]);

  const resetForm = () => {
    setFormData({
      title: '',
      category: preSelectedCategory || '',
      price: '',
      description: '',
      budget_min: '',
      budget_max: '',
      images: [],
    });
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  // Image upload functionality
  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      try {
        const manipulatedImage = await manipulateAsync(
          result.assets[0].uri,
          [{ resize: { width: 800 } }],
          { compress: 0.8, format: SaveFormat.JPEG }
        );

        setFormData(prev => ({
          ...prev,
          images: [...prev.images, manipulatedImage.uri]
        }));
      } catch (error) {
        Alert.alert('Error', 'Failed to process image');
      }
    }
  };

  const takePhoto = async () => {
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      try {
        const manipulatedImage = await manipulateAsync(
          result.assets[0].uri,
          [{ resize: { width: 800 } }],
          { compress: 0.8, format: SaveFormat.JPEG }
        );

        setFormData(prev => ({
          ...prev,
          images: [...prev.images, manipulatedImage.uri]
        }));
      } catch (error) {
        Alert.alert('Error', 'Failed to process image');
      }
    }
  };

  const removeImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const uploadImages = async (imageUris: string[]): Promise<string[]> => {
    const uploadedUrls: string[] = [];
    
    for (const uri of imageUris) {
      try {
        const response = await fetch(uri);
        const blob = await response.blob();
        
        const fileExt = uri.split('.').pop()?.toLowerCase() || 'jpg';
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `requests/${fileName}`;

        const { data, error } = await supabase.storage
          .from('listings')
          .upload(filePath, blob, {
            contentType: `image/${fileExt}`,
            upsert: false
          });

        if (error) throw error;

        const { data: { publicUrl } } = supabase.storage
          .from('listings')
          .getPublicUrl(filePath);

        uploadedUrls.push(publicUrl);
      } catch (error) {
        console.error('Error uploading image:', error);
        throw error;
      }
    }
    
    return uploadedUrls;
  };

  const handleSubmit = async () => {
    // Validation
    const validators = {
      title: validateListingTitle,
      description: validateListingDescription,
      category: validateCategory,
    };
    
    const { isValid, errors, sanitizedData } = validateForm(formData, validators);
    
    if (!isValid) {
      logSecurityEvent('validation_failure', { errors, formData }, sellerUsername);
      
      const firstError = Object.values(errors)[0];
      Alert.alert('Validation Error', firstError);
      return;
    }

    // Check if location is available (optional but recommended)
    if (!location.latitude || !location.longitude) {
      Alert.alert(
        'Location Required',
        'Setting your location helps others find your request and improves visibility. Would you like to set your location now?',
        [
          { text: 'Continue Without Location', style: 'cancel' },
          { 
            text: 'Set Location', 
            onPress: () => location.updateLocation()
          }
        ]
      );
      return;
    }

    const context = {
      operation: 'create_request',
      component: 'UnifiedRequestModal',
      userId: sellerUsername,
      additionalData: { 
        category: sanitizedData.category,
        hasLocation: !!(location.latitude && location.longitude)
      }
    };

    const success = await withErrorHandling(async () => {
      setIsSubmitting(true);
      
      // Upload images first
      let thumbnailImages: string[] = [];
      let previewImages: string[] = [];
      
      if (formData.images.length > 0) {
        const uploadedUrls = await uploadImages(formData.images);
        thumbnailImages = uploadedUrls; // For now, use same URLs for both
        previewImages = uploadedUrls;
      }

      // Prepare request data using the unified schema
      const requestData = {
        requester_username: sellerUsername,
        username: sellerUsername, // Unified field
        title: sanitizedData.title,
        description: sanitizedData.description,
        budget_min: formData.budget_min ? parseFloat(formData.budget_min) : null,
        budget_max: formData.budget_max ? parseFloat(formData.budget_max) : null,
        price: formData.budget_min ? parseFloat(formData.budget_min) : 0, // Primary price field
        price_unit: null, // Requests don't use pricing units
        item_type: 'request',
        category: sanitizedData.category,
        location_geometry: location.latitude && location.longitude ? 
          `POINT(${location.longitude} ${location.latitude})` : null,
        latitude: location.latitude || null,
        longitude: location.longitude || null,
        thumbnail_images: thumbnailImages,
        preview_images: previewImages,
        image_url: thumbnailImages[0] || null, // Legacy field
        view_count: 0,
        ping_count: 0,
        pickup_available: formData.pickup_available,
        delivery_available: formData.delivery_available,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
      };

      const { data, error } = await supabase
        .from('requests')
        .insert([requestData])
        .select()
        .single();

      if (error) {
        throw error;
      }

      logSecurityEvent('request_created', { requestId: data.id, category: data.category }, sellerUsername);
      Alert.alert('Success', 'Request created successfully!');
      
      onClose();
      resetForm();
      
      return true;
    }, context, true, sellerUsername);

    if (!success) {
      setIsSubmitting(false);
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
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <X size={24} color="#64748B" />
          </TouchableOpacity>
          <Text style={styles.title}>Create Request</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Request Title */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>What do you need? *</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.textInput}
                value={formData.title}
                onChangeText={(text) => setFormData(prev => ({ ...prev, title: text }))}
                placeholder="e.g., Need a cameraman for party"
                placeholderTextColor="#94A3B8"
              />
            </View>
          </View>

          {/* Category */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Category *</Text>
            <View style={styles.categoryDisplay}>
              <Text style={styles.categoryText}>
                {formData.category ? formData.category.charAt(0).toUpperCase() + formData.category.slice(1) : 'Select a category'}
              </Text>
            </View>
          </View>

          {/* Budget Range */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Budget Range (Optional)</Text>
            <View style={styles.budgetRow}>
              <View style={styles.budgetInput}>
                <Text style={styles.currencyPrefix}>₹</Text>
                <TextInput
                  style={styles.budgetTextInput}
                  value={formData.budget_min}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, budget_min: text }))}
                  placeholder="Min"
                  placeholderTextColor="#94A3B8"
                  keyboardType="numeric"
                />
              </View>
              <Text style={styles.budgetSeparator}>to</Text>
              <View style={styles.budgetInput}>
                <Text style={styles.currencyPrefix}>₹</Text>
                <TextInput
                  style={styles.budgetTextInput}
                  value={formData.budget_max}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, budget_max: text }))}
                  placeholder="Max"
                  placeholderTextColor="#94A3B8"
                  keyboardType="numeric"
                />
              </View>
            </View>
          </View>

          {/* Location Section */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Location *</Text>
            <View style={styles.locationContainer}>
              <MapPin size={16} color="#64748B" />
              <View style={styles.locationTextContainer}>
                {location.loading ? (
                  <Text style={styles.locationText}>Getting your location...</Text>
                ) : location.error ? (
                  <Text style={styles.locationErrorText}>Location access denied</Text>
                ) : location.latitude && location.longitude ? (
                  <Text style={styles.locationText}>
                    📍 Location set successfully
                  </Text>
                ) : (
                  <Text style={styles.locationText}>⚠️ Location required for better visibility</Text>
                )}
              </View>
              <TouchableOpacity 
                style={[styles.updateLocationButton, !location.latitude && styles.updateLocationButtonUrgent]}
                onPress={location.updateLocation}
                disabled={location.loading}
              >
                <Text style={[styles.updateLocationText, !location.latitude && styles.updateLocationTextUrgent]}>
                  {location.loading ? 'Updating...' : (!location.latitude ? 'Set Location' : 'Update')}
                </Text>
              </TouchableOpacity>
            </View>
            {!location.latitude && !location.loading && (
              <Text style={styles.locationWarning}>
                ⚠️ Setting your location helps others find your request and improves visibility by 3x
              </Text>
            )}
          </View>

          {/* Images */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Images (Optional)</Text>
            <View style={styles.imageUploadContainer}>
              <TouchableOpacity style={styles.imageUploadButton} onPress={pickImage}>
                <ImageIcon size={20} color="#22C55E" />
                <Text style={styles.imageUploadText}>Gallery</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.imageUploadButton} onPress={takePhoto}>
                <Camera size={20} color="#22C55E" />
                <Text style={styles.imageUploadText}>Camera</Text>
              </TouchableOpacity>
            </View>
            
            {formData.images.length > 0 && (
              <View style={styles.imagePreviewContainer}>
                {formData.images.map((uri, index) => (
                  <View key={index} style={styles.imagePreview}>
                    <Image source={{ uri }} style={styles.imagePreviewImage} />
                    <TouchableOpacity 
                      style={styles.removeImageButton}
                      onPress={() => removeImage(index)}
                    >
                      <X size={16} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Pickup and Delivery Options */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Delivery Options</Text>
            <View style={styles.deliveryOptionsContainer}>
              <TouchableOpacity
                style={[
                  styles.deliveryOptionButton,
                  formData.pickup_available && styles.selectedDeliveryOption
                ]}
                onPress={() => setFormData(prev => ({ 
                  ...prev, 
                  pickup_available: !prev.pickup_available 
                }))}
              >
                <Text style={[
                  styles.deliveryOptionText,
                  formData.pickup_available && styles.selectedDeliveryOptionText
                ]}>
                  Pickup Available
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.deliveryOptionButton,
                  formData.delivery_available && styles.selectedDeliveryOption
                ]}
                onPress={() => setFormData(prev => ({ 
                  ...prev, 
                  delivery_available: !prev.delivery_available 
                }))}
              >
                <Text style={[
                  styles.deliveryOptionText,
                  formData.delivery_available && styles.selectedDeliveryOptionText
                ]}>
                  Delivery Available
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Description */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Description (Optional)</Text>
            <TextInput
              style={styles.textArea}
              value={formData.description}
              onChangeText={(text) => setFormData(prev => ({ ...prev, description: text }))}
              placeholder="Provide more details about your request..."
              placeholderTextColor="#94A3B8"
              multiline
              numberOfLines={4}
            />
          </View>

          {/* Submit Button */}
          <TouchableOpacity 
            style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]} 
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            <Upload size={18} color="#FFFFFF" />
            <Text style={styles.submitButtonText}>
              {isSubmitting ? 'Creating...' : 'Create Request'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
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
    fontFamily: 'Inter-SemiBold',
    color: '#1E293B',
  },
  placeholder: {
    width: 32,
  },
  scrollView: {
    flex: 1,
  },
  formGroup: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginVertical: 6,
    padding: 12,
    borderRadius: 10,
    boxShadow: '0px 1px 4px rgba(0,0,0,0.05)',
    elevation: 2,
  },
  label: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#1E293B',
    marginBottom: 6,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#1E293B',
    padding: 10,
  },
  categoryDisplay: {
    backgroundColor: '#F1F5F9',
    padding: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  categoryText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#1E293B',
  },
  budgetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  budgetInput: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
  },
  currencyPrefix: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#22C55E',
    paddingLeft: 10,
  },
  budgetTextInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#1E293B',
    padding: 10,
  },
  budgetSeparator: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#64748B',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 6,
    padding: 10,
    marginTop: 6,
  },
  locationTextContainer: {
    flex: 1,
    marginLeft: 8,
  },
  locationText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#1E293B',
  },
  locationErrorText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#EF4444',
  },
  updateLocationButton: {
    backgroundColor: '#22C55E',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  updateLocationText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#FFFFFF',
  },
  updateLocationButtonUrgent: {
    backgroundColor: '#F59E0B',
  },
  updateLocationTextUrgent: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  locationWarning: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#F59E0B',
    marginTop: 6,
    marginLeft: 10,
    backgroundColor: '#FEF3C7',
    padding: 8,
    borderRadius: 6,
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 6,
    padding: 10,
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#1E293B',
    backgroundColor: '#FFFFFF',
    textAlignVertical: 'top',
    minHeight: 80,
  },
  
  // Delivery Options Styles
  deliveryOptionsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  deliveryOptionButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  selectedDeliveryOption: {
    borderColor: '#22C55E',
    backgroundColor: '#F0FDF4',
  },
  deliveryOptionText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#64748B',
  },
  selectedDeliveryOptionText: {
    color: '#22C55E',
  },
  
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#22C55E',
    marginHorizontal: 16,
    marginBottom: 20,
    padding: 12,
    borderRadius: 10,
    gap: 6,
  },
  submitButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  submitButtonDisabled: {
    backgroundColor: '#94A3B8',
  },
  imageUploadContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  imageUploadButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
  },
  imageUploadText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#22C55E',
  },
  imagePreviewContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  imagePreview: {
    position: 'relative',
    width: 80,
    height: 80,
    borderRadius: 8,
    overflow: 'hidden',
  },
  imagePreviewImage: {
    width: '100%',
    height: '100%',
  },
  removeImageButton: {
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
});

export default UnifiedRequestModal;
