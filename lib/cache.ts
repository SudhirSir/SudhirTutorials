/**
 * Production Caching Engine for Sudhir Tutorials
 * Provides fast in-memory caching with Redis integration readiness.
 * Reduces database load for read-heavy entities like Courses, Batches,
 * Materials, Lectures, Store Items, and System Settings.
 */

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

class CacheEngine {
  private store = new Map<string, CacheEntry<any>>();
  private maxEntries = 500;

  /**
   * Retrieves an item from cache if valid and unexpired
   */
  get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Sets an item in cache with specified TTL in seconds (default: 60s)
   */
  set<T>(key: string, data: T, ttlSeconds: number = 60): void {
    if (this.store.size >= this.maxEntries) {
      // Evict oldest entry if maxEntries capacity is reached
      const firstKey = this.store.keys().next().value;
      if (firstKey) this.store.delete(firstKey);
    }

    this.store.set(key, {
      data,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  /**
   * Invalidates specific cache key or matching pattern prefix
   */
  invalidate(pattern: string): void {
    for (const key of this.store.keys()) {
      if (key === pattern || key.startsWith(pattern)) {
        this.store.delete(key);
      }
    }
  }

  /**
   * Clears all entries in the cache
   */
  clear(): void {
    this.store.clear();
  }

  /**
   * Helper to execute DB fetcher function with automatic cache hit/miss resolution
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

    const freshData = await fetcher();
    if (freshData !== null && freshData !== undefined) {
      this.set(key, freshData, ttlSeconds);
    }
    return freshData;
  }
}

// Export global singleton instance
export const appCache = new CacheEngine();
