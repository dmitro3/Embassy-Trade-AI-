'use client';

import { startAppTransaction, finishAppTransaction } from './sentryUtils.js';
import logger from './logger.js';

/**
 * Photon API Client
 * 
 * This client provides a JavaScript wrapper around the Photon Network API v1.0.0,
 * allowing for seamless integration with the TradeForce AI Trading Agent.
 * 
 * Documentation: https://photonnetwork.readthedocs.io/en/v1.0.0/rest_api/
 */
class PhotonApiClient {
  constructor() {
    this.apiKey = process.env.NEXT_PUBLIC_PHOTON_API_KEY || '38HQ8wNk38Q4VCfrSfESGgggoefgPF9kaeZbYvLC6nKqGTLnQN136CLRiqi6e68yppFB5ypjwzjNCTdjyoieiQQe';
    this.baseUrl = 'https://api.photonnetwork.io/v1';
    this.initialized = false;
    this.cacheExpiry = 30 * 1000; // 30 seconds
    this.cache = {
      marketData: new Map(),
      orderBook: new Map(),
      tradingPairs: null,
      tradingPairsTimestamp: 0
    };
    this.retryConfig = {
      maxRetries: 3,
      initialDelay: 1000,
      maxDelay: 10000
    };
  }

  /**
   * Initialize the Photon API client
   */
  async initialize() {
    const transaction = startAppTransaction('photon-initialize', 'api.init');
    
    try {
      // Verify API key by making a simple request
      const tradingPairs = await this.getTradingPairs();
      
      if (tradingPairs && tradingPairs.length > 0) {
        logger.info('Photon API initialized successfully');
        this.initialized = true;
        return true;
      } else {
        logger.error('Failed to initialize Photon API');
        return false;
      }
    } catch (error) {
      logger.error(`Photon API initialization error: ${error.message}`);
      return false;
    } finally {
      finishAppTransaction(transaction);
    }
  }

  /**
   * Get available trading pairs
   * 
   * @returns {Promise<Array>} - List of available trading pairs
   */
  async getTradingPairs() {
    const transaction = startAppTransaction('photon-get-trading-pairs', 'api.pairs');
    
    try {
      if (!this.initialized && !this.initializing) {
        this.initializing = true;
      }
      
      // Check cache first
      if (this.cache.tradingPairs && (Date.now() - this.cache.tradingPairsTimestamp) < this.cacheExpiry) {
        return this.cache.tradingPairs;
      }
      
      const response = await this.makeRequest('/markets');
      
      if (response && response.success && response.data) {
        // Cache the result
        this.cache.tradingPairs = response.data;
        this.cache.tradingPairsTimestamp = Date.now();
        
        if (this.initializing) {
          this.initializing = false;
          this.initialized = true;
        }
        
        return response.data;
      } else {
        throw new Error('Failed to get trading pairs');
      }
    } catch (error) {
      logger.error(`Photon getTradingPairs error: ${error.message}`);
      
      if (this.initializing) {
        this.initializing = false;
      }
      
      throw error;
    } finally {
      finishAppTransaction(transaction);
    }
  }

  /**
   * Get market data for a trading pair
   * 
   * @param {string} symbol - Trading pair symbol (e.g., 'SOL-USDC')
   * @returns {Promise<Object>} - Market data
   */
  async getMarketData(symbol) {
    const transaction = startAppTransaction('photon-get-market-data', 'api.market');
    
    try {
      if (!this.initialized) {
        await this.initialize();
      }
      
      // Check cache first
      const cacheKey = symbol.toLowerCase();
      const cachedData = this.cache.marketData.get(cacheKey);
      
      if (cachedData && (Date.now() - cachedData.timestamp) < this.cacheExpiry) {
        return cachedData.data;
      }
      
      const response = await this.makeRequest(`/markets/${symbol}`);
      
      if (response && response.success && response.data) {
        // Cache the result
        this.cache.marketData.set(cacheKey, {
          data: response.data,
          timestamp: Date.now()
        });
        
        return response.data;
      } else {
        throw new Error(`Failed to get market data for ${symbol}`);
      }
    } catch (error) {
      logger.error(`Photon getMarketData error: ${error.message}`);
      throw error;
    } finally {
      finishAppTransaction(transaction);
    }
  }

