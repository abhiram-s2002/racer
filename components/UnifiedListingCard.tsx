import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
} from 'react-native';
import { Package, Calendar, MapPin, Eye, MessageCircle, Clock } from 'lucide-react-native';
import { LocationUtils } from '@/utils/locationUtils';
import HomeRatingDisplay from './HomeRatingDisplay';
import VerificationBadge from './VerificationBadge';
import { isUserVerified } from '@/utils/verificationUtils';

interface SellerInfo {
  username: string;
  name: string;
  avatar_url: string;
  phone: string;
  location_display: string;
  bio: string;
  verification_status?: 'verified' | 'not_verified';
  verified_at?: string;
  expires_at?: string;
}

interface UnifiedListingCardProps {
  title: string;
  description: string;
  price: number;
  priceUnit: string;
  category: string;
  createdAt: string;
  seller: SellerInfo;
  viewCount?: number;
  pingCount?: number;
  expiresAt?: string;
  onSellerPress?: () => void;
}

const UnifiedListingCard: React.FC<UnifiedListingCardProps> = React.memo(({
  title,
  description,
  price,
  priceUnit,
  category,
  createdAt,
  seller,
  viewCount = 0,
  pingCount = 0,
  expiresAt,
  onSellerPress,
}) => {
  const formattedDate = useMemo(() => {
    if (!createdAt) return 'Recently';
    
    try {
      const date = new Date(createdAt);
      if (isNaN(date.getTime())) return 'Recently';
      
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - date.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 1) return 'Today';
      if (diffDays === 2) return 'Yesterday';
      if (diffDays <= 7) return `${diffDays} days ago`;
      if (diffDays <= 30) return `${Math.ceil(diffDays / 7)} weeks ago`;
      if (diffDays <= 365) return `${Math.ceil(diffDays / 30)} months ago`;
      return date.toLocaleDateString();
    } catch (error) {
      return 'Recently';
    }
  }, [createdAt]);

  const categoryDisplay = useMemo(() => {
    if (!category || typeof category !== 'string') return 'General';
    return category.charAt(0).toUpperCase() + category.slice(1).toLowerCase();
  }, [category]);

  const formattedLocation = useMemo(() => {
    if (!seller.location_display) return 'No location set';
    return LocationUtils.formatLocationDisplay(seller.location_display);
  }, [seller.location_display]);

  const truncatedBio = useMemo(() => {
    if (!seller.bio) return null;
    return seller.bio.length > 120 ? `${seller.bio.substring(0, 120)}...` : seller.bio;
  }, [seller.bio]);

  const timeRemaining = useMemo(() => {
    if (!expiresAt) return null;
    
    try {
      const expiry = new Date(expiresAt);
      const now = new Date();
      const diffMs = expiry.getTime() - now.getTime();
      
      if (diffMs <= 0) return 'Listing expired';
      
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      
      if (diffDays === 1) return 'Expires today';
      if (diffDays <= 7) return `${diffDays} days remaining`;
      if (diffDays <= 30) return `${Math.ceil(diffDays / 7)} weeks remaining`;
      return `${Math.ceil(diffDays / 30)} months remaining`;
    } catch (error) {
      return null;
    }
  }, [expiresAt]);

  const viewCountText = useMemo(() => {
    if (viewCount === 0) return 'No views yet';
    if (viewCount === 1) return '1 person viewed this';
    if (viewCount < 100) return `${viewCount} people viewed this`;
    return `${viewCount.toLocaleString()} people viewed this`;
  }, [viewCount]);

  const pingCountText = useMemo(() => {
    if (pingCount === 0) return 'No interest yet';
    if (pingCount === 1) return '1 person interested';
    if (pingCount < 100) return `${pingCount} people interested`;
    return `${pingCount.toLocaleString()} people interested`;
  }, [pingCount]);

  return (
    <View style={styles.container}>
      {/* Title and Price Section */}
      <View style={styles.headerSection}>
        <Text style={styles.title} numberOfLines={3}>
          {title || 'Untitled Listing'}
        </Text>
        
        <View style={styles.priceSection}>
          <Text style={styles.price}>₹{price || 0}</Text>
          <Text style={styles.priceUnit}>
            {priceUnit === 'per_item' ? 'per item' : 
             priceUnit === 'per_hour' ? 'per hour' :
             priceUnit === 'per_day' ? 'per day' :
             priceUnit === 'per_week' ? 'per week' :
             priceUnit === 'per_month' ? 'per month' :
             priceUnit === 'per_year' ? 'per year' :
             (priceUnit && typeof priceUnit === 'string' ? priceUnit.replace('per_', 'per ').toLowerCase() : 'per item')}
          </Text>
        </View>
      </View>

      {/* Key Details Row */}
      <View style={styles.detailsRow}>
        <View style={styles.detailItem}>
          <Package size={16} color="#6B7280" />
          <Text style={styles.detailText}>{categoryDisplay}</Text>
        </View>
        <View style={styles.detailItem}>
          <Calendar size={16} color="#6B7280" />
          <Text style={styles.detailText}>{formattedDate}</Text>
        </View>
      </View>

      {/* Engagement Metrics Section */}
      <View style={styles.engagementSection}>
        <View style={styles.engagementRow}>
          <View style={styles.engagementItem}>
            <Eye size={14} color="#6B7280" />
            <Text style={styles.engagementText}>
              {viewCountText}
            </Text>
          </View>
          <View style={styles.engagementItem}>
            <MessageCircle size={14} color="#6B7280" />
            <Text style={styles.engagementText}>
              {pingCountText}
            </Text>
          </View>
        </View>
        {timeRemaining && (
          <View style={styles.expiryRow}>
            <View style={[
              styles.expiryBadge,
              timeRemaining === 'Listing expired' ? styles.expiredBadge : styles.activeBadge
            ]}>
              <Clock size={12} color={timeRemaining === 'Listing expired' ? '#DC2626' : '#059669'} />
              <Text style={[
                styles.expiryText,
                { color: timeRemaining === 'Listing expired' ? '#DC2626' : '#059669' }
              ]}>
                {timeRemaining}
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* Description */}
      {description && description.trim() !== '' && (
        <View style={styles.descriptionSection}>
          <Text style={styles.descriptionText} numberOfLines={4}>
            {description}
          </Text>
        </View>
      )}

      {/* Seller Information - Compact */}
      <TouchableOpacity 
        style={styles.sellerSection}
        onPress={onSellerPress}
        activeOpacity={onSellerPress ? 0.7 : 1}
      >
        <View style={styles.sellerInfo}>
          <Image
            source={{ 
              uri: seller.avatar_url || 'https://images.pexels.com/photos/1327838/pexels-photo-1327838.jpeg?auto=compress&cs=tinysrgb&w=400'
            }}
            style={styles.avatar}
            defaultSource={{ uri: 'https://images.pexels.com/photos/1327838/pexels-photo-1327838.jpeg?auto=compress&cs=tinysrgb&w=400' }}
          />
          <View style={styles.sellerDetails}>
            <View style={styles.sellerNameRow}>
              <Text style={styles.sellerName}>{seller.name || 'Unknown Seller'}</Text>
              {isUserVerified(seller) && <VerificationBadge size="small" />}
            </View>
            <View style={styles.sellerMeta}>
              <View style={styles.locationRow}>
                <MapPin size={12} color="#6B7280" />
                <Text style={styles.locationText}>{formattedLocation}</Text>
              </View>
              <HomeRatingDisplay 
                username={seller.username}
                size="small"
                showCount={false}
                showAverage={true}
                compact={true}
              />
            </View>
          </View>
        </View>
        
        {truncatedBio && (
          <Text style={styles.bioText} numberOfLines={2}>
            {truncatedBio}
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    marginBottom: 12,
  },
  
  // Header Section
  headerSection: {
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#111827',
    lineHeight: 32,
    marginBottom: 12,
  },
  
  // Price Section
  priceSection: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  price: {
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    color: '#059669',
  },
  priceUnit: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
  },

  // Details Row
  detailsRow: {
    flexDirection: 'row',
    gap: 24,
    marginBottom: 16,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
  },

  // Engagement Section
  engagementSection: {
    marginBottom: 20,
  },
  engagementRow: {
    flexDirection: 'row',
    gap: 32,
    marginBottom: 12,
  },
  engagementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  engagementText: {
    fontSize: 13,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
  },
  expiryRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginTop: 4,
  },
  expiryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  activeBadge: {
    backgroundColor: '#DCFCE7',
  },
  expiredBadge: {
    backgroundColor: '#FEF2F2',
  },
  expiryText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
  },

  // Description Section
  descriptionSection: {
    marginBottom: 20,
  },
  descriptionText: {
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    color: '#374151',
    lineHeight: 24,
  },

  // Seller Section
  sellerSection: {
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 16,
  },
  sellerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    backgroundColor: '#F3F4F6',
  },
  sellerDetails: {
    flex: 1,
  },
  sellerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  sellerName: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
  },
  sellerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationText: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  bioText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    lineHeight: 20,
    fontStyle: 'italic',
  },
});

UnifiedListingCard.displayName = 'UnifiedListingCard';

export default UnifiedListingCard;
