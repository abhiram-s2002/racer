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
import UnifiedSellerProfileCard from '@/components/UnifiedSellerProfileCard';
import SingleColumnListingItem from '@/components/SingleColumnListingItem';

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
  created_at: string;
  view_count?: number;
  ping_count?: number;
  expires_at?: string;
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
          created_at,
          view_count,
          ping_count,
          expires_at
        `)
        .eq('username', username)
        .order('created_at', { ascending: false })
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
    <SingleColumnListingItem
      listing={item}
      onPress={(listingId) => router.push(`/listing-detail?id=${listingId}`)}
    />
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
        {/* Unified Seller Profile */}
        <UnifiedSellerProfileCard seller={sellerProfile} />

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
              scrollEnabled={false}
              contentContainerStyle={styles.listingsContainer}
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
    backgroundColor: '#F9FAFB',
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
  listingsSection: {
    margin: 16,
    marginTop: 0,
  },
  listingsHeader: {
    marginBottom: 16,
  },
  listingsTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
  },
  listingsContainer: {
    paddingBottom: 16,
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
