import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
} from 'react-native';
import { MapPin, User } from 'lucide-react-native';
import { LocationUtils } from '@/utils/locationUtils';

interface SellerInfo {
  username: string;
  name: string;
  avatar_url: string;
  phone: string;
  location_display: string;
  bio: string;
}

interface SellerInfoSectionProps {
  seller: SellerInfo;
}

const SellerInfoSection: React.FC<SellerInfoSectionProps> = React.memo(({
  seller,
}) => {
  // Memoize formatted location to prevent unnecessary recalculations
  const formattedLocation = useMemo(() => {
    if (!seller.location_display) return 'No location set';
    return LocationUtils.formatLocationDisplay(seller.location_display);
  }, [seller.location_display]);

  // Memoize truncated bio
  const truncatedBio = useMemo(() => {
    if (!seller.bio) return 'No bio available';
    return seller.bio.length > 100 ? `${seller.bio.substring(0, 100)}...` : seller.bio;
  }, [seller.bio]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.sellerInfo}>
          <Image
            source={{ 
              uri: seller.avatar_url || 'https://images.pexels.com/photos/1327838/pexels-photo-1327838.jpeg?auto=compress&cs=tinysrgb&w=400'
            }}
            style={styles.avatar}
            defaultSource={{ uri: 'https://images.pexels.com/photos/1327838/pexels-photo-1327838.jpeg?auto=compress&cs=tinysrgb&w=400' }}
          />
          <View style={styles.details}>
            <View style={styles.nameRow}>
              <User size={16} color="#64748B" />
              <Text style={styles.name}>{seller.name || 'Unknown Seller'}</Text>
            </View>
            <View style={styles.locationRow}>
              <MapPin size={14} color="#64748B" />
              <Text style={styles.location}>{formattedLocation}</Text>
            </View>
          </View>
        </View>

      </View>

      {seller.bio && (
        <View style={styles.bioSection}>
          <Text style={styles.bioLabel}>About Seller</Text>
          <Text style={styles.bioText}>{truncatedBio}</Text>
        </View>
      )}

             <View style={styles.divider} />
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
  sellerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
    backgroundColor: '#F1F5F9',
  },
  details: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 6,
  },
  name: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1E293B',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  location: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
  },
  bioSection: {
    marginBottom: 16,
  },
  bioLabel: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#64748B',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  bioText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#475569',
    lineHeight: 20,
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
  },
});

SellerInfoSection.displayName = 'SellerInfoSection';

export default SellerInfoSection;
