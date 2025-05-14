/**
 * Pump.fun API Connector
 * 
 * This module provides functions to interact with the Pump.fun API for token
 * discovery, metadata retrieval, and trading.
 */

const axios = require('axios');
const logger = require('../logger');

/**
 * Pump.fun API Connector
 */
class PumpfunConnector {
  constructor() {
    this.baseUrl = 'https://pumpapi.fun/api';
    this.cache = new Map();
    this.cacheExpiry = 60000; // 1 minute cache expiry
  }

  /**
   * Get newer token mints from Pump.fun
   * 
   * @param {Object} options - Options for the request
   * @param {number} options.limit - Maximum number of tokens to return
   * @returns {Promise<Array>} - Array of new token mints
   */
  async getNewerMints(options = {}) {
    try {
      const { limit = 10 } = options;
      const cacheKey = `newer_mints_${limit}`;
      
      // Check cache
      if (this.cache.has(cacheKey)) {
        const { data, timestamp } = this.cache.get(cacheKey);
        if (Date.now() - timestamp < this.cacheExpiry) {
          return data;
        }
      }
      
      // Make API request
      const response = await axios.get(`${this.baseUrl}/get_newer_mints`, {
        params: { limit }
      });
      
      if (response.status !== 200) {
        throw new Error(`Failed to get newer mints: ${response.status}`);
      }
      
      // Cache the result
      this.cache.set(cacheKey, {
        data: response.data,
        timestamp: Date.now()
      });
      
      return response.data;
    } catch (error) {
      logger.error(`Error getting newer mints from Pump.fun: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get token metadata from Pump.fun
   * 
   * @param {string} tokenAddress - Solana token address
   * @returns {Promise<Object>} - Token metadata
   */
  async getTokenMetadata(tokenAddress) {
    try {
      const cacheKey = `metadata_${tokenAddress}`;
      
      // Check cache
      if (this.cache.has(cacheKey)) {
        const { data, timestamp } = this.cache.get(cacheKey);
        if (Date.now() - timestamp < this.cacheExpiry) {
          return data;
        }
      }
      
      // Make API request
      const response = await axios.get(`${this.baseUrl}/get_metadata/${tokenAddress}`);
      
      if (response.status !== 200) {
        throw new Error(`Failed to get token metadata: ${response.status}`);
      }
      
      // Cache the result
      this.cache.set(cacheKey, {
        data: response.data,
        timestamp: Date.now()
      });
      
      return response.data;
    } catch (error) {
      logger.error(`Error getting token metadata from Pump.fun: ${error.message}`);
      throw error;
    }
  }

  /**
   * Execute a trade on Pump.fun
   * 
   * @param {Object} options - Trade options
   * @param {string} options.trade_type - "buy" or "sell"
   * @param {string} options.mint - Token mint address
   * @param {number} options.amount - Amount of SOL or tokens to trade
   * @param {number} options.slippage - Slippage allowed (integer)
   * @param {number} options.priorityFee - Amount to use as priority fee (optional)
   * @param {string} options.userPrivateKey - Wallet private key
   * @returns {Promise<Object>} - Trade result
   */
  async executeTrade(options) {
    try {
      const { trade_type, mint, amount, slippage, priorityFee, userPrivateKey } = options;
      
      // Validate required parameters
      if (!trade_type || !mint || !amount || !slippage || !userPrivateKey) {
        throw new Error('Missing required parameters for trade execution');
      }
      
      // Make API request
      const response = await axios.post(`${this.baseUrl}/trade`, {
        trade_type,
        mint,
        amount,
        slippage,
        priorityFee,
        userPrivateKey
      });
      
      if (response.status !== 200) {
        throw new Error(`Failed to execute trade: ${response.status}`);
      }
      
      return response.data;
    } catch (error) {
      logger.error(`Error executing trade on Pump.fun: ${error.message}`);
      throw error;
    }
  }

  /**
   * Format token data from Pump.fun API response
   * 
   * @param {Object} tokenData - Raw token data from API
   * @returns {Object} - Formatted token data
   */
  formatTokenData(tokenData) {
    if (!tokenData || !tokenData.result) {
      return null;
    }
    
    const { result } = tokenData;
    
    return {
      address: result.address,
      symbol: result.symbol,
      name: result.name,
      description: result.description,
      image: result.image,
      decimals: result.decimals,
      supply: result.current_supply,
      mintAuthority: result.mint_authority,
      freezeAuthority: result.freeze_authority,
      extensions: result.extensions
    };
  }

  /**
   * Clear the cache
   */
  clearCache() {
    this.cache.clear();
  }
}

// Create and export singleton instance
const pumpfunConnector = new PumpfunConnector();
module.exports = pumpfunConnector;
