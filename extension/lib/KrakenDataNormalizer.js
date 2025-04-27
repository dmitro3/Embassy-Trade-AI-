/**
 * KrakenDataNormalizer.js
 * 
 * A utility for normalizing and caching market data from Kraken's WebSocket API.
 * Transforms raw WebSocket data into a consistent format for use by the AI model and UI.
 */

import { getKrakenWebSocketManager } from './KrakenWebSocketManager.js';

/**
 * Normalizes and caches market data from Kraken
 */
class KrakenDataNormalizer {
  /**
   * Create a new Kraken data normalizer
   */
  constructor() {
    this.webSocketManager = getKrakenWebSocketManager();
    this.initialized = false;
    
    // Cache for market data
    this.tickerCache = new Map();
    this.orderBookCache = new Map();
    this.tradesCache = new Map();
    
    // Maximum cache sizes
    this.maxCacheSize = {
      ticker: 100,
      orderBook: 50,
      trades: 50
    };
    
    // Maximum age for cached data (in milliseconds)
    this.maxCacheAge = {
      ticker: 60000, // 1 minute
      orderBook: 30000, // 30 seconds
      trades: 300000 // 5 minutes
    };
    
    // Subscriptions
    this.subscriptions = new Map();
    
    // Handler IDs
    this.handlerIds = {
      ticker: null,
      orderBook: null,
      trades: null
    };
    
    // Bind methods to maintain 'this' context
    this._handleTickerUpdate = this._handleTickerUpdate.bind(this);
    this._handleOrderBookUpdate = this._handleOrderBookUpdate.bind(this);
    this._handleTradesUpdate = this._handleTradesUpdate.bind(this);
  }
  
  /**
   * Initialize the data normalizer
   * 
   * @returns {Promise<boolean>} - Whether initialization was successful
   */
  async initialize() {
    try {
      // Initialize WebSocket manager if not already initialized
      if (!this.webSocketManager.connected.public) {
        await this.webSocketManager.initialize();
      }
      
      // Set up message handlers
      this.handlerIds.ticker = this.webSocketManager.addMessageHandler('ticker', this._handleTickerUpdate);
      this.handlerIds.orderBook = this.webSocketManager.addMessageHandler('book', this._handleOrderBookUpdate);
      this.handlerIds.trades = this.webSocketManager.addMessageHandler('trade', this._handleTradesUpdate);
      
      // Set up cache cleanup interval
      this._setupCacheCleanup();
      
      this.initialized = true;
      return true;
    } catch (error) {
      console.error('Failed to initialize Kraken data normalizer:', error);
      return false;
    }
  }
  
