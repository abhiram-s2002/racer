import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, MapPin, Navigation, Calendar } from 'lucide-react-native';
import { Request, RequestCategory } from '@/utils/types';
import { requestCategories } from '@/utils/requestCategories';
import { validateListingTitle, validateListingDescription, validatePrice } from '@/utils/validation';
import { RequestLocationUtils, LocationData } from '@/utils/requestLocationUtils';
import * as Location from 'expo-location';
import MapView, { Marker } from 'react-native-maps';

interface CreateRequestModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (requestData: Partial<Request>) => void;
}

export function CreateRequestModal({ visible, onClose, onSubmit }: CreateRequestModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [budgetMin, setBudgetMin] = useState('');
  const [budgetMax, setBudgetMax] = useState('');
  const [budgetType, setBudgetType] = useState<'fixed' | 'range'>('fixed');
  const [selectedCategory, setSelectedCategory] = useState<RequestCategory | null>(null);

  const [location, setLocation] = useState('');
  const [expiration, setExpiration] = useState<string>('1d'); // Default to 1 day
  const [loading, setLoading] = useState(false);
  
  // Enhanced location picker states
  const [mapModalVisible, setMapModalVisible] = useState(false);
  const [selectedCoords, setSelectedCoords] = useState<{latitude: number, longitude: number} | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [locationData, setLocationData] = useState<LocationData | null>(null);
  const mapRef = useRef<MapView>(null);

  // Expiration options
  const expirationOptions = [
    { value: '12h', label: '12 Hours', hours: 12 },
    { value: '1d', label: '1 Day', hours: 24 },
    { value: '3d', label: '3 Days', hours: 72 },
    { value: '1w', label: '1 Week', hours: 168 },
    { value: '1m', label: '1 Month', hours: 720 },
  ];

  // Calculate expiration timestamp
  const calculateExpirationTime = (expirationValue: string): string => {
    const option = expirationOptions.find(opt => opt.value === expirationValue);
    if (!option) return new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // Default to 1 day
    
    const expirationTime = new Date(Date.now() + option.hours * 60 * 60 * 1000);
    return expirationTime.toISOString();
  };

  // Enhanced location picker functions using RequestLocationUtils
  const setLocationFromCoords = async (coords: { latitude: number, longitude: number }) => {
    try {
      const addressData = await RequestLocationUtils.getAddressFromCoordinates(
        coords.latitude,
        coords.longitude
      );
      
      const newLocationData: LocationData = {
        coordinates: coords,
        formatted_address: addressData.formatted_address || `${coords.latitude.toFixed(6)}, ${coords.longitude.toFixed(6)}`,
        location_name: addressData.location_name,
        location_district: addressData.location_district,
        location_state: addressData.location_state,
        timestamp: Date.now(),
      };
      
      setLocationData(newLocationData);
      setLocation(newLocationData.formatted_address || '');
    } catch (error) {
      console.error('Error in setLocationFromCoords:', error);
      // Fallback to coordinates if reverse geocoding fails
      const fallbackAddress = `${coords.latitude.toFixed(6)}, ${coords.longitude.toFixed(6)}`;
      setLocation(fallbackAddress);
      setLocationData({
        coordinates: coords,
        formatted_address: fallbackAddress,
        timestamp: Date.now(),
      });
    }
  };

  const handleUseCurrentLocation = async () => {
    setGpsLoading(true);
    try {
      const result = await RequestLocationUtils.getCurrentLocation();
      
      if (!result.success || !result.data) {
        Alert.alert(
          'Location Error',
          result.error || 'Unable to get your current location. Please try again.',
          [
            { text: 'OK', style: 'default' },
            { text: 'Retry', onPress: handleUseCurrentLocation }
          ]
        );
        return;
      }

      const locationData = result.data;
      setLocationData(locationData);
      setLocation(locationData.formatted_address || '');
      setSelectedCoords(locationData.coordinates);
      
      // Center map on current location
      if (mapRef.current) {
        mapRef.current.animateToRegion({
          latitude: locationData.coordinates.latitude,
          longitude: locationData.coordinates.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        });
      }
    } catch (error) {
      console.error('Error getting current location:', error);
      Alert.alert(
        'Location Error',
        'Unable to get your current location. Please try again or select a location manually.',
        [
          { text: 'OK', style: 'default' },
          { text: 'Retry', onPress: handleUseCurrentLocation }
        ]
      );
    } finally {
      setGpsLoading(false);
    }
  };

  const handleSubmit = async () => {
    // Validate inputs
    const titleValidation = validateListingTitle(title);
    if (!titleValidation.isValid) {
      Alert.alert('Error', titleValidation.error || 'Invalid title');
      return;
    }

    // Description is now optional, only validate if provided
    let descriptionValidation = { isValid: true, sanitizedValue: description };
    if (description.trim()) {
      const validation = validateListingDescription(description);
      if (!validation.isValid) {
        Alert.alert('Error', validation.error || 'Invalid description');
        return;
      }
      descriptionValidation = { isValid: true, sanitizedValue: validation.sanitizedValue || description };
    }

    if (!selectedCategory) {
      Alert.alert('Error', 'Please select a category');
      return;
    }

    // Validate expiration is selected
    if (!expiration) {
      Alert.alert('Error', 'Please select an expiration time for your request');
      return;
    }

    // Validate location is provided
    if (!location || !location.trim()) {
      Alert.alert('Error', 'Please set a location using GPS or map selection');
      return;
    }

    if (budgetMin && !validatePrice(budgetMin).isValid) {
      Alert.alert('Error', 'Invalid minimum budget');
      return;
    }

    if (budgetMax && !validatePrice(budgetMax).isValid) {
      Alert.alert('Error', 'Invalid maximum budget');
      return;
    }

    setLoading(true);
    try {
      // Get hierarchical location data
      const locationHierarchy = locationData 
        ? RequestLocationUtils.getLocationHierarchy(locationData)
        : location 
          ? RequestLocationUtils.getLocationHierarchy(RequestLocationUtils.parseLocationText(location))
          : {};

      const requestData: Partial<Request> = {
        title: titleValidation.sanitizedValue,
        description: descriptionValidation.sanitizedValue || undefined,
        budget_min: budgetType === 'fixed' && budgetMin ? parseFloat(budgetMin) : (budgetMin ? parseFloat(budgetMin) : undefined),
        budget_max: budgetType === 'fixed' && budgetMin ? parseFloat(budgetMin) : (budgetMax ? parseFloat(budgetMax) : undefined),
        category: selectedCategory,

        expires_at: calculateExpirationTime(expiration),
        ...locationHierarchy,
      };

      await onSubmit(requestData);
      handleClose();
    } catch (error) {
      Alert.alert('Error', 'Failed to create request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setTitle('');
    setDescription('');
    setBudgetMin('');
    setBudgetMax('');
    setBudgetType('fixed');
    setSelectedCategory(null);

    setLocation('');
    setExpiration('1d');
    setMapModalVisible(false);
    setSelectedCoords(null);
    setGpsLoading(false);
    setLocationData(null);
    onClose();
  };

  const renderCategoryItem = (category: typeof requestCategories[0]) => {
    const IconComponent = category.icon;
    const isSelected = selectedCategory === category.id;

    return (
      <TouchableOpacity
        key={category.id}
        style={[styles.categoryItem, isSelected && styles.categoryItemSelected]}
        onPress={() => setSelectedCategory(category.id as RequestCategory)}
      >
        <View style={[styles.categoryIcon, { backgroundColor: category.color + '20' }]}>
          <IconComponent size={24} color={category.color} />
        </View>
        <View style={styles.categoryInfo}>
          <Text style={[styles.categoryName, isSelected && styles.categoryNameSelected]}>
            {category.name}
          </Text>
          <Text style={[styles.categoryDescription, isSelected && styles.categoryDescriptionSelected]}>
            {category.description}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };



  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView 
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <X size={24} color="#64748B" />
            </TouchableOpacity>
            <Text style={styles.title}>Create Request</Text>
            <TouchableOpacity 
              onPress={handleSubmit} 
              style={[styles.submitButton, loading && styles.submitButtonDisabled]}
              disabled={loading}
            >
              <Text style={[styles.submitButtonText, loading && styles.submitButtonTextDisabled]}>
                {loading ? 'Creating...' : 'Create'}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Title */}
            <View style={styles.section}>
              <Text style={styles.label}>What do you need? *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Need a cameraman for party"
                value={title}
                onChangeText={setTitle}
                maxLength={100}
              />
            </View>

            {/* Description */}
            <View style={styles.section}>
              <Text style={styles.label}>Description (Optional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Provide more details about your request..."
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={4}
                maxLength={1000}
              />
            </View>

            {/* Budget */}
            <View style={styles.section}>
              <Text style={styles.label}>Budget (Optional)</Text>
              
              {/* Budget Type Selection */}
              <View style={styles.budgetTypeContainer}>
                <TouchableOpacity
                  style={[styles.budgetTypeOption, budgetType === 'fixed' && styles.budgetTypeSelected]}
                  onPress={() => setBudgetType('fixed')}
                >
                  <Text style={[styles.budgetTypeText, budgetType === 'fixed' && styles.budgetTypeTextSelected]}>
                    Fixed Amount
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.budgetTypeOption, budgetType === 'range' && styles.budgetTypeSelected]}
                  onPress={() => setBudgetType('range')}
                >
                  <Text style={[styles.budgetTypeText, budgetType === 'range' && styles.budgetTypeTextSelected]}>
                    Range
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Budget Input */}
              {budgetType === 'fixed' ? (
                <View style={styles.budgetInput}>
                  <Text style={styles.currencySymbol}>₹</Text>
                  <TextInput
                    style={styles.budgetTextInput}
                    placeholder="Enter amount"
                    value={budgetMin}
                    onChangeText={setBudgetMin}
                    keyboardType="numeric"
                  />
                </View>
              ) : (
                <View style={styles.budgetRow}>
                  <View style={styles.budgetInput}>
                    <Text style={styles.currencySymbol}>₹</Text>
                    <TextInput
                      style={styles.budgetTextInput}
                      placeholder="Min"
                      value={budgetMin}
                      onChangeText={setBudgetMin}
                      keyboardType="numeric"
                    />
                  </View>
                  <Text style={styles.budgetSeparator}>to</Text>
                  <View style={styles.budgetInput}>
                    <Text style={styles.currencySymbol}>₹</Text>
                    <TextInput
                      style={styles.budgetTextInput}
                      placeholder="Max"
                      value={budgetMax}
                      onChangeText={setBudgetMax}
                      keyboardType="numeric"
                    />
                  </View>
                </View>
              )}
            </View>



            {/* Expiration */}
            <View style={styles.section}>
              <Text style={styles.label}>Request Expires In *</Text>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                style={styles.expirationScrollView}
                contentContainerStyle={styles.expirationScrollContent}
              >
                {expirationOptions.map((option) => {
                  const isSelected = expiration === option.value;
                  return (
                    <TouchableOpacity
                      key={option.value}
                      style={[styles.expirationOption, isSelected && styles.expirationOptionSelected]}
                      onPress={() => setExpiration(option.value)}
                    >
                      <View style={styles.expirationOptionContent}>
                        <Calendar size={16} color={isSelected ? '#22C55E' : '#64748B'} />
                        <Text style={[styles.expirationLabel, isSelected && styles.expirationLabelSelected]}>
                          {option.label}
                        </Text>
                      </View>
                      {isSelected && (
                        <View style={styles.expirationCheckmark}>
                          <Text style={styles.expirationCheckmarkText}>✓</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
              <Text style={styles.expirationNote}>
                Request will be automatically deleted after expiration
              </Text>
            </View>

            {/* Location */}
            <View style={styles.section}>
              <Text style={styles.label}>Location *</Text>
              
              {/* Location Status */}
              {locationData && (
                <View style={styles.locationStatusContainer}>
                  <View style={[styles.locationStatusIndicator, { backgroundColor: '#22C55E' }]} />
                  <Text style={styles.locationStatusText}>
                    {RequestLocationUtils.formatLocationForDisplay(locationData)}
                  </Text>
                </View>
              )}
              
              <View style={styles.locationInput}>
                <MapPin size={16} color="#64748B" style={styles.locationIcon} />
                <TextInput
                  style={[styles.input, styles.locationInputReadonly]}
                  placeholder="Use GPS or Pick on Map to set location"
                  value={location}
                  editable={false}
                  pointerEvents="none"
                />
              </View>
              <View style={styles.locationButtons}>
                <TouchableOpacity 
                  style={[styles.locationButton, gpsLoading && styles.locationButtonDisabled]} 
                  onPress={handleUseCurrentLocation}
                  disabled={gpsLoading}
                >
                  <Navigation size={16} color={gpsLoading ? "#94A3B8" : "#22C55E"} />
                  <Text style={[styles.locationButtonText, gpsLoading && styles.locationButtonTextDisabled]}>
                    {gpsLoading ? 'Getting...' : 'Use GPS'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.locationButton} 
                  onPress={() => setMapModalVisible(true)}
                >
                  <MapPin size={16} color="#3B82F6" />
                  <Text style={styles.locationButtonText}>Pick on Map</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Category */}
            <View style={styles.section}>
              <Text style={styles.label}>Category *</Text>
              <View style={styles.categoriesContainer}>
                {requestCategories.map(renderCategoryItem)}
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* Map Modal for Location Selection */}
      <Modal
        visible={mapModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
          <View style={styles.mapHeader}>
            <TouchableOpacity onPress={() => setMapModalVisible(false)}>
              <X size={24} color="#1E293B" />
            </TouchableOpacity>
            <Text style={styles.mapTitle}>Select Location</Text>
            <TouchableOpacity 
              onPress={async () => {
                if (selectedCoords) {
                  await setLocationFromCoords(selectedCoords);
                }
                setMapModalVisible(false);
              }}
              style={styles.mapDoneButton}
            >
              <Text style={styles.mapDoneText}>Done</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.mapInstructions}>
            <Text style={styles.mapInstructionsText}>
              Tap anywhere on the map to choose a spot
            </Text>
          </View>
          <MapView
            ref={mapRef}
            style={{ flex: 1 }}
            initialRegion={{
              latitude: selectedCoords ? selectedCoords.latitude : 37.7749,
              longitude: selectedCoords ? selectedCoords.longitude : -122.4194,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            }}
            onPress={(e: { nativeEvent: { coordinate: { latitude: number, longitude: number } } }) => setSelectedCoords(e.nativeEvent.coordinate)}
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
        </SafeAreaView>
      </Modal>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  closeButton: {
    padding: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
  },
  submitButton: {
    backgroundColor: '#22C55E',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  submitButtonDisabled: {
    backgroundColor: '#94A3B8',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  submitButtonTextDisabled: {
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginTop: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1E293B',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  categoriesContainer: {
    gap: 12,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 16,
  },
  categoryItemSelected: {
    borderColor: '#22C55E',
    backgroundColor: '#F0FDF4',
  },
  categoryIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 4,
  },
  categoryNameSelected: {
    color: '#22C55E',
  },
  categoryDescription: {
    fontSize: 14,
    color: '#64748B',
  },
  categoryDescriptionSelected: {
    color: '#16A34A',
  },
  budgetTypeContainer: {
    flexDirection: 'row',
    marginBottom: 12,
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    padding: 4,
  },
  budgetTypeOption: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  budgetTypeSelected: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  budgetTypeText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748B',
  },
  budgetTypeTextSelected: {
    color: '#22C55E',
    fontWeight: '600',
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
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  currencySymbol: {
    fontSize: 16,
    color: '#64748B',
    marginRight: 8,
    fontWeight: '500',
  },
  budgetTextInput: {
    flex: 1,
    fontSize: 16,
    color: '#1E293B',
  },
  budgetSeparator: {
    fontSize: 16,
    color: '#64748B',
    fontWeight: '500',
  },

  expirationScrollView: {
    marginBottom: 8,
  },
  expirationScrollContent: {
    paddingRight: 20,
    gap: 12,
  },
  expirationOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 16,
    minWidth: 140,
  },
  expirationOptionSelected: {
    borderColor: '#22C55E',
    backgroundColor: '#F0FDF4',
  },
  expirationOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  expirationLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1E293B',
    marginLeft: 12,
  },
  expirationLabelSelected: {
    color: '#22C55E',
    fontWeight: '600',
  },
  expirationCheckmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#22C55E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  expirationCheckmarkText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  expirationNote: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 8,
    fontStyle: 'italic',
  },
  locationInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  locationInputReadonly: {
    backgroundColor: '#F8FAFC',
    color: '#64748B',
  },
  locationIcon: {
    marginRight: 12,
  },
  locationButtons: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 8,
  },
  locationButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  locationButtonDisabled: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
  },
  locationButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginLeft: 6,
  },
  locationButtonTextDisabled: {
    color: '#94A3B8',
  },
  locationStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#22C55E',
  },
  locationStatusIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 8,
  },
  locationStatusText: {
    fontSize: 14,
    color: '#16A34A',
    flex: 1,
  },
  mapHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  mapTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
  },
  mapDoneButton: {
    backgroundColor: '#22C55E',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  mapDoneText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  mapInstructions: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F8FAFC',
  },
  mapInstructionsText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
  },
  myLocationButton: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    backgroundColor: '#22C55E',
    borderRadius: 24,
    padding: 14,
    zIndex: 20,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
