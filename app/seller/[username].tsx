import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Share,
  Platform,
  Linking,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { 
  ArrowLeft, 
  Package,
  MoreVertical,
  Phone,
  MessageCircle,
  MapPin,
  Share2,
  X,
  UserX
} from 'lucide-react-native';
import { supabase } from '@/utils/supabaseClient';
import { blockUser } from '@/utils/contentManagement';
import { useAuth } from '@/hooks/useAuth';
import UnifiedSellerProfileCard from '@/components/UnifiedSellerProfileCard';
import SingleColumnListingItem from '@/components/SingleColumnListingItem';
import SingleColumnRequestItem from '@/components/SingleColumnRequestItem';
import { getPhoneWithPermission } from '@/utils/phoneSharingUtils';
import { useLocation } from '@/hooks/useLocation';
import { createWhatsAppURL, createWhatsAppWebURL } from '@/utils/whatsappMessageFormatter';

interface SellerProfile {
  id?: string;
  username: string;
  name: string;
  avatar_url?: string;
  bio?: string;
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

interface SellerRequest {
  id: string;
  title: string;
  description: string;
  category: string;
  budget_min?: number;
  budget_max?: number;
  thumbnail_images?: string[];
  preview_images?: string[];
  created_at: string;
  expires_at?: string;
}

export default function SellerProfileScreen() {
  const { username } = useLocalSearchParams<{ username: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { latitude, longitude } = useLocation();
  
  const [sellerProfile, setSellerProfile] = useState<SellerProfile | null>(null);
  const [sellerListings, setSellerListings] = useState<SellerListing[]>([]);
  const [sellerRequests, setSellerRequests] = useState<SellerRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showOptionsModal, setShowOptionsModal] = useState(false);

  // Fetch seller profile data
  const fetchSellerProfile = async () => {
    if (!username) return;
    
    try {
      const { data, error } = await supabase
        .from('users')
        .select(`
          id,
          username,
          name,
          avatar_url,
          bio,
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

  // Fetch seller's requests
  const fetchSellerRequests = async () => {
    if (!username) return;
    
    try {
      const { data, error } = await supabase
        .from('requests')
        .select(`
          id,
          title,
          description,
          category,
          budget_min,
          budget_max,
          thumbnail_images,
          preview_images,
          created_at,
          expires_at
        `)
        .eq('requester_username', username)
        .order('created_at', { ascending: false })
        .limit(12);

      if (error) {
        throw error;
      }

      setSellerRequests(data || []);
    } catch (err) {
      console.error('Error fetching seller requests:', err);
      setError('Failed to load seller requests');
    }
  };

  // Load all data
  const loadData = async () => {
    setLoading(true);
    setError(null);
    
    await Promise.all([
      fetchSellerProfile(),
      fetchSellerListings(),
      fetchSellerRequests(),
    ]);
    
    setLoading(false);
  };

  // Refresh data
  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  // Handle share seller profile
  const handleShareSellerProfile = async () => {
    if (!sellerProfile) return;

    try {
      // Generate deep link for the seller profile
      const deepLink = `geomart://seller/${sellerProfile.username}`;
      
      // Create share message with seller details
      const shareMessage = `Check out ${sellerProfile.name} (@${sellerProfile.username}) on GeoMart!\n\n` +
        `${sellerProfile.bio ? `"${sellerProfile.bio}"\n\n` : ''}` +
        `📍 ${sellerProfile.location_display || 'Location not specified'}\n` +
        `🛍️ ${sellerListings.length} active listings\n` +
        `${sellerProfile.verification_status === 'verified' ? '✅ Verified Seller\n' : ''}` +
        `\nView their profile: ${deepLink}\n\n` +
        `Download GeoMart: https://play.google.com/store/apps/details?id=com.geomart.app`;

      await Share.share({
        message: shareMessage,
        url: deepLink, // This will be used by apps that support URL sharing
        title: `Share ${sellerProfile.name} - GeoMart`,
      });
    } catch (error) {
      console.error('Error sharing seller profile:', error);
      Alert.alert('Error', 'Failed to share seller profile. Please try again.');
    }
  };

  // Handle block user
  const handleBlockUser = async () => {
    if (!user || !sellerProfile) {
      Alert.alert('Error', 'You must be logged in to block users');
      return;
    }

    try {
      // First, get the seller's user ID
      const { data: sellerData, error: sellerError } = await supabase
        .from('users')
        .select('id')
        .eq('username', sellerProfile.username)
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
        `You have blocked ${sellerProfile.username}. You will no longer see their listings.`,
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error) {
      console.error('Error blocking user:', error);
      Alert.alert('Error', 'Failed to block user. Please try again.');
    }
  };

  // Show options menu
  const showOptionsMenu = () => {
    setShowOptionsModal(true);
  };

  // Handle option selection
  const handleOptionSelect = (option: string) => {
    setShowOptionsModal(false);
    
    switch (option) {
      case 'share':
        handleShareSellerProfile();
        break;
      case 'block':
        handleBlockUser();
        break;
    }
  };

  // Load data on mount
  useEffect(() => {
    if (username) {
      loadData();
    }
  }, [username]);

  const handleCallSeller = useCallback(async () => {
    try {
      if (!sellerProfile) return;
      const { data: auth } = await supabase.auth.getUser();
      const currentUser = auth?.user;
      if (!currentUser) {
        Alert.alert('Login Required', 'Please log in to contact the seller.');
        return;
      }
      if (!sellerProfile.id) {
        Alert.alert('Unavailable', 'Seller contact is unavailable.');
        return;
      }
      const { phone, canShare } = await getPhoneWithPermission(sellerProfile.id, currentUser.id);
      if (!canShare) {
        Alert.alert('Phone Not Available', 'Phone number will be available after ping is accepted or if the seller shares with everyone.');
        return;
      }
      if (!phone) {
        Alert.alert('No Phone Number', 'This seller has not provided a phone number.');
        return;
      }
      const phoneUrl = `tel:${phone}`;
      Linking.openURL(phoneUrl);
    } catch (e) {
      Alert.alert('Error', 'Failed to start a call. Please try again.');
    }
  }, [sellerProfile]);

  const handleWhatsAppSeller = useCallback(async () => {
    try {
      if (!sellerProfile) return;
      const { data: auth } = await supabase.auth.getUser();
      const currentUser = auth?.user;
      if (!currentUser) {
        Alert.alert('Login Required', 'Please log in to message the seller.');
        return;
      }
      if (!sellerProfile.id) {
        Alert.alert('Unavailable', 'Seller contact is unavailable.');
        return;
      }
      const { phone, canShare } = await getPhoneWithPermission(sellerProfile.id, currentUser.id);
      if (!canShare) {
        Alert.alert('Phone Not Available', 'Phone number will be available after ping is accepted or if the seller shares with everyone.');
        return;
      }
      if (!phone) {
        Alert.alert('No Phone Number', 'This seller has not provided a phone number for WhatsApp.');
        return;
      }
      const cleanPhone = phone.replace(/[^\d+]/g, '');
      const message = `Hi ${sellerProfile.name || sellerProfile.username}, I found your profile on GeoMart.`;
      const url = createWhatsAppURL(cleanPhone, message);
      Linking.openURL(url).catch(() => {
        const webUrl = createWhatsAppWebURL(cleanPhone, message);
        Linking.openURL(webUrl);
      });
    } catch (e) {
      Alert.alert('Error', 'Failed to open WhatsApp. Please try again.');
    }
  }, [sellerProfile]);

  const handleOpenDirections = useCallback(() => {
    try {
      if (!sellerProfile?.location_display) {
        Alert.alert('Location Unavailable', 'This seller has not specified a location.');
        return;
      }
      const destination = encodeURIComponent(sellerProfile.location_display);
      const origin = latitude && longitude ? `${latitude},${longitude}` : '';
      if (Platform.OS === 'ios') {
        const url = `http://maps.apple.com/?daddr=${destination}${origin ? `&saddr=${origin}` : ''}`;
        Linking.openURL(url);
      } else {
        const url = `https://www.google.com/maps/dir/?api=1&destination=${destination}${origin ? `&origin=${origin}` : ''}`;
        Linking.openURL(url);
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to open maps. Please try again.');
    }
  }, [sellerProfile, latitude, longitude]);


  // Render listing item
  const renderListingItem = ({ item }: { item: SellerListing }) => (
    <SingleColumnListingItem
      listing={item}
      onPress={(listingId) => router.push(`/listing-detail?id=${listingId}`)}
    />
  );

  // Render request item
  const renderRequestItem = ({ item }: { item: SellerRequest }) => (
    <SingleColumnRequestItem
      request={item}
      onPress={(requestId) => router.push(`/listing-detail?id=${requestId}&type=request`)}
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
        <TouchableOpacity onPress={showOptionsMenu} style={styles.optionsButton}>
          <MoreVertical size={24} color="#1E293B" />
        </TouchableOpacity>
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

        {/* Contact Actions */}
        <View style={styles.contactActions}>
          <TouchableOpacity style={[styles.contactButton, styles.callButton]} onPress={handleCallSeller} activeOpacity={0.7}>
            <Phone size={18} color="#FFFFFF" />
            <Text style={styles.contactButtonText}>Call</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.contactButton, styles.whatsappButton]} onPress={handleWhatsAppSeller} activeOpacity={0.7}>
            <MessageCircle size={18} color="#22C55E" />
            <Text style={[styles.contactButtonText, styles.whatsappText]}>WhatsApp</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.contactButton, styles.locationButton]} onPress={handleOpenDirections} activeOpacity={0.7}>
            <MapPin size={18} color="#3B82F6" />
            <Text style={[styles.contactButtonText, styles.locationText]}>Directions</Text>
          </TouchableOpacity>
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

