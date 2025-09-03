import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, MapPin, Navigation } from 'lucide-react-native';
import MapView, { Marker } from 'react-native-maps';
import { RequestLocationUtils, LocationData } from '@/utils/requestLocationUtils';

interface RequestLocationPickerProps {
  visible: boolean;
  onClose: () => void;
  onLocationSelect: (locationData: LocationData) => void;
  initialLocation?: Partial<LocationData>;
}

export function RequestLocationPicker({ 
  visible, 
  onClose, 
  onLocationSelect,
  initialLocation 
}: RequestLocationPickerProps) {
  const [location, setLocation] = useState(initialLocation?.formatted_address || '');
  const [selectedCoords, setSelectedCoords] = useState<{latitude: number, longitude: number} | null>(
    initialLocation?.coordinates || null
  );
  const [gpsLoading, setGpsLoading] = useState(false);
  const [mapModalVisible, setMapModalVisible] = useState(false);
  const mapRef = useRef<MapView>(null);

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

  const setLocationFromCoords = async (coords: { latitude: number, longitude: number }) => {
    try {
      const addressData = await RequestLocationUtils.getAddressFromCoordinates(
        coords.latitude,
        coords.longitude
      );
      
      const locationData: LocationData = {
        coordinates: coords,
        ...addressData,
        timestamp: Date.now(),
      };

      setLocation(locationData.formatted_address || '');
      setSelectedCoords(coords);
    } catch (error) {
      console.error('Error in setLocationFromCoords:', error);
      const fallbackAddress = `${coords.latitude.toFixed(6)}, ${coords.longitude.toFixed(6)}`;
      setLocation(fallbackAddress);
      setSelectedCoords(coords);
    }
  };

  const handleLocationTextChange = (text: string) => {
    setLocation(text);
    // Parse the text to get hierarchical data
    const parsed = RequestLocationUtils.parseLocationText(text);
    if (parsed.formatted_address) {
      setLocation(parsed.formatted_address);
    }
  };

  const handleConfirm = () => {
    if (!location.trim()) {
      Alert.alert('Error', 'Please enter a location or use GPS to get your current location.');
      return;
    }

    // Create location data from current state
    const locationData: LocationData = {
      coordinates: selectedCoords || { latitude: 0, longitude: 0 },
      ...RequestLocationUtils.parseLocationText(location),
      formatted_address: location,
      timestamp: Date.now(),
    };

    onLocationSelect(locationData);
    onClose();
  };

  const handleClose = () => {
    setLocation(initialLocation?.formatted_address || '');
    setSelectedCoords(initialLocation?.coordinates || null);
    setMapModalVisible(false);
    setGpsLoading(false);
    onClose();
  };

  const locationStatus = RequestLocationUtils.getLocationStatus({
    coordinates: selectedCoords || undefined,
    formatted_address: location,
  });

  return (
    <>
      <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <X size={24} color="#64748B" />
            </TouchableOpacity>
            <Text style={styles.title}>Select Location</Text>
            <TouchableOpacity 
              onPress={handleConfirm} 
              style={[styles.confirmButton, !location.trim() && styles.confirmButtonDisabled]}
              disabled={!location.trim()}
            >
              <Text style={[styles.confirmButtonText, !location.trim() && styles.confirmButtonTextDisabled]}>
                Confirm
              </Text>
            </TouchableOpacity>
          </View>

          {/* Content */}
          <View style={styles.content}>
            {/* Location Status */}
            <View style={styles.statusContainer}>
              <View style={[styles.statusIndicator, { backgroundColor: locationStatus.color }]} />
              <Text style={styles.statusText}>{locationStatus.message}</Text>
            </View>

            {/* Location Input */}
            <View style={styles.section}>
              <Text style={styles.label}>Location</Text>
              <View style={styles.locationInput}>
                <MapPin size={16} color="#64748B" style={styles.locationIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="e.g., Mumbai, Maharashtra"
                  value={location}
                  onChangeText={handleLocationTextChange}
                  multiline
                />
              </View>
            </View>

            {/* Location Buttons */}
            <View style={styles.buttonsContainer}>
              <TouchableOpacity 
                style={[styles.locationButton, gpsLoading && styles.locationButtonDisabled]} 
                onPress={handleUseCurrentLocation}
                disabled={gpsLoading}
              >
                {gpsLoading ? (
                  <ActivityIndicator size="small" color="#22C55E" />
                ) : (
                  <Navigation size={16} color="#22C55E" />
                )}
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

            {/* Help Text */}
            <View style={styles.helpContainer}>
              <Text style={styles.helpText}>
                💡 Setting your location helps others find your requests nearby and improves visibility
              </Text>
            </View>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Map Modal */}
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
            onPress={(e: { nativeEvent: { coordinate: { latitude: number, longitude: number } } }) => 
              setSelectedCoords(e.nativeEvent.coordinate)
            }
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
    </>
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
  confirmButton: {
    backgroundColor: '#22C55E',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  confirmButtonDisabled: {
    backgroundColor: '#94A3B8',
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  confirmButtonTextDisabled: {
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 12,
  },
  statusText: {
    fontSize: 14,
    color: '#64748B',
    flex: 1,
  },
  section: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 8,
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
  locationIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#1E293B',
    minHeight: 20,
  },
  buttonsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  locationButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
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
    marginLeft: 8,
  },
  locationButtonTextDisabled: {
    color: '#94A3B8',
  },
  helpContainer: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#0EA5E9',
  },
  helpText: {
    fontSize: 14,
    color: '#0369A1',
    lineHeight: 20,
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
