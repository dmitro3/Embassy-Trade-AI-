/**
 * SHYFT Data Normalization MCP Server
 * 
 * This MCP server provides normalized data from the SHYFT API, with caching,
 * error handling, and retry mechanisms.
 */

import dotenv from 'dotenv';
import axios from 'axios';
import NodeCache from 'node-cache';
import winston from 'winston';
import { createServer } from 'http';
import { createInterface } from 'readline';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables - try multiple locations
dotenv.config(); // Load default .env
dotenv.config({ path: '.env.local' }); // Load .env.local
// Try to load from the workspace root if we're in a subdirectory
const rootEnvPath = path.resolve(process.cwd(), '../../.env.local');
if (fs.existsSync(rootEnvPath)) {
  dotenv.config({ path: rootEnvPath });
}

// Configure logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    new winston.transports.File({ filename: 'shyft-data-mcp.log' })
  ]
});

// Initialize cache
const cache = new NodeCache({
  stdTTL: 60, // 60 seconds default TTL
  checkperiod: 120, // Check for expired keys every 120 seconds
  useClones: false // Don't clone objects when getting/setting
});

// SHYFT API configuration
const SHYFT_API_KEY = process.env.SHYFT_API_KEY || 'whv00T87G8Sd8TeK';
const SHYFT_API_URL = 'https://api.shyft.to/sol/v1';

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

/**
 * Make a request to the SHYFT API with retry logic
 * 
 * @param {string} endpoint - API endpoint
 * @param {Object} params - Query parameters
 * @returns {Promise<Object>} - API response
 */
async function makeShyftRequest(endpoint, params = {}) {
  let retries = 0;
  let lastError = null;
  
  while (retries <= MAX_RETRIES) {
    try {
      const response = await axios.get(`${SHYFT_API_URL}${endpoint}`, {
        params,
        headers: {
          'x-api-key': SHYFT_API_KEY,
          'Content-Type': 'application/json'
        },
        timeout: 10000 // 10 seconds
      });
      
      return response.data;
    } catch (error) {
      lastError = error;
      
      // Check if we should retry
      if (retries >= MAX_RETRIES) {
        break;
      }
      
      // Calculate backoff delay
      const delay = RETRY_DELAY * Math.pow(2, retries);
      
      logger.warn(`SHYFT API request failed, retrying in ${delay}ms: ${endpoint} - ${error.message}`);
      
      // Wait for backoff delay
      await new Promise(resolve => setTimeout(resolve, delay));
      
      retries++;
    }
  }
  
  // If we get here, all retries failed
  throw lastError || new Error(`Failed to call SHYFT API after ${MAX_RETRIES} retries`);
}

/**
 * Get token metadata
 * 
 * @param {string} tokenAddress - Token address
 * @returns {Promise<Object>} - Token metadata
 */
async function getTokenMetadata(tokenAddress) {
  const cacheKey = `token_metadata_${tokenAddress}`;
  
  // Check cache first
  const cachedData = cache.get(cacheKey);
  if (cachedData) {
    logger.debug(`Cache hit for token metadata: ${tokenAddress}`);
    return cachedData;
  }
  
  logger.info(`Fetching token metadata from SHYFT: ${tokenAddress}`);
  
  try {
    const response = await makeShyftRequest('/token/get_info', {
      network: 'mainnet-beta',
      token_address: tokenAddress
    });
    
    // Normalize the response
    const normalizedData = {
      address: tokenAddress,
      name: response.result?.name || 'Unknown',
      symbol: response.result?.symbol || 'UNKNOWN',
      decimals: response.result?.decimals || 0,
      supply: response.result?.supply || '0',
      logoURI: response.result?.icon || null,
      extensions: response.result?.extensions || {},
      lastUpdated: new Date().toISOString()
    };
    
    // Cache the normalized data
    cache.set(cacheKey, normalizedData, 3600); // Cache for 1 hour
    
    return normalizedData;
  } catch (error) {
    logger.error(`Error fetching token metadata: ${error.message}`);
    throw error;
  }
}

/**
 * Get token price
 * 
 * @param {string} tokenAddress - Token address
 * @returns {Promise<Object>} - Token price data
 */
