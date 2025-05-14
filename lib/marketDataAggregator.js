'use client';

import { startAppTransaction, finishAppTransaction } from './sentryUtils.js';
import logger from './logger.js';
import axios from 'axios';
import shyftService from './shyftService.js';
import birdeyeService from './birdeyeService.js';
import { Connection } from '@solana/web3.js';
import WebSocket from 'isomorphic-ws';

/**
 * Market Data Aggregator
 * 
 * This service aggregates market data from various sources.
 * It provides a unified interface for accessing market data.
 */
class MarketDataAggregator {
  constructor() {
    this.initialized = false;
    this.cache = new Map();
    this.cacheTTL = 60000; // 1 minute cache TTL
    this.supportedSources = ['shyft', 'birdeye'];
    this.defaultSource = 'shyft'; // Default to real data instead of mock
    this.apiKeys = {
      shyft: process.env.NEXT_PUBLIC_SHYFT_API_KEY || 'whv00T87G8Sd8TeK',
      birdeye: process.env.NEXT_PUBLIC_BIRDEYE_API_KEY || '67f8ce614c594ab2b3efb742f8db69db',
      photon: process.env.NEXT_PUBLIC_PHOTON_API_KEY || '38HQ8wNk38Q4VCfrSfESGgggoefgPF9kaeZbYvLC6nKqGTLnQN136CLRiqi6e68yppFB5ypjwzjNCTdjyoieiQQe',
    };
    
    // WebSocket connection for real-time data
    this.ws = null;
    this.wsConnected = false;
    this.wsSubscriptions = new Map();
    this.wsReconnectAttempts = 0;
    this.wsMaxReconnectAttempts = 5;
    this.wsReconnectDelay = 2000; // 2 seconds initial delay
    
    // Token address mapping for common tokens
    this.tokenAddresses = {
      'SOL': 'So11111111111111111111111111111111111111112', // Native SOL
      'RAY': '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R', // Raydium
      'JUP': 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN', // Jupiter
      'BONK': 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263', // Bonk
    };
    
    // DevNet connection for token operations
    this.devnetConnection = new Connection('https://api.devnet.solana.com', 'confirmed');
    // List of catalyst types to track
    this.catalystTypes = [
      'news', 'product_launch', 'partnership', 'listing', 
      'token_burn', 'airdrop', 'protocol_upgrade'
    ];
    // Market trends tracking
    this.marketTrends = {
      lastUpdated: 0,
      overall: 'neutral', // bullish, bearish, neutral
      sectorTrends: {},
      volatility: 'medium' // low, medium, high
    };
  }

  /**
   * Initialize the market data aggregator (alias for init)
   */
  async initialize() {
    return this.init();
  }

  /**
   * Initialize the market data aggregator
   */
  async init() {
    const transaction = startAppTransaction('market-data-init', 'market.init');
    
    try {
      // Validate API keys
      if (!this.apiKeys.shyft) {
        logger.warn('SHYFT API key not found, using mock data for SHYFT');
      }
      
      if (!this.apiKeys.birdeye) {
        logger.warn('Birdeye API key not found, using mock data for Birdeye');
      }
      
      // Initialize WebSocket connection if in browser environment
      if (typeof window !== 'undefined') {
        this.initWebSocket();
      }
      
      this.initialized = true;
      logger.info('Market data aggregator initialized successfully');
      return true;
    } catch (error) {
      logger.error(`Market data aggregator initialization error: ${error.message}`);
      return false;
    } finally {
      finishAppTransaction(transaction);
    }
  }
  
  /**
   * Initialize WebSocket connection for real-time data
   */
  initWebSocket() {
    try {
      // Close existing connection if any
      if (this.ws) {
        this.ws.close();
        this.ws = null;
        this.wsConnected = false;
      }
      
      // Create new WebSocket connection
      const wsUrl = `wss://devnet-rpc.shyft.to?api_key=${this.apiKeys.shyft}`;
      this.ws = new WebSocket(wsUrl);
      
      // Set up event handlers
      this.ws.onopen = this.handleWebSocketOpen.bind(this);
      this.ws.onmessage = this.handleWebSocketMessage.bind(this);
      this.ws.onerror = this.handleWebSocketError.bind(this);
      this.ws.onclose = this.handleWebSocketClose.bind(this);
      
      logger.info('WebSocket connection initialized');
    } catch (error) {
      logger.error(`WebSocket initialization error: ${error.message}`);
    }
  }
  
