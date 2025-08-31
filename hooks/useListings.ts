/* global console */
import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/utils/supabaseClient';
import { useLocation } from './useLocation';
import { imageCache } from '@/utils/imageCache';

// Optimized page size for better performance
const PAGE_SIZE = 10; // Reduced from 20 for faster loading and better UX

import { Listing } from '@/utils/types';

// Utility function to deduplicate listings by ID
const deduplicateListings = (listings: Listing[]): Listing[] => {
  return listings.filter((listing, index, arr) => 
    arr.findIndex(l => l.id === listing.id) === index
  );
};

export function useListings() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [sortByDistance, setSortByDistance] = useState(false); // Default to no distance sorting until location is available
  const [maxDistance, setMaxDistance] = useState<number | null>(null); // Distance filter in km
  
  // Cache for API responses to prevent duplicate calls - no expiration
  const cacheRef = useRef<Map<string, any[]>>(new Map());
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
    const cacheKey = getCacheKey(pageNumber, userLat, userLon);
    
    // Check cache first - no automatic expiration, only manual refresh
    const cached = cacheRef.current.get(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      
      // Use database function for geospatial queries if location is available (always include distance when possible)
      if (userLat && userLon) {

        
        // Calculate the total limit needed for pagination
        const totalLimit = pageNumber * PAGE_SIZE;
        
        const { data, error } = await supabase
          .rpc('get_listings_with_distance', {
            user_lat: userLat,
            user_lng: userLon,
            max_distance_km: maxDistance === null ? 1000 : maxDistance, // Use 1000km for "Any distance"
            category_filter: null, // No category filter for now
            limit_count: totalLimit // Get enough data for all pages up to current page
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
          
          // Cache images for each listing
          result.forEach((listing: Listing) => {
            if (listing.id) {
              try {
                imageCache.setListingImages(listing.id, listing);
              } catch (error) {
                // Silent fail - cache errors shouldn't break the app
              }
            }
          });
          
          // Cache the result
          cacheRef.current.set(cacheKey, result);
          return result;
        }

        const allData = data || [];
        
        // Slice the data for the current page
        const startIndex = (pageNumber - 1) * PAGE_SIZE;
        const result = allData.slice(startIndex, startIndex + PAGE_SIZE);
        
        // Got listings for page
        if (result.length > 0) {
          // Sample listing IDs processed
          
          // Cache images for each listing to avoid database calls in detail view
          result.forEach((listing: Listing) => {
            if (listing.id) {
              try {
                imageCache.setListingImages(listing.id, listing);
              } catch (error) {
                // Silent fail - cache errors shouldn't break the app
              }
            }
          });
        }

        // Cache the result
        cacheRef.current.set(cacheKey, result);
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
        
        // Cache images for each listing
        result.forEach((listing: Listing) => {
          if (listing.id) {
            imageCache.setListingImages(listing.id, listing);
          }
        });
        
        // Cache the result
        cacheRef.current.set(cacheKey, result);
        return result;
      }
    } catch (err) {
      console.error('Unexpected error fetching listings:', err);
      return [];
    }
  }, [sortByDistance, maxDistance, getCacheKey]);

  // Initial load of listings - only when location is stable
  useEffect(() => {
    
    // Skip if location is still loading
    if (location.loading) {
      return;
    }
    
    // SIMPLE CHECK: If we already have listings, don't fetch again
    if (listings.length > 0) {
      return;
    }
    
    const cacheKey = getCacheKey(1, location.latitude || undefined, location.longitude || undefined);
    
    // Check if we already have data for this location/page combination
    const hasCachedData = cacheRef.current.has(cacheKey);
    
    // Prevent duplicate fetches
    if (lastFetchRef.current === cacheKey) {
      return;
    }
    
    lastFetchRef.current = cacheKey;

    async function loadInitialListings() {
      const initialListings = await fetchListings(
        1, 
        location.latitude || undefined, 
        location.longitude || undefined
      );
      
      // Ensure no duplicate IDs in initial listings (shouldn't happen, but safety check)
      const uniqueInitialListings = deduplicateListings(initialListings);
      
      setListings(uniqueInitialListings);
      setHasMore(uniqueInitialListings.length === PAGE_SIZE);
      setLoading(false);
      hasInitialDataRef.current = true;
      isReturningFromNavigationRef.current = false;
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
      // Deduplicate listings by ID to prevent React key warnings
      setListings(prev => {
        const existingIds = new Set(prev.map(listing => listing.id));
        const uniqueNewListings = moreListings.filter((listing: Listing) => !existingIds.has(listing.id));
        
        if (uniqueNewListings.length === 0) {
          setHasMore(false);
          return prev;
        }
        
                  // Cache images for new listings
          uniqueNewListings.forEach((listing: Listing) => {
            if (listing.id) {
              try {
                imageCache.setListingImages(listing.id, listing);
              } catch (error) {
                // Silent fail - cache errors shouldn't break the app
              }
            }
          });
        
        return [...prev, ...uniqueNewListings];
      });
      setPage(nextPage);
      setHasMore(moreListings.length === PAGE_SIZE);
    } else {
      setHasMore(false);
    }
  }, [loading, hasMore, page, fetchListings, location.latitude, location.longitude]);

  // Refresh listings (pull to refresh) - clear cache
  const refreshListings = useCallback(async () => {
    try {
      // Clear ALL cache to ensure fresh data
      cacheRef.current.clear();
      
      setPage(1);
      setLoading(true);
      
      const freshListings = await fetchListings(
        1, 
        location.latitude || undefined, 
        location.longitude || undefined
      );
      
      // Ensure no duplicate IDs in refreshed listings
      const uniqueFreshListings = deduplicateListings(freshListings);
      
      // Cache images for refreshed listings
      uniqueFreshListings.forEach((listing: Listing) => {
        if (listing.id) {
          try {
            imageCache.setListingImages(listing.id, listing);
          } catch (error) {
            // Silent fail - cache errors shouldn't break the app
          }
        }
      });
      
      setListings(uniqueFreshListings);
      setHasMore(uniqueFreshListings.length === PAGE_SIZE);
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
      cacheRef.current.clear();
    }
  }, [listings.length]);

  // Set distance filter
  const setDistanceFilter = useCallback((distance: number | null) => {
    setMaxDistance(distance);
    setPage(1); // Reset to first page when filter changes
    // Only clear cache if we actually have listings to avoid unnecessary fetches
    if (listings.length > 0) {
      cacheRef.current.clear();
    }
  }, [listings.length]);

  // Mark that we're returning from navigation to prevent unnecessary refreshes
  const markReturningFromNavigation = useCallback(() => {
    // Navigation return logic handled silently
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