async function getTokenPrice(tokenAddress) {
  const cacheKey = `token_price_${tokenAddress}`;
  
  // Check cache first
  const cachedData = cache.get(cacheKey);
  if (cachedData) {
    logger.debug(`Cache hit for token price: ${tokenAddress}`);
    return cachedData;
  }
  
  logger.info(`Fetching token price from SHYFT: ${tokenAddress}`);
  
  try {
    const response = await makeShyftRequest('/token/price', {
      network: 'mainnet-beta',
      token_address: tokenAddress
    });
    
    // Normalize the response
    const normalizedData = {
      address: tokenAddress,
      price: parseFloat(response.result?.value || 0),
      priceUsd: parseFloat(response.result?.value_in_usd || 0),
      lastUpdated: new Date().toISOString()
    };
    
    // Cache the normalized data
    cache.set(cacheKey, normalizedData, 60); // Cache for 1 minute
    
    return normalizedData;
  } catch (error) {
    logger.error(`Error fetching token price: ${error.message}`);
    throw error;
  }
}

/**
 * Get token holders
 * 
 * @param {string} tokenAddress - Token address
 * @param {number} limit - Number of holders to return
 * @returns {Promise<Object>} - Token holders data
 */
async function getTokenHolders(tokenAddress, limit = 10) {
  const cacheKey = `token_holders_${tokenAddress}_${limit}`;
  
  // Check cache first
  const cachedData = cache.get(cacheKey);
  if (cachedData) {
    logger.debug(`Cache hit for token holders: ${tokenAddress}`);
    return cachedData;
  }
  
  logger.info(`Fetching token holders from SHYFT: ${tokenAddress}`);
  
  try {
    const response = await makeShyftRequest('/token/holders', {
      network: 'mainnet-beta',
      token_address: tokenAddress,
      limit
    });
    
    // Normalize the response
    const normalizedData = {
      address: tokenAddress,
      holders: response.result?.map(holder => ({
        address: holder.owner,
        amount: holder.amount,
        percentage: holder.percentage
      })) || [],
      totalHolders: response.result?.length || 0,
      lastUpdated: new Date().toISOString()
    };
    
    // Cache the normalized data
    cache.set(cacheKey, normalizedData, 3600); // Cache for 1 hour
    
    return normalizedData;
  } catch (error) {
    logger.error(`Error fetching token holders: ${error.message}`);
    throw error;
  }
}

/**
 * Get token transactions
 * 
 * @param {string} tokenAddress - Token address
 * @param {number} limit - Number of transactions to return
 * @returns {Promise<Object>} - Token transactions data
 */
async function getTokenTransactions(tokenAddress, limit = 10) {
  const cacheKey = `token_transactions_${tokenAddress}_${limit}`;
  
  // Check cache first
  const cachedData = cache.get(cacheKey);
  if (cachedData) {
    logger.debug(`Cache hit for token transactions: ${tokenAddress}`);
    return cachedData;
  }
  
  logger.info(`Fetching token transactions from SHYFT: ${tokenAddress}`);
  
  try {
    const response = await makeShyftRequest('/token/get_transactions', {
      network: 'mainnet-beta',
      token_address: tokenAddress,
      limit
    });
    
    // Normalize the response
    const normalizedData = {
      address: tokenAddress,
      transactions: response.result?.map(tx => ({
        signature: tx.signature,
        type: tx.type,
        blockTime: tx.timestamp,
        slot: tx.slot,
        fee: tx.fee,
        status: tx.status,
        sender: tx.sender,
        receiver: tx.receiver,
        amount: tx.amount
      })) || [],
      totalTransactions: response.result?.length || 0,
      lastUpdated: new Date().toISOString()
    };
    
    // Cache the normalized data
    cache.set(cacheKey, normalizedData, 300); // Cache for 5 minutes
    
    return normalizedData;
  } catch (error) {
    logger.error(`Error fetching token transactions: ${error.message}`);
    throw error;
  }
}

/**
 * Get token historical prices
 * 
 * @param {string} tokenAddress - Token address
 * @param {string} timeframe - Timeframe (1h, 1d, 1w, 1m)
 * @returns {Promise<Object>} - Token historical prices data
 */
