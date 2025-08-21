import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Linking,
  Platform,
} from 'react-native';
import { Phone, MessageCircle, MapPin } from 'lucide-react-native';
import { useRouter } from 'expo-router';

interface Listing {
  id: string;
  title: string;
  username: string;
}

interface SellerInfo {
  username: string;
  name: string;
  phone: string;
}

interface ListingActionButtonsProps {
  listing: Listing;
  sellerInfo: SellerInfo | null;
}

const ListingActionButtons: React.FC<ListingActionButtonsProps> = React.memo(({
  listing,
  sellerInfo,
}) => {
  const router = useRouter();

  // Handle phone call
  const handleCall = useCallback(() => {
    const phoneNumber = sellerInfo?.phone;
    if (!phoneNumber) {
      Alert.alert(
        'No Phone Number',
        'This seller has not provided a phone number.',
        [{ text: 'OK', style: 'default' }]
      );
      return;
    }

    Alert.alert(
      'Call Seller',
      `Call ${sellerInfo?.name || 'seller'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Call', 
          onPress: () => {
            const phoneUrl = `tel:${phoneNumber}`;
            Linking.openURL(phoneUrl);
          }
        }
      ]
    );
  }, [sellerInfo]);

  // Handle message/ping
  const handleMessage = useCallback(() => {
    router.push({ 
      pathname: '/', 
      params: { pingListingId: listing.id } 
    });
  }, [router, listing.id]);

  // Handle location/directions
  const handleLocation = useCallback(() => {
    // This will be handled by the map component
    // For now, just scroll to map or show alert
    Alert.alert(
      'Location',
      'Scroll down to see the location map and get directions.',
      [{ text: 'OK', style: 'default' }]
    );
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Contact Seller</Text>
      
      <View style={styles.buttonRow}>
        {/* Call Button */}
        <TouchableOpacity
          style={[styles.actionButton, !sellerInfo?.phone && styles.disabledButton]}
          onPress={handleCall}
          disabled={!sellerInfo?.phone}
          activeOpacity={0.7}
        >
          <Phone size={20} color={sellerInfo?.phone ? '#FFFFFF' : '#94A3B8'} />
          <Text style={[styles.buttonText, !sellerInfo?.phone && styles.disabledButtonText]}>
            {sellerInfo?.phone ? 'Call' : 'No Phone'}
          </Text>
        </TouchableOpacity>

        {/* Message Button */}
        <TouchableOpacity
          style={[styles.actionButton, styles.messageButton]}
          onPress={handleMessage}
          activeOpacity={0.7}
        >
          <MessageCircle size={20} color="#22C55E" />
          <Text style={[styles.buttonText, styles.messageButtonText]}>
            Message
          </Text>
        </TouchableOpacity>

        {/* Location Button */}
        <TouchableOpacity
          style={[styles.actionButton, styles.locationButton]}
          onPress={handleLocation}
          activeOpacity={0.7}
        >
          <MapPin size={20} color="#3B82F6" />
          <Text style={[styles.buttonText, styles.locationButtonText]}>
            Location
          </Text>
        </TouchableOpacity>
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
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1E293B',
    marginBottom: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  buttonText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    fontWeight: '500',
  },
  disabledButton: {
    backgroundColor: '#F1F5F9',
    opacity: 0.6,
  },
  disabledButtonText: {
    color: '#94A3B8',
  },
  messageButton: {
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#22C55E',
  },
  messageButtonText: {
    color: '#22C55E',
  },
  locationButton: {
    backgroundColor: '#DBEAFE',
    borderWidth: 1,
    borderColor: '#3B82F6',
  },
  locationButtonText: {
    color: '#3B82F6',
  },
});

ListingActionButtons.displayName = 'ListingActionButtons';

export default ListingActionButtons;
