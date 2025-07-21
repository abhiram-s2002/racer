/* global console */
import { useState, useEffect, useCallback } from 'react';
import { MarketplaceChatService, MarketplaceMessage } from '@/utils/marketplaceChatService';
import { supabase } from '@/utils/supabaseClient';

export function useMarketplaceMessages(chatId: string | null, username: string) {
  const [messages, setMessages] = useState<MarketplaceMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadMessages = useCallback(async () => {
    if (!chatId) {
      setMessages([]);
      return;
    }
    
    setLoading(true);
    try {
      const loadedMessages = await MarketplaceChatService.getMessages(chatId);
      setMessages(loadedMessages);
      setError(null);
      
      // Mark messages as read
      if (username) {
        await MarketplaceChatService.markAsRead(chatId, username);
      }
    } catch (err) {
      console.error('Error loading marketplace messages:', err);
      setError('Failed to load messages');
    } finally {
      setLoading(false);
    }
  }, [chatId, username]);

  const sendMessage = useCallback(async (text: string) => {
    if (!chatId || !username || !text.trim()) return null;
    
    try {
      const newMessage = await MarketplaceChatService.sendMessage(chatId, username, text.trim());
      setMessages(prev => [...prev, newMessage]);
      return newMessage;
    } catch (error) {
      console.error('Error sending marketplace message:', error);
      return null;
    }
  }, [chatId, username]);

  const sendSystemMessage = useCallback(async (text: string) => {
    if (!chatId || !text.trim()) return null;
    
    try {
      const systemMessage = await MarketplaceChatService.sendSystemMessage(chatId, text.trim());
      setMessages(prev => [...prev, systemMessage]);
      return systemMessage;
    } catch (error) {
      console.error('Error sending system message:', error);
      return null;
    }
  }, [chatId]);

  // Load messages on mount and when chatId changes
  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  // Set up real-time subscription for new messages and status updates
  useEffect(() => {
    if (!chatId) return;
    
    const subscription = supabase
      .channel(`marketplace_chat_${chatId}`)
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'messages',
          filter: `chat_id=eq.${chatId}`
        }, 
        async (payload) => {
          const newMessage = payload.new as MarketplaceMessage;
          
          // Only add if not already in the messages array
          if (!messages.some(m => m.id === newMessage.id)) {
            setMessages(prev => [...prev, newMessage]);
            
            // Mark as read if not from current user
            if (username && newMessage.sender_username !== username) {
              await MarketplaceChatService.markAsRead(chatId, username);
            }
          }
        }
      )
      .on('postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `chat_id=eq.${chatId}`
        },
        (payload) => {
          const updatedMessage = payload.new as MarketplaceMessage;
          
          // Update message status in the messages array
          setMessages(prev => 
            prev.map(msg => 
              msg.id === updatedMessage.id 
                ? { ...msg, status: updatedMessage.status }
                : msg
            )
          );
        }
      )
      .subscribe();
      
    return () => {
      subscription.unsubscribe();
    };
  }, [chatId, messages, username]);

  return {
    messages,
    loading,
    error,
    sendMessage,
    sendSystemMessage,
    loadMessages
  };
} 