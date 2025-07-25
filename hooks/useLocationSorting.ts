import { useState, useEffect, useCallback } from 'react';
import { LocationUtils, LocationData, SortOption, ListingWithLocation } from '@/utils/locationUtils';
import { getListings, Listing as SupabaseListing } from '@/utils/listingSupabase';

export interface LocationSortingState {
  userLocation: LocationData | null;
  sortOption: SortOption;
  distanceFilter: number | null; // in km
  isLoading: boolean;
  error: string | null;
  permissionStatus: 'granted' | 'denied' | 'undetermined';
}

export interface LocationSortingActions {
  setSortOption: () => void;
  setDistanceFilter: () => void;
  refreshLocation: () => Promise<void>;
  requestLocationPermission: () => Promise<void>;
  clearLocationCache: () => Promise<void>;
}

export function useLocationSorting() {
  const [state, setState] = useState<LocationSortingState>({
    userLocation: null,
    sortOption: 'relevance',
    distanceFilter: null,
    isLoading: false,
    error: null,
    permissionStatus: 'undetermined',
  });

  // Load cached location and permission status on mount
  useEffect(() => {
    loadInitialState();
  }, []);

  const loadInitialState = async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true }));
      
      // Load cached location
      const cachedLocation = await LocationUtils.getCachedLocation();
      const permissionStatus = await LocationUtils.getPermissionStatus();
      
      setState(prev => ({
        ...prev,
        userLocation: cachedLocation,
        permissionStatus,
        isLoading: false,
      }));
    } catch {
      setState(prev => ({
        ...prev,
        error: 'Failed to load location data',
        isLoading: false,
      }));
    }
  };

  const refreshLocation = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      const location = await LocationUtils.getCurrentLocation();
      
      setState(prev => ({
        ...prev,
        userLocation: location,
        permissionStatus: location ? 'granted' : 'denied',
        isLoading: false,
      }));
    } catch {
      setState(prev => ({
        ...prev,
        error: 'Failed to get current location',
        isLoading: false,
      }));
    }
  }, []);

  const requestLocationPermission = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      const location = await LocationUtils.getCurrentLocation();
      
      setState(prev => ({
        ...prev,
        userLocation: location,
        permissionStatus: location ? 'granted' : 'denied',
        isLoading: false,
      }));
    } catch {
      setState(prev => ({
        ...prev,
        error: 'Location permission denied',
        permissionStatus: 'denied',
        isLoading: false,
      }));
    }
  }, []);

  const setSortOption = useCallback((option: SortOption) => {
    setState(prev => ({ ...prev, sortOption: option }));
  }, []);

  const setDistanceFilter = useCallback((distance: number | null) => {
    setState(prev => ({ ...prev, distanceFilter: distance }));
  }, []);

  const clearLocationCache = useCallback(async () => {
    try {
      await LocationUtils.clearLocationCache();
      setState(prev => ({ ...prev, userLocation: null }));
    } catch {
      // no-op
    }
  }, []);

  return {
    state,
    actions: {
      setSortOption,
      setDistanceFilter,
      refreshLocation,
      requestLocationPermission,
      clearLocationCache,
    },
  };
}

// Hook for getting sorted listings with location
export function useLocationSortedListings(
  sortOption: SortOption,
  userLocation: LocationData | null,
  distanceFilter: number | null = null
) {
  const [listings, setListings] = useState<ListingWithLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSortedListings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all listings from Supabase
      const supabaseListings: SupabaseListing[] = await getListings();

      // Map Supabase listings to ListingWithLocation (add distance/location fields)
      let mappedListings: ListingWithLocation[] = supabaseListings.map(listing => {
        // Provide a default LocationData if not present
        const defaultLocation = { coordinates: { latitude: 0, longitude: 0 }, address: '', city: '', state: '', country: '', timestamp: Date.now() };
        return {
          ...listing,
          id: listing.id ?? '',
          isActive: listing.is_active,
          sellerId: listing.username,
          createdAt: listing.created_at ? new Date(listing.created_at) : new Date(),
          location: defaultLocation,
          distance: undefined,
        };
      });

      // Filter by distance if needed
      if (distanceFilter && userLocation) {
        mappedListings = mappedListings.filter(l => typeof l.distance === 'number' && l.distance !== null && l.distance <= distanceFilter);
      }

      // Apply sorting
      if (userLocation) {
        mappedListings = LocationUtils.sortListings(mappedListings, sortOption, userLocation);
      } else {
        // Fallback sorting without location
        switch (sortOption) {
          case 'price_asc':
            mappedListings.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
            break;
          case 'price_desc':
            mappedListings.sort((a, b) => parseFloat(b.price) - parseFloat(a.price));
            break;
          case 'date_newest':
            mappedListings.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
            break;
          case 'date_oldest':
            mappedListings.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
            break;
          default:
            mappedListings.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        }
      }

      setListings(mappedListings);
    } catch {
      setError('Failed to load listings');
    } finally {
      setLoading(false);
    }
  }, [sortOption, userLocation, distanceFilter]);

  useEffect(() => {
    loadSortedListings();
  }, [loadSortedListings]);

  return {
    listings,
    loading,
    error,
  };
}

// Hook for location-based search
export function useLocationSearch() {
  const [searchResults, setSearchResults] = useState<ListingWithLocation[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const searchListings = useCallback(async (
    query: string
  ) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    try {
      setSearchLoading(true);
      setSearchError(null);
      setSearchResults([]); // Return empty for now
    } catch {
      setSearchError('Search failed');
    } finally {
      setSearchLoading(false);
    }
  }, []);

  return {
    searchResults,
    searchLoading,
    searchError,
    searchListings,
  };
}

// Hook for category-based location sorting
export function useCategoryLocationSorting(
  category: string,
  sortOption: SortOption,
  userLocation: LocationData | null
) {
  const [categoryListings, setCategoryListings] = useState<ListingWithLocation[]>([]);
  const [categoryLoading, setCategoryLoading] = useState(true);
  const [categoryError, setCategoryError] = useState<string | null>(null);

  const loadCategoryListings = useCallback(async () => {
    try {
      setCategoryLoading(true);
      setCategoryError(null);

      // This hook is not directly tied to ListingStorage anymore,
      // so it will need to fetch listings from Supabase or another source
      // that supports category filtering. For now, it's a placeholder.
      setCategoryListings([]); // Return empty for now

    } catch {
      setCategoryError('Failed to load category listings');
    } finally {
      setCategoryLoading(false);
    }
  }, [category, sortOption, userLocation]);

  useEffect(() => {
    loadCategoryListings();
  }, [loadCategoryListings]);

  return {
    categoryListings,
    categoryLoading,
    categoryError,
    refreshCategory: loadCategoryListings,
  };
} 