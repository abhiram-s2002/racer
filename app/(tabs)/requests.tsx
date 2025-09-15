import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
  ActivityIndicator,
  Linking
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { 
  Filter, 
  Plus,
  MapPin,
} from 'lucide-react-native';
import { useRequests } from '@/hooks/useRequests';
import { useLocation } from '@/hooks/useLocation';
import { useAuth } from '@/hooks/useAuth';
import { batchRatingService } from '@/utils/batchRatingService';

import { Request, RequestCategory } from '@/utils/types';
import { getCategoryById } from '@/utils/requestCategories';
import { RequestCard } from '@/components/RequestCard';
import { getPhoneWithPermission } from '@/utils/phoneSharingUtils';
import { CreateRequestModal } from '@/components/CreateRequestModal';
import { CategoryFilterModal } from '@/components/CategoryFilterModal';
import { RequestLocationPicker } from '@/components/RequestLocationPicker';
import { UserListingsModal } from '@/components/UserListingsModal';
import ListingOptionsModal from '@/components/ListingOptionsModal';
import { RequestLocationUtils, LocationData } from '@/utils/requestLocationUtils';
import { supabase } from '@/utils/supabaseClient';
import { formatRequestForWhatsApp, createWhatsAppURL, createWhatsAppWebURL } from '@/utils/whatsappMessageFormatter';

// const { width } = Dimensions.get('window');