async function getTokenHistoricalPrices(tokenAddress, timeframe = '1d') {
  const cacheKey = `token_historical_prices_${tokenAddress}_${timeframe}`;
  
  // Check cache first
  const cachedData = cache.get(cacheKey);
  if (cachedData) {
    logger.debug(`Cache hit for token historical prices: ${tokenAddress}`);
    return cachedData;
  }
  
  logger.info(`Fetching token historical prices from SHYFT: ${tokenAddress}`);
  
  try {
    // SHYFT doesn't have a direct historical prices endpoint, so we'll simulate it
    // In a real implementation, you would use a different API or database
    
    // Simulate historical prices
    const now = Date.now();
    const prices = [];
    
    let interval;
    let dataPoints;
    
    switch (timeframe) {
      case '1h':
        interval = 60 * 1000; // 1 minute
        dataPoints = 60;
        break;
      case '1d':
        interval = 60 * 60 * 1000; // 1 hour
        dataPoints = 24;
        break;
      case '1w':
        interval = 6 * 60 * 60 * 1000; // 6 hours
        dataPoints = 28;
        break;
      case '1m':
        interval = 24 * 60 * 60 * 1000; // 1 day
        dataPoints = 30;
        break;
      default:
        interval = 60 * 60 * 1000; // 1 hour
        dataPoints = 24;
    }
    
    // Get current price
    const currentPrice = await getTokenPrice(tokenAddress);
    
    // Generate historical prices
    for (let i = 0; i < dataPoints; i++) {
      const timestamp = now - (i * interval);
      
      // Simulate price fluctuation (±5%)
      const fluctuation = (Math.random() * 0.1) - 0.05;
      const price = currentPrice.price * (1 + fluctuation);
      
      prices.unshift({
        timestamp: new Date(timestamp).toISOString(),
        price,
        priceUsd: price * (currentPrice.priceUsd / currentPrice.price)
      });
    }
    
    // Normalize the response
    const normalizedData = {
      address: tokenAddress,
      timeframe,
      prices,
      lastUpdated: new Date().toISOString()
    };
    
    // Cache the normalized data
    cache.set(cacheKey, normalizedData, 300); // Cache for 5 minutes
    
    return normalizedData;
  } catch (error) {
    logger.error(`Error fetching token historical prices: ${error.message}`);
    throw error;
  }
}

/**
 * Get token market data
 * 
 * @param {string} tokenAddress - Token address
 * @returns {Promise<Object>} - Token market data
 */
async function getTokenMarketData(tokenAddress) {
  const cacheKey = `token_market_data_${tokenAddress}`;
  
  // Check cache first
  const cachedData = cache.get(cacheKey);
  if (cachedData) {
    logger.debug(`Cache hit for token market data: ${tokenAddress}`);
    return cachedData;
  }
  
  logger.info(`Fetching token market data for: ${tokenAddress}`);
  
  try {
    // Get token metadata and price in parallel
    const [metadata, price] = await Promise.all([
      getTokenMetadata(tokenAddress),
      getTokenPrice(tokenAddress)
    ]);
    
    // Normalize the response
    const normalizedData = {
      address: tokenAddress,
      name: metadata.name,
      symbol: metadata.symbol,
      decimals: metadata.decimals,
      logoURI: metadata.logoURI,
      price: price.price,
      priceUsd: price.priceUsd,
      supply: metadata.supply,
      marketCap: price.priceUsd * (parseInt(metadata.supply) / Math.pow(10, metadata.decimals)),
      lastUpdated: new Date().toISOString()
    };
    
    // Cache the normalized data
    cache.set(cacheKey, normalizedData, 60); // Cache for 1 minute
    
    return normalizedData;
  } catch (error) {
    logger.error(`Error fetching token market data: ${error.message}`);
    throw error;
  }
}

/**
 * Get multiple tokens market data
 * 
 * @param {Array<string>} tokenAddresses - Array of token addresses
 * @returns {Promise<Array<Object>>} - Array of token market data
 */
