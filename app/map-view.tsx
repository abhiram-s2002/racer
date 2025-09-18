import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Dimensions, Text, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Region } from 'react-native-maps';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useListings } from '@/hooks/useListings';
import { supabase } from '@/utils/supabaseClient';
// Categories moved to inline definition for better performance
const categories = [
  { id: 'all', name: 'All Categories' },
  { id: 'groceries', name: 'Groceries' },
  { id: 'fruits', name: 'Fruits' },
  { id: 'food', name: 'Food' },
  { id: 'services', name: 'Services' },
  { id: 'art', name: 'Art' },
  { id: 'rental', name: 'Rental' },
  { id: 'vehicles', name: 'Vehicles' },
  { id: 'others', name: 'Others' },
];
import LocationFilterModal from '@/components/LocationFilterModal';
import { withErrorBoundary } from '@/components/ErrorBoundary';
import MapHeader from '@/components/MapHeader';
import LoadMoreSection from '@/components/LoadMoreSection';
import ListingsInfoBox from '@/components/ListingsInfoBox';
import MapContainer from '@/components/MapContainer';
import MapPinPopup from '@/components/MapPinPopup';
import { isUserVerified } from '@/utils/verificationUtils';

const { width, height } = Dimensions.get('window');
const LATITUDE_DELTA = 0.01;
const LONGITUDE_DELTA = 0.01;

function MapViewScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // State
  const [selectedCategory, setSelectedCategory] = useState<string[]>([]);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
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
  const [showPinPopup, setShowPinPopup] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [sellerInfoMap, setSellerInfoMap] = useState<Record<string, any>>({});

  
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

  // Load seller info for all listings
  useEffect(() => {
    async function loadSellerInfo() {
      const uniqueSellerUsernames = Array.from(new Set(listings.map(l => l.username)));
      if (uniqueSellerUsernames.length === 0) {
        setSellerInfoMap({});
        return;
      }
      
      // Check if we already have all the seller info we need
      const missingUsernames = uniqueSellerUsernames.filter(username => !sellerInfoMap[username]);
      if (missingUsernames.length === 0) {
        return; // Already have all the data we need
      }
      
      try {
        const { data: sellerData, error } = await supabase
          .from('users')
          .select('username, name, avatar_url, location_display, verification_status, verified_at, expires_at')
          .in('username', missingUsernames);
        
        if (error) {
          console.error('Error loading seller info:', error);
          return;
        }
        
        // Update seller info map with new data
        setSellerInfoMap(prev => {
          const newMap = { ...prev };
          sellerData?.forEach(seller => {
            newMap[seller.username] = seller;
          });
          return newMap;
        });
      } catch (error) {
        console.error('Error loading seller info:', error);
      }
    }
    
    if (listings.length > 0) {
      loadSellerInfo();
    }
  }, [listings]);

  // Filter listings based on category and verified sellers filter
  useEffect(() => {
    if (listings && listings.length > 0) {
      const filtered = listings.filter((listing: any) => {
        // Category filter
        if (selectedCategory.length > 0 && !selectedCategory.includes(listing.category)) {
          return false;
        }
        
        // Verified sellers filter
        if (verifiedOnly) {
          const seller = sellerInfoMap[listing.username];
          if (!seller || !isUserVerified(seller)) {
            return false;
          }
        }
        
        return true;
      });
      
      // Ensure no duplicate IDs in visible listings
      const uniqueFiltered = filtered.filter((listing: any, index: number, arr: any[]) => 
        arr.findIndex(l => l.id === listing.id) === index
      );
      
      setVisibleListings(uniqueFiltered);
    } else {
      setVisibleListings([]);
    }
  }, [listings, selectedCategory, verifiedOnly, sellerInfoMap]);





  // Check disclaimer status on mount
  useEffect(() => {
    const checkDisclaimerStatus = async () => {
      try {
        const disclaimerDismissed = await AsyncStorage.getItem('mapViewDisclaimerDismissed');
        if (disclaimerDismissed === 'true') {
          setShowBetaDisclaimer(false);
        }
      } catch (error) {
        // Error checking disclaimer status
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

  const handleSelectCategory = (categories: string[]) => {
    setSelectedCategory(categories);
  };

  const handleSetDistanceFilter = (distance: number | null) => {
    setDistanceFilter(distance);
    setShowLocationFilterModal(false);
  };

  const handleSelectVerifiedOnly = (verifiedOnly: boolean) => {
    setVerifiedOnly(verifiedOnly);
  };

  const handleMarkerPress = (listing: any) => {
    setSelectedListing(listing);
    setShowPinPopup(true);
  };

  const handleCloseListing = () => {
    setSelectedListing(null);
  };

  const handleClosePinPopup = () => {
    setShowPinPopup(false);
    setSelectedListing(null);
  };

  const handlePingFromPopup = () => {
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

      {/* Floating Load More Button */}
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
              // Error saving disclaimer status
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

      {/* Overlay to handle map taps and close popup */}
      {showPinPopup && (
        <TouchableOpacity
          style={styles.mapOverlay}
          activeOpacity={1}
          onPress={handleClosePinPopup}
        />
      )}

      {/* Map Pin Popup */}
      <MapPinPopup
        listing={selectedListing}
        visible={showPinPopup}
        onClose={handleClosePinPopup}
        onPing={handlePingFromPopup}
      />



      {/* Combined Location & Category Filter Modal */}
      <LocationFilterModal
        visible={showLocationFilterModal}
        onClose={() => setShowLocationFilterModal(false)}
        onSelectDistance={handleSetDistanceFilter}
        onSelectCategory={handleSelectCategory}
        onSelectVerifiedOnly={handleSelectVerifiedOnly}
        selectedDistance={maxDistance}
        selectedCategory={selectedCategory}
        selectedVerifiedOnly={verifiedOnly}
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
            <Text style={styles.modalTitle}>
              Current Listings ({visibleListings.length})
              {selectedCategory.length > 0 && (
                <Text style={styles.categorySubtitle}>
                  {'\n'}Categories: {selectedCategory.map(cat => 
                    categories.find(c => c.id === cat)?.name || cat
                  ).join(', ')}
                </Text>
              )}
            </Text>
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
                  {categories.find(c => c.id === listing.category)?.name || listing.category}
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
    backgroundColor: '#10B981',
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
  categorySubtitle: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
    marginTop: 4,
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
    color: '#10B981',
    marginBottom: 4,
  },
  listingCategory: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#64748B',
  },
  mapOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    zIndex: 1,
  },
});

export default withErrorBoundary(MapViewScreen);
