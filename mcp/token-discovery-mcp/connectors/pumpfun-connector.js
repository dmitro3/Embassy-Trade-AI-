/**
 * PumpFun Connector for Token Discovery MCP
 * 
 * This connector provides integration with the PumpFun API to fetch
 * new token launches, trending tokens, and potential snipe opportunities.
 */

const axios = require('axios');
const { sleep, formatTokenData } = require('../utils');

// PumpFun API configuration
const PUMPFUN_API_BASE = 'https://api.pump.fun/api';

/**
 * PumpFun Connector class
 */
class PumpFunConnector {
  constructor(config = {}) {
    this.client = axios.create({
      baseURL: PUMPFUN_API_BASE,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'TradeForce-MCP/1.0.0'
      }
    });
    this.rateLimit = config.rateLimit || 500; // ms between requests
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
   * Make an API request to PumpFun
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
      console.error(`PumpFun API error (${endpoint}):`, error.message);
      
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
   * Get trending tokens from PumpFun
   * 
   * @param {number} limit - Number of tokens to fetch
   * @returns {Promise<Array>} - Trending tokens
   */
  async getTrendingTokens(limit = 50) {
    try {
      const data = await this.request('/trending', { limit });
      return data.tokens || [];
    } catch (error) {
      console.error('Error fetching trending tokens from PumpFun:', error);
      return [];
    }
  }

  /**
   * Get recently launched tokens
   * 
   * @param {number} limit - Number of tokens to fetch
   * @param {number} hours - Tokens launched within the last X hours
   * @returns {Promise<Array>} - Recently launched tokens
   */
  async getRecentLaunches(limit = 50, hours = 24) {
    try {
      const data = await this.request('/launches', { limit, hours });
      return data.tokens || [];
    } catch (error) {
      console.error('Error fetching recent launches from PumpFun:', error);
      return [];
    }
  }

  /**
   * Get token details
   * 
   * @param {string} address - Token address
   * @returns {Promise<Object>} - Token details
   */
  async getTokenDetails(address) {
    try {
      const data = await this.request(`/token/${address}`);
      return data.token || null;
    } catch (error) {
      console.error(`Error fetching token details for ${address} from PumpFun:`, error);
      return null;
    }
  }

  /**
   * Search for a token
   * 
   * @param {string} query - Search query (name, symbol, or address)
   * @param {number} limit - Number of results to return
   * @returns {Promise<Array>} - Search results
   */
  async searchTokens(query, limit = 20) {
    try {
      const data = await this.request('/search', { q: query, limit });
      return data.results || [];
    } catch (error) {
      console.error(`Error searching tokens from PumpFun:`, error);
      return [];
    }
  }

  /**
   * Find potential snipe opportunities
   * 
   * @param {Object} options - Filtering options
   * @returns {Promise<Array>} - Potential opportunities
   */
  async findSnipeOpportunities(options = {}) {
    try {
      const {
        // Default filtering parameters
        maxAgeHours = 24,
        minHolders = 20,
        minLiquidity = 5000,
        maxLiquidity = 500000,
        minPriceChangePercent = 10,
        minBuyRatio = 1.5,  // Ratio of buy to sell transactions
        excludeLowVolume = true,
        minVolume = 2000,
        // Advanced parameters
        riskTolerance = 'moderate', // 'low', 'moderate', 'high'
        minOpportunityScore = 60,
        sortBy = 'score', // 'score', 'age', 'liquidity', 'holders'
        limit = 20,
      } = options;
      
      console.log('Finding PumpFun snipe opportunities with options:', options);
      
      // Get recent launches first
      const recentHours = Math.min(maxAgeHours, 48); // PumpFun API typically limits to 48h
      const tokens = await this.getRecentLaunches(100, recentHours);
      console.log(`Found ${tokens.length} recent token launches on PumpFun`);
      
      // Apply basic filtering
      let filteredTokens = tokens.filter(token => {
        // Skip if missing critical data
        if (!token || !token.address) return false;
        
        // Apply liquidity filter
        const liquidity = parseFloat(token.liquidityUsd || 0);
        if (liquidity < minLiquidity || liquidity > maxLiquidity) return false;
        
        // Apply volume filter
        if (excludeLowVolume) {
          const volume = parseFloat(token.volume24h || 0);
          if (volume < minVolume) return false;
        }
        
        // Apply holders filter
        const holders = parseInt(token.holders || 0);
        if (holders < minHolders) return false;
        
        // Apply price change filter
        const priceChange = parseFloat(token.priceChangePercent24h || 0);
        if (Math.abs(priceChange) < minPriceChangePercent) return false;
        
        // Apply buy/sell transaction ratio filter
        const buyCount = parseInt(token.buyCount24h || 0);
        const sellCount = parseInt(token.sellCount24h || 0);
        if (sellCount > 0 && buyCount / sellCount < minBuyRatio) return false;
        
        return true;
      });
      
      // Fetch additional details for remaining tokens
      const opportunities = [];
      
      for (const token of filteredTokens.slice(0, Math.min(filteredTokens.length, 25))) {
        try {
          // Get detailed token info for better analysis
          const details = await this.getTokenDetails(token.address);
          
          if (details) {
            // Calculate opportunity score
            const score = this.calculateOpportunityScore(details, riskTolerance);
            
            if (score >= minOpportunityScore) {
              opportunities.push({
                ...details,
                score,
                source: 'pumpfun'
              });
            }
          }
          
          // Respect rate limits
          await sleep(this.rateLimit);
          
        } catch (error) {
          console.error(`Error processing token ${token.address}:`, error.message);
          continue;
        }
      }
      
      // Sort by specified criteria
      if (sortBy === 'age') {
        opportunities.sort((a, b) => new Date(b.launchTimestamp) - new Date(a.launchTimestamp));
      } else if (sortBy === 'liquidity') {
        opportunities.sort((a, b) => parseFloat(b.liquidityUsd || 0) - parseFloat(a.liquidityUsd || 0));
      } else if (sortBy === 'holders') {
        opportunities.sort((a, b) => parseInt(b.holders || 0) - parseInt(a.holders || 0));
      } else {
        // Default: sort by score
        opportunities.sort((a, b) => b.score - a.score);
      }
      
      return opportunities.slice(0, limit);
      
    } catch (error) {
      console.error('Error finding PumpFun snipe opportunities:', error);
      return [];
    }
  }
  
