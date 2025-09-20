import React, { useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator, Text } from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT, Region } from 'react-native-maps';
import * as Location from 'expo-location';
import { withErrorBoundary } from '@/components/ErrorBoundary';
import { getCategoryIcon } from '@/utils/categoryIcons';

interface MapContainerProps {
  loading: boolean;
  visibleListings: any[];
  userLocation: {latitude: number, longitude: number} | null;
  region: Region;
  onMarkerPress: (listing: any) => void;
  onLocationUpdate: (latitude: number, longitude: number) => void;
}



function MapContainer({
  loading,
  visibleListings,
  userLocation,
  region,
  onMarkerPress,
  onLocationUpdate
}: MapContainerProps) {
  // Get user location on mount
  useEffect(() => {
    getUserLocation();
  }, []);

  const getUserLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        return;
      }
      
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      
      const { latitude, longitude } = location.coords;
      onLocationUpdate(latitude, longitude);
      
    } catch (error) {
      // Error getting user location
    }
  };

  if (loading && !visibleListings.length) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#10B981" />
        <Text style={styles.loadingText}>Loading map data...</Text>
      </View>
    );
  }




  return (
    <MapView
      style={styles.map}
      provider={PROVIDER_DEFAULT}
      region={region}
      showsUserLocation
      showsMyLocationButton
    >
      {/* User location marker */}
      {userLocation && (
        <Marker
          coordinate={{
            latitude: userLocation.latitude,
            longitude: userLocation.longitude,
          }}
          pinColor="red"
          title="Your Location"
        />
      )}

      {/* Listing markers - only show items with valid coordinates */}
      {visibleListings
        .filter(listing => listing.latitude && listing.longitude)
        .map((listing) => {
          const IconComponent = getCategoryIcon(listing.category);
          const isRequest = listing.item_type === 'request';
          const backgroundColor = isRequest ? '#9333EA' : '#3B82F6';
          
          return (
            <Marker
              key={listing.id}
              coordinate={{
                latitude: listing.latitude,
                longitude: listing.longitude,
              }}
              title={listing.title}
              description={`₹${listing.price} · ${listing.category} · ${isRequest ? 'REQUEST' : 'FOR SALE'}`}
              onPress={() => onMarkerPress(listing)}
            >
              <View style={[styles.customMarker, { backgroundColor }]}>
                <IconComponent 
                  size={20} 
                  color="#FFFFFF" 
                />
              </View>
            </Marker>
          );
        })}
    </MapView>
  );
}

const styles = StyleSheet.create({
  map: {
    flex: 1,
    width: '100%',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#64748B',
  },
  customMarker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
});

export default withErrorBoundary(MapContainer, 'MapContainer');
