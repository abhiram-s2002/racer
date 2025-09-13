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

interface CompactLocationCardProps {
  latitude: number;
  longitude: number;
  title: string;
  sellerName: string;
}

const CompactLocationCard: React.FC<CompactLocationCardProps> = React.memo(({
  latitude,
  longitude,
  title,
  sellerName,
}) => {
  const mapRegion = useMemo(() => ({
    latitude,
    longitude,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  }), [latitude, longitude]);

  const markerCoordinate = useMemo(() => ({
    latitude,
    longitude,
  }), [latitude, longitude]);

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
          <MapPin size={16} color="#6B7280" />
          <Text style={styles.title}>Location</Text>
        </View>
        <TouchableOpacity
          style={styles.directionsButton}
          onPress={handleGetDirections}
          activeOpacity={0.7}
        >
          <Navigation size={14} color="#3B82F6" />
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
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  title: {
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
  },
  directionsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  directionsText: {
    fontSize: 13,
    fontFamily: 'Inter-Medium',
    color: '#3B82F6',
  },
  mapContainer: {
    borderRadius: 8,
    overflow: 'hidden',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  map: {
    width: '100%',
    height: 140,
  },
});

CompactLocationCard.displayName = 'CompactLocationCard';

export default CompactLocationCard;
