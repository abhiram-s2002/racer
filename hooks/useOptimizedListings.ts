import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/utils/supabaseClient';
import { enhancedCache } from '@/utils/enhancedCacheManager';
import { performanceMonitor } from '@/utils/performanceMonitor';
import { advancedRateLimiter } from '@/utils/advancedRateLimiter';
import { useAuth } from './useAuth';
import { useLocation } from './useLocation';

export interface OptimizedListing {
  id: string;
  title: string;
  description: string;
  price: number;
  price_unit: string;
  category: string;
  latitude: number;
  longitude: number;
  distance_km: number;
  image_count: number;
  has_images: boolean;
  created_at: string;
  seller_username: string;
}

export interface ListingsFilters {
  category?: string;
  maxDistance?: number;
  minPrice?: number;
  maxPrice?: number;
  priceUnit?: string;
}

export interface ListingsState {
  listings: OptimizedListing[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  totalCount: number;
  page: number;
}

export interface UseOptimizedListingsReturn extends ListingsState {
  loadListings: (filters?: ListingsFilters, reset?: boolean) => Promise<void>;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
  clearError: () => void;
  getCachedListings: () => Promise<OptimizedListing[]>;
}

export const useOptimizedListings = (): UseOptimizedListingsReturn => {
  const { user } = useAuth();
  const { latitude, longitude } = useLocation();
  
  const [state, setState] = useState<ListingsState>({
    listings: [],
    loading: false,
    error: null,
    hasMore: true,
    totalCount: 0,
    page: 1,
  });

  const [filters, setFilters] = useState<ListingsFilters>({});
  const pageSize = 20;

  // Generate cache key based on location and filters
  const getCacheKey = useCallback((page: number, filters: ListingsFilters) => {
    const locationKey = latitude && longitude ? `${latitude}_${longitude}` : 'no_location';
    const filtersKey = JSON.stringify(filters);
    return `listings_${locationKey}_${filtersKey}_${page}`;
  }, [latitude, longitude]);

  // Load listings with optimization
  const loadListings = useCallback(async (
    newFilters: ListingsFilters = {},
    reset = false
  ) => {
    if (!latitude || !longitude) {
      setState(prev => ({ ...prev, error: 'Location not available' }));
      return;
    }

    try {
      // Check rate limiting
      if (user) {
        const rateLimit = await advancedRateLimiter.checkUserRateLimit(user.id, 'api');
        if (!rateLimit.allowed) {
          setState(prev => ({ 
            ...prev, 
            error: `Rate limit exceeded. Try again in ${Math.ceil((rateLimit.retryAfter || 0) / 1000)} seconds.` 
          }));
          return;
        }
      }

      const page = reset ? 1 : state.page;
      const currentFilters = reset ? newFilters : { ...filters, ...newFilters };
      
      setState(prev => ({ 
        ...prev, 
        loading: true, 
        error: null,
        page: reset ? 1 : prev.page 
      }));

      // Check cache first
      const cacheKey = getCacheKey(page, currentFilters);
      const cached = await enhancedCache.get<OptimizedListing[]>(cacheKey);
      
      if (cached && !reset) {
        setState(prev => ({
          ...prev,
          listings: reset ? cached : [...prev.listings, ...cached],
          loading: false,
          hasMore: cached.length === pageSize,
        }));
        return;
      }

             // Fetch from database using optimized function
       const result = await performanceMonitor.trackOperation('fetch_listings', async () => {
         const { data, error } = await supabase.rpc('get_listings_optimized_v2', {
           user_lat: latitude,
           user_lng: longitude,
           page_num: page,
           page_size: pageSize,
           max_distance_km: currentFilters.maxDistance || 50,
           category_filter: currentFilters.category || null,
         });

        if (error) throw error;
        return data || [];
      });

      // Cache the results
      await enhancedCache.set(cacheKey, result, 300000); // 5 minutes

      setState(prev => ({
        ...prev,
        listings: reset ? result : [...prev.listings, ...result],
        loading: false,
        hasMore: result.length === pageSize,
        totalCount: reset ? result.length : prev.totalCount + result.length,
        page: page + 1,
      }));

      setFilters(currentFilters);
    } catch (error) {
      console.error('Load listings error:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load listings',
      }));
    }
  }, [latitude, longitude, user, state.page, filters, getCacheKey]);

  // Load more listings
  const loadMore = useCallback(async () => {
    if (state.loading || !state.hasMore) return;
    await loadListings(filters, false);
  }, [state.loading, state.hasMore, loadListings, filters]);

  // Refresh listings
  const refresh = useCallback(async () => {
    await loadListings(filters, true);
  }, [loadListings, filters]);

  // Clear error
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // Get cached listings
  const getCachedListings = useCallback(async (): Promise<OptimizedListing[]> => {
    const cacheKey = getCacheKey(1, filters);
    return await enhancedCache.get<OptimizedListing[]>(cacheKey) || [];
  }, [getCacheKey, filters]);

  // Memoized sorted listings
  const sortedListings = useMemo(() => {
    return [...state.listings].sort((a, b) => {
      // Sort by distance first, then by creation date
      if (Math.abs(a.distance_km - b.distance_km) < 0.1) {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      return a.distance_km - b.distance_km;
    });
  }, [state.listings]);

  // Load initial listings
  useEffect(() => {
    if (latitude && longitude) {
      loadListings({}, true);
    }
  }, [latitude, longitude]);

  // Preload next page
  useEffect(() => {
    if (state.hasMore && !state.loading) {
      const preloadNextPage = async () => {
        const nextPage = state.page;
        const cacheKey = getCacheKey(nextPage, filters);
        const cached = await enhancedCache.get<OptimizedListing[]>(cacheKey);
        
        if (!cached) {
          // Preload in background
          setTimeout(async () => {
            try {
                           const { data } = await supabase.rpc('get_listings_optimized_v2', {
               user_lat: latitude!,
               user_lng: longitude!,
               page_num: nextPage,
               page_size: pageSize,
               max_distance_km: filters.maxDistance || 50,
               category_filter: filters.category || null,
             });
              
              if (data) {
                await enhancedCache.set(cacheKey, data, 300000);
              }
            } catch (error) {
              console.error('Preload error:', error);
            }
          }, 1000);
        }
      };
      
      preloadNextPage();
    }
  }, [state.hasMore, state.loading, state.page, filters, latitude, longitude, getCacheKey]);

  return {
    ...state,
    listings: sortedListings,
    loadListings,
    loadMore,
    refresh,
    clearError,
    getCachedListings,
  };
};

// Hook for filtered listings
export const useFilteredListings = (filters: ListingsFilters) => {
  const { listings, loading, error, hasMore, loadMore, refresh } = useOptimizedListings();
  
  const filteredListings = useMemo(() => {
    return listings.filter(listing => {
      if (filters.category && listing.category !== filters.category) return false;
      if (filters.minPrice && listing.price < filters.minPrice) return false;
      if (filters.maxPrice && listing.price > filters.maxPrice) return false;
      if (filters.priceUnit && listing.price_unit !== filters.priceUnit) return false;
      return true;
    });
  }, [listings, filters]);

  return {
    listings: filteredListings,
    loading,
    error,
    hasMore,
    loadMore,
    refresh,
  };
};

// Hook for category-specific listings
export const useCategoryListings = (category: string) => {
  return useFilteredListings({ category });
};

// Hook for nearby listings
export const useNearbyListings = (maxDistance = 10) => {
  return useFilteredListings({ maxDistance });
}; 