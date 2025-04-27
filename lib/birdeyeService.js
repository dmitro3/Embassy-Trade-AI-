// filepath: c:\Users\pablo\Projects\embassy-trade-motia\web\lib\birdeyeService.js
'use client';

import axios from 'axios';
import logger from './logger.js';

/**
 * Birdeye API Service
 * 
 * Provides access to the Birdeye API for Solana market data
 */
class BirdeyeService {
  constructor() {
    this.baseUrl = 'https://public-api.birdeye.so';
    this.apiKey = process.env.NEXT_PUBLIC_BIRDEYE_API_KEY || '67f8ce614c594ab2b3efb742f8db69db';
  }

  /**
   * Get token price
   * 
   * @param {string} tokenAddress - The token address
   * @returns {Promise<Object>} - Token price information
   */
  async getTokenPrice(tokenAddress) {
    try {
      const url = `${this.baseUrl}/public/price`;
      const response = await axios.get(url, {
        headers: { 'X-API-KEY': this.apiKey },
        params: { address: tokenAddress }
      });
      
      return response.data.data;
    } catch (error) {
      logger.error(`Birdeye getTokenPrice error: ${error.message}`);
      throw new Error(`Failed to get token price: ${error.message}`);
    }
  }

  /**
   * Get token metadata
   * 
   * @param {string} tokenAddress - The token address
   * @returns {Promise<Object>} - Token metadata
   */
  async getTokenMetadata(tokenAddress) {
    try {
      const url = `${this.baseUrl}/public/token_meta`;
      const response = await axios.get(url, {
        headers: { 'X-API-KEY': this.apiKey },
        params: { address: tokenAddress }
      });
      
      return response.data.data;
    } catch (error) {
      logger.error(`Birdeye getTokenMetadata error: ${error.message}`);
      throw new Error(`Failed to get token metadata: ${error.message}`);
    }
  }

  /**
   * Get token list sorted by market cap
   * 
   * @param {number} limit - Maximum number of tokens to return
   * @returns {Promise<Array>} - Array of tokens
   */
  async getTokenList(limit = 10) {
    try {
      const url = `${this.baseUrl}/defi/tokenlist`;
      const response = await axios.get(url, {
        headers: { 'X-API-KEY': this.apiKey },
        params: { sort_by: 'mc', sort_type: 'desc', offset: 0, limit }
      });
      
      return response.data.data.tokens || [];
    } catch (error) {
      logger.error(`Birdeye getTokenList error: ${error.message}`);
      throw new Error(`Failed to get token list: ${error.message}`);
    }
  }

  /**
   * Get historical price data
   * 
   * @param {string} tokenAddress - The token address
   * @param {string} timeframe - The timeframe ('1H', '1D', '1W', '1M', etc)
   * @param {number} limit - Maximum number of data points to return
   * @returns {Promise<Array>} - Array of price data points
   */
  async getHistoricalPrices(tokenAddress, timeframe = '1H', limit = 100) {
    try {
      const url = `${this.baseUrl}/defi/ohlcv`;
      const response = await axios.get(url, {
        headers: { 'X-API-KEY': this.apiKey },
        params: { 
          address: tokenAddress,
          type: timeframe,
          limit: limit
        }
      });
      
      return response.data.data.items || [];
    } catch (error) {
      logger.error(`Birdeye getHistoricalPrices error: ${error.message}`);
      throw new Error(`Failed to get historical prices: ${error.message}`);
    }
  }

  /**
   * Get market depth (orderbook)
   * 
   * @param {string} tokenAddress - The token address
   * @returns {Promise<Object>} - Market depth data
   */
  async getMarketDepth(tokenAddress) {
    try {
      const url = `${this.baseUrl}/defi/market_depth`;
      const response = await axios.get(url, {
        headers: { 'X-API-KEY': this.apiKey },
        params: { address: tokenAddress }
      });
      
      return response.data.data || {};
    } catch (error) {
      logger.error(`Birdeye getMarketDepth error: ${error.message}`);
      throw new Error(`Failed to get market depth: ${error.message}`);
    }
  }

  /**
   * Get token metrics (volume, TVL, etc)
   * 
   * @param {string} tokenAddress - The token address
   * @returns {Promise<Object>} - Token metrics
   */
  async getTokenMetrics(tokenAddress) {
    try {
      const url = `${this.baseUrl}/defi/token_metric`;
      const response = await axios.get(url, {
        headers: { 'X-API-KEY': this.apiKey },
        params: { address: tokenAddress }
      });
      
      return response.data.data || {};
    } catch (error) {
      logger.error(`Birdeye getTokenMetrics error: ${error.message}`);
      throw new Error(`Failed to get token metrics: ${error.message}`);
    }
  }
}

// Create and export singleton instance
const birdeyeService = new BirdeyeService();
export default birdeyeService;
