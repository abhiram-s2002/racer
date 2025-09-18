import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Package } from 'lucide-react-native';
import { formatPriceWithUnit } from '@/utils/formatters';
import NewRobustImage from './NewRobustImage';

interface SellerListing {
  id: string;
  title: string;
  description: string;
  price: number;
  price_unit: string;
  category: string;
  thumbnail_images?: string[];
  preview_images?: string[];
  created_at: string;
  view_count?: number;
  ping_count?: number;
  expires_at?: string;
}

interface SingleColumnListingItemProps {
  listing: SellerListing;
  onPress: (listingId: string) => void;
}

const SingleColumnListingItem: React.FC<SingleColumnListingItemProps> = React.memo(({
  listing,
  onPress,
}) => {
  return (
    <TouchableOpacity 
      style={styles.container}
      onPress={() => onPress(listing.id)}
      activeOpacity={0.7}
    >
      <View style={styles.imageContainer}>
        <NewRobustImage
          thumbnailImages={listing.thumbnail_images}
          previewImages={listing.preview_images}
          style={styles.image}
          placeholderText="No Image"
          size="thumbnail"
          title={listing.title}
          category={listing.category}
          itemType="listing"
        />
      </View>
      
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={2}>
          {listing.title}
        </Text>
        
        <View style={styles.detailsRow}>
          <View style={styles.categoryContainer}>
            <Package size={12} color="#6B7280" />
            <Text style={styles.category}>{listing.category}</Text>
          </View>
        </View>
        
        <Text style={styles.price}>
          {formatPriceWithUnit(listing.price.toString(), listing.price_unit)}
        </Text>
      </View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    marginBottom: 12,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  imageContainer: {
    width: 80,
    height: 80,
  },
  image: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  content: {
    flex: 1,
    padding: 12,
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 8,
    lineHeight: 20,
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  category: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
    textTransform: 'capitalize',
  },
  price: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#10B981',
  },
});

SingleColumnListingItem.displayName = 'SingleColumnListingItem';

export default SingleColumnListingItem;
