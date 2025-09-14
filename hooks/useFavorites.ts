import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { 
  addToFavorites, 
  removeFromFavorites, 
  isListingFavorited, 
  getFavoritesStatus,
  toggleFavorite,
  FavoriteListing 
} from '@/utils/favoritesSupabase';

interface UseFavoritesReturn {
  favorites: { [listingId: string]: boolean };
  loading: boolean;
  error: string | null;
  toggleFavoriteStatus: (listingId: string, username: string) => Promise<boolean>;
  refreshFavoritesStatus: (listingIds: string[]) => Promise<void>;
  isFavorited: (listingId: string) => boolean;
  setFavorites: React.Dispatch<React.SetStateAction<{ [listingId: string]: boolean }>>;
}

export const useFavorites = (): UseFavoritesReturn => {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<{ [listingId: string]: boolean }>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if a specific listing is favorited
  const isFavorited = useCallback((listingId: string): boolean => {
    return favorites[listingId] || false;
  }, [favorites]);

  // Toggle favorite status for a listing
  const toggleFavoriteStatus = useCallback(async (
    listingId: string, 
    username: string
  ): Promise<boolean> => {
    if (!user?.id || !user?.username) {
      setError('User not authenticated');
      return false;
    }

    const currentStatus = isFavorited(listingId);
    
    try {
      setLoading(true);
      setError(null);

      const result = await toggleFavorite(
        user.id,
        user.username,
        listingId,
        currentStatus
      );

      if (result.success) {
        // Update local state immediately for better UX
        setFavorites(prev => ({
          ...prev,
          [listingId]: !currentStatus
        }));
        return !currentStatus;
      } else {
        setError(result.error || 'Failed to toggle favorite');
        return currentStatus;
      }
    } catch (err) {
      console.error('Error toggling favorite:', err);
      setError(err instanceof Error ? err.message : 'Failed to toggle favorite');
      return currentStatus;
    } finally {
      setLoading(false);
    }
  }, [user, isFavorited]);

  // Refresh favorites status for multiple listings
  const refreshFavoritesStatus = useCallback(async (listingIds: string[]) => {
    if (!user?.id || listingIds.length === 0) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const result = await getFavoritesStatus(user.id, listingIds);
      
      if (result.success && result.favorites) {
        setFavorites(prev => ({
          ...prev,
          ...result.favorites
        }));
      } else {
        setError(result.error || 'Failed to fetch favorites status');
      }
    } catch (err) {
      console.error('Error fetching favorites status:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch favorites status');
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Clear error when user changes
  useEffect(() => {
    if (user) {
      setError(null);
    } else {
      setFavorites({});
    }
  }, [user]);

  return {
    favorites,
    loading,
    error,
    toggleFavoriteStatus,
    refreshFavoritesStatus,
    isFavorited,
    setFavorites
  };
};

// Hook for managing saved listings page
interface UseSavedListingsReturn {
  savedListings: FavoriteListing[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
  setSavedListings: React.Dispatch<React.SetStateAction<FavoriteListing[]>>;
}

export const useSavedListings = (): UseSavedListingsReturn => {
  const { user } = useAuth();
  const [savedListings, setSavedListings] = useState<FavoriteListing[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);

  const loadSavedListings = useCallback(async (reset = false) => {
    if (!user?.id) return;

    try {
      setLoading(true);
      setError(null);

      const currentOffset = reset ? 0 : offset;
      const { getUserFavorites } = await import('@/utils/favoritesSupabase');
      
      const result = await getUserFavorites(user.id, 20, currentOffset);
      
      if (result.success && result.favorites) {
        if (reset) {
          setSavedListings(result.favorites);
          setOffset(20);
        } else {
          setSavedListings(prev => [...prev, ...result.favorites!]);
          setOffset(prev => prev + 20);
        }
        setHasMore(result.favorites.length === 20);
      } else {
        setError(result.error || 'Failed to load saved listings');
        setHasMore(false);
      }
    } catch (err) {
      console.error('Error loading saved listings:', err);
      setError(err instanceof Error ? err.message : 'Failed to load saved listings');
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, [user, offset]);

  const loadMore = useCallback(async () => {
    if (!loading && hasMore) {
      await loadSavedListings(false);
    }
  }, [loading, hasMore, loadSavedListings]);

  const refresh = useCallback(async () => {
    setOffset(0);
    setHasMore(true);
    await loadSavedListings(true);
  }, [loadSavedListings]);

  // Load initial data
  useEffect(() => {
    if (user) {
      refresh();
    } else {
      setSavedListings([]);
      setOffset(0);
      setHasMore(true);
    }
  }, [user, refresh]);

  return {
    savedListings,
    loading,
    error,
    hasMore,
    loadMore,
    refresh,
    setSavedListings
  };
};