  /**
   * Handle WebSocket open event
   */
  handleWebSocketOpen() {
    this.wsConnected = true;
    this.wsReconnectAttempts = 0;
    logger.info('WebSocket connection opened');
    
    // Resubscribe to all active subscriptions
    this.wsSubscriptions.forEach((callback, tokenAddress) => {
      this.subscribeToToken(tokenAddress, callback);
    });
  }
  
  /**
   * Handle WebSocket message event
   * 
   * @param {MessageEvent} event - WebSocket message event
   */
  handleWebSocketMessage(event) {
    try {
      const data = JSON.parse(event.data);
      
      // Handle different message types
      if (data.type === 'token_update') {
        // Handle token price update
        const callback = this.wsSubscriptions.get(data.tokenAddress);
        if (callback) {
          callback(data);
        }
        
        // Update cache
        const cacheKey = this.getCacheKey('price', data.tokenAddress, { source: 'shyft' });
        this.setCachedData(cacheKey, data.price);
      }
    } catch (error) {
      logger.error(`WebSocket message handling error: ${error.message}`);
    }
  }
  
  /**
   * Handle WebSocket error event
   * 
   * @param {Event} event - WebSocket error event
   */
  handleWebSocketError(event) {
    logger.error(`WebSocket error: ${event.message || 'Unknown error'}`);
  }
  
  /**
   * Handle WebSocket close event
   * 
   * @param {CloseEvent} event - WebSocket close event
   */
  handleWebSocketClose(event) {
    this.wsConnected = false;
    logger.warn(`WebSocket connection closed: ${event.code} - ${event.reason}`);
    
    // Attempt to reconnect if not a normal closure
    if (event.code !== 1000) {
      this.attemptReconnect();
    }
  }
  
  /**
   * Attempt to reconnect WebSocket
   */
  attemptReconnect() {
    if (this.wsReconnectAttempts >= this.wsMaxReconnectAttempts) {
      logger.error('Maximum WebSocket reconnect attempts reached');
      return;
    }
    
    // Exponential backoff
    const delay = this.wsReconnectDelay * Math.pow(2, this.wsReconnectAttempts);
    this.wsReconnectAttempts++;
    
    logger.info(`Attempting WebSocket reconnect in ${delay}ms (attempt ${this.wsReconnectAttempts})`);
    
    setTimeout(() => {
      this.initWebSocket();
    }, delay);
  }
  
  /**
   * Subscribe to real-time token updates
   * 
   * @param {string} tokenAddress - Token address
   * @param {Function} callback - Callback function for updates
   * @returns {boolean} - Whether subscription was successful
   */
  subscribeToToken(tokenAddress, callback) {
    try {
      if (!this.wsConnected) {
        logger.warn('WebSocket not connected, cannot subscribe');
        return false;
      }
      
      // Store subscription
      this.wsSubscriptions.set(tokenAddress, callback);
      
      // Send subscription message
      this.ws.send(JSON.stringify({
        type: 'subscribe',
        tokenAddress,
      }));
      
      logger.info(`Subscribed to token updates for ${tokenAddress}`);
      return true;
    } catch (error) {
      logger.error(`Token subscription error: ${error.message}`);
      return false;
    }
  }
  
  /**
   * Unsubscribe from token updates
   * 
   * @param {string} tokenAddress - Token address
   * @returns {boolean} - Whether unsubscription was successful
   */
  unsubscribeFromToken(tokenAddress) {
    try {
      if (!this.wsConnected) {
        logger.warn('WebSocket not connected, cannot unsubscribe');
        return false;
      }
      
      // Remove subscription
      this.wsSubscriptions.delete(tokenAddress);
      
      // Send unsubscription message
      this.ws.send(JSON.stringify({
        type: 'unsubscribe',
        tokenAddress,
      }));
      
      logger.info(`Unsubscribed from token updates for ${tokenAddress}`);
      return true;
    } catch (error) {
      logger.error(`Token unsubscription error: ${error.message}`);
      return false;
    }
  }

