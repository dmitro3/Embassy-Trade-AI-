/**
 * Pump.fun MCP Server
 * 
 * This server monitors Pump.fun token launches and identifies sniping opportunities
 * on Solana. It provides MCP-compliant tools and resources for the TradeForce AI
 * Trading System.
 */

// Load environment variables - try multiple locations
require('dotenv').config(); // Load default .env
require('dotenv').config({ path: '.env.local' }); // Load .env.local

// Try to load from workspace root if we're in a subdirectory
const fs = require('fs');
const path = require('path');
const rootEnvPath = path.resolve(process.cwd(), '../../.env.local');
if (fs.existsSync(rootEnvPath)) {
  require('dotenv').config({ path: rootEnvPath });
}

// Import dependencies
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const WebSocket = require('ws');
const axios = require('axios');
const logger = require('./logger');
const riskAssessment = require('./services/risk-assessment');
const pumpfunConnector = require('./connectors/pumpfun-connector');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Store monitored tokens and launch statistics
const monitoredTokens = new Map();
const launchStatistics = {
  totalLaunches: 0,
  successfulSnipes: 0,
  failedSnipes: 0,
  averageRiskScore: 0,
  highestLiquidity: 0,
  recentLaunches: []
};

// MCP Configuration
const mcpConfig = {
  name: "pumpfun-mcp",
  version: "1.0.0",
  description: "Pump.fun MCP Server for monitoring token launches and identifying sniping opportunities",
  tools: [
    {
      name: "get_new_launches",
      description: "Retrieves recent token launches with filtering options",
      input_schema: {
        type: "object",
        properties: {
          limit: {
            type: "number",
            description: "Maximum number of launches to return",
            default: 10
          },
          minLiquidity: {
            type: "number",
            description: "Minimum liquidity in USD",
            default: 5000
          }
        }
      }
    },
    {
      name: "analyze_token",
      description: "Performs detailed risk and opportunity analysis on specific tokens",
      input_schema: {
        type: "object",
        properties: {
          tokenAddress: {
            type: "string",
            description: "Solana token address",
            required: true
          },
          detailed: {
            type: "boolean",
            description: "Whether to return detailed analysis",
            default: false
          }
        },
        required: ["tokenAddress"]
      }
    },
    {
      name: "get_sniping_opportunities",
      description: "Identifies current sniping opportunities based on configurable criteria",
      input_schema: {
        type: "object",
        properties: {
          minConfidence: {
            type: "number",
            description: "Minimum confidence score (0-1)",
            default: 0.7
          },
          maxResults: {
            type: "number",
            description: "Maximum number of results to return",
            default: 5
          }
        }
      }
    },
    {
      name: "monitor_token",
      description: "Adds tokens to a monitoring list with price change alerts",
      input_schema: {
        type: "object",
        properties: {
          tokenAddress: {
            type: "string",
            description: "Solana token address",
            required: true
          },
          alertThreshold: {
            type: "number",
            description: "Price change threshold for alerts (percentage)",
            default: 10
          }
        },
        required: ["tokenAddress"]
      }
    }
  ],
  resources: [
    {
      name: "monitored_tokens",
      description: "List of tokens currently being monitored"
    },
    {
      name: "launch_statistics",
      description: "Statistics about recent token launches"
    }
  ]
};

// MCP Configuration endpoint
app.get('/mcp-config', (req, res) => {
  res.json(mcpConfig);
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: Date.now()
  });
});

