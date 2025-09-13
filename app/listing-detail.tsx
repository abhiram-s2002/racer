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
  Linking,
  TextInput,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MoreVertical, Phone, MessageCircle, X } from 'lucide-react-native';
import { supabase } from '@/utils/supabaseClient';
import { imageCache } from '@/utils/imageCache';
import { reportListing, hideListing, blockUser } from '@/utils/contentManagement';
import { useAuth } from '@/hooks/useAuth';
import { createPing, checkExistingPing } from '@/utils/activitySupabase';
import { usePingLimits } from '@/hooks/usePingLimits';
import { useOfflineQueue } from '@/hooks/useOfflineQueue';
import { incrementViewCount } from '@/utils/listingMetrics';
import { getPhoneWithPermission } from '@/utils/phoneSharingUtils';

import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Listing } from '@/utils/types';

// Import our optimized components
import ListingHeroImage from '@/components/ListingHeroImage';
import UnifiedListingCard from '@/components/UnifiedListingCard';
import CompactLocationCard from '@/components/CompactLocationCard';
import SellerListingsCarousel from '@/components/SellerListingsCarousel';

interface SellerInfo {
  username: string;
  name: string;
  avatar_url: string;
  phone: string;
  location_display: string;
  bio: string;
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
  const [phoneSharingInfo, setPhoneSharingInfo] = useState<{
    phone: string | null;
    canShare: boolean;
  }>({ phone: null, canShare: false });
  
  // Ping-related state
  const [showPingModal, setShowPingModal] = useState(false);
  const [pingMessage, setPingMessage] = useState('Hi, is this still available?');
  const [existingPing, setExistingPing] = useState(false);
  const [isPinging, setIsPinging] = useState(false);

  // Memoized values to prevent unnecessary re-renders
  const listingId = useMemo(() => id as string, [id]);
  
  // Ping-related hooks
  const { user: currentUser } = useAuth();
  const { isOnline } = useOfflineQueue();
  const { limitInfo } = usePingLimits(currentUser?.username || null);
  
  // Check for existing ping
  const checkExistingPingStatus = useCallback(async () => {
    if (!listing?.id || !currentUser?.username) return;
    
    try {
      const hasExistingPing = await checkExistingPing(listing.id, currentUser.username);
      setExistingPing(hasExistingPing);
    } catch (error) {
      console.error('Error checking existing ping:', error);
    }
  }, [listing?.id, currentUser?.username]);
  
  // Helper function to fetch seller data from database
  const fetchSellerFromDatabase = async (username: string) => {
    const { data: sellerData, error: sellerError } = await supabase
      .from('users')
      .select('username, name, avatar_url, phone, location_display, bio, expires_at')
      .eq('username', username)
      .single();
    
    if (sellerError) throw sellerError;
    setSellerInfo(sellerData);
  };

