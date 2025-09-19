import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from 'react-native';
import { MapPin, MessageCircle, X, Star, Clock, User, Truck, Package } from 'lucide-react-native';
import { MarketplaceItem } from '@/utils/types';
import NewRobustImage from './NewRobustImage';
import VerificationBadge from './VerificationBadge';
import { isUserVerified } from '@/utils/verificationUtils';
import { LocationUtils } from '@/utils/locationUtils';

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

interface MapPinPopupProps {
  listing: MarketplaceItem;
  onClose: () => void;
  onPing: () => void;
  visible: boolean;
  sellerInfoMap?: { [username: string]: SellerInfo };
}

const { width } = Dimensions.get('window');

const MapPinPopup: React.FC<MapPinPopupProps> = React.memo(({
  listing,
  onClose,
  onPing,
  visible,
  sellerInfoMap = {},
}) => {
  if (!visible || !listing) return null;

  const formatTimeAgo = (dateString: string) => {
    if (!dateString) return 'Recently';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 48) return 'Yesterday';
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)}w ago`;
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatPrice = () => {
    if (listing.item_type === 'request') {
      if (listing.budget_min && listing.budget_max && listing.budget_min !== listing.budget_max) {
        return `₹${listing.budget_min}-${listing.budget_max}`;
      }
      return `₹${listing.price}`;
    }
    return `₹${listing.price}`;
  };

  const formatPriceUnit = () => {
    if (listing.item_type === 'request') {
      return 'budget';
    }
    return listing.price_unit ? 
      (listing.price_unit === 'per_item' ? 'per item' : listing.price_unit.replace('per_', 'per ')) 
      : 'per item';
  };

  return (
    <View style={styles.overlay}>
      <TouchableOpacity style={styles.backdrop} onPress={onClose} activeOpacity={1} />
      <View style={styles.container}>
        {/* Header with Type Badge and Close Button */}
        <View style={styles.header}>
          <View style={[
            styles.typeBadge,
            listing.item_type === 'request' ? styles.requestBadge : styles.listingBadge
          ]}>
            <Text style={[
              listing.item_type === 'request' ? styles.requestBadgeText : styles.typeBadgeText
            ]}>
              {listing.item_type === 'request' ? 'REQUEST' : 'FOR SALE'}
            </Text>
          </View>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <X size={20} color="#64748B" />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          {/* Main Content Row */}
          <View style={styles.mainContentRow}>
            {/* Left Side - Details */}
            <View style={styles.detailsColumn}>
              {/* Title */}
              <Text style={styles.title} numberOfLines={2}>
                {listing.title || 'Untitled Listing'}
              </Text>

              {/* Price and Unit */}
              <View style={styles.priceRow}>
                <Text style={styles.price}>{formatPrice()}</Text>
                <View style={styles.priceUnitBadge}>
                  <Text style={styles.priceUnitText}>{formatPriceUnit()}</Text>
                </View>
              </View>

              {/* Category */}
              <View style={styles.categoryRow}>
                <Text style={styles.categoryLabel}>Category:</Text>
                <Text style={styles.categoryText}>{listing.category || 'General'}</Text>
              </View>

              {/* Seller/Requester Info */}
              <View style={styles.sellerRow}>
                <User size={16} color="#64748B" />
                <View style={styles.sellerInfo}>
                  <Text style={styles.sellerText}>
                    {sellerInfoMap[listing.username]?.name || listing.username}
                  </Text>
                  {sellerInfoMap[listing.username] && isUserVerified(sellerInfoMap[listing.username]) && (
                    <VerificationBadge size="small" />
                  )}
                </View>
              </View>

              {/* Distance */}
              {listing.distance_km && (
                <View style={styles.distanceRow}>
                  <MapPin size={16} color="#64748B" />
                  <Text style={styles.distanceText}>
                    {listing.distance_km < 1 
                      ? `${Math.round(listing.distance_km * 1000)}m away`
                      : `${listing.distance_km.toFixed(1)}km away`
                    }
                  </Text>
                </View>
              )}

              {/* Location Address */}
              {sellerInfoMap[listing.username]?.location_display && (
                <View style={styles.locationRow}>
                  <MapPin size={14} color="#64748B" />
                  <Text style={styles.locationText} numberOfLines={1}>
                    {LocationUtils.formatLocationDisplay(sellerInfoMap[listing.username].location_display)}
                  </Text>
                </View>
              )}
            </View>

            {/* Right Side - Image */}
            <View style={styles.imageColumn}>
              <NewRobustImage
                thumbnailImages={listing.thumbnail_images}
                previewImages={listing.preview_images}
                size="thumbnail"
                style={styles.listingImage}
                placeholder={(
                  <View style={styles.imagePlaceholder}>
                    <Package size={24} color="#94A3B8" />
                  </View>
                )}
              />
            </View>
          </View>
        </View>

        {/* Action Button */}
        <TouchableOpacity style={styles.actionButton} onPress={onPing}>
          <Package size={18} color="#FFFFFF" />
          <Text style={styles.actionButtonText}>View Details</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  typeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  listingBadge: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#2563EB',
  },
  requestBadge: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#8B5CF6',
  },
  typeBadgeText: {
    fontSize: 12,
    fontFamily: 'Inter-Bold',
    color: '#2563EB',
  },
  requestBadgeText: {
    fontSize: 12,
    fontFamily: 'Inter-Bold',
    color: '#8B5CF6',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  mainContentRow: {
    flexDirection: 'row',
    gap: 16,
  },
  detailsColumn: {
    flex: 1,
    minWidth: 0, // Allows text to wrap properly
  },
  imageColumn: {
    width: 140,
    height: 140,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#F8FAFC',
  },
  listingImage: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#1E293B',
    marginBottom: 12,
    lineHeight: 24,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  price: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#10B981',
  },
  priceUnitBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  priceUnitText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#64748B',
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  categoryLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#64748B',
  },
  categoryText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#1E293B',
    textTransform: 'capitalize',
  },
  sellerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  sellerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sellerText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#1E293B',
  },
  distanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  distanceText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#64748B',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  locationText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
    flex: 1,
  },
  actionButton: {
    backgroundColor: '#10B981',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 12,
    gap: 8,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
});

MapPinPopup.displayName = 'MapPinPopup';

export default MapPinPopup;


