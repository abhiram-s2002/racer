/* global console */
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { 
  X, 
  MapPin, 
  DollarSign, 
  Clock, 
  Star, 
  Navigation,
  Settings,
  RefreshCw
} from 'lucide-react-native';
import { SortOption } from '@/utils/locationUtils';

interface LocationSortingModalProps {
  visible: boolean;
  onClose: () => void;
  currentSortOption: SortOption;
  onSortOptionChange: (option: SortOption) => void;
  distanceFilter: number | null;
  onDistanceFilterChange: (distance: number | null) => void;
  userLocation: any;
  onRequestLocation: () => Promise<void>;
  isLoading: boolean;
  permissionStatus: 'granted' | 'denied' | 'undetermined';
}

const sortOptions = [
  {
    id: 'relevance' as SortOption,
    title: 'Most Relevant',
    description: 'Best matches based on distance and recency',
    icon: Star,
  },
  {
    id: 'distance_asc' as SortOption,
    title: 'Nearest First',
    description: 'Closest items to your location',
    icon: MapPin,
  },
  {
    id: 'distance_desc' as SortOption,
    title: 'Farthest First',
    description: 'Items farthest from your location',
    icon: Navigation,
  },
  {
    id: 'price_asc' as SortOption,
    title: 'Price: Low to High',
    description: 'Cheapest items first',
    icon: DollarSign,
  },
  {
    id: 'price_desc' as SortOption,
    title: 'Price: High to Low',
    description: 'Most expensive items first',
    icon: DollarSign,
  },
  {
    id: 'date_newest' as SortOption,
    title: 'Newest First',
    description: 'Recently added items',
    icon: Clock,
  },
  {
    id: 'date_oldest' as SortOption,
    title: 'Oldest First',
    description: 'Items added first',
    icon: Clock,
  },
];

const distanceOptions = [
  { value: 1, label: 'Within 1 km' },
  { value: 5, label: 'Within 5 km' },
  { value: 10, label: 'Within 10 km' },
  { value: 25, label: 'Within 25 km' },
  { value: 50, label: 'Within 50 km' },
  { value: null, label: 'No distance limit' },
];

