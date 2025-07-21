/* global console, setTimeout */
import { supabase, enhancedSupabase } from './supabaseClient';
import { createChatFromPing } from './activitySupabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ErrorContext } from './errorHandler';

// Types for marketplace chat system
export interface MarketplaceChat {
  id: string;
  listing_id: string;
  buyer_username: string;
  seller_username: string;
  listing_title: string;
  listing_price: number;
  listing_image?: string;
  last_message?: string;
  last_message_time: string;
  status: 'active' | 'completed' | 'closed';
  created_at: string;
  is_seller?: boolean;
}

export interface MarketplaceMessage {
  id: string;
  chat_id: string;
  sender_username: string;
  text: string;
  status: 'sending' | 'sent' | 'delivered' | 'read';
  created_at: string;
}

// Local storage keys
const STORAGE_KEYS = {
  RECENT_MESSAGES: 'marketplace_recent_messages',
  RECENT_CHATS: 'marketplace_recent_chats',
};

export const MarketplaceChatService = {
  // Get chats for current user
  async getChats(username: string): Promise<MarketplaceChat[]> {
    if (!username) return [];
    
    const context: ErrorContext = {
      operation: 'get_marketplace_chats',
      component: 'MarketplaceChatService',
      userId: username
    };
    
    const data = await enhancedSupabase.safeRPC<MarketplaceChat[]>(
      'get_marketplace_chats',
      { username_param: username },
      context,
      username
    );
    
      if (data && data.length > 0) {
        await this.saveLocalChats(username, data);
      return data;
      }
      
      // Fallback to cache on error
      return this.getLocalChats(username);
  },
  
  // Get messages for a chat
  async getMessages(chatId: string): Promise<MarketplaceMessage[]> {
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
      console.error('Error fetching marketplace messages:', error);
      return this.getLocalMessages(chatId);
    }
  },
  
  // Fetch messages from server and update cache
  async fetchAndCacheMessages(chatId: string): Promise<MarketplaceMessage[]> {
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
  async getLocalMessages(chatId: string): Promise<MarketplaceMessage[]> {
    try {
      const stored = await AsyncStorage.getItem(`${STORAGE_KEYS.RECENT_MESSAGES}_${chatId}`);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error getting local messages:', error);
      return [];
    }
  },
  
  // Save messages to local cache
  async saveLocalMessages(chatId: string, messages: MarketplaceMessage[]): Promise<void> {
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
  async getLocalChats(username: string): Promise<MarketplaceChat[]> {
    try {
      const stored = await AsyncStorage.getItem(`${STORAGE_KEYS.RECENT_CHATS}_${username}`);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error getting local chats:', error);
      return [];
    }
  },
  
  // Save chats to local cache
  async saveLocalChats(username: string, chats: MarketplaceChat[]): Promise<void> {
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
  async sendMessage(chatId: string, senderUsername: string, text: string): Promise<MarketplaceMessage> {
    if (!chatId || !senderUsername || !text.trim()) {
      throw new Error('Invalid message parameters');
    }
    
    try {
      // Create temporary ID for optimistic UI update
      const tempId = `temp_${Date.now()}`;
      
      // Create message object
      const message: MarketplaceMessage = {
        id: tempId,
        chat_id: chatId,
        sender_username: senderUsername,
        text: text.trim(),
        status: 'sending',
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
          text: text.trim(),
          status: 'sent'
        }])
        .select()
        .single();
        
      if (error) throw error;
      
      // Update chat's last message
      await supabase
        .from('chats')
        .update({
          last_message: text.trim(),
          updated_at: new Date().toISOString()
        })
        .eq('id', chatId);
      
      // Update local cache with server ID and set status to sent
      const serverMessage = { ...data, status: 'sent' as const };
      const updatedMessages = cachedMessages
        .filter(m => m.id !== tempId)
        .concat(serverMessage);
        
      await this.saveLocalMessages(chatId, updatedMessages);
      
      // Simulate delivery and read status
      this.simulateMessageDelivery(data.id);
      
      return serverMessage;
    } catch (error) {
      console.error('Error sending marketplace message:', error);
      throw error;
    }
  },
  
  // Mark messages as read
  async markAsRead(chatId: string, username: string): Promise<void> {
    if (!chatId || !username) return;
    
    try {
      await supabase
        .rpc('mark_messages_read', { 
          chat_id_param: chatId, 
          username_param: username 
        });
        
      // Update local cache
      const messages = await this.getLocalMessages(chatId);
      const updatedMessages = messages.map(msg => 
        msg.sender_username !== username ? { ...msg, status: 'read' as const } : msg
      );
      
      await this.saveLocalMessages(chatId, updatedMessages);
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  },
  
  // Create chat from ping
  async createChatFromPing(pingId: string): Promise<string> {
    if (!pingId) throw new Error('Invalid ping ID');
    
    const chatId = await createChatFromPing(pingId);
    
    if (!chatId) {
      throw new Error('Failed to create chat from ping');
    }
    
    return chatId;
  },
  
  // Get unread message count for a chat
  async getUnreadCount(chatId: string, username: string): Promise<number> {
    if (!chatId || !username) return 0;
    
    try {
      const { count, error } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('chat_id', chatId)
        .neq('sender_username', username)
        .eq('status', 'sent');
        
      if (error) throw error;
      
      return count || 0;
    } catch (error) {
      console.error('Error getting unread count:', error);
      return 0;
    }
  },
  
  // Send system message
  async sendSystemMessage(chatId: string, text: string): Promise<MarketplaceMessage> {
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
      await supabase
        .from('chats')
        .update({ status: 'completed' })
        .eq('id', chatId);
        
      // Send system message
      await this.sendSystemMessage(chatId, 'This transaction has been marked as completed.');
    } catch (error) {
      console.error('Error marking chat as completed:', error);
    }
  },

  // Update message status
  async updateMessageStatus(messageId: string, status: 'sent' | 'delivered' | 'read'): Promise<void> {
    try {
      // Update in database
      await supabase
        .from('messages')
        .update({ status })
        .eq('id', messageId);
        
      // Update local cache for all chats
      const keys = await AsyncStorage.getAllKeys();
      const messageKeys = keys.filter(key => key.startsWith(STORAGE_KEYS.RECENT_MESSAGES));
      
      for (const key of messageKeys) {
        const messages = await this.getLocalMessages(key.replace(`${STORAGE_KEYS.RECENT_MESSAGES}_`, ''));
        const updatedMessages = messages.map(msg => 
          msg.id === messageId ? { ...msg, status } : msg
        );
        await this.saveLocalMessages(key.replace(`${STORAGE_KEYS.RECENT_MESSAGES}_`, ''), updatedMessages);
      }
    } catch (error) {
      console.error('Error updating message status:', error);
    }
  },

  // Simulate message delivery and read status
  async simulateMessageDelivery(messageId: string): Promise<void> {
    // Simulate delivery after 1 second
    setTimeout(async () => {
      await this.updateMessageStatus(messageId, 'delivered');
    }, 1000);
    
    // Simulate read after 3 seconds
    setTimeout(async () => {
      await this.updateMessageStatus(messageId, 'read');
    }, 3000);
  }
}; 