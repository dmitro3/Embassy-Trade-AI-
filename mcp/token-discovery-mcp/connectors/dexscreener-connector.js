/**
 * DexScreener Connector for Token Discovery MCP
 * 
 * This connector provides integration with the DexScreener API to fetch
 * token data, market information, and potential snipe opportunities.
 */

const axios = require('axios');
const { sleep, formatTokenData } = require('../utils');

// DexScreener API configuration
const DEXSCREENER_API_BASE = 'https://api.dexscreener.com/latest';

/**
 * DexScreener Connector class
 */
class DexScreenerConnector {
  constructor(config = {}) {
    this.client = axios.create({
      baseURL: DEXSCREENER_API_BASE,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    this.rateLimit = config.rateLimit || 500; // ms between requests (DexScreener has a lower rate limit)
    this.lastRequestTime = 0;
  }

  /**
   * Ensure rate limiting by waiting if necessary
   */
  async enforceRateLimit() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.rateLimit) {
      const waitTime = this.rateLimit - timeSinceLastRequest;
      await sleep(waitTime);
    }
    
    this.lastRequestTime = Date.now();
  }

  /**
   * Make an API request to DexScreener
   * 
   * @param {string} endpoint - API endpoint
   * @param {Object} params - Query parameters
   * @returns {Promise<Object>} - API response
   */
  async request(endpoint, params = {}) {
    try {
      await this.enforceRateLimit();
      
      const response = await this.client.get(endpoint, { params });
      
      return response.data;
    } catch (error) {
      console.error(`DexScreener API error (${endpoint}):`, error.message);
      
      if (error.response) {
        console.error('Error data:', error.response.data);
        console.error('Error status:', error.response.status);
      } else if (error.request) {
        console.error('No response received');
      }
      
      throw error;
    }
  }

  /**
   * Search for a token
   * 
   * @param {string} query - Search query (address or symbol)
   * @returns {Promise<Array>} - Search results
   */
  async searchToken(query) {
    const data = await this.request(`/dex/search`, { query });
    return data.pairs || [];
  }

  /**
   * Get token by address
   * 
   * @param {string} tokenAddress - Token address
   * @returns {Promise<Object>} - Token data
   */
  async getTokenByAddress(tokenAddress) {
    const data = await this.request(`/dex/tokens/${tokenAddress}`);
    return data.pairs || [];
  }

  /**
   * Get pairs for a specific DEX
   * 
   * @param {string} dexName - DEX name (e.g., "raydium", "orca")
   * @param {number} limit - Number of results to return
   * @returns {Promise<Array>} - Pairs
   */
  async getPairsByDex(dexName, limit = 100) {
    const data = await this.request(`/dex/pairs/solana/${dexName}`, { limit });
    return data.pairs || [];
  }

  /**
   * Get trending pairs on Solana
   * 
   * @param {number} limit - Number of results to return
   * @returns {Promise<Array>} - Trending pairs
   */
  async getTrendingPairs(limit = 50) {
    const data = await this.request(`/dex/pairs/solana/trending`, { limit });
    return data.pairs || [];
  }

  /**
   * Get newly listed pairs on Solana
   * 
   * @param {number} limit - Number of results to return
   * @returns {Promise<Array>} - New pairs
   */
  async getNewPairs(limit = 50) {
    const data = await this.request(`/dex/pairs/solana/newly-added`, { limit });
    return data.pairs || [];
  }

  /**
   * Find top gainers in the last 24h
   * 
   * @param {number} limit - Number of results to return
   * @returns {Promise<Array>} - Top gainers
   */
  async findTopGainers(limit = 20) {
    try {
      // Get trending pairs first as they're more likely to have significant price movements
      const pairs = await this.getTrendingPairs(100);
      
      // Filter and sort by price change
      const gainers = pairs
        .filter(pair => pair.priceChange?.h24 > 0)
        .sort((a, b) => (b.priceChange?.h24 || 0) - (a.priceChange?.h24 || 0))
        .slice(0, limit);
      
      return gainers;
    } catch (error) {
      console.error('Error finding top gainers:', error);
      throw error;
    }
  }

  /**
   * Find potential snipe opportunities using DexScreener data
   * 
   * @param {Object} options - Options for filtering opportunities
   * @returns {Promise<Array>} - Potential opportunities
   */
  async findSnipeOpportunities(options = {}) {
    try {
      const {
        minLiquidity = 1000, // Minimum liquidity in USD
        maxLiquidity = 300000, // Maximum liquidity in USD
        minPriceChange = 5, // Minimum price change (%)
        maxPriceChange = 1000, // Maximum price change (%)
        minVolume = 1000, // Minimum 24h volume
        excludedDexes = [], // DEXes to exclude
      } = options;
      
      console.log('Finding DexScreener snipe opportunities with options:', options);
      
      // Get new pairs as the base for opportunities
      const newPairs = await this.getNewPairs(100);
      console.log(`Found ${newPairs.length} new pairs`);
      
      // Also get trending pairs for comparison
      const trendingPairs = await this.getTrendingPairs(50);
      
      // Combine and deduplicate
      const pairs = [...newPairs];
      
      // Add trending pairs that aren't already in the list
      for (const pair of trendingPairs) {
        if (!pairs.some(p => p.pairAddress === pair.pairAddress)) {
          pairs.push(pair);
        }
      }
      
      // Filter for potential opportunities
      const opportunities = pairs
        .filter(pair => {
          // Skip pairs on excluded DEXes
          if (excludedDexes.includes(pair.dexId)) return false;
          
          // Apply other filters
          const liquidity = parseFloat(pair.liquidity?.usd || 0);
          const priceChange = parseFloat(pair.priceChange?.h24 || 0);
          const volume = parseFloat(pair.volume?.h24 || 0);
          
          return (
            liquidity >= minLiquidity &&
            liquidity <= maxLiquidity &&
            priceChange >= minPriceChange &&
            priceChange <= maxPriceChange &&
            volume >= minVolume
          );
        })
        .map(pair => ({
          ...pair,
          score: this.calculateOpportunityScore(pair)
        }))
        .sort((a, b) => b.score - a.score);
      
      return opportunities;
    } catch (error) {
      console.error('Error finding DexScreener snipe opportunities:', error);
      throw error;
    }
  }
  
  /**
   * Calculate opportunity score for a token pair
   * 
   * @param {Object} pair - Token pair data
   * @returns {number} - Opportunity score (0-100)
   */
  calculateOpportunityScore(pair) {
    // Normalize values between 0-1
    const liquidity = parseFloat(pair.liquidity?.usd || 0);
    const liquidityScore = Math.min(Math.max(liquidity, 0), 100000) / 100000;
    
    const volume = parseFloat(pair.volume?.h24 || 0);
    const volumeScore = Math.min(Math.max(volume, 0), 50000) / 50000;
    
    const priceChange = parseFloat(pair.priceChange?.h24 || 0);
    const priceChangeScore = Math.min(Math.max(priceChange, 0), 200) / 200;
    
    const txns = parseInt(pair.txns?.h24?.buys || 0) + parseInt(pair.txns?.h24?.sells || 0);
    const txnsScore = Math.min(Math.max(txns, 0), 1000) / 1000;
    
    // Weight the scores (total weights = 1)
    const weightedScore = 
      (liquidityScore * 0.3) + 
      (volumeScore * 0.3) + 
      (priceChangeScore * 0.3) + 
      (txnsScore * 0.1);
    
    // Return score as 0-100
    return Math.round(weightedScore * 100);
  }
}

module.exports = DexScreenerConnector;
