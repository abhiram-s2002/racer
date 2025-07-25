import { useState, useEffect, useCallback } from 'react';
import { memoryCache } from '@/utils/redisCache';
import { supabase } from '@/utils/supabaseClient';

interface RealtimeCacheOptions {
  table: string;
  key: string;
  ttl?: number;
  filter?: Record<string, any>;
}

export function useRealtimeCache<T>(options: RealtimeCacheOptions) {
  const [data, setData] = useState<T | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Generate cache key
  const cacheKey = `realtime:${options.table}:${options.key}`;

  // Load data from database
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase.from(options.table).select('*');

      // Apply filters if provided
      if (options.filter) {
        Object.entries(options.filter).forEach(([key, value]) => {
          query = query.eq(key, value);
        });
      }

      const { data: result, error: queryError } = await query;

      if (queryError) {
        throw queryError;
      }

      // Cache the result
      memoryCache.set(cacheKey, result, { ttl: options.ttl });
      setData(result as T);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load data'));
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  }, [options.table, options.filter, cacheKey, options.ttl]);

  // Subscribe to real-time changes
  useEffect(() => {
    // Try to get from cache first
    const cached = memoryCache.get<T>(cacheKey);
    if (cached) {
      setData(cached);
      setLoading(false);
    } else {
      loadData();
    }

    // Subscribe to cache updates
    const unsubscribeCache = memoryCache.subscribe<T>(cacheKey, value => {
      if (value !== undefined) {
        setData(value);
      }
    });

    // Subscribe to database changes
    const subscription = supabase
      .channel(`${options.table}_changes`)
      .on('postgres_changes', 
        {
          event: '*',
          schema: 'public',
          table: options.table,
        },
        async payload => {
          // Reload data to ensure consistency
          await loadData();
        }
      )
      .subscribe();

    return () => {
      unsubscribeCache();
      subscription.unsubscribe();
    };
  }, [cacheKey, loadData, options.table]);

  // Function to update data
  const updateData = useCallback(async (newData: Partial<T>) => {
    try {
      setLoading(true);
      setError(null);

      const { data: result, error: updateError } = await supabase
        .from(options.table)
        .update(newData)
        .eq(options.key, (data as any)?.[options.key])
        .select()
        .single();

      if (updateError) {
        throw updateError;
      }

      // Update cache
      memoryCache.set(cacheKey, result, { ttl: options.ttl });
      setData(result as T);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to update data'));
      console.error('Error updating data:', err);
    } finally {
      setLoading(false);
    }
  }, [data, options.table, options.key, cacheKey, options.ttl]);

  // Function to invalidate cache
  const invalidateCache = useCallback(() => {
    memoryCache.delete(cacheKey);
    loadData();
  }, [cacheKey, loadData]);

  return {
    data,
    loading,
    error,
    updateData,
    invalidateCache,
    refresh: loadData,
  };
}

// Example usage:
// const { data, loading, error, updateData } = useRealtimeCache<UserProfile>({
//   table: 'profiles',
//   key: 'id',
//   ttl: 5 * 60 * 1000, // 5 minutes
//   filter: { user_id: currentUserId }
// }); 