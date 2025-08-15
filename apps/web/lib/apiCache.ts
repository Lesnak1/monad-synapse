/**
 * API Response Caching System
 * Optimizes API response times and reduces server load
 */

import { cache, apiResponseCache } from './cacheManager';
import { NextRequest, NextResponse } from 'next/server';
// Web Crypto API helper for Edge Runtime compatibility
async function createHash(algorithm: string, data: string): Promise<string> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export interface CacheConfig {
  ttl?: number;
  tags?: string[];
  key?: string;
  vary?: string[]; // Headers to vary cache by (e.g., ['authorization', 'x-api-key'])
}

/**
 * Higher-order function to add caching to API routes
 */
export function withCache(
  handler: (request: NextRequest) => Promise<NextResponse>,
  config: CacheConfig = {}
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const method = request.method;
    
    // Only cache GET requests by default
    if (method !== 'GET') {
      return handler(request);
    }
    
    try {
      // Generate cache key
      const cacheKey = await generateCacheKey(request, config);
      
      // Try to get cached response
      const cached = apiResponseCache.get<SerializableResponse>(cacheKey);
      if (cached) {
        // Return cached response
        return new NextResponse(cached.body, {
          status: cached.status,
          statusText: cached.statusText,
          headers: {
            ...cached.headers,
            'X-Cache': 'HIT',
            'X-Cache-Key': cacheKey
          }
        });
      }
      
      // Execute handler
      const response = await handler(request);
      
      // Cache successful responses
      if (response.status >= 200 && response.status < 300) {
        const serializableResponse = await serializeResponse(response);
        
        // Store with tags if provided
        if (config.tags) {
          apiResponseCache.setWithTags(cacheKey, serializableResponse, config.tags, config.ttl);
        } else {
          apiResponseCache.set(cacheKey, serializableResponse, config.ttl);
        }
        
        // Add cache headers to response
        response.headers.set('X-Cache', 'MISS');
        response.headers.set('X-Cache-Key', cacheKey);
      }
      
      return response;
      
    } catch (error) {
      console.error('Cache middleware error:', error);
      return handler(request);
    }
  };
}

/**
 * Generate cache key based on request
 */
async function generateCacheKey(request: NextRequest, config: CacheConfig): Promise<string> {
  if (config.key) {
    return config.key;
  }
  
  const url = new URL(request.url);
  const baseKey = `${request.method}:${url.pathname}:${url.search}`;
  
  // Include varying headers in cache key
  const varyHeaders: string[] = [];
  if (config.vary) {
    config.vary.forEach(header => {
      const value = request.headers.get(header);
      if (value) {
        varyHeaders.push(`${header}:${value}`);
      }
    });
  }
  
  const fullKey = [baseKey, ...varyHeaders].join('|');
  
  // Hash long keys to keep them manageable
  if (fullKey.length > 200) {
    return await createHash('sha256', fullKey);
  }
  
  return fullKey;
}

/**
 * Serialize NextResponse for caching
 */
interface SerializableResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
}

async function serializeResponse(response: NextResponse): Promise<SerializableResponse> {
  const headers: Record<string, string> = {};
  response.headers.forEach((value, key) => {
    headers[key] = value;
  });
  
  const body = await response.text();
  
  return {
    status: response.status,
    statusText: response.statusText,
    headers,
    body
  };
}

/**
 * Cache invalidation utilities
 */
export class CacheInvalidation {
  /**
   * Invalidate cache entries by tag
   */
  static invalidateByTag(tag: string): number {
    return apiResponseCache.invalidateByTag(tag);
  }
  
  /**
   * Invalidate game-related caches
   */
  static invalidateGameCache(gameType?: string): number {
    if (gameType) {
      return apiResponseCache.invalidateByTag(`game:${gameType}`);
    }
    return apiResponseCache.invalidateByTag('game');
  }
  
  /**
   * Invalidate user-related caches
   */
  static invalidateUserCache(userAddress: string): number {
    return apiResponseCache.invalidateByTag(`user:${userAddress}`);
  }
  
  /**
   * Clear all API response cache
   */
  static clearAll(): void {
    apiResponseCache.clear();
  }
}

/**
 * Performance monitoring for cache
 */
export function getCacheMetrics() {
  const stats = apiResponseCache.getStats();
  const mainCacheStats = cache.getStats();
  
  return {
    apiCache: {
      entries: stats.totalEntries,
      hitRate: Math.round(stats.hitRate * 100) / 100,
      hits: stats.totalHits,
      misses: stats.totalMisses,
      memoryUsage: `${Math.round(stats.memoryUsage / 1024)} KB`
    },
    mainCache: {
      entries: mainCacheStats.totalEntries,
      hitRate: Math.round(mainCacheStats.hitRate * 100) / 100,
      hits: mainCacheStats.totalHits,
      misses: mainCacheStats.totalMisses,
      memoryUsage: `${Math.round(mainCacheStats.memoryUsage / 1024)} KB`
    }
  };
}

/**
 * Preload frequently accessed data
 */
export class CacheWarming {
  /**
   * Warm up game result cache with common scenarios
   */
  static async warmGameCache(): Promise<void> {
    const commonGameTypes = ['dice', 'mines', 'crash', 'coin-flip'];
    const promises: Promise<void>[] = [];
    
    commonGameTypes.forEach(gameType => {
      // Pre-generate common cache keys for quick access
      promises.push(
        cache.warm(
          [`game_stats:${gameType}`, `game_config:${gameType}`],
          async (key) => {
            if (key.includes('stats')) {
              return { winRate: 0.48, avgMultiplier: 1.96, totalGames: 0 };
            }
            return { maxBet: 100, minBet: 0.001, houseEdge: 0.02 };
          },
          300000 // 5 minute TTL
        )
      );
    });
    
    await Promise.all(promises);
  }
  
  /**
   * Warm up pool balance cache
   */
  static async warmPoolCache(): Promise<void> {
    await cache.warm(
      ['pool_stats', 'pool_history'],
      async (key) => {
        if (key === 'pool_stats') {
          return { balance: 1000, totalBets: 0, totalPayouts: 0 };
        }
        return { recent: [], hourly: [], daily: [] };
      },
      60000 // 1 minute TTL
    );
  }
}