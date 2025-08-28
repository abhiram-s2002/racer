import { useEffect, useState, useCallback } from 'react';
import { cacheManager } from './cacheManager';

interface StateCacheConfig {
  ttl: number; // Time to live in seconds
  persistKey?: string; // Key for persistent storage
  encryptData?: boolean; // Whether to encrypt the data
  hydrationDelay?: number; // Delay before hydrating state (in ms)
}

const DEFAULT_CONFIG: StateCacheConfig = {
  ttl: 3600, // 1 hour
  hydrationDelay: 0,
};

/**
 * Hook for caching and persisting state
 */
export function useCachedState<T>(
  initialState: T | (() => T),
  config: Partial<StateCacheConfig> = {}
): [T, (value: T | ((prev: T) => T)) => void, { loading: boolean; error: Error | null }] {
  const [state, setState] = useState<T>(initialState);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  // Generate cache key
  const cacheKey = finalConfig.persistKey || 'state_cache';
  const cacheType = finalConfig.encryptData ? 'USER' : 'API';

  // Load state from cache
  useEffect(() => {
    let mounted = true;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const loadState = async () => {
      try {
        const cached = await cacheManager.get<T>(cacheKey, cacheType);
        
        if (mounted && cached !== null) {
          if (finalConfig.hydrationDelay) {
            timeoutId = setTimeout(() => {
              setState(cached);
              setLoading(false);
            }, finalConfig.hydrationDelay);
          } else {
            setState(cached);
            setLoading(false);
          }
        } else {
          setLoading(false);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err : new Error('Failed to load state'));
          setLoading(false);
        }
      }
    };

    loadState();

    return () => {
      mounted = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [cacheKey, cacheType, finalConfig.hydrationDelay]);

  // Save state to cache
  const setStateAndCache = useCallback((value: T | ((prev: T) => T)) => {
    setState(prev => {
      const nextState = value instanceof Function ? value(prev) : value;
      cacheManager.set(cacheKey, nextState, cacheType).catch(err => {
        // Failed to cache state
      });
      return nextState;
    });
  }, [cacheKey, cacheType]);

  return [state, setStateAndCache, { loading, error }];
}

/**
 * Hook for caching form state
 */
export function useCachedForm<T extends Record<string, any>>(
  initialState: T,
  config: Partial<StateCacheConfig> = {}
): [T, (field: keyof T, value: any) => void, () => void, { loading: boolean; error: Error | null }] {
  const [formState, setFormState] = useCachedState<T>(initialState, config);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Update a single form field
  const updateField = useCallback((field: keyof T, value: any) => {
    setFormState(prev => ({
      ...prev,
      [field]: value,
    }));
  }, [setFormState]);

  // Reset form to initial state
  const resetForm = useCallback(() => {
    setFormState(initialState);
  }, [initialState, setFormState]);

  return [formState, updateField, resetForm, { loading, error }];
}

/**
 * Hook for caching paginated data
 */
export function useCachedPagination<T>(
  fetchData: (page: number) => Promise<T[]>,
  config: Partial<StateCacheConfig> & { pageSize?: number } = {}
): [
  T[],
  number,
  () => Promise<void>,
  () => Promise<void>,
  { loading: boolean; error: Error | null }
] {
  const pageSize = config.pageSize || 10;
  const [data, setData] = useCachedState<T[]>([], config);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Load next page
  const loadMore = useCallback(async () => {
    if (loading) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const newData = await fetchData(page + 1);
      if (newData.length > 0) {
        setData(prev => [...prev, ...newData]);
        setPage(prev => prev + 1);
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load more data'));
    } finally {
      setLoading(false);
    }
  }, [fetchData, page, loading, setData]);

  // Refresh data
  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const newData = await fetchData(1);
      setData(newData);
      setPage(1);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to refresh data'));
    } finally {
      setLoading(false);
    }
  }, [fetchData, setData]);

  return [data, page, loadMore, refresh, { loading, error }];
}

/**
 * Hook for caching search results
 */
export function useCachedSearch<T>(
  searchFn: (query: string) => Promise<T[]>,
  config: Partial<StateCacheConfig> & { debounceMs?: number } = {}
): [
  T[],
  string,
  (query: string) => void,
  { loading: boolean; error: Error | null }
] {
  const [results, setResults] = useCachedState<T[]>([], config);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const debounceMs = config.debounceMs || 300;

  // Debounced search
  useEffect(() => {
    const timeoutId = setTimeout(async () => {
      if (!query.trim()) {
        setResults([]);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const searchResults = await searchFn(query);
        setResults(searchResults);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Search failed'));
      } finally {
        setLoading(false);
      }
    }, debounceMs);

    return () => clearTimeout(timeoutId);
  }, [query, searchFn, debounceMs, setResults]);

  return [results, query, setQuery, { loading, error }];
}

// Example usage:
//
// const [state, setState] = useCachedState(initialState, {
//   persistKey: 'my-state',
//   encryptData: true,
//   ttl: 3600,
// });
//
// const [formData, updateField, resetForm] = useCachedForm({
//   name: '',
//   email: '',
// }, {
//   persistKey: 'form-data',
// });
//
// const [items, page, loadMore, refresh] = useCachedPagination(
//   async (page) => {
//     const response = await fetch(`/api/items?page=${page}`);
//     return response.json();
//   },
//   {
//     persistKey: 'items',
//     pageSize: 20,
//   }
// );
//
// const [searchResults, query, setQuery] = useCachedSearch(
//   async (query) => {
//     const response = await fetch(`/api/search?q=${query}`);
//     return response.json();
//   },
//   {
//     persistKey: 'search-results',
//     debounceMs: 500,
//   }
// ); 