  /**
   * Check if the aggregator is initialized
   * 
   * @returns {boolean} - Whether the aggregator is initialized
   */
  isInitialized() {
    return this.initialized;
  }

  /**
   * Ensure the aggregator is initialized
   * 
   * @throws {Error} - If the aggregator is not initialized
   */
  ensureInitialized() {
    if (!this.initialized) {
      throw new Error('Market data aggregator not initialized');
    }
  }

  /**
   * Get cache key for a request
   * 
   * @param {string} type - Request type
   * @param {string} asset - Asset symbol or address
   * @param {Object} params - Request parameters
   * @returns {string} - Cache key
   */
  getCacheKey(type, asset, params = {}) {
    return `${type}:${asset}:${JSON.stringify(params)}`;
  }

  /**
   * Get cached data
   * 
   * @param {string} key - Cache key
   * @returns {Object|null} - Cached data or null if not found or expired
   */
  getCachedData(key) {
    const cachedItem = this.cache.get(key);
    
    if (!cachedItem) {
      return null;
    }
    
    const { data, timestamp } = cachedItem;
    const now = Date.now();
    
    if (now - timestamp > this.cacheTTL) {
      // Cache expired
      this.cache.delete(key);
      return null;
    }
    
    return data;
  }

  /**
   * Set cached data
   * 
   * @param {string} key - Cache key
   * @param {Object} data - Data to cache
   */
  setCachedData(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  /**
   * Get current price for an asset
   * 
   * @param {string} asset - Asset symbol or address
   * @param {Object} options - Request options
   * @returns {Promise<number>} - Current price
   */
  async getCurrentPrice(asset, options = {}) {
    const transaction = startAppTransaction('market-data-price', 'market.price');
    
    try {
      this.ensureInitialized();
      
      const {
        source = this.defaultSource,
        forceRefresh = false,
      } = options;
      
      // Check cache if not forcing refresh
      if (!forceRefresh) {
        const cacheKey = this.getCacheKey('price', asset, { source });
        const cachedData = this.getCachedData(cacheKey);
        
        if (cachedData !== null) {
          return cachedData;
        }
      }
      
      // Fetch price from source
      let price;
      
      switch (source) {
        case 'shyft':
          price = await this.getPriceFromShyft(asset);
          break;
        case 'birdeye':
          price = await this.getPriceFromBirdeye(asset);
          break;
        case 'mock':
        default:
          price = this.getMockPrice(asset);
          break;
      }
      
      // Cache price
      const cacheKey = this.getCacheKey('price', asset, { source });
      this.setCachedData(cacheKey, price);
      
      return price;
    } catch (error) {
      logger.error(`Error getting current price for ${asset}: ${error.message}`);
      throw error;
    } finally {
      finishAppTransaction(transaction);
    }
  }

  /**
   * Get price from SHYFT API
   * 
   * @param {string} asset - Asset symbol or address
   * @returns {Promise<number>} - Current price
   */
  async getPriceFromShyft(asset) {
    try {
      if (!this.apiKeys.shyft) {
        logger.warn('SHYFT API key not found, using mock data');
        return this.getMockPrice(asset);
      }
      
      // Determine if asset is a token address or symbol
      const isAddress = /^[A-HJ-NP-Za-km-z1-9]{32,44}$/.test(asset);
      
      // Construct API URL
      let url;
      
      if (isAddress) {
        url = `https://api.shyft.to/sol/v1/token/price?network=mainnet-beta&token_address=${asset}`;
      } else {
        // For symbols, we would need a mapping to addresses
        // For now, use mock data for symbols
        logger.warn(`SHYFT API requires token address, not symbol. Using mock data for ${asset}`);
        return this.getMockPrice(asset);
      }
      
      // Make API request
      const response = await axios.get(url, {
        headers: {
          'x-api-key': this.apiKeys.shyft,
        },
      });
      
      // Extract price from response
      if (response.data && response.data.result && response.data.result.value) {
        return parseFloat(response.data.result.value);
      }
      
      throw new Error('Invalid response from SHYFT API');
    } catch (error) {
      logger.error(`Error getting price from SHYFT for ${asset}: ${error.message}`);
      return this.getMockPrice(asset);
    }
  }

  /**
   * Get price from Birdeye API
   * 
   * @param {string} asset - Asset symbol or address
   * @returns {Promise<number>} - Current price
   */
  async getPriceFromBirdeye(asset) {
    try {
      if (!this.apiKeys.birdeye) {
        logger.warn('Birdeye API key not found, using mock data');
        return this.getMockPrice(asset);
      }
      
      // Determine if asset is a token address or symbol
      const isAddress = /^[A-HJ-NP-Za-km-z1-9]{32,44}$/.test(asset);
      
      // Construct API URL
      let url;
      
      if (isAddress) {
        url = `https://public-api.birdeye.so/public/price?address=${asset}`;
      } else {
        // For symbols, we would need a mapping to addresses
        // For now, use mock data for symbols
        logger.warn(`Birdeye API requires token address, not symbol. Using mock data for ${asset}`);
        return this.getMockPrice(asset);
      }
      
      // Make API request
      const response = await axios.get(url, {
        headers: {
          'X-API-KEY': this.apiKeys.birdeye,
        },
      });
      
      // Extract price from response
      if (response.data && response.data.data && response.data.data.value) {
        return parseFloat(response.data.data.value);
      }
      
      throw new Error('Invalid response from Birdeye API');
    } catch (error) {
      logger.error(`Error getting price from Birdeye for ${asset}: ${error.message}`);
      return this.getMockPrice(asset);
    }
  }

  /**
   * Get mock price for an asset
   * 
   * @param {string} asset - Asset symbol or address
   * @returns {number} - Mock price
   */
  getMockPrice(asset) {
    // Generate a deterministic but somewhat random price based on the asset name
    const hash = Array.from(asset).reduce((sum, char) => sum + char.charCodeAt(0), 0);
    const basePrice = (hash % 1000) + 1; // 1 to 1000
    
    // Add some randomness
    const randomFactor = 0.95 + (Math.random() * 0.1); // 0.95 to 1.05
    
    return basePrice * randomFactor;
  }

  /**
   * Get historical OHLCV data for an asset
   * 
   * @param {string} asset - Asset symbol or address
   * @param {Object} options - Request options
   * @returns {Promise<Array<Object>>} - Historical OHLCV data
   */
  async getHistoricalOHLCV(asset, options = {}) {
    const transaction = startAppTransaction('market-data-ohlcv', 'market.ohlcv');
    
    try {
      this.ensureInitialized();
      
      const {
        source = this.defaultSource,
        interval = '1d',
        limit = 100,
        forceRefresh = false,
      } = options;
      
      // Check cache if not forcing refresh
      if (!forceRefresh) {
        const cacheKey = this.getCacheKey('ohlcv', asset, { source, interval, limit });
        const cachedData = this.getCachedData(cacheKey);
        
        if (cachedData !== null) {
          return cachedData;
        }
      }
      
      // Fetch OHLCV from source
      let ohlcv;
      
      switch (source) {
        case 'shyft':
          ohlcv = await this.getOHLCVFromShyft(asset, interval, limit);
          break;
        case 'birdeye':
          ohlcv = await this.getOHLCVFromBirdeye(asset, interval, limit);
          break;
        case 'mock':
        default:
          ohlcv = this.getMockOHLCV(asset, interval, limit);
          break;
      }
      
      // Cache OHLCV
      const cacheKey = this.getCacheKey('ohlcv', asset, { source, interval, limit });
      this.setCachedData(cacheKey, ohlcv);
      
      return ohlcv;
    } catch (error) {
      logger.error(`Error getting historical OHLCV for ${asset}: ${error.message}`);
      throw error;
    } finally {
      finishAppTransaction(transaction);
    }
  }

  /**
   * Get OHLCV from SHYFT API
   * 
   * @param {string} asset - Asset symbol or address
   * @param {string} interval - Time interval
   * @param {number} limit - Number of candles
   * @returns {Promise<Array<Object>>} - Historical OHLCV data
   */
  async getOHLCVFromShyft(asset, interval, limit) {
    try {
      if (!this.apiKeys.shyft) {
        logger.warn('SHYFT API key not found, using mock data');
        return this.getMockOHLCV(asset, interval, limit);
      }
      
      // SHYFT doesn't have a direct OHLCV endpoint for tokens
      // For now, use mock data
      logger.warn('SHYFT API does not support OHLCV data, using mock data');
      return this.getMockOHLCV(asset, interval, limit);
    } catch (error) {
      logger.error(`Error getting OHLCV from SHYFT for ${asset}: ${error.message}`);
      return this.getMockOHLCV(asset, interval, limit);
    }
  }

  /**
   * Get OHLCV from Birdeye API
   * 
   * @param {string} asset - Asset symbol or address
   * @param {string} interval - Time interval
   * @param {number} limit - Number of candles
   * @returns {Promise<Array<Object>>} - Historical OHLCV data
   */
  async getOHLCVFromBirdeye(asset, interval, limit) {
    try {
      if (!this.apiKeys.birdeye) {
        logger.warn('Birdeye API key not found, using mock data');
        return this.getMockOHLCV(asset, interval, limit);
      }
      
      // Determine if asset is a token address or symbol
      const isAddress = /^[A-HJ-NP-Za-km-z1-9]{32,44}$/.test(asset);
      
      if (!isAddress) {
        // For symbols, we would need a mapping to addresses
        // For now, use mock data for symbols
        logger.warn(`Birdeye API requires token address, not symbol. Using mock data for ${asset}`);
        return this.getMockOHLCV(asset, interval, limit);
      }
      
      // Map interval to Birdeye format
      const birdeyeInterval = this.mapIntervalToBirdeye(interval);
      
      // Construct API URL
      const url = `https://public-api.birdeye.so/public/candles?address=${asset}&interval=${birdeyeInterval}&limit=${limit}`;
      
      // Make API request
      const response = await axios.get(url, {
        headers: {
          'X-API-KEY': this.apiKeys.birdeye,
        },
      });
      
      // Extract OHLCV from response
      if (response.data && response.data.data && Array.isArray(response.data.data)) {
        return response.data.data.map(candle => ({
          timestamp: candle.time * 1000, // Convert to milliseconds
          open: parseFloat(candle.open),
          high: parseFloat(candle.high),
          low: parseFloat(candle.low),
          close: parseFloat(candle.close),
          volume: parseFloat(candle.volume),
        }));
      }
      
      throw new Error('Invalid response from Birdeye API');
    } catch (error) {
      logger.error(`Error getting OHLCV from Birdeye for ${asset}: ${error.message}`);
      return this.getMockOHLCV(asset, interval, limit);
    }
  }

  /**
   * Map interval to Birdeye format
   * 
   * @param {string} interval - Time interval
   * @returns {string} - Birdeye interval
   */
  mapIntervalToBirdeye(interval) {
    const map = {
      '1m': '1',
      '5m': '5',
      '15m': '15',
      '30m': '30',
      '1h': '60',
      '4h': '240',
      '1d': '1D',
      '1w': '1W',
    };
    
    return map[interval] || '1D';
  }

  /**
   * Get mock OHLCV data for an asset
   * 
   * @param {string} asset - Asset symbol or address
   * @param {string} interval - Time interval
   * @param {number} limit - Number of candles
   * @returns {Array<Object>} - Mock OHLCV data
   */
  getMockOHLCV(asset, interval, limit) {
    // Generate a deterministic but somewhat random base price
    const hash = Array.from(asset).reduce((sum, char) => sum + char.charCodeAt(0), 0);
    const basePrice = (hash % 1000) + 1; // 1 to 1000
    
    // Generate candles
    const candles = [];
    const now = Date.now();
    let currentPrice = basePrice;
    
    // Determine time step based on interval
    const timeStep = this.getTimeStepFromInterval(interval);
    
    for (let i = 0; i < limit; i++) {
      // Calculate timestamp for this candle
      const timestamp = now - (timeStep * (limit - i - 1));
      
      // Generate price movement
      const priceChange = (Math.random() - 0.5) * 0.05 * currentPrice; // -2.5% to +2.5%
      const open = currentPrice;
      const close = currentPrice + priceChange;
      
      // Generate high and low
      const volatility = currentPrice * 0.03; // 3% volatility
      const high = Math.max(open, close) + (Math.random() * volatility);
      const low = Math.min(open, close) - (Math.random() * volatility);
      
      // Generate volume
      const volume = currentPrice * (100 + Math.random() * 900); // 100 to 1000 units * price
      
      // Add candle
      candles.push({
        timestamp,
        open,
        high,
        low,
        close,
        volume,
      });
      
      // Update current price for next candle
      currentPrice = close;
    }
    
    return candles;
  }

  /**
   * Get time step from interval
   * 
   * @param {string} interval - Time interval
   * @returns {number} - Time step in milliseconds
   */
  getTimeStepFromInterval(interval) {
    const minute = 60 * 1000;
    const hour = 60 * minute;
    const day = 24 * hour;
    const week = 7 * day;
    
    const map = {
      '1m': minute,
      '5m': 5 * minute,
      '15m': 15 * minute,
      '30m': 30 * minute,
      '1h': hour,
      '4h': 4 * hour,
      '1d': day,
      '1w': week,
    };
    
    return map[interval] || day;
  }

  /**
   * Get token information
   * 
   * @param {string} asset - Asset symbol or address
   * @param {Object} options - Request options
   * @returns {Promise<Object>} - Token information
   */
  async getTokenInfo(asset, options = {}) {
    const transaction = startAppTransaction('market-data-token', 'market.token');
    
    try {
      this.ensureInitialized();
      
      const {
        source = this.defaultSource,
        forceRefresh = false,
      } = options;
      
      // If asset is a symbol, convert to address
      let tokenAddress = asset;
      if (this.tokenAddresses[asset]) {
        tokenAddress = this.tokenAddresses[asset];
      }
      
      // Check cache if not forcing refresh
      if (!forceRefresh) {
        const cacheKey = this.getCacheKey('token', tokenAddress, { source });
        const cachedData = this.getCachedData(cacheKey);
        
        if (cachedData !== null) {
          return cachedData;
        }
      }
      
      // Fetch token info from source
      let tokenInfo;
      
      switch (source) {
        case 'shyft':
          tokenInfo = await this.getTokenInfoFromShyft(tokenAddress);
          break;
        case 'birdeye':
          tokenInfo = await this.getTokenInfoFromBirdeye(tokenAddress);
          break;
        case 'mock':
        default:
          tokenInfo = this.getMockTokenInfo(tokenAddress);
          break;
      }
      
      // Cache token info
      const cacheKey = this.getCacheKey('token', tokenAddress, { source });
      this.setCachedData(cacheKey, tokenInfo);
      
      return tokenInfo;
    } catch (error) {
      logger.error(`Error getting token info for ${asset}: ${error.message}`);
      throw error;
    } finally {
      finishAppTransaction(transaction);
    }
  }
  
  /**
   * Get multiple tokens data
   * 
   * @param {Array<string>} symbols - Array of token symbols
   * @returns {Promise<Array<Object>>} - Array of token data
   */
  async getMultipleTokensData(symbols = ['SOL', 'RAY', 'JUP', 'BONK']) {
    try {
      this.ensureInitialized();
      
      // Map symbols to addresses
      const tokenAddresses = symbols.map(symbol => 
        this.tokenAddresses[symbol] || symbol
      );
      
      // Fetch data for all tokens in parallel
      const tokenDataPromises = tokenAddresses.map(async (address) => {
        try {
          const tokenInfo = await this.getTokenInfo(address);
          const price = await this.getCurrentPrice(address);
          
          // Generate random price change for now (will be replaced with real data)
          const priceChangePercent24h = (Math.random() * 20) - 10; // -10% to +10%
          
          return {
            address,
            symbol: tokenInfo.symbol,
            name: tokenInfo.name,
            price,
            priceChangePercent24h,
            volume24h: price * (1000000 + Math.random() * 9000000), // Random volume
            marketCap: price * (10000000 + Math.random() * 90000000), // Random market cap
            logoURI: tokenInfo.logoURI,
          };
        } catch (error) {
          logger.error(`Error fetching data for token ${address}: ${error.message}`);
          return null;
        }
      });
      
      // Wait for all promises to resolve
      const tokensData = await Promise.all(tokenDataPromises);
      
      // Filter out null values (failed fetches)
      return tokensData.filter(token => token !== null);
    } catch (error) {
      logger.error(`Error fetching multiple tokens data: ${error.message}`);
      return [];
    }
  }

  /**
   * Get token info from SHYFT API
   * 
   * @param {string} asset - Asset symbol or address
   * @returns {Promise<Object>} - Token information
   */
  async getTokenInfoFromShyft(asset) {
    try {
      if (!this.apiKeys.shyft) {
        logger.warn('SHYFT API key not found, using mock data');
        return this.getMockTokenInfo(asset);
      }
      
      // Determine if asset is a token address or symbol
      const isAddress = /^[A-HJ-NP-Za-km-z1-9]{32,44}$/.test(asset);
      
      if (!isAddress) {
        // For symbols, we would need a mapping to addresses
        // For now, use mock data for symbols
        logger.warn(`SHYFT API requires token address, not symbol. Using mock data for ${asset}`);
        return this.getMockTokenInfo(asset);
      }
      
      // Construct API URL
      const url = `https://api.shyft.to/sol/v1/token/get_info?network=mainnet-beta&token_address=${asset}`;
      
      // Make API request
      const response = await axios.get(url, {
        headers: {
          'x-api-key': this.apiKeys.shyft,
        },
      });
      
      // Extract token info from response
      if (response.data && response.data.result) {
        const result = response.data.result;
        
        return {
          address: asset,
          symbol: result.symbol || '',
          name: result.name || '',
          decimals: result.decimals || 9,
          logoURI: result.logo || '',
          coingeckoId: result.coingecko_id || '',
        };
      }
      
      throw new Error('Invalid response from SHYFT API');
    } catch (error) {
      logger.error(`Error getting token info from SHYFT for ${asset}: ${error.message}`);
      return this.getMockTokenInfo(asset);
    }
  }

  /**
   * Get token info from Birdeye API
   * 
   * @param {string} asset - Asset symbol or address
   * @returns {Promise<Object>} - Token information
   */
  async getTokenInfoFromBirdeye(asset) {
    try {
      if (!this.apiKeys.birdeye) {
        logger.warn('Birdeye API key not found, using mock data');
        return this.getMockTokenInfo(asset);
      }
      
      // Determine if asset is a token address or symbol
      const isAddress = /^[A-HJ-NP-Za-km-z1-9]{32,44}$/.test(asset);
      
      if (!isAddress) {
        // For symbols, we would need a mapping to addresses
        // For now, use mock data for symbols
        logger.warn(`Birdeye API requires token address, not symbol. Using mock data for ${asset}`);
        return this.getMockTokenInfo(asset);
      }
      
      // Construct API URL
      const url = `https://public-api.birdeye.so/public/token_list?address=${asset}`;
      
      // Make API request
      const response = await axios.get(url, {
        headers: {
          'X-API-KEY': this.apiKeys.birdeye,
        },
      });
      
      // Extract token info from response
      if (response.data && response.data.data && response.data.data.length > 0) {
        const token = response.data.data[0];
        
        return {
          address: asset,
          symbol: token.symbol || '',
          name: token.name || '',
          decimals: token.decimals || 9,
          logoURI: token.logoURI || '',
          coingeckoId: '',
        };
      }
      
      throw new Error('Invalid response from Birdeye API');
    } catch (error) {
      logger.error(`Error getting token info from Birdeye for ${asset}: ${error.message}`);
      return this.getMockTokenInfo(asset);
    }
  }

  /**
   * Get mock token info for an asset
   * 
   * @param {string} asset - Asset symbol or address
   * @returns {Object} - Mock token information
   */
  getMockTokenInfo(asset) {
    // Determine if asset is a token address or symbol
    const isAddress = /^[A-HJ-NP-Za-km-z1-9]{32,44}$/.test(asset);
    
    if (isAddress) {
      // Generate mock token info for address
      return {
        address: asset,
        symbol: `TKN${asset.substring(0, 3).toUpperCase()}`,
        name: `Token ${asset.substring(0, 6)}`,
        decimals: 9,
        logoURI: '',
        coingeckoId: '',
      };
    } else {
      // Generate mock token info for symbol
      return {
        address: `11111111111111111111111111${asset}`,
        symbol: asset,
        name: `${asset} Token`,
        decimals: 9,
        logoURI: '',
        coingeckoId: '',
      };
    }
  }
}

// Create singleton instance
const marketDataAggregator = new MarketDataAggregator();

export default marketDataAggregator;
