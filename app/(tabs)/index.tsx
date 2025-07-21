/* global console */
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Image,
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
import { Search, MapPin, Phone, MessageCircle, Filter, ShoppingCart, Apple, UtensilsCrossed, Wrench, Shirt, Chrome as HomeIcon, Zap, Check, Home } from 'lucide-react-native';
import { Plus } from 'lucide-react-native';
import { mockCategories } from '@/utils/mockData';
import AddListingModal from '@/components/AddListingModal';
import PingTemplateSelector from '@/components/PingTemplateSelector';

import { useRouter, useLocalSearchParams } from 'expo-router';
import CategorySelectionModal from '@/components/CategorySelectionModal';
import DistanceFilterModal from '@/components/DistanceFilterModal';
import { useListings } from '@/hooks/useListings';
import { usePingLimits } from '@/hooks/usePingLimits';
import { supabase } from '@/utils/supabaseClient';
import { createPing, checkExistingPing } from '@/utils/activitySupabase';
import { checkPingTimeLimit } from '@/utils/activitySupabase';
import { formatDistance } from '@/utils/distance';
import { LocationUtils } from '@/utils/locationUtils';

// Helper function to format price with unit
const formatPriceWithUnit = (price: string, priceUnit?: string) => {
  if (!priceUnit || priceUnit === 'per_item') {
    return `₹${price}`;
  }
  
  const unitLabels = {
    per_kg: 'per kg',
    per_piece: 'per piece',
    per_pack: 'per pack',
    per_bundle: 'per bundle',
    per_dozen: 'per dozen',
    per_basket: 'per basket',
    per_plate: 'per plate',
    per_serving: 'per serving',
    per_hour: 'per hour',
    per_service: 'per service',
    per_session: 'per session',
    per_day: 'per day',
    per_commission: 'per commission',
    per_project: 'per project',
    per_week: 'per week',
    per_month: 'per month',
  };
  
  const unitLabel = unitLabels[priceUnit as keyof typeof unitLabels] || priceUnit;
  return { price: `₹${price}`, unit: unitLabel };
};

const { width } = Dimensions.get('window');
const ITEM_WIDTH = (width - 36) / 2; // Account for padding and gap