  // Check phone sharing permission
  const checkPhoneSharingPermission = async (sellerUsername: string) => {
    if (!user?.id || !sellerUsername) return;

    try {
      const { data: sellerUser, error } = await supabase
        .from('users')
        .select('id')
        .eq('username', sellerUsername)
        .single();

      if (error || !sellerUser) return;

      // Check phone sharing permission using unlock system
      const phoneInfo = await getPhoneWithPermission(
        sellerUser.id,
        user.id
      );

      setPhoneSharingInfo(phoneInfo);
    } catch (error) {
      console.error('Error checking phone sharing permission:', error);
    }
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
      
      // Fetch listing details including engagement metrics
      const { data: listingData, error: listingError } = await supabase
        .from('listings')
        .select('*, view_count, ping_count, expires_at')
        .eq('id', listingId)
        .single();
      
      if (listingError) throw listingError;
      if (!listingData) throw new Error('Listing not found');
      
      // If we have cached images, merge them with the listing data
      if (cachedImages) {
        listingData.thumbnail_images = cachedImages.thumbnail_images;
        listingData.preview_images = cachedImages.preview_images;
      }
      
      setListing(listingData);
      
      // Increment view count
      await incrementViewCount(listingId);
      
      // Use passed seller data if available, otherwise fetch from database
      if (sellerData) {
        try {
          const parsedSellerData = JSON.parse(sellerData as string);
          setSellerInfo(parsedSellerData);
          // Check phone sharing permission
          await checkPhoneSharingPermission(parsedSellerData.username);
        } catch (error) {
          // If parsing fails, fall back to database fetch
          await fetchSellerFromDatabase(listingData.username);
          await checkPhoneSharingPermission(listingData.username);
        }
      } else {
        await fetchSellerFromDatabase(listingData.username);
        await checkPhoneSharingPermission(listingData.username);
      }
      
      // Fetch seller's other listings
      const { data: otherListings, error: listingsError } = await supabase
        .from('listings')
        .select('*')
        .eq('username', listingData.username)
        .neq('id', listingId)
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
            username: '',
            latitude: 0,
            longitude: 0,
            created_at: '',
            updated_at: ''
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

  // Check for existing ping when listing and user are available
  useEffect(() => {
    if (listing && currentUser) {
      checkExistingPingStatus();
    }
  }, [listing, currentUser, checkExistingPingStatus]);

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

  // Handle phone call
  const handleCall = useCallback(() => {
    if (!phoneSharingInfo.canShare) {
      Alert.alert(
        'Phone Not Available',
        'Phone number will be available after ping is accepted.',
        [{ text: 'OK', style: 'default' }]
      );
      return;
    }

    const phoneNumber = phoneSharingInfo.phone;
    if (!phoneNumber) {
      Alert.alert(
        'No Phone Number',
        'This seller has not provided a phone number.',
        [{ text: 'OK', style: 'default' }]
      );
      return;
    }

    Alert.alert(
      'Call Seller',
      `Call ${sellerInfo?.name || 'seller'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Call', 
          onPress: () => {
            const phoneUrl = `tel:${phoneNumber}`;
            Linking.openURL(phoneUrl);
          }
        }
      ]
    );
  }, [sellerInfo]);

  // Handle message/ping
  const handleMessage = useCallback(() => {
    if (!currentUser) {
      Alert.alert('Login Required', 'Please log in to send a ping.');
      return;
    }

    if (!listing) {
      Alert.alert('Error', 'Listing information not available.');
      return;
    }

    // Prevent users from pinging themselves
    if (currentUser.username === listing.username) {
      Alert.alert('Cannot Send Ping', 'You cannot ping yourself.');
      return;
    }

    setShowPingModal(true);
  }, [currentUser, listing]);


  // Send ping
  const sendPing = useCallback(async () => {
    if (!currentUser || !listing || !sellerInfo) return;

    if (pingMessage.trim().length === 0) {
      Alert.alert('Message Required', 'Please enter a message for the seller.');
      return;
    }

    if (pingMessage.length > 500) {
      Alert.alert('Message Too Long', 'Ping message must be 500 characters or less.');
      return;
    }

    setIsPinging(true);

    try {
      if (isOnline) {
        await createPing({
          listing_id: listing.id,
          sender_username: currentUser.username,
          receiver_username: listing.username,
          message: pingMessage.trim(),
          status: 'pending'
        });
      } else {
        // Add to offline queue
        const { addPingAction } = useOfflineQueue();
        await addPingAction({
          listing_id: listing.id,
          sender_username: currentUser.username,
          receiver_username: listing.username,
          message: pingMessage.trim(),
          status: 'pending'
        }, 'high');
      }

      setExistingPing(true);
      setShowPingModal(false);
      setPingMessage('');

      Alert.alert(
        'Ping Sent!',
        `Your ping has been sent to ${sellerInfo.name || 'the seller'}. You'll be able to chat once they accept your ping.`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error sending ping:', error);
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'Failed to send ping. Please try again.'
      );
    } finally {
      setIsPinging(false);
    }
  }, [currentUser, listing, sellerInfo, pingMessage, isOnline]);






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
        contentContainerStyle={styles.scrollContent}
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
        

        


        {/* Unified Listing Information */}
        {sellerInfo && (
          <UnifiedListingCard
            title={listing.title}
            description={listing.description || ''}
            price={listing.price}
            priceUnit={listing.price_unit}
            category={listing.category}
            createdAt={listing.created_at}
            seller={sellerInfo}
            viewCount={listing.view_count}
            pingCount={listing.ping_count}
            expiresAt={listing.expires_at}
            onSellerPress={() => router.push(`/seller/${sellerInfo.username}` as any)}
          />
        )}

        {/* Compact Location Map */}
        {listing.latitude && listing.longitude && (
          <CompactLocationCard
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
      
      {/* Fixed Bottom Action Tab */}
      <View style={[styles.fixedBottomTab, { paddingBottom: insets.bottom }]}>
        <View style={styles.actionButtonsContainer}>
          {/* Call Button */}
          <TouchableOpacity
            style={[styles.actionButton, !phoneSharingInfo.canShare && styles.disabledButton]}
            onPress={handleCall}
            disabled={!phoneSharingInfo.canShare}
            activeOpacity={0.7}
          >
            <Phone size={20} color={phoneSharingInfo.canShare ? '#FFFFFF' : '#94A3B8'} />
            <Text style={[styles.actionButtonText, !phoneSharingInfo.canShare && styles.disabledButtonText]}>
              {phoneSharingInfo.canShare ? 'Call' : 'Phone Hidden'}
            </Text>
          </TouchableOpacity>

          {/* Message Button */}
          <TouchableOpacity
            style={[
              styles.actionButton, 
              existingPing ? styles.disabledButton : styles.messageButton
            ]}
            onPress={existingPing ? undefined : handleMessage}
            disabled={existingPing}
            activeOpacity={0.7}
          >
            <MessageCircle size={20} color={existingPing ? "#94A3B8" : "#22C55E"} />
            <Text style={[
              styles.actionButtonText, 
              existingPing ? styles.disabledButtonText : styles.messageButtonText
            ]}>
              {existingPing ? 'Ping Sent' : 'Ping'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
      
      {/* Ping Modal */}
      {showPingModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.pingModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Send Ping to {sellerInfo?.name || 'Seller'}</Text>
              <TouchableOpacity onPress={() => setShowPingModal(false)}>
                <X size={24} color="#64748B" />
              </TouchableOpacity>
            </View>
            
            {/* Ping Limits Info */}
            {!limitInfo.canPing && (
              <View style={styles.limitsInfo}>
                <Text style={styles.limitsText}>
                  Daily ping limits reset at midnight. You can send more pings tomorrow.
                </Text>
              </View>
            )}
            
            <View style={styles.messageSection}>
              <Text style={styles.messageLabel}>Message to Seller:</Text>
              
              <TextInput
                style={styles.messageInput}
                value={pingMessage}
                onChangeText={setPingMessage}
                placeholder="Type your message here..."
                multiline
                numberOfLines={4}
                maxLength={500}
                textAlignVertical="top"
              />
              
              <Text style={styles.characterCount}>
                {pingMessage.length}/500 characters
              </Text>
            </View>
            
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowPingModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.sendButton,
                  (!limitInfo.canPing || isPinging || pingMessage.trim().length === 0) && styles.disabledButton
                ]}
                onPress={sendPing}
                disabled={!limitInfo.canPing || isPinging || pingMessage.trim().length === 0}
              >
                <Text style={[
                  styles.sendButtonText,
                  (!limitInfo.canPing || isPinging || pingMessage.trim().length === 0) && styles.disabledButtonText
                ]}>
                  {isPinging ? 'Sending...' : 'Send Ping'}
                </Text>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100, // Add padding to account for fixed bottom tab
    backgroundColor: '#F9FAFB', // Light background like Amazon
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
  fixedBottomTab: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
    backgroundColor: '#1E293B',
  },
  actionButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    fontWeight: '500',
    color: '#FFFFFF',
  },
  disabledButton: {
    backgroundColor: '#F1F5F9',
    opacity: 0.6,
  },
  disabledButtonText: {
    color: '#94A3B8',
  },
  messageButton: {
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#22C55E',
  },
  messageButtonText: {
    color: '#22C55E',
  },
  // Ping Modal Styles
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
  pingModal: {
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
  limitsInfo: {
    backgroundColor: '#FEF3C7',
    padding: 12,
    margin: 20,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
  },
  limitsText: {
    fontSize: 14,
    color: '#92400E',
    fontFamily: 'Inter-Medium',
  },
  messageSection: {
    padding: 20,
  },
  messageLabel: {
    fontSize: 14,
    color: '#1E293B',
    fontFamily: 'Inter-Medium',
    marginBottom: 12,
  },
  messageInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#1E293B',
    minHeight: 100,
    maxHeight: 150,
  },
  characterCount: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'right',
    marginTop: 4,
    fontFamily: 'Inter-Regular',
  },
  modalActions: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
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
  sendButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#22C55E',
    alignItems: 'center',
  },
  sendButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#FFFFFF',
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
