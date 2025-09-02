/* global console, setInterval, clearInterval */
import { useState, useEffect, useCallback } from 'react';
import { ChatService } from '@/utils/chatService';
import { SimpleCacheService } from '@/utils/simpleCacheService';
import { ExtendedChat } from '@/utils/chatService';
import { AppState } from 'react-native';

interface UseChatsReturn {
  chats: ExtendedChat[];
  loading: boolean;
  error: string | null;
  refreshChats: () => Promise<void>;
  loadMoreChats: () => Promise<void>;
  markChatAsCompleted: (chatId: string) => Promise<void>;
  createChatFromPing: (pingId: string, username: string) => Promise<void>;
}

export function useChats(username: string): UseChatsReturn {
  const [chats, setChats] = useState<ExtendedChat[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load chats for a user
  const loadChats = useCallback(async (forceRefresh = false) => {
    if (!username) return;

    try {
      if (forceRefresh) {
        // Clear cache for force refresh
        setChats([]);
      }

      const loadedChats = await ChatService.getChats(username);
      setChats(loadedChats);
    } catch (err) {
      // Silent error handling
    }
  }, [username]);

  // Load more chats (for pagination if needed)
  const loadMoreChats = useCallback(async () => {
    if (!username || loading) return;
    
    try {
      setLoading(true);
      // For now, just refresh all chats
      // In the future, this could implement pagination
      await loadChats(true);
    } catch (err) {
      // Silent error handling
    } finally {
      setLoading(false);
    }
  }, [username, loading, loadChats]);

  // Mark chat as completed
  const markChatAsCompleted = useCallback(async (chatId: string) => {
    try {
      // Update local state
      setChats(prevChats => 
        prevChats.map(chat => 
          chat.id === chatId 
            ? { ...chat, status: 'archived' as const }
            : chat
        )
      );
      
      // Invalidate cache for this user
      SimpleCacheService.invalidateUserCache(username);
    } catch (err) {
      // Silent error handling
    }
  }, [username]);

  // Create chat from ping
  const createChatFromPing = useCallback(async (pingId: string, username: string) => {
    try {
      // This would typically call a service to create the chat
      // For now, just refresh chats to get the new one
      await loadChats(true);
    } catch (err) {
      // Silent error handling
    }
  }, [loadChats]);

  // Refresh chats
  const refreshChats = useCallback(async () => {
    await loadChats(true);
  }, [loadChats]);

  // Initial load
  useEffect(() => {
    if (username) {
      loadChats();
    }
  }, [username, loadChats]);

  // Periodic refresh with smart intervals based on chat count
  useEffect(() => {
    if (!username) return;

    const getRefreshInterval = () => {
      const chatCount = chats.length;
      if (chatCount === 0) return 30000;      // 30s if no chats
      if (chatCount <= 5) return 60000;       // 1min if 1-5 chats
      if (chatCount <= 10) return 120000;     // 2min if 6-10 chats
      return 300000;                          // 5min if 10+ chats
    };

    const interval = setInterval(() => {
      loadChats();
    }, getRefreshInterval());

    return () => clearInterval(interval);
  }, [username, chats.length, loadChats]);

  // App state change listener for smart refresh
  useEffect(() => {
    if (!username) return;

    const handleAppStateChange = (nextAppState: string) => {
      if (nextAppState === 'active') {
        loadChats();
      }
    };

    // Add app state listener
    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription?.remove();
    };
  }, [username, loadChats]);

  return {
    chats,
    loading,
    error,
    refreshChats,
    loadMoreChats,
    markChatAsCompleted,
    createChatFromPing,
  };
} 