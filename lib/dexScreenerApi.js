/**
 * DexScreener API Integration Module
 * 
 * This module provides functions to interact with the DexScreener API
 * with built-in caching, error handling, and fallback mechanisms.
 */

import axios from 'axios';
import NodeCache from 'node-cache';
import logger from './logger';

// Constants
const DEXSCREENER_API_URL = 'https://api.dexscreener.com/latest';
const MCP_PROXY_URL = 'http://localhost:3008/api/dexscreener-mcp';

// Cache configuration
const tokenCache = new NodeCache({
  stdTTL: 300, // 5 minutes
  checkperiod: 60, // Check for expired items every 60 seconds
  useClones: false
});

// Token bucket for rate limiting
class TokenBucketRateLimiter {
  constructor({ bucketSize, refillRate, refillInterval }) {
    this.bucketSize = bucketSize;
    this.refillRate = refillRate;
    this.tokens = bucketSize;
    this.lastRefill = Date.now();
    this.refillInterval = refillInterval;
    
    // Start refill timer
    this.timer = setInterval(() => this.refill(), refillInterval);
  }
  
  refill() {
    const now = Date.now();
    const timePassed = now - this.lastRefill;
    const tokensToAdd = Math.floor((timePassed / this.refillInterval) * this.refillRate);
    
    if (tokensToAdd > 0) {
      this.tokens = Math.min(this.bucketSize, this.tokens + tokensToAdd);
      this.lastRefill = now;
    }
  }
  
  async consume(count = 1) {
    // If not enough tokens, wait for refill
    if (this.tokens < count) {
      const tokensNeeded = count - this.tokens;
      const timeToWait = Math.ceil((tokensNeeded / this.refillRate) * this.refillInterval);
      
      logger.debug(`Rate limit hit, waiting ${timeToWait}ms for token refill`);
      
      await new Promise(resolve => setTimeout(resolve, timeToWait));
      this.refill();
    }
    
    // Consume tokens
    this.tokens -= count;
    return true;
  }
  
  destroy() {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }
}

// Create rate limiter for DexScreener API
const rateLimiter = new TokenBucketRateLimiter({
  bucketSize: 60,       // Maximum 60 requests
  refillRate: 1,        // Refill 1 token per second
  refillInterval: 1000  // Check every second
});

/**
 * Fetch token data from DexScreener
 * @param {string} query - Token symbol or address
 * @returns {Promise<Object>} - Token data
 */
export async function fetchTokenDataFromDexScreener(query) {
  const cacheKey = `dexscreener_token_${query.toLowerCase()}`;
  
  // Check cache first
  const cachedData = tokenCache.get(cacheKey);
  if (cachedData) {
    logger.debug(`Using cached data for ${query}`);
    return cachedData;
  }
  
  // Try direct API first
  try {
    await rateLimiter.consume(1);
    
    const url = `${DEXSCREENER_API_URL}/dex/search`;
    const response = await axios.get(url, {
      params: { q: query },
      timeout: 8000,
      headers: {
        'User-Agent': 'TradeForce-AI/1.0.0'
      }
    });
    
    if (response.status === 200 && response.data) {
      // Cache successful response
      tokenCache.set(cacheKey, response.data);
      return response.data;
    }
  } catch (error) {
    logger.warn(`DexScreener direct API failed for ${query}: ${error.message}`);
    
    // Don't throw yet, try fallback
  }
  
  // Try MCP proxy fallback
  try {
    const url = `${MCP_PROXY_URL}/search`;
    const response = await axios.get(url, {
      params: { q: query },
      timeout: 10000
    });
    
    if (response.status === 200 && response.data) {
      // Cache successful response
      tokenCache.set(cacheKey, response.data);
      return response.data;
    }
  } catch (fallbackError) {
    logger.error(`DexScreener MCP proxy also failed for ${query}: ${fallbackError.message}`);
    throw new Error(`Failed to fetch token data for ${query}`);
  }
  
  throw new Error(`Failed to fetch token data for ${query} from all sources`);
}

/**
 * Fetch token pairs from DexScreener
 * @param {string} tokenAddress - Token address
 * @returns {Promise<Object>} - Pairs data
 */
export async function fetchPairsFromDexScreener(tokenAddress) {
  const cacheKey = `dexscreener_pairs_${tokenAddress.toLowerCase()}`;
  
  // Check cache first
  const cachedData = tokenCache.get(cacheKey);
  if (cachedData) {
    logger.debug(`Using cached pairs data for ${tokenAddress}`);
    return cachedData;
  }
  
  // Try direct API first
  try {
    await rateLimiter.consume(1);
    
    const url = `${DEXSCREENER_API_URL}/dex/pairs/solana/${tokenAddress}`;
    const response = await axios.get(url, {
      timeout: 8000,
      headers: {
        'User-Agent': 'TradeForce-AI/1.0.0'
      }
    });
    
    if (response.status === 200 && response.data) {
      // Cache successful response
      tokenCache.set(cacheKey, response.data);
      return response.data;
    }
  } catch (error) {
    logger.warn(`DexScreener direct API failed for pairs ${tokenAddress}: ${error.message}`);
    
    // Don't throw yet, try fallback
  }
  
  // Try MCP proxy fallback
  try {
    const url = `${MCP_PROXY_URL}/pairs/solana/${tokenAddress}`;
    const response = await axios.get(url, {
      timeout: 10000
    });
    
    if (response.status === 200 && response.data) {
      // Cache successful response
      tokenCache.set(cacheKey, response.data);
      return response.data;
    }
  } catch (fallbackError) {
    logger.error(`DexScreener MCP proxy also failed for pairs ${tokenAddress}: ${fallbackError.message}`);
    throw new Error(`Failed to fetch pairs data for ${tokenAddress}`);
  }
  
  throw new Error(`Failed to fetch pairs data for ${tokenAddress} from all sources`);
}

/**
 * Clear cache for a specific token
 * @param {string} tokenIdentifier - Token symbol or address
 */
export function clearTokenCache(tokenIdentifier) {
  const tokenKey = `dexscreener_token_${tokenIdentifier.toLowerCase()}`;
  const pairsKey = `dexscreener_pairs_${tokenIdentifier.toLowerCase()}`;
  
  tokenCache.del(tokenKey);
  tokenCache.del(pairsKey);
}

/**
 * Clear all DexScreener cache
 */
export function clearAllCache() {
  tokenCache.flushAll();
}

/**
 * Get statistics about the cache
 */
export function getCacheStats() {
  return {
    keys: tokenCache.keys(),
    stats: tokenCache.getStats(),
    hitRate: tokenCache.getStats().hits / (tokenCache.getStats().hits + tokenCache.getStats().misses)
  };
}

/**
 * Check if DexScreener API is accessible
 */
export async function checkDexScreenerHealth() {
  try {
    const url = `${DEXSCREENER_API_URL}/dex/search`;
    const response = await axios.get(url, {
      params: { q: 'SOL' },
      timeout: 5000
    });
    
    return {
      status: response.status === 200 ? 'healthy' : 'degraded',
      responseTime: response.headers['x-response-time'] || null,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}
