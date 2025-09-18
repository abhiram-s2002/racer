import React, { useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator, Text } from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT, Region } from 'react-native-maps';
import * as Location from 'expo-location';
import { withErrorBoundary } from '@/components/ErrorBoundary';

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
          // Use different colors based on item type
          const pinColor = listing.item_type === 'request' ? '#9333EA' : '#3B82F6';
          
          return (
            <Marker
              key={listing.id}
              coordinate={{
                latitude: listing.latitude,
                longitude: listing.longitude,
              }}
              pinColor={pinColor}
              title={listing.title}
              description={`₹${listing.price} · ${listing.category} · ${listing.item_type === 'request' ? 'REQUEST' : 'FOR SALE'}`}
              onPress={() => onMarkerPress(listing)}
            />
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
});

export default withErrorBoundary(MapContainer, 'MapContainer');
