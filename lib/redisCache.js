/**
 * Redis-like caching service for server-side API responses
 * 
 * This module provides a more robust caching layer for server-side API responses
 * to improve performance, reduce API costs, and enhance scalability.
 */

// In-memory cache store (simulating Redis)
const cacheStore = new Map();

// Cache statistics for monitoring
const cacheStats = {
  hits: 0,
  misses: 0,
  staleHits: 0,
  totalSaved: 0,
  operations: 0
};

/**
 * Redis-like cache service
 */
class RedisCache {
  constructor(options = {}) {
    this.prefix = options.prefix || 'redis-cache:';
    this.defaultTTL = options.defaultTTL || 3600000; // 1 hour
    this.maxKeys = options.maxKeys || 1000;
    this.cleanupInterval = options.cleanupInterval || 300000; // 5 minutes
    
    // Start cleanup interval
    this.startCleanupInterval();
  }
  
  /**
   * Start the cleanup interval to remove expired items
   */
  startCleanupInterval() {
    if (typeof window !== 'undefined') {
      this.cleanup = setInterval(() => {
        this.removeExpiredItems();
      }, this.cleanupInterval);
    }
  }
  
  /**
   * Stop the cleanup interval
   */
  stopCleanupInterval() {
    if (this.cleanup) {
      clearInterval(this.cleanup);
    }
  }
  
  /**
   * Remove expired items from the cache
   */
  removeExpiredItems() {
    const now = Date.now();
    let removed = 0;
    
    cacheStore.forEach((value, key) => {
      if (value.expiry < now) {
        cacheStore.delete(key);
        removed++;
      }
    });
    
    if (removed > 0) {
      console.log(`Removed ${removed} expired items from cache`);
    }
    
    // If we're over the max keys limit, remove the oldest items
    if (cacheStore.size > this.maxKeys) {
      const keysToRemove = [...cacheStore.entries()]
        .sort((a, b) => a[1].lastAccessed - b[1].lastAccessed)
        .slice(0, cacheStore.size - this.maxKeys)
        .map(entry => entry[0]);
      
      keysToRemove.forEach(key => {
        cacheStore.delete(key);
      });
      
      console.log(`Removed ${keysToRemove.length} oldest items from cache due to size limit`);
    }
  }
  
  /**
   * Get a value from the cache
   * @param {string} key - Cache key
   * @param {Object} options - Options
   * @returns {Promise<any>} Cached value or null
   */
  async get(key, options = {}) {
    cacheStats.operations++;
    const prefixedKey = this.prefix + key;
    
    const cachedItem = cacheStore.get(prefixedKey);
    if (!cachedItem) {
      cacheStats.misses++;
      return null;
    }
    
    const now = Date.now();
    
    // Update last accessed time
    cachedItem.lastAccessed = now;
    
    // Check if expired
    if (cachedItem.expiry < now) {
      if (options.allowStale) {
        cacheStats.staleHits++;
        return {
          ...cachedItem.value,
          _stale: true,
          _expiredAt: new Date(cachedItem.expiry).toISOString()
        };
      }
      
      cacheStore.delete(prefixedKey);
      cacheStats.misses++;
      return null;
    }
    
    cacheStats.hits++;
    cacheStats.totalSaved += cachedItem.cost || 1;
    
    return cachedItem.value;
  }
  
  /**
   * Set a value in the cache
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {Object} options - Options
   * @returns {Promise<boolean>} Whether the operation was successful
   */
  async set(key, value, options = {}) {
    cacheStats.operations++;
    const prefixedKey = this.prefix + key;
    const ttl = options.ttl || this.defaultTTL;
    const cost = options.cost || 1;
    
    cacheStore.set(prefixedKey, {
      value,
      expiry: Date.now() + ttl,
      cost,
      lastAccessed: Date.now(),
      createdAt: Date.now()
    });
    
    return true;
  }
  
  /**
   * Delete a value from the cache
   * @param {string} key - Cache key
   * @returns {Promise<boolean>} Whether the operation was successful
   */
  async del(key) {
    cacheStats.operations++;
    const prefixedKey = this.prefix + key;
    return cacheStore.delete(prefixedKey);
  }
  
  /**
   * Check if a key exists in the cache
   * @param {string} key - Cache key
   * @returns {Promise<boolean>} Whether the key exists
   */
  async exists(key) {
    cacheStats.operations++;
    const prefixedKey = this.prefix + key;
    return cacheStore.has(prefixedKey);
  }
  
  /**
   * Get multiple values from the cache
   * @param {string[]} keys - Cache keys
   * @returns {Promise<Object>} Object with keys and values
   */
  async mget(keys) {
    cacheStats.operations++;
    const result = {};
    
    for (const key of keys) {
      result[key] = await this.get(key);
    }
    
    return result;
  }
  
  /**
   * Set multiple values in the cache
   * @param {Object} keyValues - Object with keys and values
   * @param {Object} options - Options
   * @returns {Promise<boolean>} Whether the operation was successful
   */
  async mset(keyValues, options = {}) {
    cacheStats.operations++;
    
    for (const [key, value] of Object.entries(keyValues)) {
      await this.set(key, value, options);
    }
    
    return true;
  }
  
  /**
   * Increment a value in the cache
   * @param {string} key - Cache key
   * @param {number} increment - Amount to increment
   * @returns {Promise<number>} New value
   */
  async incr(key, increment = 1) {
    cacheStats.operations++;
    const prefixedKey = this.prefix + key;
    
    const cachedItem = cacheStore.get(prefixedKey);
    if (!cachedItem) {
      // If key doesn't exist, create it with the increment value
      await this.set(key, increment);
      return increment;
    }
    
    const newValue = (cachedItem.value || 0) + increment;
    cachedItem.value = newValue;
    cachedItem.lastAccessed = Date.now();
    
    return newValue;
  }
  
  /**
   * Get cache statistics
   * @returns {Object} Cache statistics
   */
  getStats() {
    return {
      ...cacheStats,
      size: cacheStore.size,
      hitRate: cacheStats.operations > 0 
        ? (cacheStats.hits / cacheStats.operations) * 100 
        : 0
    };
  }
  
  /**
   * Clear the entire cache
   * @returns {Promise<boolean>} Whether the operation was successful
   */
  async flushAll() {
    cacheStats.operations++;
    cacheStore.clear();
    return true;
  }
  
  /**
   * Fetch data with cache support
   * @param {string} url - URL to fetch
   * @param {Object} fetchOptions - Fetch options
   * @param {Object} cacheOptions - Cache options
   * @returns {Promise<any>} Fetched data
   */
  async fetchWithCache(url, fetchOptions = {}, cacheOptions = {}) {
    const {
      ttl = this.defaultTTL,
      cost = 1,
      allowStale = true,
      revalidateOnStale = true,
      cacheKey = url
    } = cacheOptions;
    
    // Try to get from cache first
    const cachedData = await this.get(cacheKey, { allowStale });
    
    // If we have fresh cached data, return it
    if (cachedData && !cachedData._stale) {
      return { ...cachedData, _cached: true };
    }
    
    try {
      // Fetch fresh data
      const response = await fetch(url, fetchOptions);
      
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }
      
      const data = await response.json();
      
      // Cache the fresh data
      await this.set(cacheKey, data, { ttl, cost });
      
      return data;
    } catch (error) {
      console.error('Fetch error:', error);
      
      // If we have stale data and fetch failed, return the stale data
      if (cachedData && cachedData._stale) {
        return { ...cachedData, _fetchFailed: true };
      }
      
      throw error;
    }
  }
}

// Create a singleton instance
const redisCache = new RedisCache();

export default redisCache;
