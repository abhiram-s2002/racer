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
  


  // Handle ping response (accept/reject)
  const handlePingResponse = async (response: 'accepted' | 'rejected') => {
    try {
      // Update ping status
      await updatePingStatusNew(item.id, response);
      
      if (response === 'accepted') {
        // Create chat for accepted ping
        try {
          // Check if chat already exists for this ping
          const { data: existingChats, error: checkError } = await supabase
            .from('chats')
            .select('id')
            .or(`participant_a.eq.${item.sender_username},participant_a.eq.${item.receiver_username}`)
            .or(`participant_b.eq.${item.sender_username},participant_b.eq.${item.receiver_username}`)
            .eq('listing_id', item.listing_id);

          if (checkError) {
            // Continue with chat creation even if check fails
          }

          const existingChatId = existingChats?.[0]?.id;

          if (!existingChatId) {
            // Create new chat
            const { data: newChat, error: createError } = await supabase
              .from('chats')
              .insert({
                listing_id: item.listing_id,
                participant_a: item.sender_username,
                participant_b: item.receiver_username,
                status: 'active'
              })
              .select('id')
              .single();

            if (createError) {
              RNAlert.alert('Error', 'Failed to create chat. Please try again.');
              return;
            }

            const newChatId = newChat.id;
            setChatId(newChatId);

            // Send acceptance message to the chat
            try {
              const { error: messageError } = await supabase.rpc('send_chat_message', {
                chat_id_param: newChatId,
                sender_username_param: username,
                message_text: 'Ping accepted! You can now chat about this listing.'
              });

              if (messageError) {
                // Continue even if message fails
              }
            } catch (messageError) {
              // Continue even if message fails
            }
          }

          // Call parent callback to update UI
          onStatusChange?.(item.id, response);
        } catch (chatError) {
          // Continue even if chat creation fails
        }
      }

      // Call parent callback to update UI
      onStatusChange?.(item.id, response);
    } catch (error) {
      RNAlert.alert('Error', 'Failed to respond to ping. Please try again.');
    }
  };
  
    // Handle chat button press
  const handleChatPress = async () => {
    if (chatId) {
      // Chat already exists - just navigate to it
      try {
        router.push({
          pathname: '/messages',
          params: { chatId: chatId }
        });
      } catch (navError) {
        // Navigation error
        // Fallback navigation
        router.push('/messages');
      }
    } else if (item.status === 'accepted') {
      // Ping is accepted but no chat ID - this shouldn't happen normally
      // Try to get the existing chat by querying directly
      try {
        
        const { data: allChats, error: chatError } = await supabase
          .from('chats')
          .select('id, status, participant_a, participant_b');
        
        if (chatError) {
          return;
        }
        
        // Find the chat that matches both participants
        const chatData = allChats?.find(chat => 
          (chat.participant_a === item.sender_username && chat.participant_b === item.receiver_username) ||
          (chat.participant_a === item.receiver_username && chat.participant_b === item.sender_username)
        );
        
        if (chatData?.id) {
          setChatId(chatData.id);
          router.push({
            pathname: '/messages',
            params: { chatId: chatData.id }
          });
        } else {
          RNAlert.alert('Chat Not Found', 'Chat was not created properly. Please try again.');
        }
      } catch (error) {
        RNAlert.alert('Error', 'Chat not available. Please try again.');
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