export default function HomeScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [showAddModal, setShowAddModal] = useState(false);
  const [pingModalVisible, setPingModalVisible] = useState(false);
  const [selectedListingForPing, setSelectedListingForPing] = useState<any>(null);
  const [pingMessage, setPingMessage] = useState('Hi, I am interested in your listing!');
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [selectedCategoryForListing, setSelectedCategoryForListing] = useState<string>('');
  const [showDistanceFilterModal, setShowDistanceFilterModal] = useState(false);
  const [sellerInfoMap, setSellerInfoMap] = useState<Record<string, any>>({});
  const [username, setUsername] = useState<string | null>(null);

  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackRating, setFeedbackRating] = useState<number | null>(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [userActivityCount, setUserActivityCount] = useState(0);
  const [hasShownFeedbackPrompt, setHasShownFeedbackPrompt] = useState(false);
  const [existingPings, setExistingPings] = useState<Record<string, boolean>>({});
  
  // Location-based sorting with updated useListings hook
  const { 
    listings, 
    loading, 
    loadMoreListings, 
    hasMore, 
    refreshListings,
    toggleDistanceSort,
    sortByDistance: sortByDistanceState,
    maxDistance,
    setDistanceFilter,
    locationAvailable,
    updateLocation
  } = useListings();

  
  const [refreshing, setRefreshing] = useState(false);
  const { pingListingId } = useLocalSearchParams();

  // Ping limits for the selected listing
  const { limitInfo, loading: limitLoading, getPingLimitMessage, getPingLimitColor, checkPingLimit, recordPing } = usePingLimits(username);

  // Load seller info for all listings
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
      
      // Batch fetch only missing seller profiles from Supabase
      const { data: users, error } = await supabase
        .from('users')
        .select('username, name, avatar_url, email, phone, location, location_display, bio')
        .in('username', missingUsernames);
      if (error || !users) {
        console.error('Error fetching seller info:', error);
        return;
      }
      
      // Update seller info map with new data
      setSellerInfoMap(prev => {
        const newMap = { ...prev };
        for (const user of users) {
          newMap[user.username] = user;
        }
        return newMap;
      });
    }
    
    if (listings.length > 0) {
      loadSellerInfo();
    }
  }, [listings, sellerInfoMap]);

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
          console.error('Error loading existing pings:', error);
          return;
        }
        
        // Create a map of listing IDs that have pending pings
        const pingMap: Record<string, boolean> = {};
        pings?.forEach(ping => {
          pingMap[ping.listing_id] = true;
        });
        
        setExistingPings(pingMap);
      } catch (error) {
        console.error('Error loading existing pings:', error);
      }
    }
    
    loadExistingPings();
  }, [username, listings]);

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
  };

  // Corrected filteredListings with proper types
  const filteredListings = listings.filter((listing: any) => {
    const matchesSearch = listing.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || listing.category === selectedCategory;
    const isActive = listing.is_active !== false;
    return matchesSearch && matchesCategory && isActive;
  });

  // Convert listing format for display with proper types
  const displayListings = filteredListings.map((listing: any) => {
    const imageUrl = (listing.images && listing.images.length > 0) ? listing.images[0] : 'https://images.pexels.com/photos/1327838/pexels-photo-1327838.jpeg?auto=compress&cs=tinysrgb&w=400';
    
    // Debug logging for image URLs
    console.log(`Listing "${listing.title}":`, {
      hasImages: !!(listing.images && listing.images.length > 0),
      imageCount: listing.images?.length || 0,
      imageUrl: imageUrl.substring(0, 80) + '...',
      isFallback: imageUrl.includes('pexels.com')
    });
    
    return {
      ...listing,
      image: imageUrl,
    };
  });



  // Handler for the message (ping) button
  const handlePingSeller = async (listing: any) => {
    console.log('Ping button pressed!', { listing, username });
    
    if (!username) {
      Alert.alert('Error', 'Please log in to send pings');
      return;
    }

    try {
      // Check if user already has a pending ping to this listing
      const hasExistingPing = await checkExistingPing(listing.id, username);
      if (hasExistingPing) {
        Alert.alert(
          'Ping Already Sent', 
          'You already have a pending ping for this listing. Please wait for the seller to respond.',
          [{ text: 'OK' }]
        );
        return;
      }

      // Check ping limits using hybrid system (forces database check)
      const limitResult = await checkPingLimit(listing.id, true);
      
      // Always open modal, let the modal handle the limit display
      console.log('Setting up ping modal...');
      setSelectedListingForPing(listing);
      setPingMessage('Hi, I am interested in your listing!');
      setPingModalVisible(true);
      console.log('Ping modal should be visible now');
      
    } catch (error) {
      console.error('Error in handlePingSeller:', error);
      Alert.alert('Error', 'Failed to open ping modal. Please try again.');
    }
  };

  const handleTemplateSelect = (template: any) => {
    if (template.isCustom) {
      // Keep current message for custom editing
      setPingMessage(pingMessage);
    } else {
      setPingMessage(template.message);
    }
    setShowTemplateSelector(false);
  };

  // Confirm sending the ping
  const confirmSendPing = async () => {
          if (!selectedListingForPing || !username) {
      Alert.alert('Error', 'Unable to send ping. Please try again.');
      return;
    }

    const listing = selectedListingForPing;
    const currentUser = { username: username, name: 'You', avatar: 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=400' };
    const seller = { username: listing.username, name: listing.sellerName, avatar: listing.sellerAvatar };

    try {
      // Validate ping message
      if (!pingMessage.trim()) {
        Alert.alert('Empty Message', 'Please enter a message before sending the ping.');
        return;
      }

      if (pingMessage.length > 500) {
        Alert.alert('Message Too Long', 'Ping message must be 500 characters or less.');
        return;
      }



      // Allow users to ping themselves (removed restriction)
      // Note: Users can now ping their own listings if needed

      // Use the clean ping system - only create in pings table
      const pingResult = await createPing({
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

    } catch (error) {
      console.error('Ping creation error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to send ping. Please try again.';
      Alert.alert('Ping Failed', errorMessage);
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

  const handleNavigateToSellerProfile = (listing: any) => {
    router.push({
      pathname: '/seller-profile',
      params: {
        sellerId: listing.username || listing.id,
        sellerName: listing.sellerName,
        sellerAvatar: listing.sellerAvatar,
        sellerDistance: listing.distance,
      }
    });
  };

  const handleToggleSortByDistance = () => {
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

  const renderCategory = ({ item }: { item: any }) => {
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
  };

  const renderListing = ({ item }: { item: any }) => {
    const seller = sellerInfoMap[item.username] || {};
    
    return (
      <View style={styles.listingCard}>
        <TouchableOpacity onPress={() => handleNavigateToSellerProfile(item)}>
        <Image 
          source={{ 
            uri: (item.images && item.images.length > 0) ? item.images[0] : (item.image_url || item.image),
            // Add cache busting for debugging
            cache: 'reload'
          }} 
          style={styles.listingImage} 
          resizeMode="cover"
          onError={(error) => console.log(`Image load error for "${item.title}":`, error.nativeEvent)}
          onLoad={() => console.log(`Image loaded successfully for "${item.title}"`)}
        />
        </TouchableOpacity>

        <View style={styles.listingContent}>
          <TouchableOpacity onPress={() => handleNavigateToSellerProfile(item)}>
          <Text style={styles.listingTitle}>{item.title}</Text>
          <View style={styles.priceContainer}>
            {(() => {
              const priceData = formatPriceWithUnit(item.price, item.price_unit);
              if (typeof priceData === 'string') {
                return <Text style={styles.listingPrice}>{priceData}</Text>;
              }
              return (
                <>
                  <Text style={styles.listingPrice}>{priceData.price}</Text>
                  <Text style={styles.priceUnit}>{priceData.unit}</Text>
                </>
              );
            })()}
          </View>
          

          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.sellerInfo}
            onPress={() => handleNavigateToSellerProfile(item)}
          >
            <Image source={{ uri: seller.avatar_url || 'https://via.placeholder.com/30' }} style={styles.sellerAvatar} />
            <View style={styles.sellerDetails}>
              <Text style={styles.sellerName}>{seller.name}</Text>
              <View style={styles.locationRow}>
                <MapPin size={12} color="#64748B" />
                {sortByDistanceState && item.distance && item.distance !== 'Unknown' ? (
                  <Text style={styles.distance}>{formatDistance(item.distance)}</Text>
                ) : seller.location_display ? (
                  <Text style={styles.distance}>{LocationUtils.formatLocationDisplay(seller.location_display)}</Text>
                ) : (
                  <Text style={[styles.distance, styles.noLocationText]}>No location set</Text>
                )}
              </View>
            </View>
            <View style={[styles.statusBadge, item.is_active && styles.activeBadge]}>
              <Text style={[styles.statusText, item.is_active && styles.activeText]}>
                {item.is_active ? 'Active' : 'Inactive'}
              </Text>
            </View>
          </TouchableOpacity>

          <View style={styles.statusContainer}>
            <View style={[styles.statusBadge, item.is_active && styles.activeBadge]}>
              <Text style={[styles.statusText, item.is_active && styles.activeText]}>
                {item.is_active ? 'Active' : 'Inactive'}
              </Text>
            </View>
          </View>

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
  };

  // Handler for the floating add button
  const handleAddListing = () => {
    setShowCategoryModal(true);
  };

  // Handler for the feedback button
  const handleFeedback = () => {
    setFeedbackRating(null);
    setFeedbackText('');
    setShowFeedbackModal(true);
  };

  const trackUserActivity = () => {
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
              setFeedbackRating(null);
              setFeedbackText('');
              setShowFeedbackModal(true);
            }
          }
        ]
      );
    }
  };

  const handleSubmitFeedback = async (rating: number) => {
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
          feedback: feedbackText.trim() || 'No additional feedback provided'
        });

      if (error) {
        console.error('Error submitting feedback:', error);
        Alert.alert('Error', 'Failed to submit feedback. Please try again.');
        return;
      }

      Alert.alert('Thank You!', `You rated us ${rating} stars. Your feedback helps us improve!`);
      setShowFeedbackModal(false);
      setFeedbackRating(null);
      setFeedbackText('');
    } catch (error) {
      console.error('Error submitting feedback:', error);
      Alert.alert('Error', 'Failed to submit feedback. Please try again.');
    }
  };

  // Handler for category selection
  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategoryForListing(categoryId);
    setShowCategoryModal(false);
    setShowAddModal(true);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
    await refreshListings();
    } catch (error) {
      console.error('Refresh failed:', error);
      // Show user-friendly error message
      Alert.alert(
        'Refresh Failed', 
        'Unable to refresh listings. Please check your connection and try again.',
        [{ text: 'OK' }]
      );
    } finally {
    setRefreshing(false);
    }
  };

  // Note: Time limits are now checked on-demand when user clicks ping button
  // This is more efficient and reduces database calls

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
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
            onChangeText={setSearchQuery}
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
      </View>

      {/* Categories */}
      <View style={styles.categoriesSection}>
        <FlatList
          data={mockCategories}
          renderItem={renderCategory}
          keyExtractor={(item) => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesContainer}
        />
      </View>

      {/* Listings */}
      <View style={styles.listingsSection}>
        <Text style={styles.sectionTitle}>
          {selectedCategory === 'all' ? 'All Listings' : `${mockCategories.find(c => c.id === selectedCategory)?.name} Listings`}
        </Text>
        

        
        {loading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading listings...</Text>
          </View>
        ) : displayListings.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No listings found</Text>
            <Text style={styles.emptySubtext}>
              {searchQuery
                ? `No results for "${searchQuery}"`
                : 'Try changing filters or adding a new listing'}
            </Text>
          </View>
        ) : (
          <FlatList
            data={displayListings}
            renderItem={renderListing}
            keyExtractor={(item) => item.id}
            numColumns={2}
            contentContainerStyle={styles.listingsContainer}
            columnWrapperStyle={styles.columnWrapper}
            showsVerticalScrollIndicator={false}
            onEndReached={() => {
              if (hasMore && !loading) {
                loadMoreListings();
              }
            }}
            onEndReachedThreshold={0.5}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#22C55E" />
            }
            ListFooterComponent={
              loading && hasMore ? (
                <View style={styles.loadingMoreContainer}>
                  <Text style={styles.loadingMoreText}>Loading more...</Text>
                </View>
              ) : null
            }
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
      <Modal
        visible={showFeedbackModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFeedbackModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.feedbackModal}>
            <Text style={styles.feedbackModalTitle}>Rate Our App</Text>
            <Text style={styles.feedbackModalText}>
              We'd love to hear your feedback! How would you rate your experience?
            </Text>
            
            {/* Star Rating */}
            <View style={styles.ratingContainer}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity
                  key={star}
                  style={styles.starButton}
                  onPress={() => setFeedbackRating(star)}
                >
                  <Text style={[
                    styles.starText,
                    feedbackRating && star <= feedbackRating ? { color: '#FFD700' } : { color: '#E2E8F0' }
                  ]}>
                    {feedbackRating && star <= feedbackRating ? '★' : '☆'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            
            {/* Feedback Text Input */}
            <Text style={styles.feedbackLabel}>How can we improve? (Optional):</Text>
            <TextInput
              style={styles.feedbackInput}
              value={feedbackText}
              onChangeText={setFeedbackText}
              placeholder="Tell us how we can make the app better for you..."
              placeholderTextColor="#94A3B8"
              multiline
              maxLength={200}
              numberOfLines={3}
            />
            <Text style={styles.characterCount}>
              {feedbackText.length}/200 characters
            </Text>
            
            {/* Action Buttons */}
            <View style={styles.feedbackActions}>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => {
                  setShowFeedbackModal(false);
                  setFeedbackRating(null);
                  setFeedbackText('');
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[
                  styles.submitButton,
                  !feedbackRating && { backgroundColor: '#94A3B8' }
                ]}
                onPress={() => feedbackRating && handleSubmitFeedback(feedbackRating)}
                disabled={!feedbackRating}
              >
                <Text style={styles.submitButtonText}>Submit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    marginBottom: 6,
    marginHorizontal: 16,
  },
  listingsContainer: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  columnWrapper: {
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
    height: 120,
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
    padding: 12,
  },
  listingTitle: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
    color: '#1E293B',
    marginBottom: 2,
    minHeight: 28,
  },
  listingPrice: {
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    color: '#22C55E',
    marginBottom: 6,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
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
  sellerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  sellerAvatar: {
    width: 18,
    height: 18,
    borderRadius: 9,
    marginRight: 5,
  },
  sellerDetails: {
    flex: 1,
  },
  sellerName: {
    fontSize: 10,
    fontFamily: 'Inter-Medium',
    color: '#1E293B',
    marginBottom: 1,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  distance: {
    fontSize: 8,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
    marginLeft: 1,
  },
  noLocationText: {
    color: '#EF4444',
    fontStyle: 'italic',
  },
  statusContainer: {
    marginBottom: 5,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 5,
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
    backgroundColor: '#F0FDF4',
    paddingVertical: 5,
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
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  feedbackModal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 28,
    width: 320,
    alignItems: 'stretch',
    elevation: 8,
  },
  feedbackModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
    color: '#1E293B',
  },
  feedbackModalText: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 18,
    textAlign: 'center',
  },
  ratingContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  starButton: {
    padding: 10,
  },
  starText: {
    fontSize: 24,
  },
  cancelButton: {
    backgroundColor: '#F1F5F9',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#64748B',
    fontWeight: 'bold',
    fontSize: 15,
  },
  feedbackLabel: {
    fontSize: 14,
    color: '#1E293B',
    marginBottom: 8,
    fontWeight: '600',
  },
  feedbackInput: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#1E293B',
    backgroundColor: '#F8FAFC',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  characterCount: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'right',
    marginTop: 4,
    marginBottom: 16,
  },
  feedbackActions: {
    flexDirection: 'row',
    gap: 12,
  },
  submitButton: {
    flex: 1,
    backgroundColor: '#22C55E',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 15,
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