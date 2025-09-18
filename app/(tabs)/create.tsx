import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Image,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { 
  X, 
  ShoppingBag, 
  HandHeart, 
  MapPin, 
  Camera, 
  Image as ImageIcon,
  Upload,
  ShoppingCart,
  Apple,
  UtensilsCrossed,
  Wrench,
  Palette,
  Home,
  Car,
  MoreHorizontal,
  Navigation
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

import { useLocation } from '@/hooks/useLocation';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/utils/supabaseClient';
import { Category, ItemType, PriceUnit } from '@/utils/types';
import MapView, { Marker } from 'react-native-maps';

// Categories (same as listings)
const categories = [
  { id: 'groceries', name: 'Groceries' },
  { id: 'fruits', name: 'Fruits' },
  { id: 'food', name: 'Food' },
  { id: 'services', name: 'Services' },
  { id: 'art', name: 'Art' },
  { id: 'rental', name: 'Rental' },
  { id: 'vehicles', name: 'Vehicles' },
  { id: 'others', name: 'Others' },
];

// Category icons mapping
const categoryIcons = {
  groceries: ShoppingCart,
  fruits: Apple,
  food: UtensilsCrossed,
  services: Wrench,
  art: Palette,
  rental: Home,
  vehicles: Car,
  others: MoreHorizontal,
};

// Duration options
const listingDurations = [
  { id: 1, label: '1 Day', days: 1 },
  { id: 7, label: '1 Week', days: 7 },
  { id: 30, label: '1 Month', days: 30 },
  { id: 365, label: '1 Year', days: 365 },
];

const requestDurations = [
  { id: 0.5, label: '12 Hours', days: 0.5 },
  { id: 1, label: '1 Day', days: 1 },
  { id: 3, label: '3 Days', days: 3 },
  { id: 7, label: '1 Week', days: 7 },
  { id: 30, label: '1 Month', days: 30 },
];

// Helper function to get pricing units based on category
const getPricingUnits = (category: string): PriceUnit[] => {
  const pricingUnits: Record<string, PriceUnit[]> = {
    groceries: ['per_kg', 'per_piece', 'per_pack', 'per_bundle'],
    fruits: ['per_kg', 'per_dozen', 'per_piece', 'per_basket'],
    food: ['per_plate', 'per_serving', 'per_piece', 'per_kg'],
    services: ['per_hour', 'per_service', 'per_session', 'per_day'],
    art: ['per_piece', 'per_commission', 'per_hour', 'per_project'],
    rental: ['per_day', 'per_week', 'per_month', 'per_hour'],
    vehicles: ['per_hour', 'per_day', 'per_week', 'per_month'],
    others: ['per_item', 'per_piece', 'per_service', 'per_hour'],
  };
  return pricingUnits[category] || ['per_item', 'per_piece', 'per_service'];
};

// Helper function to format pricing unit labels
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
    per_year: 'per year',
    per_item: 'per item',
  };
  return labels[unit as keyof typeof labels] || 'per item';
};

interface FormData {
  itemType: ItemType | null;
  title: string;
  category: string;
  priceType: 'fixed' | 'range';
  price: string;
  priceMax: string;
  priceUnit: PriceUnit;
  duration: number;
  description: string;
  images: string[];
  location: {
    latitude: number;
    longitude: number;
    address: string;
  } | null;
  pickup_available: boolean;
  delivery_available: boolean;
}

