import React, { useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Linking,
  Platform,
} from 'react-native';
import { MapPin, Navigation } from 'lucide-react-native';
import MapView, { Marker } from 'react-native-maps';

interface ListingLocationMapProps {
  latitude: number;
  longitude: number;
  title: string;
  sellerName: string;
}

const ListingLocationMap: React.FC<ListingLocationMapProps> = React.memo(({
  latitude,
  longitude,
  title,
  sellerName,
}) => {
  // Memoize map region to prevent unnecessary re-renders
  const mapRegion = useMemo(() => ({
    latitude,
    longitude,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  }), [latitude, longitude]);

  // Memoize marker coordinate
  const markerCoordinate = useMemo(() => ({
    latitude,
    longitude,
  }), [latitude, longitude]);

  // Handle get directions
  const handleGetDirections = useCallback(() => {
    const label = encodeURIComponent(`${title} - ${sellerName}`);
    
    let url: string;
    if (Platform.OS === 'ios') {
      url = `http://maps.apple.com/?daddr=${latitude},${longitude}&q=${label}`;
    } else {
      url = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}&travelmode=driving`;
    }

    Alert.alert(
      'Get Directions',
      'Open in maps app?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Open', 
          onPress: () => {
            Linking.openURL(url);
          }
        }
      ]
    );
  }, [latitude, longitude, title, sellerName]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <MapPin size={20} color="#3B82F6" />
          <Text style={styles.title}>Location</Text>
        </View>
        <TouchableOpacity
          style={styles.directionsButton}
          onPress={handleGetDirections}
          activeOpacity={0.7}
        >
          <Navigation size={16} color="#3B82F6" />
          <Text style={styles.directionsText}>Directions</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.mapContainer}>
        <MapView
          style={styles.map}
          initialRegion={mapRegion}
          pointerEvents="none"
          showsUserLocation={false}
          showsMyLocationButton={false}
          showsCompass={false}
          showsScale={false}
          showsBuildings={true}
          showsTraffic={false}
        >
          <Marker
            coordinate={markerCoordinate}
            title={title}
            description={`${sellerName}'s listing`}
            pinColor="#3B82F6"
          />
        </MapView>
      </View>

      <View style={styles.locationInfo}>
        <Text style={styles.locationText}>
          {title} is located at this address
        </Text>
        <Text style={styles.coordinatesText}>
          {latitude.toFixed(6)}, {longitude.toFixed(6)}
        </Text>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1E293B',
  },
  directionsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    gap: 6,
  },
  directionsText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#3B82F6',
  },
  mapContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  map: {
    width: '100%',
    height: 200,
  },
  locationInfo: {
    alignItems: 'center',
  },
  locationText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 4,
  },
  coordinatesText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#94A3B8',
    fontFamily: 'monospace',
  },
});

ListingLocationMap.displayName = 'ListingLocationMap';

export default ListingLocationMap;


