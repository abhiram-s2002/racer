import React, { useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator, Text } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, Region } from 'react-native-maps';
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
      console.error('Error getting user location:', error);
    }
  };

  if (loading && !visibleListings.length) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#22C55E" />
        <Text style={styles.loadingText}>Loading map data...</Text>
      </View>
    );
  }

  return (
    <MapView
      style={styles.map}
      provider={PROVIDER_GOOGLE}
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
          pinColor="#22C55E"
          title="Your Location"
        />
      )}

      {/* Listing markers */}
      {visibleListings.map((listing) => (
        // eslint-disable-next-line react/jsx-key
        <Marker
          coordinate={{
            latitude: listing.latitude || 37.78825,
            longitude: listing.longitude || -122.4324,
          }}
          pinColor="#3B82F6"
          title={listing.title}
          description={`${listing.price} · ${listing.category}`}
          onPress={() => onMarkerPress(listing)}
        />
      ))}
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
