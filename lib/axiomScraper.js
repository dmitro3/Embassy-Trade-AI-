'use client';

import { startAppTransaction, finishAppTransaction } from './sentryUtils.js';
import logger from './logger.js';

/**
 * AXIOM Web Scraper Service
 * 
 * This service provides a web scraper for AXIOM Markets data,
 * allowing for integration with the TradeForce AI Trading Agent.
 * 
 * Note: Web scraping is used as a fallback since AXIOM doesn't provide an official API.
 * This approach may break if the website structure changes.
 */
class AxiomScraper {  constructor() {
    this.baseUrl = 'https://axiom.markets';
    this.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';
    this.initialized = false;
    this.cacheExpiry = 5 * 60 * 1000; // 5 minutes
    this.cache = {
      tokenData: new Map(),
      trendingTokens: null,
      trendingTokensTimestamp: 0
    };
    this.useMockData = false;
    this.mockData = {
      trendingTokens: [],
      tokenData: {}
    };
  }  /**
   * Initialize the AXIOM scraper
   * @param {number} maxRetries - Maximum number of retry attempts (default: 3)
   * @param {number} retryDelay - Delay between retries in milliseconds (default: 2000)
   * @returns {Promise<boolean>} - Initialization status
   */  async initialize(maxRetries = 3, retryDelay = 2000) {
    const transaction = startAppTransaction('axiom-initialize', 'scraper.init');
    
    try {
      logger.info('AXIOM scraper is completely disabled');
      
      // AXIOM scraper is now completely disabled by design
      this.initialized = true; // Set to true so the system knows initialization was completed
      
      // Log that AXIOM is disabled
      logger.info('AXIOM functionality is disabled intentionally due to persistent connectivity issues');
      
      // Use mock data as fallback to ensure system can continue operating
      logger.info('Using mock data as fallback for AXIOM functionality');
      this.useMockData = true;
      this.initializeMockData();
      
      // Return true to indicate initialization was successful (even though AXIOM is disabled)
      return true;
    } catch (error) {
      logger.error(`AXIOM scraper initialization error: ${error.message}`);
      
      try {
        // Try to initialize with blockchain data if possible
        const blockchainInitSuccess = await this.tryInitializeWithBlockchainData();
        if (blockchainInitSuccess) {
          return true;
        }
        
        // If blockchain data initialization also fails, use mock data as last resort
        logger.info('Falling back to mock data to allow system to operate.');
        this.useMockData = true;
        
        // Initialize the system with mock data to prevent further errors
        this.initializeMockData();
        
        // Even though we're using mock data, we mark the scraper as initialized
        // to prevent further initialization attempts and allow the system to operate
        this.initialized = true;
        
        logger.info('AXIOM integration is now using mock data. Using SHYFT and Birdeye as primary data sources.');
        return true;
      } catch (nestedError) {
        logger.error(`AXIOM scraper secondary initialization error: ${nestedError.message}`);
        logger.error(`AXIOM initialization stack trace: ${nestedError.stack}`);
        return false;
      }
    } finally {
      finishAppTransaction(transaction);
    }
  }

