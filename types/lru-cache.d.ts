declare module 'lru-cache' {
  interface LRUCacheOptions<K, V> {
    max?: number;
    ttl?: number;
    updateAgeOnGet?: boolean;
    allowStale?: boolean;
  }

  class LRUCache<K, V> {
    constructor(options?: LRUCacheOptions<K, V>);
    set(key: K, value: V, options?: { ttl?: number; max?: number }): void;
    get(key: K): V | undefined;
    delete(key: K): void;
    clear(): void;
    has(key: K): boolean;
    forEach(callbackfn: (value: V, key: K, map: LRUCache<K, V>) => void): void;
    keys(): IterableIterator<K>;
    readonly size: number;
    readonly max: number;
    readonly ttl: number | undefined;
    readonly hits: number;
    readonly misses: number;
  }

  export default LRUCache;
} 