        {/* Requests Section */}
        <View style={styles.listingsSection}>
          <View style={styles.listingsHeader}>
            <Text style={styles.listingsTitle}>
              Recent Requests ({sellerRequests.length})
            </Text>
          </View>

          {sellerRequests.length > 0 ? (
            <FlatList
              data={sellerRequests}
              renderItem={renderRequestItem}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              contentContainerStyle={styles.listingsContainer}
            />
          ) : (
            <View style={styles.noListingsContainer}>
              <Package size={48} color="#94A3B8" />
              <Text style={styles.noListingsTitle}>No Active Requests</Text>
              <Text style={styles.noListingsText}>
                This user doesn&apos;t have any active requests at the moment.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
      
      {/* Options Modal */}
      {showOptionsModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.optionsModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Seller Options</Text>
              <TouchableOpacity onPress={() => setShowOptionsModal(false)}>
                <X size={24} color="#64748B" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.optionsList}>
              <TouchableOpacity
                style={styles.optionItem}
                onPress={() => handleOptionSelect('share')}
              >
                <Share2 size={20} color="#22C55E" />
                <Text style={styles.optionText}>Share Profile</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.optionItem}
                onPress={() => handleOptionSelect('block')}
              >
                <UserX size={20} color="#64748B" />
                <Text style={styles.optionText}>
                  Block {sellerProfile?.username}
                </Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowOptionsModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
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
  optionsButton: {
    padding: 8,
    marginRight: 8,
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
  // Options Modal Styles
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  optionsModal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    margin: 20,
    maxHeight: '80%',
    width: '90%',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#1E293B',
    flex: 1,
  },
  optionsList: {
    paddingVertical: 4,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 12,
  },
  optionText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#1E293B',
    flex: 1,
  },
  modalActions: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#64748B',
  },
  // Contact Actions
  contactActions: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    marginTop: 8,
    marginBottom: 16,
  },
  contactButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    gap: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  callButton: {
    backgroundColor: '#22C55E',
    borderColor: '#22C55E',
  },
  whatsappButton: {
    backgroundColor: '#ECFDF5',
    borderColor: '#DCFCE7',
  },
  locationButton: {
    backgroundColor: '#EFF6FF',
    borderColor: '#DBEAFE',
  },
  contactButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  whatsappText: {
    color: '#16A34A',
  },
  locationText: {
    color: '#2563EB',
  },
});