export default function CreateScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const location = useLocation();
  
  const [currentStep, setCurrentStep] = useState<'type' | 'category' | 'form'>('type');
  const [formData, setFormData] = useState<FormData>({
    itemType: null,
    title: '',
    category: '',
    priceType: 'fixed',
    price: '',
    priceMax: '',
    priceUnit: 'per_item',
    duration: 1,
    description: '',
    images: [],
    location: null,
    pickup_available: false,
    delivery_available: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Map modal state
  const [showMapModal, setShowMapModal] = useState(false);
  const [selectedCoords, setSelectedCoords] = useState<{latitude: number, longitude: number} | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const mapRef = useRef<MapView>(null);

  // Reset form when component mounts
  useEffect(() => {
    setCurrentStep('type');
    setFormData({
      itemType: null,
      title: '',
      category: '',
      priceType: 'fixed',
      price: '',
      priceMax: '',
      priceUnit: 'per_item',
      duration: 1,
      description: '',
      images: [],
      location: null,
      pickup_available: false,
      delivery_available: false,
    });
  }, []);

  const handleTypeSelect = (type: ItemType) => {
    setFormData(prev => ({ ...prev, itemType: type }));
    setCurrentStep('category');
  };

  const handleCategorySelect = (category: string) => {
    // Auto-select the first pricing unit for the category
    const availableUnits = getPricingUnits(category);
    const firstUnit = availableUnits[0] || 'per_item';
    
    setFormData(prev => ({ 
      ...prev, 
      category,
      priceUnit: firstUnit
    }));
    setCurrentStep('form');
  };

  const handleGoBack = () => {
    if (currentStep === 'category') {
      setCurrentStep('type');
    } else if (currentStep === 'form') {
      setCurrentStep('category');
    }
  };

  // Image handling
  const pickImage = async () => {
    // If already have an image, show alert
    if (formData.images.length > 0) {
      Alert.alert(
        'Replace Image',
        'You can only upload one image. Would you like to replace the current image?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Replace', onPress: () => pickNewImage() }
        ]
      );
      return;
    }
    await pickNewImage();
  };

  const pickNewImage = async () => {
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
          images: [manipulatedImage.uri] // Replace with single image
        }));
      } catch (error) {
        Alert.alert('Error', 'Failed to process image');
      }
    }
  };

  const takePhoto = async () => {
    // If already have an image, show alert
    if (formData.images.length > 0) {
      Alert.alert(
        'Replace Image',
        'You can only upload one image. Would you like to replace the current image?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Replace', onPress: () => takeNewPhoto() }
        ]
      );
      return;
    }
    await takeNewPhoto();
  };

  const takeNewPhoto = async () => {
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
          images: [manipulatedImage.uri] // Replace with single image
        }));
      } catch (error) {
        Alert.alert('Error', 'Failed to process image');
      }
    }
  };

  const removeImage = () => {
    setFormData(prev => ({
      ...prev,
      images: [] // Remove the single image
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
        const filePath = `${formData.itemType}s/${fileName}`;

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

  // Location functions
  const handleUseCurrentLocation = async () => {
    setGpsLoading(true);
    try {
      const { latitude: lat, longitude: lng } = location;
      if (lat && lng) {
        setSelectedCoords({ latitude: lat, longitude: lng });
        setFormData(prev => ({
          ...prev,
          location: {
            latitude: lat,
            longitude: lng,
            address: `Current Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`
          }
        }));
        
        // Center map on current location
        if (mapRef.current) {
          mapRef.current.animateToRegion({
            latitude: lat,
            longitude: lng,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          });
        }
      } else {
        Alert.alert('Location Error', 'Unable to get your current location. Please try again or select a location manually.');
      }
    } catch (error) {
      console.error('Error getting current location:', error);
      Alert.alert('Location Error', 'Unable to get your current location. Please try again or select a location manually.');
    } finally {
      setGpsLoading(false);
    }
  };

  const handleMapPress = (event: any) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    setSelectedCoords({ latitude, longitude });
  };

  const handleLocationConfirm = () => {
    if (selectedCoords) {
      setFormData(prev => ({
        ...prev,
        location: {
          latitude: selectedCoords.latitude,
          longitude: selectedCoords.longitude,
          address: `Selected Location (${selectedCoords.latitude.toFixed(4)}, ${selectedCoords.longitude.toFixed(4)})`
        }
      }));
    }
    setShowMapModal(false);
  };

  const handleSubmit = async () => {
    if (!formData.title.trim()) {
      Alert.alert('Error', 'Please enter a title');
      return;
    }
    if (!formData.category) {
      Alert.alert('Error', 'Please select a category');
      return;
    }
    if (!formData.price.trim()) {
      Alert.alert('Error', 'Please enter a price');
      return;
    }
    if (!formData.location) {
      Alert.alert('Error', 'Please select a location');
      return;
    }

    setIsSubmitting(true);

    try {
      // Upload images first
      let thumbnailImages: string[] = [];
      let previewImages: string[] = [];
      
      if (formData.images.length > 0) {
        const uploadedUrls = await uploadImages(formData.images);
        thumbnailImages = uploadedUrls;
        previewImages = uploadedUrls;
      }

      const baseData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        category: formData.category,
        latitude: formData.location?.latitude || null,
        longitude: formData.location?.longitude || null,
        location: formData.location?.latitude && formData.location?.longitude ? 
          `POINT(${formData.location.longitude} ${formData.location.latitude})` : null,
        thumbnail_images: thumbnailImages,
        preview_images: previewImages,
        image_url: thumbnailImages[0] || null,
        view_count: 0,
        ping_count: 0,
        pickup_available: formData.pickup_available,
        delivery_available: formData.delivery_available,
      };

      if (formData.itemType === 'listing') {
        // Create listing
        const listingData = {
          ...baseData,
          username: user?.username,
          price: parseFloat(formData.price),
          price_unit: formData.priceUnit,
          expires_at: new Date(Date.now() + formData.duration * 24 * 60 * 60 * 1000).toISOString(),
        };

        const { error } = await supabase
          .from('listings')
          .insert([listingData]);

        if (error) throw error;

        Alert.alert('Success', 'Listing created successfully!');
      } else {
        // Create request
        const requestData = {
          ...baseData,
          requester_username: user?.username,
          username: user?.username, // Unified field
          budget_min: parseFloat(formData.price),
          budget_max: formData.priceType === 'range' && formData.priceMax ? parseFloat(formData.priceMax) : null,
          price: parseFloat(formData.price),
          price_unit: null, // Requests don't use pricing units
          item_type: 'request',
          expires_at: new Date(Date.now() + formData.duration * 24 * 60 * 60 * 1000).toISOString(),
        };

        const { error } = await supabase
          .from('requests')
          .insert([requestData]);

        if (error) throw error;

        Alert.alert('Success', 'Request created successfully!');
      }

      // Reset and go back to home
      router.push('/(tabs)');
    } catch (error) {
      console.error('Error creating item:', error);
      Alert.alert('Error', 'Failed to create item. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderTypeSelection = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>What would you like to create?</Text>
      <Text style={styles.stepSubtitle}>Choose the type of item you want to add</Text>
      
      <View style={styles.optionsContainer}>
        <TouchableOpacity
          style={styles.optionCard}
          onPress={() => handleTypeSelect('listing')}
        >
          <View style={styles.optionIcon}>
            <ShoppingBag size={32} color="#10B981" />
          </View>
          <Text style={styles.optionTitle}>Sell Item</Text>
          <Text style={styles.optionDescription}>
            List a product or service for sale
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.optionCard}
          onPress={() => handleTypeSelect('request')}
        >
          <View style={styles.optionIcon}>
            <HandHeart size={32} color="#3B82F6" />
          </View>
          <Text style={styles.optionTitle}>Request Service</Text>
          <Text style={styles.optionDescription}>
            Request a service or product from others
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderCategorySelection = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Select Category</Text>
      <Text style={styles.stepSubtitle}>Choose the category that best fits your {formData.itemType}</Text>
      
      <View style={styles.categoriesGrid}>
        {categories.map((category) => {
          const IconComponent = categoryIcons[category.id as keyof typeof categoryIcons] || ShoppingCart;
          const isSelected = formData.category === category.id;
          
          return (
            <TouchableOpacity
              key={category.id}
              style={[
                styles.categoryCard,
                isSelected && styles.selectedCategoryCard
              ]}
              onPress={() => handleCategorySelect(category.id)}
            >
              <View style={[styles.categoryIcon, isSelected && styles.selectedCategoryIcon]}>
                <IconComponent 
                  size={24} 
                  color={isSelected ? '#FFFFFF' : '#10B981'} 
                />
              </View>
              <Text style={[
                styles.categoryText,
                isSelected && styles.selectedCategoryText
              ]}>
                {category.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  const renderForm = () => (
    <ScrollView 
      style={styles.stepContainer} 
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={styles.scrollContent}
    >
      <Text style={styles.stepTitle}>Item Details</Text>
      <Text style={styles.stepSubtitle}>Fill in the details for your {formData.itemType}</Text>

      {/* Title */}
      <View style={styles.formGroup}>
        <Text style={styles.label}>Title *</Text>
        <TextInput
          style={styles.textInput}
          value={formData.title}
          onChangeText={(text) => setFormData(prev => ({ ...prev, title: text }))}
          placeholder={`Enter ${formData.itemType === 'listing' ? 'product/service' : 'service'} name`}
          placeholderTextColor="#94A3B8"
        />
      </View>

      {/* Price Section */}
      <View style={styles.formGroup}>
        <Text style={styles.label}>Price *</Text>
        
        {formData.itemType === 'request' && (
          <View style={styles.priceTypeContainer}>
            <TouchableOpacity
              style={[
                styles.priceTypeButton,
                formData.priceType === 'fixed' && styles.selectedPriceType
              ]}
              onPress={() => setFormData(prev => ({ ...prev, priceType: 'fixed' }))}
            >
              <Text style={[
                styles.priceTypeText,
                formData.priceType === 'fixed' && styles.selectedPriceTypeText
              ]}>
                Fixed Price
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.priceTypeButton,
                formData.priceType === 'range' && styles.selectedPriceType
              ]}
              onPress={() => setFormData(prev => ({ ...prev, priceType: 'range' }))}
            >
              <Text style={[
                styles.priceTypeText,
                formData.priceType === 'range' && styles.selectedPriceTypeText
              ]}>
                Price Range
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.priceInputContainer}>
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

        {formData.priceType === 'range' && formData.itemType === 'request' && (
          <View style={styles.priceInputContainer}>
            <Text style={styles.currencyPrefix}>₹</Text>
            <TextInput
              style={styles.priceInput}
              value={formData.priceMax}
              onChangeText={(text) => setFormData(prev => ({ ...prev, priceMax: text }))}
              placeholder="Max price"
              placeholderTextColor="#94A3B8"
              keyboardType="numeric"
            />
          </View>
        )}

        {/* Pricing Unit badges under price (for listings only) */}
        {formData.itemType === 'listing' && formData.category && (
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            style={styles.pricingUnitBadgesContainer}
            contentContainerStyle={styles.pricingUnitBadgesContent}
          >
            {getPricingUnits(formData.category).map((unit) => (
              <TouchableOpacity
                key={unit}
                style={[
                  styles.pricingUnitBadge,
                  formData.priceUnit === unit && styles.selectedPricingUnitBadge
                ]}
                onPress={() => setFormData(prev => ({ ...prev, priceUnit: unit }))}
              >
                <Text style={[
                  styles.pricingUnitBadgeText,
                  formData.priceUnit === unit && styles.selectedPricingUnitBadgeText
                ]}>
                  {getPricingUnitLabel(unit)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>

      {/* Duration */}
      <View style={styles.formGroup}>
        <Text style={styles.label}>Duration</Text>
        <View style={styles.durationContainer}>
          {(formData.itemType === 'listing' ? listingDurations : requestDurations).map((duration) => (
            <TouchableOpacity
              key={duration.id}
              style={[
                styles.durationButton,
                formData.duration === duration.days && styles.selectedDuration
              ]}
              onPress={() => setFormData(prev => ({ ...prev, duration: duration.days }))}
            >
              <Text style={[
                styles.durationText,
                formData.duration === duration.days && styles.selectedDurationText
              ]}>
                {duration.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Location */}
      <View style={styles.formGroup}>
        <Text style={styles.label}>Location</Text>
        
        {/* Location Display */}
        <View style={styles.locationDisplayContainer}>
          <MapPin size={16} color="#64748B" />
          <Text style={styles.locationDisplayText}>
            {formData.location ? formData.location.address : 'No location set'}
          </Text>
        </View>

        {/* Location Action Buttons */}
        <View style={styles.locationButtonsContainer}>
          <TouchableOpacity 
            style={styles.currentLocationButton}
            onPress={handleUseCurrentLocation}
            disabled={gpsLoading}
          >
            <Text style={styles.currentLocationButtonText}>
              {gpsLoading ? 'Getting Location...' : 'Current Location'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.pickLocationButton}
            onPress={() => setShowMapModal(true)}
          >
            <Text style={styles.pickLocationButtonText}>Select Location</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Image */}
      <View style={styles.formGroup}>
        <Text style={styles.label}>Image (Optional)</Text>
        <Text style={styles.imageHelperText}>You can upload one image from gallery or camera</Text>
        
        {formData.images.length === 0 ? (
          <View style={styles.imageUploadContainer}>
            <TouchableOpacity style={styles.imageUploadButton} onPress={pickImage}>
              <ImageIcon size={20} color="#10B981" />
              <Text style={styles.imageUploadText}>Gallery</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.imageUploadButton} onPress={takePhoto}>
              <Camera size={20} color="#10B981" />
              <Text style={styles.imageUploadText}>Camera</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.singleImagePreviewContainer}>
            <View style={styles.singleImagePreview}>
              <Image source={{ uri: formData.images[0] }} style={styles.singleImagePreviewImage} />
              <TouchableOpacity 
                style={styles.removeImageButton}
                onPress={removeImage}
              >
                <X size={16} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            <View style={styles.imageReplaceButtons}>
              <TouchableOpacity style={styles.replaceImageButton} onPress={pickImage}>
                <ImageIcon size={16} color="#10B981" />
                <Text style={styles.replaceImageButtonText}>Replace from Gallery</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.replaceImageButton} onPress={takePhoto}>
                <Camera size={16} color="#10B981" />
                <Text style={styles.replaceImageButtonText}>Replace from Camera</Text>
              </TouchableOpacity>
            </View>
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
          placeholder={`Provide more details about your ${formData.itemType}...`}
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
          {isSubmitting ? 'Creating...' : `Create ${formData.itemType === 'listing' ? 'Listing' : 'Request'}`}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        {currentStep !== 'type' && (
          <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
            <X size={24} color="#64748B" />
          </TouchableOpacity>
        )}
        <Text style={styles.headerTitle}>
          {currentStep === 'type' ? 'Create' : 
           currentStep === 'category' ? 'Select Category' : 
           'Item Details'}
        </Text>
        <View style={styles.placeholder} />
      </View>

      <KeyboardAvoidingView 
        style={styles.content} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        {currentStep === 'type' && renderTypeSelection()}
        {currentStep === 'category' && renderCategorySelection()}
        {currentStep === 'form' && renderForm()}
      </KeyboardAvoidingView>

      {/* Map Modal */}
      <Modal
        visible={showMapModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.mapModalContainer}>
          {/* Green Header like in profile */}
          <View style={styles.mapHeaderGreen}>
            <Text style={styles.mapTitleGreen}>Select Your Location</Text>
            <Text style={styles.mapSubtitleGreen}>Tap anywhere on the map to choose a spot</Text>
          </View>
          <MapView
            ref={mapRef}
            style={styles.mapView}
            initialRegion={{
              latitude: selectedCoords?.latitude || (location.latitude || 37.7749),
              longitude: selectedCoords?.longitude || (location.longitude || -122.4194),
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            }}
            onPress={handleMapPress}
          >
            {selectedCoords && <Marker coordinate={selectedCoords} />}
          </MapView>
          
          {/* My Location Floating Button */}
          <TouchableOpacity
            style={styles.myLocationButton}
            onPress={handleUseCurrentLocation}
            disabled={gpsLoading}
          >
            <Navigation size={20} color="#FFFFFF" />
          </TouchableOpacity>

          {/* Floating Locate Me Button */}
          <TouchableOpacity
            style={styles.locateMeFloatingButton}
            onPress={handleUseCurrentLocation}
            disabled={gpsLoading}
          >
            <Navigation size={20} color="#FFFFFF" />
            <Text style={styles.locateMeFloatingText}>
              {gpsLoading ? 'Locating...' : 'Locate Me'}
            </Text>
          </TouchableOpacity>

          {/* Map Actions */}
          <View style={styles.mapActions}>
            <TouchableOpacity 
              style={styles.mapCancelButton}
              onPress={() => setShowMapModal(false)}
            >
              <Text style={styles.mapCancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.mapDoneButton}
              onPress={handleLocationConfirm}
            >
              <Text style={styles.mapDoneButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
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
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1E293B',
  },
  placeholder: {
    width: 32,
  },
  content: {
    flex: 1,
  },
  stepContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    paddingBottom: 100, // Extra padding for submit button and keyboard
  },
  stepTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#1E293B',
    marginBottom: 8,
    textAlign: 'center',
  },
  stepSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 32,
  },
  optionsContainer: {
    gap: 16,
  },
  optionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  optionIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  optionTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1E293B',
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
    textAlign: 'center',
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    justifyContent: 'space-between',
  },
  categoryCard: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    width: '30%',
    alignItems: 'center',
    minHeight: 120,
    justifyContent: 'center',
  },
  selectedCategoryCard: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  categoryIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  selectedCategoryIcon: {
    backgroundColor: '#10B981',
  },
  categoryText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#64748B',
    textAlign: 'center',
  },
  selectedCategoryText: {
    color: '#FFFFFF',
  },
  formGroup: {
    backgroundColor: '#FFFFFF',
    marginBottom: 16,
    padding: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  label: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#1E293B',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#1E293B',
    backgroundColor: '#FFFFFF',
  },
  priceTypeContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  priceTypeButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
  },
  selectedPriceType: {
    backgroundColor: '#10B981',
  },
  priceTypeText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#64748B',
  },
  selectedPriceTypeText: {
    color: '#FFFFFF',
  },
  priceInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    marginBottom: 8,
  },
  currencyPrefix: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#10B981',
    paddingLeft: 12,
  },
  priceInput: {
    flex: 1,
    padding: 12,
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#1E293B',
  },
  pricingUnitBadgesContainer: {
    marginTop: 8,
  },
  pricingUnitBadgesContent: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: 20,
  },
  pricingUnitBadge: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  selectedPricingUnitBadge: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  pricingUnitBadgeText: {
    fontSize: 11,
    fontFamily: 'Inter-Medium',
    color: '#64748B',
  },
  selectedPricingUnitBadgeText: {
    color: '#FFFFFF',
  },
  durationContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  durationButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  selectedDuration: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  durationText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#64748B',
  },
  selectedDurationText: {
    color: '#FFFFFF',
  },
  // Location Display
  locationDisplayContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  locationDisplayText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#1E293B',
    marginLeft: 8,
    flex: 1,
  },

  // Location Action Buttons
  locationButtonsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  currentLocationButton: {
    flex: 1,
    backgroundColor: '#10B981',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  currentLocationButtonText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#FFFFFF',
  },
  pickLocationButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#10B981',
    alignItems: 'center',
  },
  pickLocationButtonText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#10B981',
  },
  imageHelperText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
    marginBottom: 12,
  },
  imageUploadContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
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
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#10B981',
  },
  singleImagePreviewContainer: {
    alignItems: 'center',
  },
  singleImagePreview: {
    position: 'relative',
    width: 120,
    height: 120,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#E2E8F0',
  },
  singleImagePreviewImage: {
    width: '100%',
    height: '100%',
  },
  removeImageButton: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageReplaceButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  replaceImageButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0FDF4',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#10B981',
    gap: 6,
  },
  replaceImageButtonText: {
    fontSize: 11,
    fontFamily: 'Inter-Medium',
    color: '#10B981',
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#1E293B',
    backgroundColor: '#FFFFFF',
    textAlignVertical: 'top',
    minHeight: 100,
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
    borderColor: '#10B981',
    backgroundColor: '#F0FDF4',
  },
  deliveryOptionText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#64748B',
  },
  selectedDeliveryOptionText: {
    color: '#10B981',
  },
  
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    padding: 16,
    borderRadius: 10,
    marginTop: 16,
    marginBottom: 20,
    gap: 8,
  },
  submitButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  submitButtonDisabled: {
    backgroundColor: '#94A3B8',
  },
  
  // Map Modal Styles
  mapModalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  
  // Green Header (like profile page)
  mapHeaderGreen: {
    backgroundColor: '#10B981',
    paddingTop: 48,
    paddingBottom: 16,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  mapTitleGreen: {
    color: '#FFFFFF',
    fontSize: 18,
    fontFamily: 'Inter-Bold',
  },
  mapSubtitleGreen: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    marginTop: 4,
  },
  
  mapView: {
    flex: 1,
  },
  
  // Map Actions
  mapActions: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  mapCancelButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  mapCancelButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#64748B',
  },
  mapDoneButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#10B981',
    alignItems: 'center',
  },
  mapDoneButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#FFFFFF',
  },
  
  myLocationButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: '#10B981',
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  
  locateMeFloatingButton: {
    position: 'absolute',
    top: 120,
    right: 16,
    backgroundColor: '#10B981',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 24,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    gap: 8,
  },
  locateMeFloatingText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: 'Inter-Medium',
  },
});
