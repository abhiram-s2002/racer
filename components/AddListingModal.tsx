/* global setTimeout */
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
  Platform,
  Modal,
} from 'react-native';
import { 
  Camera, 
  Image as ImageIcon, 
  Mic, 
  ChevronDown,
  Upload,
  Check,
  X,
  MapPin,
  ShoppingCart,
  Apple,
  UtensilsCrossed,
  Wrench,
  Palette,
  Home
} from 'lucide-react-native';
import { mockCategories } from '@/utils/mockData';
import { supabase } from '@/utils/supabaseClient';
import { withErrorHandling, ErrorContext } from '@/utils/errorHandler';
import { useLocation } from '@/hooks/useLocation';
import { 
  validateListingTitle, 
  validateListingDescription, 
  validatePrice, 
  validateCategory,
  validatePricingUnit,
  validateDuration,
  validateForm,
  logSecurityEvent 
} from '@/utils/validation';
import { addListingWithImages as addListingSupabase, updateListingWithImages as updateListingSupabase, createListingWithExpiration } from '@/utils/listingSupabase';
import { MarketplaceImageService, MarketplaceImage } from '@/utils/marketplaceImageService';
import MarketplaceImagePicker from './MarketplaceImagePicker';

interface AddListingModalProps {
  visible: boolean;
  onClose: () => void;
  preSelectedCategory?: string;
  editListing?: any | null; // Changed from ListingActivity to any
  sellerUsername: string;
}

