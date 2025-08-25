/* global console */
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert as RNAlert
} from 'react-native';
import { MessageCircle, CheckCircle, XCircle } from 'lucide-react-native';

import { formatPriceWithUnit } from '@/utils/formatters';
import { updatePingStatusNew } from '@/utils/activitySupabase';
import { useRouter } from 'expo-router';
import { ChatService } from '@/utils/chatService';
import { supabase } from '@/utils/supabaseClient';

interface PingItemProps {
  item: any;
  username: string;
  
  onStatusChange?: (pingId: string, status: 'accepted' | 'rejected') => void;
}

export default function PingItem({ item, username, onStatusChange }: PingItemProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [chatId, setChatId] = useState<string | null>(null);
  
  // Get status color
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
  
  // Create chat directly (fallback method)
  const createChatDirectly = async (): Promise<string> => {
    try {
      // Get listing details
      const { data: listing, error: listingError } = await supabase
        .from('listings')
        .select('*')
        .eq('id', item.listing_id)
        .single();
      
      if (listingError || !listing) {
        throw new Error('Failed to get listing details');
      }
      
      // Extract first image
      const firstImage = listing.images && listing.images.length > 0 ? listing.images[0] : null;
      
      // Create chat
      const { data: chat, error: chatError } = await supabase
        .from('marketplace_chats')
        .insert([{
          listing_id: item.listing_id,
          buyer_username: item.sender_username,
          seller_username: item.receiver_username,
          listing_title: listing.title,
          listing_price: listing.price,
          listing_image: firstImage,
          last_message: item.message,
          last_message_time: new Date().toISOString()
        }])
        .select()
        .single();
      
      if (chatError) throw chatError;
      
      // Add initial messages
      await supabase
        .from('messages')
        .insert([
          {
            chat_id: chat.id,
            sender_username: item.sender_username,
            text: item.message,
            message_type: 'text'
          },
          {
            chat_id: chat.id,
            sender_username: item.receiver_username,
            text: 'Ping accepted! You can now chat about this listing.',
            message_type: 'system'
          }
        ]);
      
      return chat.id;
    } catch (error) {
      console.error('Error creating chat directly:', error);
      throw error;
    }
  };

  // Handle ping response (accept/reject)
  const handlePingResponse = async (response: 'accepted' | 'rejected') => {
    if (!item.id) return;
    
    setLoading(true);
    try {
      // Update ping status
      await updatePingStatusNew(item.id, response);
      
      // Create chat if accepted
      if (response === 'accepted') {
        const newChatId = await ChatService.createChatFromPing(item.id);
        setChatId(newChatId);
        
        // Send acceptance message to the chat
        try {
          const { error: messageError } = await supabase.rpc('send_chat_message', {
            chat_id_param: newChatId,
            sender_username_param: username,
            message_text: 'Ping accepted! You can now chat about this listing.'
          });
          
          if (messageError) {
            console.error('Error sending acceptance message:', messageError);
          } else {
            // Acceptance message sent successfully
            onStatusChange?.(item.id, 'accepted');
          }
        } catch (messageError) {
          console.error('Error sending acceptance message:', messageError);
        }
        
        // Show success message
        RNAlert.alert(
          'Ping Accepted',
          'A chat has been created for this ping. You can now message the buyer directly.',
          [
            { text: 'OK' }
          ]
        );
      }
      
      // Call parent callback
      if (onStatusChange) {
        onStatusChange(item.id, response);
      }
    } catch (error) {
      console.error('Error responding to ping:', error);
      RNAlert.alert('Error', 'Failed to respond to ping. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  // Handle chat button press
  const handleChatPress = async () => {
    if (chatId) {
      // Navigate to existing chat in Messages tab
      try {
        router.push({
          pathname: '/(tabs)/messages',
          params: { chatId: chatId }
        });
      } catch (navError) {
        console.error('Navigation error:', navError);
        // Fallback navigation
        router.push('/(tabs)/messages');
      }
    } else if (item.status === 'accepted') {
      // Try to find or create chat
      setLoading(true);
      try {
        // First try the database function
        let newChatId;
        try {
          newChatId = await ChatService.createChatFromPing(item.id);
        } catch (dbError) {
          console.error('Database function failed, trying direct creation:', dbError);
          // Fallback: create chat directly
          newChatId = await createChatDirectly();
        }
        
        if (newChatId) {
          setChatId(newChatId);
          
          // Navigate to the chat
          try {
            router.push({
              pathname: '/(tabs)/messages',
              params: { chatId: newChatId }
            });
          } catch (navError) {
            console.error('Navigation error:', navError);
            // Fallback navigation
            router.push('/(tabs)/messages');
          }
        } else {
          throw new Error('Chat creation returned null or undefined');
        }
      } catch (error) {
        console.error('Error creating chat:', error);
        RNAlert.alert('Error', `Failed to open chat: ${error instanceof Error ? error.message : 'Unknown error'}`);
      } finally {
        setLoading(false);
      }
    } else {
      RNAlert.alert('Cannot Chat', 'This ping must be accepted before you can start chatting.');
    }
  };
  
  // Determine if user is receiver (can respond to ping)
  const isReceiver = item.receiver_username === username;
  const isSender = item.sender_username === username;
  
  return (
    <View style={styles.container}>
      {/* Listing Image and Info */}
      <View style={styles.header}>
        <Image
          source={{ uri: item.image || 'https://via.placeholder.com/60' }}
          style={styles.image}
        />
        <View style={styles.infoContainer}>
          <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
          <Text style={styles.price}>{formatPriceWithUnit(item.price, (item as any).price_unit)}</Text>
          <View style={styles.statusContainer}>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
              <Text style={styles.statusText}>{item.status}</Text>
            </View>
          </View>
        </View>
      </View>
      
      {/* Message */}
      <View style={styles.messageContainer}>
        <Text style={styles.messageText}>{item.message}</Text>
      </View>
      
      {/* Actions */}
      <View style={styles.actionsContainer}>
        {/* Show response buttons for receiver if pending */}
        {isReceiver && item.status === 'pending' && (
          <View style={styles.responseButtons}>
            <TouchableOpacity
              style={[styles.responseButton, styles.acceptButton]}
              onPress={() => handlePingResponse('accepted')}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <CheckCircle size={16} color="#FFFFFF" />
                  <Text style={styles.responseButtonText}>Accept</Text>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.responseButton, styles.rejectButton]}
              onPress={() => handlePingResponse('rejected')}
              disabled={loading}
            >
              <XCircle size={16} color="#FFFFFF" />
              <Text style={styles.responseButtonText}>Reject</Text>
            </TouchableOpacity>
          </View>
        )}
        
        {/* Show chat button if accepted - for both sender and receiver */}
        {item.status === 'accepted' && (
          <TouchableOpacity 
            style={styles.chatButton}
            onPress={handleChatPress}
            disabled={loading}
            activeOpacity={0.7}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <MessageCircle size={16} color="#FFFFFF" />
                <Text style={styles.chatButtonText}>Chat</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  image: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  infoContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 4,
  },
  price: {
    fontSize: 14,
    fontWeight: '700',
    color: '#22C55E',
    marginBottom: 4,
  },
  statusContainer: {
    flexDirection: 'row',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
  },
  messageContainer: {
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  messageText: {
    fontSize: 14,
    color: '#1E293B',
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  responseButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  responseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  acceptButton: {
    backgroundColor: '#22C55E',
  },
  rejectButton: {
    backgroundColor: '#EF4444',
  },
  responseButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  chatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#22C55E',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  chatButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
}); 