/**
 * BirdEye Connector for Token Discovery MCP
 * 
 * This connector provides integration with the BirdEye API to fetch
 * token data, market information, and potential snipe opportunities.
 */

const axios = require('axios');
const { sleep, formatTokenData } = require('../utils');

// BirdEye API configuration
const BIRDEYE_API_BASE = 'https://public-api.birdeye.so';
const API_KEY = process.env.BIRDEYE_API_KEY || 'your_api_key_here'; // Replace with actual API key

/**
 * BirdEye Connector class
 */
class BirdEyeConnector {
  constructor(config = {}) {
    this.apiKey = config.apiKey || API_KEY;
    this.client = axios.create({
      baseURL: BIRDEYE_API_BASE,
      headers: {
        'x-api-key': this.apiKey,
        'Content-Type': 'application/json'
      }
    });
    this.rateLimit = config.rateLimit || 300; // ms between requests
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
   * Make an API request to BirdEye
   * 
   * @param {string} endpoint - API endpoint
   * @param {Object} params - Query parameters
   * @returns {Promise<Object>} - API response
   */
  async request(endpoint, params = {}) {
    try {
      await this.enforceRateLimit();
      
      const response = await this.client.get(endpoint, { params });
      
      if (response.data.success === false) {
        throw new Error(response.data.message || 'BirdEye API error');
      }
      
      return response.data;
    } catch (error) {
      console.error(`BirdEye API error (${endpoint}):`, error.message);
      
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.error('Error data:', error.response.data);
        console.error('Error status:', error.response.status);
      } else if (error.request) {
        // The request was made but no response was received
        console.error('No response received');
      }
      
      throw error;
    }
  }

  /**
   * Get token metadata
   * 
   * @param {string} tokenAddress - Token address
   * @returns {Promise<Object>} - Token metadata
   */
  async getTokenMetadata(tokenAddress) {
    const data = await this.request(`/public/tokenlist/solana/detail`, {
      address: tokenAddress
    });
    
    return data;
  }

  /**
   * Get token price
   * 
   * @param {string} tokenAddress - Token address
   * @returns {Promise<Object>} - Token price data
   */
  async getTokenPrice(tokenAddress) {
    const data = await this.request(`/public/price`, {
      address: tokenAddress
    });
    
    return data;
  }

  /**
   * Get token market data
   * 
   * @param {string} tokenAddress - Token address
   * @returns {Promise<Object>} - Token market data
   */
  async getTokenMarketData(tokenAddress) {
    const data = await this.request(`/public/market_token`, {
      address: tokenAddress
    });
    
    return data;
  }

  /**
   * Get top trending tokens
   * 
   * @param {number} limit - Number of tokens to return
   * @returns {Promise<Array>} - Trending tokens
   */
  async getTrendingTokens(limit = 20) {
    const data = await this.request(`/public/trending_tokens`, {
      chain: 'solana',
      limit
    });
    
    return data.data || [];
  }

  /**
   * Get recently added tokens
   * 
   * @param {number} limit - Number of tokens to return
   * @returns {Promise<Array>} - New tokens
   */
  async getNewTokens(limit = 50) {
    const data = await this.request(`/public/new_tokens`, {
      chain: 'solana',
      limit
    });
    
    return data.data || [];
  }

  /**
   * Get top gainers
   * 
   * @param {number} limit - Number of tokens to return
   * @returns {Promise<Array>} - Top gainers
   */
  async getTopGainers(limit = 20) {
    const data = await this.request(`/public/leaderboard/gainers`, {
      chain: 'solana',
      limit
    });
    
    return data.data || [];
  }

  /**
   * Get pool information
   * 
   * @param {string} poolAddress - Pool address
   * @returns {Promise<Object>} - Pool data
   */
  async getPoolInfo(poolAddress) {
    const data = await this.request(`/public/pool_info`, {
      address: poolAddress
    });
    
    return data;
  }

