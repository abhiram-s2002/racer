import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Text,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '@/utils/supabaseClient';

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
  images: string[];
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
}

function ListingDetailScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams();
  
  // State management
  const [listing, setListing] = useState<Listing | null>(null);
  const [sellerInfo, setSellerInfo] = useState<SellerInfo | null>(null);
  const [sellerListings, setSellerListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Memoized values to prevent unnecessary re-renders
  const listingId = useMemo(() => id as string, [id]);
  
  // Fetch listing data
  const fetchListingData = useCallback(async () => {
    if (!listingId) return;
    
    try {
      setLoading(true);
      setError(null);
      
      // Fetch listing details
      const { data: listingData, error: listingError } = await supabase
        .from('listings')
        .select('*')
        .eq('id', listingId)
        .single();
      
      if (listingError) throw listingError;
      if (!listingData) throw new Error('Listing not found');
      
      setListing(listingData);
      
      // Fetch seller info
      const { data: sellerData, error: sellerError } = await supabase
        .from('users')
        .select('username, name, avatar_url, phone, location_display, bio')
        .eq('username', listingData.username)
        .single();
      
      if (sellerError) throw sellerError;
      setSellerInfo(sellerData);
      
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
      console.error('Error fetching listing data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load listing');
    } finally {
      setLoading(false);
    }
  }, [listingId]);

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchListingData();
    setRefreshing(false);
  }, [fetchListingData]);

  // Load data on mount and when listingId changes
  useEffect(() => {
    fetchListingData();
  }, [fetchListingData]);

  // Handle navigation to other listings
  const handleListingPress = useCallback((listingId: string) => {
    router.push(`/listing-detail?id=${listingId}`);
  }, [router]);



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
        <ListingHeroImage
          images={listing.images}
          thumbnailImages={listing.thumbnail_images}
          previewImages={listing.preview_images}
          imageFolderPath={listing.image_folder_path}
          title={listing.title}
          onBackPress={() => router.back()}
        />
        


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
