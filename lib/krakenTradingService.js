'use client';

/**
 * KrakenTradingService.js
 * 
 * This service provides integration with Kraken's REST API for trading.
 * It handles authentication, order placement, and trading pair management.
 */

import axios from 'axios';
import logger from './logger';
import { getApiKey } from './apiKeys';

// Cache for asset pair info to avoid frequent API calls
const assetPairCache = {
  pairs: {},
  lastUpdated: null,
  expiryTime: 24 * 60 * 60 * 1000 // 24 hours
};

class KrakenTradingService {
  constructor() {
    this.baseUrl = 'https://api.kraken.com';
    this.apiVersion = '0';
    this.initialized = false;
    this.credentials = null;
    
    // API rate limiting configuration
    this.rateLimit = {
      maxRequestsPerMinute: 15, // Conservative default
      requestsThisMinute: 0,
      resetTime: Date.now() + 60000
    };
    
    // Retry configuration
    this.retry = {
      maxRetries: 3,
      baseDelay: 1000,
      maxDelay: 10000
    };
  }
  
  /**
   * Initialize the Kraken trading service
   * @returns {Promise<boolean>} Success status
   */
  async initialize() {
    if (this.initialized) {
      return true;
    }
    
    try {
      // Fetch Kraken API credentials
      this.credentials = await getApiKey('kraken');
      
      if (!this.credentials?.api_key || !this.credentials?.api_secret) {
        logger.warn('Kraken API credentials not found or incomplete');
        return false;
      }
      
      // Fetch asset pairs to initialize cache
      await this.refreshAssetPairs();
      
      this.initialized = true;
      logger.info('Kraken Trading Service initialized successfully');
      return true;
    } catch (error) {
      logger.error('Error initializing Kraken Trading Service:', error.message);
      return false;
    }
  }
  
  /**
   * Check if the service is ready for trading
   * @returns {boolean} Ready status
   */
  isReady() {
    return this.initialized && this.credentials?.api_key && this.credentials?.api_secret;
  }
  
