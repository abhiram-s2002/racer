

/* global console, setTimeout */
import { supabase, enhancedSupabase } from './supabaseClient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ErrorContext } from './errorHandler';

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
  // Get chats for current user
  async getChats(username: string): Promise<ExtendedChat[]> {
    if (!username) return [];
    
    const context: ErrorContext = {
      operation: 'get_chats_for_user',
      component: 'ChatService',
      userId: username
    };
    
    try {
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
        return enhancedChats;
      }
      
      // Fallback to cache on error
      return this.getLocalChats(username);
    } catch (error) {
      console.error('Error fetching chats:', error);
      return this.getLocalChats(username);
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
        if (cl.listings && Array.isArray(cl.listings) && cl.listings.length > 0) {
          const listing = cl.listings[0]; // Get the first listing
          chatListingsMap.get(cl.chat_id).push({
            id: cl.listing_id,
            title: listing.title || 'Unknown Listing',
            price: listing.price || 0,
            image: listing.images?.[0] || null,
          });
        }
      });
      
      return chats.map(chat => ({
        ...chat,
        listings: chatListingsMap.get(chat.id) || [],
      }));
    } catch (error) {
      console.error('Error enhancing chat data:', error);
      return chats;
    }
  },
  
  // Get messages for a chat
  async getMessages(chatId: string): Promise<ExtendedMessage[]> {
    if (!chatId) return [];
    
    try {
      // Try local cache first
      const cachedMessages = await this.getLocalMessages(chatId);
      if (cachedMessages.length > 0) {
        // Return cached and fetch in background
        this.fetchAndCacheMessages(chatId);
        return cachedMessages;
      }
      
      // Fetch from server
      return this.fetchAndCacheMessages(chatId);
    } catch (error) {
      console.error('Error fetching messages:', error);
      return this.getLocalMessages(chatId);
    }
  },
  
  // Fetch messages from server and update cache
  async fetchAndCacheMessages(chatId: string): Promise<ExtendedMessage[]> {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true });
      
    if (error) throw error;
    
    // Update local cache
    if (data && data.length > 0) {
      await this.saveLocalMessages(chatId, data);
    }
    
    return data || [];
  },
  
  // Get cached messages
  async getLocalMessages(chatId: string): Promise<ExtendedMessage[]> {
    try {
      const stored = await AsyncStorage.getItem(`${STORAGE_KEYS.RECENT_MESSAGES}_${chatId}`);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error getting local messages:', error);
      return [];
    }
  },
  
  // Save messages to local cache
  async saveLocalMessages(chatId: string, messages: ExtendedMessage[]): Promise<void> {
    try {
      // Keep only last 50 messages locally
      const recentMessages = messages.slice(-50);
      await AsyncStorage.setItem(
        `${STORAGE_KEYS.RECENT_MESSAGES}_${chatId}`, 
        JSON.stringify(recentMessages)
      );
    } catch (error) {
      console.error('Error saving local messages:', error);
    }
  },
  
  // Get cached chats
  async getLocalChats(username: string): Promise<ExtendedChat[]> {
    try {
      const stored = await AsyncStorage.getItem(`${STORAGE_KEYS.RECENT_CHATS}_${username}`);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error getting local chats:', error);
      return [];
    }
  },
  
  // Save chats to local cache
  async saveLocalChats(username: string, chats: ExtendedChat[]): Promise<void> {
    try {
      await AsyncStorage.setItem(
        `${STORAGE_KEYS.RECENT_CHATS}_${username}`, 
        JSON.stringify(chats)
      );
    } catch (error) {
      console.error('Error saving local chats:', error);
    }
  },
  
  // Send a message
  async sendMessage(chatId: string, senderUsername: string, text: string): Promise<ExtendedMessage> {
    if (!chatId || !senderUsername || !text.trim()) {
      throw new Error('Invalid message parameters');
    }
    
    try {
      // Create temporary ID for optimistic UI update
      const tempId = `temp_${Date.now()}`;
      
      // Create message object
      const message: Message = {
        id: tempId,
        chat_id: chatId,
        sender_username: senderUsername,
        text: text.trim(),
        status: 'sent',
        created_at: new Date().toISOString()
      };
      
      // Update local cache immediately for UI
      const cachedMessages = await this.getLocalMessages(chatId);
      await this.saveLocalMessages(chatId, [...cachedMessages, message]);
      
      // Send to server
      const { data, error } = await supabase
        .from('messages')
        .insert([{
          chat_id: chatId,
          sender_username: senderUsername,
          text: text.trim()
        }])
        .select()
        .single();
        
      if (error) throw error;
      
      // Update chat's updated_at timestamp
      await supabase
        .from('chats')
        .update({
          updated_at: new Date().toISOString()
        })
        .eq('id', chatId);
      
      // Update local cache with server response
      const updatedMessages = await this.getLocalMessages(chatId);
      const messageIndex = updatedMessages.findIndex(m => m.id === tempId);
      if (messageIndex !== -1) {
        updatedMessages[messageIndex] = data;
        await this.saveLocalMessages(chatId, updatedMessages);
      }
      
             // After sending a message, update Social Butterfly achievement progress
       try {
         const { data: { user } } = await supabase.auth.getUser();
         
         if (!user) return data;
         
         // Get user profile to get username
         const { data: profile, error: profileError } = await supabase
           .from('users')
           .select('username')
           .eq('id', user.id)
           .single();
         
         if (profileError || !profile?.username) return data;
         
         // Fetch current progress
         const { data: userAchievement } = await supabase
           .from('user_achievements')
           .select('progress')
           .eq('username', profile.username)
           .eq('achievement_id', 'social_butterfly')
           .single();

         const currentProgress = userAchievement?.progress || 0;
         
         // Import the function dynamically to avoid circular dependencies
         const { updateUserAchievementProgressSafe } = await import('./rewardsSupabase');
         await updateUserAchievementProgressSafe(profile.username, 'social_butterfly', currentProgress + 1);
       } catch (error) {
         // Silently handle achievement update errors
       }
      
      return data;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  },
  
  // Mark messages as read
  async markAsRead(chatId: string, username: string): Promise<void> {
    if (!chatId || !username) return;
    
    try {
      // Update local cache to mark messages as read
      const messages = await this.getLocalMessages(chatId);
      const updatedMessages = messages.map(msg => ({
        ...msg,
        // Note: We're not updating a read status field since it's not in the messages table
        // This is just for local cache management
      }));
      await this.saveLocalMessages(chatId, updatedMessages);
      
      // Call the database function if it exists
      try {
        await supabase.rpc('mark_messages_read', {
          chat_id_param: chatId,
          username_param: username
        });
      } catch {
        // Function might not exist yet, that's okay
        // mark_messages_read function not available yet
      }
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  },
  
  // Create chat from ping
  async createChatFromPing(pingId: string): Promise<string> {
    if (!pingId) throw new Error('Invalid ping ID');
    
    const context: ErrorContext = {
      operation: 'create_chat_from_ping',
      component: 'ChatService',
      userId: 'system'
    };
    
    try {
      const data = await enhancedSupabase.safeRPC<string>(
        'create_chat_from_ping',
        { ping_id: pingId },
        context,
        'system'
      );
      
      if (data) {
        return data;
      }
      
      throw new Error('Failed to create chat from ping');
    } catch (error) {
      console.error('Error creating chat from ping:', error);
      throw error;
    }
  },
  
  // Get unread count for a chat
  async getUnreadCount(chatId: string, username: string): Promise<number> {
    if (!chatId || !username) return 0;
    
    try {
      const messages = await this.getLocalMessages(chatId);
      // Count messages not sent by current user (simplified logic)
      return messages.filter(msg => 
        msg.sender_username !== username
      ).length;
    } catch (error) {
      console.error('Error getting unread count:', error);
      return 0;
    }
  },
  
  // Send system message
  async sendSystemMessage(chatId: string, text: string): Promise<ExtendedMessage> {
    if (!chatId || !text.trim()) {
      throw new Error('Invalid system message parameters');
    }
    
    try {
      const { data, error } = await supabase
        .from('messages')
        .insert([{
          chat_id: chatId,
          sender_username: 'system',
          text: text.trim()
        }])
        .select()
        .single();
        
      if (error) throw error;
      
      // Update local cache
      const cachedMessages = await this.getLocalMessages(chatId);
      await this.saveLocalMessages(chatId, [...cachedMessages, data]);
      
      return data;
    } catch (error) {
      console.error('Error sending system message:', error);
      throw error;
    }
  },
  
  // Mark chat as completed
  async markChatAsCompleted(chatId: string): Promise<void> {
    if (!chatId) return;
    
    try {
      // Update chat status (if you add a status column to chats table)
      // For now, we'll just send a system message
      await this.sendSystemMessage(chatId, 'Chat marked as completed');
    } catch (error) {
      console.error('Error marking chat as completed:', error);
    }
  },
  
  // Update message status (for delivery simulation)
  async updateMessageStatus(messageId: string, status: 'sent' | 'delivered' | 'read'): Promise<void> {
    // This is for UI simulation only since we don't have status in messages table
    // Message status updated silently
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