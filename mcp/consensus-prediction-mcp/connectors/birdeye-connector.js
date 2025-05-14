/**
 * Birdeye API Connector
 * 
 * This module provides functions to interact with the Birdeye API for fetching
 * token data, prices, and market information for Solana tokens.
 */

const { get } = require('../utils/httpClient');
const { logger } = require('../utils/logger');

// Birdeye API base URL
const BIRDEYE_API_BASE_URL = 'https://public-api.birdeye.so';

/**
 * Get token metadata from Birdeye
 * 
 * @param {string} tokenAddress - The token address
 * @param {string} apiKey - Birdeye API key
 * @returns {Promise<Object>} Token metadata
 */
async function getTokenData(tokenAddress, apiKey) {
  try {
    logger.debug(`Fetching token data for ${tokenAddress}`);
    
    const url = `${BIRDEYE_API_BASE_URL}/public/tokenlist`;
    const response = await get(url, {
      params: {
        address: tokenAddress
      },
      headers: {
        'X-API-KEY': apiKey
      }
    }, {
      useCache: true,
      ttl: 3600000 // 1 hour cache
    });
    
    if (!response.success) {
      throw new Error(`Birdeye API error: ${response.message || 'Unknown error'}`);
    }
    
    if (!response.data || response.data.length === 0) {
      throw new Error(`Token not found: ${tokenAddress}`);
    }
    
    return {
      address: tokenAddress,
      name: response.data[0].name || 'Unknown',
      symbol: response.data[0].symbol || 'UNKNOWN',
      decimals: response.data[0].decimals || 9,
      logoURI: response.data[0].logoURI || null,
      tags: response.data[0].tags || []
    };
  } catch (error) {
    logger.error(`Error fetching token data: ${error.message}`, {
      tokenAddress,
      error: error.stack
    });
    
    // Return minimal data on error
    return {
      address: tokenAddress,
      name: 'Unknown',
      symbol: 'UNKNOWN',
      decimals: 9,
      logoURI: null,
      tags: []
    };
  }
}

/**
 * Get token price from Birdeye
 * 
 * @param {string} tokenAddress - The token address
 * @param {string} apiKey - Birdeye API key
 * @returns {Promise<Object>} Token price data
 */
async function getTokenPrice(tokenAddress, apiKey) {
  try {
    logger.debug(`Fetching token price for ${tokenAddress}`);
    
    const url = `${BIRDEYE_API_BASE_URL}/public/price`;
    const response = await get(url, {
      params: {
        address: tokenAddress
      },
      headers: {
        'X-API-KEY': apiKey
      }
    }, {
      useCache: true,
      ttl: 60000 // 1 minute cache (prices change frequently)
    });
    
    if (!response.success) {
      throw new Error(`Birdeye API error: ${response.message || 'Unknown error'}`);
    }
    
    return {
      value: response.data.value || 0,
      updateUnixTime: response.data.updateUnixTime || Math.floor(Date.now() / 1000),
      updateHumanTime: response.data.updateTime || new Date().toISOString()
    };
  } catch (error) {
    logger.error(`Error fetching token price: ${error.message}`, {
      tokenAddress,
      error: error.stack
    });
    
    // Return default price on error
    return {
      value: 0,
      updateUnixTime: Math.floor(Date.now() / 1000),
      updateHumanTime: new Date().toISOString()
    };
  }
}

/**
 * Get token market data from Birdeye
 * 
 * @param {string} tokenAddress - The token address
 * @param {string} apiKey - Birdeye API key
 * @returns {Promise<Object>} Token market data
 */
async function getMarketData(tokenAddress, apiKey) {
  try {
    logger.debug(`Fetching market data for ${tokenAddress}`);
    
    const url = `${BIRDEYE_API_BASE_URL}/public/token_list_full`;
    const response = await get(url, {
      params: {
        address_list: tokenAddress
      },
      headers: {
        'X-API-KEY': apiKey
      }
    }, {
      useCache: true,
      ttl: 300000 // 5 minutes cache
    });
    
    if (!response.success) {
      throw new Error(`Birdeye API error: ${response.message || 'Unknown error'}`);
    }
    
    if (!response.data || response.data.length === 0) {
      throw new Error(`Token market data not found: ${tokenAddress}`);
    }
    
    const marketData = response.data[0];
    
    return {
      volume24h: marketData.volume_24h || 0,
      volumeChange24h: marketData.volume_24h_change || 0,
      liquidity: marketData.liquidity || 0,
      liquidityChange24h: marketData.liquidity_change_24h || 0,
      priceChange24h: marketData.price_change_24h || 0,
      fdv: marketData.fdv || 0,
      holders: marketData.holder_count || 0
    };
  } catch (error) {
    logger.error(`Error fetching market data: ${error.message}`, {
      tokenAddress,
      error: error.stack
    });
    
    // Return default market data on error
    return {
      volume24h: 0,
      volumeChange24h: 0,
      liquidity: 0,
      liquidityChange24h: 0,
      priceChange24h: 0,
      fdv: 0,
      holders: 0
    };
  }
}

/**
 * Get historical price data from Birdeye
 * 
 * @param {string} tokenAddress - The token address
 * @param {string} timeframe - Timeframe (1H, 4H, 1D, 1W)
 * @param {string} apiKey - Birdeye API key
 * @returns {Promise<Array>} Historical price data
 */