export default function RequestsScreen() {
  const router = useRouter();
  const { 
    requests, 
    loading, 
    error, 
    hasMore, 
    loadInitialData,
    loadMore, 
    refresh, 
    createRequest,
    isInitialized,
  } = useRequests();
  const { latitude, longitude, updateLocation } = useLocation();
  const { user } = useAuth();
  
  const [selectedCategory, setSelectedCategory] = useState<RequestCategory | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCategoryFilter, setShowCategoryFilter] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [userLocationData, setUserLocationData] = useState<LocationData | null>(null);
  const [showUserListings, setShowUserListings] = useState(false);
  const [requesterRatings, setRequesterRatings] = useState<Record<string, { rating: string; reviewCount: number } | null>>({});
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [selectedRequestForOptions, setSelectedRequestForOptions] = useState<Request | null>(null);
  // Cache status removed - no UI monitoring needed
  
  // Debounce timer for refresh calls
  const refreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const refreshCountRef = useRef<number>(0);
  const MAX_AUTO_REFRESHES = 3; // Limit automatic refreshes

  // Load initial data when component mounts - ONLY ONCE
  useEffect(() => {
    const initializeData = async () => {
      try {
        await updateLocation();
        
        // Try to get cached location data first
        const cachedLocation = await RequestLocationUtils.getCachedLocation();
        
        if (cachedLocation) {
          setUserLocationData(cachedLocation);
          await loadInitialData(
            latitude || undefined, 
            longitude || undefined, 
            selectedCategory || undefined,
            {
              location_state: cachedLocation.location_state,
              location_district: cachedLocation.location_district,
              location_name: cachedLocation.location_name,
            }
          );
        } else {
          await loadInitialData(latitude || undefined, longitude || undefined, selectedCategory || undefined);
        }
      } catch (initError) {
        // Handle initialization error silently
      }
    };
    
    // ONLY initialize once when component first mounts
    if (!isInitialized) {
      initializeData();
    }
  }, []); // Empty dependency array - only run once

  // Load requester ratings for all requests
  const loadRequesterRatings = async () => {
    try {
      const uniqueRequesters = Array.from(new Set(requests.map(r => r.requester_username)));
      if (uniqueRequesters.length === 0) return;

      const batchRatings = await batchRatingService.getBatchUserRatings(uniqueRequesters);
      setRequesterRatings(prev => {
        const newRatings = { ...prev };
        Object.entries(batchRatings).forEach(([username, rating]) => {
          newRatings[username] = rating;
        });
        return newRatings;
      });
    } catch (error) {
      // Silent error handling for rating loading
    }
  };

  // Load ratings when requests change
  useEffect(() => {
    if (requests.length > 0) {
      loadRequesterRatings();
    }
  }, [requests]);

  // Cache status monitoring removed - no UI display needed


  // Reload data when category changes - ONLY when category actually changes
  useEffect(() => {
    // Only refresh if already initialized AND not currently loading AND category actually changed AND under refresh limit
    if (isInitialized && !loading && !refreshing && selectedCategory !== null && refreshCountRef.current < MAX_AUTO_REFRESHES) {
      refreshCountRef.current++;
      refresh(
        latitude || undefined, 
        longitude || undefined, 
        selectedCategory || undefined,
        userLocationData ? {
          location_state: userLocationData.location_state,
          location_district: userLocationData.location_district,
          location_name: userLocationData.location_name,
        } : undefined
      );
    }
  }, [selectedCategory]); // Only depend on selectedCategory

  // Reload data when location changes - ONLY when location actually changes
  useEffect(() => {
    // Only refresh if already initialized AND not currently loading AND location actually changed AND under refresh limit
    if (isInitialized && !loading && !refreshing && (latitude || longitude) && refreshCountRef.current < MAX_AUTO_REFRESHES) {
      refreshCountRef.current++;
      refresh(
        latitude || undefined, 
        longitude || undefined, 
        selectedCategory || undefined,
        userLocationData ? {
          location_state: userLocationData.location_state,
          location_district: userLocationData.location_district,
          location_name: userLocationData.location_name,
        } : undefined
      );
    }
  }, [latitude, longitude]); // Only depend on location coordinates

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, []);

  const handleRefresh = useCallback(async () => {
    // Prevent duplicate refresh calls
    if (refreshing || loading) return;
    
    refreshCountRef.current = 0; // Reset counter on manual refresh
    
    setRefreshing(true);
    await refresh(
      latitude || undefined, 
      longitude || undefined, 
      selectedCategory || undefined,
      userLocationData ? {
        location_state: userLocationData.location_state,
        location_district: userLocationData.location_district,
        location_name: userLocationData.location_name,
      } : undefined
    );
    setRefreshing(false);
  }, [refresh, latitude, longitude, selectedCategory, userLocationData, refreshing, loading]);

  const handleLoadMore = useCallback(() => {
    if (hasMore && !loading) {
      loadMore(
        latitude || undefined, 
        longitude || undefined, 
        selectedCategory || undefined,
        userLocationData ? {
          location_state: userLocationData.location_state,
          location_district: userLocationData.location_district,
          location_name: userLocationData.location_name,
        } : undefined
      );
    }
  }, [hasMore, loading, loadMore, latitude, longitude, selectedCategory, userLocationData]);

  const handleCategorySelect = useCallback(async (categoryId: string | null) => {
    setSelectedCategory(categoryId as RequestCategory | null);
  }, []);

  const handleLocationSelect = useCallback(async (locationData: LocationData) => {
    setUserLocationData(locationData);
    // Refresh requests with new location data (only if not already loading)
    if (!loading && !refreshing) {
      await refresh(
        latitude || undefined,
        longitude || undefined,
        selectedCategory || undefined,
        {
          location_state: locationData.location_state,
          location_district: locationData.location_district,
          location_name: locationData.location_name,
        }
      );
    }
  }, [refresh, latitude, longitude, selectedCategory, loading, refreshing]);

  // const handleEditRequest = useCallback((request: Request) => {
  //   // Edit functionality not yet implemented
  //   Alert.alert(
  //     'Edit Request',
  //     'Edit functionality will be implemented soon. You can delete and recreate the request for now.',
  //     [{ text: 'OK', style: 'default' }]
  //   );
  // }, []);

  // const handleDeleteRequest = useCallback((requestId: string) => {
  //   // Refresh the requests list after deletion (only if not already loading)
  //   if (!loading && !refreshing) {
  //     refresh(
  //       latitude || undefined,
  //       longitude || undefined,
  //       selectedCategory || undefined,
  //       userLocationData ? {
  //         location_state: userLocationData.location_state,
  //         location_district: userLocationData.location_district,
  //         location_name: userLocationData.location_name,
  //       } : undefined
  //     );
  //   }
  // }, [refresh, latitude, longitude, selectedCategory, userLocationData, loading, refreshing]);

  // Debounced refresh function to prevent rapid successive calls
  const debouncedRefresh = useCallback(() => {
    // Clear existing timeout
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }
    
    // Set new timeout with longer debounce
    refreshTimeoutRef.current = setTimeout(() => {
      if (!loading && !refreshing) {
        refresh(
          latitude || undefined,
          longitude || undefined,
          selectedCategory || undefined,
          userLocationData ? {
            location_state: userLocationData.location_state,
            location_district: userLocationData.location_district,
            location_name: userLocationData.location_name,
          } : undefined
        );
      }
    }, 1000); // 1 second debounce to minimize API calls
  }, [refresh, latitude, longitude, selectedCategory, userLocationData, loading, refreshing]);

  // Helper function to refresh requests with current parameters
  const refreshRequests = useCallback(() => {
    debouncedRefresh();
  }, [debouncedRefresh]);

  const handleUseCurrentLocation = useCallback(async () => {
    const result = await RequestLocationUtils.getCurrentLocation();
    if (result.success && result.data) {
      await handleLocationSelect(result.data);
    } else {
      Alert.alert('Location Error', result.error || 'Unable to get your current location.');
    }
  }, [handleLocationSelect]);

  const handleCreateRequest = async (requestData: Partial<Request>) => {
    if (!user?.username) {
      Alert.alert('Error', 'Please complete your profile setup first.');
      return;
    }

    try {
      await createRequest({
        ...requestData,
        requester_username: user.username,
        latitude: latitude || undefined,
        longitude: longitude || undefined,
      });
      setShowCreateModal(false);
      await handleRefresh();
    } catch (error) {
      Alert.alert('Error', 'Failed to create request. Please try again.');
    }
  };

  const filteredRequests = requests.filter(request => {
    // Filter by category (if selected)
    const matchesCategory = !selectedCategory || request.category === selectedCategory;
    
    return matchesCategory;
  });

  const handleContact = async (request: Request) => {
    if (!user?.username) {
      Alert.alert('Error', 'Please complete your profile setup first.');
      return;
    }

    try {
      // Get current user ID and requester's user ID
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) {
        Alert.alert('Error', 'Please log in to continue.');
        return;
      }

      const { data: requesterUser, error: requesterError } = await supabase
        .from('users')
        .select('id, name')
        .eq('username', request.requester_username)
        .single();

      if (requesterError || !requesterUser) {
        Alert.alert('Error', 'Unable to find requester information.');
        return;
      }

      // Check phone sharing permission using unlock system
      const { phone, canShare } = await getPhoneWithPermission(
        requesterUser.id,
        currentUser.id
      );

      if (!canShare) {
        Alert.alert(
          'Phone Not Available',
          'Phone number will be available after ping is accepted.',
          [{ text: 'OK', style: 'default' }]
        );
        return;
      }

      if (!phone) {
        Alert.alert(
          'No Phone Number',
          'This requester has not provided a phone number for WhatsApp.',
          [{ text: 'OK', style: 'default' }]
        );
        return;
      }

      // Format request details for WhatsApp message
      const requestMessage = formatRequestForWhatsApp(request, requesterUser.name);

      // Show confirmation dialog
      Alert.alert(
        'Open WhatsApp',
        `Start a WhatsApp chat with ${requesterUser.name || request.requester_username} about their request?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Open WhatsApp', 
            onPress: () => {
              // Format phone number for WhatsApp (remove any non-digit characters except +)
              const phoneNumber = phone.replace(/[^\d+]/g, '');
              // Open WhatsApp with the phone number and pre-filled message
              const whatsappUrl = createWhatsAppURL(phoneNumber, requestMessage);
              Linking.openURL(whatsappUrl).catch(() => {
                // Fallback to WhatsApp web if app is not installed
                const whatsappWebUrl = createWhatsAppWebURL(phoneNumber, requestMessage);
                Linking.openURL(whatsappWebUrl);
              });
            }
          }
        ]
      );
    } catch (error) {
      // Error fetching requester phone
      Alert.alert('Error', 'Failed to get requester information. Please try again.');
    }
  };

  const handleCall = async (request: Request) => {
    if (!user?.username) {
      Alert.alert('Error', 'Please complete your profile setup first.');
      return;
    }

    try {
      // Get current user ID and requester's user ID
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) {
        Alert.alert('Error', 'Please log in to continue.');
        return;
      }

      const { data: requesterUser, error: requesterError } = await supabase
        .from('users')
        .select('id, name')
        .eq('username', request.requester_username)
        .single();

      if (requesterError || !requesterUser) {
        Alert.alert('Error', 'Unable to find requester information.');
        return;
      }

      // Check phone sharing permission using unlock system
      const { phone, canShare } = await getPhoneWithPermission(
        requesterUser.id,
        currentUser.id
      );

      if (!canShare) {
        Alert.alert(
          'Phone Not Available',
          'Phone number will be available after ping is accepted.',
          [{ text: 'OK', style: 'default' }]
        );
        return;
      }

      if (!phone) {
        Alert.alert(
          'No Phone Number',
          'This requester has not provided a phone number.',
          [{ text: 'OK', style: 'default' }]
        );
        return;
      }

      // Show confirmation dialog
      Alert.alert(
        'Call Request Creator',
        `Call ${requesterUser.name || request.requester_username}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Call', 
            onPress: () => {
              // Open the phone app with the number
              const phoneUrl = `tel:${phone}`;
              Linking.openURL(phoneUrl);
            }
          }
        ]
      );
    } catch (error) {
      // Error fetching requester phone
      Alert.alert('Error', 'Failed to get requester information. Please try again.');
    }
  };

  const renderRequestCard = ({ item }: { item: Request }) => (
    <RequestCard 
      request={item} 
      requesterName={item.requester_name}
      requesterVerified={item.requester_verified}
      requesterRating={requesterRatings[item.requester_username]}
      onPress={() => {/* No navigation - requests are not selectable */}}
      onSave={() => {/* Handle save */}}
      onContact={() => handleContact(item)}
      onCall={() => handleCall(item)}
      onOptions={() => {
        setSelectedRequestForOptions(item);
        setShowOptionsModal(true);
      }}
      onNamePress={() => router.push(`/seller/${item.requester_username}` as any)}
    />
  );

  const renderHeader = () => (
    <View style={styles.header}>
      {/* Header Title Section */}
      <View style={styles.headerTitleSection}>
        <Text style={styles.title}>Service Requests</Text>
        <Text style={styles.subtitle}>Find and connect with local service providers</Text>
      </View>
      
      {/* Filter Button */}
      <View style={styles.filterRow}>
        <TouchableOpacity 
          style={styles.filterButton}
          onPress={() => setShowCategoryFilter(true)}
        >
          <Filter size={20} color="#64748B" />
          <Text style={styles.filterButtonText}>Filter by Category</Text>
        </TouchableOpacity>
      </View>

      {/* Action Buttons Row */}
      <View style={styles.actionButtonsRow}>
        <TouchableOpacity 
          style={styles.yourListingsButton}
          onPress={() => setShowUserListings(true)}
        >
          <Text style={styles.yourListingsButtonText}>My Requests</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.createRequestButton}
          onPress={() => setShowCreateModal(true)}
        >
          <Plus size={14} color="#FFFFFF" />
          <Text style={styles.createRequestButtonText}>Create Request</Text>
        </TouchableOpacity>
      </View>

      {/* Location Section */}
      <View style={styles.locationSection}>
        <View style={styles.locationInfo}>
          <MapPin size={16} color="#64748B" />
          <Text style={styles.locationText}>
            {userLocationData 
              ? RequestLocationUtils.formatLocationForDisplay(userLocationData)
              : 'No location set'
            }
          </Text>
        </View>
        <View style={styles.locationButtons}>
          <TouchableOpacity 
            style={styles.currentLocationButton}
            onPress={handleUseCurrentLocation}
          >
            <Text style={styles.currentLocationButtonText}>Use Current Location</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.pickLocationButton}
            onPress={() => setShowLocationPicker(true)}
          >
            <Text style={styles.pickLocationButtonText}>Select Location</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Category Filter */}
      {selectedCategory && (
        <View style={styles.categoryFilter}>
          <Text style={styles.categoryFilterText}>
            Filtered by: {getCategoryById(selectedCategory)?.name}
          </Text>
          <TouchableOpacity onPress={() => handleCategorySelect(null)}>
            <Text style={styles.clearFilterText}>Clear Filter</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Results Summary */}
      <View style={styles.resultsSummary}>
        <Text style={styles.resultsText}>
          {filteredRequests.length} {filteredRequests.length === 1 ? 'request' : 'requests'} found
        </Text>
        <Text style={styles.sortText}>
          {userLocationData ? 'Sorted by distance' : 'Sorted by latest'}
        </Text>
      </View>

      {/* Cache status indicator removed - no UI monitoring needed */}
    </View>
  );

  const renderFooter = () => {
    if (!loading) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color="#22C55E" />
        <Text style={styles.loadingText}>Loading more requests...</Text>
      </View>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconContainer}>
        <Text style={styles.emptyIcon}>📋</Text>
      </View>
      <Text style={styles.emptyTitle}>
        No service requests available
      </Text>
      <Text style={styles.emptySubtitle}>
        Be the first to post a service request in your area and connect with local providers
      </Text>
      <TouchableOpacity 
        style={styles.createButton}
        onPress={() => setShowCreateModal(true)}
      >
        <Plus size={20} color="#FFFFFF" />
        <Text style={styles.createButtonText}>Post New Request</Text>
      </TouchableOpacity>
    </View>
  );

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <View style={styles.errorIconContainer}>
            <Text style={styles.errorIcon}>⚠️</Text>
          </View>
          <Text style={styles.errorTitle}>Unable to load requests</Text>
          <Text style={styles.errorMessage}>
            We&apos;re having trouble connecting to our servers. Please check your internet connection and try again.
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={filteredRequests}
        renderItem={renderRequestCard}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#22C55E']}
            tintColor="#22C55E"
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.1}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContainer}
      />


      {/* Modals */}
      <CreateRequestModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateRequest}
      />

      <CategoryFilterModal
        visible={showCategoryFilter}
        onClose={() => setShowCategoryFilter(false)}
        onSelectCategory={handleCategorySelect}
        selectedCategory={selectedCategory}
      />

      <RequestLocationPicker
        visible={showLocationPicker}
        onClose={() => setShowLocationPicker(false)}
        onLocationSelect={handleLocationSelect}
        initialLocation={userLocationData || undefined}
      />

      <UserListingsModal
        visible={showUserListings}
        onClose={() => setShowUserListings(false)}
        userId={user?.username || ''}
        onEditRequest={handleEditRequest}
        onDeleteRequest={handleDeleteRequest}
      />

      <ListingOptionsModal
        visible={showOptionsModal}
        onClose={() => setShowOptionsModal(false)}
        requestId={selectedRequestForOptions?.id}
        sellerUsername={selectedRequestForOptions?.requester_username || ''}
        listingTitle={selectedRequestForOptions?.title || ''}
        type="request"
        onReport={refreshRequests}
        onHide={refreshRequests}
        onBlock={refreshRequests}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  listContainer: {
    paddingBottom: 120,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
  },
  headerTitleSection: {
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 18,
    fontWeight: '400',
  },
  filterRow: {
    marginBottom: 12,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
  },
  filterButtonText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  yourListingsButton: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  yourListingsButtonText: {
    color: '#475569',
    fontSize: 13,
    fontWeight: '600',
  },
  createRequestButton: {
    flex: 1,
    backgroundColor: '#22C55E',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  createRequestButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  locationSection: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  locationText: {
    fontSize: 13,
    color: '#64748B',
    marginLeft: 6,
    flex: 1,
  },
  locationButtons: {
    flexDirection: 'row',
    gap: 6,
  },
  currentLocationButton: {
    flex: 1,
    backgroundColor: '#22C55E',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  currentLocationButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  pickLocationButton: {
    flex: 1,
    backgroundColor: '#3B82F6',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  pickLocationButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  categoryFilter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  categoryFilterText: {
    fontSize: 12,
    color: '#0369A1',
    fontWeight: '600',
  },
  clearFilterText: {
    fontSize: 12,
    color: '#0369A1',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  resultsSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  sortText: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
  },
  resultsText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 80,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyIcon: {
    fontSize: 32,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#22C55E',
    paddingHorizontal: 28,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  footerLoader: {
    paddingVertical: 24,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 80,
  },
  errorIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FEF2F2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  errorIcon: {
    fontSize: 32,
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#DC2626',
    marginBottom: 12,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  retryButton: {
    backgroundColor: '#22C55E',
    paddingHorizontal: 28,
    paddingVertical: 16,
    borderRadius: 12,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  // Cache status styles removed - no UI monitoring needed
});
