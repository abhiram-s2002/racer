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
  Share,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MoreVertical, Phone, MessageCircle, X, Heart, Share2, Flag, EyeOff, UserX } from 'lucide-react-native';
import { supabase } from '@/utils/supabaseClient';
import { imageCache } from '@/utils/imageCache';
import { reportListing, hideListing, blockUser } from '@/utils/contentManagement';
import { useAuth } from '@/hooks/useAuth';
import { createPing, checkExistingPing } from '@/utils/activitySupabase';
import { usePingLimits } from '@/hooks/usePingLimits';
import { useOfflineQueue } from '@/hooks/useOfflineQueue';
import { useFavorites } from '@/hooks/useFavorites';
import { incrementViewCount } from '@/utils/listingMetrics';
import { getPhoneWithPermission } from '@/utils/phoneSharingUtils';

import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Listing, Request, MarketplaceItem, ItemType } from '@/utils/types';

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

interface RequesterInfo {
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
  const { id, sellerData, type } = useLocalSearchParams();
  const { user } = useAuth();
  
  // State management
  const [item, setItem] = useState<MarketplaceItem | null>(null);
  const [itemType, setItemType] = useState<ItemType>('listing');
  const [sellerInfo, setSellerInfo] = useState<SellerInfo | null>(null);
  const [requesterInfo, setRequesterInfo] = useState<RequesterInfo | null>(null);
  const [ratingStats, setRatingStats] = useState<{
    average_rating: number;
    total_ratings: number;
    five_star_count: number;
    four_star_count: number;
    three_star_count: number;
    two_star_count: number;
    one_star_count: number;
  } | null>(null);
  const [sellerListings, setSellerListings] = useState<MarketplaceItem[]>([]);
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
  
  // Options modal state
  const [showOptionsModal, setShowOptionsModal] = useState(false);

  // Memoized values to prevent unnecessary re-renders
  const itemId = useMemo(() => id as string, [id]);
  const currentItemType = useMemo(() => (type as ItemType) || 'listing', [type]);
  
  // Ping-related hooks
  const { user: currentUser } = useAuth();
  const { isOnline } = useOfflineQueue();
  const { limitInfo } = usePingLimits(currentUser?.username || null);
  
  // Favorites functionality
  const { 
    favorites, 
    loading: favoritesLoading, 
    toggleFavoriteStatus, 
    refreshFavoritesStatus, 
    isFavorited,
    setFavorites
  } = useFavorites();
  
  // Check for existing ping
  const checkExistingPingStatus = useCallback(async () => {
    if (!item?.id || !currentUser?.username) return;
    
    try {
      const hasExistingPing = await checkExistingPing(item.id, currentUser.username, currentItemType === 'request' ? 'request' : 'listing');
      setExistingPing(hasExistingPing);
    } catch (error) {
      console.error('Error checking existing ping:', error);
    }
  }, [item?.id, currentUser?.username]);
  
  // Helper function to fetch seller/requester data from database
  const fetchUserFromDatabase = async (username: string, isRequester = false) => {
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('username, name, avatar_url, phone, location_display, bio, expires_at')
      .eq('username', username)
      .single();
    
    if (userError) throw userError;
    
    if (isRequester) {
      setRequesterInfo(userData);
    } else {
      setSellerInfo(userData);
    }
  };

