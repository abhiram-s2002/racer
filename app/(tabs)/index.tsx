
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  Dimensions,
  BackHandler,
  Platform,
  Modal,
  Alert,
  Linking,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Search, MapPin, Phone, MessageCircle, Filter, ShoppingCart, Apple, UtensilsCrossed, Wrench, Shirt, Chrome as HomeIcon, Zap, Check, Home, Star, Clock, Tag, Car, MoreHorizontal, MoreVertical } from 'lucide-react-native';
import { Plus } from 'lucide-react-native';
// Categories moved to inline definition for better performance
const categories = [
  { id: 'all', name: 'All Categories' },
  { id: 'groceries', name: 'Groceries' },
  { id: 'fruits', name: 'Fruits' },
  { id: 'food', name: 'Food' },
  { id: 'services', name: 'Services' },
  { id: 'art', name: 'Art' },
  { id: 'rental', name: 'Rental' },
  { id: 'vehicles', name: 'Vehicles' },
  { id: 'others', name: 'Others' },
];

import AddListingModal from '@/components/AddListingModal';
import PingTemplateSelector from '@/components/PingTemplateSelector';
import FeedbackModal from '@/components/FeedbackModal';
import HomeRatingDisplay from '@/components/HomeRatingDisplay';
import ListingOptionsModal from '@/components/ListingOptionsModal';

import { useRouter, useLocalSearchParams } from 'expo-router';
import CategorySelectionModal from '@/components/CategorySelectionModal';
import DistanceFilterModal from '@/components/DistanceFilterModal';
import { useListings } from '@/hooks/useListings';
import { usePingLimits } from '@/hooks/usePingLimits';
import { useOfflineQueue } from '@/hooks/useOfflineQueue';
import { supabase } from '@/utils/supabaseClient';
import { advancedRateLimiter } from '../../utils/advancedRateLimiter';
import { createPing, checkExistingPing } from '@/utils/activitySupabase';

import { formatDistance } from '@/utils/distance';
import { LocationUtils } from '@/utils/locationUtils';
// OfflineQueueIndicator removed - no UI monitoring needed

import NewRobustImage from '@/components/NewRobustImage';



import { Category } from '@/utils/types';
import { ErrorHandler } from '@/utils/errorHandler';
import { networkMonitor } from '@/utils/networkMonitor';
import { withErrorBoundary } from '@/components/ErrorBoundary';
import { trackScreenView, trackSearch, trackFilterUsed, trackListingView } from '@/utils/googleAnalytics';
// Location check is handled globally in _layout.tsx
import RatingService from '@/utils/ratingService';
import VerificationBadge from '@/components/VerificationBadge';
import { isUserVerified } from '@/utils/verificationUtils';
import HomeLoadingStates from '@/components/HomeLoadingStates';
import ListingSkeleton from '@/components/ListingSkeleton';
import { batchRatingService } from '@/utils/batchRatingService';
import { requestBatcher } from '@/utils/requestBatching';

const { width } = Dimensions.get('window');
const ITEM_WIDTH = (width - 36) / 2; // Account for padding and gap

function HomeScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const errorHandler = ErrorHandler.getInstance();

  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [showAddModal, setShowAddModal] = useState(false);
  const [pingModalVisible, setPingModalVisible] = useState(false);
  const [selectedListingForPing, setSelectedListingForPing] = useState<any>(null);
  const [pingMessage, setPingMessage] = useState('Hi, I am interested in your listing!');
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [selectedCategoryForListing, setSelectedCategoryForListing] = useState<Category | undefined>(undefined);
  const [showDistanceFilterModal, setShowDistanceFilterModal] = useState(false);
  const [sellerInfoMap, setSellerInfoMap] = useState<Record<string, any>>({});
  const [username, setUsername] = useState<string | null>(null);
  const [userRatings, setUserRatings] = useState<Record<string, { rating: string; reviewCount: number } | null>>({});

  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [userActivityCount, setUserActivityCount] = useState(0);
  const [hasShownFeedbackPrompt, setHasShownFeedbackPrompt] = useState(false);
  const [existingPings, setExistingPings] = useState<Record<string, boolean>>({});
  const [expandedDescriptions, setExpandedDescriptions] = useState<Record<string, boolean>>({});
  const [loadingStage, setLoadingStage] = useState<'initial' | 'loading' | 'error' | 'offline' | 'empty'>('initial');
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [selectedListingForOptions, setSelectedListingForOptions] = useState<any>(null);
  

  
  // Location-based sorting with updated useListings hook
  const { 
    listings, 
    loading, 
    loadMoreListings, 
    hasMore, 
    refreshListings,
    forceRefreshListings,
    toggleDistanceSort,
    sortByDistance: sortByDistanceState,
    maxDistance,
    setDistanceFilter,
    locationAvailable,
    updateLocation,
    markReturningFromNavigation
  } = useListings();

  
  const [refreshing, setRefreshing] = useState(false);
  const { pingListingId } = useLocalSearchParams();

  // Location check is handled globally in _layout.tsx

  // Ping limits for the selected listing
  const { limitInfo, loading: limitLoading, getPingLimitMessage, getPingLimitColor, checkPingLimit, recordPing } = usePingLimits(username);

  // Offline queue for handling network issues
  const { addPingAction, isOnline } = useOfflineQueue();

  // Manage loading stages
  useEffect(() => {
    if (loading && !refreshing) {
      setLoadingStage('loading');
    } else if (!networkMonitor.isOnline()) {
      setLoadingStage('offline');
    } else if (listings.length === 0) {
      setLoadingStage('empty');
    } else {
      setLoadingStage('initial');
    }
  }, [loading, refreshing, listings.length]);

  // Load seller info for all listings using request batching
  useEffect(() => {
    async function loadSellerInfo() {
      const uniqueSellerUsernames = Array.from(new Set(listings.map(l => l.username)));
      if (uniqueSellerUsernames.length === 0) {
        setSellerInfoMap({});
        return;
      }
      
      // Check if we already have all the seller info we need
      const missingUsernames = uniqueSellerUsernames.filter(username => !sellerInfoMap[username]);
      if (missingUsernames.length === 0) {
        return; // Already have all the data we need
      }
      
      try {
        // Use request batching for efficient seller profile loading
        const sellerPromises = missingUsernames.map(username => 
          requestBatcher.addRequest('user_profile', { username })
        );
        
        const sellerResults = await Promise.allSettled(sellerPromises);
        
        // Update seller info map with new data
        setSellerInfoMap(prev => {
          const newMap = { ...prev };
          sellerResults.forEach((result, index) => {
            if (result.status === 'fulfilled' && result.value) {
              newMap[missingUsernames[index]] = result.value;
            }
          });
          return newMap;
        });
      } catch (error) {
        // Silent error handling for seller info loading
      }
    }
    
    if (listings.length > 0) {
      loadSellerInfo();
    }
  }, [listings]);

  useEffect(() => {
    async function fetchUser() {
      // Only fetch if username is not already set
      if (username) return;
      
      const { data: { user } } = await supabase.auth.getUser();
      setUsername(user?.user_metadata?.username ?? null);
    }
    fetchUser();
  }, [username]);



  // Load existing pings for current user
  useEffect(() => {
    async function loadExistingPings() {
      if (!username || listings.length === 0) return;
      
      try {
        const { data: pings, error } = await supabase
          .from('pings')
          .select('listing_id')
          .eq('sender_username', username)
          .eq('status', 'pending');
        
        if (error) {
          return;
        }
        
        // Create a map of listing IDs that have pending pings
        const pingMap: Record<string, boolean> = {};
        pings?.forEach(ping => {
          pingMap[ping.listing_id] = true;
        });
        
        setExistingPings(pingMap);
      } catch (error) {
        // Silent error handling
      }
    }
    
    loadExistingPings();
  }, [username, listings]);

  // Load ratings for all users in listings
  useEffect(() => {
    if (listings.length > 0) {
      loadUserRatings();
    }
  }, [listings]);

  const loadUserRatings = async () => {
    try {
      // Get unique usernames that need rating data
      const usernamesToCheck = listings
        .map(listing => listing.username)
        .filter(username => username && !userRatings[username]);
      
      if (usernamesToCheck.length === 0) {
        return;
      }

      // Use batch rating service for efficient loading
      const batchRatings = await batchRatingService.getBatchUserRatings(usernamesToCheck);
      
      // Update ratings with batch results
      setUserRatings(prev => {
        const newRatings = { ...prev };
        
        // Add batch ratings
        Object.entries(batchRatings).forEach(([username, rating]) => {
          newRatings[username] = rating;
        });
        
        // Mark users as checked (even if they have no ratings)
        usernamesToCheck.forEach(username => {
          if (newRatings[username] === undefined) {
            newRatings[username] = null;
          }
        });
        
        return newRatings;
      });
    } catch (error) {
      // Silent error handling
    }
  };

  const getRealRating = (username: string) => {
    // Return cached rating data from database only
    if (userRatings[username]) {
      return userRatings[username];
    }
    
    // Return null if no rating data available
    return null;
  };

  // Mark when returning from navigation to prevent unnecessary refreshes
  useFocusEffect(
    React.useCallback(() => {
      // Track screen view
      trackScreenView('Home Screen');
      
      // This runs when the screen comes into focus (returning from other screens)
      if (listings.length > 0) {
        markReturningFromNavigation();
      }
    }, [listings.length, markReturningFromNavigation])
  );

  useEffect(() => {
    if (pingListingId && listings.length > 0) {
      const found = listings.find(l => l.id === pingListingId);
      if (found) {
        setSelectedListingForPing(found);
        setPingModalVisible(true);
        // Clear the param after handling
        router.replace({ pathname: '/', params: {} });
      }
    }
  }, [pingListingId, listings]);

  // Handle back button for modal
  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const backAction = () => {
      if (showAddModal) {
        setShowAddModal(false);
        return true; // Prevent default behavior
      }
      return false; // Let default behavior handle it
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);

    return () => backHandler.remove();
  }, [showAddModal]);

  const categoryIcons = {
    groceries: ShoppingCart,
    fruits: Apple,
    food: UtensilsCrossed,
    services: Wrench,
    fashion: Shirt,
    home: HomeIcon,
    electronics: Zap,
    rental: Home,
    vehicles: Car,
    others: MoreHorizontal,
  };

  // Corrected filteredListings with proper types
  const filteredListings = useMemo(() => {
    return listings.filter((listing: any) => {
      const matchesSearch = listing.title.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || listing.category === selectedCategory;
      const isActive = listing.is_active !== false;
      return matchesSearch && matchesCategory && isActive;
    });
  }, [listings, searchQuery, selectedCategory]);

  // Convert listing format for display with proper types
  const displayListings = useMemo(() => {
    return filteredListings.map((listing: any) => {
      return {
        ...listing,
      };
    });
  }, [filteredListings]);



  // Handler for the message (ping) button
  const handlePingSeller = useCallback(async (listing: any) => {
    try {
      // Check network connectivity first
      if (!networkMonitor.isOnline()) {
        await errorHandler.handleError(
          new Error('No internet connection available'),
          {
            operation: 'ping_seller',
            component: 'HomeScreen',
          }
        );
        return;
      }

      if (!username) {
        await errorHandler.handleError(
          new Error('Please log in to send pings'),
          {
            operation: 'ping_authentication',
            component: 'HomeScreen',
          }
        );
        return;
      }

      // Check if user already has a pending ping to this listing
      const hasExistingPing = await checkExistingPing(listing.id, username);
      if (hasExistingPing) {
        await errorHandler.handleError(
          new Error('You already have a pending ping for this listing. Please wait for the seller to respond.'),
          {
            operation: 'ping_already_sent',
            component: 'HomeScreen',
          }
        );
        return;
      }

      // Check ping limits using hybrid system (forces database check)
      await checkPingLimit(listing.id, true);
      
      // Always open modal, let the modal handle the limit display
      setSelectedListingForPing(listing);
      setPingMessage('Hi, I am interested in your listing!');
      setPingModalVisible(true);
      
    } catch (error) {
      await errorHandler.handleError(error, {
        operation: 'ping_seller_general',
        component: 'HomeScreen',
      });
    }
  }, [username, errorHandler, networkMonitor, checkExistingPing, checkPingLimit]);

  const handleTemplateSelect = useCallback((template: any) => {
    if (template.isCustom) {
      // Keep current message for custom editing
      setPingMessage(pingMessage);
    } else {
      setPingMessage(template.message);
    }
    setShowTemplateSelector(false);
  }, [pingMessage]);

  // Confirm sending the ping
  const confirmSendPing = async () => {
    try {
      if (!selectedListingForPing || !username) {
        await errorHandler.handleError(
          new Error('Unable to send ping. Please try again.'),
          {
            operation: 'ping_validation',
            component: 'HomeScreen',
          }
        );
        return;
      }

      const listing = selectedListingForPing;
      const currentUser = { username: username, name: 'You', avatar: 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=400' };
      const seller = { username: listing.username, name: listing.sellerName, avatar: listing.sellerAvatar };

      // Check rate limiting first
      const rateLimit = await advancedRateLimiter.checkPingRateLimit(username);
      if (!rateLimit.allowed) {
        const retrySeconds = Math.ceil((rateLimit.retryAfter || 0) / 1000);
        await errorHandler.handleError(
          new Error(`You're sending too many pings. Please try again in ${retrySeconds} seconds.`),
          {
            operation: 'ping_rate_limit',
            component: 'HomeScreen',
          }
        );
        return;
      }

      // Validate ping message
      if (!pingMessage.trim()) {
        await errorHandler.handleError(
          new Error('Please enter a message before sending the ping.'),
          {
            operation: 'ping_message_validation',
            component: 'HomeScreen',
          }
        );
        return;
      }

      if (pingMessage.length > 500) {
        await errorHandler.handleError(
          new Error('Ping message must be 500 characters or less.'),
          {
            operation: 'ping_message_length',
            component: 'HomeScreen',
          }
        );
        return;
      }



      // Prevent users from pinging themselves
      if (currentUser.username === seller.username) {
        Alert.alert(
          'Cannot Send Ping',
          'You cannot ping yourself.',
          [{ text: 'OK' }]
        );
        return;
      }

      // Try to create ping online first
      if (isOnline) {
        try {
          await createPing({
            listing_id: listing.id,
            sender_username: currentUser.username,
            receiver_username: seller.username,
            message: pingMessage.trim(),
            status: 'pending'
          });

          // Record ping in local limits and refresh
          await recordPing(listing.id);

          // Update existing pings state
          setExistingPings(prev => ({
            ...prev,
            [listing.id]: true
          }));

          // Show success message
          Alert.alert(
            'Ping Sent!', 
            `Your ping has been sent to ${seller.name || 'the seller'}. You'll be able to chat once they accept your ping.`,
            [{ text: 'OK' }]
          );
          
          trackUserActivity(); // Track meaningful activity
          return;
        } catch (error) {
          // Fall through to offline queue
        }
      }

      // Add to offline queue if online attempt failed or offline
      await addPingAction({
        listing_id: listing.id,
        sender_username: currentUser.username,
        receiver_username: seller.username,
        message: pingMessage.trim(),
        status: 'pending'
      }, 'high');

      // Record ping in local limits and refresh
      await recordPing(listing.id);

      // Update existing pings state
      setExistingPings(prev => ({
        ...prev,
        [listing.id]: true
      }));

      if (isOnline) {
        Alert.alert(
          'Ping Queued', 
          `Your ping has been queued and will be sent when the connection is stable.`
        );
      } else {
        Alert.alert(
          'Ping Saved', 
          `Your ping has been saved and will be sent when you're back online.`
        );
      }
      
      trackUserActivity(); // Track meaningful activity

    } catch (error) {
      await errorHandler.handleError(error, {
        operation: 'ping_creation',
        component: 'HomeScreen',
      });
    } finally {
      setPingModalVisible(false);
      setSelectedListingForPing(null);
      setPingMessage('Hi, I am interested in your listing!');
    }
  };

  const cancelPing = () => {
    setPingModalVisible(false);
    setSelectedListingForPing(null);
    setPingMessage('Hi, I am interested in your listing!');
  };



  const handleImageClick = useCallback((listing: any) => {
    // Track listing view
    trackListingView(listing.id, listing.category, listing.price);
    
    // Get seller data from cache
    const seller = sellerInfoMap[listing.username];
    
    // Navigate to listing detail page with seller data
    if (seller) {
      router.push({
        pathname: '/listing-detail',
        params: {
          id: listing.id,
          sellerData: JSON.stringify(seller)
        }
      });
    } else {
      // Fallback to just ID if seller data not available
      router.push(`/listing-detail?id=${listing.id}`);
    }
  }, [router, sellerInfoMap]);

  const handleToggleSortByDistance = () => {
    trackFilterUsed('distance', 'toggle');
    
    if (!locationAvailable) {
      // Location not available, show alert with options
      Alert.alert(
        'Location Access Required',
        'To filter by distance, we need access to your location. Would you like to enable location access?',
        [
          { text: 'Not Now', style: 'cancel' },
          { 
            text: 'Enable', 
            onPress: async () => {
              await updateLocation();
              setShowDistanceFilterModal(true);
            } 
          }
        ]
      );
    } else {
      // Location available, show distance filter modal
      setShowDistanceFilterModal(true);
    }
  };

  const handleSelectDistance = (distance: number | null) => {
    setDistanceFilter(distance);
    // Enable distance sorting when any distance filter is applied (including "Any distance")
    if (!sortByDistanceState) {
      toggleDistanceSort();
    }
  };

  const renderCategory = useCallback(({ item }: { item: any }) => {
    const IconComponent = categoryIcons[item.id as keyof typeof categoryIcons] || ShoppingCart;
    const isSelected = selectedCategory === item.id;
    
    return (
      <TouchableOpacity
        style={[styles.categoryCard, isSelected && styles.selectedCategory]}
        onPress={() => setSelectedCategory(item.id)}
      >
        <View style={[styles.categoryIcon, isSelected && styles.selectedCategoryIcon]}>
          <IconComponent 
            size={20} 
            color={isSelected ? '#FFFFFF' : '#22C55E'} 
          />
        </View>
        <Text style={[styles.categoryText, isSelected && styles.selectedCategoryText]}>
          {item.name}
        </Text>
      </TouchableOpacity>
    );
  }, [selectedCategory]);

  const keyExtractor = useCallback((item: any) => item.id, []);
  const categoryKeyExtractor = useCallback((item: any) => item.id, []);
  
  const renderListing = useCallback(({ item }: { item: any }) => {
    const seller = sellerInfoMap[item.username] || { name: 'Unknown Seller', avatar_url: '' };
    
    
    return (
      <View style={styles.listingCard}>
        <View style={styles.imageContainer}>
          <TouchableOpacity onPress={() => handleImageClick(item)}>
            <NewRobustImage
              thumbnailImages={item.thumbnail_images}
              previewImages={item.preview_images}
              imageFolderPath={item.image_folder_path}
              size="thumbnail"
              style={styles.listingImage}
              placeholderText="No Image"
              title={item.title}
              onError={(error, imageSet, metadata) => {
                // Error handling
              }}
              onLoad={(imageSet, metadata) => {
                // Load handling
              }}
            />
          </TouchableOpacity>
          
          {/* 3-dots menu button */}
          <TouchableOpacity
            style={styles.optionsButton}
            onPress={() => {
              setSelectedListingForOptions(item);
              setShowOptionsModal(true);
            }}
            activeOpacity={0.7}
          >
            <MoreVertical size={16} color="#64748B" />
          </TouchableOpacity>
        </View>

        <View style={styles.listingContent}>
          <TouchableOpacity onPress={() => handleImageClick(item)}>
            <View style={styles.titleAndDistanceRow}>
              <Text style={styles.listingTitle}>{item.title}</Text>
              <View style={styles.distanceContainer}>
                <MapPin size={12} color="#64748B" />
                {item.distance_km !== undefined && item.distance_km !== null ? (
                  <Text style={styles.distance}>{formatDistance(item.distance_km)}</Text>
                ) : seller.location_display ? (
                  <Text style={styles.distance}>{LocationUtils.formatLocationDisplay(seller.location_display)}</Text>
                ) : (
                  <Text style={[styles.distance, styles.noLocationText]}>No location set</Text>
                )}
              </View>
            </View>
            <View style={styles.priceContainer}>
              <Text style={styles.listingPrice}>₹{item.price}</Text>
              <View style={styles.priceUnitBadge}>
                <Text style={styles.priceUnitText}>
                  {item.price_unit ? 
                    (item.price_unit === 'per_item' ? 'per item' : item.price_unit.replace('per_', 'per ')) 
                    : 'per item'
                  }
                </Text>
              </View>
            </View>

            {/* Seller Name with Verification Badge */}
            <View style={styles.sellerInfo}>
              <Text style={styles.sellerName}>{seller.name || 'Unknown Seller'}</Text>
              {isUserVerified(seller) && <VerificationBadge size="small" />}
            </View>

            {/* Additional Info Section */}
            <View style={styles.additionalInfoContainer}>
              {/* Category, Tags and Date Row */}
              <View style={styles.categoryDateRow}>
                <View style={styles.leftSection}>
                  <View style={styles.categoryBadge}>
                    <Tag size={10} color="#64748B" />
                                      <Text style={styles.listingCategoryText}>
                    {categories.find(cat => cat.id === item.category)?.name || item.category || 'General'}
                  </Text>
                  </View>
                  {item.tags && item.tags.length > 0 && (
                    <Text style={styles.tagsText}>
                      #{item.tags.slice(0, 2).join(' #')}
                    </Text>
                  )}
                </View>
                <View style={styles.dateContainer}>
                  <Clock size={10} color="#94A3B8" />
                  <Text style={styles.dateText}>
                    {formatTimeAgo(item.created_at)}
                  </Text>
                </View>
              </View>



              {/* Seller Rating */}
              <View style={styles.ratingRow}>
                <View style={styles.ratingContainer}>
                  {getRealRating(item.username) ? (
                    <>
                      <Star size={10} color="#F59E0B" fill="#F59E0B" />
                      <Text style={styles.ratingText}>
                        {getRealRating(item.username)?.rating}
                      </Text>
                      <Text style={styles.reviewCountText}>
                        ({getRealRating(item.username)?.reviewCount} reviews)
                      </Text>
                    </>
                  ) : userRatings[item.username] === undefined ? (
                    <Text style={styles.loadingRatingText}>Loading...</Text>
                  ) : (
                    <Text style={styles.noRatingText}>No ratings yet</Text>
                  )}
                </View>
                <View style={[styles.statusBadge, (item.is_active !== false) && styles.activeBadge]}>
                  <Text style={[styles.statusText, (item.is_active !== false) && styles.activeText]}>
                    {(item.is_active !== false) ? 'Active' : 'Inactive'}
                  </Text>
                </View>
              </View>
            </View>
          

          </TouchableOpacity>
          
          {getDescriptionText(item) ? (
            <View style={styles.descriptionContainer}>
              <TouchableOpacity 
                style={styles.descriptionTextContainer}
                onPress={() => toggleDescriptionExpansion(item.id)}
                activeOpacity={0.7}
              >
                <Text 
                  style={styles.descriptionText}
                  numberOfLines={expandedDescriptions[item.id] ? undefined : 2}
                >
                  {getDescriptionText(item)}
                </Text>
                {getDescriptionText(item) && getDescriptionText(item)!.length > 100 && (
                  <Text style={styles.expandIndicator}>
                    {expandedDescriptions[item.id] ? 'Show less' : 'Show more'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          ) : null}



          <View style={styles.actionButtons}>
            <TouchableOpacity 
              style={styles.callButton}
              onPress={() => {
                // Always fetch phone number from sellerInfoMap (profile)
                const sellerProfile = sellerInfoMap[item.username];
                const phoneToCall = sellerProfile && sellerProfile.phone;
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
              style={[
                styles.messageButton,
                existingPings[item.id] && styles.messageButtonSent
              ]} 
              onPress={() => handlePingSeller(item)}
              disabled={existingPings[item.id]}
            >
              {existingPings[item.id] ? (
                <Check size={16} color="#22C55E" />
              ) : (
                <MessageCircle size={16} color={
                  item.username === username ? "#94A3B8" : "#22C55E"
                } />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }, [sellerInfoMap, username, existingPings, expandedDescriptions]);

  // Handler for the floating add button
  const handleAddListing = useCallback(() => {
    setShowCategoryModal(true);
  }, []);

  // Handler for the feedback button
  const handleFeedback = useCallback(() => {
    setShowFeedbackModal(true);
  }, []);

  const toggleDescriptionExpansion = useCallback((listingId: string) => {
    setExpandedDescriptions(prev => ({
      ...prev,
      [listingId]: !prev[listingId]
    }));
  }, []);

  const getDescriptionText = useCallback((item: any) => {
    if (item.description && item.description.trim()) {
      return item.description.trim();
    }
    return null;
  }, []);

  const formatTimeAgo = useCallback((dateString: string) => {
    if (!dateString) return 'Recently';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 48) return 'Yesterday';
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)}w ago`;
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }, []);

  const trackUserActivity = useCallback(() => {
    if (hasShownFeedbackPrompt) return; // Don't track if already shown
    
    const newCount = userActivityCount + 1;
    setUserActivityCount(newCount);
    
    // Show feedback prompt after 3 meaningful activities
    if (newCount >= 3 && !hasShownFeedbackPrompt) {
      Alert.alert(
        'How are you enjoying the app?',
        'We\'d love to hear your feedback to make the app better!',
        [
          {
            text: 'Not Now',
            style: 'cancel',
            onPress: () => setHasShownFeedbackPrompt(true)
          },
          {
            text: 'Rate App',
            onPress: () => {
              setHasShownFeedbackPrompt(true);
              setShowFeedbackModal(true);
            }
          }
        ]
      );
    }
  }, [hasShownFeedbackPrompt, userActivityCount]);

  const handleSubmitFeedback = useCallback(async (rating: number, feedback: string) => {
    if (!username) {
      Alert.alert('Error', 'Please log in to submit feedback');
      return;
    }

    try {
      const { error } = await supabase
        .from('feedback')
        .insert({
          username: username,
          rating: rating,
          feedback: feedback
        });

      if (error) {
        Alert.alert('Error', 'Failed to submit feedback. Please try again.');
        return;
      }

      Alert.alert('Thank You!', `You rated us ${rating} stars. Your feedback helps us improve!`);
      setShowFeedbackModal(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to submit feedback. Please try again.');
    }
  }, [username]);

  // Handler for category selection
  const handleCategorySelect = useCallback((categoryId: string) => {
    setSelectedCategoryForListing(categoryId as Category);
    setShowCategoryModal(false);
    setShowAddModal(true);
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      // Check network connectivity first
      if (!networkMonitor.isOnline()) {
        await errorHandler.handleError(
          new Error('No internet connection available'),
          {
            operation: 'refresh_listings',
            component: 'HomeScreen',
          }
        );
        return;
      }

      // Only wait for listings refresh, not ratings
      await refreshListings();
      
      // Load ratings in background (don't wait for it)
      loadUserRatings().catch(() => {
        // Silent error handling for background rating loading
      });
    } catch (error) {
      await errorHandler.handleError(error, {
        operation: 'refresh_listings',
        component: 'HomeScreen',
      });
    } finally {
      setRefreshing(false);
    }
  }, [refreshListings, loadUserRatings]);

  const handleRetry = useCallback(async () => {
    setLoadingStage('loading');
    try {
      await refreshListings();
      await loadUserRatings();
    } catch (error) {
      setLoadingStage('error');
      await errorHandler.handleError(error, {
        operation: 'retry_listings',
        component: 'HomeScreen',
      });
    }
  }, [refreshListings, loadUserRatings, errorHandler]);

  // Memoized values for FlatList props
  const sectionTitle = useMemo(() => 
    selectedCategory === 'all' ? 'All Listings' : `${categories.find(c => c.id === selectedCategory)?.name} Listings`
  , [selectedCategory]);

  const emptyStateText = useMemo(() => 
    searchQuery
      ? `No results for "${searchQuery}"`
      : 'Try changing filters or adding a new listing'
  , [searchQuery]);

  const onEndReachedHandler = useCallback(() => {
    if (hasMore && !loading) {
      loadMoreListings();
    }
  }, [hasMore, loading, loadMoreListings]);

  const refreshControlComponent = useMemo(() => 
    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#22C55E" />
  , [refreshing, onRefresh]);

  const footerComponent = useMemo(() => 
    loading && hasMore ? (
      <View style={styles.loadingMoreContainer}>
        <Text style={styles.loadingMoreText}>Loading more...</Text>
      </View>
    ) : null
  , [loading, hasMore]);

  // Note: Time limits are now checked on-demand when user clicks ping button
  // This is more efficient and reduces database calls

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Offline Queue Indicator */}
      {/* OfflineQueueIndicator removed - no UI monitoring needed */}
      
      {/* Add Listing Modal */}
      <AddListingModal 
        visible={showAddModal} 
        onClose={() => setShowAddModal(false)} 
        preSelectedCategory={selectedCategoryForListing}
        sellerUsername={username || ''}
      />
      {/* Category Selection Modal */}
      <CategorySelectionModal
        visible={showCategoryModal}
        onClose={() => setShowCategoryModal(false)}
        onSelectCategory={handleCategorySelect}
      />

      {/* Distance Filter Modal */}
      <DistanceFilterModal
        visible={showDistanceFilterModal}
        onClose={() => setShowDistanceFilterModal(false)}
        selectedDistance={maxDistance}
        onSelectDistance={handleSelectDistance}
      />

      {/* Ping Template Selector */}
      <PingTemplateSelector
        visible={showTemplateSelector}
        onClose={() => setShowTemplateSelector(false)}
        onSelectTemplate={handleTemplateSelect}
        listingCategory={selectedListingForPing?.category}
      />

      {/* Enhanced Ping Confirmation Modal with Ping Limits */}
      <Modal
        visible={pingModalVisible}
        transparent
        animationType="slide"
        onRequestClose={cancelPing}

      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 18, padding: 28, width: 320, alignItems: 'stretch', elevation: 8 }}>
            <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 10, textAlign: 'center', color: '#1E293B' }}>Send a Ping</Text>
            <Text style={{ fontSize: 13, color: '#64748B', marginBottom: 18, textAlign: 'center' }}>
              A <Text style={{ fontWeight: 'bold', color: '#22C55E' }}>Ping</Text> lets the seller know you are interested in their listing. You can add a message below. The seller can accept or reject your ping.
              {selectedListingForPing?.username === username && (
                <Text style={{ color: '#F59E0B', fontWeight: 'bold' }}> Note: You are pinging your own listing.</Text>
              )}
            </Text>
            
            {/* Ping Limit Indicator */}
            {username && selectedListingForPing && (
              <View style={{ 
                backgroundColor: getPingLimitColor() + '15', 
                borderWidth: 1.5, 
                borderColor: getPingLimitColor() + '40',
                borderRadius: 10, 
                padding: 14, 
                marginBottom: 18,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{ 
                    width: 8, 
                    height: 8, 
                    borderRadius: 4, 
                    backgroundColor: getPingLimitColor(),
                    marginRight: 10
                  }} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ 
                      fontSize: 13, 
                      color: getPingLimitColor(), 
                      fontWeight: '700',
                      marginBottom: 2
                    }}>
                      {limitLoading ? 'Checking limits...' : getPingLimitMessage()}
                    </Text>
                    <Text style={{ fontSize: 11, color: '#64748B', fontWeight: '500' }}>
                      Daily limit: {limitInfo.remainingPings}/{limitInfo.maxPingsPerDay}
                    </Text>
                  </View>
                </View>
                <View style={{ 
                  width: 28, 
                  height: 28, 
                  borderRadius: 14, 
                  backgroundColor: getPingLimitColor(),
                  justifyContent: 'center',
                  alignItems: 'center',
                  shadowColor: getPingLimitColor(),
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.3,
                  shadowRadius: 4,
                  elevation: 3
                }}>
                  <Text style={{ color: '#fff', fontSize: 12, fontWeight: 'bold' }}>
                    {limitInfo.remainingPings}
                  </Text>
                </View>
              </View>
            )}
            
            {/* Limit reached explanation */}
            {username && selectedListingForPing && limitInfo.remainingPings === 0 && (
              <View style={{ 
                backgroundColor: '#FEF2F2', 
                borderWidth: 1, 
                borderColor: '#FECACA',
                borderRadius: 8, 
                padding: 10, 
                marginBottom: 16
              }}>
                <Text style={{ 
                  fontSize: 11, 
                  color: '#DC2626', 
                  textAlign: 'center',
                  fontFamily: 'Inter-Medium'
                }}>
                  Daily ping limits reset at midnight. You can send more pings tomorrow.
                </Text>
              </View>
            )}
            
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <Text style={{ fontSize: 14, color: '#1E293B' }}>Message to Seller:</Text>
              <TouchableOpacity 
                style={{ 
                  flexDirection: 'row', 
                  alignItems: 'center', 
                  backgroundColor: '#F1F5F9', 
                  paddingHorizontal: 8, 
                  paddingVertical: 4, 
                  borderRadius: 12 
                }}
                onPress={() => setShowTemplateSelector(true)}
              >
                <MessageCircle size={14} color="#64748B" />
                <Text style={{ fontSize: 12, color: '#64748B', marginLeft: 4, fontFamily: 'Inter-Medium' }}>
                  Templates
                </Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={{
                borderWidth: 1,
                borderColor: '#E2E8F0',
                borderRadius: 8,
                padding: 10,
                fontSize: 14,
                color: '#1E293B',
                marginBottom: 18,
                minHeight: 40,
                backgroundColor: '#F8FAFC',
              }}
              value={pingMessage}
              onChangeText={setPingMessage}
              placeholder="Type your message..."
              maxLength={500}
              multiline
            />
            <View style={{ flexDirection: 'row', gap: 16 }}>
              <TouchableOpacity onPress={cancelPing} style={{ flex: 1, backgroundColor: '#F1F5F9', paddingVertical: 12, borderRadius: 8, alignItems: 'center' }}>
                <Text style={{ color: '#64748B', fontWeight: 'bold', fontSize: 15 }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={confirmSendPing} 
                disabled={!limitInfo.canPing || limitLoading}
                style={{ 
                  flex: 1, 
                  backgroundColor: limitInfo.canPing ? '#22C55E' : '#94A3B8', 
                  paddingVertical: 12, 
                  borderRadius: 8, 
                  alignItems: 'center',
                  opacity: (!limitInfo.canPing || limitLoading) ? 0.6 : 1
                }}
              >
                <Text style={{ 
                  color: '#fff', 
                  fontWeight: 'bold', 
                  fontSize: 15,
                  opacity: (!limitInfo.canPing || limitLoading) ? 0.8 : 1
                }}>
                  {limitLoading ? 'Checking...' : 
                   !limitInfo.canPing ? 'Limit Reached' : 'Send'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.searchContainer}>
          <Search size={20} color="#64748B" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search for product or service"
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={(text) => {
              setSearchQuery(text);
              if (text.length > 2) {
                trackSearch(text, filteredListings.length);
              }
            }}
          />
        </View>
        <TouchableOpacity 
          style={[
            styles.filterButton, 
            (sortByDistanceState || maxDistance !== null) && { backgroundColor: '#DCFCE7' }
          ]}
          onPress={handleToggleSortByDistance}
        >
          <Filter size={20} color={(sortByDistanceState || maxDistance !== null) ? '#22C55E' : '#64748B'} />
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.mapButton}
          onPress={() => router.push('/map-view')}
        >
          <MapPin size={20} color="#64748B" />
        </TouchableOpacity>
      </View>

      {/* Categories */}
      <View style={styles.categoriesSection}>
        <FlatList
          data={categories}
          renderItem={renderCategory}
          keyExtractor={categoryKeyExtractor}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesContainer}
          removeClippedSubviews={true}
          maxToRenderPerBatch={5}
          windowSize={5}
          initialNumToRender={5}
        />
      </View>

      {/* Listings */}
      <View style={styles.listingsSection}>
        <Text style={styles.sectionTitle}>
          {sectionTitle}
        </Text>
        

        
        {loadingStage === 'loading' ? (
          <HomeLoadingStates 
            stage="loading"
            onRetry={handleRetry}
          />
        ) : loadingStage === 'offline' ? (
          <HomeLoadingStates 
            stage="offline"
            onRetry={handleRetry}
          />
        ) : loadingStage === 'error' ? (
          <HomeLoadingStates 
            stage="error"
            onRetry={handleRetry}
            errorMessage="Failed to load listings. Please try again."
          />
        ) : displayListings.length === 0 ? (
          <HomeLoadingStates 
            stage="empty"
            onRetry={handleRetry}
          />
        ) : (
          <FlatList
            data={displayListings}
            renderItem={renderListing}
            keyExtractor={keyExtractor}
            numColumns={2}
            contentContainerStyle={styles.listingsContainer}
            columnWrapperStyle={styles.columnWrapper}
            showsVerticalScrollIndicator={false}
            removeClippedSubviews={true}
            maxToRenderPerBatch={10}
            windowSize={10}
            initialNumToRender={10}
            onEndReached={onEndReachedHandler}
            onEndReachedThreshold={0.5}
            refreshControl={refreshControlComponent}
            ListFooterComponent={footerComponent}
          />
        )}
      </View>

      {/* Floating Add Button */}
      <TouchableOpacity 
        style={styles.floatingButton}
        onPress={handleAddListing}
      >
        <Plus size={24} color="#FFFFFF" />
      </TouchableOpacity>

      {/* Floating Feedback Button */}
      <TouchableOpacity 
        style={styles.feedbackButton}
        onPress={handleFeedback}
      >
        <Text style={styles.feedbackButtonText}>💬</Text>
      </TouchableOpacity>

      {/* Enhanced Feedback Modal */}
      <FeedbackModal
        visible={showFeedbackModal}
        onClose={() => setShowFeedbackModal(false)}
        onSubmit={handleSubmitFeedback}
      />

      {/* Listing Options Modal */}
      <ListingOptionsModal
        visible={showOptionsModal}
        onClose={() => setShowOptionsModal(false)}
        listingId={selectedListingForOptions?.id || ''}
        sellerUsername={selectedListingForOptions?.username || ''}
        listingTitle={selectedListingForOptions?.title || ''}
        type="listing"
        onReport={() => {
          // Force refresh listings to hide reported item
          forceRefreshListings();
        }}
        onHide={() => {
          // Force refresh listings to hide the item
          forceRefreshListings();
        }}
        onBlock={() => {
          // Force refresh listings to hide blocked user's items
          forceRefreshListings();
        }}
      />

      {/* Location Check Popup is handled globally in _layout.tsx */}


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
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#1E293B',
    marginLeft: 6,
  },
  filterButton: {
    width: 40,
    height: 40,
    backgroundColor: '#F1F5F9',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  mapButton: {
    width: 40,
    height: 40,
    backgroundColor: '#F1F5F9',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  categoriesSection: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 8,
    marginBottom: 2,
  },
  categoriesContainer: {
    paddingHorizontal: 16,
  },
  categoryCard: {
    alignItems: 'center',
    marginRight: 8,
    padding: 4,
    borderRadius: 6,
    backgroundColor: '#F8FAFC',
    minWidth: 50,
  },
  selectedCategory: {
    backgroundColor: '#22C55E',
  },
  categoryIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 3,
  },
  selectedCategoryIcon: {
    backgroundColor: '#16A34A',
  },
  categoryText: {
    fontSize: 9,
    fontFamily: 'Inter-Medium',
    color: '#64748B',
    textAlign: 'center',
  },
  selectedCategoryText: {
    color: '#FFFFFF',
  },
  listingsSection: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingTop: 6,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1E293B',
    marginBottom: 4,
    marginHorizontal: 16,
  },
  listingsContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  columnWrapper: {
    justifyContent: 'space-between',
  },
  listingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    marginBottom: 8,
    width: ITEM_WIDTH,
    boxShadow: '0px 2px 6px rgba(0,0,0,0.1)',
    elevation: 3,
    overflow: 'hidden',
  },
  imageContainer: {
    position: 'relative',
  },
  listingImage: {
    width: '100%',
    height: 150,
  },
  optionsButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 16,
    padding: 6,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  favoriteButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 3,
    boxShadow: '0px 2px 3px rgba(0,0,0,0.1)',
    elevation: 2,
  },
  listingContent: {
    padding: 8,
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  },
  listingTitle: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
    color: '#1E293B',
    marginBottom: 1,
    minHeight: 24,
  },
  titleAndDistanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 1,
  },
  distanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  descriptionContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 3,
  },
  descriptionTextContainer: {
    flex: 1,
    marginRight: 8,
  },
  descriptionText: {
    fontSize: 11,
    fontFamily: 'Inter-Regular',
    color: '#475569',
    lineHeight: 16,
  },
  expandIndicator: {
    fontSize: 10,
    fontFamily: 'Inter-Medium',
    color: '#22C55E',
    marginTop: 2,
    textDecorationLine: 'underline',
  },
  statusOnlyContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 3,
  },
  additionalInfoContainer: {
    marginBottom: 8,
  },
  categoryDateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 4,
  },
  listingCategoryText: {
    fontSize: 9,
    fontFamily: 'Inter-Medium',
    color: '#475569',
  },
  tagsText: {
    fontSize: 8,
    fontFamily: 'Inter-Regular',
    color: '#94A3B8',
    fontStyle: 'italic',
  },
  conditionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    marginBottom: 4,
  },
  conditionBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  conditionText: {
    fontSize: 8,
    fontFamily: 'Inter-Medium',
    color: '#92400E',
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  dateText: {
    fontSize: 8,
    fontFamily: 'Inter-Regular',
    color: '#94A3B8',
  },
  ratingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  ratingText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#1E293B',
  },
  reviewCountText: {
    fontSize: 10,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
  },
  noRatingText: {
    fontSize: 10,
    fontFamily: 'Inter-Regular',
    color: '#94A3B8',
  },
  loadingRatingText: {
    fontSize: 10,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
  },
  trustBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  trustText: {
    fontSize: 8,
    fontFamily: 'Inter-Medium',
    color: '#16A34A',
  },
  listingPrice: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#22C55E',
    marginBottom: 3,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 3,
    gap: 6,
  },
  priceUnit: {
    fontSize: 10,
    fontFamily: 'Inter-Medium',
    color: '#16A34A',
    marginLeft: 12,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#16A34A',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    overflow: 'hidden',
  },
  priceUnitBadge: {
    backgroundColor: 'transparent',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(100, 116, 139, 0.3)',
  },
  priceUnitText: {
    fontSize: 9,
    fontFamily: 'Inter-Regular',
    color: 'rgba(100, 116, 139, 0.8)',
    textAlign: 'center',
  },

  sellerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    marginTop: 2,
  },
  sellerAvatar: {
    width: 18,
    height: 18,
    borderRadius: 9,
    marginRight: 4,
  },
  sellerDetails: {
    flex: 1,
  },
  sellerName: {
    fontSize: 10,
    fontFamily: 'Inter-Medium',
    color: '#1E293B',
    marginBottom: 0,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  distance: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
    marginLeft: 1,
  },
  noLocationText: {
    color: '#EF4444',
    fontStyle: 'italic',
  },
  statusContainer: {
    marginBottom: 3,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 2,
    backgroundColor: '#F1F5F9',
  },
  activeBadge: {
    backgroundColor: '#DCFCE7',
  },
  statusText: {
    fontSize: 8,
    fontFamily: 'Inter-Medium',
    color: '#64748B',
  },
  activeText: {
    color: '#16A34A',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 3,
    justifyContent: 'flex-end',
    marginTop: 'auto',
  },
  callButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#22C55E',
    paddingVertical: 4,
    borderRadius: 3,
  },
  messageButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0FDF4',
    paddingVertical: 4,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: '#22C55E',
  },
  messageButtonSent: {
    backgroundColor: '#F0FDF4',
    borderColor: '#22C55E',
    opacity: 0.8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
  },
  floatingButton: {
    position: 'absolute',
    bottom: 120,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#22C55E',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  feedbackButton: {
    position: 'absolute',
    bottom: 50,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#22C55E',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  feedbackButtonText: {
    fontSize: 24,
    color: '#FFFFFF',
  },

  sortingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    padding: 8,
    borderRadius: 8,
    marginBottom: 8,
    marginHorizontal: 16,
    gap: 6,
  },
  sortingText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#16A34A',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#1E293B',
    marginBottom: 5,
  },
  emptySubtext: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  loadingMoreContainer: {
    padding: 16,
    alignItems: 'center',
  },
  loadingMoreText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
  },
});

export default withErrorBoundary(HomeScreen, 'HomeScreen');