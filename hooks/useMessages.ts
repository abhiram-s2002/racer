/* global console */
import { useState, useEffect, useCallback } from 'react';
import { ChatService } from '@/utils/chatService';

import { ExtendedMessage } from '@/utils/chatService';

export function useMessages(chatId: string | null, username: string) {
  const [messages, setMessages] = useState<ExtendedMessage[]>([]);
  const [displayedMessages, setDisplayedMessages] = useState<ExtendedMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [messageLimit, setMessageLimit] = useState(10);

  // Load messages for a chat
  const loadMessages = useCallback(async () => {
    if (!chatId) return;

    try {
      setLoading(true);
      setError(null);

      const loadedMessages = await ChatService.getMessages(chatId);
      setMessages(loadedMessages);
      
      // Set initial messages for display
      const initialMessages = loadedMessages.slice(-50); // Last 50 messages
      setDisplayedMessages(initialMessages);
    } catch (err) {
      setError('Failed to load messages');
    } finally {
      setLoading(false);
    }
  }, [chatId]);

  const sendMessage = useCallback(async (text: string) => {
    if (!chatId || !username || !text.trim()) return;

    try {
      const newMessage = await ChatService.sendMessage(chatId, username, text.trim());
      if (newMessage) {
        setMessages(prev => [...prev, newMessage]);
        
        // Add new message to displayed messages
        setDisplayedMessages(prev => [...prev, newMessage]);
      }
      
      return newMessage;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }, [chatId, username]);

  // Remove sendSystemMessage as it doesn't exist in ChatService
  // const sendSystemMessage = useCallback(async (text: string) => {
  //   if (!chatId || !text.trim()) return;

  //   try {
  //     const systemMessage = await ChatService.sendSystemMessage(chatId, text.trim());
  //     setMessages(prev => [...prev, systemMessage]);
  //     return systemMessage;
  //   } catch (error) {
  //     console.error('Error sending system message:', error);
  //     throw error;
  //   }
  // }, [chatId]);

  const markAsRead = useCallback(async () => {
    if (!chatId || !username) return;

    try {
      await ChatService.markAsRead(chatId, username);
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  }, [chatId, username]);

  // Load more messages (10 at a time)
  const loadMoreMessages = useCallback(async () => {
    if (!chatId || !hasMoreMessages) return;

    try {
      const currentLimit = messageLimit;
      const newLimit = currentLimit + 10;
      setMessageLimit(newLimit);
      
      // Show more messages
      const moreMessages = messages.slice(-newLimit);
      setDisplayedMessages(moreMessages);
      
      // Hide button until there are 10+ more messages to load
      const remainingMessages = messages.length - newLimit;
      setHasMoreMessages(remainingMessages >= 10);
      
          } catch (error) {
        // Silent error handling
      }
  }, [chatId, hasMoreMessages, messageLimit, messages]);

  // Load messages when chatId changes
  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  // Mark messages as read when chat is opened
  useEffect(() => {
    if (chatId && username) {
      markAsRead();
    }
  }, [chatId, username, markAsRead]);

  return {
    messages: displayedMessages, // Return displayed messages instead of all messages
    allMessages: messages, // Keep access to all messages if needed
    loading,
    error,
    hasMoreMessages,
    messageLimit,
    sendMessage,
    markAsRead,
    loadMoreMessages,
  };
}