/**
 * HTTP Client Utility
 * 
 * This module provides HTTP client functionality with caching support
 * for the consensus prediction MCP server. Includes retry logic
 * and circuit breaker pattern for robust error handling.
 * 
 * UPDATED: Now using the standalone CircuitBreaker class for improved resilience
 */

const axios = require('axios');
const { logger } = require('./logger');
const { CircuitBreaker, STATES } = require('./circuitBreaker');

// Retry configuration
const RETRY_CONFIG = {
  maxRetries: 3,         // Maximum number of retry attempts
  initialDelay: 1000,    // Initial delay in ms (1 second)
  maxDelay: 10000,       // Maximum delay between retries (10 seconds)
  backoffFactor: 2       // Exponential backoff factor
};

// Initialize circuit breaker
const circuitBreaker = new CircuitBreaker({
  failureThreshold: 5,   // Number of failures before opening the circuit
  resetTimeout: 30000,   // Time in ms to wait before attempting to reset (30 seconds)
  halfOpenMaxCalls: 2    // Maximum calls allowed in half-open state
}, logger);

// In-memory cache
const cache = {
  data: {},
  
  // Get cached response
  get(key) {
    const cachedItem = this.data[key];
    
    if (!cachedItem) {
      return null;
    }
    
    // Check if cached item is expired
    if (cachedItem.expiry < Date.now()) {
      delete this.data[key];
      return null;
    }
    
    return cachedItem.data;
  },
  
  // Set cache item
  set(key, data, ttl) {
    this.data[key] = {
      data,
      expiry: Date.now() + ttl
    };
  },
  
  // Clear the entire cache
  clear() {
    this.data = {};
  },
  
  // Get cache statistics
  getStats() {
    const totalItems = Object.keys(this.data).length;
    let expiredItems = 0;
    const now = Date.now();
    
    for (const key in this.data) {
      if (this.data[key].expiry < now) {
        expiredItems++;
      }
    }
    
    return {
      totalItems,
      expiredItems,
      validItems: totalItems - expiredItems
    };
  }
};

/**
 * Generate a cache key from URL and params
 * 
 * @param {string} url - The request URL
 * @param {Object} params - The request parameters
 * @returns {string} Cache key
 */
function generateCacheKey(url, params = {}) {
  const sortedParams = Object.entries(params || {})
    .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
    .reduce((acc, [key, value]) => {
      acc[key] = value;
      return acc;
    }, {});
  
  return `${url}:${JSON.stringify(sortedParams)}`;
}

/**
 * Get a nice error message from an error response
 * 
 * @param {Object} response - Error response from Axios
 * @returns {string} Error message
 */
function getErrorMessage(response) {
  if (!response) return 'Unknown error';
  
  if (response.data) {
    if (typeof response.data === 'string') return response.data;
    if (response.data.message) return response.data.message;
    if (response.data.error) return response.data.error;
    return JSON.stringify(response.data);
  }
  
  return response.statusText || 'Unknown error';
}

/**
 * Make a GET request with caching support, retry logic, and circuit breaker
 * 
 * @param {string} url - The request URL
 * @param {Object} options - Request options
 * @param {Object} cacheOptions - Caching options
 * @param {Object} retryOptions - Retry options
 * @returns {Promise<Object>} Response data
 */
