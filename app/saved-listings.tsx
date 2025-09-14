import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Heart, MapPin, Star, Clock, MoreVertical } from 'lucide-react-native';
import { useSavedListings } from '@/hooks/useFavorites';
import { useFavorites } from '@/hooks/useFavorites';
import { FavoriteListing } from '@/utils/favoritesSupabase';
import NewRobustImage from '@/components/NewRobustImage';
import VerificationBadge from '@/components/VerificationBadge';
import { isUserVerified } from '@/utils/verificationUtils';
import { formatDistance } from '@/utils/distance';
import { formatPriceWithUnit } from '@/utils/formatters';
import { withErrorBoundary } from '@/components/ErrorBoundary';

function SavedListingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { savedListings, loading, error, hasMore, loadMore, refresh, setSavedListings } = useSavedListings();
  const { toggleFavoriteStatus, isFavorited } = useFavorites();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  const handleLoadMore = useCallback(async () => {
    if (!loading && hasMore) {
      await loadMore();
    }
  }, [loading, hasMore, loadMore]);

  const handleListingPress = useCallback((listingId: string) => {
    router.push(`/listing-detail?id=${listingId}`);
  }, [router]);

  const handleFavoritePress = useCallback(async (listingId: string, username: string) => {
    Alert.alert(
      'Remove from Favorites',
      'Are you sure you want to remove this listing from your favorites?',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Remove',
          onPress: async () => {
            // Optimistic update - remove from list immediately
            setSavedListings(prev => prev.filter(item => item.id !== listingId));
            
            try {
              const newStatus = await toggleFavoriteStatus(listingId, username);
              if (newStatus) {
                // If it was actually added back, refresh the list
                await refresh();
              }
            } catch (error) {
              // Revert on error - refresh to get correct state
              await refresh();
              console.error('Error removing favorite:', error);
            }
          }
        }
      ]
    );
  }, [toggleFavoriteStatus, refresh]);

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  const renderListingItem = useCallback(({ item }: { item: FavoriteListing }) => {
    const seller = {
      username: item.username,
      name: item.name,
      avatar_url: item.avatar_url,
      location_display: item.location_display,
      expires_at: item.expires_at
    };

    return (
      <View style={styles.listingCard}>
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
              style={styles.listingImage}
              placeholderText="No Image"
              title={item.title}
            />
            
            {/* Favorite Button */}
            <TouchableOpacity
              style={[
                styles.favoriteButton,
                isFavorited(item.id) && styles.favoriteButtonActive
              ]}
              onPress={() => handleFavoritePress(item.id, item.username)}
              activeOpacity={0.7}
            >
              <Heart 
                size={16} 
                color={isFavorited(item.id) ? "#EF4444" : "#64748B"} 
                fill={isFavorited(item.id) ? "#EF4444" : "transparent"}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.listingDetails}>
            {/* Seller Info */}
            <View style={styles.sellerInfo}>
              <Text style={styles.sellerName}>{item.name || 'Unknown Seller'}</Text>
              {isUserVerified(seller) && <VerificationBadge size="small" />}
            </View>

            {/* Listing Title */}
            <Text style={styles.listingTitle} numberOfLines={2}>
              {item.title}
            </Text>

            {/* Price */}
            <Text style={styles.listingPrice}>
              {formatPriceWithUnit(item.price.toString(), item.price_unit)}
            </Text>

            {/* Category */}
            <Text style={styles.listingCategory}>
              {item.category.charAt(0).toUpperCase() + item.category.slice(1).toLowerCase()}
            </Text>

            {/* Location */}
            {item.location_display && (
              <View style={styles.locationRow}>
                <MapPin size={12} color="#64748B" />
                <Text style={styles.locationText} numberOfLines={1}>
                  {item.location_display}
                </Text>
              </View>
            )}

            {/* Stats */}
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Clock size={12} color="#64748B" />
                <Text style={styles.statText}>{formatTimeAgo(item.created_at)}</Text>
              </View>
              <View style={styles.statItem}>
                <Star size={12} color="#F59E0B" />
                <Text style={styles.statText}>{item.view_count || 0} views</Text>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </View>
    );
  }, [handleListingPress, handleFavoritePress, isFavorited]);

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Heart size={64} color="#E2E8F0" />
      <Text style={styles.emptyTitle}>No Saved Listings</Text>
      <Text style={styles.emptySubtext}>
        Tap the heart icon on any listing to save it here
      </Text>
    </View>
  );

  const renderFooter = () => {
    if (!loading || !hasMore) return null;
    
    return (
      <View style={styles.loadingMoreContainer}>
        <ActivityIndicator size="small" color="#22C55E" />
        <Text style={styles.loadingMoreText}>Loading more...</Text>
      </View>
    );
  };

  if (error) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <ArrowLeft size={24} color="#1E293B" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Saved Listings</Text>
          <View style={styles.headerRight} />
        </View>
        
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={refresh}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <ArrowLeft size={24} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Saved Listings</Text>
        <View style={styles.headerRight} />
      </View>

      {/* Listings */}
      <FlatList
        data={savedListings}
        renderItem={renderListingItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#22C55E']}
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={renderEmptyState}
        ListFooterComponent={renderFooter}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#1E293B',
  },
  headerRight: {
    width: 32,
  },
  listContainer: {
    padding: 16,
    paddingBottom: 100,
  },
  listingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  listingContent: {
    flexDirection: 'row',
    padding: 12,
  },
  imageContainer: {
    position: 'relative',
    marginRight: 12,
  },
  listingImage: {
    width: 100,
    height: 100,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  favoriteButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  favoriteButtonActive: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  listingDetails: {
    flex: 1,
    justifyContent: 'space-between',
  },
  sellerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  sellerName: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#1E293B',
    marginRight: 6,
  },
  listingTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1E293B',
    marginBottom: 4,
    lineHeight: 20,
  },
  listingPrice: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#22C55E',
    marginBottom: 4,
  },
  listingCategory: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
    marginBottom: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  locationText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
    marginLeft: 4,
    flex: 1,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statText: {
    fontSize: 11,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
    marginLeft: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#1E293B',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
  },
  loadingMoreContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    gap: 8,
  },
  loadingMoreText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  errorText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#EF4444',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#22C55E',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#FFFFFF',
  },
});

export default withErrorBoundary(SavedListingsScreen, 'SavedListingsScreen');
