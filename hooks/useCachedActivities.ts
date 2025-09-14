/* global console */
import { useState, useEffect, useRef, useCallback } from 'react';
import { Activity, getActivities, getSentPings, getReceivedPings } from '@/utils/activitySupabase';
import { supabase } from '@/utils/supabaseClient';
import { enhancedCache } from '@/utils/enhancedCacheManager';
import { performanceMonitor } from '@/utils/performanceMonitor';

interface CachedActivitiesState {
  activities: Activity[];
  sentPings: Activity[];
  receivedPings: Activity[];
  myListings: any[];
  userProfiles: Record<string, any>;
  loading: boolean;
  lastFetch: number | null;
}

const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes cache
const CACHE_KEYS = {
  ACTIVITIES: 'cached_activities',
  SENT_PINGS: 'cached_sent_pings',
  RECEIVED_PINGS: 'cached_received_pings',
  MY_LISTINGS: 'cached_my_listings',
  USER_PROFILES: 'cached_user_profiles',
};

export function useCachedActivities(username: string | null) {
  const [state, setState] = useState<CachedActivitiesState>({
    activities: [],
    sentPings: [],
    receivedPings: [],
    myListings: [],
    userProfiles: {},
    loading: false,
    lastFetch: null,
  });

  const isInitializedRef = useRef(false);
  const loadingRef = useRef(false);

  // Generate cache key with username
  const getCacheKey = useCallback((baseKey: string) => {
    return `${baseKey}_${username || 'anonymous'}`;
  }, [username]);

  // Check if cache is still valid
  const isCacheValid = useCallback(() => {
    return state.lastFetch && (Date.now() - state.lastFetch) < CACHE_DURATION;
  }, [state.lastFetch]);

  // Load cached data
  const loadFromCache = useCallback(async () => {
    if (!username) return false;

    try {
      const [
        cachedActivities,
        cachedSentPings,
        cachedReceivedPings,
        cachedMyListings,
        cachedUserProfiles,
      ] = await Promise.all([
        enhancedCache.get<Activity[]>(getCacheKey(CACHE_KEYS.ACTIVITIES)),
        enhancedCache.get<Activity[]>(getCacheKey(CACHE_KEYS.SENT_PINGS)),
        enhancedCache.get<Activity[]>(getCacheKey(CACHE_KEYS.RECEIVED_PINGS)),
        enhancedCache.get<any[]>(getCacheKey(CACHE_KEYS.MY_LISTINGS)),
        enhancedCache.get<Record<string, any>>(getCacheKey(CACHE_KEYS.USER_PROFILES)),
      ]);

      if (cachedActivities && cachedSentPings && cachedReceivedPings && cachedMyListings && cachedUserProfiles) {
        setState(prev => ({
          ...prev,
          activities: cachedActivities,
          sentPings: cachedSentPings,
          receivedPings: cachedReceivedPings,
          myListings: cachedMyListings,
          userProfiles: cachedUserProfiles,
          lastFetch: Date.now(),
        }));
        return true;
      }
    } catch (error) {
      // console.error('Error loading from cache:', error);
    }
    return false;
  }, [username, getCacheKey]);

  // Save data to cache
  const saveToCache = useCallback(async (data: {
    activities: Activity[];
    sentPings: Activity[];
    receivedPings: Activity[];
    myListings: any[];
    userProfiles: Record<string, any>;
  }) => {
    if (!username) return;

    try {
      await Promise.all([
        enhancedCache.set(getCacheKey(CACHE_KEYS.ACTIVITIES), data.activities),
        enhancedCache.set(getCacheKey(CACHE_KEYS.SENT_PINGS), data.sentPings),
        enhancedCache.set(getCacheKey(CACHE_KEYS.RECEIVED_PINGS), data.receivedPings),
        enhancedCache.set(getCacheKey(CACHE_KEYS.MY_LISTINGS), data.myListings),
        enhancedCache.set(getCacheKey(CACHE_KEYS.USER_PROFILES), data.userProfiles),
      ]);
    } catch (error) {
      // console.error('Error saving to cache:', error);
    }
  }, [username, getCacheKey]);

  // Load all activity data
  const loadActivities = useCallback(async (forceRefresh = false) => {
    if (!username) {
      setState(prev => ({ ...prev, loading: false }));
      return;
    }

    // Prevent multiple simultaneous loads
    if (loadingRef.current) return;
    loadingRef.current = true;

    // Check cache first (unless forcing refresh)
    if (!forceRefresh && isCacheValid()) {
      const cached = await loadFromCache();
      if (cached) {
        loadingRef.current = false;
        return;
      }
    }

    setState(prev => ({ ...prev, loading: true }));

    try {
      // Track performance
      const result = await performanceMonitor.trackOperation('load_activities', async () => {
        // Fetch all data in parallel
        const [storedActivities, sentPings, receivedPings, myListings] = await Promise.all([
          getActivities(username),
          getSentPings(username),
          getReceivedPings(username),
          fetchMyListings(username),
        ]);

        // Convert pings to activity format for UI compatibility
        const pingActivities: Activity[] = [
          ...sentPings.map(ping => ({
            id: ping.id,
            type: 'sent_ping' as const,
            listing_id: ping.listing_id,
            title: ping.listings?.title || '',
            price: ping.listings?.price?.toString() || '',
            image: ping.listings?.images?.[0] || '',
            images: ping.listings?.images || undefined,
            thumbnail_images: ping.listings?.thumbnail_images || undefined,
            preview_images: ping.listings?.preview_images || undefined,
            image_metadata: ping.listings?.image_metadata || undefined,
            username: ping.receiver_username,
            user_name: '',
            user_avatar: '',
            status: ping.status,
            message: ping.message,
            created_at: ping.created_at,
            is_active: true,
            sender_username: ping.sender_username,
            sender_name: ping.sender?.name || ping.sender_username,
            sender_avatar: ping.sender?.avatar_url || '',
            receiver_username: ping.receiver_username,
            receiver_name: ping.receiver?.name || ping.receiver_username,
            receiver_avatar: ping.receiver?.avatar_url || '',
            listings: {
              ...ping.listings,
              latitude: ping.listings?.latitude,
              longitude: ping.listings?.longitude
            }
          })),
          ...receivedPings.map(ping => ({
            id: ping.id,
            type: 'received_ping' as const,
            listing_id: ping.listing_id,
            title: ping.listings?.title || '',
            price: ping.listings?.price?.toString() || '',
            image: ping.listings?.images?.[0] || '',
            images: ping.listings?.images || undefined,
            thumbnail_images: ping.listings?.thumbnail_images || undefined,
            preview_images: ping.listings?.preview_images || undefined,
            image_metadata: ping.listings?.image_metadata || undefined,
            username: ping.sender_username,
            user_name: '',
            user_avatar: '',
            status: ping.status,
            message: ping.message,
            created_at: ping.created_at,
            is_active: true,
            sender_username: ping.sender_username,
            sender_name: ping.sender?.name || ping.sender_username,
            sender_avatar: ping.sender?.avatar_url || '',
            receiver_username: ping.receiver_username,
            receiver_name: ping.receiver?.name || ping.receiver_username,
            receiver_avatar: ping.receiver?.avatar_url || '',
            listings: {
              ...ping.listings,
              latitude: ping.listings?.latitude,
              longitude: ping.listings?.longitude
            }
          }))
        ];

        // Build user profiles from all activities
        const userProfiles: Record<string, any> = {};
        [...storedActivities, ...pingActivities].forEach(activity => {
          if (activity.username && !userProfiles[activity.username]) {
            userProfiles[activity.username] = {
              name: activity.user_name || activity.username,
              avatar_url: activity.user_avatar || '',
              username: activity.username,
            };
          }
        });

        // Add verification data from ping sender/receiver data
        [...sentPings, ...receivedPings].forEach(ping => {
          if (ping.sender) {
            userProfiles[ping.sender.username] = {
              name: ping.sender.name,
              avatar_url: ping.sender.avatar_url || '',
              username: ping.sender.username,
              verification_status: ping.sender.verification_status,
              verified_at: ping.sender.verified_at,
              expires_at: ping.sender.expires_at,
            };
            
          }
          if (ping.receiver) {
            userProfiles[ping.receiver.username] = {
              name: ping.receiver.name,
              avatar_url: ping.receiver.avatar_url || '',
              username: ping.receiver.username,
              verification_status: ping.receiver.verification_status,
              verified_at: ping.receiver.verified_at,
              expires_at: ping.receiver.expires_at,
            };
            
          }
        });

        return {
          activities: storedActivities,
          sentPings: pingActivities.filter(p => p.type === 'sent_ping'),
          receivedPings: pingActivities.filter(p => p.type === 'received_ping'),
          myListings,
          userProfiles,
        };
      });

      // Save to cache
      await saveToCache(result);

      setState(prev => ({
        ...prev,
        ...result,
        loading: false,
        lastFetch: Date.now(),
      }));

    } catch (error) {
      setState(prev => ({ ...prev, loading: false }));
    } finally {
      loadingRef.current = false;
    }
  }, [username, isCacheValid, loadFromCache, saveToCache]);

  // Fetch my listings
  const fetchMyListings = async (username: string) => {
    try {
      const { data: listings, error } = await supabase
        .from('listings')
        .select('id, title, description, price, price_unit, category, thumbnail_images, preview_images, latitude, longitude, created_at')
        .eq('username', username)
        .order('created_at', { ascending: false });
          
      if (error) {
        // console.error('Error fetching listings:', error);
        return [];
      }
      
      // Update the listings with correct image field if needed
      return (listings || []).map((listing: any) => {
        if (!listing.image && (listing.images && listing.images.length > 0)) {
          return {
            ...listing,
            image: listing.thumbnail_images[0]
          };
        }
        return listing;
      });
    } catch (err) {
      // console.error('Exception fetching listings:', err);
      return [];
    }
  };

  // Refresh data (clear cache and reload)
  const refresh = useCallback(async () => {
    // Clear cache
    if (username) {
      await Promise.all([
        enhancedCache.delete(getCacheKey(CACHE_KEYS.ACTIVITIES)),
        enhancedCache.delete(getCacheKey(CACHE_KEYS.SENT_PINGS)),
        enhancedCache.delete(getCacheKey(CACHE_KEYS.RECEIVED_PINGS)),
        enhancedCache.delete(getCacheKey(CACHE_KEYS.MY_LISTINGS)),
        enhancedCache.delete(getCacheKey(CACHE_KEYS.USER_PROFILES)),
      ]);
    }
    await loadActivities(true);
  }, [loadActivities, username, getCacheKey]);

  // Update specific activity (for status changes, etc.)
  const updateActivity = useCallback((activityId: string, updates: Partial<Activity>) => {
    setState(prev => {
      const newState = {
        ...prev,
        activities: prev.activities.map(activity => 
          activity.id === activityId ? { ...activity, ...updates } : activity
        ),
        sentPings: prev.sentPings.map(ping => 
          ping.id === activityId ? { ...ping, ...updates } : ping
        ),
        receivedPings: prev.receivedPings.map(ping => 
          ping.id === activityId ? { ...ping, ...updates } : ping
        ),
      };

      // Update cache with new state
      saveToCache({
        activities: newState.activities,
        sentPings: newState.sentPings,
        receivedPings: newState.receivedPings,
        myListings: newState.myListings,
        userProfiles: newState.userProfiles,
      });

      return newState;
    });
  }, [saveToCache]);

  // Remove activity (for deletions)
  const removeActivity = useCallback((activityId: string) => {
    setState(prev => {
      const newState = {
        ...prev,
        activities: prev.activities.filter(activity => activity.id !== activityId),
        sentPings: prev.sentPings.filter(ping => ping.id !== activityId),
        receivedPings: prev.receivedPings.filter(ping => ping.id !== activityId),
      };

      // Update cache with new state
      saveToCache({
        activities: newState.activities,
        sentPings: newState.sentPings,
        receivedPings: newState.receivedPings,
        myListings: newState.myListings,
        userProfiles: newState.userProfiles,
      });

      return newState;
    });
  }, [saveToCache]);

  // Add new activity
  const addActivity = useCallback((activity: Activity) => {
    setState(prev => {
      const newState = {
        ...prev,
        activities: [activity, ...prev.activities],
        sentPings: activity.type === 'sent_ping' ? [activity, ...prev.sentPings] : prev.sentPings,
        receivedPings: activity.type === 'received_ping' ? [activity, ...prev.receivedPings] : prev.receivedPings,
      };

      // Update cache with new state
      saveToCache({
        activities: newState.activities,
        sentPings: newState.sentPings,
        receivedPings: newState.receivedPings,
        myListings: newState.myListings,
        userProfiles: newState.userProfiles,
      });

      return newState;
    });
  }, [saveToCache]);

  // Load activities on mount and when username changes
  useEffect(() => {
    if (!username || isInitializedRef.current) return;
    
    isInitializedRef.current = true;
    loadActivities();
  }, [username, loadActivities]);

  // Set up periodic refresh (every 5 minutes)
  useEffect(() => {
    if (!username) return;

    const interval = setInterval(() => {
      // Only refresh if cache is expired
      if (!isCacheValid()) {
        loadActivities();
      }
    }, CACHE_DURATION);

    return () => clearInterval(interval);
  }, [username, isCacheValid, loadActivities]);

  return {
    ...state,
    refresh,
    updateActivity,
    removeActivity,
    addActivity,
    isCacheValid,
  };
} 