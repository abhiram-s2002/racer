import React, { useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import NewRobustImage from './NewRobustImage';
import { formatPriceWithUnit } from '@/utils/formatters';
import { MarketplaceItem } from '@/utils/types';

const { width } = Dimensions.get('window');
const ITEM_WIDTH = (width - 60) / 2.5; // Account for padding and gap

interface SellerListingsCarouselProps {
  listings: MarketplaceItem[];
  onListingPress: (listingId: string) => void;
  sellerName: string;
  sellerUsername?: string;
}

const SellerListingsCarousel: React.FC<SellerListingsCarouselProps> = React.memo(({
  listings,
  onListingPress,
  sellerName,
  // sellerUsername,
}) => {
  // Options modal state

  // Memoize the listings data to prevent unnecessary re-renders
  const memoizedListings = useMemo(() => listings, [listings]);

  // Handle listing press
  const handleListingPress = useCallback((listingId: string) => {
    onListingPress(listingId);
  }, [onListingPress]);

  // Render individual listing item
  const renderListingItem = useCallback(({ item }: { item: MarketplaceItem }) => (
    <View style={styles.listingItem}>
      <TouchableOpacity
        style={styles.listingContent}
        onPress={() => handleListingPress(item.id)}
        activeOpacity={0.7}
      >
        <View style={styles.imageContainer}>
          <NewRobustImage
            thumbnailImages={item.thumbnail_images}
            previewImages={item.preview_images}
            size="thumbnail"
            style={styles.carouselImage}
            placeholderText="No Image"
            title={item.title}
          />
          
        </View>

        <View style={styles.listingDetails}>
          <View style={styles.typeRow}>
            <Text
              style={[
                styles.typeBadge,
                item.item_type === 'request' ? styles.requestBadge : styles.listingBadge,
                item.item_type === 'request' ? styles.requestBadgeText : styles.listingBadgeText,
              ]}
            >
              {item.item_type === 'request' ? 'REQUEST' : 'LISTING'}
            </Text>
          </View>
          <Text style={styles.listingTitle} numberOfLines={2}>
            {item.title}
          </Text>
          <Text style={styles.listingPrice}>
            {item.item_type === 'request' 
              ? (item.budget_max ? `₹${item.budget_min || 0} - ₹${item.budget_max}` : `₹${item.budget_min || 0}`)
              : formatPriceWithUnit(item.price.toString(), item.price_unit || 'per_item')
            }
          </Text>
          <Text style={styles.listingCategory}>
            {item.category.charAt(0).toUpperCase() + item.category.slice(1).toLowerCase()}
          </Text>
        </View>
      </TouchableOpacity>
    </View>
  ), [handleListingPress]);

  // Memoize the key extractor
  const keyExtractor = useCallback((item: MarketplaceItem) => item.id, []);

  // Memoize the getItemLayout for better performance
  const getItemLayout = useCallback((data: any, index: number) => ({
    length: ITEM_WIDTH + 16, // item width + margin
    offset: (ITEM_WIDTH + 16) * index,
    index,
  }), []);

  if (!listings || listings.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.sectionTitle}>
          More from {sellerName}
        </Text>
        <Text style={styles.listingCount}>
          {listings.length} item{listings.length !== 1 ? 's' : ''}
        </Text>
      </View>

      <FlatList
        data={memoizedListings}
        renderItem={renderListingItem}
        keyExtractor={keyExtractor}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.carouselContainer}
        getItemLayout={getItemLayout}
        initialNumToRender={3}
        maxToRenderPerBatch={5}
        windowSize={5}
        removeClippedSubviews={true}
        decelerationRate="fast"
        snapToInterval={ITEM_WIDTH + 16}
        snapToAlignment="start"
      />
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
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#1E293B',
  },
  listingCount: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
  },
  carouselContainer: {
    paddingRight: 20, // Extra padding for last item
  },
  listingItem: {
    width: ITEM_WIDTH,
    marginRight: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    height: ITEM_WIDTH * 0.8,
    backgroundColor: '#F1F5F9',
  },
  carouselImage: {
    width: '100%',
    height: '100%',
  },
  listingContent: {
    flex: 1,
  },
  listingDetails: {
    padding: 12,
  },
  typeRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    fontSize: 10,
    fontFamily: 'Inter-Bold',
    overflow: 'hidden',
    alignSelf: 'flex-start',
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
  listingBadgeText: {
    fontSize: 10,
    fontFamily: 'Inter-Bold',
    color: '#2563EB',
  },
  requestBadgeText: {
    fontSize: 10,
    fontFamily: 'Inter-Bold',
    color: '#8B5CF6',
  },
  listingTitle: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
    color: '#1E293B',
    marginBottom: 4,
    lineHeight: 16,
    minHeight: 32,
  },
  listingPrice: {
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    color: '#22C55E',
    marginBottom: 2,
  },
  listingCategory: {
    fontSize: 11,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
    textTransform: 'capitalize',
  },
});

SellerListingsCarousel.displayName = 'SellerListingsCarousel';

export default SellerListingsCarousel;