  // Fetch rating stats for a user
  const fetchRatingStats = async (username: string) => {
    try {
      const { data, error } = await supabase
        .rpc('get_user_rating_stats', { target_username: username });

      if (error) {
        console.error('Error fetching rating stats:', error);
        return null;
      }

      if (data && data.length > 0) {
        const stats = data[0];
        const distribution = stats.rating_distribution || {};
        
        return {
          average_rating: parseFloat(stats.average_rating) || 0,
          total_ratings: parseInt(stats.total_ratings) || 0,
          five_star_count: parseInt(distribution['5']) || 0,
          four_star_count: parseInt(distribution['4']) || 0,
          three_star_count: parseInt(distribution['3']) || 0,
          two_star_count: parseInt(distribution['2']) || 0,
          one_star_count: parseInt(distribution['1']) || 0,
        };
      }

      return null;
    } catch (error) {
      console.error('Error fetching rating stats:', error);
      return null;
    }
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
  
  // Fetch item data (listing or request)
  const fetchItemData = useCallback(async () => {
    if (!itemId) return;
    
    try {
      setLoading(true);
      setError(null);
      setItemType(currentItemType);
      
      // Check image cache first for instant loading
      let cachedImages = null;
      try {
        if (imageCache.isReady()) {
          cachedImages = imageCache.getListingImages(itemId);
        }
      } catch (error) {
        console.warn('Failed to get cached images:', error);
      }
      
      let itemData: MarketplaceItem | null = null;
      
      if (currentItemType === 'request') {
        // Fetch request details
        const { data: requestData, error: requestError } = await supabase
          .from('requests')
          .select('*')
          .eq('id', itemId)
          .single();
        
        if (requestError) throw requestError;
        if (!requestData) throw new Error('Request not found');
        
        // Convert request to MarketplaceItem format
        itemData = {
          id: requestData.id,
          username: requestData.requester_username,
          title: requestData.title,
          description: requestData.description,
          price: requestData.budget_min || 0,
          price_unit: undefined,
          category: requestData.category,
          item_type: 'request' as ItemType,
          thumbnail_images: requestData.thumbnail_images || [],
          preview_images: requestData.preview_images || [],
          latitude: requestData.latitude,
          longitude: requestData.longitude,
          expires_at: requestData.expires_at,
          budget_min: requestData.budget_min,
          budget_max: requestData.budget_max,
          pickup_available: requestData.pickup_available,
          delivery_available: requestData.delivery_available,
          created_at: requestData.created_at,
          updated_at: requestData.updated_at,
        };
      } else {
        // Fetch listing details including engagement metrics
        const { data: listingData, error: listingError } = await supabase
          .from('listings')
          .select('*, view_count, ping_count, expires_at')
          .eq('id', itemId)
          .single();
        
        if (listingError) throw listingError;
        if (!listingData) throw new Error('Listing not found');
        
        // Convert listing to MarketplaceItem format
        itemData = {
          id: listingData.id,
          username: listingData.username,
          title: listingData.title,
          description: listingData.description,
          price: listingData.price,
          price_unit: listingData.price_unit,
          category: listingData.category,
          item_type: 'listing' as ItemType,
          thumbnail_images: listingData.thumbnail_images || [],
          preview_images: listingData.preview_images || [],
          latitude: listingData.latitude,
          longitude: listingData.longitude,
          expires_at: listingData.expires_at,
          view_count: listingData.view_count,
          ping_count: listingData.ping_count,
          extension_count: listingData.extension_count,
          pickup_available: listingData.pickup_available,
          delivery_available: listingData.delivery_available,
          created_at: listingData.created_at,
          updated_at: listingData.updated_at,
        };
      }
      
      // If we have cached images, merge them with the item data
      if (cachedImages && itemData) {
        itemData.thumbnail_images = cachedImages.thumbnail_images;
        itemData.preview_images = cachedImages.preview_images;
      }
      
      if (itemData) {
        setItem(itemData);
      }
      
      // Increment view count for listings
      if (currentItemType === 'listing') {
        await incrementViewCount(itemId);
      }
      
      // Use passed user data if available, otherwise fetch from database
      if (itemData) {
        if (sellerData) {
          try {
            const parsedUserData = JSON.parse(sellerData as string);
            if (currentItemType === 'request') {
              setRequesterInfo(parsedUserData);
            } else {
              setSellerInfo(parsedUserData);
            }
            
            // Fetch rating stats for the user
            const stats = await fetchRatingStats(parsedUserData.username);
            setRatingStats(stats);
            
            // Check phone sharing permission
            await checkPhoneSharingPermission(parsedUserData.username);
          } catch (error) {
            // If parsing fails, fall back to database fetch
            await fetchUserFromDatabase(itemData.username, currentItemType === 'request');
            const stats = await fetchRatingStats(itemData.username);
            setRatingStats(stats);
            await checkPhoneSharingPermission(itemData.username);
          }
        } else {
          await fetchUserFromDatabase(itemData.username, currentItemType === 'request');
          const stats = await fetchRatingStats(itemData.username);
          setRatingStats(stats);
          await checkPhoneSharingPermission(itemData.username);
        }
      }
      
      // Fetch user's other items (both listings and requests) and show together
      if (itemData) {
        const [otherListingsRes, otherRequestsRes] = await Promise.all([
          supabase
            .from('listings')
            .select('*')
            .eq('username', itemData.username)
            .neq('id', itemId)
            .order('created_at', { ascending: false })
            .limit(10),
          supabase
            .from('requests')
            .select('*')
            .eq('requester_username', itemData.username)
            .neq('id', itemId)
            .order('created_at', { ascending: false })
            .limit(10)
        ]);

        const listingsError = (otherListingsRes as any).error;
        const requestsError = (otherRequestsRes as any).error;
        if (listingsError) throw listingsError;
        if (requestsError) throw requestsError;

        const otherListings = (otherListingsRes as any).data || [];
        const otherRequests = (otherRequestsRes as any).data || [];

        const convertedListings = otherListings.map((listing: any) => ({
          id: listing.id,
          username: listing.username,
          title: listing.title,
          description: listing.description,
          price: listing.price,
          price_unit: listing.price_unit,
          category: listing.category,
          item_type: 'listing' as ItemType,
          thumbnail_images: listing.thumbnail_images || [],
          preview_images: listing.preview_images || [],
          latitude: listing.latitude,
          longitude: listing.longitude,
          expires_at: listing.expires_at,
          view_count: listing.view_count,
          ping_count: listing.ping_count,
          extension_count: listing.extension_count,
          pickup_available: listing.pickup_available,
          delivery_available: listing.delivery_available,
          created_at: listing.created_at,
          updated_at: listing.updated_at,
        }));

        const convertedRequests = otherRequests.map((req: any) => ({
          id: req.id,
          username: req.requester_username,
          title: req.title,
          description: req.description,
          price: req.budget_min || 0,
          price_unit: undefined,
          category: req.category,
          item_type: 'request' as ItemType,
          thumbnail_images: req.thumbnail_images || [],
          preview_images: req.preview_images || [],
          latitude: req.latitude,
          longitude: req.longitude,
          expires_at: req.expires_at,
          budget_min: req.budget_min,
          budget_max: req.budget_max,
          pickup_available: req.pickup_available,
          delivery_available: req.delivery_available,
          created_at: req.created_at,
          updated_at: req.updated_at,
        }));

        // Combine and limit to a reasonable number (e.g., 12)
        const combined: any[] = [...convertedListings, ...convertedRequests].slice(0, 12);
        setSellerListings(combined);
      }
      
    } catch (err) {
      // Error fetching item data
      setError(err instanceof Error ? err.message : `Failed to load ${currentItemType}`);
    } finally {
      setLoading(false);
    }
  }, [itemId, currentItemType]);

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    
    // Clear image cache for this item to get fresh images
    if (itemId) {
      // Note: We don't clear the cache here as it might be useful for other views
      // The cache will auto-expire after 5 minutes anyway
    }
    
    await fetchItemData();
    setRefreshing(false);
  }, [fetchItemData, itemId]);

  // Load data on mount and when itemId changes
  useEffect(() => {
    // Check if we have cached images first
    try {
      if (imageCache.isReady()) {
        const cachedImages = imageCache.getListingImages(itemId);
        
        if (cachedImages) {
          // We have cached images, show them immediately
          setItem({
            id: itemId,
            title: 'Loading...', // Placeholder
            description: '',
            price: 0,
            price_unit: 'per_item',
            category: 'other',
            item_type: currentItemType,
            thumbnail_images: cachedImages.thumbnail_images,
            preview_images: cachedImages.preview_images,
            username: '',
            latitude: 0,
            longitude: 0,
            created_at: '',
            updated_at: ''
          } as MarketplaceItem);
          setLoading(false);
        }
      }
    } catch (error) {
      console.warn('Failed to check image cache:', error);
    }
    
    // Always fetch fresh data from database
    fetchItemData();
  }, [fetchItemData, itemId, currentItemType]);

  // Check for existing ping when item and user are available
  useEffect(() => {
    if (item && currentUser) {
      checkExistingPingStatus();
    }
  }, [item, currentUser, checkExistingPingStatus]);

  // Load favorites status when item changes
  useEffect(() => {
    if (item?.id) {
      refreshFavoritesStatus([item.id]);
    }
  }, [item?.id, refreshFavoritesStatus]);

  // Handle navigation to other items
  const handleItemPress = useCallback((itemId: string, itemType: ItemType) => {
    router.push(`/listing-detail?id=${itemId}&type=${itemType}`);
  }, [router]);

  // Handle report item
  const handleReport = useCallback(async () => {
    if (!user || !item) {
      Alert.alert('Error', `You must be logged in to report ${itemType}s`);
      return;
    }

    try {
      const result = await reportListing({
        listing_id: item.id,
        seller_username: item.username,
        reason: 'inappropriate_content',
        description: `Reported via ${itemType} detail page`
      });

      if (!result.success) {
        Alert.alert('Error', result.error || `Failed to report ${itemType}. Please try again.`);
        return;
      }

      // Ask if user wants to hide the item after reporting
      Alert.alert(
        'Report Submitted',
        `Thank you for your report. We will review this ${itemType} and take appropriate action.\n\nWould you like to hide this ${itemType} from your feed?`,
        [
          {
            text: 'No, Keep Visible',
            style: 'cancel'
          },
          {
            text: 'Yes, Hide It',
            onPress: async () => {
              // Hide the item
              const hideResult = await hideListing(item.id);
              if (hideResult.success) {
                Alert.alert(
                  `${itemType.charAt(0).toUpperCase() + itemType.slice(1)} Hidden`,
                  `This ${itemType} has been hidden from your feed.`,
                  [{ text: 'OK', onPress: () => router.back() }]
                );
              } else {
                Alert.alert(
                  'Report Submitted',
                  `Your report was submitted, but we couldn't hide the ${itemType}. You can hide it manually from the ${itemType} options.`,
                  [{ text: 'OK' }]
                );
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error(`Error reporting ${itemType}:`, error);
      Alert.alert('Error', `Failed to report ${itemType}. Please try again.`);
    }
  }, [user, item, itemType, router]);

  // Handle hide item
  const handleHide = useCallback(async () => {
    if (!user || !item) {
      Alert.alert('Error', `You must be logged in to hide ${itemType}s`);
      return;
    }

    try {
      const result = await hideListing(item.id);

      if (!result.success) {
        Alert.alert('Error', result.error || `Failed to hide ${itemType}. Please try again.`);
        return;
      }

      Alert.alert(
        `${itemType.charAt(0).toUpperCase() + itemType.slice(1)} Hidden`,
        `This ${itemType} has been hidden from your feed.`,
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error) {
      console.error(`Error hiding ${itemType}:`, error);
      Alert.alert('Error', `Failed to hide ${itemType}. Please try again.`);
    }
  }, [user, item, itemType, router]);

  // Handle block user
  const handleBlock = useCallback(async () => {
    if (!user || !item) {
      Alert.alert('Error', 'You must be logged in to block users');
      return;
    }

    try {
      // First, get the user's ID
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('username', item.username)
        .single();

      if (userError || !userData) {
        console.error('Error finding user:', userError);
        Alert.alert('Error', 'Failed to find user. Please try again.');
        return;
      }

      const result = await blockUser(userData.id);

      if (!result.success) {
        Alert.alert('Error', result.error || 'Failed to block user. Please try again.');
        return;
      }

      const userType = itemType === 'request' ? 'requester' : 'seller';
      Alert.alert(
        'User Blocked',
        `You have blocked ${item.username}. You will no longer see their ${itemType}s.`,
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error) {
      console.error('Error blocking user:', error);
      Alert.alert('Error', 'Failed to block user. Please try again.');
    }
  }, [user, item, itemType, router]);

  // Handle share item
  const handleShareItem = useCallback(async () => {
    if (!item) return;

    try {
      // Generate deep link for the item
      const deepLink = `geomart://${itemType}/${item.id}`;
      
      // Create share message with item details
      const priceText = itemType === 'request' 
        ? (item.budget_max ? `Budget: ₹${item.budget_min} - ₹${item.budget_max}` : `Budget: ₹${item.budget_min}`)
        : `Price: ₹${item.price} ${item.price_unit || 'per item'}`;
      
      const shareMessage = `Check out this ${item.category} ${itemType} on GeoMart!\n\n` +
        `"${item.title}"\n` +
        `${priceText}\n` +
        `${itemType === 'request' ? 'Requester' : 'Seller'}: ${item.username}\n\n` +
        `View it here: ${deepLink}\n\n` +
        `Download GeoMart: https://play.google.com/store/apps/details?id=com.geomart.app`;

      await Share.share({
        message: shareMessage,
        url: deepLink, // This will be used by apps that support URL sharing
        title: `Share ${item.title} - GeoMart`,
      });
    } catch (error) {
      console.error(`Error sharing ${itemType}:`, error);
      Alert.alert('Error', `Failed to share ${itemType}. Please try again.`);
    }
  }, [item, itemType]);

  // Handle toggle favorite
  const handleToggleFavorite = useCallback(async () => {
    if (!item) return;

    const isCurrentlyFavorited = isFavorited(item.id);
    const newFavoriteState = !isCurrentlyFavorited;
    
    // Immediate visual feedback - change color instantly
    setFavorites(prev => ({
      ...prev,
      [item.id]: newFavoriteState
    }));
    
    // Show confirmation dialog after a short delay to see the color change
    setTimeout(() => {
      Alert.alert(
        isCurrentlyFavorited ? 'Remove from Favorites' : 'Add to Favorites',
        isCurrentlyFavorited 
          ? `Are you sure you want to remove this ${itemType} from your favorites?` 
          : `Add this ${itemType} to your favorites?`,
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => {
              // Revert the visual change if cancelled
              setFavorites(prev => ({
                ...prev,
                [item.id]: isCurrentlyFavorited
              }));
            }
          },
          {
            text: isCurrentlyFavorited ? 'Remove' : 'Add',
            onPress: async () => {
              // Perform the actual database operation
              try {
                await toggleFavoriteStatus(item.id, item.username);
              } catch (error) {
                // Revert on error
                setFavorites(prev => ({
                  ...prev,
                  [item.id]: isCurrentlyFavorited
                }));
                console.error('Error toggling favorite:', error);
                Alert.alert('Error', 'Failed to update favorites. Please try again.');
              }
            }
          }
        ]
      );
    }, 100);
  }, [item, itemType, isFavorited, setFavorites, toggleFavoriteStatus]);

  // Show options menu
  const showOptionsMenu = useCallback(() => {
    setShowOptionsModal(true);
  }, []);

  // Handle option selection
  const handleOptionSelect = useCallback((option: string) => {
    setShowOptionsModal(false);
    
    switch (option) {
      case 'share':
        handleShareItem();
        break;
      case 'favorite':
        handleToggleFavorite();
        break;
      case 'report':
        handleReport();
        break;
      case 'hide':
        handleHide();
        break;
      case 'block':
        handleBlock();
        break;
    }
  }, [handleShareItem, handleToggleFavorite, handleReport, handleHide, handleBlock]);

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
      const userType = itemType === 'request' ? 'requester' : 'seller';
      Alert.alert(
        'No Phone Number',
        `This ${userType} has not provided a phone number.`,
        [{ text: 'OK', style: 'default' }]
      );
      return;
    }

    const userInfo = itemType === 'request' ? requesterInfo : sellerInfo;
    const userType = itemType === 'request' ? 'Requester' : 'Seller';
    
    Alert.alert(
      `Call ${userType}`,
      `Call ${userInfo?.name || userType.toLowerCase()}?`,
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
  }, [itemType, sellerInfo, requesterInfo]);

  // Handle message/ping
  const handleMessage = useCallback(() => {
    if (!currentUser) {
      Alert.alert('Login Required', 'Please log in to send a ping.');
      return;
    }

    if (!item) {
      Alert.alert('Error', `${itemType.charAt(0).toUpperCase() + itemType.slice(1)} information not available.`);
      return;
    }

    // Prevent users from pinging themselves
    if (currentUser.username === item.username) {
      Alert.alert('Cannot Send Ping', 'You cannot ping yourself.');
      return;
    }

    setShowPingModal(true);
  }, [currentUser, item, itemType]);


  // Send ping
  const sendPing = useCallback(async () => {
    if (!currentUser || !item) return;

    const userInfo = itemType === 'request' ? requesterInfo : sellerInfo;
    if (!userInfo) return;

    if (pingMessage.trim().length === 0) {
      const userType = itemType === 'request' ? 'requester' : 'seller';
      Alert.alert('Message Required', `Please enter a message for the ${userType}.`);
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
          target_id: item.id as any,
          item_type: currentItemType,
          sender_username: currentUser.username,
          receiver_username: item.username,
          message: pingMessage.trim(),
          status: 'pending'
        } as any);
      } else {
        // Add to offline queue
        const { addPingAction } = useOfflineQueue();
        await addPingAction({
          target_id: item.id,
          item_type: currentItemType,
          sender_username: currentUser.username,
          receiver_username: item.username,
          message: pingMessage.trim(),
          status: 'pending'
        }, 'high');
      }

      setExistingPing(true);
      setShowPingModal(false);
      setPingMessage('');

      const userType = itemType === 'request' ? 'requester' : 'seller';
      Alert.alert(
        'Ping Sent!',
        `Your ping has been sent to ${userInfo.name || `the ${userType}`}. You'll be able to chat once they accept your ping.`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error sending ping:', error);
      const errMsg = error instanceof Error ? error.message : '';

      // Friendly messages for known limits
      if (errMsg.toLowerCase().includes('daily') || errMsg.toLowerCase().includes('limit')) {
        Alert.alert(
          'Daily Limit Reached',
          'You’ve reached your daily ping limit (5). Please try again tomorrow.'
        );
      } else if (errMsg.toLowerCase().includes('minute') || errMsg.toLowerCase().includes('time') || errMsg.toLowerCase().includes('cooldown')) {
        Alert.alert(
          'Please Wait',
          'You can ping this item again in about a minute.'
        );
      } else {
        Alert.alert(
          'Unable to Send Ping',
          'Something went wrong while sending your ping. Please try again.'
        );
      }
    } finally {
      setIsPinging(false);
    }
  }, [currentUser, item, itemType, requesterInfo, sellerInfo, pingMessage, isOnline]);






  // Loading state
  if (loading) {
    return (
      <View style={[styles.loadingContainer, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color="#10B981" />
        <Text style={styles.loadingText}>Loading {itemType}...</Text>
      </View>
    );
  }

  // Error state
  if (error || !item) {
    return (
      <View style={[styles.errorContainer, { paddingTop: insets.top }]}>
        <Text style={styles.errorText}>
          {error || `Failed to load ${itemType}`}
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
            colors={['#10B981']}
          />
        }
      >
        {/* Hero Image Section */}
        <View style={styles.heroImageContainer}>
          <ListingHeroImage
            images={item.thumbnail_images} // Use thumbnail_images as fallback for images
            thumbnailImages={item.thumbnail_images}
            previewImages={item.preview_images}
            title={item.title}
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
        

        


        {/* Unified Item Information */}
        {(sellerInfo || requesterInfo) && (
          <UnifiedListingCard
            title={item.title}
            description={item.description || ''}
            price={item.price}
            priceUnit={item.price_unit || 'per_item'}
            category={item.category}
            createdAt={item.created_at}
            seller={itemType === 'request' ? requesterInfo! : sellerInfo!}
            viewCount={item.view_count}
            pingCount={item.ping_count}
            expiresAt={item.expires_at}
            itemType={itemType}
            budgetMin={item.budget_min}
            budgetMax={item.budget_max}
            pickupAvailable={item.pickup_available}
            deliveryAvailable={item.delivery_available}
            ratingStats={ratingStats || undefined}
            onSellerPress={() => {
              const userInfo = itemType === 'request' ? requesterInfo : sellerInfo;
              router.push(`/seller/${userInfo?.username}` as any);
            }}
          />
        )}

        {/* Compact Location Map */}
        {item.latitude && item.longitude && (
          <CompactLocationCard
            latitude={item.latitude}
            longitude={item.longitude}
            title={item.title}
            sellerName={itemType === 'request' ? requesterInfo?.name || 'Requester' : sellerInfo?.name || 'Seller'}
          />
        )}

        {/* User's Other Items */}
        {sellerListings.length > 0 && (
          <SellerListingsCarousel
            listings={sellerListings as any}
            onListingPress={(itemId) => {
              // Find the item type from the listings array
              const targetItem = sellerListings.find(l => l.id === itemId);
              if (targetItem) {
                handleItemPress(itemId, targetItem.item_type);
              }
            }}
            sellerName={itemType === 'request' ? requesterInfo?.name || 'Requester' : sellerInfo?.name || 'Seller'}
            sellerUsername={item?.username}
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
            <MessageCircle size={20} color={existingPing ? "#94A3B8" : "#10B981"} />
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
              <Text style={styles.modalTitle}>
                Send Ping to {itemType === 'request' ? requesterInfo?.name || 'Requester' : sellerInfo?.name || 'Seller'}
              </Text>
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
              <Text style={styles.messageLabel}>
                Message to {itemType === 'request' ? 'Requester' : 'Seller'}:
              </Text>
              
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
      
      {/* Options Modal */}
      {showOptionsModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.optionsModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {itemType.charAt(0).toUpperCase() + itemType.slice(1)} Options
              </Text>
              <TouchableOpacity onPress={() => setShowOptionsModal(false)}>
                <X size={24} color="#64748B" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.optionsList}>
              <TouchableOpacity
                style={styles.optionItem}
                onPress={() => handleOptionSelect('share')}
              >
                <Share2 size={20} color="#10B981" />
                <Text style={styles.optionText}>
                  Share {itemType.charAt(0).toUpperCase() + itemType.slice(1)}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.optionItem}
                onPress={() => handleOptionSelect('favorite')}
              >
                <Heart 
                  size={20} 
                  color={item ? (isFavorited(item.id) ? "#EF4444" : "#64748B") : "#64748B"} 
                  fill={item ? (isFavorited(item.id) ? "#EF4444" : "transparent") : "transparent"}
                />
                <Text style={styles.optionText}>
                  {item ? (isFavorited(item.id) ? 'Remove from Favorites' : 'Add to Favorites') : 'Add to Favorites'}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.optionItem}
                onPress={() => handleOptionSelect('report')}
              >
                <Flag size={20} color="#64748B" />
                <Text style={styles.optionText}>
                  Report {itemType.charAt(0).toUpperCase() + itemType.slice(1)}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.optionItem}
                onPress={() => handleOptionSelect('hide')}
              >
                <EyeOff size={20} color="#64748B" />
                <Text style={styles.optionText}>
                  Hide {itemType.charAt(0).toUpperCase() + itemType.slice(1)}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.optionItem}
                onPress={() => handleOptionSelect('block')}
              >
                <UserX size={20} color="#64748B" />
                <Text style={styles.optionText}>
                  Block {item?.username}
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
    borderColor: '#10B981',
  },
  messageButtonText: {
    color: '#10B981',
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
  sendButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#10B981',
    alignItems: 'center',
  },
  sendButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#FFFFFF',
  },
  // Options Modal Styles
  optionsModal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    margin: 20,
    maxHeight: '80%',
    width: '90%',
    borderWidth: 1,
    borderColor: '#E2E8F0',
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
});

// Wrap with Error Boundary for better error handling
export default function ListingDetailScreenWithErrorBoundary() {
  return (
    <ErrorBoundary>
      <ListingDetailScreen />
    </ErrorBoundary>
  );
}
