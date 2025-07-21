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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Package, MessageCircle, Send, Eye, EyeOff, CreditCard as Edit3, Trash2, Check, X, Plus } from 'lucide-react-native';
import AddListingModal from '@/components/AddListingModal';
import CategorySelectionModal from '@/components/CategorySelectionModal';
import { Activity, getActivities, getSentPings, getReceivedPings, deleteActivity } from '@/utils/activitySupabase';
import { useIsFocused } from '@react-navigation/native';

import { useRouter } from 'expo-router';
// Removed react-native-expo-image-cache import - using standard Image component
import { supabase } from '@/utils/supabaseClient';

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
  return `₹${price} ${unitLabel}`;
};

import { getPingInsights } from '@/utils/pingAnalytics';
import PingInsightsCard from '@/components/PingInsightsCard';

// eslint-disable-next-line no-undef
declare const console: Console;

export default function ActivityScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [activeTab, setActiveTab] = useState<'listings' | 'received' | 'sent'>('listings');
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedCategoryForListing, setSelectedCategoryForListing] = useState<string>('');
  const [refreshing, setRefreshing] = useState(false);
  const isFocused = useIsFocused();
  const [username, setUsername] = useState<string | null>(null);
  const [userProfiles, setUserProfiles] = useState<Record<string, any>>({});
  const [myListings, setMyListings] = useState<any[]>([]);
  
  // New state for enhanced organization
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'accepted' | 'rejected'>('all');
  const [pingInsights, setPingInsights] = useState<any>(null);
  const [showInsights, setShowInsights] = useState(false);

  useEffect(() => {
    async function fetchUser() {
      const { data: { user } } = await supabase.auth.getUser();
      setUsername(user?.user_metadata?.username ?? null);
    }
    fetchUser();
  }, []);

  // Assume you have a way to get the current user's ID
  const currentUsername = username || ''; // Replace with actual user ID from auth/context

  // Load activities and pings from database
  useEffect(() => {
    const loadActivities = async () => {
      if (!currentUsername) return;
      
      try {
        // Get non-ping activities (listings, etc.)
        const stored = await getActivities(currentUsername);
        
        // Get pings from the pings table
        const sentPings = await getSentPings(currentUsername);
        const receivedPings = await getReceivedPings(currentUsername);
        
        // Convert pings to activity format for UI compatibility
        const pingActivities: Activity[] = [
          ...sentPings.map(ping => ({
            id: ping.id,
            type: 'sent_ping' as const,
            listing_id: ping.listing_id,
            title: ping.listing?.title || '',
            price: ping.listing?.price?.toString() || '',
            image: ping.listing?.images?.[0] || '',
            username: ping.receiver_username,
            user_name: '', // Will be loaded from user profiles
            user_avatar: '',
            status: ping.status,
            message: ping.message,
            created_at: ping.created_at,
            is_active: true
          })),
          ...receivedPings.map(ping => ({
            id: ping.id,
            type: 'received_ping' as const,
            listing_id: ping.listing_id,
            title: ping.listing?.title || '',
            price: ping.listing?.price?.toString() || '',
            image: ping.listing?.images?.[0] || '',
            username: ping.sender_username,
            user_name: '', // Will be loaded from user profiles
            user_avatar: '',
            status: ping.status,
            message: ping.message,
            created_at: ping.created_at,
            is_active: true
          }))
        ];
        
        // Combine activities and pings, sorted by creation date
        const allActivities = [...stored, ...pingActivities].sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        
        setActivities(allActivities);
      } catch (error) {
        console.error('Error loading activities:', error);
        setActivities([]);
      }
    };
    
    if (isFocused && currentUsername) {
      loadActivities();
    }
  }, [isFocused, showAddModal, showCategoryModal, currentUsername]);

  // Load user profiles for all activities
  useEffect(() => {
    async function loadUserProfiles() {
      const usernames = Array.from(new Set(activities.map(a => a.username).filter(Boolean)));
      if (usernames.length === 0) {
        setUserProfiles({});
        return;
      }
      const { data: users, error } = await supabase
        .from('users')
        .select('username, name, avatar_url, email, phone, location, description')
        .in('username', usernames);
      if (error || !users) {
        setUserProfiles({});
        return;
      }
      const map: Record<string, any> = {};
      for (const user of users) {
        map[user.username] = user;
      }
      setUserProfiles(map);
    }
    if (activities.length > 0) loadUserProfiles();
  }, [activities]);

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
    setSelectedCategoryForListing(categoryId);
    setShowAddModal(true);
  };

  // Type guards using imported types
  function isListingActivity(activity: Activity): activity is Activity {
    return activity.type === 'listing';
  }
  function isPingActivity(activity: Activity): activity is Activity {
    return activity.type === 'received_ping' || activity.type === 'sent_ping';
  }

  const filteredActivities = activities.filter(activity => {
    // Tab filtering
    let passesTabFilter = false;
    if (activeTab === 'listings') {
      passesTabFilter = activity.type === 'listing';
    } else if (activeTab === 'received') {
      passesTabFilter = activity.type === 'received_ping' && isPingActivity(activity) && activity.username === currentUsername;
    } else if (activeTab === 'sent') {
      passesTabFilter = activity.type === 'sent_ping' && isPingActivity(activity);
    }
    
    if (!passesTabFilter) return false;
    
    // Status filtering (only apply to ping activities, not listings)
    if (statusFilter !== 'all' && isPingActivity(activity) && activity.status !== statusFilter) {
      console.log(`Filtering out activity ${activity.id} with status ${activity.status} (filter: ${statusFilter})`);
      return false;
    }
    
    return true;
  });

  // Debug logging
  console.log(`Filtering: tab=${activeTab}, status=${statusFilter}, total=${activities.length}, filtered=${filteredActivities.length}`);

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
      
      // Update local myListings state
      setMyListings(prev => 
        prev.map(listing => 
          listing.id === id 
            ? { ...listing, is_active: newStatus } 
            : listing
        )
      );
      
      // Also update activities if needed
    setActivities(prev => 
      prev.map(activity => 
        isListingActivity(activity) && activity.id === id
            ? { ...activity, is_active: newStatus }
          : activity
      )
    );
      
      console.log(`Listing ${id} status toggled to ${newStatus ? 'active' : 'inactive'}`);
    } catch (error) {
      console.error('Error toggling listing status:', error);
      Alert.alert('Error', 'Failed to update listing status. Please try again.');
    }
  };

  // Edit listing handler (opens AddListingModal in edit mode)
  const [editListing, setEditListing] = useState<Activity | null>(null);
  const handleEditListing = (item: Activity) => {
    setEditListing(item);
    setShowAddModal(true);
  };

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
              // 1. Delete from Supabase listings table
              const { error: listingError } = await supabase
                .from('listings')
                .delete()
                .eq('id', id);
              
              if (listingError) {
                console.error('Error deleting listing:', listingError);
                Alert.alert('Error', 'Failed to delete listing from database. Please try again.');
                return;
              }

              

              // 3. Delete related activities from local storage
              await deleteActivity(id);



              // 5. Update local state
              const stored = await getActivities(currentUsername);
              setActivities(stored);

              // 6. Refresh the listings list
              await fetchMyListings();

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
      
      // Refresh activities to show updated status
      const stored = await getActivities(currentUsername);
      
      // Get updated pings from the pings table
      const sentPings = await getSentPings(currentUsername);
      const receivedPings = await getReceivedPings(currentUsername);
      
      // Convert pings to activity format for UI compatibility
      const pingActivities: Activity[] = [
        ...sentPings.map(ping => ({
          id: ping.id,
          type: 'sent_ping' as const,
          listing_id: ping.listing_id,
          title: ping.listing?.title || '',
          price: ping.listing?.price?.toString() || '',
          image: ping.listing?.images?.[0] || '',
          username: ping.receiver_username,
          user_name: '',
          user_avatar: '',
          status: ping.status,
          message: ping.message,
          created_at: ping.created_at,
          is_active: true
        })),
        ...receivedPings.map(ping => ({
          id: ping.id,
          type: 'received_ping' as const,
          listing_id: ping.listing_id,
          title: ping.listing?.title || '',
          price: ping.listing?.price?.toString() || '',
          image: ping.listing?.images?.[0] || '',
          username: ping.sender_username,
          user_name: '',
          user_avatar: '',
          status: ping.status,
          message: ping.message,
          created_at: ping.created_at,
          is_active: true
        }))
      ];
      
      // Combine activities and pings, sorted by creation date
      const allActivities = [...stored, ...pingActivities].sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      
      setActivities(allActivities);
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

              // Refresh activities to remove the deleted ping
              const stored = await getActivities(currentUsername);
              
              // Get updated pings from the pings table
              const sentPings = await getSentPings(currentUsername);
              const receivedPings = await getReceivedPings(currentUsername);
              
              // Convert pings to activity format for UI compatibility
              const pingActivities: Activity[] = [
                ...sentPings.map(ping => ({
                  id: ping.id,
                  type: 'sent_ping' as const,
                  listing_id: ping.listing_id,
                  title: ping.listing?.title || '',
                  price: ping.listing?.price?.toString() || '',
                  image: ping.listing?.images?.[0] || '',
                  username: ping.receiver_username,
                  user_name: '',
                  user_avatar: '',
                  status: ping.status,
                  message: ping.message,
                  created_at: ping.created_at,
                  is_active: true
                })),
                ...receivedPings.map(ping => ({
                  id: ping.id,
                  type: 'received_ping' as const,
                  listing_id: ping.listing_id,
                  title: ping.listing?.title || '',
                  price: ping.listing?.price?.toString() || '',
                  image: ping.listing?.images?.[0] || '',
                  username: ping.sender_username,
                  user_name: '',
                  user_avatar: '',
                  status: ping.status,
                  message: ping.message,
                  created_at: ping.created_at,
                  is_active: true
                }))
              ];
              
              // Combine activities and pings, sorted by creation date
              const allActivities = [...stored, ...pingActivities].sort((a, b) => 
                new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
              );
              
              setActivities(allActivities);
              
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
      // Get non-ping activities (listings, etc.)
      const stored = await getActivities(currentUsername);
      
      // Get pings from the pings table
      const sentPings = await getSentPings(currentUsername);
      const receivedPings = await getReceivedPings(currentUsername);
      
      // Convert pings to activity format for UI compatibility
      const pingActivities: Activity[] = [
        ...sentPings.map(ping => ({
          id: ping.id,
          type: 'sent_ping' as const,
          listing_id: ping.listing_id,
          title: ping.listing?.title || '',
          price: ping.listing?.price?.toString() || '',
          image: ping.listing?.images?.[0] || '',
          username: ping.receiver_username,
          user_name: '',
          user_avatar: '',
          status: ping.status,
          message: ping.message,
          created_at: ping.created_at,
          is_active: true
        })),
        ...receivedPings.map(ping => ({
          id: ping.id,
          type: 'received_ping' as const,
          listing_id: ping.listing_id,
          title: ping.listing?.title || '',
          price: ping.listing?.price?.toString() || '',
          image: ping.listing?.images?.[0] || '',
          username: ping.sender_username,
          user_name: '',
          user_avatar: '',
          status: ping.status,
          message: ping.message,
          created_at: ping.created_at,
          is_active: true
        }))
      ];
      
      // Combine activities and pings, sorted by creation date
      const allActivities = [...stored, ...pingActivities].sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      
      setActivities(allActivities);
    } catch (error) {
      console.error('Error refreshing activities:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const renderListingItem = ({ item }: { item: Activity }) => {
    // Check for different possible image field names
    const anyItem = item as any; // Type assertion to bypass strict typing
    const imageUrl = item.image || anyItem.images?.[0] || anyItem.thumbnail || '';
    console.log('Rendering listing with image:', imageUrl);
    
    const { is_active, title, price, id } = item;
    return (
    <View style={styles.activityCard}>
      <View style={styles.listingHeader}>
          {imageUrl ? (
                            <Image source={{ uri: imageUrl }} style={styles.listingImage} />
          ) : (
            <View style={[styles.listingImage, { backgroundColor: '#E2E8F0', justifyContent: 'center', alignItems: 'center' }]}>
              <Text style={{ color: '#94A3B8', fontSize: 10, textAlign: 'center' }}>No Image</Text>
            </View>
          )}
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
          <TouchableOpacity style={styles.actionButton} onPress={() => handleEditListing(item)}>
          <Edit3 size={16} color="#64748B" />
          <Text style={styles.actionText}>Edit</Text>
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
    const userProfile = userProfiles[item.username];
    
    const handleChatPress = async () => {
      try {
        // Use the get_or_create_chat function to ensure we get existing chat or create new one
        const { data: chatId, error } = await supabase.rpc('get_or_create_chat', {
          listing_id_param: item.listing_id,
          user1_param: item.username,
          user2_param: username || ''
        });
        
        if (error) {
          console.error('Error getting or creating chat:', error);
          Alert.alert('Error', 'Unable to access chat. Please try again.');
          return;
        }
        
        console.log('Using chat ID:', chatId);
        
        // Navigate to messages tab with the specific chat ID
        router.push({ pathname: '/(tabs)/messages', params: { chatId } });
      } catch (error) {
        console.error('Error handling chat navigation:', error);
        Alert.alert('Error', 'Unable to access chat. Please try again.');
      }
    };
    
    return (
    <View style={styles.activityCard}>
      <View style={styles.pingHeader}>
        <View style={styles.pingUser}>
          <Image source={{ uri: userProfile?.avatar_url || item.user_avatar || '' }} style={styles.userAvatar} resizeMode="cover" />
          <View style={styles.pingDetails}>
            <Text style={styles.pingUserName}>{userProfile?.name || item.user_name}</Text>
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
        <Image source={{ uri: item.image || '' }} style={styles.productImage} resizeMode="cover" />
        <View style={styles.productDetails}>
          <Text style={styles.productTitle}>{item.title}</Text>
                          {item.price && <Text style={styles.productPrice}>{formatPriceWithUnit(item.price, (item as any).price_unit)}</Text>}
        </View>
        {/* Chat icon button for all pings */}
        <TouchableOpacity
          style={styles.chatIconButton}
          onPress={handleChatPress}
        >
          <MessageCircle size={22} color="#22C55E" />
        </TouchableOpacity>
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

  // Fetch all listings for the current user
  const fetchMyListings = async () => {
    console.log('Fetching listings for username:', username);
    if (!username) return;
    
    try {
    const { data: listings, error } = await supabase
      .from('listings')
      .select('*')
      .eq('username', username)
      .order('updated_at', { ascending: false })
      .order('created_at', { ascending: false });
        
      if (error) {
        console.error('Error fetching listings:', error);
        return;
      }
      
      // Log the first listing to debug image field
      if (listings && listings.length > 0) {
        console.log('First listing structure:', JSON.stringify(listings[0]));
        
        // Check which image field exists in the data
        const firstListing = listings[0];
        const imageField = 
          firstListing.image ? 'image' : 
          firstListing.images ? 'images' : 
          firstListing.thumbnail ? 'thumbnail' : null;
        
        console.log('Image field detected:', imageField);
      }
      
      // Update the listings with correct image field if needed
      const processedListings = listings?.map(listing => {
        // Ensure each listing has an image field for rendering
        if (!listing.image && (listing.images && listing.images.length > 0)) {
          return {
            ...listing,
            image: listing.images[0]
          };
        }
        return listing;
      }) || [];
      
      console.log('Processed listings:', processedListings.length);
      setMyListings(processedListings);
    } catch (err) {
      console.error('Exception fetching listings:', err);
      setMyListings([]);
    }
  };

  useEffect(() => {
    if (activeTab === 'listings' && username) {
      fetchMyListings();
    }
  }, [activeTab, username, showAddModal]);

  // Load ping insights when username changes
  useEffect(() => {
    async function loadPingInsights() {
      if (!username) return;
      const insights = await getPingInsights(username);
      setPingInsights(insights);
    }
    loadPingInsights();
  }, [username]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Activity</Text>
        <Text style={styles.subtitle}>Manage your listings and pings</Text>
        {pingInsights && (
          <TouchableOpacity 
            style={styles.insightsToggle}
            onPress={() => setShowInsights(!showInsights)}
          >
            <Text style={styles.insightsToggleText}>
              {showInsights ? 'Hide' : 'Show'} Analytics
            </Text>
          </TouchableOpacity>
        )}
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
      {activeTab === 'listings' ? (
        <FlatList
          data={myListings}
          renderItem={renderListingItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.activityList}
          showsVerticalScrollIndicator={false}
          onRefresh={handleRefresh}
          refreshing={refreshing}
          ListHeaderComponent={
            showInsights && pingInsights ? (
              <PingInsightsCard insights={pingInsights} />
            ) : null
          }
        />
      ) : (
        <FlatList
          data={filteredActivities}
          renderItem={({ item }) => {
            if (isPingActivity(item)) {
              return renderPingItem({ item });
            } else if (isListingActivity(item)) {
              return renderListingItem({ item });
            }
            return null;
          }}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.activityList}
          showsVerticalScrollIndicator={false}
          onRefresh={handleRefresh}
          refreshing={refreshing}
          ListHeaderComponent={
            showInsights && pingInsights ? (
              <PingInsightsCard insights={pingInsights} />
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                {statusFilter !== 'all' 
                  ? `No ${statusFilter} pings found` 
                  : 'No activities found'
                }
              </Text>
              {statusFilter !== 'all' && (
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
        onClose={() => { setShowAddModal(false); setEditListing(null); }}
        preSelectedCategory={selectedCategoryForListing}
        editListing={editListing}
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
  insightsToggle: {
    position: 'absolute',
    right: 20,
    top: '50%',
    transform: [{ translateY: -12 }],
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#22C55E',
    borderRadius: 16,
  },
  insightsToggleText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#FFFFFF',
  },
  clearFiltersButton: {
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    alignSelf: 'center',
  },
});