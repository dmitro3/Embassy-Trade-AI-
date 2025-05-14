'use client';

import logger from './logger';

/**
 * Token Fetch Service
 * 
 * Handles fetching token data from various sources
 * with fallback mechanisms and caching
 */
class TokenFetchService {
  constructor() {
    this.cachedTokens = null;
    this.lastFetchTime = null;
    this.cacheExpiryMs = 60000; // 1 minute cache expiry
    
    // Token addresses for SOL, RAY, JUP, and BONK
    this.tokenAddresses = {
      'SOL': 'So11111111111111111111111111111111111111112',
      'RAY': '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R',
      'JUP': 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN',
      'BONK': 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263'
    };
  }

  /**
   * Fetch tokens from API or return cached data if available
   * 
   * @returns {Promise<Array>} - Array of token data
   */
  async fetchTokens() {
    try {
      // Check if we have valid cached data
      if (this.cachedTokens && this.lastFetchTime && 
          (Date.now() - this.lastFetchTime < this.cacheExpiryMs)) {
        logger.info('Using cached token data');
        return this.cachedTokens;
      }
      
      // Try to fetch from API
      const tokens = await this.fetchFromApi();
      
      // Update cache
      this.cachedTokens = tokens;
      this.lastFetchTime = Date.now();
      
      return tokens;
    } catch (error) {
      logger.error(`Error fetching tokens: ${error.message}`);
      
      // If we have cached data, return it even if expired
      if (this.cachedTokens) {
        logger.info('Falling back to cached token data');
        return this.cachedTokens;
      }
      
      // Otherwise, return mock data
      logger.info('Falling back to mock token data');
      return this.getMockTokens();
    }
  }

  /**
   * Fetch tokens from API
   * 
   * @returns {Promise<Array>} - Array of token data
   */
  async fetchFromApi() {
    try {
      // Try to fetch from our API first
      const response = await fetch('/api/tradeforce/tokens');
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && Array.isArray(data.tokens)) {
          return data.tokens;
        }
      }
      
      // If that fails, try to fetch from mock API
      const mockResponse = await fetch('/api/mock/tokens');
      
      if (mockResponse.ok) {
        const mockData = await mockResponse.json();
        if (mockData.success && Array.isArray(mockData.tokens)) {
          return mockData.tokens;
        }
      }
      
      // If both fail, throw error to trigger fallback
      throw new Error('Failed to fetch tokens from API');
    } catch (error) {
      logger.error(`API fetch error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get mock token data
   * 
   * @returns {Array} - Array of mock token data
   */
  getMockTokens() {
    return [
      {
        symbol: 'SOL',
        name: 'Solana',
        address: this.tokenAddresses.SOL,
        price: 150.42,
        priceChangePercent24h: 2.5,
        volume24h: 1250000000,
        marketCap: 65000000000,
        isNew: false
      },
      {
        symbol: 'RAY',
        name: 'Raydium',
        address: this.tokenAddresses.RAY,
        price: 0.345,
        priceChangePercent24h: -1.2,
        volume24h: 25000000,
        marketCap: 350000000,
        isNew: false
      },
      {
        symbol: 'JUP',
        name: 'Jupiter',
        address: this.tokenAddresses.JUP,
        price: 1.23,
        priceChangePercent24h: 5.7,
        volume24h: 75000000,
        marketCap: 1200000000,
        isNew: false
      },
      {
        symbol: 'BONK',
        name: 'Bonk',
        address: this.tokenAddresses.BONK,
        price: 0.00002,
        priceChangePercent24h: 12.3,
        volume24h: 45000000,
        marketCap: 750000000,
        isNew: true
      }
    ];
  }

  /**
   * Get token by symbol
   * 
   * @param {string} symbol - Token symbol
   * @returns {Promise<Object|null>} - Token data or null if not found
   */
  async getTokenBySymbol(symbol) {
    try {
      const tokens = await this.fetchTokens();
      return tokens.find(token => token.symbol === symbol) || null;
    } catch (error) {
      logger.error(`Error getting token by symbol: ${error.message}`);
      return null;
    }
  }

  /**
   * Get token by address
   * 
   * @param {string} address - Token address
   * @returns {Promise<Object|null>} - Token data or null if not found
   */
  async getTokenByAddress(address) {
    try {
      const tokens = await this.fetchTokens();
      return tokens.find(token => token.address === address) || null;
    } catch (error) {
      logger.error(`Error getting token by address: ${error.message}`);
      return null;
    }
  }
}

// Create singleton instance
const tokenFetchService = new TokenFetchService();

export default tokenFetchService;