  /**
   * Make an authenticated private API call to Kraken
   * @param {string} method - API method (e.g., 'AddOrder', 'Balance')
   * @param {Object} params - Request parameters
   * @param {number} [retryCount=0] - Current retry attempt
   * @returns {Promise<Object>} API response
   */
  async privateRequest(method, params = {}, retryCount = 0) {
    if (!this.isReady()) {
      throw new Error('Kraken Trading Service not initialized or missing credentials');
    }
    
    await this.respectRateLimit();
    
    try {
      // Prepare the request
      const path = `/${this.apiVersion}/private/${method}`;
      const url = `${this.baseUrl}${path}`;
      
      // Generate nonce (must be increasing for each request)
      const nonce = Date.now().toString();
      
      // Create message parameters with nonce
      const requestParams = new URLSearchParams({
        ...params,
        nonce
      });
      
      // API authentication requirements
      const secret = Buffer.from(this.credentials.api_secret, 'base64');
      
      // Compute the SHA256 hash of the nonce and request data
      const crypto = await this.getCryptoModule();
      const hash = crypto.createHash('sha256');
      const hmac = crypto.createHmac('sha512', secret);
      
      // Generate the API signature
      const hashDigest = hash.update(nonce + requestParams.toString()).digest('binary');
      const hmacDigest = hmac.update(path + hashDigest, 'binary').digest('base64');
      
      // Make the authenticated request
      const response = await axios.post(url, requestParams.toString(), {
        headers: {
          'API-Key': this.credentials.api_key,
          'API-Sign': hmacDigest,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        timeout: 15000
      });
      
      // Handle response
      if (response.status === 200) {
        // Check for Kraken API error
        if (response.data.error && response.data.error.length > 0) {
          const errorMessage = response.data.error.join('; ');
          
          // Handle specific API errors
          if (errorMessage.includes('Rate limit exceeded')) {
            // Handle rate limiting with exponential backoff
            if (retryCount < this.retry.maxRetries) {
              const delay = Math.min(
                this.retry.baseDelay * Math.pow(2, retryCount),
                this.retry.maxDelay
              );
              logger.warn(`Kraken API rate limit exceeded, retrying in ${delay}ms`);
              await new Promise(resolve => setTimeout(resolve, delay));
              return this.privateRequest(method, params, retryCount + 1);
            }
          }
          
          throw new Error(`Kraken API error: ${errorMessage}`);
        }
        
        return response.data.result;
      } else {
        throw new Error(`Unexpected status code: ${response.status}`);
      }
    } catch (error) {
      // Handle network errors and retries
      if (axios.isAxiosError(error) && error.code === 'ECONNABORTED' && retryCount < this.retry.maxRetries) {
        const delay = Math.min(
          this.retry.baseDelay * Math.pow(2, retryCount),
          this.retry.maxDelay
        );
        
        logger.warn(`Kraken API request timeout, retrying in ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.privateRequest(method, params, retryCount + 1);
      }
      
      // Log detailed error information
      logger.error(`Kraken API request failed (${method}):`, error.message);
      if (error.response) {
        logger.error('Response data:', error.response.data);
        logger.error('Response status:', error.response.status);
      }
      
      throw error;
    }
  }
  
  /**
   * Make a public API call to Kraken (no authentication required)
   * @param {string} method - API method (e.g., 'AssetPairs', 'Ticker')
   * @param {Object} params - Request parameters
   * @param {number} [retryCount=0] - Current retry attempt
   * @returns {Promise<Object>} API response
   */
  async publicRequest(method, params = {}, retryCount = 0) {
    await this.respectRateLimit();
    
    try {
      // Build query parameters
      const queryString = new URLSearchParams(params).toString();
      const url = `${this.baseUrl}/${this.apiVersion}/public/${method}${queryString ? '?' + queryString : ''}`;
      
      // Make request
      const response = await axios.get(url, {
        timeout: 10000
      });
      
      // Handle response
      if (response.status === 200) {
        // Check for API error
        if (response.data.error && response.data.error.length > 0) {
          const errorMessage = response.data.error.join('; ');
          
          // Handle rate limiting
          if (errorMessage.includes('Rate limit exceeded') && retryCount < this.retry.maxRetries) {
            const delay = Math.min(
              this.retry.baseDelay * Math.pow(2, retryCount),
              this.retry.maxDelay
            );
            logger.warn(`Kraken API rate limit exceeded, retrying in ${delay}ms`);
            await new Promise(resolve => setTimeout(resolve, delay));
            return this.publicRequest(method, params, retryCount + 1);
          }
          
          throw new Error(`Kraken API error: ${errorMessage}`);
        }
        
        return response.data.result;
      } else {
        throw new Error(`Unexpected status code: ${response.status}`);
      }
    } catch (error) {
      // Handle network errors and retries
      if (axios.isAxiosError(error) && error.code === 'ECONNABORTED' && retryCount < this.retry.maxRetries) {
        const delay = Math.min(
          this.retry.baseDelay * Math.pow(2, retryCount),
          this.retry.maxDelay
        );
        
        logger.warn(`Kraken API request timeout, retrying in ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.publicRequest(method, params, retryCount + 1);
      }
      
      logger.error(`Kraken API public request failed (${method}):`, error.message);
      throw error;
    }
  }
  
  /**
   * Respect API rate limits to avoid being banned
   * @returns {Promise<void>}
   */
  async respectRateLimit() {
    const now = Date.now();
    
    // Reset counter if minute has passed
    if (now > this.rateLimit.resetTime) {
      this.rateLimit.requestsThisMinute = 0;
      this.rateLimit.resetTime = now + 60000;
    }
    
    // Increment counter
    this.rateLimit.requestsThisMinute++;
    
    // Wait if we've exceeded rate limit
    if (this.rateLimit.requestsThisMinute > this.rateLimit.maxRequestsPerMinute) {
      const waitTime = this.rateLimit.resetTime - now;
      logger.warn(`Rate limit reached, waiting ${waitTime}ms before next request`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      // Reset after waiting
      this.rateLimit.requestsThisMinute = 1;
      this.rateLimit.resetTime = Date.now() + 60000;
    }
  }
  
  /**
   * Get crypto module in a way that works in both Node.js and browser
   * @returns {Object} Crypto module or equivalent
   */
  async getCryptoModule() {
    if (typeof window === 'undefined') {
      // Server-side (Node.js)
      return require('crypto');
    } else {
      // Client-side (browser)
      // Use the Web Crypto API wrapped to match Node.js crypto API
      return {
        createHash: (algorithm) => {
          if (algorithm !== 'sha256') {
            throw new Error(`Algorithm ${algorithm} not supported in browser`);
          }
          return {
            update: (data) => {
              return {
                digest: async (encoding) => {
                  const encoder = new TextEncoder();
                  const dataBuffer = encoder.encode(data);
                  const hashBuffer = await window.crypto.subtle.digest('SHA-256', dataBuffer);
                  
                  if (encoding === 'binary') {
                    return new Uint8Array(hashBuffer);
                  } else if (encoding === 'base64') {
                    // Convert ArrayBuffer to base64
                    return btoa(String.fromCharCode(...new Uint8Array(hashBuffer)));
                  }
                }
              };
            }
          };
        },
        createHmac: (algorithm, key) => {
          if (algorithm !== 'sha512') {
            throw new Error(`Algorithm ${algorithm} not supported in browser`);
          }
          return {
            update: async (data, inputEncoding) => {
              return {
                digest: async (outputEncoding) => {
                  const encoder = new TextEncoder();
                  const dataBuffer = encoder.encode(data);
                  
                  // Convert key from base64 to ArrayBuffer
                  try {
                    // Use Web Crypto API for HMAC
                    const keyBuffer = Uint8Array.from(atob(key), c => c.charCodeAt(0));
                    const cryptoKey = await window.crypto.subtle.importKey(
                      'raw', keyBuffer, { name: 'HMAC', hash: 'SHA-512' }, 
                      false, ['sign']
                    );
                    const signature = await window.crypto.subtle.sign(
                      'HMAC', cryptoKey, dataBuffer
                    );
                    
                    // Convert to base64
                    return btoa(String.fromCharCode(...new Uint8Array(signature)));
                  } catch (e) {
                    logger.error('Browser crypto error:', e);
                    throw e;
                  }
                }
              };
            }
          };
        }
      };
    }
  }
  
  /**
   * Refresh the asset pairs cache
   * @returns {Promise<void>}
   */
  async refreshAssetPairs() {
    try {
      const now = Date.now();
      
      // Only refresh if cache is expired or empty
      if (
        !assetPairCache.lastUpdated || 
        now - assetPairCache.lastUpdated > assetPairCache.expiryTime ||
        Object.keys(assetPairCache.pairs).length === 0
      ) {
        logger.info('Refreshing Kraken asset pairs cache');
        const pairs = await this.publicRequest('AssetPairs');
        
        // Transform the data into a more usable format
        const transformedPairs = {};
        for (const [pairName, pairInfo] of Object.entries(pairs)) {
          transformedPairs[pairName] = {
            altname: pairInfo.altname,
            wsname: pairInfo.wsname,
            base: pairInfo.base,
            quote: pairInfo.quote,
            pairDecimals: pairInfo.pair_decimals,
            lotDecimals: pairInfo.lot_decimals,
            lotMultiplier: pairInfo.lot_multiplier,
            leverageBuy: pairInfo.leverage_buy,
            leverageSell: pairInfo.leverage_sell,
            fees: pairInfo.fees,
            feesMaker: pairInfo.fees_maker,
            displayDecimals: pairInfo.display_decimals
          };
        }
        
        // Update cache
        assetPairCache.pairs = transformedPairs;
        assetPairCache.lastUpdated = now;
        
        logger.info(`Cached ${Object.keys(transformedPairs).length} Kraken trading pairs`);
      }
    } catch (error) {
      logger.error('Failed to refresh Kraken asset pairs:', error.message);
      throw error;
    }
  }
  
  /**
   * Get information about a specific asset pair
   * @param {string} pair - Asset pair symbol (e.g., 'SOLUSD', 'BTCUSD')
   * @returns {Promise<Object>} Asset pair information
   */
  async getAssetPairInfo(pair) {
    if (
      !assetPairCache.lastUpdated || 
      Date.now() - assetPairCache.lastUpdated > assetPairCache.expiryTime
    ) {
      await this.refreshAssetPairs();
    }
    
    // Find the pair (first try direct match, then try with X prefix)
    let pairInfo = assetPairCache.pairs[pair];
    
    if (!pairInfo) {
      // Try standard format (e.g., XXBTZUSD for BTCUSD)
      const standardized = this.standardizePair(pair);
      pairInfo = assetPairCache.pairs[standardized];
      
      // If still not found, search by altname
      if (!pairInfo) {
        const matchByAltname = Object.values(assetPairCache.pairs).find(
          info => info.altname === pair || info.wsname === pair
        );
        
        if (matchByAltname) {
          pairInfo = matchByAltname;
        } else {
          throw new Error(`Asset pair '${pair}' not found`);
        }
      }
    }
    
    return pairInfo;
  }
  
  /**
   * Standardize pair format to Kraken's internal format
   * @param {string} pair - User-friendly pair symbol (e.g., 'SOLUSD')
   * @returns {string} Standardized pair symbol
   */
  standardizePair(pair) {
    // Common mappings
    const assetMap = {
      'BTC': 'XBT',
      'DOGE': 'XDG'
    };
    
    // Handle format conversion
    const splitIndex = pair.length - 3; // Assume 3 letter currencies like USD
    if (splitIndex > 0) {
      let base = pair.substring(0, splitIndex);
      let quote = pair.substring(splitIndex);
      
      // Apply mappings
      base = assetMap[base] || base;
      quote = assetMap[quote] || quote;
      
      // Add X prefix for certain currencies
      base = /^[A-Z]{3,4}$/.test(base) ? `X${base}` : base;
      quote = /^[A-Z]{3,4}$/.test(quote) ? `Z${quote}` : quote;
      
      return base + quote;
    }
    
    return pair;
  }
  
  /**
   * Format a price according to the asset pair's precision requirements
   * @param {string|number} price - Price to format
   * @param {Object} pairInfo - Asset pair information
   * @returns {string} Formatted price
   */
  formatPrice(price, pairInfo) {
    const precision = pairInfo.pair_decimals || 5;
    return Number(price).toFixed(precision);
  }
  
  /**
   * Format a volume according to the asset pair's precision requirements
   * @param {string|number} volume - Volume to format
   * @param {Object} pairInfo - Asset pair information
   * @returns {string} Formatted volume
   */
  formatVolume(volume, pairInfo) {
    const precision = pairInfo.lot_decimals || 8;
    return Number(volume).toFixed(precision);
  }
  
  /**
   * Place an order on Kraken exchange
   * @param {Object} orderParams - Order parameters
   * @param {string} orderParams.pair - Asset pair (e.g., 'SOLUSD')
   * @param {string} orderParams.type - Order type ('buy' or 'sell')
   * @param {string} orderParams.ordertype - Order type ('market', 'limit', etc.)
   * @param {number|string} [orderParams.price] - Price for limit orders
   * @param {number|string} orderParams.volume - Order volume
   * @param {boolean} [orderParams.validate=false] - Validate only without placing order
   * @returns {Promise<Object>} Order result
   */
  async placeOrder(orderParams) {
    if (!this.isReady()) {
      await this.initialize();
      if (!this.isReady()) {
        throw new Error('Kraken Trading Service not initialized or missing credentials');
      }
    }
    
    try {
      // Get asset pair info for proper price/volume formatting
      const pairInfo = await this.getAssetPairInfo(orderParams.pair);
      
      // Prepare order parameters
      const params = {
        pair: pairInfo.altname,
        type: orderParams.type.toLowerCase(),
        ordertype: orderParams.ordertype.toLowerCase(),
        volume: this.formatVolume(orderParams.volume, pairInfo)
      };
      
      // Add price for limit orders
      if (params.ordertype === 'limit' && orderParams.price) {
        params.price = this.formatPrice(orderParams.price, pairInfo);
      }
      
      // Optional parameters
      if (orderParams.validate) {
        params.validate = true;
      }
      
      if (orderParams.leverage) {
        params.leverage = orderParams.leverage;
      }
      
      if (orderParams.starttm) {
        params.starttm = orderParams.starttm;
      }
      
      if (orderParams.expiretm) {
        params.expiretm = orderParams.expiretm;
      }
      
      if (orderParams.deadline) {
        params.deadline = orderParams.deadline;
      }
      
      if (orderParams.userref) {
        params.userref = orderParams.userref;
      }
      
      if (orderParams.oflags) {
        params.oflags = orderParams.oflags;
      }
      
      // Log order attempt (with price masked for security)
      logger.info(`Placing ${params.ordertype} ${params.type} order for ${params.volume} ${params.pair}${
        params.price ? ' @ ' + params.price : ''
      }${params.validate ? ' (VALIDATE ONLY)' : ''}`);
      
      // Place the order via the Kraken API
      const result = await this.privateRequest('AddOrder', params);
      
      // Log the result
      if (params.validate) {
        logger.info('Order validation successful:', result);
      } else {
        logger.info('Order placed successfully:', result);
      }
      
      return result;
    } catch (error) {
      logger.error('Failed to place Kraken order:', error.message);
      throw error;
    }
  }
  
  /**
   * Alias for placeOrder - for consistency with Kraken API naming
   * @param {Object} orderParams - Order parameters
   * @returns {Promise<Object>} Order result with standardized format
   */
  async addOrder(orderParams) {
    try {
      const result = await this.placeOrder(orderParams);
      
      // Format the response to have a consistent structure
      return {
        success: result.error?.length === 0,
        txid: result.result?.txid?.[0],
        error: result.error?.length > 0 ? result.error.join(', ') : null,
        description: result.result?.descr?.order,
        status: orderParams.validate ? 'validated' : 'placed'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Failed to place order',
        status: 'error'
      };
    }
  }

  /**
   * Get account balance information
   * @returns {Promise<Object>} Account balances
   */
  async getAccountBalance() {
    try {
      return await this.privateRequest('Balance');
    } catch (error) {
      logger.error('Failed to get Kraken account balance:', error.message);
      throw error;
    }
  }
  
  /**
   * Get open orders
   * @returns {Promise<Object>} Open orders
   */
  async getOpenOrders() {
    try {
      return await this.privateRequest('OpenOrders');
    } catch (error) {
      logger.error('Failed to get Kraken open orders:', error.message);
      throw error;
    }
  }
  
  /**
   * Cancel an open order
   * @param {string} txid - Order transaction ID
   * @returns {Promise<Object>} Cancellation result
   */
  async cancelOrder(txid) {
    try {
      return await this.privateRequest('CancelOrder', { txid });
    } catch (error) {
      logger.error(`Failed to cancel Kraken order ${txid}:`, error.message);
      throw error;
    }
  }
}

// Create and export a singleton instance
const krakenTradingService = new KrakenTradingService();
export default krakenTradingService;
