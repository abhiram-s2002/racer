/* global console */
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert as RNAlert,
  Linking
} from 'react-native';
import { MessageCircle, CheckCircle, XCircle } from 'lucide-react-native';

import { formatPriceWithUnit } from '@/utils/formatters';
import { updatePingStatusNew } from '@/utils/activitySupabase';
import { useRouter } from 'expo-router';
import { formatPingForWhatsApp, createWhatsAppURL, createWhatsAppWebURL } from '@/utils/whatsappMessageFormatter';
import { getPhoneWithPermission } from '@/utils/phoneSharingUtils';

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
      
      // Chat functionality removed - using WhatsApp instead
    } catch (error) {
      RNAlert.alert('Error', 'Failed to respond to ping. Please try again.');
    }
  };
  
    // Handle chat button press - now opens WhatsApp
  const handleChatPress = async () => {
    if (item.status !== 'accepted') {
      RNAlert.alert('Cannot Chat', 'This ping must be accepted before you can start chatting.');
      return;
    }

    try {
      // Get the other participant's username (not the current user)
      const otherUsername = item.sender_username === username ? item.receiver_username : item.sender_username;
      
      // Get current user ID and other participant's user ID
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) {
        RNAlert.alert('Error', 'Please log in to continue.');
        return;
      }

      const { data: otherUser, error: otherUserError } = await supabase
        .from('users')
        .select('id, name')
        .eq('username', otherUsername)
        .single();

      if (otherUserError || !otherUser) {
        RNAlert.alert('Error', 'Unable to find participant information.');
        return;
      }

      // Check phone sharing permission using unlock system
      const { phone, canShare } = await getPhoneWithPermission(
        otherUser.id,
        currentUser.id
      );

      if (!canShare) {
        RNAlert.alert(
          'Phone Not Available',
          'Phone number will be available after ping is accepted.'
        );
        return;
      }

      if (!phone) {
        RNAlert.alert(
          'No Phone Number',
          'This user has not provided a phone number for WhatsApp.'
        );
        return;
      }

      // Format ping/listing details for WhatsApp message
      const pingMessage = formatPingForWhatsApp({
        title: item.title,
        description: item.description,
        category: item.category,
        price: item.price,
        location: item.location,
        sellerName: otherUser.name,
        sellerUsername: otherUsername,
        distance: item.distance_km,
        message: item.message
      });

      // Show confirmation dialog
      RNAlert.alert(
        'Open WhatsApp',
        `Start a WhatsApp chat with ${otherUser.name || otherUsername} about this listing?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Open WhatsApp', 
            onPress: () => {
              // Format phone number for WhatsApp (remove any non-digit characters except +)
              const phoneNumber = phone.replace(/[^\d+]/g, '');
              // Open WhatsApp with the phone number and pre-filled message
              const whatsappUrl = createWhatsAppURL(phoneNumber, pingMessage);
              Linking.openURL(whatsappUrl).catch(() => {
                // Fallback to WhatsApp web if app is not installed
                const whatsappWebUrl = createWhatsAppWebURL(phoneNumber, pingMessage);
                Linking.openURL(whatsappWebUrl);
              });
            }
          }
        ]
      );
      
    } catch (error) {
      console.error('Error opening WhatsApp:', error);
      RNAlert.alert('Error', 'Failed to open WhatsApp. Please try again.');
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