export default function AddListingModal({ visible, onClose, preSelectedCategory, editListing, sellerUsername }: AddListingModalProps) {
  const [formData, setFormData] = useState({
    title: '',
    category: preSelectedCategory || '',
    price: '',
    priceUnit: 'per_item',
    description: '',
    images: [] as string[],
    isActive: true,
    expirationDays: 30,
  });

  const [isRecording, setIsRecording] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<MarketplaceImage[]>([]);
  
  // Location hook for capturing listing location
  const location = useLocation();

  // Prefill form for editing
  useEffect(() => {
    async function prefill() {
      if (editListing) {
        setFormData({
          title: editListing.title || '',
          category: editListing.category || preSelectedCategory || '',
          price: editListing.price ? String(editListing.price) : '',
          priceUnit: editListing.price_unit || 'per_item',
          description: editListing.description || '',
          images: Array.isArray(editListing.images) ? editListing.images : (editListing.images ? [editListing.images] : []),
          isActive: editListing.is_active !== undefined ? editListing.is_active : true,
          expirationDays: editListing.expiration_days || 30,
        });
        
        // Handle existing images for editing (convert to MarketplaceImage format)
        if (editListing.images && editListing.images.length > 0) {
          const existingImage = editListing.images[0]; // Only take first image
          const mockMarketplaceImage: MarketplaceImage = {
            id: `existing_${Date.now()}`,
            originalUrl: existingImage,
            thumbnailUrl: existingImage,
            previewUrl: existingImage,
            filename: `existing_${Date.now()}.jpg`,
            size: 100000,
            width: 400,
            height: 400,
            uploadedAt: new Date().toISOString()
          };
          setUploadedImages([mockMarketplaceImage]);
        } else {
          setUploadedImages([]);
        }
      } else if (preSelectedCategory) {
        setFormData(prev => ({
          ...prev,
          category: preSelectedCategory
        }));
        setUploadedImages([]);
      }
    }
    prefill();
  }, [editListing, preSelectedCategory]);

  useEffect(() => {
    if (visible) {
      setFormData(prev => ({
        ...prev,
        category: editListing?.category || (preSelectedCategory && preSelectedCategory !== 'all' ? preSelectedCategory : ''),
      }));
    }
  }, [visible, preSelectedCategory, editListing]);

  const resetForm = () => {
    setFormData({
      title: '',
      category: '',
      price: '',
      priceUnit: 'per_item',
      description: '',
      images: [],
      isActive: true,
      expirationDays: 30,
    });
    setIsRecording(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleVoiceInput = () => {
    if (Platform.OS === 'web') {
      Alert.alert('Voice Input', 'Voice input is not available on web platform');
      return;
    }
    
    setIsRecording(!isRecording);
    setTimeout(() => {
      setIsRecording(false);
      Alert.alert('Voice Input', 'Voice recording feature will be implemented with native speech recognition');
    }, 2000);
  };

  const getDefaultListingImage = async () => {
    // Fetch seller's avatar from Supabase users table
    const { data: user } = await supabase
      .from('users')
      .select('avatar_url')
      .eq('username', sellerUsername)
      .single();
    return user?.avatar_url || 'https://images.pexels.com/photos/1130626/pexels-photo-1130626.jpeg?auto=compress&cs=tinysrgb&w=400';
  };

  const handleImagesSelected = (images: MarketplaceImage[]) => {
    // Only take the first image since we only allow one
    setUploadedImages(images.slice(0, 1));
    setShowImagePicker(false);
  };

  // Get pricing units based on category
  const getPricingUnits = (category: string) => {
    const pricingUnits = {
      groceries: ['per_kg', 'per_piece', 'per_pack', 'per_bundle'],
      fruits: ['per_kg', 'per_dozen', 'per_piece', 'per_basket'],
      food: ['per_plate', 'per_serving', 'per_piece', 'per_kg'],
      services: ['per_hour', 'per_service', 'per_session', 'per_day'],
      art: ['per_piece', 'per_commission', 'per_hour', 'per_project'],
      rental: ['per_day', 'per_week', 'per_month', 'per_hour'],
    };
    return pricingUnits[category as keyof typeof pricingUnits] || ['per_item', 'per_piece', 'per_service'];
  };

  const getPricingUnitLabel = (unit: string) => {
    const labels = {
      per_kg: 'per kg',
      per_piece: 'per piece',
      per_pack: 'per pack',
      per_bundle: 'per bundle',
      per_dozen: 'per dozen',
      per_basket: 'per basket',
      per_plate: 'per plate',
      per_serving: 'per serving',
      per_hour: 'per hour',
      per_service: 'per service',
      per_session: 'per session',
      per_day: 'per day',
      per_commission: 'per commission',
      per_project: 'per project',
      per_week: 'per week',
      per_month: 'per month',
      per_item: 'per item',
    };
    return labels[unit as keyof typeof labels] || unit;
  };

  const handleSubmit = async () => {
    // Validation
    const validators = {
      title: validateListingTitle,
      description: validateListingDescription,
      price: validatePrice,
      category: validateCategory,
      priceUnit: validatePricingUnit,
      expirationDays: validateDuration,
    };
    
    const { isValid, errors, sanitizedData } = validateForm(formData, validators);
    
    if (!isValid) {
      // Log security event for validation failures
      logSecurityEvent('validation_failure', { errors, formData }, sellerUsername);
      
      // Show first error to user
      const firstError = Object.values(errors)[0];
      Alert.alert('Validation Error', firstError);
      return;
    }

    // Check if location is available (optional but recommended)
    if (!location.latitude || !location.longitude) {
      Alert.alert(
        'Location Required',
        'Setting your location helps buyers find your listings and improves visibility. Would you like to set your location now?',
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

    const context: ErrorContext = {
      operation: editListing ? 'update_listing' : 'create_listing',
      component: 'AddListingModal',
      userId: sellerUsername,
      additionalData: { 
        category: sanitizedData.category,
        hasLocation: !!(location.latitude && location.longitude)
      }
    };

    const success = await withErrorHandling(async () => {
      setIsSubmitting(true);
      
      // Use sanitized data with marketplace image support and expiration
      const defaultImage = await getDefaultListingImage();
      const newListing = {
        title: sanitizedData.title,
        description: sanitizedData.description,
        price: sanitizedData.price, // Keep as string to match interface
        category: sanitizedData.category,
        price_unit: formData.priceUnit,
        images: uploadedImages.length > 0 ? [uploadedImages[0].originalUrl] : [defaultImage],
        thumbnail_images: uploadedImages.length > 0 ? [uploadedImages[0].thumbnailUrl] : undefined,
        preview_images: uploadedImages.length > 0 ? [uploadedImages[0].previewUrl] : undefined,
        image_metadata: uploadedImages.length > 0 ? [uploadedImages[0]] : undefined,
        is_active: formData.isActive,
        username: sellerUsername,
        // Include location data if available
        latitude: location.latitude || undefined,
        longitude: location.longitude || undefined,
        // Include expiration settings
        expirationDays: formData.expirationDays,
      };

      let result;
      if (editListing) {
        // Update existing listing
        result = await updateListingSupabase(editListing.id, newListing);
        logSecurityEvent('listing_updated', { listingId: result.id, category: result.category }, sellerUsername);
        Alert.alert('Success', 'Listing updated successfully!');
      } else {
        // Create new listing with expiration
        result = await createListingWithExpiration(newListing);
        logSecurityEvent('listing_created', { listingId: result.id, category: result.category }, sellerUsername);
        Alert.alert('Success', 'Listing created successfully!');
      }
      
      onClose();
      
      // Reset form
      setFormData({
        title: '',
        description: '',
        price: '',
        category: '',
        priceUnit: 'per_item',
        images: [],
        isActive: true,
        expirationDays: 30,
      });
      setUploadedImages([]);
      
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
          <Text style={styles.title}>{editListing ? 'Edit Listing' : 'Create New Listing'}</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Product/Service Name */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Product/Service Name *</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.textInput}
                value={formData.title}
                onChangeText={(text) => setFormData(prev => ({ ...prev, title: text }))}
                placeholder="Enter product or service name"
                placeholderTextColor="#94A3B8"
              />
              <TouchableOpacity 
                style={[styles.voiceButton, isRecording && styles.recordingButton]}
                onPress={handleVoiceInput}
              >
                <Mic size={18} color={isRecording ? '#FFFFFF' : '#64748B'} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Category */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Category *</Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={styles.categoryScrollContainer}
              contentContainerStyle={styles.categoryScrollContent}
            >
              {mockCategories.filter(c => c.id !== 'all').map((category) => {
                const categoryIcons = {
                  groceries: ShoppingCart,
                  fruits: Apple,
                  food: UtensilsCrossed,
                  services: Wrench,
                  art: Palette,
                  rental: Home,
                };
                const IconComponent = categoryIcons[category.id as keyof typeof categoryIcons];
                const isSelected = formData.category === category.id;
                
                return (
                  <TouchableOpacity
                    key={category.id}
                    style={[styles.categoryOption, isSelected && styles.categoryOptionSelected]}
                    onPress={() => {
                      setFormData(prev => ({ ...prev, category: category.id }));
                    }}
                  >
                    <View style={[styles.categoryIcon, isSelected && styles.categoryIconSelected]}>
                      {IconComponent && <IconComponent size={16} color={isSelected ? '#FFFFFF' : '#22C55E'} />}
                    </View>
                    <Text style={[styles.categoryOptionText, isSelected && styles.categoryOptionTextSelected]}>
                      {category.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Price */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Price *</Text>
            <View style={styles.priceContainer}>
              <Text style={styles.currencyPrefix}>₹</Text>
              <TextInput
                style={styles.priceInput}
                value={formData.price}
                onChangeText={(text) => setFormData(prev => ({ ...prev, price: text }))}
                placeholder="0"
                placeholderTextColor="#94A3B8"
                keyboardType="numeric"
              />
            </View>
            
            {/* Pricing Unit Selector */}
            {formData.category && (
              <View style={styles.pricingUnitContainer}>
                <Text style={styles.pricingUnitLabel}>Pricing Unit *</Text>
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  style={styles.pricingUnitScroll}
                  contentContainerStyle={styles.pricingUnitScrollContent}
                >
                  {getPricingUnits(formData.category).map((unit) => {
                    const isSelected = formData.priceUnit === unit;
                    return (
                      <TouchableOpacity
                        key={unit}
                        style={[styles.pricingUnitOption, isSelected && styles.pricingUnitOptionSelected]}
                        onPress={() => {
                          setFormData(prev => ({ ...prev, priceUnit: unit }));
                        }}
                      >
                        <Text style={[styles.pricingUnitText, isSelected && styles.pricingUnitTextSelected]}>
                          {getPricingUnitLabel(unit)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}
          </View>

          {/* Expiration Settings */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Duration *</Text>
            <View style={styles.expirationOptions}>
              {[1, 7, 30, 365].map((days) => (
                <TouchableOpacity
                  key={days}
                  style={[
                    styles.expirationOption,
                    formData.expirationDays === days && styles.expirationOptionSelected
                  ]}
                  onPress={() => setFormData(prev => ({ ...prev, expirationDays: days }))}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.expirationOptionText,
                    formData.expirationDays === days && styles.expirationOptionTextSelected
                  ]}>
                    {days === 1 ? '1 day' : days === 7 ? '1 week' : days === 30 ? '1 month' : '1 year'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.expirationHint}>
              💡 Your listing will be active for {formData.expirationDays === 1 ? '1 day' : formData.expirationDays === 7 ? '1 week' : formData.expirationDays === 30 ? '1 month' : '1 year'}
            </Text>
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
                ⚠️ Setting your location helps buyers find your listings and improves visibility by 3x
              </Text>
            )}
            <Text style={styles.locationHint}>
              💡 Your location helps buyers find listings near them
            </Text>
          </View>

          {/* Image Upload Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Image</Text>
            <Text style={styles.sectionSubtitle}>
              Add one high-quality image for your listing.
            </Text>
            
            {uploadedImages.length > 0 ? (
              <View style={styles.singleImageContainer}>
                <Image 
                  source={{ uri: uploadedImages[0].thumbnailUrl }} 
                  style={styles.singleImagePreview}
                />
                <TouchableOpacity 
                  style={styles.removeImageButton}
                  onPress={() => setUploadedImages([])}
                >
                  <X size={16} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity 
                style={styles.addImagesButton}
                onPress={() => setShowImagePicker(true)}
              >
                <ImageIcon size={24} color="#6B7280" />
                <Text style={styles.addImagesButtonText}>Add Image</Text>
              </TouchableOpacity>
            )}
            
            {uploadedImages.length > 0 && (
              <TouchableOpacity 
                style={styles.manageImagesButton}
                onPress={() => setShowImagePicker(true)}
              >
                <Text style={styles.manageImagesButtonText}>Change Image</Text>
              </TouchableOpacity>
            )}
            

          </View>

          {/* Description */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Description (Optional)</Text>
            <TextInput
              style={styles.textArea}
              value={formData.description}
              onChangeText={(text) => setFormData(prev => ({ ...prev, description: text }))}
              placeholder="Describe your product or service..."
              placeholderTextColor="#94A3B8"
              multiline
              numberOfLines={3}
            />
          </View>

          {/* Availability Toggle */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Availability Status</Text>
            <View style={styles.toggleContainer}>
              <TouchableOpacity
                style={[styles.toggleButton, formData.isActive && styles.activeToggle]}
                onPress={() => setFormData(prev => ({ ...prev, isActive: true }))}
              >
                <View style={[styles.toggleIndicator, formData.isActive && styles.activeIndicator]}>
                  {formData.isActive && <Check size={10} color="#FFFFFF" />}
                </View>
                <Text style={[styles.toggleText, formData.isActive && styles.activeToggleText]}>
                  🟢 Active
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.toggleButton, !formData.isActive && styles.activeToggle]}
                onPress={() => setFormData(prev => ({ ...prev, isActive: false }))}
              >
                <View style={[styles.toggleIndicator, !formData.isActive && styles.activeIndicator]}>
                  {!formData.isActive && <Check size={10} color="#FFFFFF" />}
                </View>
                <Text style={[styles.toggleText, !formData.isActive && styles.activeToggleText]}>
                  🔴 Not Active
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Submit Button */}
          <TouchableOpacity 
            style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]} 
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            <Upload size={18} color="#FFFFFF" />
            <Text style={styles.submitButtonText}>
              {isSubmitting 
                ? (editListing ? 'Updating...' : 'Creating...') 
                : (editListing ? 'Update Listing' : 'Create Listing')
              }
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Image Picker Modal */}
      <MarketplaceImagePicker
        visible={showImagePicker}
        onClose={() => setShowImagePicker(false)}
        onImagesSelected={handleImagesSelected}
        maxImages={1}
        listingId={editListing?.id || undefined} // Pass editListing.id if editing
      />
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
  placeholderText: {
    color: '#94A3B8',
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
  voiceButton: {
    padding: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: 6,
    margin: 2,
  },
  recordingButton: {
    backgroundColor: '#EF4444',
  },
  categoryScrollContainer: {
    marginTop: 6,
  },
  categoryScrollContent: {
    paddingHorizontal: 4,
    gap: 8,
  },
  categoryOption: {
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    minWidth: 60,
  },
  categoryOptionSelected: {
    backgroundColor: '#22C55E',
    borderColor: '#22C55E',
  },
  categoryIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#F0FDF4',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  categoryIconSelected: {
    backgroundColor: '#FFFFFF',
  },
  categoryOptionText: {
    fontSize: 10,
    fontFamily: 'Inter-Medium',
    color: '#64748B',
    textAlign: 'center',
  },
  categoryOptionTextSelected: {
    color: '#FFFFFF',
    fontFamily: 'Inter-SemiBold',
  },
  pricingUnitContainer: {
    marginTop: 8,
  },
  pricingUnitLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#64748B',
    marginBottom: 6,
  },
  pricingUnitScroll: {
    marginTop: 4,
  },
  pricingUnitScrollContent: {
    paddingHorizontal: 4,
    gap: 6,
  },
  pricingUnitOption: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  pricingUnitOptionSelected: {
    backgroundColor: '#22C55E',
    borderColor: '#22C55E',
  },
  pricingUnitText: {
    fontSize: 11,
    fontFamily: 'Inter-Medium',
    color: '#64748B',
  },
  pricingUnitTextSelected: {
    color: '#FFFFFF',
    fontFamily: 'Inter-SemiBold',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
  },
  currencyPrefix: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#22C55E',
    paddingLeft: 10,
  },
  priceInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#1E293B',
    padding: 10,
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
  locationHint: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
    marginTop: 6,
    marginLeft: 10,
  },
  photoSection: {
    marginTop: 6,
  },
  photoButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  photoButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
    padding: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
    gap: 6,
  },
  photoButtonText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#64748B',
  },
  imagePreview: {
    width: 60,
    height: 60,
    borderRadius: 6,
  },
  imagePreviewContainer: {
    marginTop: 8,
    paddingHorizontal: 4,
  },
  imagePreviewItem: {
    position: 'relative',
    marginRight: 8,
  },
  singleImageContainer: {
    position: 'relative',
    marginTop: 8,
    alignItems: 'center',
  },
  singleImagePreview: {
    width: 120,
    height: 120,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  removeImageButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#EF4444',
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  primaryBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#22C55E',
    borderRadius: 10,
    paddingVertical: 4,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBadgeText: {
    fontSize: 10,
    fontFamily: 'Inter-Medium',
    color: '#FFFFFF',
  },
  addImagesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
    padding: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
    gap: 6,
    marginTop: 8,
  },
  addImagesButtonText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#64748B',
  },
  manageImagesButton: {
    alignSelf: 'center',
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#F1F5F9',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  manageImagesButtonText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#64748B',
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
  toggleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 6,
  },
  activeToggle: {
    backgroundColor: '#DCFCE7',
    borderColor: '#22C55E',
  },
  toggleIndicator: {
    width: 16,
    height: 16,
  },

  expirationOptions: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
    flex: 1,
  },
  expirationOption: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    minWidth: 50,
    alignItems: 'center',
  },
  expirationOptionSelected: {
    backgroundColor: '#DCFCE7',
    borderColor: '#22C55E',
  },
  expirationOptionText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#64748B',
  },
  expirationOptionTextSelected: {
    color: '#22C55E',
  },

  extensionOptions: {
    flexDirection: 'row',
    gap: 8,
    flex: 1,
  },
  extensionOption: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  extensionOptionSelected: {
    backgroundColor: '#DCFCE7',
    borderColor: '#22C55E',
    shadowColor: '#22C55E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  extensionOptionText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#64748B',
  },
  extensionOptionTextSelected: {
    color: '#22C55E',
  },
  expirationHint: {
    fontSize: 11,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
    marginTop: 6,
    textAlign: 'center',
  },
  toggleContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  activeIndicator: {
    backgroundColor: '#22C55E',
  },
  toggleText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#64748B',
  },
  activeToggleText: {
    color: '#16A34A',
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
  section: {
    marginHorizontal: 16,
    marginVertical: 6,
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    boxShadow: '0px 1px 4px rgba(0,0,0,0.05)',
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1E293B',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
    marginBottom: 12,
  },
  fallbackHint: {
    marginTop: 12,
    padding: 10,
    backgroundColor: '#F1F5F9',
    borderRadius: 6,
    alignItems: 'center',
  },
  fallbackText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
  },
});