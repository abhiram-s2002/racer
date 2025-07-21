/* global console */
import { useState, useEffect, useCallback } from 'react';
import { ChatService, Message } from '@/utils/chatService';

export function useMessages(chatId: string | null, username: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
  }, [chatId]);

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
  }, [chatId, username]);

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
  }, [chatId]);

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
    markAsRead,
  };
}