  /**
   * Get order book for a trading pair
   * 
   * @param {string} symbol - Trading pair symbol (e.g., 'SOL-USDC')
   * @param {number} depth - Order book depth (default: 10)
   * @returns {Promise<Object>} - Order book
   */
  async getOrderBook(symbol, depth = 10) {
    const transaction = startAppTransaction('photon-get-order-book', 'api.orderbook');
    
    try {
      if (!this.initialized) {
        await this.initialize();
      }
      
      // Check cache first
      const cacheKey = `${symbol.toLowerCase()}_${depth}`;
      const cachedData = this.cache.orderBook.get(cacheKey);
      
      if (cachedData && (Date.now() - cachedData.timestamp) < this.cacheExpiry) {
        return cachedData.data;
      }
      
      const response = await this.makeRequest(`/markets/${symbol}/orderbook?depth=${depth}`);
      
      if (response && response.success && response.data) {
        // Cache the result
        this.cache.orderBook.set(cacheKey, {
          data: response.data,
          timestamp: Date.now()
        });
        
        return response.data;
      } else {
        throw new Error(`Failed to get order book for ${symbol}`);
      }
    } catch (error) {
      logger.error(`Photon getOrderBook error: ${error.message}`);
      throw error;
    } finally {
      finishAppTransaction(transaction);
    }
  }

  /**
   * Get recent trades for a trading pair
   * 
   * @param {string} symbol - Trading pair symbol (e.g., 'SOL-USDC')
   * @param {number} limit - Number of trades to return (default: 50)
   * @returns {Promise<Array>} - Recent trades
   */
  async getRecentTrades(symbol, limit = 50) {
    const transaction = startAppTransaction('photon-get-recent-trades', 'api.trades');
    
    try {
      if (!this.initialized) {
        await this.initialize();
      }
      
      const response = await this.makeRequest(`/markets/${symbol}/trades?limit=${limit}`);
      
      if (response && response.success && response.data) {
        return response.data;
      } else {
        throw new Error(`Failed to get recent trades for ${symbol}`);
      }
    } catch (error) {
      logger.error(`Photon getRecentTrades error: ${error.message}`);
      throw error;
    } finally {
      finishAppTransaction(transaction);
    }
  }

  /**
   * Get account balances
   * 
   * @param {string} walletAddress - Wallet address
   * @returns {Promise<Object>} - Account balances
   */
  async getAccountBalances(walletAddress) {
    const transaction = startAppTransaction('photon-get-account-balances', 'api.balances');
    
    try {
      if (!this.initialized) {
        await this.initialize();
      }
      
      if (!walletAddress) {
        throw new Error('Wallet address is required');
      }
      
      const response = await this.makeRequest(`/accounts/${walletAddress}/balances`);
      
      if (response && response.success && response.data) {
        return response.data;
      } else {
        throw new Error(`Failed to get account balances for ${walletAddress}`);
      }
    } catch (error) {
      logger.error(`Photon getAccountBalances error: ${error.message}`);
      throw error;
    } finally {
      finishAppTransaction(transaction);
    }
  }

  /**
   * Get open orders for an account
   * 
   * @param {string} walletAddress - Wallet address
   * @param {string} symbol - Trading pair symbol (optional)
   * @returns {Promise<Array>} - Open orders
   */
  async getOpenOrders(walletAddress, symbol = null) {
    const transaction = startAppTransaction('photon-get-open-orders', 'api.orders');
    
    try {
      if (!this.initialized) {
        await this.initialize();
      }
      
      if (!walletAddress) {
        throw new Error('Wallet address is required');
      }
      
      let endpoint = `/accounts/${walletAddress}/orders?status=open`;
      
      if (symbol) {
        endpoint += `&symbol=${symbol}`;
      }
      
      const response = await this.makeRequest(endpoint);
      
      if (response && response.success && response.data) {
        return response.data;
      } else {
        throw new Error(`Failed to get open orders for ${walletAddress}`);
      }
    } catch (error) {
      logger.error(`Photon getOpenOrders error: ${error.message}`);
      throw error;
    } finally {
      finishAppTransaction(transaction);
    }
  }

  /**
   * Get order history for an account
   * 
   * @param {string} walletAddress - Wallet address
   * @param {Object} options - Query options
   * @returns {Promise<Array>} - Order history
   */
  async getOrderHistory(walletAddress, options = {}) {
    const transaction = startAppTransaction('photon-get-order-history', 'api.history');
    
    try {
      if (!this.initialized) {
        await this.initialize();
      }
      
      if (!walletAddress) {
        throw new Error('Wallet address is required');
      }
      
      const queryParams = new URLSearchParams();
      
      if (options.symbol) queryParams.append('symbol', options.symbol);
      if (options.status) queryParams.append('status', options.status);
      if (options.limit) queryParams.append('limit', options.limit.toString());
      if (options.before) queryParams.append('before', options.before.toString());
      if (options.after) queryParams.append('after', options.after.toString());
      
      const endpoint = `/accounts/${walletAddress}/orders?${queryParams.toString()}`;
      
      const response = await this.makeRequest(endpoint);
      
      if (response && response.success && response.data) {
        return response.data;
      } else {
        throw new Error(`Failed to get order history for ${walletAddress}`);
      }
    } catch (error) {
      logger.error(`Photon getOrderHistory error: ${error.message}`);
      throw error;
    } finally {
      finishAppTransaction(transaction);
    }
  }

