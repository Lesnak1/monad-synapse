/**
 * Cache Manager for Performance Optimization
 * Multi-layer caching with Redis-like in-memory fallback and TTL support
 */

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  hits: number;
  lastAccess: number;
}

export interface CacheStats {
  totalEntries: number;
  totalHits: number;
  totalMisses: number;
  hitRate: number;
  memoryUsage: number;
  oldestEntry: number;
  newestEntry: number;
}

export class CacheManager {
  private static instance: CacheManager;
  private cache: Map<string, CacheEntry<any>> = new Map();
  private readonly maxEntries: number;
  private readonly defaultTTL: number;
  private stats = {
    hits: 0,
    misses: 0,
    evictions: 0,
    sets: 0
  };

  constructor(maxEntries: number = 10000, defaultTTL: number = 5 * 60 * 1000) {
    this.maxEntries = maxEntries;
    this.defaultTTL = defaultTTL;
    
    // Cleanup expired entries every 5 minutes
    setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager();
    }
    return CacheManager.instance;
  }

  /**
   * Store data in cache with optional TTL
   */
  set<T>(key: string, data: T, ttl?: number): void {
    const now = Date.now();
    const entryTTL = ttl || this.defaultTTL;
    
    // Check if we need to evict entries
    if (this.cache.size >= this.maxEntries && !this.cache.has(key)) {
      this.evictLRU();
    }

    const entry: CacheEntry<T> = {
      data,
      timestamp: now,
      ttl: entryTTL,
      hits: 0,
      lastAccess: now
    };

    this.cache.set(key, entry);
    this.stats.sets++;
  }

  /**
   * Retrieve data from cache
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.stats.misses++;
      return null;
    }

    const now = Date.now();
    
    // Check if entry has expired
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }

    // Update access stats
    entry.hits++;
    entry.lastAccess = now;
    this.stats.hits++;

    return entry.data as T;
  }

  /**
   * Check if key exists and is not expired
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    
    if (!entry) return false;
    
    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }

  /**
   * Delete specific entry
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Get or set pattern - execute function if key doesn't exist
   */
  async getOrSet<T>(
    key: string, 
    factory: () => Promise<T> | T, 
    ttl?: number
  ): Promise<T> {
    const cached = this.get<T>(key);
    
    if (cached !== null) {
      return cached;
    }

    const data = await factory();
    this.set(key, data, ttl);
    return data;
  }

  /**
   * Cache with tags for group invalidation
   */
  setWithTags<T>(key: string, data: T, tags: string[], ttl?: number): void {
    this.set(key, data, ttl);
    
    // Store tag associations
    tags.forEach(tag => {
      const tagKey = `tag:${tag}`;
      const taggedKeys = this.get<string[]>(tagKey) || [];
      taggedKeys.push(key);
      this.set(tagKey, taggedKeys, 24 * 60 * 60 * 1000); // 24 hour TTL for tags
    });
  }

  /**
   * Invalidate all entries with specific tags
   */
  invalidateByTag(tag: string): number {
    const tagKey = `tag:${tag}`;
    const taggedKeys = this.get<string[]>(tagKey);
    
    if (!taggedKeys) return 0;

    let invalidated = 0;
    taggedKeys.forEach(key => {
      if (this.delete(key)) {
        invalidated++;
      }
    });

    // Clean up the tag itself
    this.delete(tagKey);
    
    return invalidated;
  }

  /**
   * Evict least recently used entry
   */
  private evictLRU(): void {
    let oldestKey: string | null = null;
    let oldestAccess = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccess < oldestAccess) {
        oldestAccess = entry.lastAccess;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.stats.evictions++;
    }
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    const toDelete: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        toDelete.push(key);
      }
    }

    toDelete.forEach(key => this.cache.delete(key));
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const now = Date.now();
    let memoryUsage = 0;
    let oldestEntry = now;
    let newestEntry = 0;

    for (const [key, entry] of this.cache.entries()) {
      // Approximate memory usage
      memoryUsage += JSON.stringify(entry).length + key.length;
      
      if (entry.timestamp < oldestEntry) {
        oldestEntry = entry.timestamp;
      }
      if (entry.timestamp > newestEntry) {
        newestEntry = entry.timestamp;
      }
    }

    const totalRequests = this.stats.hits + this.stats.misses;
    const hitRate = totalRequests > 0 ? (this.stats.hits / totalRequests) * 100 : 0;

    return {
      totalEntries: this.cache.size,
      totalHits: this.stats.hits,
      totalMisses: this.stats.misses,
      hitRate,
      memoryUsage,
      oldestEntry: oldestEntry === now ? 0 : oldestEntry,
      newestEntry
    };
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      sets: 0
    };
  }

  /**
   * Get cache entries matching pattern
   */
  getKeys(pattern?: string): string[] {
    const keys = Array.from(this.cache.keys());
    
    if (!pattern) return keys;
    
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    return keys.filter(key => regex.test(key));
  }

  /**
   * Bulk operations
   */
  mget<T>(keys: string[]): (T | null)[] {
    return keys.map(key => this.get<T>(key));
  }

  mset<T>(entries: Array<{ key: string; data: T; ttl?: number }>): void {
    entries.forEach(({ key, data, ttl }) => {
      this.set(key, data, ttl);
    });
  }

  /**
   * Cache warming - preload data
   */
  async warm<T>(
    keys: string[], 
    factory: (key: string) => Promise<T> | T,
    ttl?: number
  ): Promise<void> {
    const promises = keys.map(async (key) => {
      if (!this.has(key)) {
        const data = await factory(key);
        this.set(key, data, ttl);
      }
    });

    await Promise.all(promises);
  }
}

// Specialized cache instances for different use cases
export const gameResultCache = new CacheManager(5000, 30 * 1000); // 30 second TTL for game results
export const poolBalanceCache = new CacheManager(100, 5 * 1000); // 5 second TTL for pool balance
export const userSessionCache = new CacheManager(10000, 30 * 60 * 1000); // 30 minute TTL for user sessions
export const apiResponseCache = new CacheManager(1000, 60 * 1000); // 1 minute TTL for API responses

// Export main cache instance
export const cache = CacheManager.getInstance();