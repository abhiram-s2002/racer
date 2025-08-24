import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { MapPin, MessageCircle, X } from 'lucide-react-native';



interface Listing {
  id: string;
  title: string;
  price: number;
  category: string;
  location_display: string;
}

interface MapPinPopupProps {
  listing: Listing;
  onClose: () => void;
  onPing: () => void;
  visible: boolean;
}

const MapPinPopup: React.FC<MapPinPopupProps> = React.memo(({
  listing,
  onClose,
  onPing,
  visible,
}) => {
  if (!visible || !listing) return null;

  return (
    <View style={styles.container}>
      {/* Close Button */}
      <TouchableOpacity style={styles.closeButton} onPress={onClose}>
        <X size={16} color="#64748B" />
      </TouchableOpacity>

      {/* Listing Content */}
      <View style={styles.content}>
        {/* Title */}
        <Text style={styles.title} numberOfLines={2}>
          {listing.title || 'Untitled Listing'}
        </Text>

        {/* Price and Category Row */}
        <View style={styles.priceCategoryRow}>
          <Text style={styles.price}>₹{listing.price || 0}</Text>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>
              {listing.category || 'General'}
            </Text>
          </View>
        </View>

        {/* Location */}
        <View style={styles.locationRow}>
          <MapPin size={14} color="#64748B" />
          <Text style={styles.locationText} numberOfLines={1}>
            {listing.location_display || 'Location not specified'}
          </Text>
        </View>

        {/* Ping Button */}
        <TouchableOpacity style={styles.pingButton} onPress={onPing}>
          <MessageCircle size={16} color="#FFFFFF" />
          <Text style={styles.pingButtonText}>Ping Seller</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  closeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  content: {
    paddingTop: 8,
  },
  title: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1E293B',
    marginBottom: 12,
    lineHeight: 22,
  },
  priceCategoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  price: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#22C55E',
  },
  categoryBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#64748B',
    textTransform: 'capitalize',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 6,
  },
  locationText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
    flex: 1,
  },
  pingButton: {
    backgroundColor: '#22C55E',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
  },
  pingButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
  },
});

MapPinPopup.displayName = 'MapPinPopup';

export default MapPinPopup;


