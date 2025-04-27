/**
 * Cache service for API responses
 * 
 * This module provides a caching layer for API responses to reduce API costs,
 * improve performance, and provide fallback data when APIs are unavailable.
 * 
 * Uses localStorage for client-side caching and redisCache for server-side caching
 * to improve scalability and performance.
 */

import redisCache from './redisCache.js';

// Determine if we're running on the server
const isServer = typeof window === 'undefined';

// Cache statistics for monitoring
const cacheStats = {
  hits: 0,
  misses: 0,
  staleHits: 0,
  totalSaved: 0
};

/**
 * Get an item from the cache
 * @param {string} key - Cache key
 * @param {Object} options - Options
 * @param {boolean} options.allowStale - Whether to return stale data
 * @returns {Object|null} Cached item or null if not found
 */
export const getCachedItem = async (key, options = {}) => {
  try {
    const { allowStale = false } = options;
    
    // Use redisCache for server-side caching
    if (isServer) {
      return await redisCache.get(key, { allowStale });
    }
    
    // Use localStorage for client-side caching
    if (!window.localStorage) {
      return null;
    }
    
    const cachedData = localStorage.getItem(`cache:${key}`);
    if (!cachedData) {
      cacheStats.misses++;
      return null;
    }
    
    const { value, expiry, cost = 1 } = JSON.parse(cachedData);
    const now = Date.now();
    
    if (now < expiry) {
      cacheStats.hits++;
      cacheStats.totalSaved += cost;
      return value;
    }
    
    if (allowStale) {
      cacheStats.staleHits++;
      return { 
        ...value, 
        _stale: true, 
        _expiredAt: new Date(expiry).toISOString() 
      };
    }
    
    cacheStats.misses++;
    return null;
  } catch (error) {
    console.error('Cache error:', error);
    return null;
  }
};

/**
 * Set an item in the cache
 * @param {string} key - Cache key
 * @param {any} value - Value to cache
 * @param {Object} options - Options
 * @param {number} options.ttl - Time to live in milliseconds
 * @param {number} options.cost - Estimated API cost in credits
 * @returns {boolean} Whether the item was successfully cached
 */
export const setCachedItem = async (key, value, options = {}) => {
  try {
    const { ttl = 60 * 60 * 1000, cost = 1 } = options; // Default TTL: 1 hour
    
    // Use redisCache for server-side caching
    if (isServer) {
      return await redisCache.set(key, value, { ttl, cost });
    }
    
    // Use localStorage for client-side caching
    if (!window.localStorage) {
      return false;
    }
    
    const expiry = Date.now() + ttl;
    const cacheItem = JSON.stringify({ value, expiry, cost });
    
    localStorage.setItem(`cache:${key}`, cacheItem);
    return true;
  } catch (error) {
    console.error('Cache error:', error);
    return false;
  }
};

/**
 * Remove an item from the cache
 * @param {string} key - Cache key
 * @returns {boolean} Whether the item was successfully removed
 */
export const removeCachedItem = async (key) => {
  try {
    // Use redisCache for server-side caching
    if (isServer) {
      return await redisCache.del(key);
    }
    
    // Use localStorage for client-side caching
    if (!window.localStorage) {
      return false;
    }
    
    localStorage.removeItem(`cache:${key}`);
    return true;
  } catch (error) {
    console.error('Cache error:', error);
    return false;
  }
};

/**
 * Clear all cached items
 * @returns {boolean} Whether the cache was successfully cleared
 */
export const clearCache = async () => {
  try {
    // Use redisCache for server-side caching
    if (isServer) {
      return await redisCache.flushAll();
    }
    
    // Use localStorage for client-side caching
    if (!window.localStorage) {
      return false;
    }
    
    // Only clear items with the cache: prefix
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('cache:')) {
        localStorage.removeItem(key);
      }
    });
    
    return true;
  } catch (error) {
    console.error('Cache error:', error);
    return false;
  }
};

/**
 * Get cache statistics
 * @returns {Object} Cache statistics
 */
export const getCacheStats = async () => {
  // Use redisCache for server-side caching
  if (isServer) {
    return redisCache.getStats();
  }
  
  return { ...cacheStats };
};

/**
 * Fetch data with cache support
 * @param {string} url - URL to fetch
 * @param {Object} options - Fetch options
 * @param {Object} cacheOptions - Cache options
 * @returns {Promise<Object>} Fetched data
 */
export const fetchWithCache = async (url, options = {}, cacheOptions = {}) => {
  const { 
    ttl = 60 * 60 * 1000, // 1 hour
    cost = 1,
    allowStale = true,
    revalidateOnStale = true,
    cacheKey = url
  } = cacheOptions;
  
  // Use redisCache for server-side caching
  if (isServer) {
    return redisCache.fetchWithCache(url, options, cacheOptions);
  }
  
  // Try to get from cache first
  const cachedData = await getCachedItem(cacheKey, { allowStale });
  
  // If we have fresh cached data, return it
  if (cachedData && !cachedData._stale) {
    return { ...cachedData, _cached: true };
  }
  
  try {
    // Fetch fresh data
    const response = await fetch(url, options);
    
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }
    
    const data = await response.json();
    
    // Cache the fresh data
    await setCachedItem(cacheKey, data, { ttl, cost });
    
    return data;
  } catch (error) {
    console.error('Fetch error:', error);
    
    // If we have stale data and fetch failed, return the stale data
    if (cachedData && cachedData._stale) {
      return { ...cachedData, _fetchFailed: true };
    }
    
    throw error;
  }
};

export default {
  getCachedItem,
  setCachedItem,
  removeCachedItem,
  clearCache,
  getCacheStats,
  fetchWithCache
};
