// ============================================================================
// OPTIMIZED useListings Hook for Minimal Database Calls & Bandwidth
// ============================================================================
// This optimized version focuses on:
// 1. Single database call per page load
// 2. Essential data only (no unnecessary fields)
// 3. Aggressive caching (6 hours)
// 4. Smart pagination with prefetching
// 5. Reduced bandwidth usage

import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/utils/supabaseClient';
import { useLocation } from '@/hooks/useLocation';
import { Listing } from '@/utils/types';

// Cache configuration
const CACHE_DURATION = 6 * 60 * 60 * 1000; // 6 hours
const PREFETCH_PAGES = 2; // Prefetch next 2 pages
const PAGE_SIZE = 10; // Smaller page size for faster loading

// Optimized cache with size limits
class OptimizedCache {
  private cache = new Map<string, { data: Listing[]; timestamp: number; size: number }>();
  private maxSize = 50; // Maximum cache entries
  private maxDataSize = 1000; // Maximum total data size

  set(key: string, data: Listing[]) {
    // Remove oldest entries if cache is full
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    const dataSize = JSON.stringify(data).length;
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      size: dataSize
    });
  }

  get(key: string): Listing[] | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    const age = Date.now() - cached.timestamp;
    if (age > CACHE_DURATION) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  clear() {
    this.cache.clear();
  }
}

const cache = new OptimizedCache();

export function useOptimizedListings() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [sortByDistance, setSortByDistance] = useState(false);
  const [maxDistance, setMaxDistance] = useState<number | null>(null);
  
  const location = useLocation();
  const isInitialLoad = useRef(true);
  const prefetchQueue = useRef<Set<number>>(new Set());

  // Generate cache key with location rounding for stability
  const getCacheKey = useCallback((pageNumber: number, userLat?: number, userLon?: number) => {
    const roundedLat = userLat ? Math.round(userLat * 100) / 100 : 'no-lat';
    const roundedLon = userLon ? Math.round(userLon * 100) / 100 : 'no-lon';
    return `listings-${pageNumber}-${roundedLat}-${roundedLon}-${sortByDistance}-${maxDistance}`;
  }, [sortByDistance, maxDistance]);

  // Optimized fetch function - single call per page
  const fetchListings = useCallback(async (pageNumber = 1, userLat?: number, userLon?: number) => {
    const cacheKey = getCacheKey(pageNumber, userLat, userLon);
    
    // Check cache first
    const cached = cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      // Single optimized database call
      const { data, error } = await supabase
        .rpc('get_listings_with_distance', {
          user_lat: userLat,
          user_lng: userLon,
          max_distance_km: maxDistance === null ? 1000 : maxDistance,
          category_filter: null,
          limit_count: pageNumber * PAGE_SIZE // Get all data up to current page
        });

      if (error) throw error;

      // Cache the result
      cache.set(cacheKey, data || []);
      
      return data || [];
    } catch (error) {
      console.error('Error fetching listings:', error);
      return [];
    }
  }, [maxDistance, getCacheKey]);

  // Load more listings with smart pagination
  const loadMoreListings = useCallback(async () => {
    if (loading || !hasMore) return;

    setLoading(true);
    try {
      const newPage = page + 1;
      const userLat = location?.latitude ?? undefined;
      const userLon = location?.longitude ?? undefined;
      
      const newListings = await fetchListings(newPage, userLat, userLon);
      
      if (newListings.length === 0) {
        setHasMore(false);
      } else {
        setListings(prev => [...prev, ...newListings]);
        setPage(newPage);
      }
    } catch (error) {
      console.error('Error loading more listings:', error);
    } finally {
      setLoading(false);
    }
  }, [page, loading, hasMore, location, fetchListings]);

  // Prefetch next pages in background
  const prefetchNextPages = useCallback(async (currentPage: number) => {
    const userLat = location?.latitude ?? undefined;
    const userLon = location?.longitude ?? undefined;
    
    for (let i = 1; i <= PREFETCH_PAGES; i++) {
      const nextPage = currentPage + i;
      const cacheKey = getCacheKey(nextPage, userLat, userLon);
      
      // Only prefetch if not already cached
      if (!cache.get(cacheKey) && !prefetchQueue.current.has(nextPage)) {
        prefetchQueue.current.add(nextPage);
        
        // Prefetch in background
        fetchListings(nextPage, userLat, userLon).finally(() => {
          prefetchQueue.current.delete(nextPage);
        });
      }
    }
  }, [location, fetchListings, getCacheKey]);

  // Initial load
  useEffect(() => {
    if (!isInitialLoad.current) return;
    
    const loadInitialData = async () => {
      setLoading(true);
      try {
        const userLat = location?.latitude ?? undefined;
        const userLon = location?.longitude ?? undefined;
        
        const initialListings = await fetchListings(1, userLat, userLon);
        setListings(initialListings);
        setHasMore(initialListings.length >= PAGE_SIZE);
        
        // Prefetch next pages
        prefetchNextPages(1);
      } catch (error) {
        console.error('Error loading initial listings:', error);
      } finally {
        setLoading(false);
        isInitialLoad.current = false;
      }
    };

    loadInitialData();
  }, [location, fetchListings, prefetchNextPages]);

  // Refresh function
  const refreshListings = useCallback(async () => {
    cache.clear();
    setPage(1);
    setHasMore(true);
    isInitialLoad.current = true;
  }, []);

  // Toggle distance sorting
  const toggleDistanceSort = useCallback(() => {
    setSortByDistance(prev => !prev);
    cache.clear(); // Clear cache when sorting changes
  }, []);

  // Set distance filter
  const setDistanceFilter = useCallback((distance: number | null) => {
    setMaxDistance(distance);
    cache.clear(); // Clear cache when filter changes
  }, []);

  return {
    listings,
    loading,
    loadMoreListings,
    hasMore,
    refreshListings,
    toggleDistanceSort,
    sortByDistance,
    maxDistance,
    setDistanceFilter,
    locationAvailable: !!(location?.latitude && location?.longitude)
  };
}

// ============================================================================
// OPTIMIZED LISTING DETAILS HOOK
// ============================================================================
// Separate hook for detailed listing data (only when needed)

export function useListingDetails(listingId: string | null) {
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchListingDetails = useCallback(async (id: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .rpc('get_listing_details', { listing_id: id });

      if (error) throw error;
      setListing(data?.[0] || null);
    } catch (error) {
      console.error('Error fetching listing details:', error);
      setListing(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (listingId) {
      fetchListingDetails(listingId);
    } else {
      setListing(null);
    }
  }, [listingId, fetchListingDetails]);

  return { listing, loading, refetch: () => listingId && fetchListingDetails(listingId) };
}