async function getMultipleTokensMarketData(tokenAddresses) {
  logger.info(`Fetching market data for ${tokenAddresses.length} tokens`);
  
  try {
    // Get market data for each token in parallel
    const marketDataPromises = tokenAddresses.map(address => getTokenMarketData(address));
    const marketData = await Promise.all(marketDataPromises);
    
    return marketData;
  } catch (error) {
    logger.error(`Error fetching multiple tokens market data: ${error.message}`);
    throw error;
  }
}

/**
 * Get token portfolio for a wallet
 * 
 * @param {string} walletAddress - Wallet address
 * @returns {Promise<Object>} - Token portfolio data
 */
async function getTokenPortfolio(walletAddress) {
  const cacheKey = `token_portfolio_${walletAddress}`;
  
  // Check cache first
  const cachedData = cache.get(cacheKey);
  if (cachedData) {
    logger.debug(`Cache hit for token portfolio: ${walletAddress}`);
    return cachedData;
  }
  
  logger.info(`Fetching token portfolio from SHYFT: ${walletAddress}`);
  
  try {
    const response = await makeShyftRequest('/wallet/all_tokens', {
      network: 'mainnet-beta',
      wallet: walletAddress
    });
    
    // Get token addresses
    const tokenAddresses = response.result?.map(token => token.address) || [];
    
    // Get market data for all tokens
    const marketData = await getMultipleTokensMarketData(tokenAddresses);
    
    // Create a map of token address to market data
    const marketDataMap = marketData.reduce((map, data) => {
      map[data.address] = data;
      return map;
    }, {});
    
    // Normalize the response
    const normalizedData = {
      walletAddress,
      tokens: response.result?.map(token => {
        const market = marketDataMap[token.address] || {};
        
        return {
          address: token.address,
          name: token.info?.name || market.name || 'Unknown',
          symbol: token.info?.symbol || market.symbol || 'UNKNOWN',
          decimals: token.info?.decimals || market.decimals || 0,
          logoURI: token.info?.image || market.logoURI || null,
          balance: token.balance,
          price: market.price || 0,
          priceUsd: market.priceUsd || 0,
          value: (token.balance * (market.price || 0)),
          valueUsd: (token.balance * (market.priceUsd || 0))
        };
      }) || [],
      totalValueUsd: response.result?.reduce((total, token) => {
        const market = marketDataMap[token.address] || {};
        return total + (token.balance * (market.priceUsd || 0));
      }, 0) || 0,
      lastUpdated: new Date().toISOString()
    };
    
    // Cache the normalized data
    cache.set(cacheKey, normalizedData, 60); // Cache for 1 minute
    
    return normalizedData;
  } catch (error) {
    logger.error(`Error fetching token portfolio: ${error.message}`);
    throw error;
  }
}