async function get(url, options = {}, cacheOptions = {}, retryOptions = {}) {
  const { params = {}, headers = {} } = options;
  const { useCache = false, ttl = 60000 } = cacheOptions;
  
  // Extract the hostname or use the full URL for circuit breaker
  const urlObj = new URL(url);
  const endpoint = urlObj.hostname || url;
  
  // Check circuit breaker before making the request
  if (!circuitBreaker.canCall(endpoint)) {
    logger.warn(`Circuit breaker is open for ${endpoint}, request rejected`);
    throw new Error(`Service ${endpoint} is currently unavailable (circuit breaker open)`);
  }
  
  try {
    // Generate cache key
    const cacheKey = useCache ? generateCacheKey(url, params) : null;
    
    // Check cache if enabled
    if (useCache) {
      const cachedResponse = cache.get(cacheKey);
      if (cachedResponse) {
        logger.debug(`Cache hit for ${url}`);
        return cachedResponse;
      }
      logger.debug(`Cache miss for ${url}`);
    }
    
    // Apply retry logic
    const maxRetries = retryOptions.maxRetries || RETRY_CONFIG.maxRetries;
    let retryCount = 0;
    let lastError = null;
    
    while (retryCount <= maxRetries) {
      try {
        // Make the request
        const response = await axios.get(url, { 
          params, 
          headers,
          timeout: options.timeout || 10000  // 10 seconds default timeout
        });
        
        // Record success in circuit breaker
        circuitBreaker.recordSuccess(endpoint);
        
        // Cache the response if enabled
        if (useCache && cacheKey) {
          cache.set(cacheKey, response.data, ttl);
        }
        
        return response.data;
      } catch (error) {
        lastError = error;
        
        // Record failure in circuit breaker
        circuitBreaker.recordFailure(endpoint);
        
        // Determine if we should retry based on error type
        const isRetryable = 
          // Network errors are retryable
          error.code === 'ECONNABORTED' || 
          error.code === 'ETIMEDOUT' ||
          // 5xx errors are retryable
          (error.response && error.response.status >= 500 && error.response.status < 600) ||
          // 429 rate limit is retryable
          (error.response && error.response.status === 429);
          
        if (!isRetryable || retryCount >= maxRetries) {
          break;
        }
        
        // Calculate backoff delay with exponential backoff and jitter
        const baseDelay = Math.min(
          RETRY_CONFIG.initialDelay * Math.pow(RETRY_CONFIG.backoffFactor, retryCount),
          RETRY_CONFIG.maxDelay
        );
        
        // Add jitter (±20%)
        const jitterFactor = 0.8 + (Math.random() * 0.4);
        const delay = Math.floor(baseDelay * jitterFactor);
        
        logger.warn(`Retrying GET request to ${url} in ${delay}ms (attempt ${retryCount + 1}/${maxRetries})`);
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, delay));
        
        retryCount++;
      }
    }
    
    // If we get here, all retries failed or error is not retryable
    if (lastError.response) {
      // Server responded with an error status
      logger.error(`HTTP error for GET ${url} after ${retryCount} retries`, {
        status: lastError.response.status,
        data: lastError.response.data,
        params
      });
      
      throw new Error(`HTTP error: ${lastError.response.status} - ${getErrorMessage(lastError.response)}`);
    } else if (lastError.request) {
      // Request was made but no response received
      logger.error(`No response received for GET ${url} after ${retryCount} retries`, {
        error: lastError.message,
        params
      });
      
      throw new Error(`No response received: ${lastError.message}`);
    } else {
      // Error in setting up the request
      logger.error(`Request setup error for GET ${url}`, {
        error: lastError.message,
        params
      });
      
      throw lastError;
    }
  } catch (error) {
    // Handle any other errors that might have occurred
    if (!error.message.includes('circuit breaker')) {
      logger.error(`Unhandled error for GET ${url}`, {
        error: error.message,
        stack: error.stack
      });
    }
    
    throw error;
  }
}

/**
 * Make a POST request with retry logic and circuit breaker
 * 
 * @param {string} url - The request URL
 * @param {Object} data - Request body data
 * @param {Object} options - Request options
 * @param {Object} retryOptions - Retry options
 * @returns {Promise<Object>} Response data
 */
