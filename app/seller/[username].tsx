import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { 
  ArrowLeft, 
  Star, 
  MapPin, 
  Calendar, 
  Package,
  User,
  Shield
} from 'lucide-react-native';
import { supabase } from '@/utils/supabaseClient';
import VerificationBadge from '@/components/VerificationBadge';
import { isUserVerified } from '@/utils/verificationUtils';
import { formatPriceWithUnit } from '@/utils/formatters';
import NewRobustImage from '@/components/NewRobustImage';
import HomeRatingDisplay from '@/components/HomeRatingDisplay';

interface SellerProfile {
  username: string;
  name: string;
  avatar_url?: string;
  bio?: string;
  location?: string;
  location_display?: string;
  verification_status?: 'verified' | 'not_verified';
  verified_at?: string;
  expires_at?: string;
  created_at: string;
  isAvailable: boolean;
}

interface SellerListing {
  id: string;
  title: string;
  description: string;
  price: number;
  price_unit: string;
  category: string;
  thumbnail_images?: string[];
  preview_images?: string[];
  image_folder_path?: string;
  created_at: string;
  updated_at: string;
}

export default function SellerProfileScreen() {
  const { username } = useLocalSearchParams<{ username: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const [sellerProfile, setSellerProfile] = useState<SellerProfile | null>(null);
  const [sellerListings, setSellerListings] = useState<SellerListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch seller profile data
  const fetchSellerProfile = async () => {
    if (!username) return;
    
    try {
      const { data, error } = await supabase
        .from('users')
        .select(`
          username,
          name,
          avatar_url,
          bio,
          location,
          location_display,
          verification_status,
          verified_at,
          expires_at,
          created_at,
          isAvailable
        `)
        .eq('username', username)
        .single();

      if (error) {
        throw error;
      }

      setSellerProfile(data);
    } catch (err) {
      console.error('Error fetching seller profile:', err);
      setError('Failed to load seller profile');
    }
  };

  // Fetch seller's listings
  const fetchSellerListings = async () => {
    if (!username) return;
    
    try {
      const { data, error } = await supabase
        .from('listings')
        .select(`
          id,
          title,
          description,
          price,
          price_unit,
          category,
          thumbnail_images,
          preview_images,
          image_folder_path,
          created_at,
          updated_at
        `)
        .eq('username', username)
        .order('updated_at', { ascending: false })
        .limit(12);

      if (error) {
        throw error;
      }

      setSellerListings(data || []);
    } catch (err) {
      console.error('Error fetching seller listings:', err);
      setError('Failed to load seller listings');
    }
  };

  // Load all data
  const loadData = async () => {
    setLoading(true);
    setError(null);
    
    await Promise.all([
      fetchSellerProfile(),
      fetchSellerListings()
    ]);
    
    setLoading(false);
  };

  // Refresh data
  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  // Load data on mount
  useEffect(() => {
    if (username) {
      loadData();
    }
  }, [username]);


  // Render listing item
  const renderListingItem = ({ item }: { item: SellerListing }) => (
    <TouchableOpacity 
      style={styles.listingItem}
      onPress={() => router.push(`/listing-detail?id=${item.id}`)}
    >
      <NewRobustImage
        thumbnailImages={item.thumbnail_images}
        previewImages={item.preview_images}
        imageFolderPath={item.image_folder_path}
        style={styles.listingImage}
        placeholderText="No Image"
        size="thumbnail"
        title={item.title}
      />
      <View style={styles.listingDetails}>
        <Text style={styles.listingTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.listingPrice}>
          {formatPriceWithUnit(item.price.toString(), item.price_unit)}
        </Text>
        <Text style={styles.listingCategory}>
          {item.category}
        </Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color="#1E293B" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Seller Profile</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#22C55E" />
          <Text style={styles.loadingText}>Loading seller profile...</Text>
        </View>
      </View>
    );
  }

  if (error || !sellerProfile) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color="#1E293B" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Seller Profile</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error || 'Seller not found'}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadData}>
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
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Seller Profile</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView 
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#22C55E']}
            tintColor="#22C55E"
          />
        }
      >
        {/* Seller Info Section */}
        <View style={styles.sellerInfoSection}>
          <View style={styles.sellerHeader}>
            <Image 
              source={{ uri: sellerProfile.avatar_url || 'https://api.dicebear.com/7.x/pixel-art/png?seed=default' }}
              style={styles.sellerAvatar}
            />
            <View style={styles.sellerDetails}>
              <View style={styles.sellerNameRow}>
                <Text style={styles.sellerName}>{sellerProfile.name}</Text>
                {isUserVerified(sellerProfile) && <VerificationBadge size="medium" />}
              </View>
              <Text style={styles.sellerUsername}>@{sellerProfile.username}</Text>
              
              {/* Seller Stats */}
              <View style={styles.sellerStats}>
                <View style={styles.statItem}>
                  <Calendar size={12} color="#64748B" />
                  <Text style={styles.statText}>
                    Joined {new Date(sellerProfile.created_at).toLocaleDateString('en-US', { 
                      month: 'short', 
                      year: 'numeric' 
                    })}
                  </Text>
                </View>
                {isUserVerified(sellerProfile) && (
                  <View style={styles.statItem}>
                    <Shield size={12} color="#22C55E" />
                    <Text style={[styles.statText, { color: '#22C55E' }]}>
                      Verified Seller
                    </Text>
                  </View>
                )}
              </View>
              
              {/* Rating Display */}
              <View style={styles.ratingSection}>
                <HomeRatingDisplay 
                  username={sellerProfile.username}
                  size="medium"
                  showCount={true}
                  showAverage={true}
                  compact={false}
                />
              </View>

              {/* Location */}
              <View style={styles.locationRow}>
                <MapPin size={16} color="#64748B" />
                <Text style={styles.locationText}>
                  {sellerProfile.location_display || sellerProfile.location || 'Location not specified'}
                </Text>
              </View>

              {/* Availability Status */}
              <View style={styles.availabilityRow}>
                <View style={[
                  styles.availabilityBadge,
                  sellerProfile.isAvailable ? styles.available : styles.unavailable
                ]}>
                  <View style={[
                    styles.availabilityDot,
                    { backgroundColor: sellerProfile.isAvailable ? '#22C55E' : '#EF4444' }
                  ]} />
                  <Text style={[
                    styles.availabilityText,
                    { color: sellerProfile.isAvailable ? '#22C55E' : '#EF4444' }
                  ]}>
                    {sellerProfile.isAvailable ? 'Available' : 'Unavailable'}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Bio Section */}
          <View style={styles.bioSection}>
            <Text style={styles.bioTitle}>About</Text>
            <Text style={styles.bioText}>
              {sellerProfile.bio || 'No bio available for this seller.'}
            </Text>
          </View>

        </View>

        {/* Listings Section */}
        <View style={styles.listingsSection}>
          <View style={styles.listingsHeader}>
            <Text style={styles.listingsTitle}>
              Recent Listings ({sellerListings.length})
            </Text>
          </View>

          {sellerListings.length > 0 ? (
            <FlatList
              data={sellerListings}
              renderItem={renderListingItem}
              keyExtractor={(item) => item.id}
              numColumns={2}
              scrollEnabled={false}
              contentContainerStyle={styles.listingsGrid}
            />
          ) : (
            <View style={styles.noListingsContainer}>
              <Package size={48} color="#94A3B8" />
              <Text style={styles.noListingsTitle}>No Active Listings</Text>
              <Text style={styles.noListingsText}>
                This seller doesn&apos;t have any active listings at the moment.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    textAlign: 'center',
    marginHorizontal: 16,
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  sellerInfoSection: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sellerHeader: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  sellerAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginRight: 16,
  },
  sellerDetails: {
    flex: 1,
  },
  sellerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  sellerName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
    marginRight: 8,
  },
  sellerUsername: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 12,
  },
  sellerStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  ratingSection: {
    marginBottom: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
  },
  locationText: {
    fontSize: 14,
    color: '#64748B',
    marginLeft: 8,
    flex: 1,
  },
  availabilityRow: {
    marginBottom: 16,
  },
  availabilityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
  },
  available: {
    backgroundColor: '#DCFCE7',
  },
  unavailable: {
    backgroundColor: '#FEF2F2',
  },
  availabilityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  availabilityText: {
    fontSize: 12,
    fontWeight: '500',
  },
  bioSection: {
    marginBottom: 20,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
  },
  bioTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 8,
  },
  bioText: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 22,
  },
  listingsSection: {
    margin: 16,
    marginTop: 0,
  },
  listingsHeader: {
    marginBottom: 16,
  },
  listingsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
  },
  listingsGrid: {
    paddingBottom: 16,
  },
  listingItem: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    margin: 4,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  listingImage: {
    width: '100%',
    height: 120,
    borderRadius: 6,
    marginBottom: 8,
  },
  listingDetails: {
    flex: 1,
  },
  listingTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 4,
  },
  listingPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: '#22C55E',
    marginBottom: 2,
  },
  listingCategory: {
    fontSize: 12,
    color: '#64748B',
    textTransform: 'capitalize',
  },
  noListingsContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
  },
  noListingsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 12,
    marginBottom: 4,
  },
  noListingsText: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 16,
    color: '#64748B',
    marginTop: 12,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
    marginBottom: 16,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#22C55E',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
