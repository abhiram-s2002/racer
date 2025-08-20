import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Dimensions, Text, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Region } from 'react-native-maps';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useListings } from '@/hooks/useListings';
import { mockCategories } from '@/utils/mockData';
import LocationFilterModal from '@/components/LocationFilterModal';
import { withErrorBoundary } from '@/components/ErrorBoundary';
import MapHeader from '@/components/MapHeader';
import LoadMoreSection from '@/components/LoadMoreSection';
import ListingsInfoBox from '@/components/ListingsInfoBox';
import MapContainer from '@/components/MapContainer';
import ListingInfoCard from '@/components/ListingInfoCard';

const { width, height } = Dimensions.get('window');
const LATITUDE_DELTA = 0.01;
const LONGITUDE_DELTA = 0.01;

function MapViewScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // State
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showLocationFilterModal, setShowLocationFilterModal] = useState(false);
  const [showListView, setShowListView] = useState(false);
  const [showBetaDisclaimer, setShowBetaDisclaimer] = useState(true);
  const [userLocation, setUserLocation] = useState<{latitude: number, longitude: number} | null>(null);
  const [region, setRegion] = useState<Region>({
    latitude: 37.78825,
    longitude: -122.4324,
    latitudeDelta: LATITUDE_DELTA,
    longitudeDelta: LONGITUDE_DELTA,
  });
  const [visibleListings, setVisibleListings] = useState<any[]>([]);
  const [selectedListing, setSelectedListing] = useState<any>(null);
  const [mapError, setMapError] = useState<string | null>(null);

  
  // Use the existing listings hook
  const { 
    listings, 
    loading, 
    loadMoreListings,
    hasMore: hookHasMore,
    maxDistance,
    setDistanceFilter,
    updateLocation
  } = useListings();

  // Filter listings based on category and update visible listings
  useEffect(() => {
    if (listings && listings.length > 0) {
      const filtered = listings.filter((listing: any) => {
        if (selectedCategory === 'all') return true;
        return listing.category === selectedCategory;
      });
      
      setVisibleListings(filtered);
    } else {
      setVisibleListings([]);
    }
  }, [listings, selectedCategory]);





  // Check disclaimer status on mount
  useEffect(() => {
    const checkDisclaimerStatus = async () => {
      try {
        const disclaimerDismissed = await AsyncStorage.getItem('mapViewDisclaimerDismissed');
        if (disclaimerDismissed === 'true') {
          setShowBetaDisclaimer(false);
        }
      } catch (error) {
        console.error('Error checking disclaimer status:', error);
      }
    };
    checkDisclaimerStatus();
  }, []);

  const handleLoadMore = () => {
    if (hookHasMore) {
      // Use the hook's loadMoreListings to fetch more from API
      loadMoreListings();
    }
  };

  const handleSelectCategory = (categoryId: string) => {
    setSelectedCategory(categoryId);
  };

  const handleSetDistanceFilter = (distance: number | null) => {
    setDistanceFilter(distance);
    setShowLocationFilterModal(false);
  };

  const handleMarkerPress = (listing: any) => {
    setSelectedListing(listing);
  };

  const handleCloseListing = () => {
    setSelectedListing(null);
  };

  const handleViewListing = () => {
    if (selectedListing) {
      // Navigate to home screen and open ping modal for this listing
      router.replace({ pathname: '/', params: { pingListingId: selectedListing.id } });
    }
  };

  const handlePingListing = () => {
    if (selectedListing) {
      // Navigate to home screen and open ping modal for this listing
      router.replace({ pathname: '/', params: { pingListingId: selectedListing.id } });
    }
  };



  const handleLocationUpdate = (latitude: number, longitude: number) => {
    setUserLocation({ latitude, longitude });
    
    // Update the region to center on user's location
    setRegion({
      latitude,
      longitude,
      latitudeDelta: LATITUDE_DELTA,
      longitudeDelta: LONGITUDE_DELTA,
    });
    
    // Also update location in the listings hook for distance calculations
    updateLocation();
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <MapHeader
        onLocationFilter={() => setShowLocationFilterModal(true)}
        onListView={() => setShowListView(true)}
      />

      {/* Load More Section - Always Visible */}
      <LoadMoreSection
        currentListings={visibleListings.length}
        totalListings={listings.length}
        onLoadMore={handleLoadMore}
        hasMore={hookHasMore}
      />

      {/* Beta Disclaimer - Closeable */}
      {showBetaDisclaimer && (
        <ListingsInfoBox
          onCloseDisclaimer={async () => {
            try {
              await AsyncStorage.setItem('mapViewDisclaimerDismissed', 'true');
              setShowBetaDisclaimer(false);
            } catch (error) {
              console.error('Error saving disclaimer status:', error);
              setShowBetaDisclaimer(false);
            }
          }}
        />
      )}

      {/* Map */}
      {mapError ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Map Error: {mapError}</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={() => setMapError(null)}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <MapContainer
          loading={loading}
          visibleListings={visibleListings}
          userLocation={userLocation}
          region={region}

          onMarkerPress={handleMarkerPress}
          onLocationUpdate={handleLocationUpdate}
        />
      )}

      {/* Selected listing info */}
      <ListingInfoCard
        listing={selectedListing}
        onViewDetails={handleViewListing}
        onPingSeller={handlePingListing}
        onClose={handleCloseListing}
      />

      {/* Combined Location & Category Filter Modal */}
      <LocationFilterModal
        visible={showLocationFilterModal}
        onClose={() => setShowLocationFilterModal(false)}
        onSelectDistance={handleSetDistanceFilter}
        onSelectCategory={handleSelectCategory}
        selectedDistance={maxDistance}
        selectedCategory={selectedCategory}
      />

      {/* List View Modal */}
      <Modal
        visible={showListView}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowListView(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Current Listings ({visibleListings.length})</Text>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setShowListView(false)}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalContent}>
            {visibleListings.map((listing) => (
              <TouchableOpacity
                key={listing.id}
                style={styles.listingItem}
                onPress={() => {
                  setSelectedListing(listing);
                  setShowListView(false);
                }}
              >
                <Text style={styles.listingTitle}>{listing.title}</Text>
                <Text style={styles.listingPrice}>${listing.price}</Text>
                <Text style={styles.listingCategory}>
                  {mockCategories.find(c => c.id === listing.category)?.name || listing.category}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#EF4444',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#22C55E',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#1E293B',
  },
  closeButton: {
    padding: 4,
  },
  closeButtonText: {
    fontSize: 18,
    fontFamily: 'Inter-Medium',
    color: '#64748B',
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  listingItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  listingTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1E293B',
    marginBottom: 4,
  },
  listingPrice: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#22C55E',
    marginBottom: 4,
  },
  listingCategory: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#64748B',
  },
});

export default withErrorBoundary(MapViewScreen);
