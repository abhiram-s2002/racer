/* global console, setTimeout */
import { supabase, enhancedSupabase } from './supabaseClient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ErrorContext } from './errorHandler';
import { SimpleCacheService } from './simpleCacheService';

import { Chat, Message } from '@/utils/types';

// Re-export the types for use in other modules
export { Chat, Message };

// Extended Chat interface for UI-specific fields
export interface ExtendedChat extends Chat {
  // Additional fields for UI
  last_message_time?: string;
  // New fields from database function
  other_participant?: string;
  other_participant_name?: string;
  other_participant_avatar?: string;
  // Optional listing context (can be multiple per chat)
  listings?: Array<{
    id: string;
    title: string;
    price: number;
    image: string;
  }>;
}

// Extended Message interface for UI-specific fields
export interface ExtendedMessage extends Message {
  // New fields from database function
  sender_name?: string;
  sender_avatar?: string;
}

// Local storage keys
const STORAGE_KEYS = {
  RECENT_MESSAGES: 'recent_messages',
  RECENT_CHATS: 'recent_chats',
};

export const ChatService = {
  // Get chats for current user with caching
  async getChats(username: string): Promise<ExtendedChat[]> {
    if (!username) return [];
    
    const cacheKey = `chat_list_${username}_all`;
    
    // Check cache first
    const cached = SimpleCacheService.get(cacheKey);
    if (cached !== null) {
      console.log(`✅ [ChatService] Cache hit for chat list: ${username}`);
      return cached;
    }
    
    const context: ErrorContext = {
      operation: 'get_chats_for_user',
      component: 'ChatService',
      userId: username
    };
    
    try {
      console.log(`🔍 [ChatService] Fetching chat list from DB: ${username}`);
      const data = await enhancedSupabase.safeRPC<Chat[]>(
        'get_chats_for_user',
        { username_param: username },
        context,
        username
      );
      
      if (data && data.length > 0) {
        // Enhance chat data with listing information
        const enhancedChats = await this.enhanceChatsWithListingData(data);
        await this.saveLocalChats(username, enhancedChats);
        
        // Cache the result for 8 minutes
        SimpleCacheService.set(cacheKey, enhancedChats, SimpleCacheService.getTTL('CHAT_LIST'));
        
        return enhancedChats;
      }
      
      // Fallback to cache on error
      return this.getLocalChats(username);
    } catch (error) {
      console.error('Error fetching chats:', error);
      return this.getLocalChats(username);
    }
  },

  // Get total chat count for a user with caching
  async getTotalChatCount(username: string): Promise<number> {
    const cacheKey = `chat_count_${username}`;
    
    // Check cache first
    const cached = SimpleCacheService.get(cacheKey);
    if (cached !== null) {
      console.log(`✅ [ChatService] Cache hit for chat count: ${username}`);
      return cached;
    }

    try {
      console.log(`🔍 [ChatService] Fetching chat count from DB: ${username}`);
      const { count, error } = await supabase
        .from('chats')
        .select('*', { count: 'exact', head: true })
        .or(`participant_a.eq.${username},participant_b.eq.${username}`);

      if (error) throw error;

      const chatCount = count || 0;
      
      // Cache the result for 10 minutes
      SimpleCacheService.set(cacheKey, chatCount, SimpleCacheService.getTTL('CHAT_COUNT'));
      
      return chatCount;
    } catch (error) {
      console.error('Error getting chat count:', error);
      return 0;
    }
  },

  // Get unread count for a specific chat with caching
  async getUnreadCount(chatId: string, username: string): Promise<number> {
    const cacheKey = `unread_count_${chatId}_${username}`;
    
    // Check cache first
    const cached = SimpleCacheService.get(cacheKey);
    if (cached !== null) {
      console.log(`✅ [ChatService] Cache hit for unread count: ${chatId}`);
      return cached;
    }

    try {
      console.log(`🔍 [ChatService] Fetching unread count from DB: ${chatId}`);
      const { data, error } = await supabase
        .from('messages')
        .select('id')
        .eq('chat_id', chatId)
        .neq('sender_username', username)
        .is('read_by', null);

      if (error) throw error;

      const unreadCount = data?.length || 0;
      
      // Cache the result for 5 minutes
      SimpleCacheService.set(cacheKey, unreadCount, SimpleCacheService.getTTL('UNREAD_COUNTS'));
      
      return unreadCount;
    } catch (error) {
      console.error('Error getting unread count:', error);
      return 0;
    }
  },

  // Get unread counts for all chats with caching
  async getUnreadCountsForAllChats(username: string): Promise<Record<string, number>> {
    const cacheKey = `unread_counts_all_${username}`;
    
    // Check cache first
    const cached = SimpleCacheService.get(cacheKey);
    if (cached !== null) {
      console.log(`✅ [ChatService] Cache hit for all unread counts: ${username}`);
      return cached;
    }

    try {
      console.log(`🔍 [ChatService] Fetching all unread counts from DB: ${username}`);
      const { data, error } = await supabase
        .from('messages')
        .select('chat_id, sender_username, read_by')
        .neq('sender_username', username)
        .is('read_by', null);

      if (error) throw error;

      // Group by chat_id and count unread messages
      const unreadCounts: Record<string, number> = {};
      data?.forEach(message => {
        if (!unreadCounts[message.chat_id]) {
          unreadCounts[message.chat_id] = 0;
        }
        unreadCounts[message.chat_id]++;
      });

      // Cache the result for 5 minutes
      SimpleCacheService.set(cacheKey, unreadCounts, SimpleCacheService.getTTL('UNREAD_COUNTS'));
      
      return unreadCounts;
    } catch (error) {
      console.error('Error getting unread counts for all chats:', error);
      return {};
    }
  },

  // Mark messages as read and invalidate cache
  async markAsRead(chatId: string, username: string): Promise<void> {
    try {
      // Call the RPC function
      const { error: rpcError } = await supabase.rpc('mark_messages_read', {
        p_chat_id: chatId,
        p_username: username
      });

      if (rpcError) {
        console.log('RPC failed, falling back to direct update:', rpcError);
        
        // Fallback: Update messages directly
        const { error: updateError } = await supabase
          .from('messages')
          .update({ 
            read_by: `{${username}}`
          })
          .eq('chat_id', chatId)
          .neq('sender_username', username)
          .is('read_by', null);

        if (updateError) throw updateError;
      }

      // Invalidate related caches
      SimpleCacheService.invalidateUserCache(username);
      
      console.log(`✅ [ChatService] Marked messages as read for ${username} in chat ${chatId}`);
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  },

  // Enhance chat data with listing information
  async enhanceChatsWithListingData(chats: Chat[]): Promise<ExtendedChat[]> {
    try {
      // Get all chat IDs
      const chatIds = chats.map(chat => chat.id);
      if (chatIds.length === 0) return chats;
      
      // Get all listings associated with these chats
      const { data: chatListings } = await supabase
        .from('chat_listings')
        .select(`
          chat_id,
          listing_id,
          listings(id, title, price, images)
        `)
        .in('chat_id', chatIds);
      
      if (!chatListings) return chats;
      
      // Group listings by chat_id
      const chatListingsMap = new Map();
      chatListings.forEach(cl => {
        if (!chatListingsMap.has(cl.chat_id)) {
          chatListingsMap.set(cl.chat_id, []);
        }
        chatListingsMap.get(cl.chat_id).push(cl.listings);
      });
      
      // Enhance chats with listing data
      return chats.map(chat => ({
        ...chat,
        listings: chatListingsMap.get(chat.id) || []
      }));
    } catch (error) {
      console.error('Error enhancing chats with listing data:', error);
      return chats;
    }
  },

  // Save chats to local storage
  async saveLocalChats(username: string, chats: ExtendedChat[]): Promise<void> {
    try {
      await AsyncStorage.setItem(`${STORAGE_KEYS.RECENT_CHATS}_${username}`, JSON.stringify(chats));
    } catch (error) {
      console.error('Error saving local chats:', error);
    }
  },

  // Get chats from local storage
  async getLocalChats(username: string): Promise<ExtendedChat[]> {
    try {
      const stored = await AsyncStorage.getItem(`${STORAGE_KEYS.RECENT_CHATS}_${username}`);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error getting local chats:', error);
      return [];
    }
  },

  // Get messages for a chat
  async getMessages(chatId: string): Promise<Message[]> {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting messages:', error);
      return [];
    }
  },

  // Send a message
  async sendMessage(chatId: string, senderUsername: string, text: string): Promise<Message | null> {
    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          chat_id: chatId,
          sender_username: senderUsername,
          text,
          status: 'sent'
        })
        .select()
        .single();

      if (error) throw error;
      
      // Invalidate related caches
      SimpleCacheService.invalidateUserCache(senderUsername);
      
      return data;
    } catch (error) {
      console.error('Error sending message:', error);
      return null;
    }
  },

  // Get local messages from storage
  async getLocalMessages(chatId: string): Promise<Message[]> {
    try {
      const stored = await AsyncStorage.getItem(`${STORAGE_KEYS.RECENT_MESSAGES}_${chatId}`);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error getting local messages:', error);
      return [];
    }
  },

  // Save messages to local storage
  async saveLocalMessages(chatId: string, messages: Message[]): Promise<void> {
    try {
      await AsyncStorage.setItem(`${STORAGE_KEYS.RECENT_MESSAGES}_${chatId}`, JSON.stringify(messages));
    } catch (error) {
      console.error('Error saving local messages:', error);
    }
  },

  // Update message status
  updateMessageStatus(messageId: string, status: string): void {
    // This would typically update the database, but for now just log
    console.log(`Message ${messageId} status updated to: ${status}`);
  },

  // Simulate message delivery
  async simulateMessageDelivery(messageId: string): Promise<void> {
    setTimeout(() => {
      this.updateMessageStatus(messageId, 'delivered');
    }, 1000);
    
    setTimeout(() => {
      this.updateMessageStatus(messageId, 'read');
    }, 3000);
  }
};
