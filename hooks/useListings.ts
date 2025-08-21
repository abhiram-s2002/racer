/* global console */
import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/utils/supabaseClient';
import { useLocation } from './useLocation';

// Optimized page size for better performance
const PAGE_SIZE = 10; // Reduced from 20 for faster loading and better UX

import { Listing } from '@/utils/types';

export function useListings() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [sortByDistance, setSortByDistance] = useState(false); // Default to no distance sorting until location is available
  const [maxDistance, setMaxDistance] = useState<number | null>(null); // Distance filter in km
  
  // Cache for API responses to prevent duplicate calls
  const cacheRef = useRef<Map<string, { data: any[], timestamp: number }>>(new Map());
  const lastFetchRef = useRef<string>('');
  const hasInitialDataRef = useRef<boolean>(false);
  const isReturningFromNavigationRef = useRef<boolean>(false);
  
  // Get user location for distance sorting
  const location = useLocation();

  // Create cache key for current state
  const getCacheKey = useCallback((pageNumber: number, userLat?: number, userLon?: number) => {
    // Round coordinates to reduce unnecessary cache invalidation from minor GPS fluctuations
    // Use more aggressive rounding to prevent cache invalidation from tiny GPS changes
    const roundedLat = userLat ? Math.round(userLat * 100) / 100 : 'no-lat';
    const roundedLon = userLon ? Math.round(userLon * 100) / 100 : 'no-lon';
    return `${pageNumber}-${roundedLat}-${roundedLon}-${sortByDistance}-${maxDistance}`;
  }, [sortByDistance, maxDistance]);

  // Fetch listings from Supabase with geospatial queries
  const fetchListings = useCallback(async (pageNumber = 1, userLat?: number, userLon?: number) => {
    console.log('📡 fetchListings called:', { pageNumber, userLat, userLon });
    const cacheKey = getCacheKey(pageNumber, userLat, userLon);
    
    // Check cache first (cache for 30 seconds)
    const cached = cacheRef.current.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < 30000) {
      console.log('💾 Returning cached data for page', pageNumber);
      return cached.data;
    }
    
    console.log('🔄 Cache miss or expired, fetching from API for page', pageNumber);

    try {
      
      // Use database function for geospatial queries if location is available (always include distance when possible)
      if (userLat && userLon) {

        
        const { data, error } = await supabase
          .rpc('get_listings_with_distance', {
            user_lat: userLat,
            user_lng: userLon,
            page_num: pageNumber,
            page_size: PAGE_SIZE,
            max_distance_km: maxDistance === null ? 1000 : maxDistance // Use 1000km for "Any distance"
          });

        if (error) {
          console.error('Error fetching listings with distance:', error);
          // Fallback to direct query on error
          const { data: fallbackData, error: fallbackError } = await supabase
            .from('listings')
            .select('*')
            .eq('is_active', true)
            .order('created_at', { ascending: false })
            .range((pageNumber - 1) * PAGE_SIZE, pageNumber * PAGE_SIZE - 1);
          
          if (fallbackError) {
            console.error('Fallback error:', fallbackError);
            return [];
          }
          
          const result = fallbackData || [];
          // Cache the result
          cacheRef.current.set(cacheKey, { data: result, timestamp: Date.now() });
          return result;
        }

        const result = data || [];
        
        // Got listings for page
        if (result.length > 0) {
                      // Sample listing IDs processed
        }

        // Cache the result
        cacheRef.current.set(cacheKey, { data: result, timestamp: Date.now() });
        return result;
      } else {
        // Use direct query if no location or distance sorting disabled

        const { data, error } = await supabase
          .from('listings')
          .select('*')
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .range((pageNumber - 1) * PAGE_SIZE, pageNumber * PAGE_SIZE - 1);

        if (error) {
          console.error('Error fetching listings:', error);
          return [];
        }

        const result = data || [];

        // Cache the result
        cacheRef.current.set(cacheKey, { data: result, timestamp: Date.now() });
        return result;
      }
    } catch (err) {
      console.error('Unexpected error fetching listings:', err);
      return [];
    }
  }, [sortByDistance, maxDistance, getCacheKey]);

  // Initial load of listings - only when location is stable
  useEffect(() => {
    console.log('🔍 useListings useEffect triggered:', {
      locationLoading: location.loading,
      hasInitialData: hasInitialDataRef.current,
      isReturningFromNavigation: isReturningFromNavigationRef.current,
      listingsCount: listings.length,
      cacheSize: cacheRef.current.size
    });
    
    // Skip if location is still loading
    if (location.loading) {
      console.log('⏳ Skipping - location still loading');
      return;
    }
    
    // SIMPLE CHECK: If we already have listings, don't fetch again
    if (listings.length > 0) {
      console.log('🚫 Skipping - already have listings:', listings.length);
      return;
    }
    
    const cacheKey = getCacheKey(1, location.latitude || undefined, location.longitude || undefined);
    console.log('🔑 Cache key:', cacheKey);
    
    // Check if we already have data for this location/page combination
    const hasCachedData = cacheRef.current.has(cacheKey);
    console.log('💾 Has cached data:', hasCachedData);
    
    // Prevent duplicate fetches
    if (lastFetchRef.current === cacheKey) {
      console.log('🚫 Skipping - duplicate fetch detected');
      return;
    }
    
    console.log('✅ Proceeding with fetch - all checks passed');
    lastFetchRef.current = cacheKey;

    async function loadInitialListings() {
      console.log('📡 Fetching initial listings...');
      const initialListings = await fetchListings(
        1, 
        location.latitude || undefined, 
        location.longitude || undefined
      );
      console.log('📥 Received listings:', initialListings.length);
      setListings(initialListings);
      setHasMore(initialListings.length === PAGE_SIZE);
      setLoading(false);
      hasInitialDataRef.current = true;
      isReturningFromNavigationRef.current = false;
      console.log('✅ Initial listings loaded and state updated');
    }

    loadInitialListings();
  }, [location.latitude, location.longitude, location.loading, fetchListings, getCacheKey]);

  // Load more listings when scrolling
  const loadMoreListings = useCallback(async () => {
    if (loading || !hasMore) return;
    
    const nextPage = page + 1;
    const moreListings = await fetchListings(
      nextPage, 
      location.latitude || undefined, 
      location.longitude || undefined
    );
    
    if (moreListings.length > 0) {
      setListings(prev => [...prev, ...moreListings]);
      setPage(nextPage);
      setHasMore(moreListings.length === PAGE_SIZE);
    } else {
      setHasMore(false);
    }
  }, [loading, hasMore, page, fetchListings, location.latitude, location.longitude]);

  // Refresh listings (pull to refresh) - clear cache
  const refreshListings = useCallback(async () => {
    try {
      console.log('🔄 Clearing cache for refresh');
      // Clear ALL cache to ensure fresh data
      cacheRef.current.clear();
      
      setPage(1);
      setLoading(true);
      
      const freshListings = await fetchListings(
        1, 
        location.latitude || undefined, 
        location.longitude || undefined
      );
      
      setListings(freshListings);
      setHasMore(freshListings.length === PAGE_SIZE);
      return freshListings;
    } catch (error) {
      console.error('Error during refresh:', error);
      // Don't clear existing listings on refresh error
      return listings;
    } finally {
      setLoading(false);
    }
  }, [fetchListings, location.latitude, location.longitude, getCacheKey]);

  // Toggle distance-based sorting
  const toggleDistanceSort = useCallback(() => {
    setSortByDistance(prev => !prev);
    // Only clear cache if we actually have listings to avoid unnecessary fetches
    if (listings.length > 0) {
      console.log('🔄 Clearing cache for distance sort toggle');
      cacheRef.current.clear();
    }
  }, [listings.length]);

  // Set distance filter
  const setDistanceFilter = useCallback((distance: number | null) => {
    setMaxDistance(distance);
    setPage(1); // Reset to first page when filter changes
    // Only clear cache if we actually have listings to avoid unnecessary fetches
    if (listings.length > 0) {
      console.log('🔄 Clearing cache for distance filter change');
      cacheRef.current.clear();
    }
  }, [listings.length]);

  // Mark that we're returning from navigation to prevent unnecessary refreshes
  const markReturningFromNavigation = useCallback(() => {
    console.log('🏠 markReturningFromNavigation called');
    console.log('💾 Current cache size:', cacheRef.current.size);
    console.log('📊 Current listings count:', listings.length);
  }, [listings.length]);

  return {
    listings,
    loading,
    loadMoreListings,
    hasMore,
    refreshListings,
    sortByDistance,
    toggleDistanceSort,
    maxDistance,
    setDistanceFilter,
    locationAvailable: !!(location.latitude && location.longitude),
    locationLoading: location.loading,
    locationError: location.error,
    updateLocation: location.updateLocation,
    markReturningFromNavigation
  };
}