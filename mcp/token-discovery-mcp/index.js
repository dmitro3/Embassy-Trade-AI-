/**
 * Token Discovery MCP Server
 * 
 * This MCP server provides tools for discovering new tokens and sniping opportunities
 * on the Solana blockchain.
 */

import Fastify from 'fastify';
import { Connection, PublicKey } from '@solana/web3.js';
import axios from 'axios';
import dotenv from 'dotenv';
import WebSocket from 'ws';

// Load environment variables
dotenv.config();

// Initialize Fastify server
const fastify = Fastify({
  logger: true
});

// Configure Solana connection
const SOLANA_RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';
const connection = new Connection(SOLANA_RPC_URL, 'confirmed');

// Configure API keys
const SHYFT_API_KEY = process.env.SHYFT_API_KEY || 'whv00T87G8Sd8TeK';
const BIRDEYE_API_KEY = process.env.BIRDEYE_API_KEY || '67f8ce614c594ab2b3efb742f8db69db';

// In-memory cache for token data
const tokenCache = new Map();
const newPairsCache = [];
const watchlist = new Set();

// WebSocket connections for real-time updates
const activeWebSockets = new Map();

/**
 * MCP Server Configuration
 */
const MCP_CONFIG = {
  name: 'Token Discovery MCP',
  version: '1.0.0',
  description: 'MCP server for token discovery and sniping on Solana',
  tools: [
    {
      name: 'scan_new_tokens',
      description: 'Scan for new token listings on Solana DEXs',
      parameters: {
        type: 'object',
        properties: {
          timeframe: {
            type: 'string',
            description: 'Timeframe to scan (e.g., "1h", "24h", "7d")',
            default: '24h'
          },
          minLiquidity: {
            type: 'number',
            description: 'Minimum liquidity in USD',
            default: 10000
          },
          limit: {
            type: 'number',
            description: 'Maximum number of tokens to return',
            default: 10
          }
        },
        required: []
      }
    },
    {
      name: 'analyze_token',
      description: 'Analyze a token for trading potential',
      parameters: {
        type: 'object',
        properties: {
          tokenAddress: {
            type: 'string',
            description: 'Solana token address to analyze'
          },
          includeContractAudit: {
            type: 'boolean',
            description: 'Whether to include contract audit information',
            default: true
          },
          includeSocialMetrics: {
            type: 'boolean',
            description: 'Whether to include social media metrics',
            default: true
          }
        },
        required: ['tokenAddress']
      }
    },
    {
      name: 'monitor_token',
      description: 'Add a token to the monitoring watchlist',
      parameters: {
        type: 'object',
        properties: {
          tokenAddress: {
            type: 'string',
            description: 'Solana token address to monitor'
          },
          alertThresholds: {
            type: 'object',
            description: 'Price and volume thresholds for alerts',
            properties: {
              priceChangePercent: {
                type: 'number',
                description: 'Price change percentage threshold',
                default: 5
              },
              volumeChangePercent: {
                type: 'number',
                description: 'Volume change percentage threshold',
                default: 100
              }
            }
          }
        },
        required: ['tokenAddress']
      }
    },
    {
      name: 'prepare_snipe',
      description: 'Prepare a token sniping transaction',
      parameters: {
        type: 'object',
        properties: {
          tokenAddress: {
            type: 'string',
            description: 'Solana token address to snipe'
          },
          amount: {
            type: 'number',
            description: 'Amount in SOL to spend'
          },
          maxSlippage: {
            type: 'number',
            description: 'Maximum slippage percentage',
            default: 1
          },
          useFlashbots: {
            type: 'boolean',
            description: 'Whether to use Flashbots for MEV protection',
            default: true
          }
        },
        required: ['tokenAddress', 'amount']
      }
    }
  ],
  resources: [
    {
      name: 'new_token_listings',
      description: 'List of newly listed tokens on Solana DEXs',
      uri: '/resources/new_token_listings'
    },
    {
      name: 'watchlist',
      description: 'List of tokens being monitored',
      uri: '/resources/watchlist'
    },
    {
      name: 'token_analysis',
      description: 'Detailed analysis of a specific token',
      uri: '/resources/token_analysis/{tokenAddress}'
    }
  ]
};

