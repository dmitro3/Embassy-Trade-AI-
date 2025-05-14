/**
 * Prediction Routes
 * 
 * This module defines the API routes for the consensus prediction service.
 * It handles token prediction requests, historical predictions, and health status.
 */

const express = require('express');
const { logger } = require('../utils/logger');
const consensusPrediction = require('../skills/consensusPrediction');

// Prediction cache (in-memory store of recent predictions)
const predictionCache = {
  predictions: {},
  
  // Add a prediction to the cache
  add(tokenAddress, timeframe, prediction) {
    const key = `${tokenAddress}:${timeframe}`;
    
    if (!this.predictions[key]) {
      this.predictions[key] = [];
    }
    
    // Add prediction with a timestamp
    this.predictions[key].unshift({
      ...prediction,
      cachedAt: new Date().toISOString()
    });
    
    // Limit cache to 5 entries per token+timeframe
    if (this.predictions[key].length > 5) {
      this.predictions[key] = this.predictions[key].slice(0, 5);
    }
  },
  
  // Get a prediction from the cache
  get(tokenAddress, timeframe, maxAgeMs = 3600000) { // Default 1 hour
    const key = `${tokenAddress}:${timeframe}`;
    
    if (!this.predictions[key] || this.predictions[key].length === 0) {
      return null;
    }
    
    const latest = this.predictions[key][0];
    const age = Date.now() - new Date(latest.timestamp).getTime();
    
    if (age > maxAgeMs) {
      return null; // Cache entry too old
    }
    
    return latest;
  },
  
  // Get all predictions for a token
  getForToken(tokenAddress) {
    const results = [];
    
    for (const key in this.predictions) {
      if (key.startsWith(tokenAddress + ':')) {
        results.push(...this.predictions[key]);
      }
    }
    
    // Sort by timestamp (newest first)
    return results.sort((a, b) => {
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });
  }
};

// Create the router
const router = express.Router();

/**
 * Initialize the OpenAI client and make it available to route handlers
 * 
 * @param {Object} app - Express app
 * @param {Object} config - Configuration object
 */
function initializeRoutes(app, config) {
  // Initialize OpenAI client
  const openaiClient = consensusPrediction.initializeOpenAI(config.openaiApiKey);
  
  // Make configuration available to routes
  app.locals.config = config;
  app.locals.openaiClient = openaiClient;
  
  // Check required configuration
  if (!config.openaiApiKey) {
    logger.error('OpenAI API key is not configured');
  }
  
  if (!config.birdeyeApiKey) {
    logger.error('Birdeye API key is not configured');
  }
  
  // Return the router
  return router;
}

/**
 * GET /health - Check the health of the service
 */
router.get('/health', (req, res) => {
  const config = req.app.locals.config;
  const openaiConfigured = !!req.app.locals.openaiClient && !!config.openaiApiKey;
  const birdeyeConfigured = !!config.birdeyeApiKey;
  
  const status = {
    status: openaiConfigured && birdeyeConfigured ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    dependencies: {
      openai: openaiConfigured ? 'configured' : 'missing',
      birdeye: birdeyeConfigured ? 'configured' : 'missing'
    },
    uptime: process.uptime()
  };
  
  res.json(status);
});

/**
 * POST /predict - Generate a prediction for a token
 * 
 * Body parameters:
 * - tokenAddress: The token's address (required)
 * - timeframe: The prediction timeframe (optional, default: 4h)
 * - refresh: Whether to refresh the cache (optional, default: false)
 * - detailed: Whether to generate a detailed analysis (optional, default: false)
 */
