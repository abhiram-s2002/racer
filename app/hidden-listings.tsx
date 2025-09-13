import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, EyeOff, Eye, Trash2, Clock } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/utils/supabaseClient';
import { withErrorBoundary } from '@/components/ErrorBoundary';
import NewRobustImage from '@/components/NewRobustImage';
import { formatPriceWithUnit } from '@/utils/formatters';

interface HiddenListing {
  id: string;
  listing_id: string;
  created_at: string;
  listing: {
    id: string;
    title: string;
    price: number;
    price_unit: string;
    category: string;
    thumbnail_images: string[];
    preview_images: string[];
    image_folder_path: string;
    username: string;
    created_at: string;
  } | null;
}

const HiddenListingsScreen = () => {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [hiddenListings, setHiddenListings] = useState<HiddenListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchHiddenListings = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('hidden_listings')
        .select(`
          id,
          listing_id,
          created_at,
          listing:listings(
            id,
            title,
            price,
            price_unit,
            category,
            thumbnail_images,
            preview_images,
            image_folder_path,
            username,
            created_at
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching hidden listings:', error);
        Alert.alert('Error', 'Failed to load hidden listings');
        return;
      }

      // Transform the data to match the expected interface
      const transformedData = (data || []).map((item: any) => ({
        ...item,
        listing: Array.isArray(item.listing) ? item.listing[0] || null : item.listing
      }));

      setHiddenListings(transformedData);
    } catch (error) {
      console.error('Error fetching hidden listings:', error);
      Alert.alert('Error', 'Failed to load hidden listings');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchHiddenListings();
  }, [fetchHiddenListings]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchHiddenListings();
  }, [fetchHiddenListings]);

  const unhideListing = async (hiddenListingId: string, listingId: string) => {
    try {
      const { error } = await supabase
        .from('hidden_listings')
        .delete()
        .eq('id', hiddenListingId);

      if (error) {
        console.error('Error unhiding listing:', error);
        Alert.alert('Error', 'Failed to unhide listing');
        return;
      }

      // Remove from local state
      setHiddenListings(prev => prev.filter(item => item.id !== hiddenListingId));
      
      Alert.alert('Success', 'Listing has been unhidden and will appear in your feed again.');
    } catch (error) {
      console.error('Error unhiding listing:', error);
      Alert.alert('Error', 'Failed to unhide listing');
    }
  };

  const confirmUnhide = (hiddenListingId: string, listingTitle: string) => {
    Alert.alert(
      'Unhide Listing',
      `Are you sure you want to unhide "${listingTitle}"? It will appear in your feed again.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Unhide', onPress: () => unhideListing(hiddenListingId, hiddenListingId) }
      ]
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderHiddenListing = ({ item }: { item: HiddenListing }) => {
    // Add null checks for the listing data
    if (!item.listing) {
      return (
        <View style={styles.listingCard}>
          <View style={styles.listingContent}>
            <View style={styles.listingImage}>
              <Text style={styles.placeholderText}>No Image</Text>
            </View>
            <View style={styles.listingDetails}>
              <Text style={styles.listingTitle}>Listing Not Found</Text>
              <Text style={styles.sellerText}>This listing may have been deleted</Text>
              <Text style={styles.hiddenDate}>
                Hidden on {formatDate(item.created_at)}
              </Text>
            </View>
          </View>
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.unhideButton}
              onPress={() => confirmUnhide(item.id, 'Unknown Listing')}
            >
              <Eye size={16} color="#22C55E" />
              <Text style={styles.unhideButtonText}>Unhide</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.listingCard}>
        <View style={styles.listingContent}>
          <NewRobustImage
            thumbnailImages={item.listing.thumbnail_images || []}
            previewImages={item.listing.preview_images || []}
            size="thumbnail"
            style={styles.listingImage}
            placeholderText="No Image"
            title={item.listing.title || 'Unknown Title'}
          />
          
          <View style={styles.listingDetails}>
            <Text style={styles.listingTitle} numberOfLines={2}>
              {item.listing.title || 'Unknown Title'}
            </Text>
            <Text style={styles.listingPrice}>
              {formatPriceWithUnit((item.listing.price || 0).toString(), item.listing.price_unit || 'per_item')}
            </Text>
            <Text style={styles.listingCategory}>
              {(item.listing.category || 'general').charAt(0).toUpperCase() + (item.listing.category || 'general').slice(1)}
            </Text>
            <Text style={styles.sellerText}>
              by {item.listing.username || 'Unknown Seller'}
            </Text>
            <Text style={styles.hiddenDate}>
              Hidden on {formatDate(item.created_at)}
            </Text>
          </View>
        </View>
        
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.unhideButton}
            onPress={() => confirmUnhide(item.id, item.listing?.title || 'Unknown Listing')}
          >
            <Eye size={16} color="#22C55E" />
            <Text style={styles.unhideButtonText}>Unhide</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.push('/(tabs)/profile')} style={styles.backButton}>
            <ArrowLeft size={24} color="#1E293B" />
          </TouchableOpacity>
          <Text style={styles.title}>Hidden Listings</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#22C55E" />
          <Text style={styles.loadingText}>Loading hidden listings...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push('/(tabs)/profile')} style={styles.backButton}>
          <ArrowLeft size={24} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.title}>Hidden Listings</Text>
      </View>

      {hiddenListings.length === 0 ? (
        <View style={styles.emptyContainer}>
          <EyeOff size={48} color="#94A3B8" />
          <Text style={styles.emptyTitle}>No Hidden Listings</Text>
          <Text style={styles.emptyText}>
            You haven&apos;t hidden any listings yet. Use the 3-dots menu on any listing to hide it from your feed.
          </Text>
        </View>
      ) : (
        <FlatList
          data={hiddenListings}
          renderItem={renderHiddenListing}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#22C55E']}
              tintColor="#22C55E"
            />
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  title: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#1E293B',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#1E293B',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 24,
  },
  listContainer: {
    padding: 16,
  },
  listingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  listingContent: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  listingImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 12,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#94A3B8',
    textAlign: 'center',
  },
  listingDetails: {
    flex: 1,
  },
  listingTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1E293B',
    marginBottom: 4,
  },
  listingPrice: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#22C55E',
    marginBottom: 4,
  },
  listingCategory: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
    marginBottom: 4,
  },
  sellerText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
    marginBottom: 4,
  },
  hiddenDate: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#94A3B8',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  unhideButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#22C55E',
  },
  unhideButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#22C55E',
    marginLeft: 4,
  },
});

export default withErrorBoundary(HiddenListingsScreen);
