/**
 * High-Performance LRU Caching Engine with In-Flight Deduplication & Namespace Tagging
 * Sudhir Tutorials WebApp
 * 
 * Data Structures & Complexity:
 * - O(1) LRU Eviction & Recency Tracking via JS Map Insertion-Order
 * - O(1) Namespace Invalidation Index via Map<string, Set<string>>
 * - Singleflight Promise Deduplication prevents Connection Pool Exhaustion / Thundering Herd
 */

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
  namespace?: string;
}

class CacheEngine {
  private store = new Map<string, CacheEntry<any>>();
  private namespaceIndex = new Map<string, Set<string>>();
  private inFlight = new Map<string, Promise<any>>();
  private maxEntries = 1000;

  private extractNamespace(key: string): string {
    const colonIndex = key.indexOf(":");
    return colonIndex !== -1 ? key.slice(0, colonIndex) : key;
  }

  /**
   * Retrieves an item from cache. Refreshes recency in O(1) time.
   */
  get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.delete(key);
      return null;
    }

    // Refresh recency in Map for true O(1) LRU behavior
    this.store.delete(key);
    this.store.set(key, entry);

    return entry.data as T;
  }

  /**
   * Sets an item in cache with specified TTL in seconds (default: 60s).
   * Automatically indexes namespace for O(1) group invalidation.
   */
  set<T>(key: string, data: T, ttlSeconds: number = 60): void {
    if (this.store.size >= this.maxEntries) {
      // Evict least-recently-used item in O(1)
      const oldestKey = this.store.keys().next().value;
      if (oldestKey) this.delete(oldestKey);
    }

    const namespace = this.extractNamespace(key);
    this.store.set(key, {
      data,
      expiresAt: Date.now() + ttlSeconds * 1000,
      namespace,
    });

    if (!this.namespaceIndex.has(namespace)) {
      this.namespaceIndex.set(namespace, new Set());
    }
    this.namespaceIndex.get(namespace)!.add(key);
  }

  /**
   * Delete a single key from cache and clean up its namespace index
   */
  delete(key: string): boolean {
    const entry = this.store.get(key);
    if (!entry) return false;

    const ns = entry.namespace || this.extractNamespace(key);
    const nsSet = this.namespaceIndex.get(ns);
    if (nsSet) {
      nsSet.delete(key);
      if (nsSet.size === 0) {
        this.namespaceIndex.delete(ns);
      }
    }

    return this.store.delete(key);
  }

  del(key: string): boolean {
    return this.delete(key);
  }

  /**
   * Invalidates specific cache key or all keys matching a namespace in O(K) time
   */
  invalidate(pattern: string): void {
    const ns = this.extractNamespace(pattern);
    const nsSet = this.namespaceIndex.get(ns);

    if (nsSet && pattern === ns) {
      // Fast O(K) invalidation of entire namespace group
      for (const key of Array.from(nsSet)) {
        this.store.delete(key);
      }
      this.namespaceIndex.delete(ns);
      return;
    }

    // Prefix search for specific patterns
    for (const key of Array.from(this.store.keys())) {
      if (key === pattern || key.startsWith(pattern)) {
        this.delete(key);
      }
    }
  }

  /**
   * Alias for invalidate(namespace)
   */
  invalidateNamespace(namespace: string): void {
    this.invalidate(namespace);
  }

  /**
   * Clears all entries in the cache
   */
  clear(): void {
    this.store.clear();
    this.namespaceIndex.clear();
    this.inFlight.clear();
  }

  /**
   * Singleflight In-Flight Promise Deduplication + Caching
   * If multiple requests ask for the same key simultaneously while cache is empty,
   * only ONE database query executes, and all callers await the same promise!
   */
  async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttlSeconds: number = 60
  ): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Check if an identical fetch is currently in-flight
    if (this.inFlight.has(key)) {
      return this.inFlight.get(key)! as Promise<T>;
    }

    const promise = (async () => {
      try {
        const freshData = await fetcher();
        if (freshData !== null && freshData !== undefined) {
          this.set(key, freshData, ttlSeconds);
        }
        return freshData;
      } finally {
        this.inFlight.delete(key);
      }
    })();

    this.inFlight.set(key, promise);
    return promise;
  }

  /**
   * Returns current cache size
   */
  size(): number {
    return this.store.size;
  }
}

// Global singleton instance
export const appCache = new CacheEngine();
