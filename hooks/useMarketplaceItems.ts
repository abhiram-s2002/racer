import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/utils/supabaseClient';
import { useLocation } from './useLocation';
import { MarketplaceItem, ItemType, Category } from '@/utils/types';
import { imageCache } from '@/utils/imageCache';

// Smart pagination for better UX and performance
const INITIAL_PAGE_SIZE = 12;
const SUBSEQUENT_PAGE_SIZE = 6;

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

// Utility function to deduplicate items by ID
const deduplicateItems = (items: MarketplaceItem[]): MarketplaceItem[] => {
  return items.filter((item, index, arr) => 
    arr.findIndex(i => i.id === item.id) === index
  );
};

export function useMarketplaceItems() {
  const [items, setItems] = useState<MarketplaceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [sortByDistance, setSortByDistance] = useState(false);
  const [maxDistance, setMaxDistance] = useState<number | null>(null);
  const [itemType, setItemType] = useState<ItemType | 'all'>('all');
  const [selectedCategory, setSelectedCategory] = useState<Category | 'all'>('all');
  const [verifiedOnly, setVerifiedOnly] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Cache for API responses to prevent duplicate calls
  const cacheRef = useRef<Map<string, { data: any[]; timestamp: number }>>(new Map());
  const lastFetchRef = useRef<string>('');
  const hasInitialDataRef = useRef<boolean>(false);
  
  // Get user location for distance sorting
  const location = useLocation();

  // Create cache key for current state
  const getCacheKey = useCallback((pageNumber: number, userLat?: number, userLon?: number) => {
    const roundedLat = userLat ? Math.round(userLat * 100) / 100 : 'no-lat';
    const roundedLon = userLon ? Math.round(userLon * 100) / 100 : 'no-lon';
    const sq = searchQuery ? searchQuery.trim().toLowerCase() : 'no-search';
    return `${pageNumber}-${roundedLat}-${roundedLon}-${sortByDistance}-${maxDistance}-${itemType}-${selectedCategory}-${verifiedOnly}-${sq}`;
  }, [sortByDistance, maxDistance, itemType, selectedCategory, verifiedOnly, searchQuery]);

  // Fetch items from Supabase (both listings and requests)
  const fetchItems = useCallback(async (pageNumber = 1, userLat?: number, userLon?: number) => {
    const cacheKey = getCacheKey(pageNumber, userLat, userLon);
    
    // Check cache first
    const cached = cacheRef.current.get(cacheKey);
    if (cached) {
      const cacheAge = Date.now() - (cached.timestamp || 0);
      if (cacheAge < 3 * 60 * 60 * 1000) { // 3 hours
        return cached.data;
      }
    }

    try {
      const pageSize = getPageSize(pageNumber);
      const offsetCount = pageNumber === 1 ? 0 : (INITIAL_PAGE_SIZE + (pageNumber - 2) * SUBSEQUENT_PAGE_SIZE);
      let allItems: MarketplaceItem[] = [];

      // Use unified function to fetch both listings and requests
      if (userLat && userLon) {
        const isKeysetMode = !sortByDistance; // keyset only when sorting by date
        const lastItem = (pageNumber > 1 && isKeysetMode && items.length > 0)
          ? items[items.length - 1]
          : undefined;
        const { data: itemsData, error: itemsError } = await supabase
          .rpc('get_marketplace_items_with_distance', {
            user_lat: userLat,
            user_lng: userLon,
            max_distance_km: maxDistance === null ? 75 : maxDistance,
            item_type_filter: itemType === 'all' ? null : itemType,
            category_filter: selectedCategory === 'all' ? null : selectedCategory,
            verified_only: verifiedOnly,
            min_price: null,
            max_price: null,
            search_query: searchQuery ? searchQuery : null,
            sort_by: sortByDistance ? 'distance' : 'date',
            sort_order: sortByDistance ? 'asc' : 'desc',
            limit_count: pageSize,
            offset_count: isKeysetMode ? 0 : offsetCount,
            last_created_at: isKeysetMode ? (lastItem?.created_at ?? null) : null,
            last_id: isKeysetMode ? (lastItem?.id ?? null) : null,
          });

        if (!itemsError && itemsData) {
          const unifiedItems = itemsData.map((item: any) => ({
            ...item,
            username: item.item_type === 'request' ? item.requester_username || item.username : item.username,
            // Map budget fields for requests
            budget_min: item.item_type === 'request' ? item.budget_min : undefined,
            budget_max: item.item_type === 'request' ? item.budget_max : undefined,
            // Add pickup/delivery options
            pickup_available: item.pickup_available || false,
            delivery_available: item.delivery_available || false,
          }));
          allItems = [...allItems, ...unifiedItems];
        }
      } else {
        // Fallback queries without distance calculation
        // Fetch listings if needed
        if (itemType === 'all' || itemType === 'listing') {
          let query = supabase
            .from('listings')
            .select('id,username,title,description,category,price,price_unit,thumbnail_images,preview_images,pickup_available,delivery_available,expires_at,created_at,latitude,longitude')
            .order('created_at', { ascending: false })
            .limit(pageSize);

          // Keyset pagination for deep scrolls
          if (items.length > 0) {
            const last = items[items.length - 1];
            if ((itemType === 'listing' || itemType === 'all') && last) {
              query = query.lt('created_at', last.created_at);
            }
          }

          if (selectedCategory !== 'all') {
            query = query.eq('category', selectedCategory);
          }
          // Basic search fallback (not as powerful as RPC FTS)
          if (searchQuery) {
            query = query.or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`);
          }

          const { data: listingsData, error: listingsError } = await query;
          
          if (!listingsError && listingsData) {
            const listings = listingsData.map((item: any) => ({
              ...item,
              item_type: 'listing' as ItemType,
              username: item.username,
              // Add pickup/delivery options
              pickup_available: item.pickup_available || false,
              delivery_available: item.delivery_available || false,
            }));
            allItems = [...allItems, ...listings];
          }
        }

        // Fetch requests if needed
        if (itemType === 'all' || itemType === 'request') {
          let query = supabase
            .from('requests')
            .select('id,requester_username,username,title,description,category,price,budget_min,budget_max,price_unit,thumbnail_images,preview_images,pickup_available,delivery_available,expires_at,created_at,latitude,longitude')
            .order('created_at', { ascending: false })
            .limit(pageSize);

          // Keyset pagination for deep scrolls
          if (items.length > 0) {
            const last = items[items.length - 1];
            if ((itemType === 'request' || itemType === 'all') && last) {
              query = query.lt('created_at', last.created_at);
            }
          }

          if (selectedCategory !== 'all') {
            query = query.eq('category', selectedCategory);
          }
          if (searchQuery) {
            query = query.or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`);
          }

          const { data: requestsData, error: requestsError } = await query;
          
          if (!requestsError && requestsData) {
            const requests = requestsData.map((item: any) => ({
              ...item,
              item_type: 'request' as ItemType,
              username: item.requester_username || item.username,
              price: item.budget_min || 0,
              // Map budget fields for requests
              budget_min: item.budget_min,
              budget_max: item.budget_max,
              // Add pickup/delivery options
              pickup_available: item.pickup_available || false,
              delivery_available: item.delivery_available || false,
            }));
            allItems = [...allItems, ...requests];
          }
        }
      }

      // When using RPC or range queries, result set is already paginated and sorted
      const result = allItems;

      // Cache images for each item
      result.forEach((item: MarketplaceItem) => {
        if (item.id) {
          try {
            imageCache.setListingImages(item.id, item);
          } catch (error) {
            // Silent fail - cache errors shouldn't break the app
          }
        }
      });

      // Cache the result
      cacheRef.current.set(cacheKey, { data: result, timestamp: Date.now() });
      return result;
    } catch (err) {
      return [];
    }
  }, [sortByDistance, maxDistance, getCacheKey, itemType, selectedCategory]);

  // Initial load of items
  useEffect(() => {
    if (location.loading) {
      return;
    }
    
    if (items.length > 0) {
      return;
    }
    
    const cacheKey = getCacheKey(1, location.latitude || undefined, location.longitude || undefined);
    
    if (lastFetchRef.current === cacheKey) {
      return;
    }
    
    lastFetchRef.current = cacheKey;

    async function loadInitialItems() {
      const initialItems = await fetchItems(
        1, 
        location.latitude || undefined, 
        location.longitude || undefined
      );
      
      const uniqueInitialItems = deduplicateItems(initialItems);
      
      setItems(uniqueInitialItems);
      setHasMore(uniqueInitialItems.length === INITIAL_PAGE_SIZE);
      setLoading(false);
      hasInitialDataRef.current = true;
    }

    loadInitialItems();
  }, [location.latitude, location.longitude, location.loading, fetchItems, getCacheKey]);

  // Load more items when scrolling
  const loadMoreItems = useCallback(async () => {
    if (loading || !hasMore) return;
    
    const nextPage = page + 1;
    const moreItems = await fetchItems(
      nextPage, 
      location.latitude || undefined, 
      location.longitude || undefined
    );
    
    if (moreItems.length > 0) {
      setItems(prev => {
        const existingIds = new Set(prev.map(item => item.id));
        const uniqueNewItems = moreItems.filter((item: MarketplaceItem) => !existingIds.has(item.id));
        
        if (uniqueNewItems.length === 0) {
          setHasMore(false);
          return prev;
        }
        
        return [...prev, ...uniqueNewItems];
      });
      setPage(nextPage);
      setHasMore(moreItems.length === SUBSEQUENT_PAGE_SIZE);
    } else {
      setHasMore(false);
    }
  }, [loading, hasMore, page, fetchItems, location.latitude, location.longitude]);

  // Refresh items (pull to refresh)
  const refreshItems = useCallback(async () => {
    try {
      cacheRef.current.clear();
      
      setPage(1);
      setLoading(true);
      
      const freshItems = await fetchItems(
        1, 
        location.latitude || undefined, 
        location.longitude || undefined
      );
      
      const uniqueFreshItems = deduplicateItems(freshItems);
      
      setItems(uniqueFreshItems);
      setHasMore(uniqueFreshItems.length === INITIAL_PAGE_SIZE);
      return freshItems;
    } catch (error) {
      return items;
    } finally {
      setLoading(false);
    }
  }, [fetchItems, location.latitude, location.longitude]);

  // Toggle distance-based sorting
  const toggleDistanceSort = useCallback(() => {
    setSortByDistance(prev => !prev);
    if (items.length > 0) {
      cacheRef.current.clear();
    }
  }, [items.length]);

  // Set distance filter
  const setDistanceFilter = useCallback((distance: number | null) => {
    setMaxDistance(distance);
    setPage(1);
    if (items.length > 0) {
      cacheRef.current.clear();
    }
  }, [items.length]);

  // Set item type filter
  const setItemTypeFilter = useCallback((type: ItemType | 'all') => {
    setItemType(type);
    setPage(1);
    if (items.length > 0) {
      cacheRef.current.clear();
    }
  }, [items.length]);

  // Set category filter
  const setCategoryFilter = useCallback((category: Category | 'all') => {
    setSelectedCategory(category);
    setPage(1);
    if (items.length > 0) {
      cacheRef.current.clear();
    }
  }, [items.length]);

  // Set verified-only filter
  const setVerifiedOnlyFilter = useCallback((val: boolean) => {
    setVerifiedOnly(val);
    setPage(1);
    if (items.length > 0) {
      cacheRef.current.clear();
    }
  }, [items.length]);

  // Set search query for server-side filtering
  const setSearchQueryFilter = useCallback((q: string) => {
    setSearchQuery(q);
    setPage(1);
    if (items.length > 0) {
      cacheRef.current.clear();
    }
  }, [items.length]);

  return {
    items,
    loading,
    loadMoreItems,
    hasMore,
    refreshItems,
    sortByDistance,
    toggleDistanceSort,
    maxDistance,
    setDistanceFilter,
    itemType,
    setItemTypeFilter,
    selectedCategory,
    setCategoryFilter,
    setVerifiedOnlyFilter,
    setSearchQueryFilter,
    locationAvailable: !!(location.latitude && location.longitude),
    locationLoading: location.loading,
    locationError: location.error,
    updateLocation: location.updateLocation,
  };
}
