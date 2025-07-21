/* global console, setInterval, clearInterval */
import { useState, useEffect, useCallback } from 'react';
import { ChatService, Chat } from '@/utils/chatService';

export function useChats(username: string) {
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});

  const loadChats = useCallback(async () => {
    if (!username) {
      setChats([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const loadedChats = await ChatService.getChats(username);
      setChats(loadedChats);
      
      // Calculate unread counts
      const counts: Record<string, number> = {};
      for (const chat of loadedChats) {
        counts[chat.id] = await ChatService.getUnreadCount(chat.id, username);
      }
      setUnreadCounts(counts);
    } catch (err) {
      console.error('Error loading chats:', err);
      setError('Failed to load chats');
    } finally {
      setLoading(false);
    }
  }, [username]);

  const markChatAsRead = useCallback(async (chatId: string) => {
    if (!username) return;
    
    try {
      await ChatService.markAsRead(chatId, username);
      // Refresh unread count
      const newCount = await ChatService.getUnreadCount(chatId, username);
      setUnreadCounts(prev => ({ ...prev, [chatId]: newCount }));
    } catch (error) {
      console.error('Error marking chat as read:', error);
    }
  }, [username]);

  const markChatAsCompleted = useCallback(async (chatId: string) => {
    try {
      await ChatService.markChatAsCompleted(chatId);
      // Refresh chats to show updated status
      await loadChats();
    } catch (error) {
      console.error('Error marking chat as completed:', error);
    }
  }, [loadChats]);

  const createChatFromPing = useCallback(async (pingId: string) => {
    try {
      const chatId = await ChatService.createChatFromPing(pingId);
      // Refresh chats to include the new chat
      await loadChats();
      return chatId;
    } catch (error) {
      console.error('Error creating chat from ping:', error);
      throw error;
    }
  }, [loadChats]);

  // Load chats on mount and when username changes
  useEffect(() => {
    loadChats();
  }, [loadChats]);

  // Refresh unread counts periodically
  useEffect(() => {
    if (!username || chats.length === 0) return;

    const refreshUnreadCounts = async () => {
      const counts: Record<string, number> = {};
      for (const chat of chats) {
        counts[chat.id] = await ChatService.getUnreadCount(chat.id, username);
      }
      setUnreadCounts(counts);
    };

    refreshUnreadCounts();
    
    // Refresh every 30 seconds
    const interval = setInterval(refreshUnreadCounts, 30000);
    return () => clearInterval(interval);
  }, [username, chats]);

  return {
    chats,
    loading,
    error,
    loadChats,
    markChatAsRead,
    markChatAsCompleted,
    createChatFromPing,
    unreadCounts,
  };
} 