async function post(url, data = {}, options = {}, retryOptions = {}) {
  const { headers = {} } = options;
  
  // Extract the hostname or use the full URL for circuit breaker
  const urlObj = new URL(url);
  const endpoint = urlObj.hostname || url;
  
  // Check circuit breaker before making the request
  if (!circuitBreaker.canCall(endpoint)) {
    logger.warn(`Circuit breaker is open for ${endpoint}, POST request rejected`);
    throw new Error(`Service ${endpoint} is currently unavailable (circuit breaker open)`);
  }
  
  try {
    // Apply retry logic
    const maxRetries = retryOptions.maxRetries || RETRY_CONFIG.maxRetries;
    let retryCount = 0;
    let lastError = null;
    
    while (retryCount <= maxRetries) {
      try {
        // Make the request
        const response = await axios.post(url, data, {
          headers,
          timeout: options.timeout || 10000  // 10 seconds default timeout
        });
        
        // Record success in circuit breaker
        circuitBreaker.recordSuccess(endpoint);
        
        return response.data;
      } catch (error) {
        lastError = error;
        
        // Record failure in circuit breaker
        circuitBreaker.recordFailure(endpoint);
        
        // Determine if we should retry based on error type
        const isRetryable = 
          // Network errors are retryable
          error.code === 'ECONNABORTED' || 
          error.code === 'ETIMEDOUT' ||
          // 5xx errors are retryable
          (error.response && error.response.status >= 500 && error.response.status < 600) ||
          // 429 rate limit is retryable
          (error.response && error.response.status === 429);
          
        // Don't retry if the error is not retryable or we've hit max retries
        if (!isRetryable || retryCount >= maxRetries) {
          break;
        }
        
        // Calculate backoff delay with exponential backoff and jitter
        const baseDelay = Math.min(
          RETRY_CONFIG.initialDelay * Math.pow(RETRY_CONFIG.backoffFactor, retryCount),
          RETRY_CONFIG.maxDelay
        );
        
        // Add jitter (±20%)
        const jitterFactor = 0.8 + (Math.random() * 0.4);
        const delay = Math.floor(baseDelay * jitterFactor);
        
        logger.warn(`Retrying POST request to ${url} in ${delay}ms (attempt ${retryCount + 1}/${maxRetries})`);
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, delay));
        
        retryCount++;
      }
    }
    
    // If we get here, all retries failed or error is not retryable
    if (lastError.response) {
      // Server responded with an error status
      logger.error(`HTTP error for POST ${url} after ${retryCount} retries`, {
        status: lastError.response.status,
        data: lastError.response.data
      });
      
      throw new Error(`HTTP error: ${lastError.response.status} - ${getErrorMessage(lastError.response)}`);
    } else if (lastError.request) {
      // Request was made but no response received
      logger.error(`No response received for POST ${url} after ${retryCount} retries`, {
        error: lastError.message
      });
      
      throw new Error(`No response received: ${lastError.message}`);
    } else {
      // Error in setting up the request
      logger.error(`Request setup error for POST ${url}`, {
        error: lastError.message
      });
      
      throw lastError;
    }
  } catch (error) {
    // Handle any other errors that might have occurred
    if (!error.message.includes('circuit breaker')) {
      logger.error(`Unhandled error for POST ${url}`, {
        error: error.message,
        stack: error.stack
      });
    }
    
    throw error;
  }
}

/**
 * Clear the cache
 * 
 * @returns {Object} Status of the operation
 */
function clearCache() {
  try {
    const stats = cache.getStats();
    cache.clear();
    
    return {
      success: true,
      message: `Cache cleared successfully. Removed ${stats.totalItems} items.`
    };
  } catch (error) {
    logger.error('Error clearing cache', { error: error.message });
    
    return {
      success: false,
      message: `Failed to clear cache: ${error.message}`
    };
  }
}

/**
 * Get cache statistics
 * 
 * @returns {Object} Cache statistics
 */
function getCacheStats() {
  return cache.getStats();
}

/**
 * Get circuit breaker status for all endpoints
 * 
 * @returns {Object} Circuit breaker status
 */
function getCircuitBreakerStatus() {
  return circuitBreaker.getStatus();
}

/**
 * Reset circuit breaker for an endpoint
 * 
 * @param {string} endpoint - The endpoint to reset
 * @returns {Object} Result of the operation
 */
function resetCircuitBreaker(endpoint) {
  try {
    circuitBreaker.reset(endpoint);
    
    return {
      success: true,
      message: `Circuit breaker reset successfully for ${endpoint}.`,
      status: circuitBreaker.get(endpoint)
    };
  } catch (error) {
    logger.error(`Error resetting circuit breaker for ${endpoint}`, { error: error.message });
    
    return {
      success: false,
      message: `Failed to reset circuit breaker: ${error.message}`
    };
  }
}

/**
 * Configure HTTP client settings
 * 
 * @param {Object} config - Configuration object
 * @returns {Object} Updated configuration
 */
function configure(config = {}) {
  // Update retry configuration
  if (config.retry) {
    Object.assign(RETRY_CONFIG, config.retry);
  }
  
  // Update circuit breaker configuration
  if (config.circuitBreaker) {
    // Create a new circuit breaker with the updated config
    const newCircuitBreaker = new CircuitBreaker(config.circuitBreaker, logger);
    
    // Copy the state from the old circuit breaker
    const status = circuitBreaker.getStatus();
    Object.keys(status).forEach(endpoint => {
      if (status[endpoint].state !== STATES.CLOSED) {
        newCircuitBreaker.forceState(endpoint, status[endpoint].state);
      }
    });
    
    // Replace the circuit breaker
    Object.assign(circuitBreaker, newCircuitBreaker);
  }
  
  return {
    retry: { ...RETRY_CONFIG },
    circuitBreaker: circuitBreaker.config
  };
}

module.exports = {
  get,
  post,
  clearCache,
  getCacheStats,
  getCircuitBreakerStatus,
  resetCircuitBreaker,
  configure
};