  /**
   * Place a new order
   * 
   * @param {Object} orderParams - Order parameters
   * @param {string} walletAddress - Wallet address
   * @param {Function} signTransaction - Function to sign transaction
   * @returns {Promise<Object>} - Order result
   */
  async placeOrder(orderParams, walletAddress, signTransaction) {
    const transaction = startAppTransaction('photon-place-order', 'api.place');
    
    try {
      if (!this.initialized) {
        await this.initialize();
      }
      
      if (!walletAddress) {
        throw new Error('Wallet address is required');
      }
      
      if (!signTransaction || typeof signTransaction !== 'function') {
        throw new Error('Sign transaction function is required');
      }
      
      // Validate required parameters
      if (!orderParams.symbol) throw new Error('Symbol is required');
      if (!orderParams.side) throw new Error('Side is required (buy or sell)');
      if (!orderParams.type) throw new Error('Order type is required (limit or market)');
      if (!orderParams.quantity) throw new Error('Quantity is required');
      if (orderParams.type === 'limit' && !orderParams.price) throw new Error('Price is required for limit orders');
      
      // Prepare the order request
      const orderRequest = {
        symbol: orderParams.symbol,
        side: orderParams.side.toLowerCase(),
        type: orderParams.type.toLowerCase(),
        quantity: orderParams.quantity.toString(),
        walletAddress: walletAddress
      };
      
      if (orderParams.type === 'limit') {
        orderRequest.price = orderParams.price.toString();
      }
      
      if (orderParams.timeInForce) {
        orderRequest.timeInForce = orderParams.timeInForce;
      }
      
      if (orderParams.clientOrderId) {
        orderRequest.clientOrderId = orderParams.clientOrderId;
      }
      
      // Get the unsigned transaction from the API
      const prepareResponse = await this.makeRequest('/orders/prepare', 'POST', orderRequest);
      
      if (!prepareResponse || !prepareResponse.success || !prepareResponse.data || !prepareResponse.data.transaction) {
        throw new Error('Failed to prepare order transaction');
      }
      
      // Sign the transaction
      const transaction = prepareResponse.data.transaction;
      const signedTransaction = await signTransaction(transaction);
      
      if (!signedTransaction) {
        throw new Error('Failed to sign transaction');
      }
      
      // Submit the signed transaction
      const submitResponse = await this.makeRequest('/orders/submit', 'POST', {
        signedTransaction: signedTransaction,
        orderRequest: orderRequest
      });
      
      if (submitResponse && submitResponse.success && submitResponse.data) {
        logger.info(`Order placed successfully: ${submitResponse.data.orderId}`);
        return submitResponse.data;
      } else {
        throw new Error('Failed to submit order');
      }
    } catch (error) {
      logger.error(`Photon placeOrder error: ${error.message}`);
      throw error;
    } finally {
      finishAppTransaction(transaction);
    }
  }

  /**
   * Cancel an order
   * 
   * @param {string} orderId - Order ID
   * @param {string} walletAddress - Wallet address
   * @param {Function} signTransaction - Function to sign transaction
   * @returns {Promise<Object>} - Cancellation result
   */
  async cancelOrder(orderId, walletAddress, signTransaction) {
    const transaction = startAppTransaction('photon-cancel-order', 'api.cancel');
    
    try {
      if (!this.initialized) {
        await this.initialize();
      }
      
      if (!orderId) {
        throw new Error('Order ID is required');
      }
      
      if (!walletAddress) {
        throw new Error('Wallet address is required');
      }
      
      if (!signTransaction || typeof signTransaction !== 'function') {
        throw new Error('Sign transaction function is required');
      }
      
      // Prepare the cancel request
      const cancelRequest = {
        orderId: orderId,
        walletAddress: walletAddress
      };
      
      // Get the unsigned transaction from the API
      const prepareResponse = await this.makeRequest('/orders/cancel/prepare', 'POST', cancelRequest);
      
      if (!prepareResponse || !prepareResponse.success || !prepareResponse.data || !prepareResponse.data.transaction) {
        throw new Error('Failed to prepare cancel transaction');
      }
      
      // Sign the transaction
      const transaction = prepareResponse.data.transaction;
      const signedTransaction = await signTransaction(transaction);
      
      if (!signedTransaction) {
        throw new Error('Failed to sign transaction');
      }
      
      // Submit the signed transaction
      const submitResponse = await this.makeRequest('/orders/cancel/submit', 'POST', {
        signedTransaction: signedTransaction,
        cancelRequest: cancelRequest
      });
      
      if (submitResponse && submitResponse.success && submitResponse.data) {
        logger.info(`Order cancelled successfully: ${orderId}`);
        return submitResponse.data;
      } else {
        throw new Error('Failed to cancel order');
      }
    } catch (error) {
      logger.error(`Photon cancelOrder error: ${error.message}`);
      throw error;
    } finally {
      finishAppTransaction(transaction);
    }
  }

