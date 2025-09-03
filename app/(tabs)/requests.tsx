import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
  Linking
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { 
  Search, 
  Filter, 
  Plus,
  MapPin,
  Clock
} from 'lucide-react-native';
import { useRequests } from '@/hooks/useRequests';
import { useLocation } from '@/hooks/useLocation';
import { useAuth } from '@/hooks/useAuth';

import { Request, RequestCategory } from '@/utils/types';
import { getCategoryById } from '@/utils/requestCategories';
import { RequestCard } from '@/components/RequestCard';
import { CreateRequestModal } from '@/components/CreateRequestModal';
import { CategoryFilterModal } from '@/components/CategoryFilterModal';
import { RequestLocationPicker } from '@/components/RequestLocationPicker';
import { UserListingsModal } from '@/components/UserListingsModal';
import { RequestLocationUtils, LocationData } from '@/utils/requestLocationUtils';
import { supabase } from '@/utils/supabaseClient';

const { width } = Dimensions.get('window');

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
    getLastRefreshTime
  } = useRequests();
  const { latitude, longitude, updateLocation } = useLocation();
  const { user } = useAuth();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<RequestCategory | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCategoryFilter, setShowCategoryFilter] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [userLocationData, setUserLocationData] = useState<LocationData | null>(null);
  const [showUserListings, setShowUserListings] = useState(false);
  // Cache status removed - no UI monitoring needed

  // Load initial data when component mounts
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
    
    initializeData();
  }, []);

  // Cache status monitoring removed - no UI display needed

  // Reload data when category changes
  useEffect(() => {
    if (isInitialized) {
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
  }, [selectedCategory, userLocationData, isInitialized]);

  const handleRefresh = useCallback(async () => {
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
  }, [refresh, latitude, longitude, selectedCategory, userLocationData]);

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
    // Refresh requests with new location data
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
  }, [refresh, latitude, longitude, selectedCategory]);

  const handleEditRequest = useCallback((request: Request) => {
    // TODO: Implement edit functionality
    // For now, just show an alert
    Alert.alert(
      'Edit Request',
      'Edit functionality will be implemented soon. You can delete and recreate the request for now.',
      [{ text: 'OK', style: 'default' }]
    );
  }, []);

  const handleDeleteRequest = useCallback((requestId: string) => {
    // Refresh the requests list after deletion
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
  }, [refresh, latitude, longitude, selectedCategory, userLocationData]);

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
    // Filter by search query
    const matchesSearch = !searchQuery || 
      request.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.description?.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Filter by category (if selected)
    const matchesCategory = !selectedCategory || request.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  const handleContact = async (request: Request) => {
    if (!user?.username) {
      Alert.alert('Error', 'Please complete your profile setup first.');
      return;
    }

    try {
      // Fetch the requester's phone number from their profile
      const { data: requesterProfile, error } = await supabase
        .from('users')
        .select('phone, name')
        .eq('username', request.requester_username)
        .single();

      if (error || !requesterProfile) {
        Alert.alert('Error', 'Unable to find requester information.');
        return;
      }

      if (!requesterProfile.phone) {
        Alert.alert(
          'No Phone Number',
          'This requester has not provided a phone number for WhatsApp.',
          [{ text: 'OK', style: 'default' }]
        );
        return;
      }

      // Show confirmation dialog
      Alert.alert(
        'Open WhatsApp',
        `Start a WhatsApp chat with ${requesterProfile.name || request.requester_username}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Open WhatsApp', 
            onPress: () => {
              // Format phone number for WhatsApp (remove any non-digit characters except +)
              const phoneNumber = requesterProfile.phone.replace(/[^\d+]/g, '');
              // Open WhatsApp with the phone number
              const whatsappUrl = `whatsapp://send?phone=${phoneNumber}`;
              Linking.openURL(whatsappUrl).catch(() => {
                // Fallback to WhatsApp web if app is not installed
                const whatsappWebUrl = `https://wa.me/${phoneNumber}`;
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
      // Fetch the requester's phone number from their profile
      const { data: requesterProfile, error } = await supabase
        .from('users')
        .select('phone, name')
        .eq('username', request.requester_username)
        .single();

      if (error || !requesterProfile) {
        Alert.alert('Error', 'Unable to find requester information.');
        return;
      }

      if (!requesterProfile.phone) {
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
        `Call ${requesterProfile.name || request.requester_username}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Call', 
            onPress: () => {
              // Open the phone app with the number
              const phoneUrl = `tel:${requesterProfile.phone}`;
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
      onPress={() => {/* No navigation - requests are not selectable */}}
      onSave={() => {/* Handle save */}}
      onContact={() => handleContact(item)}
      onCall={() => handleCall(item)}
    />
  );

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={styles.title}>Requests</Text>
      <Text style={styles.subtitle}>Find services you need nearby</Text>
      
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Search size={20} color="#64748B" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search requests..."
          placeholderTextColor="#94A3B8"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        <TouchableOpacity 
          style={styles.filterButton}
          onPress={() => setShowCategoryFilter(true)}
        >
          <Filter size={20} color="#64748B" />
        </TouchableOpacity>
      </View>

      {/* Your Listings Button */}
      <TouchableOpacity 
        style={styles.yourListingsButton}
        onPress={() => setShowUserListings(true)}
      >
        <Text style={styles.yourListingsButtonText}>📋 Your Listings</Text>
      </TouchableOpacity>

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
            <Text style={styles.currentLocationButtonText}>📍 Current</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.pickLocationButton}
            onPress={() => setShowLocationPicker(true)}
          >
            <Text style={styles.pickLocationButtonText}>🎯 Pick</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Category Filter */}
      {selectedCategory && (
        <View style={styles.categoryFilter}>
          <Text style={styles.categoryFilterText}>
            {getCategoryById(selectedCategory)?.name}
          </Text>
          <TouchableOpacity onPress={() => handleCategorySelect(null)}>
            <Text style={styles.clearFilterText}>Clear</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Sort Info */}
      <View style={styles.sortInfo}>
        <Text style={styles.sortText}>
          Sort: {userLocationData ? 'Location-based' : 'Latest'}
        </Text>
        <Text style={styles.resultsText}>{filteredRequests.length} requests found</Text>
      </View>

      {/* Cache status indicator removed - no UI monitoring needed */}
    </View>
  );

  const renderFooter = () => {
    if (!loading) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color="#22C55E" />
      </View>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyTitle}>No requests found</Text>
      <Text style={styles.emptySubtitle}>
        {searchQuery ? 'Try adjusting your search' : 'Be the first to create a request in your area'}
      </Text>
      <TouchableOpacity 
        style={styles.createButton}
        onPress={() => setShowCreateModal(true)}
      >
        <Plus size={20} color="#FFFFFF" />
        <Text style={styles.createButtonText}>Create Request</Text>
      </TouchableOpacity>
    </View>
  );

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Something went wrong</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
            <Text style={styles.retryButtonText}>Try Again</Text>
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

      {/* Floating Action Button */}
      <TouchableOpacity 
        style={styles.fab}
        onPress={() => setShowCreateModal(true)}
      >
        <Plus size={20} color="#FFFFFF" />
        <Text style={styles.fabText}>Add Request</Text>
      </TouchableOpacity>

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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  listContainer: {
    paddingBottom: 100,
  },
  header: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748B',
    marginBottom: 20,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1E293B',
  },
  filterButton: {
    padding: 4,
  },
  yourListingsButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 16,
    alignItems: 'center',
  },
  yourListingsButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  locationSection: {
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  locationText: {
    fontSize: 14,
    color: '#64748B',
    marginLeft: 8,
    flex: 1,
  },
  locationButtons: {
    flexDirection: 'row',
    gap: 8,
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
    fontSize: 14,
    fontWeight: '500',
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
    fontSize: 14,
    fontWeight: '500',
  },
  categoryFilter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 16,
  },
  categoryFilterText: {
    fontSize: 14,
    color: '#0369A1',
    fontWeight: '500',
  },
  clearFilterText: {
    fontSize: 14,
    color: '#0369A1',
    textDecorationLine: 'underline',
  },
  sortInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sortText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  resultsText: {
    fontSize: 14,
    color: '#64748B',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 24,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#22C55E',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#22C55E',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 28,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  fabText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#EF4444',
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#22C55E',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  // Cache status styles removed - no UI monitoring needed
});
