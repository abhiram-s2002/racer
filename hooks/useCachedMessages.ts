import { useCachedState } from '@/utils/stateCache';
import { ChatService, ExtendedMessage } from '@/utils/chatService';
import { useState, useEffect, useCallback } from 'react';

export function useCachedMessages(chatId: string | null, username: string) {
  const [messages, setMessages, { loading: cacheLoading, error: cacheError }] = useCachedState<ExtendedMessage[]>(
    [],
    {
      persistKey: chatId || undefined, // Convert null to undefined
      encryptData: true,
      ttl: 3600, // 1 hour cache
    }
  );

  const [loading, setLoading] = useState(cacheLoading);
  const [error, setError] = useState<string | null>(cacheError?.message || null);

  const loadMessages = useCallback(async () => {
    if (!chatId) {
      setMessages([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const loadedMessages = await ChatService.getMessages(chatId);
      setMessages(loadedMessages);
    } catch (err) {
      console.error('Error loading messages:', err);
      setError('Failed to load messages');
    } finally {
      setLoading(false);
    }
  }, [chatId, setMessages]);

  const sendMessage = useCallback(async (text: string) => {
    if (!chatId || !username || !text.trim()) return;

    try {
      const newMessage = await ChatService.sendMessage(chatId, username, text.trim());
      setMessages(prev => [...prev, newMessage]);
      return newMessage;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }, [chatId, username, setMessages]);

  const sendSystemMessage = useCallback(async (text: string) => {
    if (!chatId || !text.trim()) return;

    try {
      const systemMessage = await ChatService.sendSystemMessage(chatId, text.trim());
      setMessages(prev => [...prev, systemMessage]);
      return systemMessage;
    } catch (error) {
      console.error('Error sending system message:', error);
      throw error;
    }
  }, [chatId, setMessages]);

  const markAsRead = useCallback(async () => {
    if (!chatId || !username) return;

    try {
      await ChatService.markAsRead(chatId, username);
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  }, [chatId, username]);

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
    messages,
    loading,
    error,
    sendMessage,
    sendSystemMessage,
    loadMessages,
  };
} 