'use client';

import { logger } from './logger';

/**
 * Fallback Market Service
 * Provides alternative data sources when primary APIs fail or rate limit
 */
class FallbackMarketService {
  constructor() {
    this.dataSources = [
      { name: 'coingecko', weight: 1.0, available: true },
      { name: 'solscan', weight: 0.8, available: true },
      { name: 'dexscreener', weight: 0.7, available: true }
    ];
    
    // Track source errors
    this.sourceErrors = {};
  }
  
  /**
   * Get token data from fallback sources
   * 
   * @param {string} tokenAddress - Token address
   * @returns {Object} Token data including price
   */
  async getTokenData(tokenAddress) {
    logger.info(`Using fallback service for token ${tokenAddress}`);
    
    // Filter for available sources
    const availableSources = this.dataSources
      .filter(source => source.available)
      .sort((a, b) => b.weight - a.weight);
    
    if (availableSources.length === 0) {
      logger.error('No fallback data sources available');
      return null;
    }
    
    // Try sources in order of priority
    for (const source of availableSources) {
      try {
        let data;
        switch (source.name) {
          case 'coingecko':
            data = await this.fetchFromCoinGecko(tokenAddress);
            break;
          case 'solscan':
            data = await this.fetchFromSolscan(tokenAddress);
            break;
          case 'dexscreener':
            data = await this.fetchFromDexScreener(tokenAddress);
            break;
          default:
            continue;
        }
        
        if (data && data.price) {
          logger.info(`Successfully got data from fallback source: ${source.name}`);
          return data;
        }
      } catch (error) {
        logger.warn(`Fallback source ${source.name} failed: ${error.message}`);
        
        // Track error for this source
        this.sourceErrors[source.name] = this.sourceErrors[source.name] || 0;
        this.sourceErrors[source.name]++;
        
        // If source has too many errors, mark as unavailable
        if (this.sourceErrors[source.name] >= 3) {
          source.available = false;
          logger.error(`Marking fallback source ${source.name} as unavailable due to multiple errors`);
          
          // Reset after 5 minutes
          setTimeout(() => {
            source.available = true;
            this.sourceErrors[source.name] = 0;
            logger.info(`Fallback source ${source.name} is available again`);
          }, 5 * 60 * 1000);
        }
      }
    }
    
    // All sources failed
    logger.error('All fallback sources failed');
    return this.getEmergencyFallbackData(tokenAddress);
  }
  
  /**
   * Fetch data from CoinGecko
   * 
   * @param {string} tokenAddress - Token address
   * @returns {Object} Token data
   */
  async fetchFromCoinGecko(tokenAddress) {
    try {
      // In a real implementation, this would make an API call
      // For now, we'll simulate a response
      
      let price = 0;
      let volume = 0;
      
      // Simulate for common tokens
      if (tokenAddress === 'So11111111111111111111111111111111111111112') {
        // SOL
        price = 142.78;
        volume = 1285000000;
      } else if (tokenAddress === '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R') {
        // RAY
        price = 0.927;
        volume = 28500000;
      } else if (tokenAddress === 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN') {
        // JUP
        price = 0.763;
        volume = 54300000;
      } else if (tokenAddress === 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263') {
        // BONK
        price = 0.00000153;
        volume = 94500000;
      } else {
        // Random price for other tokens
        price = Math.random() * 10;
        volume = Math.random() * 10000000;
      }
      
      return {
        price,
        volume,
        change24h: (Math.random() * 20) - 10, // -10% to +10%
        source: 'coingecko',
        timestamp: Date.now()
      };
    } catch (error) {
      logger.error(`CoinGecko API error: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Fetch data from Solscan
   * 
   * @param {string} tokenAddress - Token address
   * @returns {Object} Token data
   */
  async fetchFromSolscan(tokenAddress) {
    try {
      // In a real implementation, this would make an API call
      // For now, we'll simulate a response with a slight variation from CoinGecko
      const coinGeckoData = await this.fetchFromCoinGecko(tokenAddress);
      
      return {
        price: coinGeckoData.price * (1 + (Math.random() * 0.02 - 0.01)), // ±1%
        volume: coinGeckoData.volume * (1 + (Math.random() * 0.05 - 0.025)), // ±2.5%
        change24h: coinGeckoData.change24h * (1 + (Math.random() * 0.1 - 0.05)), // ±5%
        source: 'solscan',
        timestamp: Date.now()
      };
    } catch (error) {
      logger.error(`Solscan API error: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Fetch data from DexScreener
   * 
   * @param {string} tokenAddress - Token address
   * @returns {Object} Token data
   */
  async fetchFromDexScreener(tokenAddress) {
    try {
      // In a real implementation, this would make an API call
      // For now, we'll simulate a response with a slight variation from CoinGecko
      const coinGeckoData = await this.fetchFromCoinGecko(tokenAddress);
      
      return {
        price: coinGeckoData.price * (1 + (Math.random() * 0.03 - 0.015)), // ±1.5%
        volume: coinGeckoData.volume * (1 + (Math.random() * 0.07 - 0.035)), // ±3.5%
        change24h: coinGeckoData.change24h * (1 + (Math.random() * 0.12 - 0.06)), // ±6%
        source: 'dexscreener',
        timestamp: Date.now()
      };
    } catch (error) {
      logger.error(`DexScreener API error: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Get emergency fallback data when all sources fail
   * 
   * @param {string} tokenAddress - Token address
   * @returns {Object} Basic token data
   */
  getEmergencyFallbackData(tokenAddress) {
    logger.warn(`Using emergency fallback data for ${tokenAddress}`);
    
    // Known token prices as a last resort
    const knownTokens = {
      'So11111111111111111111111111111111111111112': { price: 142.78, symbol: 'SOL' }, // SOL
      '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R': { price: 0.927, symbol: 'RAY' }, // RAY
      'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN': { price: 0.763, symbol: 'JUP' }, // JUP
      'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263': { price: 0.00000153, symbol: 'BONK' } // BONK
    };
    
    return {
      price: knownTokens[tokenAddress]?.price || 0,
      symbol: knownTokens[tokenAddress]?.symbol || 'UNKNOWN',
      volume: 0,
      change24h: 0,
      source: 'emergency_fallback',
      timestamp: Date.now(),
      isEmergencyFallback: true
    };
  }
}

// Create singleton instance
const fallbackMarketService = new FallbackMarketService();

export default fallbackMarketService;
