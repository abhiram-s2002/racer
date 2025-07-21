/* global console, setTimeout */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { updateUserAchievement } from './achievement';
import { supabase } from './supabaseClient';

export interface Message {
  id: string;
  chatId: string;
  text: string;
  timestamp: Date;
  isOwn: boolean;
  status: 'sent' | 'delivered' | 'read';
  senderId: string;
  receiverId: string;
}

export interface Chat {
  id: string;
  name: string;
  avatar: string;
  lastMessage: string;
  timestamp: string;
  unreadCount: number;
  isOnline: boolean;
  productName?: string;
  productImage?: string;
  productId?: string;
  participantId: string;
  phoneNumber?: string; // <-- added
}

export interface User {
  id: string;
  name: string;
  avatar: string;
  isOnline: boolean;
}

const STORAGE_KEYS = {
  MESSAGES: 'messages',
  CHATS: 'chats',
  CURRENT_USER: 'currentUser',
  READ_RECEIPTS: 'readReceipts',
};

// Current user (in a real app, this would come from authentication)
const CURRENT_USER: User = {
  id: 'current_user',
  name: 'You',
  avatar: 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=400',
  isOnline: true,
};

export class MessageStorage {
  static async getCurrentUser(): Promise<User> {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.CURRENT_USER);
      return stored ? JSON.parse(stored) : CURRENT_USER;
    } catch (error) {
      console.error('Error getting current user:', error);
      return CURRENT_USER;
    }
  }

  static async getChats(): Promise<Chat[]> {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.CHATS);
      if (stored) {
        return JSON.parse(stored);
      }
      
      // Initialize with mock data
      const initialChats: Chat[] = [
        {
          id: '1',
          name: 'Anjali Verma',
          avatar: 'https://images.pexels.com/photos/1181690/pexels-photo-1181690.jpeg?auto=compress&cs=tinysrgb&w=400',
          lastMessage: 'Hi! Are the tomatoes still available?',
          timestamp: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
          unreadCount: 2,
          isOnline: true,
          productName: 'Fresh Organic Tomatoes',
          productImage: 'https://images.pexels.com/photos/1327838/pexels-photo-1327838.jpeg?auto=compress&cs=tinysrgb&w=400',
          productId: '1',
          participantId: 'user_1',
          phoneNumber: '+91 98765 43210', // <-- added
        },
        {
          id: '2',
          name: 'Vikram Gupta',
          avatar: 'https://images.pexels.com/photos/1043471/pexels-photo-1043471.jpeg?auto=compress&cs=tinysrgb&w=400',
          lastMessage: 'Thank you! I\'ll pick it up tomorrow.',
          timestamp: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
          unreadCount: 0,
          isOnline: false,
          productName: 'Handmade Wooden Table',
          productImage: 'https://images.pexels.com/photos/1350789/pexels-photo-1350789.jpeg?auto=compress&cs=tinysrgb&w=400',
          productId: '2',
          participantId: 'user_2',
          phoneNumber: '+91 87654 32109', // <-- added
        },
        {
          id: '3',
          name: 'Rohit Sharma',
          avatar: 'https://images.pexels.com/photos/1040880/pexels-photo-1040880.jpeg?auto=compress&cs=tinysrgb&w=400',
          lastMessage: 'Can you share more photos?',
          timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
          unreadCount: 1,
          isOnline: true,
          productName: 'iPhone 13 Pro',
          productImage: 'https://images.pexels.com/photos/788946/pexels-photo-788946.jpeg?auto=compress&cs=tinysrgb&w=400',
          productId: '3',
          participantId: 'user_3',
          phoneNumber: '+91 76543 21098', // <-- added
        },
      ];
      
      await this.saveChats(initialChats);
      return initialChats;
    } catch (error) {
      console.error('Error getting chats:', error);
      return [];
    }
  }

  static async saveChats(chats: Chat[]): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.CHATS, JSON.stringify(chats));
    } catch (error) {
      console.error('Error saving chats:', error);
    }
  }

  static async getMessages(chatId: string): Promise<Message[]> {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.MESSAGES);
      const allMessages: Message[] = stored ? JSON.parse(stored) : [];
      
      const chatMessages = allMessages.filter(msg => msg.chatId === chatId);
      
      if (chatMessages.length === 0 && chatId === '1') {
        // Initialize with mock messages for first chat
        const initialMessages: Message[] = [
          {
            id: 'msg_1',
            chatId: '1',
            text: 'Hi! I saw your listing for organic tomatoes. Are they still available?',
            timestamp: new Date(Date.now() - 7 * 60 * 1000),
            isOwn: false,
            status: 'read',
            senderId: 'user_1',
            receiverId: 'current_user',
          },
          {
            id: 'msg_2',
            chatId: '1',
            text: 'Yes, they are! Fresh from my garden this morning.',
            timestamp: new Date(Date.now() - 5 * 60 * 1000),
            isOwn: true,
            status: 'read',
            senderId: 'current_user',
            receiverId: 'user_1',
          },
          {
            id: 'msg_3',
            chatId: '1',
            text: 'Great! How much for 2 kg?',
            timestamp: new Date(Date.now() - 4 * 60 * 1000),
            isOwn: false,
            status: 'read',
            senderId: 'user_1',
            receiverId: 'current_user',
          },
          {
            id: 'msg_4',
            chatId: '1',
            text: '₹160 for 2 kg. They are completely organic, no pesticides used.',
            timestamp: new Date(Date.now() - 3 * 60 * 1000),
            isOwn: true,
            status: 'read',
            senderId: 'current_user',
            receiverId: 'user_1',
          },
          {
            id: 'msg_5',
            chatId: '1',
            text: 'Perfect! Can I pick them up today evening around 6 PM?',
            timestamp: new Date(Date.now() - 2 * 60 * 1000),
            isOwn: false,
            status: 'delivered',
            senderId: 'user_1',
            receiverId: 'current_user',
          },
        ];
        
        await this.saveMessages([...allMessages, ...initialMessages]);
        return initialMessages;
      }
      
      return chatMessages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    } catch (error) {
      console.error('Error getting messages:', error);
      return [];
    }
  }

  static async saveMessages(messages: Message[]): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(messages));
    } catch (error) {
      console.error('Error saving messages:', error);
    }
  }

  static async sendMessage(chatId: string, text: string, receiverId: string): Promise<Message> {
    try {
      const currentUser = await this.getCurrentUser();
      const newMessage: Message = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        chatId,
        text,
        timestamp: new Date(),
        isOwn: true,
        status: 'sent',
        senderId: currentUser.id,
        receiverId,
      };

      // Save message
      const allMessages = await AsyncStorage.getItem(STORAGE_KEYS.MESSAGES);
      const messages: Message[] = allMessages ? JSON.parse(allMessages) : [];
      messages.push(newMessage);
      await this.saveMessages(messages);

      // Update chat
      const chats = await this.getChats();
      const chatIndex = chats.findIndex(chat => chat.id === chatId);
      if (chatIndex !== -1) {
        chats[chatIndex].lastMessage = text;
        chats[chatIndex].timestamp = newMessage.timestamp.toISOString();
        await this.saveChats(chats);
      }

      // Simulate message delivery after a short delay
      setTimeout(async () => {
        await this.updateMessageStatus(newMessage.id, 'delivered');
      }, 1000);

      // Simulate message read after another delay
      setTimeout(async () => {
        await this.updateMessageStatus(newMessage.id, 'read');
      }, 3000);

      // After sending a message, update achievement progress
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          // Get user profile to get username
          const { data: profile } = await supabase
            .from('users')
            .select('username')
            .eq('id', user.id)
            .single();
          
          if (profile?.username) {
            await updateUserAchievement(profile.username, 'social_butterfly', 1);
          }
        }
      } catch (error) {
        console.error('Error updating achievement for message:', error);
      }

      return newMessage;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  static async updateMessageStatus(messageId: string, status: 'sent' | 'delivered' | 'read'): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.MESSAGES);
      const messages: Message[] = stored ? JSON.parse(stored) : [];
      
      const messageIndex = messages.findIndex(msg => msg.id === messageId);
      if (messageIndex !== -1) {
        messages[messageIndex].status = status;
        await this.saveMessages(messages);
      }
    } catch (error) {
      console.error('Error updating message status:', error);
    }
  }

  static async markChatAsRead(chatId: string): Promise<void> {
    try {
      // Mark all messages in chat as read
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.MESSAGES);
      const messages: Message[] = stored ? JSON.parse(stored) : [];
      
      const updatedMessages = messages.map(msg => {
        if (msg.chatId === chatId && !msg.isOwn) {
          return { ...msg, status: 'read' as const };
        }
        return msg;
      });
      
      await this.saveMessages(updatedMessages);

      // Update chat unread count
      const chats = await this.getChats();
      const chatIndex = chats.findIndex(chat => chat.id === chatId);
      if (chatIndex !== -1) {
        chats[chatIndex].unreadCount = 0;
        await this.saveChats(chats);
      }
    } catch (error) {
      console.error('Error marking chat as read:', error);
    }
  }

  static async createChat(participantId: string, participantName: string, participantAvatar: string, productId?: string, productName?: string, productImage?: string): Promise<Chat> {
    try {
      const newChat: Chat = {
        id: `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: participantName,
        avatar: participantAvatar,
        lastMessage: '',
        timestamp: new Date().toISOString(),
        unreadCount: 0,
        isOnline: Math.random() > 0.5, // Random online status
        productName,
        productImage,
        productId,
        participantId,
      };

      const chats = await this.getChats();
      chats.unshift(newChat);
      await this.saveChats(chats);

      return newChat;
    } catch (error) {
      console.error('Error creating chat:', error);
      throw error;
    }
  }

  static async deleteChat(chatId: string): Promise<void> {
    try {
      // Remove chat
      const chats = await this.getChats();
      const filteredChats = chats.filter(chat => chat.id !== chatId);
      await this.saveChats(filteredChats);

      // Remove messages
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.MESSAGES);
      const messages: Message[] = stored ? JSON.parse(stored) : [];
      const filteredMessages = messages.filter(msg => msg.chatId !== chatId);
      await this.saveMessages(filteredMessages);
    } catch (error) {
      console.error('Error deleting chat:', error);
    }
  }

  static formatTimestamp(timestamp: string | Date): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) {
      return 'now';
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`;
    } else if (diffInMinutes < 1440) {
      const hours = Math.floor(diffInMinutes / 60);
      return `${hours}h ago`;
    } else {
      const days = Math.floor(diffInMinutes / 1440);
      return `${days}d ago`;
    }
  }

  static formatMessageTime(timestamp: string | Date): string {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  }
}