  /**
   * Get new token listings
   * 
   * @param {number} limit - Number of listings to return (default: 20)
   * @returns {Promise<Array>} - New token listings
   */
  async getNewListings(limit = 20) {
    const transaction = startAppTransaction('photon-get-new-listings', 'api.listings');
    
    try {
      if (!this.initialized) {
        await this.initialize();
      }
      
      const response = await this.makeRequest(`/markets/new?limit=${limit}`);
      
      if (response && response.success && response.data) {
        return response.data;
      } else {
        throw new Error('Failed to get new token listings');
      }
    } catch (error) {
      logger.error(`Photon getNewListings error: ${error.message}`);
      throw error;
    } finally {
      finishAppTransaction(transaction);
    }
  }

  /**
   * Get trending tokens
   * 
   * @param {string} timeframe - Timeframe (1h, 24h, 7d)
   * @param {number} limit - Number of tokens to return (default: 20)
   * @returns {Promise<Array>} - Trending tokens
   */
  async getTrendingTokens(timeframe = '24h', limit = 20) {
    const transaction = startAppTransaction('photon-get-trending-tokens', 'api.trending');
    
    try {
      if (!this.initialized) {
        await this.initialize();
      }
      
      const response = await this.makeRequest(`/markets/trending?timeframe=${timeframe}&limit=${limit}`);
      
      if (response && response.success && response.data) {
        return response.data;
      } else {
        throw new Error('Failed to get trending tokens');
      }
    } catch (error) {
      logger.error(`Photon getTrendingTokens error: ${error.message}`);
      throw error;
    } finally {
      finishAppTransaction(transaction);
    }
  }

  /**
   * Get token information
   * 
   * @param {string} tokenAddress - Token address
   * @returns {Promise<Object>} - Token information
   */
  async getTokenInfo(tokenAddress) {
    const transaction = startAppTransaction('photon-get-token-info', 'api.token');
    
    try {
      if (!this.initialized) {
        await this.initialize();
      }
      
      if (!tokenAddress) {
        throw new Error('Token address is required');
      }
      
      const response = await this.makeRequest(`/tokens/${tokenAddress}`);
      
      if (response && response.success && response.data) {
        return response.data;
      } else {
        throw new Error(`Failed to get token info for ${tokenAddress}`);
      }
    } catch (error) {
      logger.error(`Photon getTokenInfo error: ${error.message}`);
      throw error;
    } finally {
      finishAppTransaction(transaction);
    }
  }

  /**
   * Make a request to the Photon API with retry logic
   * 
   * @param {string} endpoint - API endpoint
   * @param {string} method - HTTP method (default: 'GET')
   * @param {Object} data - Request data (for POST/PUT)
   * @returns {Promise<Object>} - API response
   */
  async makeRequest(endpoint, method = 'GET', data = null) {
    let retries = 0;
    let delay = this.retryConfig.initialDelay;
    
    while (true) {
      try {
        const url = `${this.baseUrl}${endpoint}`;
        
        const options = {
          method,
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        };
        
        if (data && (method === 'POST' || method === 'PUT')) {
          options.body = JSON.stringify(data);
        }
        
        const response = await fetch(url, options);
        
        // Handle rate limiting
        if (response.status === 429) {
          const retryAfter = parseInt(response.headers.get('Retry-After') || '5', 10);
          logger.warn(`Rate limited by Photon API. Retrying after ${retryAfter} seconds.`);
          await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
          continue; // Retry immediately after waiting
        }
        
        const responseData = await response.json();
        
        if (!response.ok) {
          throw new Error(`Photon API error (${response.status}): ${responseData.message || 'Unknown error'}`);
        }
        
        return responseData;
      } catch (error) {
        retries++;
        
        if (retries >= this.retryConfig.maxRetries) {
          logger.error(`Photon API request failed after ${retries} retries: ${error.message}`);
          throw error;
        }
        
        logger.warn(`Photon API request failed (retry ${retries}/${this.retryConfig.maxRetries}): ${error.message}`);
        
        // Exponential backoff with jitter
        const jitter = Math.random() * 0.3 + 0.85; // Random value between 0.85 and 1.15
        delay = Math.min(delay * 2 * jitter, this.retryConfig.maxDelay);
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.marketData.clear();
    this.cache.orderBook.clear();
    this.cache.tradingPairs = null;
    this.cache.tradingPairsTimestamp = 0;
    logger.info('Photon API cache cleared');
  }
}

// Create singleton instance
const photonApiClient = new PhotonApiClient();

export default photonApiClient;
