import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Alert,
  BackHandler,
  Platform,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Package, MessageCircle, Send, Eye, EyeOff, Trash2, Check, X, Plus, MapPin } from 'lucide-react-native';
import AddListingModal from '@/components/AddListingModal';
import CategorySelectionModal from '@/components/CategorySelectionModal';
import { Activity, deleteActivity } from '@/utils/activitySupabase';
import { deleteListing as deleteListingWithImages } from '../../utils/listingSupabase';
import { useIsFocused } from '@react-navigation/native';
import { useCachedActivities } from '@/hooks/useCachedActivities';

import { useRouter } from 'expo-router';
// Removed react-native-expo-image-cache import - using standard Image component
import { supabase } from '@/utils/supabaseClient';

import { formatPriceWithUnit } from '@/utils/formatters';
import { Category } from '@/utils/types';

import NewRobustImage from '@/components/NewRobustImage';


declare const console: Console;

// Add this function at the top level of the file
const openInGoogleMaps = (latitude: number, longitude: number) => {
  const url = Platform.select({
    ios: `maps://app?saddr=&daddr=${latitude},${longitude}`,
    android: `google.navigation:q=${latitude},${longitude}`
  });

  Linking.canOpenURL(url!).then((supported) => {
    if (supported) {
      Linking.openURL(url!);
    } else {
      // If the platform-specific URL doesn't work, try the web URL
      Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`);
    }
  });
};

export default function ActivityScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'listings' | 'received' | 'sent'>('listings');
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedCategoryForListing, setSelectedCategoryForListing] = useState<Category | undefined>(undefined);
  const [refreshing, setRefreshing] = useState(false);
  const isFocused = useIsFocused();
  const [username, setUsername] = useState<string | null>(null);
  
  // New state for enhanced organization
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'accepted' | 'rejected'>('all');

  useEffect(() => {
    async function fetchUser() {
      const { data: { user } } = await supabase.auth.getUser();
      setUsername(user?.user_metadata?.username ?? null);
    }
    fetchUser();
  }, []);

  // Use the new caching hook
  const {
    activities,
    sentPings,
    receivedPings,
    myListings,
    userProfiles,
    loading,
    refresh,
    updateActivity,
    removeActivity,
    addActivity,
  } = useCachedActivities(username);

  // Assume you have a way to get the current user's ID
  const currentUsername = username || '';

  // Handle back button
  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const backAction = () => {
      if (showAddModal) {
        setShowAddModal(false);
        return true;
      }
      if (showCategoryModal) {
        setShowCategoryModal(false);
        return true;
      }
      return false;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);

    return () => backHandler.remove();
  }, [showAddModal, showCategoryModal]);

  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategoryForListing(categoryId as Category);
    setShowAddModal(true);
  };

  // Type guards using imported types
  function isListingActivity(activity: Activity): activity is Activity {
    return activity.type === 'listing';
  }
  function isPingActivity(activity: Activity): activity is Activity {
    return activity.type === 'received_ping' || activity.type === 'sent_ping';
  }

  const filteredActivities = (() => {
    if (activeTab === 'listings') {
      return myListings;
    } else if (activeTab === 'received') {
      return receivedPings.filter(activity => {
        if (statusFilter !== 'all' && activity.status !== statusFilter) {
          return false;
        }
        return true;
      });
    } else if (activeTab === 'sent') {
      return sentPings.filter(activity => {
        if (statusFilter !== 'all' && activity.status !== statusFilter) {
          return false;
        }
        return true;
      });
    }
    return [];
  })();

  // Toggle listing status (active/inactive) and update persistent storage
  const toggleListingStatus = async (id: string) => {
    if (!currentUsername) return;
    
    // Find the listing to toggle
    const listing = myListings.find(listing => listing.id === id);
    if (!listing) return;
    
    const newStatus = !listing.is_active;
    
    try {
      // Update in Supabase
      await supabase.from('listings').update({ is_active: newStatus }).eq('id', id);
      
      // Update cached data
      updateActivity(id, { is_active: newStatus });
      
    } catch (error) {
      console.error('Error toggling listing status:', error);
      Alert.alert('Error', 'Failed to update listing status. Please try again.');
    }
  };

  // Edit listing handler (opens AddListingModal in edit mode)
  const deleteListing = (id: string) => {
    if (!currentUsername) return;
    Alert.alert(
      'Delete Listing',
      'Are you sure you want to permanently delete this listing? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              // 1. Delete from Supabase listings table and storage
              await deleteListingWithImages(id);

              // 2. Delete related activities from local storage
              await deleteActivity(id);

              // 3. Remove from cached data
              removeActivity(id);

              Alert.alert('Success', 'Listing deleted successfully!');
            } catch (error) {
              console.error('Error in delete process:', error);
              Alert.alert('Error', 'Failed to delete listing. Please try again.');
            }
          },
        },
      ]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return '#F59E0B';
      case 'accepted':
        return '#22C55E';
      case 'rejected':
        return '#EF4444';
      default:
        return '#64748B';
    }
  };

  // Accept/Reject handler for pings
  const handlePingResponse = async (pingId: string, response: 'accepted' | 'rejected') => {
    if (!currentUsername) return;
    
    try {
      // Update ping status in database
      const { error } = await supabase
        .from('pings')
        .update({ 
          status: response,
          responded_at: new Date().toISOString()
        })
        .eq('id', pingId);
      
      if (error) {
        console.error('Error updating ping status:', error);
        Alert.alert('Error', 'Failed to update ping status. Please try again.');
        return;
      }
      
      // If ping is accepted, create chat and send acceptance message
      if (response === 'accepted') {
        try {
          // Create chat from ping (this will also add the ping message to chat)
          const { data: chatId, error: chatError } = await supabase.rpc('create_chat_from_ping', {
            ping_id: pingId
          });
          
          if (chatError) {
            console.error('Error creating chat from ping:', chatError);
          } else {
            // Chat created successfully
            
            // Send acceptance message to the chat
            const { error: messageError } = await supabase.rpc('send_chat_message', {
              chat_id_param: chatId,
              sender_username_param: currentUsername,
              message_text: 'Ping accepted! You can now chat about this listing.'
            });
            
            if (messageError) {
              console.error('Error sending acceptance message:', messageError);
            }
          }
        } catch (chatError) {
          console.error('Error in chat creation process:', chatError);
        }
      }
      
      // Update cached data with new status
      updateActivity(pingId, { status: response });
    } catch (error) {
      console.error('Error updating ping status:', error);
      Alert.alert('Error', 'Failed to update ping status. Please try again.');
    }
  };

  const deletePing = async (pingId: string) => {
    if (!currentUsername) return;
    
    Alert.alert(
      'Delete Ping',
      'Are you sure you want to delete this ping? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              // Delete ping from database
              const { error } = await supabase
                .from('pings')
                .delete()
                .eq('id', pingId);
              
              if (error) {
                console.error('Error deleting ping:', error);
                Alert.alert('Error', 'Failed to delete ping. Please try again.');
                return;
              }

              // Remove from cached data
              removeActivity(pingId);
              
              Alert.alert('Success', 'Ping deleted successfully!');
            } catch (error) {
              console.error('Error deleting ping:', error);
              Alert.alert('Error', 'Failed to delete ping. Please try again.');
            }
          }
        }
      ]
    );
  };

  // Pull-to-refresh handler
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refresh();
    } catch (error) {
      console.error('Error refreshing activities:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const renderListingItem = ({ item }: { item: Activity }) => {
    // Check for different possible image field names
    const anyItem = item as any; // Type assertion to bypass strict typing
    
    const { is_active, title, price, id } = item;
    return (
    <View style={styles.activityCard}>
      <View style={styles.listingHeader}>
          <NewRobustImage 
            images={item.images || (item.image ? [item.image] : undefined)}
            thumbnailImages={item.thumbnail_images}
            previewImages={item.preview_images}
            imageFolderPath={item.image_folder_path}
            style={styles.listingImage}
            placeholderText="No Image"
            size="thumbnail"
            title={item.title}
          />
        <View style={styles.listingDetails}>
            <Text style={styles.listingTitle}>{title}</Text>
            <Text style={styles.listingPrice}>{formatPriceWithUnit(price || '0', (item as any).price_unit)}</Text>
        </View>
        {/* Status badge absolutely positioned inside card */}
        <View style={styles.listingStatusBadgeContainer}>
            <View style={[styles.statusBadge, is_active ? styles.activeBadge : styles.inactiveBadge]}>
              <Text style={[styles.statusText, is_active ? styles.activeText : styles.inactiveText]}>
                {is_active ? 'Active' : 'Inactive'}
            </Text>
          </View>
        </View>
      </View>
      <View style={styles.listingActions}>
        <TouchableOpacity 
          style={styles.actionButton}
            onPress={() => toggleListingStatus(id)}
        >
            {is_active ? (
            <EyeOff size={16} color="#64748B" />
          ) : (
            <Eye size={16} color="#64748B" />
          )}
            <Text style={styles.actionText}>{is_active ? 'Deactivate' : 'Activate'}</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.actionButton}
            onPress={() => deleteListing(id)}
        >
          <Trash2 size={16} color="#EF4444" />
          <Text style={[styles.actionText, styles.deleteText]}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
  };

  const renderPingItem = ({ item }: { item: Activity }) => {
    const handleChatPress = async () => {
      try {
        // For accepted pings, get the existing chat or create a new one
        let chatId;
        
        if (item.status === 'accepted') {
          // Try to get existing chat first
          const { data: existingChatId, error: getError } = await supabase.rpc('get_chat_for_ping', {
            ping_id: item.id
          });
          
          if (getError) {
            console.error('Error getting existing chat:', getError);
          }
          
          if (getError || !existingChatId) {
            // If no existing chat or error, create one
            const { data: newChatId, error: createError } = await supabase.rpc('create_chat_from_ping', {
              ping_id: item.id
            });
            
            if (createError) {
              console.error('Error creating chat:', createError);
              Alert.alert('Error', 'Unable to access chat. Please try again.');
              return;
            }
            
            chatId = newChatId;
          } else {
            chatId = existingChatId;
          }
        } else {
          // For non-accepted pings, create a new chat
          const { data: newChatId, error: createError } = await supabase.rpc('create_chat_from_ping', {
            ping_id: item.id
          });
          
          if (createError) {
            console.error('Error creating chat:', createError);
            Alert.alert('Error', 'Unable to access chat. Please try again.');
            return;
          }
          
          chatId = newChatId;
        }
        
        if (!chatId) {
          // No chat ID returned
          Alert.alert('Error', 'Failed to create or find chat.');
          return;
        }
        
        // Navigate to messages tab with the specific chat ID
        router.push({
          pathname: '/(tabs)/messages',
          params: { chatId: chatId.toString() }
        });
        
      } catch (error) {
        console.error('Error handling chat navigation:', error);
        Alert.alert('Error', 'Unable to access chat. Please try again.');
      }
    };
    
    // Get the appropriate user profile based on ping type
    const getDisplayUser = () => {
      if (item.type === 'sent_ping') {
        // For sent pings, show the receiver (who we sent to)
        return {
          name: item.receiver_name || item.receiver_username || 'Unknown User',
          username: item.receiver_username || 'unknown',
          avatar: item.receiver_avatar || ''
        };
      } else {
        // For received pings, show the sender (who sent to us)
        return {
          name: item.sender_name || item.sender_username || 'Unknown User',
          username: item.sender_username || 'unknown',
          avatar: item.sender_avatar || ''
        };
      }
    };

    const displayUser = getDisplayUser();
    
    return (
    <View style={styles.activityCard}>
      <View style={styles.pingHeader}>
        <View style={styles.pingUser}>
          <Image source={{ uri: displayUser.avatar || '' }} style={styles.userAvatar} resizeMode="cover" />
          <View style={styles.pingDetails}>
            <Text style={styles.pingUserName}>{displayUser.name}</Text>
            <Text style={styles.pingUserLabel}>
              {item.type === 'sent_ping' ? 'Sent to' : 'From'} @{displayUser.username}
            </Text>
          </View>
        </View>
        {/* Status badge absolutely positioned inside card */}
        <View style={styles.pingStatusBadgeContainer}>
          <View style={[styles.pingStatusBadge, { backgroundColor: getStatusColor(item.status || '') + '20' }]}> 
            <View style={styles.pingStatusContent}>
              <View style={[
                styles.pingStatusDot,
                { backgroundColor: getStatusColor(item.status || '') }
              ]} />
              <Text style={[styles.pingStatusText, { color: getStatusColor(item.status || '') }]}> 
                {(item.status || '').charAt(0).toUpperCase() + (item.status || '').slice(1)}
              </Text>
            </View>
          </View>
        </View>
      </View>
      <View style={styles.pingProduct}>
        <NewRobustImage 
          images={item.images || (item.image ? [item.image] : undefined)}
          thumbnailImages={item.thumbnail_images}
          previewImages={item.preview_images}
          imageFolderPath={item.image_folder_path}
          style={styles.productImage}
          placeholderText="No Image"
          size="preview"
          title={item.title}
        />
        <View style={styles.productDetails}>
          <Text style={styles.productTitle}>{item.title}</Text>
          {item.price && <Text style={styles.productPrice}>{formatPriceWithUnit(item.price, (item as any).price_unit)}</Text>}
        </View>
        {/* Add location button and chat button for accepted pings */}
        {item.status === 'accepted' && (
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.locationButton}
              onPress={() => {
                // Get the listing data from the ping
                const activityWithListing = item as any;
                if (activityWithListing.listings?.latitude && activityWithListing.listings?.longitude) {
                  openInGoogleMaps(activityWithListing.listings.latitude, activityWithListing.listings.longitude);
                } else {
                  Alert.alert('Location Unavailable', 'The location for this listing is not available.');
                }
              }}
            >
              <MapPin size={22} color="#22C55E" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.chatIconButton}
              onPress={handleChatPress}
            >
              <MessageCircle size={22} color="#22C55E" />
            </TouchableOpacity>
          </View>
        )}
        {/* Show delete button for sent pings */}
        {item.type === 'sent_ping' && (
          <TouchableOpacity
            style={styles.deletePingButton}
            onPress={() => deletePing(item.id)}
          >
            <Trash2 size={18} color="#EF4444" />
          </TouchableOpacity>
        )}
      </View>
      <Text style={styles.pingMessage}>{item.message}</Text>
      {item.type === 'received_ping' && item.status === 'pending' && (
        <View style={styles.pingActions}>
          <TouchableOpacity
            style={styles.rejectButton}
            onPress={() => handlePingResponse(item.id, 'rejected')}
          >
            <X size={16} color="#EF4444" />
            <Text style={styles.rejectButtonText}>Reject</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.acceptButton}
            onPress={() => handlePingResponse(item.id, 'accepted')}
          >
            <Check size={16} color="#FFFFFF" />
            <Text style={styles.acceptButtonText}>Accept</Text>
          </TouchableOpacity>
        </View>
      )}
      {/* Remove the old chat button below the message */}
      {/* {item.type === 'sent_ping' && item.status === 'accepted' && ( ... )} */}
    </View>
  );
  };





  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Activity</Text>
        <Text style={styles.subtitle}>Manage your listings and pings</Text>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'listings' && styles.activeTab]}
          onPress={() => {
            setActiveTab('listings');
            setStatusFilter('all');
          }}
        >
          <Package size={20} color={activeTab === 'listings' ? '#22C55E' : '#64748B'} />
          <Text style={[styles.tabText, activeTab === 'listings' && styles.activeTabText]}>My Listings</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'received' && styles.activeTab]}
          onPress={() => {
            setActiveTab('received');
            setStatusFilter('all');
          }}
        >
          <MessageCircle size={20} color={activeTab === 'received' ? '#22C55E' : '#64748B'} />
          <Text style={[styles.tabText, activeTab === 'received' && styles.activeTabText]}>Received</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'sent' && styles.activeTab]}
          onPress={() => {
            setActiveTab('sent');
            setStatusFilter('all');
          }}
        >
          <Send size={20} color={activeTab === 'sent' ? '#22C55E' : '#64748B'} />
          <Text style={[styles.tabText, activeTab === 'sent' && styles.activeTabText]}>Sent</Text>
        </TouchableOpacity>
      </View>

      {/* Filter Options */}
      {activeTab !== 'listings' && (
        <View style={styles.filterOptions}>
          <Text style={styles.filterTitle}>Filter by Status:</Text>
          <View style={styles.filterButtons}>
            <TouchableOpacity
              style={[styles.filterOption, statusFilter === 'all' && styles.filterOptionActive]}
              onPress={() => setStatusFilter('all')}
            >
              <Text style={[styles.filterOptionText, statusFilter === 'all' && styles.filterOptionTextActive]}>
                All
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterOption, statusFilter === 'pending' && styles.filterOptionActive]}
              onPress={() => setStatusFilter('pending')}
            >
              <Text style={[styles.filterOptionText, statusFilter === 'pending' && styles.filterOptionTextActive]}>
                Pending
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterOption, statusFilter === 'accepted' && styles.filterOptionActive]}
              onPress={() => setStatusFilter('accepted')}
            >
              <Text style={[styles.filterOptionText, statusFilter === 'accepted' && styles.filterOptionTextActive]}>
                Accepted
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterOption, statusFilter === 'rejected' && styles.filterOptionActive]}
              onPress={() => setStatusFilter('rejected')}
            >
              <Text style={[styles.filterOptionText, statusFilter === 'rejected' && styles.filterOptionTextActive]}>
                Rejected
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
      {/* Add Listing Button for My Listings Tab */}
      {activeTab === 'listings' && (
        <View style={styles.addListingSection}>
          <TouchableOpacity 
            style={styles.addListingButton}
            onPress={() => setShowCategoryModal(true)}
          >
            <Plus size={20} color="#FFFFFF" />
            <Text style={styles.addListingButtonText}>Add New Listing</Text>
          </TouchableOpacity>
        </View>
      )}
      {loading ? (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading activities...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredActivities}
          renderItem={({ item }) => {
            if (activeTab === 'listings') {
              return renderListingItem({ item });
            } else {
              return renderPingItem({ item });
            }
          }}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.activityList}
          showsVerticalScrollIndicator={false}
          onRefresh={handleRefresh}
          refreshing={refreshing}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                {activeTab === 'listings' 
                  ? 'No listings found'
                  : statusFilter !== 'all' 
                    ? `No ${statusFilter} pings found` 
                    : 'No activities found'
                }
              </Text>
              {activeTab !== 'listings' && statusFilter !== 'all' && (
                <TouchableOpacity 
                  style={styles.clearFiltersButton}
                  onPress={() => setStatusFilter('all')}
                >
                  <Text style={styles.clearSearchText}>Clear filter</Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      )}
      {/* Add Listing Modal */}
      <AddListingModal 
        visible={showAddModal} 
        onClose={() => { setShowAddModal(false); }}
        preSelectedCategory={selectedCategoryForListing}
        sellerUsername={username || ''}
      />
      {/* Category Selection Modal */}
      <CategorySelectionModal
        visible={showCategoryModal}
        onClose={() => setShowCategoryModal(false)}
        onSelectCategory={handleCategorySelect}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    position: 'relative',
  },
  title: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#1E293B',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#22C55E',
  },
  tabText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#64748B',
  },
  activeTabText: {
    color: '#22C55E',
  },

  filterOptions: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  filterTitle: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#1E293B',
    marginBottom: 8,
  },
  filterButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  filterOption: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
  },
  filterOptionActive: {
    backgroundColor: '#22C55E',
  },
  filterOptionText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#64748B',
  },
  filterOptionTextActive: {
    color: '#FFFFFF',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 8,
  },
  clearSearchText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#22C55E',
    textDecorationLine: 'underline',
  },
  activityList: {
    paddingVertical: 16,
  },
  activityCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    padding: 16,
    boxShadow: '0px 2px 8px rgba(0,0,0,0.1)',
    elevation: 4,
    position: 'relative', // <-- add this
  },
  listingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    position: 'relative', // <-- add this
  },
  listingImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  listingDetails: {
    flex: 1,
  },
  listingTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1E293B',
    marginBottom: 4,
  },
  listingPrice: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#22C55E',
    marginBottom: 8,
  },
  listingStats: {
    flexDirection: 'row',
    gap: 16,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  activeBadge: {
    backgroundColor: '#DCFCE7',
  },
  inactiveBadge: {
    backgroundColor: '#F1F5F9',
  },
  statusText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
  },
  activeText: {
    color: '#16A34A',
  },
  inactiveText: {
    color: '#64748B',
  },
  listingStatusBadgeContainer: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 2,
  },
  pingStatusBadgeContainer: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 2,
  },
  listingActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    gap: 4,
  },
  actionText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#64748B',
  },
  deleteText: {
    color: '#EF4444',
  },
  pingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    position: 'relative', // <-- add this
  },
  pingUser: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  pingDetails: {
    flex: 1,
  },
  pingUserName: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1E293B',
    marginBottom: 2,
  },
  pingUserLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
  },
  pingTime: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
  },
  pingStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  pingStatusText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    textTransform: 'capitalize',
  },
  pingStatusContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  pingStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  pingProduct: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  productImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: 12,
  },
  productDetails: {
    flex: 1,
  },
  productTitle: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#1E293B',
    marginBottom: 2,
  },
  productPrice: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#22C55E',
  },
  pingMessage: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#475569',
    lineHeight: 20,
    marginBottom: 12,
  },
  pingActions: {
    flexDirection: 'row',
    gap: 8,
  },
  rejectButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
    paddingVertical: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#EF4444',
    gap: 4,
  },
  rejectButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#EF4444',
  },
  acceptButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#22C55E',
    paddingVertical: 10,
    borderRadius: 6,
    gap: 4,
  },
  acceptButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#FFFFFF',
  },
  addListingSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  addListingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#22C55E',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    gap: 8,
  },
  addListingButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#FFFFFF',
  },
  chatIconButton: {
    marginLeft: 8,
    alignSelf: 'center',
    padding: 6,
  },
  chatIconIndicator: {
    marginLeft: 8,
    alignSelf: 'center',
    padding: 6,
  },
  deletePingButton: {
    marginLeft: 8,
    alignSelf: 'center',
    padding: 6,
  },
  clearFiltersButton: {
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    alignSelf: 'center',
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginLeft: 8,
  },
  locationButton: {
    padding: 6,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#64748B',
    textAlign: 'center',
  },
});