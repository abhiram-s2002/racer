import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Linking,
  Alert,
} from 'react-native';
import { 
  MapPin, 
  Calendar, 
  Shield,
} from 'lucide-react-native';
import VerificationBadge from './VerificationBadge';
import { isUserVerified } from '@/utils/verificationUtils';
import HomeRatingDisplay from './HomeRatingDisplay';
import { getAvatarSource } from '@/utils/avatarUtils';
import { parseBio } from '@/utils/bioUtils';

interface SellerProfile {
  username: string;
  name: string;
  avatar_url?: string;
  bio?: string;
  location?: string;
  location_display?: string;
  verification_status?: 'verified' | 'not_verified';
  verified_at?: string;
  expires_at?: string;
  created_at: string;
  isAvailable: boolean;
}

interface UnifiedSellerProfileCardProps {
  seller: SellerProfile;
}

const UnifiedSellerProfileCard: React.FC<UnifiedSellerProfileCardProps> = React.memo(({
  seller,
}) => {
  const formattedJoinDate = useMemo(() => {
    try {
      const date = new Date(seller.created_at);
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        year: 'numeric' 
      });
    } catch (error) {
      return 'Recently';
    }
  }, [seller.created_at]);

  const formattedLocation = useMemo(() => {
    return seller.location_display || 'Location not specified';
  }, [seller.location_display]);

  const bioData = useMemo(() => {
    return parseBio(seller.bio);
  }, [seller.bio]);

  const truncatedBio = useMemo(() => {
    if (!bioData.text) return null;
    return bioData.text.length > 150 ? `${bioData.text.substring(0, 150)}...` : bioData.text;
  }, [bioData.text]);

  return (
    <View style={styles.container}>
      {/* Seller Header */}
      <View style={styles.sellerHeader}>
        <Image 
          source={getAvatarSource(seller.avatar_url)}
          style={styles.avatar}
        />
        <View style={styles.sellerInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.name}>{seller.name}</Text>
            {isUserVerified(seller) && <VerificationBadge size="small" />}
          </View>
          <Text style={styles.username}>@{seller.username}</Text>
          
          {/* Key Stats Row */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Calendar size={14} color="#6B7280" />
              <Text style={styles.statText}>Joined {formattedJoinDate}</Text>
            </View>
            {isUserVerified(seller) && (
              <View style={styles.statItem}>
                <Shield size={14} color="#059669" />
                <Text style={[styles.statText, { color: '#059669' }]}>Verified</Text>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* Rating Section */}
      <View style={styles.ratingSection}>
        <HomeRatingDisplay 
          username={seller.username}
          size="medium"
          showCount={true}
          showAverage={true}
          compact={true}
        />
      </View>

      {/* Location and Availability */}
      <View style={styles.metaRow}>
        <View style={styles.metaItem}>
          <MapPin size={16} color="#6B7280" />
          <Text style={styles.metaText}>{formattedLocation}</Text>
        </View>
        
        <View style={[
          styles.availabilityBadge,
          seller.isAvailable ? styles.available : styles.unavailable
        ]}>
          <View style={[
            styles.availabilityDot,
            { backgroundColor: seller.isAvailable ? '#059669' : '#DC2626' }
          ]} />
          <Text style={[
            styles.availabilityText,
            { color: seller.isAvailable ? '#059669' : '#DC2626' }
          ]}>
            {seller.isAvailable ? 'Available' : 'Unavailable'}
          </Text>
        </View>
      </View>

      {/* Bio Section */}
      {truncatedBio && (
        <View style={styles.bioSection}>
          <Text style={styles.bioLabel}>About</Text>
          <Text style={styles.bioText}>{truncatedBio}</Text>
          
          {/* Social Media Links */}
          {bioData.socialLinks && Object.values(bioData.socialLinks).some(url => url) && (
            <View style={styles.socialLinksContainer}>
              {bioData.socialLinks.instagram && (
                <TouchableOpacity 
                  style={styles.socialLinkButton}
                  onPress={() => {
                    const url = bioData.socialLinks!.instagram!;
                    Linking.openURL(url).catch(err => 
                      Alert.alert('Error', 'Could not open Instagram link')
                    );
                  }}
                >
                  <Text style={styles.socialLinkText}>📷 Instagram</Text>
                </TouchableOpacity>
              )}
              {bioData.socialLinks.youtube && (
                <TouchableOpacity 
                  style={styles.socialLinkButton}
                  onPress={() => {
                    const url = bioData.socialLinks!.youtube!;
                    Linking.openURL(url).catch(err => 
                      Alert.alert('Error', 'Could not open YouTube link')
                    );
                  }}
                >
                  <Text style={styles.socialLinkText}>📺 YouTube</Text>
                </TouchableOpacity>
              )}
              {bioData.socialLinks.facebook && (
                <TouchableOpacity 
                  style={styles.socialLinkButton}
                  onPress={() => {
                    const url = bioData.socialLinks!.facebook!;
                    Linking.openURL(url).catch(err => 
                      Alert.alert('Error', 'Could not open Facebook link')
                    );
                  }}
                >
                  <Text style={styles.socialLinkText}>👥 Facebook</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    marginBottom: 12,
  },
  
  // Seller Header
  sellerHeader: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 16,
    backgroundColor: '#F3F4F6',
  },
  sellerInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  name: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#111827',
  },
  username: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginBottom: 8,
  },
  
  // Stats Row
  statsRow: {
    flexDirection: 'row',
    gap: 16,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 13,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
  },

  // Rating Section
  ratingSection: {
    marginBottom: 16,
  },

  // Meta Row
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  metaText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },

  // Availability Badge
  availabilityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  available: {
    backgroundColor: '#DCFCE7',
  },
  unavailable: {
    backgroundColor: '#FEF2F2',
  },
  availabilityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  availabilityText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
  },

  // Bio Section
  bioSection: {
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 16,
  },
  bioLabel: {
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 8,
  },
  bioText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#374151',
    lineHeight: 22,
  },
  
  // Social Links
  socialLinksContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
    gap: 8,
  },
  socialLinkButton: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  socialLinkText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#22C55E',
  },
});

UnifiedSellerProfileCard.displayName = 'UnifiedSellerProfileCard';

export default UnifiedSellerProfileCard;
