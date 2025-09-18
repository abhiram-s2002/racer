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
import StarRating from './StarRating';
import { isUserVerified } from '@/utils/verificationUtils';

// Helper function to format pricing unit labels
const getPricingUnitLabel = (unit: string) => {
  const labels = {
    per_kg: 'per kg',
    per_piece: 'per piece',
    per_pack: 'per pack',
    per_bundle: 'per bundle',
    per_dozen: 'per dozen',
    per_basket: 'per basket',
    per_plate: 'per plate',
    per_serving: 'per serving',
    per_hour: 'per hour',
    per_service: 'per service',
    per_session: 'per session',
    per_day: 'per day',
    per_commission: 'per commission',
    per_project: 'per project',
    per_week: 'per week',
    per_month: 'per month',
    per_year: 'per year',
    per_item: 'per item',
  };
  return labels[unit as keyof typeof labels] || 'per item';
};

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
  itemType?: 'listing' | 'request';
  budgetMin?: number;
  budgetMax?: number;
  pickupAvailable?: boolean;
  deliveryAvailable?: boolean;
  ratingStats?: {
    average_rating: number;
    total_ratings: number;
    five_star_count: number;
    four_star_count: number;
    three_star_count: number;
    two_star_count: number;
    one_star_count: number;
  };
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
  itemType = 'listing',
  budgetMin,
  budgetMax,
  pickupAvailable,
  deliveryAvailable,
  ratingStats,
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
      
      if (diffMs <= 0) return `${itemType === 'request' ? 'Request' : 'Listing'} expired`;
      
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      
      if (diffDays === 1) return 'Expires today';
      if (diffDays <= 7) return `${diffDays} days remaining`;
      if (diffDays <= 30) return `${Math.ceil(diffDays / 7)} weeks remaining`;
      return `${Math.ceil(diffDays / 30)} months remaining`;
    } catch (error) {
      return null;
    }
  }, [expiresAt, itemType]);

  const viewCountText = useMemo(() => {
    if (viewCount === 0) return 'No views yet';
    if (viewCount === 1) return '1 person viewed this';
    if (viewCount < 100) return `${viewCount} people viewed this`;
    return `${viewCount.toLocaleString()} people viewed this`;
  }, [viewCount]);

  const pingCountText = useMemo(() => {
    if (itemType === 'request') {
      if (pingCount === 0) return 'No offers yet';
      if (pingCount === 1) return '1 person offered';
      if (pingCount < 100) return `${pingCount} people offered`;
      return `${pingCount.toLocaleString()} people offered`;
    } else {
      if (pingCount === 0) return 'No interest yet';
      if (pingCount === 1) return '1 person interested';
      if (pingCount < 100) return `${pingCount} people interested`;
      return `${pingCount.toLocaleString()} people interested`;
    }
  }, [pingCount, itemType]);

  return (
    <View style={styles.container}>
      {/* Title and Price Section */}
      <View style={styles.headerSection}>
        <Text style={styles.title} numberOfLines={3}>
          {title || `Untitled ${itemType === 'request' ? 'Request' : 'Listing'}`}
        </Text>
        
        <View style={styles.priceSection}>
          {itemType === 'request' ? (
            <View>
              <Text style={styles.price}>
                {budgetMax ? `₹${budgetMin || 0} - ₹${budgetMax}` : `₹${budgetMin || 0}`}
              </Text>
              <Text style={styles.priceUnit}>Budget</Text>
            </View>
          ) : (
            <View>
              <Text style={styles.price}>₹{price || 0}</Text>
              <Text style={styles.priceUnit}>
                {getPricingUnitLabel(priceUnit)}
              </Text>
            </View>
          )}
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

      {(pickupAvailable || deliveryAvailable) && (
        <View style={styles.availabilitySection}>
          {pickupAvailable && (
            <Text style={styles.detailText}>Pickup: Available</Text>
          )}
          {deliveryAvailable && (
            <Text style={styles.detailText}>Delivery: Available</Text>
          )}
        </View>
      )}

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
              timeRemaining?.includes('expired') ? styles.expiredBadge : styles.activeBadge
            ]}>
              <Clock size={12} color={timeRemaining?.includes('expired') ? '#DC2626' : '#059669'} />
              <Text style={[
                styles.expiryText,
                { color: timeRemaining?.includes('expired') ? '#DC2626' : '#059669' }
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
              <Text style={styles.sellerName}>
                {seller.name || `Unknown ${itemType === 'request' ? 'Requester' : 'Seller'}`}
              </Text>
              {isUserVerified(seller) && <VerificationBadge size="small" />}
            </View>
            <View style={styles.sellerMeta}>
              <View style={styles.locationRow}>
                <MapPin size={12} color="#6B7280" />
                <Text style={styles.locationText}>{formattedLocation}</Text>
              </View>
            </View>
          </View>
        </View>
        
        {truncatedBio && (
          <Text style={styles.bioText} numberOfLines={2}>
            {truncatedBio}
          </Text>
        )}
        
        {/* Professional Ratings Section */}
        <View style={styles.ratingsSection}>
          <Text style={styles.ratingsSectionTitle}>Seller Rating</Text>
          <View style={styles.ratingsContent}>
            <View style={styles.ratingMain}>
              <Text style={styles.ratingNumber}>
                {ratingStats?.average_rating?.toFixed(1) || '0.0'}
              </Text>
              <View style={styles.ratingStars}>
                <StarRating 
                  rating={Math.round(ratingStats?.average_rating || 0)} 
                  size="medium" 
                  readonly={true} 
                />
              </View>
              <Text style={styles.ratingCount}>
                {ratingStats?.total_ratings || 0} {ratingStats?.total_ratings === 1 ? 'rating' : 'ratings'}
              </Text>
            </View>
            
            {/* Rating Breakdown */}
            {ratingStats && ratingStats.total_ratings > 0 && (
              <View style={styles.ratingBreakdown}>
                {[5, 4, 3, 2, 1].map((stars) => {
                  const count = ratingStats[`${stars}_star_count` as keyof typeof ratingStats] as number || 0;
                  const percentage = ratingStats.total_ratings > 0 ? (count / ratingStats.total_ratings) * 100 : 0;
                  
                  return (
                    <View key={stars} style={styles.ratingBarRow}>
                      <Text style={styles.starLabel}>{stars}★</Text>
                      <View style={styles.ratingBarContainer}>
                        <View style={styles.ratingBarBackground}>
                          <View 
                            style={[
                              styles.ratingBarFill, 
                              { width: `${percentage}%` }
                            ]} 
                          />
                        </View>
                      </View>
                      <Text style={styles.ratingBarCount}>{count}</Text>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        </View>
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
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 4,
  },
  price: {
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    color: '#059669',
  },
  priceUnit: {
    fontSize: 14,
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
  availabilitySection: {
    marginTop: 4,
    marginBottom: 8,
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

  // Delivery Section
  deliverySection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  deliveryLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
    marginRight: 8,
  },
  deliveryOptions: {
    flexDirection: 'row',
    gap: 6,
  },
  deliveryBadge: {
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#22C55E',
  },
  deliveryBadgeText: {
    fontSize: 10,
    fontFamily: 'Inter-Medium',
    color: '#22C55E',
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

  // Professional Ratings Section
  ratingsSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  ratingsSectionTitle: {
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 10,
  },
  ratingsContent: {
    gap: 12,
  },
  ratingMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  ratingNumber: {
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    color: '#111827',
    minWidth: 44,
  },
  ratingStars: {
    flex: 1,
  },
  ratingCount: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
  },
  ratingBreakdown: {
    gap: 6,
  },
  ratingBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  starLabel: {
    fontSize: 11,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
    width: 18,
  },
  ratingBarContainer: {
    flex: 1,
    height: 6,
  },
  ratingBarBackground: {
    height: 6,
    backgroundColor: '#F3F4F6',
    borderRadius: 4,
    overflow: 'hidden',
  },
  ratingBarFill: {
    height: '100%',
    backgroundColor: '#F59E0B',
    borderRadius: 4,
  },
  ratingBarCount: {
    fontSize: 11,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
    minWidth: 18,
    textAlign: 'right',
  },
});

UnifiedListingCard.displayName = 'UnifiedListingCard';

export default UnifiedListingCard;