async function getHistoricalData(tokenAddress, timeframe, apiKey) {
  try {
    logger.debug(`Fetching historical data for ${tokenAddress} with timeframe ${timeframe}`);
    
    // Map timeframe to resolution
    const resolutionMap = {
      '1H': '1',    // 1 minute candles for 1 hour
      '4H': '5',    // 5 minute candles for 4 hours
      '1D': '15',   // 15 minute candles for 1 day
      '1W': '60'    // 60 minute candles for 1 week
    };
    
    // Map timeframe to time range in minutes
    const timeRangeMap = {
      '1H': 60,
      '4H': 240,
      '1D': 1440,
      '1W': 10080
    };
    
    const resolution = resolutionMap[timeframe] || '15';
    const timeRange = timeRangeMap[timeframe] || 1440;
    
    const endTime = Math.floor(Date.now() / 1000);
    const startTime = endTime - (timeRange * 60);
    
    const url = `${BIRDEYE_API_BASE_URL}/public/candles`;
    const response = await get(url, {
      params: {
        address: tokenAddress,
        resolution,
        start_time: startTime,
        end_time: endTime
      },
      headers: {
        'X-API-KEY': apiKey
      }
    }, {
      useCache: true,
      ttl: 60000 // 1 minute cache
    });
    
    if (!response.success) {
      throw new Error(`Birdeye API error: ${response.message || 'Unknown error'}`);
    }
    
    return response.data || [];
  } catch (error) {
    logger.error(`Error fetching historical data: ${error.message}`, {
      tokenAddress,
      timeframe,
      error: error.stack
    });
    
    // Return empty array on error
    return [];
  }
}

/**
 * Search for tokens by name or symbol
 * 
 * @param {string} query - The search query (token name or symbol)
 * @param {number} limit - Maximum number of results to return
 * @param {string} apiKey - Birdeye API key
 * @returns {Promise<Array>} Tokens matching the search query
 */
async function searchTokens(query, limit = 20, apiKey) {
  try {
    logger.debug(`Searching for tokens matching "${query}"`);
    
    const url = `${BIRDEYE_API_BASE_URL}/public/search_token`;
    const response = await get(url, {
      params: {
        keyword: query,
        offset: 0,
        limit
      },
      headers: {
        'X-API-KEY': apiKey
      }
    }, {
      useCache: true,
      ttl: 300000 // 5 minutes cache
    });
    
    if (!response.success) {
      throw new Error(`Birdeye API error: ${response.message || 'Unknown error'}`);
    }
    
    return response.data.tokens.map(token => ({
      address: token.address,
      name: token.name || 'Unknown',
      symbol: token.symbol || 'UNKNOWN',
      decimals: token.decimals || 9,
      logoURI: token.logoURI || null,
      tags: token.tags || []
    })) || [];
  } catch (error) {
    logger.error(`Error searching tokens: ${error.message}`, {
      query,
      limit,
      error: error.stack
    });
    
    // Return empty array on error
    return [];
  }
}

/**
 * Get recent token listings
 * 
 * @param {number} limit - Maximum number of results to return
 * @param {string} apiKey - Birdeye API key
 * @returns {Promise<Array>} Recently listed tokens
 */
async function getRecentTokens(limit = 20, apiKey) {
  try {
    logger.debug('Fetching recent tokens');
    
    const url = `${BIRDEYE_API_BASE_URL}/public/recent_listings`;
    const response = await get(url, {
      params: {
        offset: 0,
        limit
      },
      headers: {
        'X-API-KEY': apiKey
      }
    }, {
      useCache: true,
      ttl: 300000 // 5 minutes cache
    });
    
    if (!response.success) {
      throw new Error(`Birdeye API error: ${response.message || 'Unknown error'}`);
    }
    
    return response.data || [];
  } catch (error) {
    logger.error(`Error fetching recent tokens: ${error.message}`, {
      limit,
      error: error.stack
    });
    
    // Return empty array on error
    return [];
  }
}

/**
 * Get trending tokens
 * 
 * @param {number} limit - Maximum number of results to return
 * @param {string} apiKey - Birdeye API key
 * @returns {Promise<Array>} Trending tokens
 */
async function getTrendingTokens(limit = 20, apiKey) {
  try {
    logger.debug('Fetching trending tokens');
    
    const url = `${BIRDEYE_API_BASE_URL}/public/trending_tokens`;
    const response = await get(url, {
      params: {
        sort_by: 'volume_24h',
        sort_type: 'desc',
        offset: 0,
        limit
      },
      headers: {
        'X-API-KEY': apiKey
      }
    }, {
      useCache: true,
      ttl: 300000 // 5 minutes cache
    });
    
    if (!response.success) {
      throw new Error(`Birdeye API error: ${response.message || 'Unknown error'}`);
    }
    
    return response.data || [];
  } catch (error) {
    logger.error(`Error fetching trending tokens: ${error.message}`, {
      limit,
      error: error.stack
    });
    
    // Return empty array on error
    return [];
  }
}

module.exports = {
  getTokenData,
  getTokenPrice,
  getMarketData,
  getHistoricalData,
  searchTokens,
  getRecentTokens,
  getTrendingTokens
};
