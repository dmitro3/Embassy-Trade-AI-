'use client';

import { startAppTransaction, finishAppTransaction } from './sentryUtils.js';
import logger from './logger.js';
import axios from 'axios';

/**
 * DEX Screener Service
 * 
 * This service provides access to decentralized exchange (DEX) data:
 * - New token pairs
 * - Liquidity information
 * - Trading volume
 * - Price charts
 * - Rug pull risk analysis
 * 
 * It provides a unified interface for accessing DEX data across different chains.
 */
class DexScreenerService {
  constructor() {
    this.initialized = false;
    this.apiKey = process.env.NEXT_PUBLIC_DEXSCREENER_API_KEY || '';
    this.baseUrl = 'https://api.dexscreener.com/latest';
    this.mockPairs = [];
    this.cachedData = new Map();
    this.cacheExpiry = 60 * 1000; // 60 seconds
  }

  /**
   * Initialize the DEX screener service
   */
  async initialize() {
    const transaction = startAppTransaction('dex-screener-initialize', 'dex.init');
    
    try {
      logger.info('Initializing DEX Screener Service');
      
      // Initialize mock data
      this.initializeMockData();
      
      // Validate API key
      const apiKeyValid = await this.validateApiKey();
      
      if (!apiKeyValid) {
        logger.warn('DEX Screener API key is invalid or missing. Using mock data.');
      }
      
      this.initialized = true;
      logger.info('DEX Screener Service initialized successfully');
      return true;
    } catch (error) {
      logger.error(`DEX Screener Service initialization error: ${error.message}`);
      return false;
    } finally {
      finishAppTransaction(transaction);
    }
  }

  /**
   * Initialize mock data
   */
  initializeMockData() {
    // Generate mock token pairs
    const now = Date.now();
    const chains = ['solana', 'ethereum', 'bsc', 'polygon', 'avalanche'];
    const dexes = ['raydium', 'orca', 'jupiter', 'uniswap', 'pancakeswap', 'quickswap', 'trader_joe'];
    
    // Generate some established pairs
    const establishedPairs = [
      {
        chainId: 'solana',
        dexId: 'raydium',
        pairAddress: 'sol-usdc-raydium-pair',
        baseToken: {
          address: 'So11111111111111111111111111111111111111112',
          name: 'Solana',
          symbol: 'SOL'
        },
        quoteToken: {
          address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
          name: 'USD Coin',
          symbol: 'USDC'
        },
        priceUsd: '150.25',
        priceChange: {
          h1: 0.01,
          h24: 0.05,
          d7: 0.12
        },
        liquidity: {
          usd: '25000000'
        },
        volume: {
          h1: '1000000',
          h24: '15000000'
        },
        pairCreatedAt: now - (30 * 24 * 60 * 60 * 1000) // 30 days ago
      },
      {
        chainId: 'solana',
        dexId: 'raydium',
        pairAddress: 'bonk-usdc-raydium-pair',
        baseToken: {
          address: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
          name: 'Bonk',
          symbol: 'BONK'
        },
        quoteToken: {
          address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
          name: 'USD Coin',
          symbol: 'USDC'
        },
        priceUsd: '0.00002',
        priceChange: {
          h1: 0.03,
          h24: 0.15,
          d7: 0.25
        },
        liquidity: {
          usd: '5000000'
        },
        volume: {
          h1: '200000',
          h24: '3000000'
        },
        pairCreatedAt: now - (60 * 24 * 60 * 60 * 1000) // 60 days ago
      },
      {
        chainId: 'solana',
        dexId: 'orca',
        pairAddress: 'jup-usdc-orca-pair',
        baseToken: {
          address: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN',
          name: 'Jupiter',
          symbol: 'JUP'
        },
        quoteToken: {
          address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
          name: 'USD Coin',
          symbol: 'USDC'
        },
        priceUsd: '1.25',
        priceChange: {
          h1: -0.01,
          h24: -0.03,
          d7: 0.05
        },
        liquidity: {
          usd: '8000000'
        },
        volume: {
          h1: '300000',
          h24: '5000000'
        },
        pairCreatedAt: now - (45 * 24 * 60 * 60 * 1000) // 45 days ago
      }
    ];
    
    this.mockPairs = [...establishedPairs];
    
    // Generate new pairs with random data
    for (let i = 0; i < 50; i++) {
      const chainId = chains[Math.floor(Math.random() * chains.length)];
      const dexId = dexes[Math.floor(Math.random() * dexes.length)];
      const pairCreatedAt = now - (Math.random() * 7 * 24 * 60 * 60 * 1000); // 0-7 days ago
      const baseTokenSymbol = `TOKEN${i + 1}`;
      const liquidity = Math.random() * 1000000; // 0-1M USD
      const priceUsd = Math.random() * 10; // 0-10 USD
      
      this.mockPairs.push({
        chainId,
        dexId,
        pairAddress: `${baseTokenSymbol.toLowerCase()}-usdc-${dexId}-pair`,
        baseToken: {
          address: `mock-token-${i + 1}`,
          name: `Token ${i + 1}`,
          symbol: baseTokenSymbol
        },
        quoteToken: {
          address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
          name: 'USD Coin',
          symbol: 'USDC'
        },
        priceUsd: priceUsd.toString(),
        priceChange: {
          h1: (Math.random() * 0.2) - 0.1, // -10% to +10%
          h24: (Math.random() * 0.4) - 0.2, // -20% to +20%
          d7: (Math.random() * 0.6) - 0.3 // -30% to +30%
        },
        liquidity: {
          usd: liquidity.toString()
        },
        volume: {
          h1: (liquidity * Math.random() * 0.1).toString(), // 0-10% of liquidity
          h24: (liquidity * Math.random() * 0.5).toString() // 0-50% of liquidity
        },
        pairCreatedAt
      });
    }
    
    // Sort by creation time (newest first)
    this.mockPairs.sort((a, b) => b.pairCreatedAt - a.pairCreatedAt);
  }