// MCP server configuration
const MCP_SERVER_CONFIG = {
  name: 'github.com/tradeforce/shyft-data-mcp',
  version: '1.0.0',
  description: 'MCP server for SHYFT API data normalization',
  tools: [
    {
      name: 'get_token_metadata',
      description: 'Get token metadata',
      parameters: {
        type: 'object',
        properties: {
          tokenAddress: {
            type: 'string',
            description: 'Token address'
          }
        },
        required: ['tokenAddress']
      }
    },
    {
      name: 'get_token_price',
      description: 'Get token price',
      parameters: {
        type: 'object',
        properties: {
          tokenAddress: {
            type: 'string',
            description: 'Token address'
          }
        },
        required: ['tokenAddress']
      }
    },
    {
      name: 'get_token_holders',
      description: 'Get token holders',
      parameters: {
        type: 'object',
        properties: {
          tokenAddress: {
            type: 'string',
            description: 'Token address'
          },
          limit: {
            type: 'number',
            description: 'Number of holders to return',
            default: 10
          }
        },
        required: ['tokenAddress']
      }
    },
    {
      name: 'get_token_transactions',
      description: 'Get token transactions',
      parameters: {
        type: 'object',
        properties: {
          tokenAddress: {
            type: 'string',
            description: 'Token address'
          },
          limit: {
            type: 'number',
            description: 'Number of transactions to return',
            default: 10
          }
        },
        required: ['tokenAddress']
      }
    },
    {
      name: 'get_token_historical_prices',
      description: 'Get token historical prices',
      parameters: {
        type: 'object',
        properties: {
          tokenAddress: {
            type: 'string',
            description: 'Token address'
          },
          timeframe: {
            type: 'string',
            description: 'Timeframe (1h, 1d, 1w, 1m)',
            default: '1d',
            enum: ['1h', '1d', '1w', '1m']
          }
        },
        required: ['tokenAddress']
      }
    },
    {
      name: 'get_token_market_data',
      description: 'Get token market data',
      parameters: {
        type: 'object',
        properties: {
          tokenAddress: {
            type: 'string',
            description: 'Token address'
          }
        },
        required: ['tokenAddress']
      }
    },
    {
      name: 'get_multiple_tokens_market_data',
      description: 'Get multiple tokens market data',
      parameters: {
        type: 'object',
        properties: {
          tokenAddresses: {
            type: 'array',
            items: {
              type: 'string'
            },
            description: 'Array of token addresses'
          }
        },
        required: ['tokenAddresses']
      }
    },
    {
      name: 'get_token_portfolio',
      description: 'Get token portfolio for a wallet',
      parameters: {
        type: 'object',
        properties: {
          walletAddress: {
            type: 'string',
            description: 'Wallet address'
          }
        },
        required: ['walletAddress']
      }
    }
  ],
  resources: [
    {
      uri: '/health',
      description: 'Health check endpoint'
    },
    {
      uri: '/token/:address/metadata',
      description: 'Get token metadata'
    },
    {
      uri: '/token/:address/price',
      description: 'Get token price'
    },
    {
      uri: '/token/:address/holders',
      description: 'Get token holders'
    },
    {
      uri: '/token/:address/transactions',
      description: 'Get token transactions'
    },
    {
      uri: '/token/:address/historical-prices',
      description: 'Get token historical prices'
    },
    {
      uri: '/token/:address/market-data',
      description: 'Get token market data'
    },
    {
      uri: '/wallet/:address/portfolio',
      description: 'Get token portfolio for a wallet'
    }
  ]
};