export default function LocationSortingModal({
  visible,
  onClose,
  currentSortOption,
  onSortOptionChange,
  distanceFilter,
  onDistanceFilterChange,
  userLocation,
  onRequestLocation,
  isLoading,
  permissionStatus,
}: LocationSortingModalProps) {
  const insets = useSafeAreaInsets();
  const [refreshingLocation, setRefreshingLocation] = useState(false);

  const handleLocationRequest = async () => {
    if (permissionStatus === 'denied') {
      Alert.alert(
        'Location Permission Required',
        'Please enable location access in your device settings to use location-based sorting.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => {
            // In a real app, you'd open device settings
          }},
        ]
      );
      return;
    }

    setRefreshingLocation(true);
    try {
      await onRequestLocation();
    } finally {
      setRefreshingLocation(false);
    }
  };

  const handleSortOptionSelect = (option: SortOption) => {
    onSortOptionChange(option);
    onClose();
  };

  const handleDistanceFilterSelect = (distance: number | null) => {
    onDistanceFilterChange(distance);
    onClose();
  };

  const getLocationStatusText = () => {
    if (isLoading || refreshingLocation) return 'Getting location...';
    if (permissionStatus === 'denied') return 'Location access denied';
    if (permissionStatus === 'undetermined') return 'Location permission not set';
    if (userLocation) return `Location: ${userLocation.city || 'Unknown'}`;
    return 'Location not available';
  };

  const getLocationStatusColor = () => {
    if (isLoading || refreshingLocation) return '#3B82F6';
    if (permissionStatus === 'denied') return '#EF4444';
    if (userLocation) return '#10B981';
    return '#F59E0B';
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Sort & Filter</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={24} color="#64748B" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Location Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MapPin size={20} color="#64748B" />
              <Text style={styles.sectionTitle}>Location</Text>
            </View>
            
            <View style={styles.locationCard}>
              <View style={styles.locationInfo}>
                <Text style={styles.locationStatus}>{getLocationStatusText()}</Text>
                <View style={[styles.statusIndicator, { backgroundColor: getLocationStatusColor() }]} />
              </View>
              
              <TouchableOpacity
                style={styles.locationButton}
                onPress={handleLocationRequest}
                disabled={isLoading || refreshingLocation}
              >
                {refreshingLocation ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <RefreshCw size={16} color="#FFFFFF" />
                )}
                <Text style={styles.locationButtonText}>
                  {refreshingLocation ? 'Updating...' : 'Update Location'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Sort Options Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Settings size={20} color="#64748B" />
              <Text style={styles.sectionTitle}>Sort By</Text>
            </View>
            
            {sortOptions.map((option) => {
              const IconComponent = option.icon;
              const isSelected = currentSortOption === option.id;
              
              return (
                <TouchableOpacity
                  key={option.id}
                  style={[styles.sortOption, isSelected && styles.selectedSortOption]}
                  onPress={() => handleSortOptionSelect(option.id)}
                >
                  <View style={styles.sortOptionContent}>
                    <IconComponent 
                      size={20} 
                      color={isSelected ? '#10B981' : '#64748B'} 
                    />
                    <View style={styles.sortOptionText}>
                      <Text style={[styles.sortOptionTitle, isSelected && styles.selectedText]}>
                        {option.title}
                      </Text>
                      <Text style={[styles.sortOptionDescription, isSelected && styles.selectedDescription]}>
                        {option.description}
                      </Text>
                    </View>
                  </View>
                  {isSelected && (
                    <View style={styles.selectedIndicator}>
                      <View style={styles.selectedDot} />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Distance Filter Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Navigation size={20} color="#64748B" />
              <Text style={styles.sectionTitle}>Distance Filter</Text>
            </View>
            
            {distanceOptions.map((option) => {
              const isSelected = distanceFilter === option.value;
              
              return (
                <TouchableOpacity
                  key={option.value ?? 'none'}
                  style={[styles.distanceOption, isSelected && styles.selectedDistanceOption]}
                  onPress={() => handleDistanceFilterSelect(option.value)}
                >
                  <Text style={[styles.distanceOptionText, isSelected && styles.selectedText]}>
                    {option.label}
                  </Text>
                  {isSelected && (
                    <View style={styles.selectedIndicator}>
                      <View style={styles.selectedDot} />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Info Section */}
          <View style={styles.infoSection}>
            <Text style={styles.infoText}>
              💡 Location-based sorting works best when you allow location access. 
              Your location is cached for 5 minutes to improve performance.
            </Text>
          </View>
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#1E293B',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginTop: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1E293B',
    marginLeft: 8,
  },
  locationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  locationStatus: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#64748B',
    flex: 1,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  locationButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#FFFFFF',
    marginLeft: 6,
  },
  sortOption: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  selectedSortOption: {
    borderColor: '#10B981',
    backgroundColor: '#F0FDF4',
  },
  sortOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sortOptionText: {
    marginLeft: 12,
    flex: 1,
  },
  sortOptionTitle: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#1E293B',
    marginBottom: 2,
  },
  sortOptionDescription: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
  },
  selectedText: {
    color: '#10B981',
  },
  selectedDescription: {
    color: '#10B981',
  },
  selectedIndicator: {
    marginLeft: 8,
  },
  selectedDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  distanceOption: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectedDistanceOption: {
    borderColor: '#10B981',
    backgroundColor: '#F0FDF4',
  },
  distanceOptionText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#1E293B',
  },
  infoSection: {
    marginTop: 32,
    marginBottom: 40,
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  infoText: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#92400E',
    lineHeight: 18,
  },
}); 