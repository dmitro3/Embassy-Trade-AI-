/**
 * Consensus Prediction MCP Server
 * 
 * This is the main entry point for the Consensus Prediction MCP server.
 * It implements the Model Context Protocol (MCP) for AI-driven cryptocurrency price predictions
 * based on a consensus of multiple language models.
 */

require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { logger, requestMiddleware } = require('./utils/logger');
const { router, initializeRoutes } = require('./routes/predictionRoutes');

// Configuration
const PORT = process.env.PORT || 3100;
const HOST = process.env.HOST || 'localhost';

// Server configuration
const config = {
  openaiApiKey: process.env.OPENAI_API_KEY,
  birdeyeApiKey: process.env.BIRDEYE_API_KEY,
  logLevel: process.env.LOG_LEVEL || 'info'
};

// Initialize Express app
const app = express();

// Apply middleware
app.use(cors());
app.use(bodyParser.json());
app.use(requestMiddleware);

// MCP server metadata
const serverMetadata = {
  name: 'consensus-prediction-mcp',
  version: '1.0.0',
  description: 'Consensus-based cryptocurrency price predictions using multiple LLMs',
  author: 'TradeForce AI',
  tools: [
    {
      name: 'getPrediction',
      description: 'Generate a consensus-based price prediction for a token',
      input_schema: {
        type: 'object',
        properties: {
          tokenAddress: {
            type: 'string',
            description: 'The blockchain address of the token to analyze'
          },
          timeframe: {
            type: 'string',
            description: 'Prediction timeframe (1h, 4h, 24h, 1w)',
            default: '4h',
            enum: ['1h', '4h', '24h', '1w']
          },
          detailed: {
            type: 'boolean',
            description: 'Whether to generate a detailed analysis',
            default: false
          }
        },
        required: ['tokenAddress']
      },
      output_schema: {
        type: 'object',
        properties: {
          token: {
            type: 'object',
            description: 'Information about the token'
          },
          consensus: {
            type: 'object',
            description: 'The consensus prediction from multiple models'
          },
          recommendation: {
            type: 'object',
            description: 'A trading recommendation based on the prediction'
          }
        }
      }
    },
    {
      name: 'searchTokens',
      description: 'Search for tokens by name or symbol',
      input_schema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'The search query (token name or symbol)'
          },
          limit: {
            type: 'number',
            description: 'Maximum number of results to return',
            default: 10
          }
        },
        required: ['query']
      },
      output_schema: {
        type: 'object',
        properties: {
          tokens: {
            type: 'array',
            description: 'Array of tokens matching the search query'
          }
        }
      }
    },
    {
      name: 'getTrendingTokens',
      description: 'Get trending tokens with high trading volume',
      input_schema: {
        type: 'object',
        properties: {
          limit: {
            type: 'number',
            description: 'Maximum number of trending tokens to return',
            default: 10
          }
        }
      },
      output_schema: {
        type: 'object',
        properties: {
          tokens: {
            type: 'array',
            description: 'Array of trending tokens'
          }
        }
      }
    }
  ],
  resources: [
    {
      name: 'timeframes',
      description: 'Available prediction timeframes',
      uri: '/timeframes'
    },
    {
      name: 'predictions',
      description: 'Historical predictions for a specific token',
      uri: '/predictions/{tokenAddress}'
    }
  ]
};

// Initialize routes
const predictionRouter = initializeRoutes(app, config);

// Set up API routes
app.use('/api', predictionRouter);

// Mount MCP server metadata endpoint
app.get('/mcp', (req, res) => {
  res.json(serverMetadata);
});

// MCP tool endpoints implementation
app.post('/mcp/tools/getPrediction', async (req, res) => {
  try {
    const { tokenAddress, timeframe = '4h', detailed = false } = req.body;
    
    if (!tokenAddress) {
      return res.status(400).json({
        status: 'error',
        message: 'Token address is required'
      });
    }
    
    // Forward the request to the prediction API
    const response = await fetch(`http://${HOST}:${PORT}/api/predict`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ tokenAddress, timeframe, detailed })
    });
    
    const result = await response.json();
    
    // Return the prediction result
    res.json({
      status: 'success',
      result: result.prediction
    });
  } catch (error) {
    logger.error('Error in MCP tool getPrediction', {
      error: error.message,
      stack: error.stack
    });
    
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

app.post('/mcp/tools/searchTokens', async (req, res) => {
  try {
    const { query, limit = 10 } = req.body;
    
    if (!query) {
      return res.status(400).json({
        status: 'error',
        message: 'Search query is required'
      });
    }
    
    // Forward the request to the search API
    const response = await fetch(`http://${HOST}:${PORT}/api/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query, limit })
    });
    
    const result = await response.json();
    
    // Return the search results
    res.json({
      status: 'success',
      result: {
        tokens: result.tokens
      }
    });
  } catch (error) {
    logger.error('Error in MCP tool searchTokens', {
      error: error.message,
      stack: error.stack
    });
    
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

app.post('/mcp/tools/getTrendingTokens', async (req, res) => {
  try {
    const { limit = 10 } = req.body;
    
    // Forward the request to the trending API
    const response = await fetch(`http://${HOST}:${PORT}/api/trending?limit=${limit}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    const result = await response.json();
    
    // Return the trending tokens
    res.json({
      status: 'success',
      result: {
        tokens: result.tokens
      }
    });
  } catch (error) {
    logger.error('Error in MCP tool getTrendingTokens', {
      error: error.message,
      stack: error.stack
    });
    
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

// MCP resource endpoints implementation
app.get('/mcp/resources/timeframes', (req, res) => {
  // Forward the request to the timeframes API
  fetch(`http://${HOST}:${PORT}/api/timeframes`)
    .then(response => response.json())
    .then(result => {
      res.json(result);
    })
    .catch(error => {
      logger.error('Error in MCP resource timeframes', {
        error: error.message,
        stack: error.stack
      });
      
      res.status(500).json({
        status: 'error',
        message: error.message
      });
    });
});

app.get('/mcp/resources/predictions/:tokenAddress', (req, res) => {
  const { tokenAddress } = req.params;
  
  // Forward the request to the predictions API
  fetch(`http://${HOST}:${PORT}/api/predictions/${tokenAddress}`)
    .then(response => response.json())
    .then(result => {
      res.json(result);
    })
    .catch(error => {
      logger.error('Error in MCP resource predictions', {
        error: error.message,
        stack: error.stack
      });
      
      res.status(500).json({
        status: 'error',
        message: error.message
      });
    });
});

// Start the server
app.listen(PORT, HOST, () => {
  logger.info(`Consensus Prediction MCP server running at http://${HOST}:${PORT}`);
  logger.info('Server configuration:', {
    port: PORT,
    host: HOST,
    openaiConfigured: !!config.openaiApiKey,
    birdeyeConfigured: !!config.birdeyeApiKey
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', {
    error: error.message,
    stack: error.stack
  });
  
  // Keep the process running in production, but exit in development
  if (process.env.NODE_ENV === 'development') {
    process.exit(1);
  }
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled promise rejection', {
    reason: reason.toString(),
    stack: reason.stack
  });
  
  // Keep the process running in production, but exit in development
  if (process.env.NODE_ENV === 'development') {
    process.exit(1);
  }
});

module.exports = app;
