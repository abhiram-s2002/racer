import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Alert,
  Platform,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MessageCircle, Send, Trash2, Check, X, MapPin, Star, UserCircle2, EyeOff } from 'lucide-react-native';
import RatingModal from '@/components/RatingModal';
import { Activity } from '@/utils/activitySupabase';
import { supabase } from '@/utils/supabaseClient';
import { useCachedActivities } from '@/hooks/useCachedActivities';
import { getAvatarSource } from '@/utils/avatarUtils';
import RatingService from '@/utils/ratingService';
import VerificationBadge from '@/components/VerificationBadge';
import { isUserVerified } from '@/utils/verificationUtils';

import { useRouter } from 'expo-router';

import { formatPriceWithUnit } from '@/utils/formatters';
import { getPhoneWithPermission } from '@/utils/phoneSharingUtils';

import NewRobustImage from '@/components/NewRobustImage';
import { withErrorBoundary } from '@/components/ErrorBoundary';
import { formatActivityForWhatsApp, createWhatsAppURL, createWhatsAppWebURL } from '@/utils/whatsappMessageFormatter';



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

function ActivityScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'mine' | 'received' | 'sent'>('received');
  const [refreshing, setRefreshing] = useState(false);
  // const isFocused = useIsFocused();
  const [username, setUsername] = useState<string | null>(null);
  
  // New state for enhanced organization
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'accepted' | 'rejected'>('all');
  
  // Rating modal state
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [userToRate, setUserToRate] = useState<string>('');
  const [pingIdToRate, setPingIdToRate] = useState<string>('');
  const [pingRatings, setPingRatings] = useState<Record<string, { hasRated: boolean; rating: number; category: string }>>({});
  

  useEffect(() => {
    async function fetchUser() {
      const { data: { user } } = await supabase.auth.getUser();
      setUsername(user?.user_metadata?.username ?? null);
    }
    fetchUser();
  }, []);

  // Use the new caching hook
  const {
    sentPings,
    receivedPings,
    myItems,
    userProfiles,
    loading,
    refresh,
    updateActivity,
    removeActivity,
  } = useCachedActivities(username);

  // Load existing user ratings
  useEffect(() => {
    if (username && (sentPings.length > 0 || receivedPings.length > 0)) {
      loadExistingRatings();
    }
  }, [username, sentPings, receivedPings]);

  const loadExistingRatings = useCallback(async () => {
    if (!username) return;
    
    try {
      const ratings: Record<string, { hasRated: boolean; rating: number; category: string }> = {};
      
      // Deduplicate pings by ID to prevent duplicate rating checks
      const uniquePings = new Map<string, any>();
      
      // Add sent pings first
      sentPings.forEach(ping => {
        if (ping.status === 'accepted') {
          uniquePings.set(ping.id, ping);
        }
      });
      
      // Add received pings (will overwrite if same ID, but that's fine since they're the same ping)
      receivedPings.forEach(ping => {
        if (ping.status === 'accepted') {
          uniquePings.set(ping.id, ping);
        }
      });
      
      // Check which specific ping interactions the current user has already rated
      for (const [pingId, ping] of uniquePings) {
        try {
          // Check if this specific ping has been rated by the current user
          const existingRating = await RatingService.getRatingByPingId(ping.id, username);
          
          if (existingRating) {
            ratings[ping.id] = {
              hasRated: true,
              rating: existingRating.rating,
              category: existingRating.category
            };
          }
        } catch (error) {
          // Silent error handling for rating checks
        }
      }
      
      setPingRatings(ratings);
    } catch (error) {
      // Silent error handling
    }
  }, [username, sentPings, receivedPings]);

  // Assume you have a way to get the current user's ID
  const currentUsername = username || '';

  // Rating functions
  const openRatingModal = (username: string, pingId: string) => {
    setUserToRate(username);
    setPingIdToRate(pingId);
    setShowRatingModal(true);
  };

  const handleRatingSubmit = async (ratingData: any) => {
    // This function is now just a callback to refresh the UI
    // The RatingModal handles all the submission logic
    try {
      // Refresh the cached activities to get the latest ping data
      await refresh();
      // Also refresh the ratings data
      await loadExistingRatings();
    } catch (error) {
      // Silent error handling
    }
  };

  // const checkIfUserCanRate = async (username: string, pingId: string) => {
  //   if (!currentUsername) return false;
  //   
  //   try {
  //     // Check if user can rate this person
  //     const eligibility = await RatingService.canRateUser(currentUsername, username);
  //     return eligibility.can_rate;
  //   } catch (error) {
  //     return false;
  //   }
  // };

  // const checkIfUserHasRated = async (pingId: string) => {
  //   if (!currentUsername) return false;
  //   
  //   try {
  //     // Check if user has already rated this specific ping
  //     const existingRating = await RatingService.getRatingByPingId(pingId, currentUsername);
  //     return existingRating !== null;
  //   } catch (error) {
  //     return false;
  //   }
  // };



  const filteredActivities = (() => {
    if (activeTab === 'mine') {
      // mine tab does not use ping status filters
      return myItems as any[];
    }
    if (activeTab === 'received') {
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
      // Import the function that handles ping status updates and phone access granting
      const { updatePingStatusNew } = await import('@/utils/activitySupabase');
      
      // Update ping status using the new function (this will also grant phone access if accepted)
      await updatePingStatusNew(pingId, response);
      
      // If ping is accepted, create chat and send acceptance message
      if (response === 'accepted') {
        try {
          // Create chat from ping (this will also add the ping message to chat)
          const { data: chatId, error: chatError } = await supabase.rpc('create_chat_from_ping', {
            ping_id: pingId
          });
          
          if (chatError) {
            // Error creating chat from ping
          } else {
            // Chat created successfully
            
            // Send acceptance message to the chat
            const { error: messageError } = await supabase.rpc('send_chat_message', {
              chat_id_param: chatId,
              sender_username_param: currentUsername,
              message_text: 'Ping accepted! You can now chat about this listing.'
            });
            
            if (messageError) {
              // Error sending acceptance message
            }
          }
        } catch (chatError) {
          // Error in chat creation process
        }
      }
      
      // Update cached data with new status
      updateActivity(pingId, { status: response });
    } catch (error) {
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
                // Error deleting ping
                Alert.alert('Error', 'Failed to delete ping. Please try again.');
                return;
              }

              // Remove from cached data
              removeActivity(pingId);
              
              Alert.alert('Success', 'Ping deleted successfully!');
            } catch (error) {
              // Error deleting ping
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
      // Error refreshing activities
    } finally {
      setRefreshing(false);
    }
  };


  const renderPingItem = ({ item }: { item: Activity }) => {
    const handleChatPress = async () => {
      try {
        // Get the other participant's username (not the current user)
        const otherUsername = item.sender_username === username ? item.receiver_username : item.sender_username;
        
        // Get current user ID and other participant's user ID
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        if (!currentUser) {
          Alert.alert('Error', 'Please log in to continue.');
          return;
        }

        const { data: otherUser, error: otherUserError } = await supabase
          .from('users')
          .select('id, name, verification_status, verified_at, expires_at')
          .eq('username', otherUsername)
          .single();

        if (otherUserError || !otherUser) {
          Alert.alert('Error', 'Unable to find participant information.');
          return;
        }

        // Check phone sharing permission using unlock system
        const { phone, canShare } = await getPhoneWithPermission(
          otherUser.id,
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
            'This user has not provided a phone number for WhatsApp.',
            [{ text: 'OK', style: 'default' }]
          );
          return;
        }

        // Format activity details for WhatsApp message
        const activityMessage = formatActivityForWhatsApp({
          type: item.type === 'sent_ping' ? 'listing' : 'ping',
          title: item.title || 'Untitled',
          description: (item as any).description,
          category: (item as any).category,
          price: item.price ? parseFloat(item.price) : undefined,
          location: (item as any).location,
          userName: otherUser.name,
          userUsername: otherUsername,
          distance: (item as any).distance_km,
          message: item.message
        });

        // Show confirmation dialog
        Alert.alert(
          'Open WhatsApp',
          `Start a WhatsApp chat with ${otherUser.name || otherUsername} about this activity?`,
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Open WhatsApp', 
              onPress: () => {
                // Format phone number for WhatsApp (remove any non-digit characters except +)
                const phoneNumber = phone.replace(/[^\d+]/g, '');
                // Open WhatsApp with the phone number and pre-filled message
                const whatsappUrl = createWhatsAppURL(phoneNumber, activityMessage);
                Linking.openURL(whatsappUrl).catch(() => {
                  // Fallback to WhatsApp web if app is not installed
                  const whatsappWebUrl = createWhatsAppWebURL(phoneNumber, activityMessage);
                  Linking.openURL(whatsappWebUrl);
                });
              }
            }
          ]
        );
        
      } catch (error) {
        // Error opening WhatsApp
        Alert.alert('Error', 'Failed to open WhatsApp. Please try again.');
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
        <TouchableOpacity 
          style={styles.pingUser}
          onPress={() => router.push(`/seller/${displayUser.username}` as any)}
          activeOpacity={0.7}
        >
          <Image source={getAvatarSource(displayUser.avatar)} style={styles.userAvatar} resizeMode="cover" />
          <View style={styles.pingDetails}>
            <View style={styles.pingUserNameRow}>
              <Text style={styles.pingUserName}>{displayUser.name}</Text>
              {(() => {
                // Get verification data from userProfiles
                const userProfile = userProfiles[displayUser.username];
                const isVerified = userProfile && isUserVerified(userProfile);
                
                
                if (isVerified) {
                  return <VerificationBadge size="small" />;
                }
                return null;
              })()}
            </View>
            <Text style={styles.pingUserLabel}>
              {item.type === 'sent_ping' ? 'Sent to' : 'From'} @{displayUser.username}
            </Text>
          </View>
        </TouchableOpacity>
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
          thumbnailImages={item.thumbnail_images}
          previewImages={item.preview_images}
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
      {/* Ping message and rating button on same line for accepted pings */}
      {item.status === 'accepted' ? (
        <View style={styles.messageRatingRow}>
          <Text style={styles.pingMessage}>{item.message}</Text>
          
          {/* Rating button - positioned on the right */}
          {(() => {
            // Check if user has rated THIS SPECIFIC ping (item.id)
            const ratingData = pingRatings[item.id];
                        return ratingData?.hasRated ? (
              <TouchableOpacity
                style={styles.rateButton}
                onPress={() => openRatingModal(displayUser.username, item.id)}
              >
                <View style={styles.ratingDisplay}>
                  <View style={styles.starRow}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star 
                        key={star} 
                        size={12} 
                        color={star <= ratingData.rating ? "#F59E0B" : "#E2E8F0"} 
                        fill={star <= ratingData.rating ? "#F59E0B" : "transparent"}
                      />
                    ))}
                  </View>
                </View>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.rateButton}
                onPress={() => openRatingModal(displayUser.username, item.id)}
              >
                <Star size={16} color="#F59E0B" />
                <Text style={styles.rateButtonText}>
                  {item.type === 'sent_ping' ? 'Rate Seller' : 'Rate Buyer'}
                </Text>
              </TouchableOpacity>
            );
          })()}
        </View>
      ) : (
        <Text style={styles.pingMessage}>{item.message}</Text>
      )}
      
      {/* Remove the old rating section since it's now inline */}
      
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

  const hideOrDeleteMineItem = async (item: any) => {
    try {
      if (item.type === 'listing') {
        Alert.alert(
          'Manage Listing',
          'What would you like to do with this listing?',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Hide',
              onPress: async () => {
                const { hideListing } = await import('@/utils/contentManagement');
                const result = await hideListing(item.id);
                if (!result.success) {
                  Alert.alert('Error', result.error || 'Failed to hide listing');
                } else {
                  Alert.alert('Hidden', 'Listing hidden from your feed.');
                }
              }
            },
            {
              text: 'Delete',
              style: 'destructive',
              onPress: async () => {
                const { error } = await supabase.from('listings').delete().eq('id', item.id);
                if (error) {
                  Alert.alert('Error', 'Failed to delete listing');
                } else {
                  await refresh();
                }
              }
            },
          ]
        );
      } else {
        Alert.alert(
          'Manage Request',
          'What would you like to do with this request?',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Hide',
              onPress: async () => {
                const { hideRequest } = await import('@/utils/contentManagement');
                const result = await hideRequest(item.id);
                if (!(result as any).success) {
                  Alert.alert('Error', (result as any).error || 'Failed to hide request');
                } else {
                  Alert.alert('Hidden', 'Request hidden from your feed.');
                }
              }
            },
            {
              text: 'Delete',
              style: 'destructive',
              onPress: async () => {
                const { error } = await supabase.from('requests').delete().eq('id', item.id);
                if (error) {
                  Alert.alert('Error', 'Failed to delete request');
                } else {
                  await refresh();
                }
              }
            },
          ]
        );
      }
    } catch (e) {
      Alert.alert('Error', 'Action failed. Please try again.');
    }
  };

  const renderMineItem = ({ item }: { item: any }) => {
    return (
      <View style={styles.activityCard}>
        <View style={styles.pingHeader}>
          <View style={styles.pingUser}>
            <UserCircle2 size={40} color="#22C55E" />
            <View style={styles.pingDetails}>
              <View style={styles.pingUserNameRow}>
                <Text style={styles.pingUserName}>{item.title}</Text>
              </View>
              <Text style={styles.pingUserLabel}>
                {item.type === 'listing' ? 'My Listing' : 'My Request'} • {item.category}
              </Text>
            </View>
          </View>
        </View>
        <View style={styles.pingProduct}>
          <NewRobustImage 
            thumbnailImages={item.thumbnail_images}
            previewImages={item.preview_images}
            style={styles.productImage}
            placeholderText="No Image"
            size="preview"
            title={item.title}
          />
          <View style={styles.productDetails}>
            <Text style={styles.productTitle}>{item.title}</Text>
            {item.type === 'listing' && item.price ? (
              <Text style={styles.productPrice}>{formatPriceWithUnit(item.price, item.price_unit)}</Text>
            ) : null}
            {item.type === 'request' && (
              <Text style={styles.pingMessage}>
                {item.budget_min || item.budget_max ? `Budget: ${item.budget_min ?? ''} - ${item.budget_max ?? ''} ${item.price_unit ?? ''}` : 'No budget specified'}
              </Text>
            )}
          </View>
          <TouchableOpacity style={styles.chatIconButton} onPress={() => hideOrDeleteMineItem(item)}>
            <EyeOff size={22} color="#64748B" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.deletePingButton} onPress={() => hideOrDeleteMineItem(item)}>
            <Trash2 size={18} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // const getRatingRole = (pingId: string) => {
  //   const ping = sentPings.find(p => p.id === pingId) || receivedPings.find(p => p.id === pingId);
  //   if (!ping) return 'User';

  //   if (ping.type === 'sent_ping') {
  //     // Current user sent the ping (is buyer), so they're rating the seller
  //     return 'Seller';
  //   } else {
  //     // Current user received the ping (is seller), so they're rating the buyer
  //     return 'Buyer';
  //   }
  // };

  // const formatCategory = (category: string) => {
  //   switch (category) {
  //     case 'overall':
  //       return 'Overall';
  //     case 'communication':
  //       return 'Communication';
  //     case 'responsiveness':
  //       return 'Responsiveness';
  //     case 'helpfulness':
  //       return 'Helpfulness';
  //     default:
  //       return category.charAt(0).toUpperCase() + category.slice(1);
  //   }
  // };


  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Activity</Text>
        <Text style={styles.subtitle}>Manage your pings</Text>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'mine' && styles.activeTab]}
          onPress={() => {
            setActiveTab('mine');
          }}
        >
          <UserCircle2 size={20} color={activeTab === 'mine' ? '#22C55E' : '#64748B'} />
          <Text style={[styles.tabText, activeTab === 'mine' && styles.activeTabText]}>My Items</Text>
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
        {activeTab !== 'mine' && (
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
      {loading ? (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading activities...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredActivities}
          renderItem={({ item }) => activeTab === 'mine' ? renderMineItem({ item }) : renderPingItem({ item })}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.activityList}
          showsVerticalScrollIndicator={false}
          onRefresh={handleRefresh}
          refreshing={refreshing}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                {activeTab === 'mine' 
                  ? 'No items found'
                  : statusFilter !== 'all' 
                    ? `No ${statusFilter} pings found` 
                    : 'No activities found'
                }
              </Text>
              {activeTab !== 'mine' && statusFilter !== 'all' && (
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
      
      {/* Rating Modal */}
      <RatingModal
        visible={showRatingModal}
        ratedUsername={userToRate}
        onClose={() => setShowRatingModal(false)}
        pingId={pingIdToRate}
        onSubmit={handleRatingSubmit}
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
    borderWidth: 1,
    borderColor: '#E2E8F0',
    position: 'relative', // <-- add this
  },
  pingStatusBadgeContainer: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 2,
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
  pingUserNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  pingUserName: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1E293B',
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
    borderWidth: 1,
    borderColor: '#F8FAFC',
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
    flex: 1,
    marginRight: 12,
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
  rateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    gap: 4,
  },
  rateButtonText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#64748B',
  },

  editRatingButton: {
    backgroundColor: '#DCFCE7',
  },
  editRatingText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#16A34A',
  },
  ratingDisplay: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 2,
  },
  starRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 1,
  },
  ratingText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#16A34A',
    fontWeight: '600',
  },
  categoryText: {
    fontSize: 10,
    fontFamily: 'Inter-Regular',
    color: '#059669',
    textTransform: 'capitalize',
  },
  messageRatingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
});

export default withErrorBoundary(ActivityScreen, 'ActivityScreen');