  /**
   * Find potential snipe opportunities
   * 
   * This combines several strategies to identify tokens that might be
   * good opportunities for sniping based on various indicators.
   * 
   * @param {Object} options - Options for snipe detection
   * @returns {Promise<Array>} - Potential snipe opportunities
   */
  async findSnipeOpportunities(options = {}) {
    try {
      const {
        minLiquidity = 1000, // Minimum liquidity in USD
        maxLiquidity = 500000, // Maximum liquidity in USD
        minHolders = 10, // Minimum number of token holders
        maxAgeHours = 48, // Maximum token age in hours
        minimumVolumeUSD = 500, // Minimum 24h volume
        minPriceChangePercent = 5, // Minimum price change % to consider
      } = options;
      
      console.log('Finding snipe opportunities with options:', options);
      
      // Get new tokens as base for opportunities
      const newTokens = await this.getNewTokens(100);
      console.log(`Found ${newTokens.length} new tokens`);
      
      const opportunities = [];
      
      // Process each token
      for (const token of newTokens) {
        try {
          // Skip tokens that are too old
          const tokenAge = (Date.now() - (token.addTime * 1000)) / (1000 * 60 * 60);
          if (tokenAge > maxAgeHours) continue;
          
          // Get more detailed data
          const [marketData, price] = await Promise.all([
            this.getTokenMarketData(token.address),
            this.getTokenPrice(token.address)
          ]);
          
          // Skip if no market data or price
          if (!marketData || !price) continue;
          
          const liquidityUSD = marketData.liquidity || 0;
          const volume24h = marketData.volume24h || 0;
          const holders = marketData.holders || 0;
          const priceChangePercent = price.priceChange24h || 0;
          
          // Apply filters
          if (
            liquidityUSD >= minLiquidity &&
            liquidityUSD <= maxLiquidity &&
            holders >= minHolders &&
            volume24h >= minimumVolumeUSD &&
            Math.abs(priceChangePercent) >= minPriceChangePercent
          ) {
            opportunities.push({
              ...token,
              liquidity: liquidityUSD,
              volume24h,
              holders,
              priceChangePercent,
              price: price.value,
              score: this.calculateOpportunityScore({
                age: tokenAge,
                liquidity: liquidityUSD,
                volume24h,
                holders,
                priceChangePercent
              })
            });
          }
        } catch (error) {
          console.error(`Error processing token ${token.address}:`, error.message);
          continue;
        }
        
        // Respect rate limits
        await sleep(this.rateLimit);
      }
      
      // Sort by opportunity score
      return opportunities.sort((a, b) => b.score - a.score);
    } catch (error) {
      console.error('Error finding snipe opportunities:', error);
      throw error;
    }
  }

  /**
   * Calculate an opportunity score for a token
   * 
   * @param {Object} params - Parameters for scoring
   * @returns {number} - Opportunity score (0-100)
   */
  calculateOpportunityScore({
    age,
    liquidity,
    volume24h,
    holders,
    priceChangePercent
  }) {
    // Normalize values between 0-1
    const ageScore = Math.max(0, 1 - (age / 48)); // Newer is better
    const liquidityScore = Math.min(liquidity, 100000) / 100000; // More liquidity is better (up to a point)
    const volumeScore = Math.min(volume24h, 50000) / 50000; // More volume is better (up to a point)
    const holdersScore = Math.min(holders, 500) / 500; // More holders is better (up to a point)
    const priceChangeScore = Math.min(Math.abs(priceChangePercent), 100) / 100; // Higher price change is better
    
    // Weight the scores (total weights = 1)
    const weightedScore = 
      (ageScore * 0.3) + 
      (liquidityScore * 0.2) + 
      (volumeScore * 0.2) + 
      (holdersScore * 0.2) + 
      (priceChangeScore * 0.1);
    
    // Return score as 0-100
    return Math.round(weightedScore * 100);
  }
}

module.exports = BirdEyeConnector;
