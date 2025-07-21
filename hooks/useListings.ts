/* global console */
import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/utils/supabaseClient';
import { useLocation } from './useLocation';

// Default page size for pagination
const PAGE_SIZE = 20;

export function useListings() {
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [sortByDistance, setSortByDistance] = useState(false); // Default to no distance sorting until location is available
  const [maxDistance, setMaxDistance] = useState<number | null>(null); // Distance filter in km
  
  // Cache for API responses to prevent duplicate calls
  const cacheRef = useRef<Map<string, { data: any[], timestamp: number }>>(new Map());
  const lastFetchRef = useRef<string>('');
  
  // Get user location for distance sorting
  const location = useLocation();

  // Create cache key for current state
  const getCacheKey = useCallback((pageNumber: number, userLat?: number, userLon?: number) => {
    return `${pageNumber}-${userLat}-${userLon}-${sortByDistance}-${maxDistance}`;
  }, [sortByDistance, maxDistance]);

  // Fetch listings from Supabase with geospatial queries
  const fetchListings = useCallback(async (pageNumber = 1, userLat?: number, userLon?: number) => {
    const cacheKey = getCacheKey(pageNumber, userLat, userLon);
    
    // Check cache first (cache for 30 seconds)
    const cached = cacheRef.current.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < 30000) {
      console.log(`Using cached listings for page ${pageNumber}`);
      return cached.data;
    }

    try {
      console.log(`Fetching listings page ${pageNumber}, location: ${userLat},${userLon}, distance sort: ${sortByDistance}, max distance: ${maxDistance === null ? '1000km (Any distance)' : maxDistance + 'km'}`);
      
      // Use database function for geospatial queries if location is available and distance sorting is enabled
      if (userLat && userLon && sortByDistance) {
        console.log('Using geospatial query with RPC function...');
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
        // Cache the result
        cacheRef.current.set(cacheKey, { data: result, timestamp: Date.now() });
        return result;
      } else {
        // Use direct query if no location or distance sorting disabled
        console.log('Using direct query (no location or distance sorting disabled)...');
        console.log('Reason:', { 
          hasLocation: !!(userLat && userLon), 
          sortByDistance, 
          userLat, 
          userLon 
        });
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
        console.log(`Direct query returned ${result.length} listings`);
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
    console.log('Location state:', { 
      loading: location.loading, 
      latitude: location.latitude, 
      longitude: location.longitude,
      error: location.error 
    });
    
    // Skip if location is still loading
    if (location.loading) return;
    
    const cacheKey = getCacheKey(1, location.latitude || undefined, location.longitude || undefined);
    
    // Prevent duplicate fetches
    if (lastFetchRef.current === cacheKey) return;
    lastFetchRef.current = cacheKey;

    async function loadInitialListings() {
      console.log('Loading initial listings...');
      const initialListings = await fetchListings(
        1, 
        location.latitude || undefined, 
        location.longitude || undefined
      );
      console.log(`Initial listings loaded: ${initialListings.length} items`);
      setListings(initialListings);
      setHasMore(initialListings.length === PAGE_SIZE);
      setLoading(false);
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
      console.log('Refreshing listings...');
      // Clear ALL cache to ensure fresh data
      cacheRef.current.clear();
      console.log('Cache cleared completely');
      
      setPage(1);
      setLoading(true);
      
      const freshListings = await fetchListings(
        1, 
        location.latitude || undefined, 
        location.longitude || undefined
      );
      
      console.log(`Refresh completed. Got ${freshListings.length} listings`);
      console.log('Sample listing images:', freshListings.slice(0, 2).map((l: any) => ({
        title: l.title,
        hasImages: !!(l.images && l.images.length > 0),
        imageUrl: l.images?.[0]?.substring(0, 80) + '...'
      })));
      
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
  }, [fetchListings, location.latitude, location.longitude, getCacheKey, listings]);

  // Toggle distance-based sorting
  const toggleDistanceSort = useCallback(() => {
    setSortByDistance(prev => !prev);
    // Clear cache when sorting changes
    cacheRef.current.clear();
  }, []);

  // Set distance filter
  const setDistanceFilter = useCallback((distance: number | null) => {
    setMaxDistance(distance);
    setPage(1); // Reset to first page when filter changes
    // Clear cache when filter changes
    cacheRef.current.clear();
  }, []);

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
    updateLocation: location.updateLocation
  };
}