  /**
   * Calculate opportunity score based on token metrics and risk tolerance
   * 
   * @param {Object} token - Token details
   * @param {string} riskTolerance - Risk tolerance level ('low', 'moderate', 'high')
   * @returns {number} - Opportunity score (0-100)
   */
  calculateOpportunityScore(token, riskTolerance = 'moderate') {
    // Extract and normalize metrics
    const liquidity = Math.min(parseFloat(token.liquidityUsd || 0), 1000000) / 1000000;
    const volume24h = Math.min(parseFloat(token.volume24h || 0), 500000) / 500000;
    const holders = Math.min(parseInt(token.holders || 0), 1000) / 1000;
    const priceChange = Math.min(Math.abs(parseFloat(token.priceChangePercent24h || 0)), 200) / 200;
    
    // Calculate buy/sell ratio
    const buyCount = parseInt(token.buyCount24h || 0);
    const sellCount = parseInt(token.sellCount24h || 0);
    const txRatio = sellCount > 0 ? Math.min(buyCount / sellCount, 5) / 5 : 0.5;
    
    // Age factor (newer tokens score higher)
    const launchTime = new Date(token.launchTimestamp || Date.now()).getTime();
    const ageHours = (Date.now() - launchTime) / (1000 * 60 * 60);
    const ageFactor = Math.max(0, Math.min(1, (48 - ageHours) / 48));
    
    // Social signals
    const hasSocial = token.twitterFollowers > 100 || token.telegramMembers > 100;
    const socialFactor = hasSocial ? 1 : 0.7;
    
    // Advanced Risk Analysis
    let marketTiming = 0.8; // Default market timing factor
    
    // Try to detect suspicious patterns
    const hasRedFlags = this.detectRedFlags(token);
    const trustFactor = hasRedFlags ? 0.3 : 1.0;
    
    // Weight factors based on risk tolerance
    let weights = {
      liquidity: 0.15,
      volume: 0.15,
      holders: 0.15,
      priceChange: 0.15,
      txRatio: 0.15,
      age: 0.1,
      social: 0.05,
      trust: 0.1
    };
    
    if (riskTolerance === 'low') {
      weights = {
        liquidity: 0.25,
        volume: 0.15,
        holders: 0.2,
        priceChange: 0.05,
        txRatio: 0.1,
        age: 0.05,
        social: 0.1,
        trust: 0.1
      };
    } else if (riskTolerance === 'high') {
      weights = {
        liquidity: 0.1,
        volume: 0.1,
        holders: 0.1,
        priceChange: 0.25,
        txRatio: 0.2,
        age: 0.15,
        social: 0.05,
        trust: 0.05
      };
    }
    
    // Calculate weighted score
    const score = 
      (liquidity * weights.liquidity) +
      (volume24h * weights.volume) +
      (holders * weights.holders) +
      (priceChange * weights.priceChange) +
      (txRatio * weights.txRatio) +
      (ageFactor * weights.age) +
      (socialFactor * weights.social) +
      (trustFactor * weights.trust) +
      (marketTiming * 0);
      
    // Convert to 0-100 scale
    return Math.round(score * 100);
  }
  
  /**
   * Detect potential red flags in a token
   * 
   * @param {Object} token - Token details
   * @returns {boolean} - True if red flags detected
   */
  detectRedFlags(token) {
    // Check for extremely low liquidity
    if (parseFloat(token.liquidityUsd || 0) < 1000) return true;
    
    // Check for extremely low holders count
    if (parseInt(token.holders || 0) < 10) return true;
    
    // Check for suspicious buy/sell patterns
    const buyCount = parseInt(token.buyCount24h || 0);
    const sellCount = parseInt(token.sellCount24h || 0);
    
    // If many sells but few buys
    if (sellCount > 20 && sellCount > buyCount * 3) return true;
    
    // Check for abnormal price movements
    const priceChange = parseFloat(token.priceChangePercent24h || 0);
    if (priceChange < -80 || priceChange > 1000) return true;
    
    // Check for honeypot indicators
    if (token.sellTax > 15 || token.buyTax > 15) return true;
    
    return false;
  }
}

module.exports = PumpFunConnector;
