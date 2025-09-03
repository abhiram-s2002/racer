import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/utils/supabaseClient';
import { Request, RequestCategory, RequestsState } from '@/utils/types';

const PAGE_SIZE = 10;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache

export function useRequests() {
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [lastRefresh, setLastRefresh] = useState(0);
  
  // Cache for requests data
  const cacheRef = useRef(new Map<string, { data: Request[]; timestamp: number }>());
  const isInitializedRef = useRef(false);

  const getCacheKey = (userLat?: number, userLon?: number, category?: string) => {
    const roundedLat = userLat ? Math.round(userLat * 100) / 100 : 0;
    const roundedLon = userLon ? Math.round(userLon * 100) / 100 : 0;
    return `requests-${roundedLat}-${roundedLon}-${category || 'all'}`;
  };

  const isCacheValid = (cacheKey: string): boolean => {
    const cached = cacheRef.current.get(cacheKey);
    if (!cached) return false;
    
    const now = Date.now();
    return (now - cached.timestamp) < CACHE_DURATION;
  };

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
    if (!forceRefresh && isCacheValid(cacheKey)) {
      const cached = cacheRef.current.get(cacheKey);
      if (cached) {
        return cached.data;
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
          limit_count: pageNumber * PAGE_SIZE,
          offset_count: (pageNumber - 1) * PAGE_SIZE
        });

      if (error) {
        console.error('Error fetching requests with hierarchical sorting:', error);
        // Fallback to simple query
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('requests')
          .select('*')
          .order('updated_at', { ascending: false })
          .range((pageNumber - 1) * PAGE_SIZE, pageNumber * PAGE_SIZE - 1);
        
        if (fallbackError) {
          throw fallbackError;
        }
        
        const result = fallbackData || [];
        // Cache the result
        cacheRef.current.set(cacheKey, { data: result, timestamp: Date.now() });
        return result;
      }

      const result = data || [];
      // Cache the result
      cacheRef.current.set(cacheKey, { data: result, timestamp: Date.now() });
      return result;
    } catch (err) {
      console.error('Error fetching requests:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch requests');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // Load initial data (only once when entering app)
  const loadInitialData = useCallback(async (
    userLat?: number, 
    userLon?: number, 
    category?: string,
    userLocationData?: { location_state?: string; location_district?: string; location_name?: string }
  ) => {
    if (isInitializedRef.current) return;
    
    isInitializedRef.current = true;
    const newRequests = await fetchRequests(1, userLat, userLon, category, false, userLocationData);
    setRequests(newRequests);
    setCurrentPage(1);
    setHasMore(newRequests.length === PAGE_SIZE);
    setLastRefresh(Date.now());
  }, [fetchRequests]);

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
    
    if (newRequests.length === 0) {
      setHasMore(false);
    } else {
      setRequests(prev => [...prev, ...newRequests]);
      setCurrentPage(nextPage);
    }
  }, [loading, hasMore, currentPage, fetchRequests]);

  // Manual refresh (clears cache and fetches fresh data)
  const refresh = useCallback(async (
    userLat?: number, 
    userLon?: number, 
    category?: string,
    userLocationData?: { location_state?: string; location_district?: string; location_name?: string }
  ) => {
    // Clear cache for this specific query
    const cacheKey = getCacheKey(userLat, userLon, category);
    cacheRef.current.delete(cacheKey);
    
    setRequests([]);
    setCurrentPage(1);
    setHasMore(true);
    setError(null);

    const newRequests = await fetchRequests(1, userLat, userLon, category, true, userLocationData);
    setRequests(newRequests);
    setHasMore(newRequests.length === PAGE_SIZE);
    setLastRefresh(Date.now());
  }, [fetchRequests]);

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
      cacheRef.current.clear();
      isInitializedRef.current = false;
      
      return data;
    } catch (err) {
      console.error('Error creating request:', err);
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
      cacheRef.current.clear();
      isInitializedRef.current = false;

      return data;
    } catch (err) {
      console.error('Error updating request:', err);
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
      cacheRef.current.clear();
      isInitializedRef.current = false;

      // Remove from local state
      setRequests(prev => prev.filter(req => req.id !== requestId));
    } catch (err) {
      console.error('Error deleting request:', err);
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
      console.error('Error fetching user requests:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch user requests');
      return [];
    }
  }, []);

  // Clear cache (useful for logout or app reset)
  const clearCache = useCallback(() => {
    cacheRef.current.clear();
    isInitializedRef.current = false;
    setRequests([]);
    setCurrentPage(1);
    setHasMore(true);
    setError(null);
    setLastRefresh(0);
  }, []);

  // Get cache status
  const getCacheStatus = useCallback((userLat?: number, userLon?: number, category?: string) => {
    const cacheKey = getCacheKey(userLat, userLon, category);
    const cached = cacheRef.current.get(cacheKey);
    
    if (!cached) return { isValid: false, age: 0 };
    
    const age = Date.now() - cached.timestamp;
    return { 
      isValid: age < CACHE_DURATION, 
      age: Math.floor(age / 1000) // age in seconds
    };
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
    
    // Computed state
    isInitialized: isInitializedRef.current,
    cacheSize: cacheRef.current.size
  };
}