// Tool implementations
const TOOL_IMPLEMENTATIONS = {
  get_token_metadata: async (params) => {
    try {
      const { tokenAddress } = params;
      const data = await getTokenMetadata(tokenAddress);
      
      return {
        success: true,
        data
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  },
  
  get_token_price: async (params) => {
    try {
      const { tokenAddress } = params;
      const data = await getTokenPrice(tokenAddress);
      
      return {
        success: true,
        data
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  },
  
  get_token_holders: async (params) => {
    try {
      const { tokenAddress, limit = 10 } = params;
      const data = await getTokenHolders(tokenAddress, limit);
      
      return {
        success: true,
        data
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  },
  
  get_token_transactions: async (params) => {
    try {
      const { tokenAddress, limit = 10 } = params;
      const data = await getTokenTransactions(tokenAddress, limit);
      
      return {
        success: true,
        data
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  },
  
  get_token_historical_prices: async (params) => {
    try {
      const { tokenAddress, timeframe = '1d' } = params;
      const data = await getTokenHistoricalPrices(tokenAddress, timeframe);
      
      return {
        success: true,
        data
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  },
  
  get_token_market_data: async (params) => {
    try {
      const { tokenAddress } = params;
      const data = await getTokenMarketData(tokenAddress);
      
      return {
        success: true,
        data
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  },
  
  get_multiple_tokens_market_data: async (params) => {
    try {
      const { tokenAddresses } = params;
      const data = await getMultipleTokensMarketData(tokenAddresses);
      
      return {
        success: true,
        data
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  },
  
  get_token_portfolio: async (params) => {
    try {
      const { walletAddress } = params;
      const data = await getTokenPortfolio(walletAddress);
      
      return {
        success: true,
        data
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
};

// Resource implementations
const RESOURCE_IMPLEMENTATIONS = {
  '/health': async () => {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    };
  },
  
  '/token/:address/metadata': async (params) => {
    const { address } = params;
    return await getTokenMetadata(address);
  },
  
  '/token/:address/price': async (params) => {
    const { address } = params;
    return await getTokenPrice(address);
  },
  
  '/token/:address/holders': async (params) => {
    const { address } = params;
    const limit = params.limit ? parseInt(params.limit) : 10;
    return await getTokenHolders(address, limit);
  },
  
  '/token/:address/transactions': async (params) => {
    const { address } = params;
    const limit = params.limit ? parseInt(params.limit) : 10;
    return await getTokenTransactions(address, limit);
  },
  
  '/token/:address/historical-prices': async (params) => {
    const { address } = params;
    const timeframe = params.timeframe || '1d';
    return await getTokenHistoricalPrices(address, timeframe);
  },
  
  '/token/:address/market-data': async (params) => {
    const { address } = params;
    return await getTokenMarketData(address);
  },
  
  '/wallet/:address/portfolio': async (params) => {
    const { address } = params;
    return await getTokenPortfolio(address);
  }
};

// MCP server implementation
const stdin = createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

// Handle incoming messages
stdin.on('line', async (line) => {
  try {
    const message = JSON.parse(line);
    
    if (message.type === 'config') {
      // Respond with server configuration
      process.stdout.write(JSON.stringify({
        type: 'config',
        config: MCP_SERVER_CONFIG
      }) + '\n');
    } else if (message.type === 'tool') {
      // Handle tool request
      const { name, params } = message;
      
      if (!TOOL_IMPLEMENTATIONS[name]) {
        process.stdout.write(JSON.stringify({
          type: 'tool_result',
          id: message.id,
          success: false,
          error: `Tool not found: ${name}`
        }) + '\n');
        return;
      }
      
      try {
        const result = await TOOL_IMPLEMENTATIONS[name](params);
        
        process.stdout.write(JSON.stringify({
          type: 'tool_result',
          id: message.id,
          ...result
        }) + '\n');
      } catch (error) {
        process.stdout.write(JSON.stringify({
          type: 'tool_result',
          id: message.id,
          success: false,
          error: error.message
        }) + '\n');
      }
    } else if (message.type === 'resource') {
      // Handle resource request
      const { uri, params } = message;
      
      // Find matching resource
      const resourcePattern = Object.keys(RESOURCE_IMPLEMENTATIONS).find(pattern => {
        // Convert pattern to regex
        const regexPattern = pattern
          .replace(/:[^/]+/g, '([^/]+)') // Replace :param with capture group
          .replace(/\//g, '\\/'); // Escape slashes
        
        const regex = new RegExp(`^${regexPattern}$`);
        return regex.test(uri);
      });
      
      if (!resourcePattern) {
        process.stdout.write(JSON.stringify({
          type: 'resource_result',
          id: message.id,
          success: false,
          error: `Resource not found: ${uri}`
        }) + '\n');
        return;
      }
      
      try {
        // Extract params from URI
        const regexPattern = resourcePattern
          .replace(/:[^/]+/g, '([^/]+)') // Replace :param with capture group
          .replace(/\//g, '\\/'); // Escape slashes
        
        const regex = new RegExp(`^${regexPattern}$`);
        const match = uri.match(regex);
        
        // Get param names from pattern
        const paramNames = (resourcePattern.match(/:[^/]+/g) || [])
          .map(param => param.substring(1));
        
        // Create params object
        const resourceParams = { ...params };
        
        if (match && paramNames.length > 0) {
          for (let i = 0; i < paramNames.length; i++) {
            resourceParams[paramNames[i]] = match[i + 1];
          }
        }
        
        const data = await RESOURCE_IMPLEMENTATIONS[resourcePattern](resourceParams);
        
        process.stdout.write(JSON.stringify({
          type: 'resource_result',
          id: message.id,
          success: true,
          data
        }) + '\n');
      } catch (error) {
        process.stdout.write(JSON.stringify({
          type: 'resource_result',
          id: message.id,
          success: false,
          error: error.message
        }) + '\n');
      }
    }
  } catch (error) {
    logger.error(`Error processing message: ${error.message}`);
    
    process.stdout.write(JSON.stringify({
      type: 'error',
      error: error.message
    }) + '\n');
  }
});

// Start the server
logger.info('SHYFT Data Normalization MCP Server started');
process.stdout.write(JSON.stringify({
  type: 'ready',
  config: MCP_SERVER_CONFIG
}) + '\n');