  /**
   * Subscribe to ticker updates for a symbol
   * 
   * @param {string} symbol - The symbol to subscribe to (e.g., 'XBT/USD')
   * @returns {Promise<Object>} - The subscription result
   */
  async subscribeToTicker(symbol) {
    try {
      // Ensure initialized
      if (!this.initialized) {
        await this.initialize();
      }
      
      // Check if already subscribed
      const subscriptionKey = `ticker:${symbol}`;
      if (this.subscriptions.has(subscriptionKey)) {
        return {
          success: true,
          subscriptionKey,
          message: 'Already subscribed'
        };
      }
      
      // Subscribe to ticker
      const result = await this.webSocketManager.subscribe('ticker', symbol);
      
      if (result.success) {
        // Store subscription
        this.subscriptions.set(subscriptionKey, {
          type: 'ticker',
          symbol,
          subscriptionKey: result.subscriptionKey
        });
        
        return {
          success: true,
          subscriptionKey
        };
      } else {
        throw new Error(result.error || 'Failed to subscribe to ticker');
      }
    } catch (error) {
      console.error(`Error subscribing to ticker for ${symbol}:`, error);
      
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Subscribe to order book updates for a symbol
   * 
   * @param {string} symbol - The symbol to subscribe to (e.g., 'XBT/USD')
   * @param {number} [depth=10] - The order book depth
   * @returns {Promise<Object>} - The subscription result
   */
  async subscribeToOrderBook(symbol, depth = 10) {
    try {
      // Ensure initialized
      if (!this.initialized) {
        await this.initialize();
      }
      
      // Check if already subscribed
      const subscriptionKey = `book:${symbol}:${depth}`;
      if (this.subscriptions.has(subscriptionKey)) {
        return {
          success: true,
          subscriptionKey,
          message: 'Already subscribed'
        };
      }
      
      // Subscribe to order book
      const result = await this.webSocketManager.subscribe('book', symbol, { depth });
      
      if (result.success) {
        // Store subscription
        this.subscriptions.set(subscriptionKey, {
          type: 'book',
          symbol,
          depth,
          subscriptionKey: result.subscriptionKey
        });
        
        return {
          success: true,
          subscriptionKey
        };
      } else {
        throw new Error(result.error || 'Failed to subscribe to order book');
      }
    } catch (error) {
      console.error(`Error subscribing to order book for ${symbol}:`, error);
      
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Subscribe to trades updates for a symbol
   * 
   * @param {string} symbol - The symbol to subscribe to (e.g., 'XBT/USD')
   * @returns {Promise<Object>} - The subscription result
   */
  async subscribeToTrades(symbol) {
    try {
      // Ensure initialized
      if (!this.initialized) {
        await this.initialize();
      }
      
      // Check if already subscribed
      const subscriptionKey = `trade:${symbol}`;
      if (this.subscriptions.has(subscriptionKey)) {
        return {
          success: true,
          subscriptionKey,
          message: 'Already subscribed'
        };
      }
      
      // Subscribe to trades
      const result = await this.webSocketManager.subscribe('trade', symbol);
      
      if (result.success) {
        // Store subscription
        this.subscriptions.set(subscriptionKey, {
          type: 'trade',
          symbol,
          subscriptionKey: result.subscriptionKey
        });
        
        return {
          success: true,
          subscriptionKey
        };
      } else {
        throw new Error(result.error || 'Failed to subscribe to trades');
      }
    } catch (error) {
      console.error(`Error subscribing to trades for ${symbol}:`, error);
      
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Unsubscribe from updates
   * 
   * @param {string} subscriptionKey - The subscription key to unsubscribe from
   * @returns {Promise<Object>} - The unsubscription result
   */
  async unsubscribe(subscriptionKey) {
    try {
      // Ensure initialized
      if (!this.initialized) {
        throw new Error('Kraken data normalizer not initialized');
      }
      
      // Check if subscribed
      if (!this.subscriptions.has(subscriptionKey)) {
        return {
          success: true,
          message: 'Not subscribed'
        };
      }
      
      // Get subscription
      const subscription = this.subscriptions.get(subscriptionKey);
      
      // Unsubscribe
      const result = await this.webSocketManager.unsubscribe(subscription.subscriptionKey);
      
      if (result.success) {
        // Remove subscription
        this.subscriptions.delete(subscriptionKey);
        
        return {
          success: true
        };
      } else {
        throw new Error(result.error || 'Failed to unsubscribe');
      }
    } catch (error) {
      console.error('Error unsubscribing:', error);
      
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Get ticker data for a symbol
   * 
   * @param {string} symbol - The symbol to get ticker data for
   * @returns {Object|null} - The ticker data or null if not available
   */
  getTicker(symbol) {
    // Check if ticker data is available
    if (!this.tickerCache.has(symbol)) {
      return null;
    }
    
    // Get ticker data
    const ticker = this.tickerCache.get(symbol);
    
    // Check if ticker data is too old
    if (Date.now() - ticker.timestamp > this.maxCacheAge.ticker) {
      return null;
    }
    
    return ticker;
  }
  
  /**
   * Get order book data for a symbol
   * 
   * @param {string} symbol - The symbol to get order book data for
   * @param {number} [depth=10] - The order book depth
   * @returns {Object|null} - The order book data or null if not available
   */
  getOrderBook(symbol, depth = 10) {
    // Check if order book data is available
    const key = `${symbol}:${depth}`;
    if (!this.orderBookCache.has(key)) {
      return null;
    }
    
    // Get order book data
    const orderBook = this.orderBookCache.get(key);
    
    // Check if order book data is too old
    if (Date.now() - orderBook.timestamp > this.maxCacheAge.orderBook) {
      return null;
    }
    
    return orderBook;
  }
  
  /**
   * Get trades data for a symbol
   * 
   * @param {string} symbol - The symbol to get trades data for
   * @param {number} [limit=100] - The maximum number of trades to return
   * @returns {Array|null} - The trades data or null if not available
   */
  getTrades(symbol, limit = 100) {
    // Check if trades data is available
    if (!this.tradesCache.has(symbol)) {
      return null;
    }
    
    // Get trades data
    const trades = this.tradesCache.get(symbol);
    
    // Check if trades data is too old
    if (Date.now() - trades.timestamp > this.maxCacheAge.trades) {
      return null;
    }
    
    // Return limited number of trades
    return {
      trades: trades.trades.slice(0, limit),
      timestamp: trades.timestamp
    };
  }
  
  /**
   * Handle ticker update
   * 
   * @param {Object} message - The ticker update message
   * @private
   */
  _handleTickerUpdate(message) {
    try {
      // Extract symbol and data
      const { symbol, data } = message;
      
      if (!symbol || !data) {
        return;
      }
      
      // Normalize ticker data
      const normalizedTicker = this._normalizeTicker(symbol, data);
      
      // Cache ticker data
      this.tickerCache.set(symbol, normalizedTicker);
      
      // Limit cache size
      this._limitCacheSize(this.tickerCache, this.maxCacheSize.ticker);
    } catch (error) {
      console.error('Error handling ticker update:', error);
    }
  }
  
  /**
   * Handle order book update
   * 
   * @param {Object} message - The order book update message
   * @private
   */
  _handleOrderBookUpdate(message) {
    try {
      // Extract symbol and data
      const { symbol, data } = message;
      
      if (!symbol || !data) {
        return;
      }
      
      // Extract depth from subscription
      const depth = data.depth || 10;
      
      // Create cache key
      const key = `${symbol}:${depth}`;
      
      // Get existing order book or create new one
      let orderBook = this.orderBookCache.get(key);
      
      if (!orderBook) {
        orderBook = {
          symbol,
          depth,
          asks: [],
          bids: [],
          timestamp: Date.now()
        };
      }
      
      // Update order book
      if (data.asks) {
        this._updateOrderBookSide(orderBook.asks, data.asks, depth, true);
      }
      
      if (data.bids) {
        this._updateOrderBookSide(orderBook.bids, data.bids, depth, false);
      }
      
      // Update timestamp
      orderBook.timestamp = Date.now();
      
      // Cache order book
      this.orderBookCache.set(key, orderBook);
      
      // Limit cache size
      this._limitCacheSize(this.orderBookCache, this.maxCacheSize.orderBook);
    } catch (error) {
      console.error('Error handling order book update:', error);
    }
  }
  
  /**
   * Handle trades update
   * 
   * @param {Object} message - The trades update message
   * @private
   */
  _handleTradesUpdate(message) {
    try {
      // Extract symbol and data
      const { symbol, data } = message;
      
      if (!symbol || !data || !Array.isArray(data)) {
        return;
      }
      
      // Get existing trades or create new ones
      let tradesData = this.tradesCache.get(symbol);
      
      if (!tradesData) {
        tradesData = {
          symbol,
          trades: [],
          timestamp: Date.now()
        };
      }
      
      // Normalize and add new trades
      const normalizedTrades = data.map(trade => this._normalizeTrade(symbol, trade));
      
      // Add to beginning of array (newest first)
      tradesData.trades.unshift(...normalizedTrades);
      
      // Limit number of trades
      if (tradesData.trades.length > 1000) {
        tradesData.trades = tradesData.trades.slice(0, 1000);
      }
      
      // Update timestamp
      tradesData.timestamp = Date.now();
      
      // Cache trades
      this.tradesCache.set(symbol, tradesData);
      
      // Limit cache size
      this._limitCacheSize(this.tradesCache, this.maxCacheSize.trades);
    } catch (error) {
      console.error('Error handling trades update:', error);
    }
  }
  
  /**
   * Normalize ticker data
   * 
   * @param {string} symbol - The symbol
   * @param {Object} data - The raw ticker data
   * @returns {Object} - The normalized ticker data
   * @private
   */
  _normalizeTicker(symbol, data) {
    return {
      symbol,
      ask: parseFloat(data.a?.[0] || 0),
      bid: parseFloat(data.b?.[0] || 0),
      last: parseFloat(data.c?.[0] || 0),
      volume: parseFloat(data.v?.[1] || 0),
      volumeWeightedAveragePrice: parseFloat(data.p?.[1] || 0),
      low: parseFloat(data.l?.[1] || 0),
      high: parseFloat(data.h?.[1] || 0),
      open: parseFloat(data.o?.[1] || 0),
      timestamp: Date.now()
    };
  }
  
  /**
   * Normalize trade data
   * 
   * @param {string} symbol - The symbol
   * @param {Object} data - The raw trade data
   * @returns {Object} - The normalized trade data
   * @private
   */
  _normalizeTrade(symbol, data) {
    return {
      symbol,
      price: parseFloat(data.price || 0),
      volume: parseFloat(data.volume || 0),
      time: data.time || Date.now(),
      side: data.side || 'buy',
      orderType: data.orderType || 'market',
      misc: data.misc || ''
    };
  }
  
  /**
   * Update order book side
   * 
   * @param {Array} side - The order book side to update
   * @param {Array} updates - The updates to apply
   * @param {number} depth - The order book depth
   * @param {boolean} isAsk - Whether this is the ask side
   * @private
   */
  _updateOrderBookSide(side, updates, depth, isAsk) {
    // Process each update
    for (const update of updates) {
      const price = parseFloat(update.price || update[0]);
      const volume = parseFloat(update.volume || update[1]);
      
      // Find existing price level
      const index = side.findIndex(level => parseFloat(level.price) === price);
      
      if (volume === 0) {
        // Remove price level
        if (index !== -1) {
          side.splice(index, 1);
        }
      } else {
        // Update or add price level
        if (index !== -1) {
          side[index] = { price, volume };
        } else {
          side.push({ price, volume });
        }
      }
    }
    
    // Sort price levels
    side.sort((a, b) => isAsk ? a.price - b.price : b.price - a.price);
    
    // Limit to depth
    if (side.length > depth) {
      side.length = depth;
    }
  }
  
  /**
   * Limit cache size
   * 
   * @param {Map} cache - The cache to limit
   * @param {number} maxSize - The maximum size
   * @private
   */
  _limitCacheSize(cache, maxSize) {
    if (cache.size <= maxSize) {
      return;
    }
    
    // Get entries sorted by timestamp (oldest first)
    const entries = Array.from(cache.entries())
      .sort((a, b) => a[1].timestamp - b[1].timestamp);
    
    // Remove oldest entries
    const entriesToRemove = entries.slice(0, cache.size - maxSize);
    
    for (const [key] of entriesToRemove) {
      cache.delete(key);
    }
  }
  
  /**
   * Set up cache cleanup
   * 
   * @private
   */
  _setupCacheCleanup() {
    // Clean up caches every minute
    setInterval(() => {
      this._cleanupCache(this.tickerCache, this.maxCacheAge.ticker);
      this._cleanupCache(this.orderBookCache, this.maxCacheAge.orderBook);
      this._cleanupCache(this.tradesCache, this.maxCacheAge.trades);
    }, 60000);
  }
  
  /**
   * Clean up cache
   * 
   * @param {Map} cache - The cache to clean up
   * @param {number} maxAge - The maximum age in milliseconds
   * @private
   */
  _cleanupCache(cache, maxAge) {
    const now = Date.now();
    
    for (const [key, value] of cache.entries()) {
      if (now - value.timestamp > maxAge) {
        cache.delete(key);
      }
    }
  }
  
  /**
   * Dispose of the data normalizer
   */
  dispose() {
    // Remove message handlers
    if (this.handlerIds.ticker) {
      this.webSocketManager.removeMessageHandler(this.handlerIds.ticker);
    }
    
    if (this.handlerIds.orderBook) {
      this.webSocketManager.removeMessageHandler(this.handlerIds.orderBook);
    }
    
    if (this.handlerIds.trades) {
      this.webSocketManager.removeMessageHandler(this.handlerIds.trades);
    }
    
    // Clear caches
    this.tickerCache.clear();
    this.orderBookCache.clear();
    this.tradesCache.clear();
    
    // Clear subscriptions
    this.subscriptions.clear();
    
    this.initialized = false;
  }
}

/**
 * Singleton instance of the Kraken data normalizer
 */
let krakenDataNormalizerInstance = null;

/**
 * Get the Kraken data normalizer instance
 * 
 * @returns {KrakenDataNormalizer} - The Kraken data normalizer instance
 */
function getKrakenDataNormalizer() {
  if (!krakenDataNormalizerInstance) {
    krakenDataNormalizerInstance = new KrakenDataNormalizer();
  }
  
  return krakenDataNormalizerInstance;
}

export { KrakenDataNormalizer, getKrakenDataNormalizer };