  /**
   * Make a request to the AXIOM website
   * 
   * @param {string} path - URL path
   * @returns {Promise<string>} - HTML response
   */
  async makeRequest(path) {
    try {
      const url = `${this.baseUrl}${path}`;
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml'
        }
      });
      
      if (!response.ok) {
        throw new Error(`AXIOM request error (${response.status}): ${response.statusText}`);
      }
      
      return await response.text();
    } catch (error) {
      logger.error(`AXIOM request error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Extract JSON data from HTML script tags
   * 
   * @param {string} html - HTML content
   * @param {string} variableName - Variable name to extract
   * @returns {Object|null} - Extracted JSON data
   */
  extractJsonFromHtml(html, variableName) {
    try {
      const regex = new RegExp(`${variableName}\\s*=\\s*(\\{[\\s\\S]*?\\});`, 'i');
      const match = html.match(regex);
      
      if (match && match[1]) {
        // Use Function constructor to safely evaluate the JSON string
        // This is safer than eval() but still requires caution
        const jsonStr = match[1].replace(/\\n/g, '').replace(/\\"/g, '"');
        return Function(`"use strict"; return (${jsonStr})`)();
      }
      
      return null;
    } catch (error) {
      logger.error(`Failed to extract JSON data: ${error.message}`);
      return null;
    }
  }

  /**
   * Extract chart data from HTML
   * 
   * @param {string} html - HTML content
   * @returns {Array|null} - Chart data
   */
  extractChartData(html) {
    try {
      return this.extractJsonFromHtml(html, 'chartData');
    } catch (error) {
      logger.error(`Failed to extract chart data: ${error.message}`);
      return null;
    }
  }

  /**
   * Extract token info from HTML
   * 
   * @param {string} html - HTML content
   * @returns {Object|null} - Token info
   */
  extractTokenInfo(html) {
    try {
      return this.extractJsonFromHtml(html, 'tokenInfo');
    } catch (error) {
      logger.error(`Failed to extract token info: ${error.message}`);
      return null;
    }
  }

  /**
   * Parse HTML to extract token data
   * 
   * @param {string} html - HTML content
   * @param {string} tokenSymbol - Token symbol
   * @returns {Object} - Parsed token data
   */
  parseTokenData(html, tokenSymbol) {
    try {
      // Extract token info and chart data from HTML
      const tokenInfo = this.extractTokenInfo(html);
      const chartData = this.extractChartData(html);
      
      // Extract price from HTML
      const priceMatch = html.match(/<div[^>]*class="[^"]*token-price[^"]*"[^>]*>([\d,.]+)<\/div>/i);
      const price = priceMatch ? priceMatch[1].replace(/,/g, '') : null;
      
      // Extract market cap from HTML
      const marketCapMatch = html.match(/<div[^>]*class="[^"]*market-cap[^"]*"[^>]*>\$?([\d,.]+[KMB]?)<\/div>/i);
      const marketCap = marketCapMatch ? marketCapMatch[1] : null;
      
      // Extract 24h volume from HTML
      const volumeMatch = html.match(/<div[^>]*class="[^"]*volume-24h[^"]*"[^>]*>\$?([\d,.]+[KMB]?)<\/div>/i);
      const volume24h = volumeMatch ? volumeMatch[1] : null;
      
      // Extract price change from HTML
      const priceChangeMatch = html.match(/<div[^>]*class="[^"]*price-change[^"]*"[^>]*>([\+\-]?[\d,.]+%)<\/div>/i);
      const priceChange24h = priceChangeMatch ? priceChangeMatch[1] : null;
      
      return {
        symbol: tokenSymbol,
        name: tokenInfo?.name || tokenSymbol,
        price: price,
        marketCap: marketCap,
        volume24h: volume24h,
        priceChange24h: priceChange24h,
        contractAddress: tokenInfo?.contractAddress || null,
        chartData: chartData || [],
        tokenInfo: tokenInfo || {}
      };
    } catch (error) {
      logger.error(`Failed to parse token data: ${error.message}`);
      return {
        symbol: tokenSymbol,
        error: error.message
      };
    }
  }

  /**
   * Get token data
   * 
   * @param {string} tokenSymbol - Token symbol
   * @returns {Promise<Object>} - Token data
   */
  async getTokenData(tokenSymbol) {
    const transaction = startAppTransaction('axiom-get-token-data', 'scraper.token');
    
    try {
      if (!this.initialized) {
        await this.initialize();
      }
      
      // Check cache first
      const cacheKey = tokenSymbol.toLowerCase();
      const cachedData = this.cache.tokenData.get(cacheKey);
      
      if (cachedData && (Date.now() - cachedData.timestamp) < this.cacheExpiry) {
        return cachedData.data;
      }
      
      // Fetch token data
      const html = await this.makeRequest(`/token/${tokenSymbol}`);
      const tokenData = this.parseTokenData(html, tokenSymbol);
      
      // Cache the result
      this.cache.tokenData.set(cacheKey, {
        data: tokenData,
        timestamp: Date.now()
      });
      
      return tokenData;
    } catch (error) {
      logger.error(`AXIOM getTokenData error: ${error.message}`);
      throw error;
    } finally {
      finishAppTransaction(transaction);
    }
  }

  /**
   * Parse HTML to extract trending tokens
   * 
   * @param {string} html - HTML content
   * @returns {Array} - Trending tokens
   */
  parseTrendingTokens(html) {
    try {
      const tokens = [];
      
      // Use regex to extract trending tokens
      const regex = /<div[^>]*class="[^"]*trending-token[^"]*"[^>]*>[\s\S]*?<div[^>]*class="[^"]*token-symbol[^"]*"[^>]*>([^<]+)<\/div>[\s\S]*?<div[^>]*class="[^"]*token-name[^"]*"[^>]*>([^<]+)<\/div>[\s\S]*?<div[^>]*class="[^"]*token-price[^"]*"[^>]*>([^<]+)<\/div>[\s\S]*?<div[^>]*class="[^"]*token-change[^"]*"[^>]*>([\+\-]?[\d,.]+%)<\/div>/gi;
      
      let match;
      while ((match = regex.exec(html)) !== null) {
        tokens.push({
          symbol: match[1].trim(),
          name: match[2].trim(),
          price: match[3].trim(),
          change: match[4].trim()
        });
      }
      
      return tokens;
    } catch (error) {
      logger.error(`Failed to parse trending tokens: ${error.message}`);
      return [];
    }
  }
  /**
   * Get trending tokens
   * 
   * @returns {Promise<Array>} - Trending tokens
   */
  async getTrendingTokens() {
    const transaction = startAppTransaction('axiom-get-trending-tokens', 'scraper.trending');
    
    try {
      if (!this.initialized && !this.initializing) {
        this.initializing = true;
      }
      
      // Check cache first
      if (this.cache.trendingTokens && (Date.now() - this.cache.trendingTokensTimestamp) < this.cacheExpiry) {
        return this.cache.trendingTokens;
      }
      
      // If using blockchain data and wallet is connected, get data from blockchain sources
      if (this.usingBlockchainData || this.isWalletConnected()) {
        try {
          // Import required services
          const birdeyeService = require('./birdeyeService').default;
          
          // Get top tokens from Birdeye
          const topTokensResponse = await birdeyeService.getTopTokens();
          
          if (topTokensResponse && topTokensResponse.success && topTokensResponse.data && topTokensResponse.data.length > 0) {
            // Transform Birdeye data to AXIOM format
            const trendingTokens = topTokensResponse.data.map(token => ({
              symbol: token.symbol || token.name,
              name: token.name,
              price: token.price ? token.price.toString() : '0',
              change: token.priceChangePercent24h ? 
                `${token.priceChangePercent24h > 0 ? '+' : ''}${token.priceChangePercent24h.toFixed(2)}%` : '0.00%'
            }));
            
            // Cache the result
            this.cache.trendingTokens = trendingTokens;
            this.cache.trendingTokensTimestamp = Date.now();
            
            if (this.initializing) {
              this.initializing = false;
              this.initialized = true;
              this.usingBlockchainData = true;
            }
            
            logger.info(`Retrieved ${trendingTokens.length} trending tokens from blockchain data`);
            return trendingTokens;
          }
        } catch (blockchainError) {
          logger.warn(`Error getting blockchain trending tokens: ${blockchainError.message}`);
          logger.warn('Falling back to web scraping approach');
          // Continue with web scraping approach if blockchain data fails
        }
      }
      
      // If mock data is being used, return mock trending tokens
      if (this.useMockData) {
        if (this.initializing) {
          this.initializing = false;
          this.initialized = true;
        }
        return this.mockData.trendingTokens;
      }
      
      // Traditional web scraping approach
      const html = await this.makeRequest('/trending');
      const trendingTokens = this.parseTrendingTokens(html);
      
      // Cache the result
      this.cache.trendingTokens = trendingTokens;
      this.cache.trendingTokensTimestamp = Date.now();
      
      if (this.initializing) {
        this.initializing = false;
        this.initialized = true;
      }
      
      return trendingTokens;
    } catch (error) {
      logger.error(`AXIOM getTrendingTokens error: ${error.message}`);
      
      if (this.initializing) {
        this.initializing = false;
      }
      
      // If we have mock data and everything else failed, use it
      if (this.useMockData && this.mockData.trendingTokens.length > 0) {
        logger.warn('Using mock trending tokens as fallback');
        return this.mockData.trendingTokens;
      }
      
      throw error;
    } finally {
      finishAppTransaction(transaction);
    }
  }

  /**
   * Get market data for a token
   * 
   * @param {string} tokenSymbol - Token symbol
   * @returns {Promise<Object>} - Market data
   */
  async getMarketData(tokenSymbol) {
    const transaction = startAppTransaction('axiom-get-market-data', 'scraper.market');
    
    try {
      if (!this.initialized) {
        await this.initialize();
      }
      
      // Get token data
      const tokenData = await this.getTokenData(tokenSymbol);
      
      // Format market data
      return {
        success: true,
        data: {
          symbol: tokenData.symbol,
          name: tokenData.name,
          price: tokenData.price,
          marketCap: tokenData.marketCap,
          volume24h: tokenData.volume24h,
          priceChange24h: tokenData.priceChange24h,
          contractAddress: tokenData.contractAddress,
          chartData: tokenData.chartData
        }
      };
    } catch (error) {
      logger.error(`AXIOM getMarketData error: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    } finally {
      finishAppTransaction(transaction);
    }
  }

  /**
   * Get top tokens
   * 
   * @returns {Promise<Object>} - Top tokens
   */
  async getTopTokens() {
    const transaction = startAppTransaction('axiom-get-top-tokens', 'scraper.top');
    
    try {
      if (!this.initialized) {
        await this.initialize();
      }
      
      // Get trending tokens
      const trendingTokens = await this.getTrendingTokens();
      
      return {
        success: true,
        data: trendingTokens
      };
    } catch (error) {
      logger.error(`AXIOM getTopTokens error: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    } finally {
      finishAppTransaction(transaction);
    }
  }  /**
   * Clear cache
   */
  clearCache() {
    this.cache.tokenData.clear();
    this.cache.trendingTokens = null;
    this.cache.trendingTokensTimestamp = 0;
    logger.info('AXIOM scraper cache cleared');
  }

  /**
   * Initialize mock data for fallback when AXIOM API is unavailable
   */
  initializeMockData() {
    logger.info('Initializing AXIOM mock data for fallback purposes');
    
    // Create mock trending tokens
    this.mockData.trendingTokens = [
      { symbol: 'SOL', name: 'Solana', price: '145.67', change: '+2.4%' },
      { symbol: 'JTO', name: 'Jito', price: '3.87', change: '+1.2%' },
      { symbol: 'BONK', name: 'Bonk', price: '0.00002183', change: '+5.7%' },
      { symbol: 'PYTH', name: 'Pyth Network', price: '0.531', change: '-1.3%' },
      { symbol: 'RAY', name: 'Raydium', price: '1.27', change: '+3.1%' }
    ];
    
    // Create some mock token data for common tokens
    const mockTokens = ['SOL', 'JTO', 'BONK', 'PYTH', 'RAY'];
    mockTokens.forEach(symbol => {
      this.mockData.tokenData[symbol] = {
        symbol: symbol,
        name: this.mockData.trendingTokens.find(t => t.symbol === symbol)?.name || symbol,
        price: this.mockData.trendingTokens.find(t => t.symbol === symbol)?.price || '0.00',
        marketCap: symbol === 'SOL' ? '62.8B' : symbol === 'JTO' ? '446.5M' : '100M',
        volume24h: symbol === 'SOL' ? '1.2B' : symbol === 'JTO' ? '89.3M' : '50M',
        priceChange24h: this.mockData.trendingTokens.find(t => t.symbol === symbol)?.change || '0.0%',
        contractAddress: symbol === 'SOL' ? 'So11111111111111111111111111111111111111112' : null,
        chartData: this.generateMockChartData(),
        lastUpdated: Date.now()
      };
    });
    
    logger.info(`AXIOM mock data initialized with ${this.mockData.trendingTokens.length} trending tokens`);
    
    // Cache the mock trending tokens to prevent further API calls during this session
    this.cache.trendingTokens = this.mockData.trendingTokens;
    this.cache.trendingTokensTimestamp = Date.now();
  }
  
  /**
   * Generate mock chart data for token price history
   * @returns {Array} - Array of price points
   */
  generateMockChartData() {
    const points = [];
    const basePrice = 100 + Math.random() * 50;
    
    // Generate 24 hourly data points with some random movement
    for (let i = 0; i < 24; i++) {
      const timestamp = Date.now() - (23 - i) * 60 * 60 * 1000;
      // Random walk with some trend
      const randomFactor = 0.95 + Math.random() * 0.1; // 0.95 to 1.05
      const price = i === 0 ? basePrice : points[i-1].price * randomFactor;
      
      points.push({
        timestamp,
        price: price.toFixed(2),
        volume: (Math.random() * 1000000).toFixed(0)
      });
    }
    
    return points;
  }

  /**
   * Check if a web3 wallet is connected
   * 
   * @returns {boolean} - Whether a wallet is connected
   */
  isWalletConnected() {
    try {
      // Dynamically import trade execution service to avoid circular dependencies
      const tradeExecutionService = require('./tradeExecutionService').default;
      return tradeExecutionService && tradeExecutionService.isWalletConnected();
    } catch (error) {
      logger.error(`Error checking wallet connection: ${error.message}`);
      return false;
    }
  }

  /**
   * Initialize with blockchain data when wallet is connected
   * 
   * @returns {Promise<boolean>} - Success status
   */
  async initializeWithBlockchainData() {
    const transaction = startAppTransaction('axiom-init-blockchain', 'blockchain.init');
    
    try {
      logger.info('Initializing AXIOM with blockchain data...');
      
      // Import required services
      const shyftService = require('./shyftService').default;
      const birdeyeService = require('./birdeyeService').default;
      
      // Initialize services if needed
      if (!shyftService.isInitialized) {
        await shyftService.initialize();
      }
      
      if (!birdeyeService.isInitialized) {
        await birdeyeService.initialize();
      }
      
      // Get top tokens from Birdeye
      const topTokensResponse = await birdeyeService.getTopTokens();
      
      if (topTokensResponse && topTokensResponse.success && topTokensResponse.data && topTokensResponse.data.length > 0) {
        // Transform Birdeye data to AXIOM format
        const trendingTokens = topTokensResponse.data.map(token => ({
          symbol: token.symbol || token.name,
          name: token.name,
          price: token.price ? token.price.toString() : '0',
          change: token.priceChangePercent24h ? `${token.priceChangePercent24h > 0 ? '+' : ''}${token.priceChangePercent24h.toFixed(2)}%` : '0.00%'
        }));
        
        // Cache the trending tokens
        this.cache.trendingTokens = trendingTokens;
        this.cache.trendingTokensTimestamp = Date.now();
        
        logger.info(`Using blockchain data: Found ${trendingTokens.length} trending tokens`);
        this.usingBlockchainData = true;
        this.initialized = true;
        return true;
      } else {
        logger.warn('Failed to get trending tokens from blockchain data');
        return false;
      }
    } catch (error) {
      logger.error(`Error initializing with blockchain data: ${error.message}`);
      return false;
    } finally {
      finishAppTransaction(transaction);
    }
  }

  /**
   * Try to initialize with blockchain data but don't fail if it doesn't work
   * 
   * @returns {Promise<boolean>} - Success status
   */
  async tryInitializeWithBlockchainData() {
    try {
      return await this.initializeWithBlockchainData();
    } catch (error) {
      logger.error(`Failed to initialize with blockchain data: ${error.message}`);
      return false;
    }
  }

  /**
   * Get blockchain data for a token (used when wallet is connected)
   * 
   * @param {string} symbol - Token symbol
   * @returns {Promise<Object>} - Token data
   */
  async getBlockchainData(symbol) {
    try {
      // Get data from SHYFT or Birdeye
      const shyftService = require('./shyftService').default;
      const birdeyeService = require('./birdeyeService').default;
      
      // Try Birdeye first
      let tokenData;
      try {
        const response = await birdeyeService.getTokenInfo(symbol);
        if (response && response.success && response.data) {
          tokenData = response.data;
        }
      } catch (birdeyeError) {
        logger.warn(`Birdeye data fetch failed for ${symbol}: ${birdeyeError.message}`);
      }
      
      // Try SHYFT if Birdeye failed
      if (!tokenData) {
        try {
          const response = await shyftService.getTokenData(symbol);
          if (response && response.success && response.data) {
            tokenData = response.data;
          }
        } catch (shyftError) {
          logger.warn(`SHYFT data fetch failed for ${symbol}: ${shyftError.message}`);
        }
      }
      
      if (!tokenData) {
        throw new Error(`Could not find blockchain data for token: ${symbol}`);
      }
      
      // Format the data to match AXIOM format
      return {
        symbol: symbol,
        name: tokenData.name || symbol,
        price: tokenData.price?.toString() || '0',
        marketCap: tokenData.marketCap?.toString() || 'Unknown',
        volume24h: tokenData.volume24h?.toString() || 'Unknown',
        priceChange24h: tokenData.priceChangePercent24h ? 
          `${tokenData.priceChangePercent24h > 0 ? '+' : ''}${tokenData.priceChangePercent24h.toFixed(2)}%` : '0.00%',
        contractAddress: tokenData.address || null,
        chartData: tokenData.chartData || [],
        lastUpdated: Date.now()
      };
    } catch (error) {
      logger.error(`Error getting blockchain data for ${symbol}: ${error.message}`);
      throw error;
    }
  }
}

// Create singleton instance
const axiomScraper = new AxiomScraper();

export default axiomScraper;
