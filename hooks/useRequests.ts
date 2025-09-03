import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/utils/supabaseClient';
import { Request, RequestCategory, RequestsState } from '@/utils/types';
import { enhancedCache } from '@/utils/enhancedCacheManager';

const INITIAL_PAGE_SIZE = 12; // Initial load for good UX
const SUBSEQUENT_PAGE_SIZE = 6; // Subsequent loads for efficiency
const CACHE_DURATION = 2 * 60 * 60 * 1000; // 2 hours cache - Extended to reduce database queries
const CACHE_KEYS = {
  REQUESTS: 'requests_data',
  LAST_REFRESH: 'requests_last_refresh',
  CACHE_STATUS: 'requests_cache_status'
};

// Helper function to get the correct page size
const getPageSize = (pageNumber: number) => {
  return pageNumber === 1 ? INITIAL_PAGE_SIZE : SUBSEQUENT_PAGE_SIZE;
};

// Helper function to calculate total items needed for a page
const getTotalItemsForPage = (pageNumber: number) => {
  if (pageNumber === 1) {
    return INITIAL_PAGE_SIZE;
  }
  return INITIAL_PAGE_SIZE + (pageNumber - 1) * SUBSEQUENT_PAGE_SIZE;
};

export function useRequests() {
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [lastRefresh, setLastRefresh] = useState(0);
  
  // State management
  const isInitializedRef = useRef(false);
  const lastRefreshRef = useRef<number>(0);

  const getCacheKey = (userLat?: number, userLon?: number, category?: string) => {
    const roundedLat = userLat ? Math.round(userLat * 100) / 100 : 0;
    const roundedLon = userLon ? Math.round(userLon * 100) / 100 : 0;
    return `${CACHE_KEYS.REQUESTS}_${roundedLat}-${roundedLon}-${category || 'all'}`;
  };

  // Check if we should refresh based on last refresh time
  const shouldRefresh = useCallback(async (): Promise<boolean> => {
    try {
      const lastRefresh = await enhancedCache.get<number>(CACHE_KEYS.LAST_REFRESH);
      if (!lastRefresh) return true; // First time, should refresh
      
      const now = Date.now();
      return (now - lastRefresh) > CACHE_DURATION;
    } catch (error) {
      // Error checking refresh status
      return true; // On error, refresh to be safe
    }
  }, []);

  // Update last refresh time
  const updateLastRefresh = useCallback(async () => {
    try {
      const now = Date.now();
      await enhancedCache.set(CACHE_KEYS.LAST_REFRESH, now);
      lastRefreshRef.current = now;
    } catch (error) {
      // Error updating last refresh time
    }
  }, []);

  // Fetch requests from Supabase with hierarchical location sorting (cost-optimized)
  const fetchRequests = useCallback(async (
    pageNumber = 1, 
    userLat?: number, 
    userLon?: number,
    category?: string,
    forceRefresh = false,
    userLocationData?: { location_state?: string; location_district?: string; location_name?: string }
  ) => {
    const cacheKey = getCacheKey(userLat, userLon, category);
    

    
    // Check cache first (unless force refresh)
    if (!forceRefresh) {
      const cached = await enhancedCache.get<Request[]>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    try {
      setLoading(true);
      setError(null);



      // Use hierarchical location sorting for better performance and lower costs
      const { data, error } = await supabase
        .rpc('get_requests_hierarchical', {
          user_state: userLocationData?.location_state || null,
          user_district: userLocationData?.location_district || null,
          user_city: userLocationData?.location_name || null,
          category_filter: category || null,
          limit_count: getTotalItemsForPage(pageNumber),
          offset_count: pageNumber === 1 ? 0 : INITIAL_PAGE_SIZE + (pageNumber - 2) * SUBSEQUENT_PAGE_SIZE
        });

      if (error) {
        // Error fetching requests with hierarchical sorting
        // Fallback to simple query
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('requests')
          .select('id, requester_username, title, description, category, latitude, longitude, created_at, updated_at, expires_at')
          .order('updated_at', { ascending: false })
          .range(
            pageNumber === 1 ? 0 : INITIAL_PAGE_SIZE + (pageNumber - 2) * SUBSEQUENT_PAGE_SIZE,
            getTotalItemsForPage(pageNumber) - 1
          );
        
        if (fallbackError) {
          throw fallbackError;
        }
        const result = fallbackData || [];
        // Cache the result using enhanced cache manager
        await enhancedCache.set(cacheKey, result);
        return result;
      }


      const result = data || [];
      // Cache the result using enhanced cache manager
      await enhancedCache.set(cacheKey, result);
      return result;
    } catch (err) {
      // Error fetching requests
      setError(err instanceof Error ? err.message : 'Failed to fetch requests');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // Load initial data (only once when entering app or when cache expires)
  const loadInitialData = useCallback(async (
    userLat?: number, 
    userLon?: number, 
    category?: string,
    userLocationData?: { location_state?: string; location_district?: string; location_name?: string }
  ) => {
    if (isInitializedRef.current) {
      return;
    }
    
    isInitializedRef.current = true;
    
    // Check if we should refresh based on last refresh time
    const needsRefresh = await shouldRefresh();
    
    const newRequests = await fetchRequests(1, userLat, userLon, category, needsRefresh, userLocationData);
    
    setRequests(newRequests);
    setCurrentPage(1);
    setHasMore(newRequests.length === INITIAL_PAGE_SIZE);
    setLastRefresh(Date.now());
    
    // Update last refresh time if we actually fetched fresh data
    if (needsRefresh) {
      await updateLastRefresh();
    }
  }, [fetchRequests, shouldRefresh, updateLastRefresh]);

  // Load more requests (for pagination)
  const loadMore = useCallback(async (
    userLat?: number, 
    userLon?: number, 
    category?: string,
    userLocationData?: { location_state?: string; location_district?: string; location_name?: string }
  ) => {
    if (loading || !hasMore) return;

    const nextPage = currentPage + 1;
    const newRequests = await fetchRequests(nextPage, userLat, userLon, category, false, userLocationData);
    
    // For subsequent pages, we need to slice the results to get only the new items
    const startIndex = currentPage === 1 ? INITIAL_PAGE_SIZE : 0;
    const pageResults = newRequests.slice(startIndex, startIndex + SUBSEQUENT_PAGE_SIZE);
    
    if (pageResults.length === 0) {
      setHasMore(false);
    } else {
      setRequests(prev => [...prev, ...pageResults]);
      setCurrentPage(nextPage);
      setHasMore(pageResults.length === SUBSEQUENT_PAGE_SIZE);
    }
  }, [loading, hasMore, currentPage, fetchRequests]);

  // Manual refresh (clears cache and fetches fresh data) - only called on pull-to-refresh
  const refresh = useCallback(async (
    userLat?: number, 
    userLon?: number, 
    category?: string,
    userLocationData?: { location_state?: string; location_district?: string; location_name?: string }
  ) => {
    // Clear cache for this specific query
    const cacheKey = getCacheKey(userLat, userLon, category);
    await enhancedCache.delete(cacheKey);
    
    setRequests([]);
    setCurrentPage(1);
    setHasMore(true);
    setError(null);

    const newRequests = await fetchRequests(1, userLat, userLon, category, true, userLocationData);
    setRequests(newRequests);
    setHasMore(newRequests.length === INITIAL_PAGE_SIZE);
    setLastRefresh(Date.now());
    
    // Update last refresh time
    await updateLastRefresh();
  }, [fetchRequests, updateLastRefresh]);

  // Create a new request
  const createRequest = useCallback(async (requestData: Partial<Request>) => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('requests')
        .insert([requestData])
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Clear all caches to refresh data
      await enhancedCache.invalidateRelated('requests_');
      isInitializedRef.current = false;
      
      return data;
    } catch (err) {
      // Error creating request
      setError(err instanceof Error ? err.message : 'Failed to create request');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Update a request
  const updateRequest = useCallback(async (requestId: string, updates: Partial<Request>) => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('requests')
        .update(updates)
        .eq('id', requestId)
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Clear all caches to refresh data
      await enhancedCache.invalidateRelated('requests_');
      isInitializedRef.current = false;

      return data;
    } catch (err) {
      // Error updating request
      setError(err instanceof Error ? err.message : 'Failed to update request');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Delete a request
  const deleteRequest = useCallback(async (requestId: string) => {
    try {
      setLoading(true);
      setError(null);

      const { error } = await supabase
        .from('requests')
        .delete()
        .eq('id', requestId);

      if (error) {
        throw error;
      }

      // Clear all caches to refresh data
      await enhancedCache.invalidateRelated('requests_');
      isInitializedRef.current = false;

      // Remove from local state
      setRequests(prev => prev.filter(req => req.id !== requestId));
    } catch (err) {
      // Error deleting request
      setError(err instanceof Error ? err.message : 'Failed to delete request');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Get user's own requests
  const getUserRequests = useCallback(async (username: string) => {
    try {
      const { data, error } = await supabase
        .rpc('get_user_requests', {
          username_param: username
        });

      if (error) {
        throw error;
      }

      return data || [];
    } catch (err) {
      // Error fetching user requests
      setError(err instanceof Error ? err.message : 'Failed to fetch user requests');
      return [];
    }
  }, []);

  // Clear cache (useful for logout or app reset)
  const clearCache = useCallback(async () => {
    await enhancedCache.invalidateRelated('requests_');
    isInitializedRef.current = false;
    setRequests([]);
    setCurrentPage(1);
    setHasMore(true);
    setError(null);
    setLastRefresh(0);
  }, []);

  // Get cache status
  const getCacheStatus = useCallback(async (userLat?: number, userLon?: number, category?: string) => {
    const cacheKey = getCacheKey(userLat, userLon, category);
    const cached = await enhancedCache.get<Request[]>(cacheKey);
    
    if (!cached) return { isValid: false, age: 0, source: 'none' };
    
    // Get cache entry details from enhanced cache
    const cacheStats = await enhancedCache.getStats();
    return { 
      isValid: true, 
      age: 0, // Enhanced cache doesn't expose individual entry timestamps
      source: 'enhanced_cache',
      hitRate: cacheStats.hitRate
    };
  }, []);

  // Get last refresh time
  const getLastRefreshTime = useCallback(() => {
    return lastRefreshRef.current;
  }, []);

  return {
    // State
    requests,
    loading,
    error,
    hasMore,
    lastRefresh,
    
    // Actions
    loadInitialData,
    loadMore,
    refresh,
    createRequest,
    updateRequest,
    deleteRequest,
    getUserRequests,
    clearCache,
    
    // Utilities
    getCacheStatus,
    getLastRefreshTime,
    
    // Computed state
    isInitialized: isInitializedRef.current
  };
}
