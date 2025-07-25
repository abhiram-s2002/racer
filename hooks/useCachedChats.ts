import { useCachedState } from '@/utils/stateCache';
import { ChatService, Chat } from '@/utils/chatService';
import { useState, useEffect, useCallback } from 'react';

export function useCachedChats(username: string) {
  const [chats, setChats, { loading: cacheLoading, error: cacheError }] = useCachedState<Chat[]>(
    [],
    {
      persistKey: `chats:${username}`,
      encryptData: true,
      ttl: 3600, // 1 hour cache
    }
  );

  const [loading, setLoading] = useState(cacheLoading);
  const [error, setError] = useState<string | null>(cacheError?.message || null);
  const [unreadCounts, setUnreadCounts] = useCachedState<Record<string, number>>(
    {},
    {
      persistKey: `unread:${username}`,
      ttl: 300, // 5 minutes cache
    }
  );

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
  }, [username, setChats, setUnreadCounts]);

  const markChatAsRead = useCallback(async (chatId: string) => {
    if (!username) return;
    
    try {
      await ChatService.markAsRead(chatId, username);
      // Update unread count in cache
      setUnreadCounts(prev => ({ ...prev, [chatId]: 0 }));
    } catch (error) {
      console.error('Error marking chat as read:', error);
    }
  }, [username, setUnreadCounts]);

  const markChatAsCompleted = useCallback(async (chatId: string) => {
    try {
      await ChatService.markChatAsCompleted(chatId);
      // Update chat status in cache
      setChats(prev => 
        prev.map(chat => 
          chat.id === chatId 
            ? { ...chat, status: 'archived' }
            : chat
        )
      );
    } catch (error) {
      console.error('Error marking chat as completed:', error);
    }
  }, [setChats]);

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
  }, [username, chats, setUnreadCounts]);

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