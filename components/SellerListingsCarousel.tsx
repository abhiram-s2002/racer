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

const { width } = Dimensions.get('window');
const ITEM_WIDTH = (width - 60) / 2.5; // Account for padding and gap

interface Listing {
  id: string;
  title: string;
  price: number;
  price_unit: string;
  thumbnail_images: string[];
  preview_images: string[];
  category: string;
}

interface SellerListingsCarouselProps {
  listings: Listing[];
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
  const renderListingItem = useCallback(({ item }: { item: Listing }) => (
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
          <Text style={styles.listingTitle} numberOfLines={2}>
            {item.title}
          </Text>
          <Text style={styles.listingPrice}>
            {formatPriceWithUnit(item.price.toString(), item.price_unit)}
          </Text>
          <Text style={styles.listingCategory}>
            {item.category.charAt(0).toUpperCase() + item.category.slice(1).toLowerCase()}
          </Text>
        </View>
      </TouchableOpacity>
    </View>
  ), [handleListingPress]);

  // Memoize the key extractor
  const keyExtractor = useCallback((item: Listing) => item.id, []);

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
          {listings.length} listing{listings.length !== 1 ? 's' : ''}
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


