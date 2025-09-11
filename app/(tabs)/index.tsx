
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
import { Search, MapPin, Filter, ShoppingCart, Apple, UtensilsCrossed, Wrench, Shirt, Chrome as HomeIcon, Zap, Home, Star, Clock, Tag, Car, MoreHorizontal, Heart } from 'lucide-react-native';
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
import FeedbackModal from '@/components/FeedbackModal';
import HomeRatingDisplay from '@/components/HomeRatingDisplay';

import { useRouter, useLocalSearchParams } from 'expo-router';
import CategorySelectionModal from '@/components/CategorySelectionModal';
import DistanceFilterModal from '@/components/DistanceFilterModal';
import { useListings } from '@/hooks/useListings';
import { supabase } from '@/utils/supabaseClient';

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
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [selectedCategoryForListing, setSelectedCategoryForListing] = useState<Category | undefined>(undefined);
  const [showDistanceFilterModal, setShowDistanceFilterModal] = useState(false);
  const [sellerInfoMap, setSellerInfoMap] = useState<Record<string, any>>({});
  const [username, setUsername] = useState<string | null>(null);
  const [userRatings, setUserRatings] = useState<Record<string, { rating: string; reviewCount: number } | null>>({});

  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [userActivityCount, setUserActivityCount] = useState(0);
  const [hasShownFeedbackPrompt, setHasShownFeedbackPrompt] = useState(false);
  const [expandedDescriptions, setExpandedDescriptions] = useState<Record<string, boolean>>({});
  const [loadingStage, setLoadingStage] = useState<'initial' | 'loading' | 'error' | 'offline' | 'empty'>('initial');
  

  
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

  // Location check is handled globally in _layout.tsx

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
      return matchesSearch && matchesCategory;
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
          
          {/* Favorite Button */}
          <TouchableOpacity
            style={styles.favoriteButton}
            onPress={() => {
              // TODO: Implement favorite logic
            }}
            activeOpacity={0.7}
          >
            <Heart size={16} color="#64748B" />
          </TouchableOpacity>
        </View>

        <View style={styles.listingContent}>
          <TouchableOpacity onPress={() => handleImageClick(item)}>
            {/* Distance at the top */}
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

            {/* Seller Name with Verification Badge */}
            <View style={styles.sellerInfo}>
              <Text style={styles.sellerName}>{seller.name || 'Unknown Seller'}</Text>
              {isUserVerified(seller) && <VerificationBadge size="small" />}
            </View>

            {/* Listing Title */}
            <Text style={styles.listingTitle}>{item.title}</Text>

            {/* Price with Unit Badge */}
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

            {/* Seller Rating - Only show if there are ratings */}
            {getRealRating(item.username) && (
              <View style={styles.ratingRow}>
                <View style={styles.ratingContainer}>
                  <Star size={10} color="#F59E0B" fill="#F59E0B" />
                  <Text style={styles.ratingText}>
                    {getRealRating(item.username)?.rating}
                  </Text>
                  <Text style={styles.reviewCountText}>
                    ({getRealRating(item.username)?.reviewCount} reviews)
                  </Text>
                </View>
              </View>
            )}

            {/* Location - City and District */}
            {seller.location_display && (
              <Text style={styles.locationText}>
                {LocationUtils.formatLocationDisplay(seller.location_display)}
              </Text>
            )}
          

          </TouchableOpacity>
          



        </View>
      </View>
    );
  }, [sellerInfoMap, username, expandedDescriptions]);

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
    borderWidth: 1,
    borderColor: '#F1F5F9',
    overflow: 'hidden',
  },
  imageContainer: {
    position: 'relative',
  },
  listingImage: {
    width: '100%',
    height: 150,
    borderWidth: 1,
    borderColor: '#F1F5F9',
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
  distanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
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
    marginBottom: 6,
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
    marginBottom: 4,
  },
  locationText: {
    fontSize: 11,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
    marginTop: 4,
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
