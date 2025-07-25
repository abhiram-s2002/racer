import { useCachedPagination } from '@/utils/stateCache';
import { useLocation } from './useLocation';
import { supabase } from '@/utils/supabaseClient';
import { useState, useCallback } from 'react';
import { Listing } from '@/utils/types';

// Optimized page size for better performance
const PAGE_SIZE = 10; // Reduced from 20 for faster loading and better UX

export function useCachedListings() {
  const location = useLocation();
  const [sortByDistance, setSortByDistance] = useState(false);
  const [maxDistance, setMaxDistance] = useState<number | null>(null);

  // Fetch function for the pagination hook
  const fetchListings = useCallback(async (page: number) => {
    if (location.latitude && location.longitude && sortByDistance) {
      const { data, error } = await supabase.rpc('get_listings_with_distance', {
        user_lat: location.latitude,
        user_lng: location.longitude,
        page_num: page,
        page_size: PAGE_SIZE,
        max_distance_km: maxDistance === null ? 1000 : maxDistance,
      });

      if (error) {
        console.error('Error fetching listings with distance:', error);
        throw error;
      }

      return data || [];
    } else {
      const { data, error } = await supabase
        .from('listings')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

      if (error) {
        console.error('Error fetching listings:', error);
        throw error;
      }

      return data || [];
    }
  }, [location.latitude, location.longitude, sortByDistance, maxDistance]);

  // Use our cached pagination hook
  const [listings, page, loadMore, refresh, { loading, error }] = useCachedPagination<Listing>(
    fetchListings,
    {
      persistKey: 'listings',
      pageSize: PAGE_SIZE,
      ttl: 300, // 5 minutes cache
    }
  );

  // Toggle distance-based sorting
  const toggleDistanceSort = useCallback(() => {
    setSortByDistance(prev => !prev);
    refresh(); // Refresh listings when sorting changes
  }, [refresh]);

  // Set distance filter
  const setDistanceFilter = useCallback((distance: number | null) => {
    setMaxDistance(distance);
    refresh(); // Refresh listings when filter changes
  }, [refresh]);

  return {
    listings,
    loading,
    error,
    loadMore,
    hasMore: listings.length === PAGE_SIZE,
    refresh,
    sortByDistance,
    toggleDistanceSort,
    maxDistance,
    setDistanceFilter,
    locationAvailable: !!(location.latitude && location.longitude),
    locationLoading: location.loading,
    locationError: location.error,
    updateLocation: location.updateLocation,
  };
} 