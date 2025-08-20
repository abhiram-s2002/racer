/* global console */
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Dimensions,
  Alert,
  Linking,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, MapPin, Phone, MessageCircle } from 'lucide-react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { getListings, Listing as SupabaseListing } from '@/utils/listingSupabase';
import { useIsFocused } from '@react-navigation/native';
import { supabase } from '@/utils/supabaseClient';
import { LocationUtils } from '@/utils/locationUtils';
import MapView, { Marker } from 'react-native-maps';

import { formatPriceWithUnit } from '@/utils/formatters';

const { width } = Dimensions.get('window');
const ITEM_WIDTH = (width - 36) / 2;

export default function SellerProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { sellerId, sellerName, sellerAvatar } = useLocalSearchParams();
  const [sellerListings, setSellerListings] = useState<SupabaseListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [showActiveOnly, setShowActiveOnly] = useState(false);
  const [sellerInfo, setSellerInfo] = useState<any>(null);
  const [showMap, setShowMap] = useState(false);
  const isFocused = useIsFocused();

  // Load seller listings when screen is focused
  useEffect(() => {
    if (isFocused) {
      loadSellerListings();
      loadSellerInfo();
    }
  }, [isFocused, sellerId]);

  const loadSellerListings = async () => {
    try {
      setLoading(true);
      const allListings = await getListings();
      // Use seller_username instead of seller_id
      const sellerListings = allListings.filter(listing => listing.username === sellerId);
      setSellerListings(sellerListings);
    } catch (error) {
      console.error('Error loading seller listings:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSellerInfo = async () => {
    if (sellerId) {
      // Fetching seller info
      const { data: user, error } = await supabase
        .from('users')
        .select('username, name, avatar_url, phone, location_display, bio') // REMOVED latitude, longitude
        .eq('username', sellerId)
        .maybeSingle();
      if (error) {
        console.error('Supabase error loading seller info:', error);
      }
      if (!user) {
        console.warn('No user found for sellerId:', sellerId);
      } else {
        // Loaded seller info
      }
      setSellerInfo(user);
    }
  };

  const handlePingSeller = (listing: SupabaseListing) => {
    // Navigate to home screen with the listing for ping
    router.push({ pathname: '/', params: { pingListingId: listing.id } });
  };

  const handleCallSeller = () => {
    const phoneToCall = sellerInfo?.phone;
    if (phoneToCall) {
      Linking.openURL(`tel:${phoneToCall}`);
    } else {
      Alert.alert(
        'No Phone Number',
        'This seller has not provided a phone number.',
        [{ text: 'OK', style: 'default' }]
      );
    }
  };

  const handleMessageSeller = () => {
    // Navigate to messages or create a chat
    router.push('/messages');
  };

  const filteredListings = showActiveOnly 
    ? sellerListings.filter(listing => listing.is_active)
    : sellerListings;

  const activeListings = sellerListings.filter(listing => listing.is_active);
  const inactiveListings = sellerListings.filter(listing => !listing.is_active);

  // Always use the latest listing's coordinates for the map and directions
  const getLatestListingCoordinates = () => {
    if (sellerListings.length === 0) return { latitude: null, longitude: null };
    // Sort listings by created_at descending (assuming created_at exists)
    const sortedListings = [...sellerListings].sort((a, b) => {
      const dateA = new Date(a.created_at || '');
      const dateB = new Date(b.created_at || '');
      return dateB.getTime() - dateA.getTime();
    });
    const latest = sortedListings[0];
    return { latitude: latest.latitude, longitude: latest.longitude };
  };

  const { latitude: sellerLat, longitude: sellerLng } = getLatestListingCoordinates();

  const renderListingItem = ({ item }: { item: SupabaseListing }) => {
    return (
      <View style={styles.listingCard}>
        <Image 
          source={{ uri: (item.images && item.images[0]) || 'https://images.pexels.com/photos/1327838/pexels-photo-1327838.jpeg?auto=compress&cs=tinysrgb&w=400' }} 
          style={styles.listingImage} 
          resizeMode="cover" 
        />
        
        {/* Status badge */}
        <View style={styles.statusBadgeContainer}>
          <View style={[styles.statusBadge, item.is_active ? styles.activeBadge : styles.inactiveBadge]}>
            <Text style={[styles.statusText, item.is_active ? styles.activeText : styles.inactiveText]}>
              {item.is_active ? 'Active' : 'Inactive'}
            </Text>
          </View>
        </View>

        <View style={styles.listingContent}>
          <Text style={styles.listingTitle}>{item.title}</Text>
          <View style={styles.priceContainer}>
            <Text style={styles.listingPrice}>
              {formatPriceWithUnit(item.price, item.price_unit)}
            </Text>
          </View>
          <Text style={styles.listingCategory}>{item.category}</Text>

          <View style={styles.actionButtons}>
            <TouchableOpacity 
              style={styles.callButton}
              onPress={() => {
                const phoneToCall = sellerInfo?.phone;
                if (phoneToCall) {
                  Linking.openURL(`tel:${phoneToCall}`);
                } else {
                  Alert.alert('No phone number available');
                }
              }}
            >
              <Phone size={16} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.messageButton} 
              onPress={() => handlePingSeller(item)}
            >
              <MessageCircle size={16} color="#22C55E" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.title}>Seller Profile</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Seller Info */}
      {!sellerInfo ? (
        <View style={{ padding: 32, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#22C55E" style={{ marginBottom: 16 }} />
          <Text style={{ color: '#64748B', fontSize: 16 }}>Loading seller info...</Text>
          <Text style={{ color: 'red', textAlign: 'center', marginTop: 16 }}>
            Seller not found or missing in database. Check sellerId and user data.
          </Text>
        </View>
      ) : (
      <View style={styles.sellerInfoSection}>
        <View style={styles.sellerHeader}>
          <Image 
              source={{ uri: sellerInfo.avatar_url || (sellerAvatar as string) }} 
            style={styles.sellerAvatar} 
          />
          <View style={styles.sellerDetails}>
              <Text style={styles.sellerName}>{sellerInfo.name || sellerName}</Text>
            <View style={styles.locationRow}>
              <MapPin size={16} color="#64748B" />
              <Text style={styles.distance}>
                  {sellerInfo.location_display ? 
                  LocationUtils.formatLocationDisplay(sellerInfo.location_display) : 
                  'No location set'
                }
              </Text>
            </View>
          </View>
        </View>

        {/* Contact Buttons */}
        <View style={styles.contactButtons}>
          <TouchableOpacity 
            style={[styles.contactButton, !sellerInfo?.phone && styles.disabledContactButton]} 
            onPress={handleCallSeller}
            disabled={!sellerInfo?.phone}
          >
            <Phone size={20} color={sellerInfo?.phone ? "#22C55E" : "#94A3B8"} />
            <Text style={[styles.contactButtonText, !sellerInfo?.phone && styles.disabledContactButtonText]}>
              {sellerInfo?.phone ? 'Call' : 'No Phone'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.contactButton} onPress={handleMessageSeller}>
            <MessageCircle size={20} color="#22C55E" />
            <Text style={styles.contactButtonText}>Message</Text>
          </TouchableOpacity>
            <TouchableOpacity
              style={styles.contactButton}
              onPress={() => setShowMap((prev) => !prev)}
              disabled={!(sellerLat && sellerLng)}
            >
              <MapPin size={20} color="#22C55E" />
              <Text style={styles.contactButtonText}>Location</Text>
            </TouchableOpacity>
        </View>

          {/* Embedded Map and Directions Button (shown when showMap is true) */}
          {showMap && sellerLat && sellerLng && (
            <View style={{ marginBottom: 16 }}>
              <MapView
                style={{ width: '100%', height: 180, borderRadius: 12 }}
                initialRegion={{
                  latitude: sellerLat,
                  longitude: sellerLng,
                  latitudeDelta: 0.01,
                  longitudeDelta: 0.01,
                }}
                pointerEvents="none"
              >
                <Marker
                  coordinate={{
                    latitude: sellerLat,
                    longitude: sellerLng,
                  }}
                  title={sellerInfo.name || sellerName}
                  description={sellerInfo.location_display}
                />
              </MapView>
              <TouchableOpacity
                style={{
                  marginTop: 10,
                  backgroundColor: '#22C55E',
                  borderRadius: 8,
                  paddingVertical: 12,
                  alignItems: 'center',
                  flexDirection: 'row',
                  justifyContent: 'center',
                  gap: 8,
                }}
                onPress={() => {
                  const lat = sellerLat;
                  const lng = sellerLng;
                  const label = encodeURIComponent(sellerInfo.name || sellerName || 'Seller Location');
                  const url =
                    Platform.OS === 'ios'
                      ? `http://maps.apple.com/?daddr=${lat},${lng}&q=${label}`
                      : `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
                  Linking.openURL(url);
                }}
              >
                <MapPin size={18} color="#fff" />
                <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 15 }}>Get Directions</Text>
              </TouchableOpacity>
            </View>
          )}

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{sellerListings.length}</Text>
            <Text style={styles.statLabel}>Total Listings</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{activeListings.length}</Text>
            <Text style={styles.statLabel}>Active</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{inactiveListings.length}</Text>
            <Text style={styles.statLabel}>Inactive</Text>
          </View>
        </View>
      </View>
      )}

      {/* Filter Toggle */}
      <View style={styles.filterSection}>
        <TouchableOpacity 
          style={[styles.filterButton, !showActiveOnly && styles.activeFilterButton]}
          onPress={() => setShowActiveOnly(false)}
        >
          <Text style={[styles.filterText, !showActiveOnly && styles.activeFilterText]}>
            All ({sellerListings.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.filterButton, showActiveOnly && styles.activeFilterButton]}
          onPress={() => setShowActiveOnly(true)}
        >
          <Text style={[styles.filterText, showActiveOnly && styles.activeFilterText]}>
            Active ({activeListings.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Listings */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading listings...</Text>
        </View>
      ) : filteredListings.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>No listings found</Text>
          <Text style={styles.emptySubtitle}>
            {showActiveOnly ? 'This seller has no active listings' : 'This seller has no listings'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredListings}
          renderItem={renderListingItem}
          keyExtractor={(item) => item.id || ''}
          numColumns={2}
          columnWrapperStyle={styles.row}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listingsContainer}
          onRefresh={loadSellerListings}
          refreshing={loading}
        />
      )}
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
  title: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#1E293B',
  },
  placeholder: {
    width: 32,
  },
  sellerInfoSection: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  sellerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sellerAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 12,
  },
  sellerDetails: {
    flex: 1,
  },
  sellerName: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#1E293B',
    marginBottom: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  distance: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
    marginLeft: 4,
  },
  contactButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  contactButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  contactButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#22C55E',
  },
  disabledContactButton: {
    backgroundColor: '#F1F5F9',
    opacity: 0.6,
  },
  disabledContactButtonText: {
    color: '#94A3B8',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#1E293B',
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
    marginTop: 2,
  },
  filterSection: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  filterButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    marginHorizontal: 4,
  },
  activeFilterButton: {
    backgroundColor: '#22C55E',
  },
  filterText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#64748B',
  },
  activeFilterText: {
    color: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
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
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
    textAlign: 'center',
  },
  listingsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  row: {
    justifyContent: 'space-between',
  },
  listingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    marginBottom: 10,
    width: ITEM_WIDTH,
    boxShadow: '0px 2px 6px rgba(0,0,0,0.1)',
    elevation: 3,
    overflow: 'hidden',
  },
  listingImage: {
    width: '100%',
    height: 90,
  },
  statusBadgeContainer: {
    position: 'absolute',
    top: 4,
    left: 4,
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  activeBadge: {
    backgroundColor: '#DCFCE7',
  },
  inactiveBadge: {
    backgroundColor: '#FEF2F2',
  },
  statusText: {
    fontSize: 8,
    fontFamily: 'Inter-Medium',
  },
  activeText: {
    color: '#16A34A',
  },
  inactiveText: {
    color: '#EF4444',
  },
  listingContent: {
    padding: 8,
  },
  listingTitle: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#1E293B',
    marginBottom: 3,
    minHeight: 28,
  },
  listingPrice: {
    fontSize: 13,
    fontFamily: 'Inter-Bold',
    color: '#22C55E',
    marginBottom: 2,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  priceUnit: {
    fontSize: 10,
    fontFamily: 'Inter-Medium',
    color: '#64748B',
    marginLeft: 4,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 6,
  },
  listingCategory: {
    fontSize: 10,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
    marginBottom: 5,
    textTransform: 'capitalize',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 4,
  },
  callButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#22C55E',
    paddingVertical: 5,
    borderRadius: 3,
  },
  messageButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
    paddingVertical: 5,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: '#22C55E',
  },
}); 