// Tool: Get new launches
app.post('/tools/get_new_launches', async (req, res) => {
  try {
    const { limit = 10, minLiquidity = 5000 } = req.body;
    
    // Filter recent launches based on criteria
    const filteredLaunches = launchStatistics.recentLaunches
      .filter(launch => launch.liquidity >= minLiquidity)
      .slice(0, limit);
    
    res.json({
      success: true,
      launches: filteredLaunches
    });
  } catch (error) {
    logger.error(`Error in get_new_launches: ${error.message}`);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Tool: Analyze token
app.post('/tools/analyze_token', async (req, res) => {
  try {
    const { tokenAddress, detailed = false } = req.body;
    
    if (!tokenAddress) {
      return res.status(400).json({
        success: false,
        error: 'Token address is required'
      });
    }
    
    // Get token data from Pump.fun
    const tokenMetadata = await pumpfunConnector.getTokenMetadata(tokenAddress);
    const tokenData = pumpfunConnector.formatTokenData(tokenMetadata);
    
    if (!tokenData) {
      return res.status(404).json({
        success: false,
        error: 'Token not found or metadata unavailable'
      });
    }
    
    // Analyze token risk
    const riskAnalysis = await riskAssessment.analyzeTokenRisk(tokenAddress, tokenData);
    
    // Prepare response
    const response = {
      success: true,
      tokenAddress,
      symbol: tokenData.symbol,
      name: tokenData.name,
      riskScore: riskAnalysis.riskScore,
      snipeRecommendation: riskAnalysis.riskScore < 0.5,
      confidence: 1 - riskAnalysis.riskScore
    };
    
    // Add detailed analysis if requested
    if (detailed) {
      response.details = {
        liquidity: riskAnalysis.liquidity,
        holderConcentration: riskAnalysis.holderConcentration,
        contractRisk: riskAnalysis.contractRisk,
        marketVolatility: riskAnalysis.marketVolatility,
        tokenData
      };
    }
    
    res.json(response);
  } catch (error) {
    logger.error(`Error in analyze_token: ${error.message}`);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Tool: Get sniping opportunities
app.post('/tools/get_sniping_opportunities', async (req, res) => {
  try {
    const { minConfidence = 0.7, maxResults = 5 } = req.body;
    
    // Filter recent launches based on confidence score
    const opportunities = launchStatistics.recentLaunches
      .filter(launch => (1 - launch.riskScore) >= minConfidence)
      .slice(0, maxResults);
    
    res.json({
      success: true,
      opportunities
    });
  } catch (error) {
    logger.error(`Error in get_sniping_opportunities: ${error.message}`);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Tool: Monitor token
app.post('/tools/monitor_token', async (req, res) => {
  try {
    const { tokenAddress, alertThreshold = 10 } = req.body;
    
    if (!tokenAddress) {
      return res.status(400).json({
        success: false,
        error: 'Token address is required'
      });
    }
    
    // Get token data from Pump.fun
    const tokenMetadata = await pumpfunConnector.getTokenMetadata(tokenAddress);
    const tokenData = pumpfunConnector.formatTokenData(tokenMetadata);
    
    if (!tokenData) {
      return res.status(404).json({
        success: false,
        error: 'Token not found or metadata unavailable'
      });
    }
    
    // Add to monitored tokens
    monitoredTokens.set(tokenAddress, {
      address: tokenAddress,
      symbol: tokenData.symbol,
      name: tokenData.name,
      alertThreshold,
      lastPrice: tokenData.price || 0,
      lastChecked: Date.now(),
      alerts: []
    });
    
    res.json({
      success: true,
      message: `Now monitoring ${tokenData.symbol} with alert threshold of ${alertThreshold}%`,
      token: monitoredTokens.get(tokenAddress)
    });
  } catch (error) {
    logger.error(`Error in monitor_token: ${error.message}`);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Resource: Monitored tokens
app.get('/resources/monitored_tokens', (req, res) => {
  res.json({
    success: true,
    tokens: Array.from(monitoredTokens.values())
  });
});

// Resource: Launch statistics
app.get('/resources/launch_statistics', (req, res) => {
  res.json({
    success: true,
    statistics: launchStatistics
  });
});

// Helper function to get token data from SHYFT
async function getTokenData(tokenAddress) {
  try {
    const response = await axios.get(`https://api.shyft.to/sol/v1/token/get_info?network=devnet&token_address=${tokenAddress}`, {
      headers: { 'x-api-key': process.env.SHYFT_API_KEY }
    });
    
    return response.data.result;
  } catch (error) {
    logger.error(`Error fetching token data from SHYFT: ${error.message}`);
    throw new Error(`Failed to fetch token data: ${error.message}`);
  }
}

// Poll for new token launches from Pump.fun
async function pollForNewTokens() {
  try {
    logger.info('Starting to poll for new token launches from Pump.fun...');
    
    // Set up polling interval
    setInterval(async () => {
      try {
        // Get newer mints from Pump.fun
        const newerMints = await pumpfunConnector.getNewerMints({ limit: 20 });
        
        if (!newerMints || !Array.isArray(newerMints)) {
          logger.warn('No newer mints data returned from Pump.fun');
          return;
        }
        
        logger.info(`Retrieved ${newerMints.length} new token launches from Pump.fun`);
        
        // Process each new token
        for (const mint of newerMints) {
          try {
            // Get token metadata
            const tokenMetadata = await pumpfunConnector.getTokenMetadata(mint.address);
            const tokenData = pumpfunConnector.formatTokenData(tokenMetadata);
            
            if (!tokenData) {
              logger.warn(`Failed to get metadata for token: ${mint.address}`);
              continue;
            }
            
            logger.info(`New token launch detected: ${tokenData.symbol} (${tokenData.address})`);
            
            // Analyze token risk
            const riskAnalysis = await riskAssessment.analyzeTokenRisk(tokenData.address, tokenData);
            
            // Add to recent launches if not already present
            if (!launchStatistics.recentLaunches.some(launch => launch.address === tokenData.address)) {
              launchStatistics.recentLaunches.unshift({
                address: tokenData.address,
                symbol: tokenData.symbol,
                name: tokenData.name,
                launchTime: Date.now(),
                liquidity: tokenData.liquidity || 0,
                riskScore: riskAnalysis.riskScore
              });
              
              // Keep only the 100 most recent launches
              if (launchStatistics.recentLaunches.length > 100) {
                launchStatistics.recentLaunches.pop();
              }
              
              // Update statistics
              launchStatistics.totalLaunches++;
              
              const liquidity = tokenData.liquidity || 0;
              if (liquidity > launchStatistics.highestLiquidity) {
                launchStatistics.highestLiquidity = liquidity;
              }
              
              // Calculate average risk score
              const totalRiskScore = launchStatistics.recentLaunches.reduce((sum, launch) => sum + launch.riskScore, 0);
              launchStatistics.averageRiskScore = totalRiskScore / launchStatistics.recentLaunches.length;
              
              // Check if token meets auto-snipe criteria
              if (riskAnalysis.riskScore < parseFloat(process.env.MAX_RISK_SCORE_FOR_AUTO_SNIPE || '0.5')) {
                logger.info(`Auto-snipe opportunity detected for ${tokenData.symbol} with risk score ${riskAnalysis.riskScore}`);
                
                // Notify TradeForce for sniping
                try {
                  await axios.post(`${process.env.TRADEFORCE_API_ENDPOINT || 'http://localhost:3000/api/tradeforce/snipe'}`, {
                    tokenAddress: tokenData.address,
                    riskScore: riskAnalysis.riskScore,
                    confidence: 1 - riskAnalysis.riskScore,
                    tokenData
                  });
                  
                  launchStatistics.successfulSnipes++;
                  logger.info(`Snipe notification sent for ${tokenData.symbol}`);
                } catch (error) {
                  launchStatistics.failedSnipes++;
                  logger.error(`Failed to send snipe notification: ${error.message}`);
                }
              }
            }
          } catch (error) {
            logger.error(`Error processing token ${mint.address}: ${error.message}`);
          }
        }
      } catch (error) {
        logger.error(`Error polling for new tokens: ${error.message}`);
      }
    }, 60000); // Poll every minute
    
  } catch (error) {
    logger.error(`Error setting up token polling: ${error.message}`);
  }
}

// Start monitoring tokens
function startTokenMonitoring() {
  setInterval(async () => {
    for (const [address, token] of monitoredTokens.entries()) {
      try {
        // Get current token data from Pump.fun
        const tokenMetadata = await pumpfunConnector.getTokenMetadata(address);
        const tokenData = pumpfunConnector.formatTokenData(tokenMetadata);
        
        if (!tokenData) {
          logger.warn(`Failed to get metadata for monitored token: ${address}`);
          continue;
        }
        
        const currentPrice = tokenData.price || 0;
        
        // Calculate price change percentage
        const priceChange = ((currentPrice - token.lastPrice) / token.lastPrice) * 100;
        
        // Check if price change exceeds threshold
        if (Math.abs(priceChange) >= token.alertThreshold) {
          logger.info(`Alert: ${token.symbol} price changed by ${priceChange.toFixed(2)}%`);
          
          // Add alert to token's alert history
          token.alerts.push({
            timestamp: Date.now(),
            priceChange,
            oldPrice: token.lastPrice,
            newPrice: currentPrice
          });
          
          // Keep only the 10 most recent alerts
          if (token.alerts.length > 10) {
            token.alerts.shift();
          }
          
          // Notify TradeForce
          try {
            await axios.post(`${process.env.TRADEFORCE_API_ENDPOINT || 'http://localhost:3000/api/tradeforce/price-alert'}`, {
              tokenAddress: address,
              symbol: token.symbol,
              priceChange,
              currentPrice
            });
          } catch (error) {
            logger.error(`Failed to send price alert notification: ${error.message}`);
          }
        }
        
        // Update token data
        token.lastPrice = currentPrice;
        token.lastChecked = Date.now();
      } catch (error) {
        logger.error(`Error monitoring token ${address}: ${error.message}`);
      }
    }
  }, 60000); // Check every minute
}

// Start the server
app.listen(PORT, () => {
  logger.info(`Pump.fun MCP Server running on port ${PORT}`);
  
  // Start polling for new tokens
  pollForNewTokens();
  
  // Start token monitoring
  startTokenMonitoring();
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

module.exports = app;
