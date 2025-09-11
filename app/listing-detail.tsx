import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Text,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MoreVertical } from 'lucide-react-native';
import { supabase } from '@/utils/supabaseClient';
import { imageCache } from '@/utils/imageCache';
import { reportListing, hideListing, blockUser } from '@/utils/contentManagement';
import { useAuth } from '@/hooks/useAuth';

import { ErrorBoundary } from '@/components/ErrorBoundary';

// Import our optimized components
import ListingHeroImage from '@/components/ListingHeroImage';
import ListingInfoCard from '@/components/ListingInfoCard';
import SellerInfoSection from '@/components/SellerInfoSection';
import ListingLocationMap from '@/components/ListingLocationMap';
import SellerListingsCarousel from '@/components/SellerListingsCarousel';
import ListingActionButtons from '@/components/ListingActionButtons';

// Types
interface Listing {
  id: string;
  title: string;
  description: string;
  price: number;
  price_unit: string;
  category: string;
  thumbnail_images: string[];
  preview_images: string[];
  image_folder_path: string;
  username: string;
  latitude: number;
  longitude: number;
  created_at: string;
  is_active: boolean;
}

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

function ListingDetailScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id, sellerData } = useLocalSearchParams();
  const { user } = useAuth();
  
  // State management
  const [listing, setListing] = useState<Listing | null>(null);
  const [sellerInfo, setSellerInfo] = useState<SellerInfo | null>(null);
  const [sellerListings, setSellerListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Memoized values to prevent unnecessary re-renders
  const listingId = useMemo(() => id as string, [id]);
  
  // Helper function to fetch seller data from database
  const fetchSellerFromDatabase = async (username: string) => {
    const { data: sellerData, error: sellerError } = await supabase
      .from('users')
      .select('username, name, avatar_url, phone, location_display, bio, verification_status, verified_at, expires_at')
      .eq('username', username)
      .single();
    
    if (sellerError) throw sellerError;
    setSellerInfo(sellerData);
  };
  
  // Fetch listing data
  const fetchListingData = useCallback(async () => {
    if (!listingId) return;
    
    try {
      setLoading(true);
      setError(null);
      
      // Check image cache first for instant loading
      let cachedImages = null;
      try {
        if (imageCache.isReady()) {
          cachedImages = imageCache.getListingImages(listingId);
        }
      } catch (error) {
        console.warn('Failed to get cached images:', error);
      }
      
      // Fetch listing details
      const { data: listingData, error: listingError } = await supabase
        .from('listings')
        .select('*')
        .eq('id', listingId)
        .single();
      
      if (listingError) throw listingError;
      if (!listingData) throw new Error('Listing not found');
      
      // If we have cached images, merge them with the listing data
      if (cachedImages) {
        listingData.thumbnail_images = cachedImages.thumbnail_images;
        listingData.preview_images = cachedImages.preview_images;
        listingData.image_folder_path = cachedImages.image_folder_path;
      }
      
      setListing(listingData);
      
      // Use passed seller data if available, otherwise fetch from database
      if (sellerData) {
        try {
          const parsedSellerData = JSON.parse(sellerData as string);
          setSellerInfo(parsedSellerData);
        } catch (error) {
          // If parsing fails, fall back to database fetch
          await fetchSellerFromDatabase(listingData.username);
        }
      } else {
        await fetchSellerFromDatabase(listingData.username);
      }
      
      // Fetch seller's other listings
      const { data: otherListings, error: listingsError } = await supabase
        .from('listings')
        .select('*')
        .eq('username', listingData.username)
        .neq('id', listingId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (listingsError) throw listingsError;
      setSellerListings(otherListings || []);
      
    } catch (err) {
      // Error fetching listing data
      setError(err instanceof Error ? err.message : 'Failed to load listing');
    } finally {
      setLoading(false);
    }
  }, [listingId]);

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    
    // Clear image cache for this listing to get fresh images
    if (listingId) {
      // Note: We don't clear the cache here as it might be useful for other views
      // The cache will auto-expire after 5 minutes anyway
    }
    
    await fetchListingData();
    setRefreshing(false);
  }, [fetchListingData, listingId]);

  // Load data on mount and when listingId changes
  useEffect(() => {
    // Check if we have cached images first
    try {
      if (imageCache.isReady()) {
        const cachedImages = imageCache.getListingImages(listingId);
        
        if (cachedImages) {
          // We have cached images, show them immediately
          setListing({
            id: listingId,
            title: 'Loading...', // Placeholder
            description: '',
            price: 0,
            price_unit: 'per_item',
            category: 'other',
            thumbnail_images: cachedImages.thumbnail_images,
            preview_images: cachedImages.preview_images,
            image_folder_path: cachedImages.image_folder_path,
            username: '',
            latitude: 0,
            longitude: 0,
            created_at: '',
            is_active: true
          } as Listing);
          setLoading(false);
        }
      }
    } catch (error) {
      console.warn('Failed to check image cache:', error);
    }
    
    // Always fetch fresh data from database
    fetchListingData();
  }, [fetchListingData, listingId]);

  // Handle navigation to other listings
  const handleListingPress = useCallback((listingId: string) => {
    router.push(`/listing-detail?id=${listingId}`);
  }, [router]);

  // Handle report listing
  const handleReport = useCallback(async () => {
    if (!user || !listing) {
      Alert.alert('Error', 'You must be logged in to report listings');
      return;
    }

    try {
      const result = await reportListing({
        listing_id: listing.id,
        seller_username: listing.username,
        reason: 'inappropriate_content',
        description: 'Reported via listing detail page'
      });

      if (!result.success) {
        Alert.alert('Error', result.error || 'Failed to report listing. Please try again.');
        return;
      }

      // Ask if user wants to hide the listing after reporting
      Alert.alert(
        'Report Submitted',
        'Thank you for your report. We will review this listing and take appropriate action.\n\nWould you like to hide this listing from your feed?',
        [
          {
            text: 'No, Keep Visible',
            style: 'cancel'
          },
          {
            text: 'Yes, Hide It',
            onPress: async () => {
              // Hide the listing
              const hideResult = await hideListing(listing.id);
              if (hideResult.success) {
                Alert.alert(
                  'Listing Hidden',
                  'This listing has been hidden from your feed.',
                  [{ text: 'OK', onPress: () => router.back() }]
                );
              } else {
                Alert.alert(
                  'Report Submitted',
                  'Your report was submitted, but we couldn\'t hide the listing. You can hide it manually from the listing options.',
                  [{ text: 'OK' }]
                );
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error reporting listing:', error);
      Alert.alert('Error', 'Failed to report listing. Please try again.');
    }
  }, [user, listing, router]);

  // Handle hide listing
  const handleHide = useCallback(async () => {
    if (!user || !listing) {
      Alert.alert('Error', 'You must be logged in to hide listings');
      return;
    }

    try {
      const result = await hideListing(listing.id);

      if (!result.success) {
        Alert.alert('Error', result.error || 'Failed to hide listing. Please try again.');
        return;
      }

      Alert.alert(
        'Listing Hidden',
        'This listing has been hidden from your feed.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error) {
      console.error('Error hiding listing:', error);
      Alert.alert('Error', 'Failed to hide listing. Please try again.');
    }
  }, [user, listing, router]);

  // Handle block user
  const handleBlock = useCallback(async () => {
    if (!user || !listing) {
      Alert.alert('Error', 'You must be logged in to block users');
      return;
    }

    try {
      // First, get the seller's user ID
      const { data: sellerData, error: sellerError } = await supabase
        .from('users')
        .select('id')
        .eq('username', listing.username)
        .single();

      if (sellerError || !sellerData) {
        console.error('Error finding seller:', sellerError);
        Alert.alert('Error', 'Failed to find seller. Please try again.');
        return;
      }

      const result = await blockUser(sellerData.id);

      if (!result.success) {
        Alert.alert('Error', result.error || 'Failed to block user. Please try again.');
        return;
      }

      Alert.alert(
        'User Blocked',
        `You have blocked ${listing.username}. You will no longer see their listings.`,
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error) {
      console.error('Error blocking user:', error);
      Alert.alert('Error', 'Failed to block user. Please try again.');
    }
  }, [user, listing, router]);

  // Show options menu
  const showOptionsMenu = useCallback(() => {
    Alert.alert(
      'Listing Options',
      `What would you like to do with this listing?`,
      [
        {
          text: 'Report Listing',
          style: 'destructive',
          onPress: handleReport
        },
        {
          text: 'Hide Listing',
          onPress: handleHide
        },
        {
          text: `Block ${listing?.username}`,
          style: 'destructive',
          onPress: handleBlock
        },
        {
          text: 'Cancel',
          style: 'cancel'
        }
      ],
      { cancelable: true }
    );
  }, [handleReport, handleHide, handleBlock, listing?.username]);









  // Loading state
  if (loading) {
    return (
      <View style={[styles.loadingContainer, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color="#22C55E" />
        <Text style={styles.loadingText}>Loading listing...</Text>
      </View>
    );
  }

  // Error state
  if (error || !listing) {
    return (
      <View style={[styles.errorContainer, { paddingTop: insets.top }]}>
        <Text style={styles.errorText}>
          {error || 'Failed to load listing'}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#22C55E']}
          />
        }
      >
        {/* Hero Image Section */}
        <View style={styles.heroImageContainer}>
          <ListingHeroImage
            images={listing.thumbnail_images} // Use thumbnail_images as fallback for images
            thumbnailImages={listing.thumbnail_images}
            previewImages={listing.preview_images}
            imageFolderPath={listing.image_folder_path}
            title={listing.title}
            onBackPress={() => router.back()}
          />
          
          {/* Floating Options Button */}
          <TouchableOpacity
            style={styles.optionsButton}
            onPress={showOptionsMenu}
            activeOpacity={0.8}
          >
            <MoreVertical size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
        

        


        {/* Listing Information */}
        <ListingInfoCard
          title={listing.title}
          description={listing.description}
          price={listing.price}
          priceUnit={listing.price_unit}
          category={listing.category}
          createdAt={listing.created_at}
          isActive={listing.is_active}
        />

        {/* Seller Information */}
        {sellerInfo && (
          <SellerInfoSection
            seller={sellerInfo}
            onPress={() => router.push(`/seller/${sellerInfo.username}` as any)}
          />
        )}

        {/* Action Buttons */}
        <ListingActionButtons
          listing={listing}
          sellerInfo={sellerInfo}
        />

        {/* Location Map */}
        {listing.latitude && listing.longitude && (
          <ListingLocationMap
            latitude={listing.latitude}
            longitude={listing.longitude}
            title={listing.title}
            sellerName={sellerInfo?.name || 'Seller'}
          />
        )}

        {/* Seller's Other Listings */}
        {sellerListings.length > 0 && (
          <SellerListingsCarousel
            listings={sellerListings}
            onListingPress={handleListingPress}
            sellerName={sellerInfo?.name || 'Seller'}
            sellerUsername={listing?.username}
            onReport={() => {
              // Refresh the page to hide reported item
              router.replace(`/listing-detail?id=${listing?.id}`);
            }}
            onHide={() => {
              // Refresh the page to hide the item
              router.replace(`/listing-detail?id=${listing?.id}`);
            }}
            onBlock={() => {
              // Navigate back to home as user is blocked
              router.back();
            }}
          />
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollView: {
    flex: 1,
  },
  heroImageContainer: {
    position: 'relative',
  },
  optionsButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748B',
    fontFamily: 'Inter-Regular',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 32,
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
    textAlign: 'center',
    fontFamily: 'Inter-Medium',
  },
  

});

// Wrap with Error Boundary for better error handling
export default function ListingDetailScreenWithErrorBoundary() {
  return (
    <ErrorBoundary>
      <ListingDetailScreen />
    </ErrorBoundary>
  );
}
