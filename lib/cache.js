/**
 * Simple in-memory cache implementation for API responses
 */

// Cache storage with TTL support
const cache = new Map();

/**
 * Get item from cache if it exists and hasn't expired
 * @param {string} key - Cache key
 * @returns {any|null} - Cached value or null if not found/expired
 */
export function getCacheItem(key) {
  if (!cache.has(key)) return null;

  const item = cache.get(key);
  const now = Date.now();

  // Check if item has expired
  if (item.expiry && now > item.expiry) {
    cache.delete(key);
    return null;
  }

  return item.value;
}

/**
 * Set item in cache with optional TTL
 * @param {string} key - Cache key
 * @param {any} value - Value to cache
 * @param {number} ttlSeconds - Time to live in seconds
 */
export function setCacheItem(key, value, ttlSeconds = 60) {
  const expiry = ttlSeconds > 0 ? Date.now() + (ttlSeconds * 1000) : null;
  cache.set(key, { value, expiry });
}

/**
 * Remove item from cache
 * @param {string} key - Cache key
 */
export function removeCacheItem(key) {
  cache.delete(key);
}

/**
 * Clear entire cache
 */
export function clearCache() {
  cache.clear();
}

/**
 * Cached fetch function that automatically caches responses
 * @param {string} url - URL to fetch
 * @param {object} options - Fetch options
 * @param {number} ttlSeconds - Cache TTL in seconds
 * @returns {Promise<any>} - Response data
 */
export async function cachedFetch(url, options = {}, ttlSeconds = 60) {
  // Create a cache key based on URL and options
  const cacheKey = `${url}_${JSON.stringify(options)}`;
  
  // Try to get from cache first
  const cachedData = getCacheItem(cacheKey);
  if (cachedData) {
    return cachedData;
  }
  
  try {
    // Add timeout to fetch requests to prevent hanging
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    // Add abort signal to options
    const fetchOptions = {
      ...options,
      signal: controller.signal
    };
    
    // If not in cache, make the fetch request
    const response = await fetch(url, fetchOptions);
    
    // Clear the timeout since the request completed
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    // Check content type to ensure it's JSON
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      // If it's not JSON, use text() instead of json()
      const text = await response.text();
      console.warn(`Response not JSON. Content-Type: ${contentType}, URL: ${url}`);
      
      // Try to parse it anyway in case the Content-Type header is wrong
      try {
        const parsedData = JSON.parse(text);
        setCacheItem(cacheKey, parsedData, ttlSeconds);
        return parsedData;
      } catch (parseError) {
        throw new Error(`Response is not valid JSON. URL: ${url}`);
      }
    }
    
    // Parse and cache the JSON response
    const data = await response.json();
    setCacheItem(cacheKey, data, ttlSeconds);
    return data;
  } catch (error) {
    console.error(`Fetch error for ${url}:`, error);
    
    // For API issues, return a fallback mock response instead of throwing
    // This prevents the UI from breaking when APIs are unavailable
    const fallbackData = {
      _isMockFallback: true,
      error: error.message,
      message: "This is fallback data due to API request failure"
    };
    
    // We don't cache fallback responses
    return fallbackData;
  }
}