/**
 * MCP Tool Implementations
 */

// Scan for new token listings
async function scanNewTokens(params) {
  const { timeframe = '24h', minLiquidity = 10000, limit = 10 } = params;
  
  try {
    // Log the request
    fastify.log.info(`Scanning for new tokens: timeframe=${timeframe}, minLiquidity=${minLiquidity}, limit=${limit}`);
    
    // Fetch new token listings from Birdeye API
    const response = await axios.get('https://public-api.birdeye.so/defi/new_tokens', {
      headers: { 'X-API-KEY': BIRDEYE_API_KEY },
      params: {
        time_range: timeframe,
        sort_by: 'liquidity',
        sort_type: 'desc',
        offset: 0,
        limit
      }
    });
    
    // Filter tokens by minimum liquidity
    const tokens = response.data?.data?.tokens || [];
    const filteredTokens = tokens.filter(token => 
      token.liquidity >= minLiquidity
    );
    
    // Enhance token data with additional information
    const enhancedTokens = await Promise.all(
      filteredTokens.map(async token => {
        // Get token info from SHYFT
        let tokenInfo = {};
        try {
          const shyftResponse = await axios.get(`https://api.shyft.to/sol/v1/token/get_info`, {
            headers: { 'x-api-key': SHYFT_API_KEY },
            params: { network: 'mainnet-beta', token_address: token.address }
          });
          tokenInfo = shyftResponse.data?.result || {};
        } catch (error) {
          fastify.log.error(`Error fetching token info for ${token.address}: ${error.message}`);
        }
        
        // Calculate risk score based on various factors
        const riskScore = calculateRiskScore(token, tokenInfo);
        
        // Cache the token data
        tokenCache.set(token.address, {
          ...token,
          tokenInfo,
          riskScore,
          lastUpdated: Date.now()
        });
        
        // Add to new pairs cache if not already present
        if (!newPairsCache.some(t => t.address === token.address)) {
          newPairsCache.unshift({
            address: token.address,
            symbol: token.symbol,
            name: token.name,
            liquidity: token.liquidity,
            price: token.price,
            riskScore,
            discoveredAt: Date.now()
          });
          
          // Keep cache limited to 100 entries
          if (newPairsCache.length > 100) {
            newPairsCache.pop();
          }
        }
        
        return {
          address: token.address,
          symbol: token.symbol || tokenInfo.symbol || 'UNKNOWN',
          name: token.name || tokenInfo.name || 'Unknown Token',
          liquidity: token.liquidity,
          price: token.price,
          priceChangePercent: token.price_change_24h || 0,
          volume24h: token.volume_24h || 0,
          marketCap: token.mc || 0,
          holders: token.holder_count || 0,
          createdAt: token.created_at || null,
          riskScore
        };
      })
    );
    
    return {
      success: true,
      data: enhancedTokens,
      count: enhancedTokens.length,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    fastify.log.error(`Error scanning for new tokens: ${error.message}`);
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

// Analyze a token for trading potential
async function analyzeToken(params) {
  const { tokenAddress, includeContractAudit = true, includeSocialMetrics = true } = params;
  
  try {
    // Log the request
    fastify.log.info(`Analyzing token: ${tokenAddress}`);
    
    // Validate token address
    if (!tokenAddress || !/^[A-HJ-NP-Za-km-z1-9]{32,44}$/.test(tokenAddress)) {
      throw new Error('Invalid token address');
    }
    
    // Check cache first
    const cachedToken = tokenCache.get(tokenAddress);
    const cacheAge = cachedToken ? Date.now() - cachedToken.lastUpdated : Infinity;
    
    // Use cached data if it's less than 5 minutes old
    if (cachedToken && cacheAge < 5 * 60 * 1000) {
      return {
        success: true,
        data: {
          ...cachedToken,
          fromCache: true
        },
        timestamp: new Date().toISOString()
      };
    }
    
    // Fetch token data from multiple sources
    const [birdeyeData, shyftData] = await Promise.all([
      // Get token data from Birdeye
      axios.get(`https://public-api.birdeye.so/public/token_list`, {
        headers: { 'X-API-KEY': BIRDEYE_API_KEY },
        params: { address: tokenAddress }
      }).then(res => res.data?.data?.[0] || {}),
      
      // Get token data from SHYFT
      axios.get(`https://api.shyft.to/sol/v1/token/get_info`, {
        headers: { 'x-api-key': SHYFT_API_KEY },
        params: { network: 'mainnet-beta', token_address: tokenAddress }
      }).then(res => res.data?.result || {})
    ]);
    
    // Get price history
    const priceHistory = await axios.get(`https://public-api.birdeye.so/public/price_history`, {
      headers: { 'X-API-KEY': BIRDEYE_API_KEY },
      params: { address: tokenAddress, type: '1D', time_from: Math.floor(Date.now() / 1000) - 7 * 24 * 60 * 60 }
    }).then(res => res.data?.data || []);
    
    // Calculate volatility
    const volatility = calculateVolatility(priceHistory);
    
    // Perform contract audit if requested
    let contractAudit = null;
    if (includeContractAudit) {
      contractAudit = await performContractAudit(tokenAddress);
    }
    
    // Get social metrics if requested
    let socialMetrics = null;
    if (includeSocialMetrics) {
      socialMetrics = await getSocialMetrics(tokenAddress, birdeyeData.symbol);
    }
    
    // Calculate risk score
    const riskScore = calculateRiskScore(birdeyeData, shyftData, contractAudit, socialMetrics);
    
    // Prepare analysis result
    const analysis = {
      address: tokenAddress,
      symbol: birdeyeData.symbol || shyftData.symbol || 'UNKNOWN',
      name: birdeyeData.name || shyftData.name || 'Unknown Token',
      decimals: shyftData.decimals || 9,
      price: birdeyeData.value || 0,
      priceChangePercent: birdeyeData.price_change_24h || 0,
      volume24h: birdeyeData.volume_24h || 0,
      liquidity: birdeyeData.liquidity || 0,
      marketCap: birdeyeData.mc || 0,
      holders: birdeyeData.holder_count || 0,
      volatility,
      riskScore,
      tradingRecommendation: getTradingRecommendation(riskScore, volatility, birdeyeData.price_change_24h),
      contractAudit,
      socialMetrics,
      lastUpdated: Date.now()
    };
    
    // Cache the analysis
    tokenCache.set(tokenAddress, analysis);
    
    return {
      success: true,
      data: analysis,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    fastify.log.error(`Error analyzing token ${tokenAddress}: ${error.message}`);
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

// Add a token to the monitoring watchlist
async function monitorToken(params) {
  const { tokenAddress, alertThresholds = {} } = params;
  
  try {
    // Log the request
    fastify.log.info(`Adding token to watchlist: ${tokenAddress}`);
    
    // Validate token address
    if (!tokenAddress || !/^[A-HJ-NP-Za-km-z1-9]{32,44}$/.test(tokenAddress)) {
      throw new Error('Invalid token address');
    }
    
    // Get token info if not in cache
    if (!tokenCache.has(tokenAddress)) {
      const analysis = await analyzeToken({ tokenAddress });
      if (!analysis.success) {
        throw new Error(`Failed to analyze token: ${analysis.error}`);
      }
    }
    
    // Add to watchlist with alert thresholds
    watchlist.add(tokenAddress);
    
    // Set up WebSocket monitoring if not already active
    if (!activeWebSockets.has(tokenAddress)) {
      setupTokenMonitoring(tokenAddress, alertThresholds);
    }
    
    return {
      success: true,
      message: `Token ${tokenAddress} added to watchlist`,
      watchlistCount: watchlist.size,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    fastify.log.error(`Error adding token to watchlist: ${error.message}`);
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

// Prepare a token sniping transaction
async function prepareSnipe(params) {
  const { tokenAddress, amount, maxSlippage = 1, useFlashbots = true } = params;
  
  try {
    // Log the request
    fastify.log.info(`Preparing snipe for token: ${tokenAddress}, amount: ${amount} SOL`);
    
    // Validate token address
    if (!tokenAddress || !/^[A-HJ-NP-Za-km-z1-9]{32,44}$/.test(tokenAddress)) {
      throw new Error('Invalid token address');
    }
    
    // Validate amount
    if (!amount || amount <= 0) {
      throw new Error('Invalid amount');
    }
    
    // Get token info
    let tokenInfo = tokenCache.get(tokenAddress);
    if (!tokenInfo) {
      const analysis = await analyzeToken({ tokenAddress });
      if (!analysis.success) {
        throw new Error(`Failed to analyze token: ${analysis.error}`);
      }
      tokenInfo = analysis.data;
    }
    
    // Check risk score
    if (tokenInfo.riskScore > 7) {
      return {
        success: false,
        warning: 'High risk token detected',
        riskScore: tokenInfo.riskScore,
        recommendation: 'This token has a high risk score. Sniping is not recommended.',
        timestamp: new Date().toISOString()
      };
    }
    
    // In a real implementation, we would construct a transaction here
    // For now, we'll return a simulated transaction
    
    // Calculate estimated output amount
    const estimatedOutput = amount * 1000 / tokenInfo.price; // Simplified calculation
    const minOutput = estimatedOutput * (1 - maxSlippage / 100);
    
    return {
      success: true,
      data: {
        tokenAddress,
        tokenSymbol: tokenInfo.symbol,
        tokenName: tokenInfo.name,
        inputAmount: amount,
        inputToken: 'SOL',
        estimatedOutput,
        minOutput,
        maxSlippage,
        useFlashbots,
        // In a real implementation, we would include the transaction data here
        transactionType: 'simulated',
        timestamp: new Date().toISOString()
      }
    };
  } catch (error) {
    fastify.log.error(`Error preparing snipe for ${tokenAddress}: ${error.message}`);
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Helper Functions
 */

// Calculate risk score based on various factors
function calculateRiskScore(tokenData, tokenInfo, contractAudit = null, socialMetrics = null) {
  let score = 5; // Start with neutral score
  
  // Adjust based on token data
  if (tokenData) {
    // Higher liquidity reduces risk
    if (tokenData.liquidity > 1000000) score -= 1;
    if (tokenData.liquidity < 10000) score += 2;
    
    // Higher holder count reduces risk
    if (tokenData.holder_count > 1000) score -= 1;
    if (tokenData.holder_count < 100) score += 1;
    
    // Extreme price changes increase risk
    if (Math.abs(tokenData.price_change_24h) > 50) score += 1;
  }
  
  // Adjust based on contract audit
  if (contractAudit) {
    if (contractAudit.hasRugPullIndicators) score += 3;
    if (contractAudit.hasHoneypotIndicators) score += 3;
    if (contractAudit.hasMintAuthority) score += 1;
    if (contractAudit.hasFreezingAuthority) score += 1;
  }
  
  // Adjust based on social metrics
  if (socialMetrics) {
    if (socialMetrics.twitterFollowers > 10000) score -= 1;
    if (socialMetrics.discordMembers > 5000) score -= 1;
    if (socialMetrics.negativeReports > 5) score += 2;
  }
  
  // Clamp score between 1-10
  return Math.max(1, Math.min(10, score));
}

// Calculate volatility from price history
function calculateVolatility(priceHistory) {
  if (!priceHistory || priceHistory.length < 2) {
    return 0;
  }
  
  // Calculate daily returns
  const returns = [];
  for (let i = 1; i < priceHistory.length; i++) {
    const prevPrice = priceHistory[i-1].value;
    const currPrice = priceHistory[i].value;
    if (prevPrice > 0) {
      returns.push((currPrice - prevPrice) / prevPrice);
    }
  }
  
  if (returns.length === 0) {
    return 0;
  }
  
  // Calculate standard deviation of returns
  const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
  const stdDev = Math.sqrt(variance);
  
  // Annualize volatility (assuming daily returns)
  return stdDev * Math.sqrt(365) * 100; // As percentage
}

// Perform contract audit
async function performContractAudit(tokenAddress) {
  try {
    // In a real implementation, we would analyze the token's contract
    // For now, return simulated results
    return {
      hasRugPullIndicators: Math.random() < 0.1,
      hasHoneypotIndicators: Math.random() < 0.05,
      hasMintAuthority: Math.random() < 0.3,
      hasFreezingAuthority: Math.random() < 0.2,
      isVerified: Math.random() < 0.7,
      auditScore: Math.floor(Math.random() * 10) + 1
    };
  } catch (error) {
    fastify.log.error(`Error performing contract audit for ${tokenAddress}: ${error.message}`);
    return null;
  }
}

// Get social metrics for a token
async function getSocialMetrics(tokenAddress, symbol) {
  try {
    // In a real implementation, we would fetch social media data
    // For now, return simulated results
    return {
      twitterFollowers: Math.floor(Math.random() * 50000),
      discordMembers: Math.floor(Math.random() * 20000),
      telegramMembers: Math.floor(Math.random() * 15000),
      sentimentScore: Math.random() * 10,
      negativeReports: Math.floor(Math.random() * 10),
      positiveReports: Math.floor(Math.random() * 20)
    };
  } catch (error) {
    fastify.log.error(`Error getting social metrics for ${tokenAddress}: ${error.message}`);
    return null;
  }
}

// Get trading recommendation based on risk score and other factors
function getTradingRecommendation(riskScore, volatility, priceChange) {
  if (riskScore >= 8) {
    return {
      action: 'AVOID',
      confidence: 'HIGH',
      reason: 'Extremely high risk token'
    };
  }
  
  if (riskScore >= 6) {
    return {
      action: 'CAUTION',
      confidence: 'MEDIUM',
      reason: 'High risk token, trade with extreme caution'
    };
  }
  
  if (volatility > 100 && priceChange > 20) {
    return {
      action: 'POTENTIAL_BUY',
      confidence: 'LOW',
      reason: 'High volatility with positive momentum, but risky'
    };
  }
  
  if (volatility < 50 && riskScore < 4) {
    return {
      action: 'MONITOR',
      confidence: 'MEDIUM',
      reason: 'Low risk token with moderate volatility'
    };
  }
  
  return {
    action: 'NEUTRAL',
    confidence: 'MEDIUM',
    reason: 'No strong signals in either direction'
  };
}

// Set up token monitoring via WebSocket
function setupTokenMonitoring(tokenAddress, alertThresholds) {
  // In a real implementation, we would set up WebSocket connections
  // For now, simulate with a timer
  const interval = setInterval(() => {
    // Simulate price and volume changes
    const priceChange = (Math.random() * 10) - 5; // -5% to +5%
    const volumeChange = (Math.random() * 20) - 5; // -5% to +15%
    
    // Check against thresholds
    if (Math.abs(priceChange) >= (alertThresholds.priceChangePercent || 5)) {
      fastify.log.info(`ALERT: Price change of ${priceChange.toFixed(2)}% detected for ${tokenAddress}`);
    }
    
    if (volumeChange >= (alertThresholds.volumeChangePercent || 100)) {
      fastify.log.info(`ALERT: Volume spike of ${volumeChange.toFixed(2)}% detected for ${tokenAddress}`);
    }
  }, 60000); // Check every minute
  
  // Store the interval ID for cleanup
  activeWebSockets.set(tokenAddress, interval);
}

/**
 * MCP Resource Implementations
 */

// New token listings resource
fastify.get('/resources/new_token_listings', async (request, reply) => {
  return {
    data: newPairsCache,
    count: newPairsCache.length,
    timestamp: new Date().toISOString()
  };
});

// Watchlist resource
fastify.get('/resources/watchlist', async (request, reply) => {
  const watchlistData = await Promise.all(
    Array.from(watchlist).map(async tokenAddress => {
      const cachedToken = tokenCache.get(tokenAddress);
      if (cachedToken) {
        return cachedToken;
      }
      
      // If not in cache, fetch basic info
      try {
        const response = await axios.get(`https://api.shyft.to/sol/v1/token/get_info`, {
          headers: { 'x-api-key': SHYFT_API_KEY },
          params: { network: 'mainnet-beta', token_address: tokenAddress }
        });
        
        return {
          address: tokenAddress,
          symbol: response.data?.result?.symbol || 'UNKNOWN',
          name: response.data?.result?.name || 'Unknown Token'
        };
      } catch (error) {
        return {
          address: tokenAddress,
          symbol: 'UNKNOWN',
          name: 'Unknown Token',
          error: error.message
        };
      }
    })
  );
  
  return {
    data: watchlistData,
    count: watchlistData.length,
    timestamp: new Date().toISOString()
  };
});

// Token analysis resource
fastify.get('/resources/token_analysis/:tokenAddress', async (request, reply) => {
  const { tokenAddress } = request.params;
  
  // Check cache first
  const cachedToken = tokenCache.get(tokenAddress);
  if (cachedToken) {
    return {
      data: cachedToken,
      fromCache: true,
      timestamp: new Date().toISOString()
    };
  }
  
  // If not in cache, perform analysis
  const analysis = await analyzeToken({ tokenAddress });
  return analysis;
});

/**
 * MCP Server Routes
 */

// MCP server info endpoint
fastify.get('/', async (request, reply) => {
  return {
    name: MCP_CONFIG.name,
    version: MCP_CONFIG.version,
    description: MCP_CONFIG.description,
    tools: MCP_CONFIG.tools.map(tool => ({
      name: tool.name,
      description: tool.description
    })),
    resources: MCP_CONFIG.resources.map(resource => ({
      name: resource.name,
      description: resource.description,
      uri: resource.uri
    }))
  };
});

// MCP server tools endpoint
fastify.get('/tools', async (request, reply) => {
  return {
    tools: MCP_CONFIG.tools
  };
});

// MCP server resources endpoint
fastify.get('/resources', async (request, reply) => {
  return {
    resources: MCP_CONFIG.resources
  };
});

// MCP server execute endpoint
fastify.post('/execute', async (request, reply) => {
  const { tool, arguments: args } = request.body;
  
  // Validate request
  if (!tool) {
    return reply.code(400).send({
      error: 'Missing tool name'
    });
  }
  
  // Execute the requested tool
  switch (tool) {
    case 'scan_new_tokens':
      return await scanNewTokens(args || {});
    case 'analyze_token':
      return await analyzeToken(args || {});
    case 'monitor_token':
      return await monitorToken(args || {});
    case 'prepare_snipe':
      return await prepareSnipe(args || {});
    default:
      return reply.code(400).send({
        error: `Unknown tool: ${tool}`
      });
  }
});

// Start the server
const start = async () => {
  try {
    // Get port from environment or use default
    const port = process.env.PORT || 3100;
    
    // Start the server
    await fastify.listen({ port, host: '0.0.0.0' });
    
    console.log(`Token Discovery MCP server running at http://localhost:${port}`);
    console.log('Available tools:');
    MCP_CONFIG.tools.forEach(tool => {
      console.log(`- ${tool.name}: ${tool.description}`);
    });
    
    // Start scanning for new tokens periodically
    setInterval(async () => {
      try {
        await scanNewTokens({ timeframe: '1h', minLiquidity: 5000, limit: 20 });
      } catch (error) {
        fastify.log.error(`Error in automatic token scan: ${error.message}`);
      }
    }, 15 * 60 * 1000); // Every 15 minutes
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

// Start the server
start();