router.post('/predict', async (req, res) => {
  try {
    const { tokenAddress, timeframe = '4h', refresh = false, detailed = false } = req.body;
    
    // Validate required parameters
    if (!tokenAddress) {
      return res.status(400).json({
        status: 'error',
        message: 'Token address is required'
      });
    }
    
    // Get configuration and clients
    const config = req.app.locals.config;
    const openaiClient = req.app.locals.openaiClient;
    
    // Validate configuration
    if (!openaiClient || !config.birdeyeApiKey) {
      return res.status(500).json({
        status: 'error',
        message: 'Service is not properly configured'
      });
    }
    
    // Check cache if refresh is not requested
    if (!refresh) {
      const cachedPrediction = predictionCache.get(tokenAddress, timeframe);
      if (cachedPrediction) {
        return res.json({
          status: 'success',
          cached: true,
          prediction: cachedPrediction
        });
      }
    }
    
    // Determine which models to use based on detailed flag
    const models = detailed 
      ? [consensusPrediction.MODELS.PRIMARY, consensusPrediction.MODELS.SECONDARY, consensusPrediction.MODELS.TERTIARY]
      : [consensusPrediction.MODELS.PRIMARY, consensusPrediction.MODELS.SECONDARY];
    
    logger.info(`Generating prediction for token ${tokenAddress} with timeframe ${timeframe}`, {
      detailed,
      refresh,
      modelCount: models.length
    });
    
    // Generate the prediction
    const prediction = await consensusPrediction.generatePrediction({
      tokenAddress,
      timeframe,
      openaiClient,
      birdeyeApiKey: config.birdeyeApiKey,
      models,
      options: {
        analysisType: detailed ? 'detailed' : 'standard'
      }
    });
    
    // Cache the prediction
    predictionCache.add(tokenAddress, timeframe, prediction);
    
    // Return the prediction
    res.json({
      status: 'success',
      cached: false,
      prediction
    });
  } catch (error) {
    logger.error('Error generating prediction', {
      error: error.message,
      stack: error.stack
    });
    
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

/**
 * GET /predictions/:tokenAddress - Get historical predictions for a token
 * 
 * URL parameters:
 * - tokenAddress: The token's address
 */
router.get('/predictions/:tokenAddress', (req, res) => {
  try {
    const { tokenAddress } = req.params;
    
    // Get predictions from cache
    const predictions = predictionCache.getForToken(tokenAddress);
    
    res.json({
      status: 'success',
      tokenAddress,
      count: predictions.length,
      predictions
    });
  } catch (error) {
    logger.error('Error retrieving predictions', {
      error: error.message,
      stack: error.stack
    });
    
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

/**
 * GET /timeframes - Get available prediction timeframes
 */
router.get('/timeframes', (req, res) => {
  res.json({
    status: 'success',
    timeframes: [
      {
        id: '1h',
        name: '1 Hour',
        description: 'Short-term prediction for the next hour'
      },
      {
        id: '4h',
        name: '4 Hours',
        description: 'Medium-term prediction for the next 4 hours'
      },
      {
        id: '24h',
        name: '24 Hours',
        description: 'Day trading prediction for the next 24 hours'
      },
      {
        id: '1w',
        name: '1 Week',
        description: 'Long-term prediction for the next week'
      }
    ]
  });
});

/**
 * POST /search - Search for tokens by name or symbol
 * 
 * Body parameters:
 * - query: The search query (required)
 * - limit: Maximum number of results (optional, default: 10)
 */
router.post('/search', async (req, res) => {
  try {
    const { query, limit = 10 } = req.body;
    
    // Validate required parameters
    if (!query) {
      return res.status(400).json({
        status: 'error',
        message: 'Search query is required'
      });
    }
    
    // Get configuration
    const config = req.app.locals.config;
    
    // Validate configuration
    if (!config.birdeyeApiKey) {
      return res.status(500).json({
        status: 'error',
        message: 'Service is not properly configured'
      });
    }
    
    // Import the connector directly to avoid circular dependencies
    const birdeyeConnector = require('../connectors/birdeye-connector');
    
    // Search for tokens
    const tokens = await birdeyeConnector.searchTokens(query, limit, config.birdeyeApiKey);
    
    res.json({
      status: 'success',
      query,
      count: tokens.length,
      tokens
    });
  } catch (error) {
    logger.error('Error searching tokens', {
      error: error.message,
      stack: error.stack
    });
    
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

/**
 * GET /trending - Get trending tokens
 * 
 * Query parameters:
 * - limit: Maximum number of results (optional, default: 10)
 */
router.get('/trending', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    
    // Get configuration
    const config = req.app.locals.config;
    
    // Validate configuration
    if (!config.birdeyeApiKey) {
      return res.status(500).json({
        status: 'error',
        message: 'Service is not properly configured'
      });
    }
    
    // Import the connector directly to avoid circular dependencies
    const birdeyeConnector = require('../connectors/birdeye-connector');
    
    // Get trending tokens
    const tokens = await birdeyeConnector.getTrendingTokens(limit, config.birdeyeApiKey);
    
    res.json({
      status: 'success',
      count: tokens.length,
      tokens
    });
  } catch (error) {
    logger.error('Error fetching trending tokens', {
      error: error.message,
      stack: error.stack
    });
    
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

module.exports = {
  router,
  initializeRoutes
};