  /**
   * Validate API key
   * 
   * @returns {Promise<boolean>} - Whether the API key is valid
   */
  async validateApiKey() {
    try {
      // For development, we'll just check if the API key exists
      // In production, we would make a test API call to validate the key
      return !!this.apiKey;
    } catch (error) {
      logger.error(`Error validating DEX Screener API key: ${error.message}`);
      return false;
    }
  }

  /**
   * Get cached data
   * 
   * @param {string} key - Cache key
   * @returns {any} - Cached data or null if not found or expired
   */
  getCachedData(key) {
    if (!this.cachedData.has(key)) {
      return null;
    }
    
    const { data, timestamp } = this.cachedData.get(key);
    const now = Date.now();
    
    if (now - timestamp > this.cacheExpiry) {
      // Cache expired
      this.cachedData.delete(key);
      return null;
    }
    
    return data;
  }

  /**
   * Set cached data
   * 
   * @param {string} key - Cache key
   * @param {any} data - Data to cache
   */
  setCachedData(key, data) {
    this.cachedData.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * Get new token pairs
   * 
   * @param {Object} options - Options
   * @param {string} options.chainId - Chain ID (e.g., 'solana', 'ethereum')
   * @param {number} options.minLiquidity - Minimum liquidity in USD
   * @param {number} options.maxAge - Maximum age in milliseconds
   * @returns {Promise<Array>} - New token pairs
   */
  async getNewPairs(options = {}) {
    const transaction = startAppTransaction('dex-screener-new-pairs', 'dex.new');
    
    try {
      const { chainId = 'solana', minLiquidity = 0, maxAge = 24 * 60 * 60 * 1000 } = options;
      
      logger.info(`Getting new pairs for chain: ${chainId}`);
      
      // Check cache
      const cacheKey = `new-pairs-${chainId}-${minLiquidity}-${maxAge}`;
      const cachedResult = this.getCachedData(cacheKey);
      
      if (cachedResult) {
        return cachedResult;
      }
      
      // Get new pairs
      let newPairs;
      
      if (this.apiKey) {
        // Use DEX Screener API
        newPairs = await this.getNewPairsFromApi(options);
      } else {
        // Use mock data
        newPairs = await this.getNewPairsMock(options);
      }
      
      // Cache result
      this.setCachedData(cacheKey, newPairs);
      
      return newPairs;
    } catch (error) {
      logger.error(`Error getting new pairs: ${error.message}`);
      return [];
    } finally {
      finishAppTransaction(transaction);
    }
  }

  /**
   * Get new token pairs from DEX Screener API
   * 
   * @param {Object} options - Options
   * @returns {Promise<Array>} - New token pairs
   */
  async getNewPairsFromApi(options) {
    try {
      // In a real implementation, this would call the DEX Screener API
      // For now, we'll use mock data
      return await this.getNewPairsMock(options);
    } catch (error) {
      logger.error(`Error getting new pairs from API: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get new token pairs from mock data
   * 
   * @param {Object} options - Options
   * @returns {Promise<Array>} - New token pairs
   */
  async getNewPairsMock(options) {
    try {
      const { chainId = 'solana', minLiquidity = 0, maxAge = 24 * 60 * 60 * 1000 } = options;
      
      const now = Date.now();
      const cutoffTime = now - maxAge;
      
      // Filter pairs
      return this.mockPairs.filter(pair => 
        pair.chainId === chainId &&
        parseFloat(pair.liquidity.usd) >= minLiquidity &&
        pair.pairCreatedAt >= cutoffTime
      );
    } catch (error) {
      logger.error(`Error getting mock new pairs: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get pair data
   * 
   * @param {string} pairAddress - Pair address
   * @param {string} chainId - Chain ID
   * @returns {Promise<Object>} - Pair data
   */
  async getPairData(pairAddress, chainId = 'solana') {
    const transaction = startAppTransaction('dex-screener-pair-data', 'dex.pair');
    
    try {
      logger.info(`Getting pair data for: ${pairAddress}`);
      
      // Check cache
      const cacheKey = `pair-${chainId}-${pairAddress}`;
      const cachedResult = this.getCachedData(cacheKey);
      
      if (cachedResult) {
        return cachedResult;
      }
      
      // Get pair data
      let pairData;
      
      if (this.apiKey) {
        // Use DEX Screener API
        pairData = await this.getPairDataFromApi(pairAddress, chainId);
      } else {
        // Use mock data
        pairData = await this.getPairDataMock(pairAddress, chainId);
      }
      
      // Cache result
      this.setCachedData(cacheKey, pairData);
      
      return pairData;
    } catch (error) {
      logger.error(`Error getting pair data: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    } finally {
      finishAppTransaction(transaction);
    }
  }

  /**
   * Get pair data from DEX Screener API
   * 
   * @param {string} pairAddress - Pair address
   * @param {string} chainId - Chain ID
   * @returns {Promise<Object>} - Pair data
   */
  async getPairDataFromApi(pairAddress, chainId) {
    try {
      // In a real implementation, this would call the DEX Screener API
      // For now, we'll use mock data
      return await this.getPairDataMock(pairAddress, chainId);
    } catch (error) {
      logger.error(`Error getting pair data from API: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get pair data from mock data
   * 
   * @param {string} pairAddress - Pair address
   * @param {string} chainId - Chain ID
   * @returns {Promise<Object>} - Pair data
   */
  async getPairDataMock(pairAddress, chainId) {
    try {
      // Find pair
      const pair = this.mockPairs.find(p => 
        p.pairAddress === pairAddress && p.chainId === chainId
      );
      
      if (!pair) {
        return {
          success: false,
          error: 'Pair not found'
        };
      }
      
      // Generate price history
      const now = Date.now();
      const hourlyPrices = [];
      const dailyPrices = [];
      
      // Generate hourly prices for the last 24 hours
      for (let i = 0; i < 24; i++) {
        const timestamp = now - (i * 60 * 60 * 1000);
        const price = parseFloat(pair.priceUsd) * (1 + ((Math.random() * 0.1) - 0.05)); // ±5%
        
        hourlyPrices.unshift({
          timestamp,
          price: price.toString()
        });
      }
      
      // Generate daily prices for the last 30 days
      for (let i = 0; i < 30; i++) {
        const timestamp = now - (i * 24 * 60 * 60 * 1000);
        const price = parseFloat(pair.priceUsd) * (1 + ((Math.random() * 0.3) - 0.15)); // ±15%
        
        dailyPrices.unshift({
          timestamp,
          price: price.toString()
        });
      }
      
      // Add price history to pair data
      const pairData = {
        ...pair,
        priceHistory: {
          hourly: hourlyPrices,
          daily: dailyPrices
        }
      };
      
      return {
        success: true,
        data: pairData
      };
    } catch (error) {
      logger.error(`Error getting mock pair data: ${error.message}`);
      throw error;
    }
  }

  /**
   * Analyze rug pull risk
   * 
   * @param {Object} pair - Pair data
   * @returns {Object} - Rug pull risk analysis
   */
  analyzeRugPullRisk(pair) {
    try {
      // Extract relevant data
      const liquidity = parseFloat(pair.liquidity?.usd || '0');
      const volume24h = parseFloat(pair.volume?.h24 || '0');
      const pairAge = Date.now() - new Date(pair.pairCreatedAt).getTime();
      const pairAgeDays = pairAge / (24 * 60 * 60 * 1000);
      
      // Calculate risk factors
      const liquidityFactor = Math.min(liquidity / 100000, 1); // 0-1, higher is better
      const volumeFactor = Math.min(volume24h / liquidity, 1); // 0-1, higher is better
      const ageFactor = Math.min(pairAgeDays / 30, 1); // 0-1, higher is better
      
      // Calculate risk score (0-100, lower is better)
      const riskScore = Math.round(100 * (1 - ((liquidityFactor + volumeFactor + ageFactor) / 3)));
      
      // Determine risk level
      let riskLevel;
      if (riskScore < 20) {
        riskLevel = 'low';
      } else if (riskScore < 50) {
        riskLevel = 'medium';
      } else if (riskScore < 80) {
        riskLevel = 'high';
      } else {
        riskLevel = 'extreme';
      }
      
      // Generate risk factors
      const riskFactors = [];
      
      if (liquidity < 10000) {
        riskFactors.push('Low liquidity');
      }
      
      if (volume24h < 1000) {
        riskFactors.push('Low trading volume');
      }
      
      if (pairAgeDays < 1) {
        riskFactors.push('Very new token');
      }
      
      if (volume24h > liquidity * 5) {
        riskFactors.push('Unusually high volume relative to liquidity');
      }
      
      return {
        riskScore,
        riskLevel,
        riskFactors,
        metrics: {
          liquidity,
          volume24h,
          pairAgeDays
        }
      };
    } catch (error) {
      logger.error(`Error analyzing rug pull risk: ${error.message}`);
      return {
        riskScore: 100,
        riskLevel: 'unknown',
        riskFactors: ['Error analyzing risk'],
        metrics: {}
      };
    }
  }
}

// Create singleton instance
const dexScreenerService = new DexScreenerService();

export default dexScreenerService;
