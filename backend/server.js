const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const Sentry = require('@sentry/node');
require('dotenv').config({ path: '../.env.local' });

// Create Express app
const app = express();
const PORT = process.env.PORT || 5000;

// Import enhanced server logger
const { serverLogger: logger, apiLogger, botLogger } = require('../lib/serverLogger');

// Initialize Sentry for error tracking
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN, // Use the same DSN as frontend
  environment: process.env.NODE_ENV || 'development',
  integrations: [
    // Enable Express integration
    new Sentry.Integrations.Express({ app }),
    // Enable MongoDB integration
    new Sentry.Integrations.Mongo({ mongoose }),
  ],
  tracesSampleRate: 1.0, // Capture 100% of transactions in development
  profilesSampleRate: 1.0, // Capture 100% of profiles in development
});

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

// Validate required environment variables on startup
const requiredEnvVars = [
  'NEXT_PUBLIC_FIREBASE_API_KEY',
  'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  'NEXT_PUBLIC_OPENAI_API_KEY',
  'NEXT_PUBLIC_GROK_API_KEY',
  'NEXT_PUBLIC_BIRDEYE_API_KEY',
  'NEXT_PUBLIC_SHYFT_API_KEY'
];

// Create a container for missing environment variables
const missingEnvVars = [];

// Check each required variable
requiredEnvVars.forEach(varName => {
  if (!process.env[varName]) {
    missingEnvVars.push(varName);
    logger.warn(`Missing environment variable: ${varName}`);
  }
});

// Log summary of missing variables
if (missingEnvVars.length > 0) {
  logger.warn(`${missingEnvVars.length} environment variables are missing. Some features may not work properly.`);
  logger.warn(`Missing variables: ${missingEnvVars.join(', ')}`);
  
  // Set development fallbacks for non-critical variables to allow the app to start
  if (!process.env.NEXT_PUBLIC_BIRDEYE_API_KEY) {
    process.env.NEXT_PUBLIC_BIRDEYE_API_KEY = '67f8ce614c594ab2b3efb742f8db69db';
    logger.info(`Using fallback value for BIRDEYE_API_KEY`);
  }
  
  if (!process.env.NEXT_PUBLIC_SHYFT_API_KEY) {
    process.env.NEXT_PUBLIC_SHYFT_API_KEY = 'whv00T87G8Sd8TeK';
    logger.info(`Using fallback value for SHYFT_API_KEY`);
  }
}

// API Keys (from environment variables or use defaults)
const OPENAI_API_KEY = process.env.NEXT_PUBLIC_OPENAI_API_KEY;
const GROK_API_KEY = process.env.NEXT_PUBLIC_GROK_API_KEY;
const DEEPSEEK_API_KEY = process.env.NEXT_PUBLIC_DEEPSEEK_API_KEY || 'sk-0c8ae4e17c044c1ebf32f149ba8a34b4';
const BIRDEYE_API_KEY = process.env.NEXT_PUBLIC_BIRDEYE_API_KEY || '67f8ce614c594ab2b3efb742f8db69db'; // Fallback to default if not provided

// Retry configuration for API rate limits
const API_RETRY_CONFIG = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 15000
};

// Helper function to add delay for rate limiting
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Helper function for API calls with retry logic
const makeApiCallWithRetry = async (url, data, headers, retries = API_RETRY_CONFIG.maxRetries, backoff = API_RETRY_CONFIG.initialDelayMs) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      logger.info(`API call attempt ${attempt}/${retries} to ${url}`);
      const response = await axios.post(url, data, { headers });
      logger.info(`API call successful on attempt ${attempt}`);
      return response;
    } catch (error) {
      const isRateLimit = error.response && (error.response.status === 429 || error.response.status === 503);
      const hasRetryAfter = error.response && error.response.headers && error.response.headers['retry-after'];
      let waitTime = backoff * Math.pow(2, attempt - 1);
      
      // If we have a Retry-After header, use that value (in seconds)
      if (hasRetryAfter) {
        waitTime = parseInt(error.response.headers['retry-after'], 10) * 1000;
      }
      
      // Cap the wait time
      waitTime = Math.min(waitTime, API_RETRY_CONFIG.maxDelayMs);
      
      if (isRateLimit && attempt < retries) {
        logger.warn(`Rate limit hit, retrying after ${waitTime}ms (attempt ${attempt}/${retries})`);
        await delay(waitTime);
      } else if (attempt < retries) {
        logger.warn(`API error (${error.message}), retrying after ${waitTime}ms (attempt ${attempt}/${retries})`);
        await delay(waitTime);
      } else {
        logger.error(`API call failed after ${retries} attempts: ${error.message}`);
        throw error;
      }
    }
  }
};

// Validate API keys before serving requests
const validateApiKeys = () => {
  let isValid = true;
  if (!OPENAI_API_KEY || OPENAI_API_KEY.trim() === '') {
    logger.error('OpenAI API key is missing or invalid');
    isValid = false;
  }
  
  if (!GROK_API_KEY || GROK_API_KEY.trim() === '') {
    logger.error('Grok API key is missing or invalid');
    isValid = false;
  }
  
  if (!DEEPSEEK_API_KEY || DEEPSEEK_API_KEY.trim() === '') {
    logger.error('DeepSeek API key is missing or invalid');
    isValid = false;
  }
  
  if (!BIRDEYE_API_KEY || BIRDEYE_API_KEY.trim() === '') {
    logger.error('Birdeye API key is missing or invalid');
    isValid = false;
  }
  
  return isValid;
};

// Initial API key validation
if (!validateApiKeys()) {
  logger.warn('Server starting with invalid API keys - some features may not work properly');
}

// Middleware
app.use(Sentry.Handlers.requestHandler()); // Sentry request handler must be first
app.use(cors({
  origin: ['http://localhost:3008', 'http://127.0.0.1:3008'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));
app.use(Sentry.Handlers.tracingHandler()); // Enable performance monitoring

// Connect to MongoDB
mongoose.connect('mongodb://127.0.0.1:27017/embassytrade', { 
  useNewUrlParser: true, 
  useUnifiedTopology: true
})
.then(() => {
  logger.info('MongoDB connected successfully');
})
.catch(err => {
  logger.error(`MongoDB connection error: ${err.message}`);
  // Capture MongoDB connection errors in Sentry
  Sentry.captureException(err);
});

// Trading Bot state
let tradingBotState = {
  isRunning: false,
  lastStarted: null,
  activeTokens: [],
  networkStatus: 'idle'
};

// Basic routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// Add the log endpoint to receive logs from frontend
app.post('/logs', (req, res) => {
  try {
    const { level, message, meta = {} } = req.body;
    
    if (!level || !message) {
      return res.status(400).json({
        success: false,
        error: 'Missing required log data'
      });
    }
    
    // Add request context to logs
    const enhancedMeta = {
      ...meta,
      source: 'frontend',
      ip: req.ip,
      userAgent: req.headers['user-agent']
    };
    
    // Log based on level
    switch (level.toLowerCase()) {
      case 'error':
        // Capture error in Sentry
        Sentry.captureMessage(message, {
          level: Sentry.Severity.Error,
          extra: enhancedMeta
        });
        logger.error(message, enhancedMeta);
        break;
      case 'warn':
        logger.warn(message, enhancedMeta);
        break;
      case 'info':
        logger.info(message, enhancedMeta);
        break;
      case 'debug':
        logger.debug(message, enhancedMeta);
        break;
      default:
        logger.info(message, enhancedMeta);
    }
    
    res.json({ success: true });
  } catch (error) {
    // Capture error in Sentry
    Sentry.captureException(error);
    logger.error(`Error processing log: ${error.message}`, { stack: error.stack });
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Add error reporting endpoint for frontend errors
app.post('/api/report-error', (req, res) => {
  try {
    const { error, stack, componentStack, url, timestamp } = req.body;
    
    if (!error) {
      return res.status(400).json({
        success: false,
        error: 'Missing required error data'
      });
    }
    
    // Capture error in Sentry
    const eventId = Sentry.captureMessage(`Frontend Error: ${error}`, {
      level: Sentry.Severity.Error,
      extra: {
        stack,
        componentStack,
        url,
        timestamp,
        userAgent: req.headers['user-agent'],
        ip: req.ip
      }
    });
    
    // Log the error
    logger.error(`Frontend Error: ${error}`, {
      stack,
      componentStack,
      url,
      timestamp,
      sentryEventId: eventId
    });
    
    res.json({
      success: true,
      errorId: eventId
    });
  } catch (reportError) {
    Sentry.captureException(reportError);
    logger.error(`Error processing frontend error report: ${reportError.message}`, { stack: reportError.stack });
    res.status(500).json({
      success: false,
      error: reportError.message
    });
  }
});

// AI Testing endpoint - Works with both ChatGPT and Grok APIs
app.post('/ai-test', async (req, res) => {
  const { metrics, model } = req.body;
  
  if (!metrics) {
    return res.status(400).json({
      success: false,
      error: 'Missing metrics data for AI evaluation'
    });
  }

  try {
    logger.info(`Starting AI evaluation with ${model}`);

    // Validate API keys before proceeding
    if (!validateApiKeys()) {
      throw new Error('API keys are missing or invalid. Check your environment variables.');
    }

    // Format a detailed prompt based on the metrics
    const prompt = `
      Evaluate this Solana trading bot performance:
      
      WIN RATE: ${metrics.successRate}%
      AVERAGE LATENCY: ${metrics.avgLatency} ms
      MARKET SCENARIO: ${metrics.marketScenario || 'Not specified'}
      NETWORK CONDITIONS: ${metrics.networkCondition || 'Not specified'}
      STABILITY SCORE: ${metrics.stabilityScore || 'Not calculated'}
      ${metrics.errorTypes ? `ERROR TYPES: ${JSON.stringify(metrics.errorTypes)}` : ''}
      
      Provide specific suggestions to improve the trading bot's performance and reach a >80% win rate. 
      Analyze how it compares to top trading bots like BonkBot (70-85%) and SolSnipeBot (60-90%).
      Focus on concrete, actionable improvements.
    `;

    let response;

    // Use Grok API for Grok models
    if (model === 'Grok' || model === 'grok-mini' || model === 'grok2-mini') {
      logger.info(`Using Grok API for evaluation with model: ${model}`);
      
      // Determine which Grok model to use
      let grokModel = 'grok-2-latest'; // Default to Grok-2 latest
      
      if (model === 'grok-mini') {
        grokModel = 'grok-1-mini';
      } else if (model === 'grok2-mini') {
        grokModel = 'grok-2-mini';
      }
      
      try {
        response = await makeApiCallWithRetry(
          'https://api.x.ai/v1/chat/completions', 
          {
            messages: [
              { role: 'system', content: 'You are a Solana trading expert specialized in analyzing and optimizing trading bot performance.' },
              { role: 'user', content: prompt }
            ],
            model: grokModel,
            stream: false,
            temperature: 0.2,
          },
          {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${GROK_API_KEY}`
          }
        );
      } catch (error) {
        logger.error(`Grok API call failed: ${error.message}`);
        Sentry.captureException(error);
        throw new Error(`Grok API request failed: ${error.message}`);
      }
      
      const feedback = response.data.choices[0].message.content;
      logger.info(`Grok evaluation complete: ${feedback.substring(0, 50)}...`);
      
      res.json({
        success: true,
        feedback,
        rawResponse: response.data
      });
    }
    // Use DeepSeek API for DeepSeek R1
    else if (model === 'deepseek-r1') {
      logger.info('Using DeepSeek API for evaluation');
      try {
        response = await makeApiCallWithRetry(
          'https://api.deepseek.com/v1/chat/completions',
          {
            messages: [
              { role: 'system', content: 'You are a Solana trading expert specialized in analyzing and optimizing trading bot performance.' },
              { role: 'user', content: prompt }
            ],
            model: 'deepseek-coder',
            temperature: 0.2,
          },
          {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
          }
        );
      } catch (error) {
        logger.error(`DeepSeek API call failed: ${error.message}`);
        Sentry.captureException(error);
        throw new Error(`DeepSeek API request failed: ${error.message}`);
      }
      
      const feedback = response.data.choices[0].message.content;
      logger.info(`DeepSeek evaluation complete: ${feedback.substring(0, 50)}...`);
      
      res.json({
        success: true,
        feedback,
        rawResponse: response.data
      });
    }
    // Use OpenAI API for GPT-4 or GPT-3.5
    else {
      logger.info(`Using OpenAI API with model ${model}`);
      try {
        response = await makeApiCallWithRetry(
          'https://api.openai.com/v1/chat/completions',
          {
            model: model || 'gpt-4',
            messages: [
              { role: 'system', content: 'You are a Solana trading expert specialized in analyzing and optimizing trading bot performance.' },
              { role: 'user', content: prompt }
            ],
            temperature: 0.3,
          },
          {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${OPENAI_API_KEY}`
          }
        );
      } catch (error) {
        logger.error(`OpenAI API call failed: ${error.message}`);
        Sentry.captureException(error);
        throw new Error(`OpenAI API request failed: ${error.message}`);
      }
      
      const feedback = response.data.choices[0].message.content;
      logger.info(`OpenAI evaluation complete: ${feedback.substring(0, 50)}...`);
      
      res.json({
        success: true,
        feedback,
        rawResponse: response.data
      });
    }
  } catch (error) {
    logger.error(`AI evaluation error: ${error.message}`);
    if (error.response) {
      logger.error(`API response error: ${JSON.stringify(error.response.data)}`);
    }
    
    // Capture error in Sentry
    Sentry.captureException(error);
    
    res.status(500).json({
      success: false,
      error: error.message,
      details: error.response ? error.response.data : null
    });
  }
});

// Trading Bot routes
app.post('/api/bot/start', (req, res) => {
  try {
    // In a production app, this would initialize the actual bot
    // For now, we'll just update the bot state
    tradingBotState = {
      isRunning: true,
      lastStarted: new Date(),
      activeTokens: [],
      networkStatus: 'connecting'
    };
    
    logger.info('Trading bot started');
    
    res.json({ 
      success: true, 
      message: 'Bot started successfully',
      botState: tradingBotState
    });
  } catch (error) {
    logger.error(`Error starting bot: ${error.message}`);
    Sentry.captureException(error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

app.post('/api/bot/stop', (req, res) => {
  try {
    tradingBotState = {
      isRunning: false,
      lastStarted: tradingBotState.lastStarted,
      activeTokens: tradingBotState.activeTokens,
      networkStatus: 'idle'
    };
    
    logger.info('Trading bot stopped');
    
    res.json({ 
      success: true, 
      message: 'Bot stopped successfully',
      botState: tradingBotState
    });
  } catch (error) {
    logger.error(`Error stopping bot: ${error.message}`);
    Sentry.captureException(error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

app.get('/api/bot/status', (req, res) => {
  res.json({
    success: true,
    botState: tradingBotState
  });
});

app.post('/api/bot/verify-networks', async (req, res) => {
  try {
    // Simulate the network verification with Birdeye API
    // In a real implementation, this would call the actual Birdeye API
    const networkCheckDelay = 1500;
    await new Promise(resolve => setTimeout(resolve, networkCheckDelay));
    
    const networks = ['solana', 'ethereum', 'bsc', 'polygon'];
    
    tradingBotState.networkStatus = 'connected';
    logger.info('Network verification complete');
    
    res.json({
      success: true,
      networks,
      message: 'Network verification completed successfully'
    });
  } catch (error) {
    logger.error(`Error verifying networks: ${error.message}`);
    Sentry.captureException(error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

app.post('/api/bot/test-token', async (req, res) => {
  try {
    const { tokenMint } = req.body;
    
    if (!tokenMint) {
      return res.status(400).json({
        success: false,
        error: 'Token mint address is required'
      });
    }
    
    // Simulate token data fetch with Birdeye API
    // In a real implementation, this would call the actual Birdeye API
    const tokenCheckDelay = 2000;
    await new Promise(resolve => setTimeout(resolve, tokenCheckDelay));
    
    // Generate mock token data
    const mockTokenData = {
      mint: tokenMint,
      symbol: ['SOL', 'USDC', 'BONK', 'JUP'][Math.floor(Math.random() * 4)],
      price: Math.random() * 100,
      liquidity: Math.random() * 100000 + 5000,
      volume24h: Math.random() * 500000
    };
    
    // Add to active tokens
    tradingBotState.activeTokens.push(mockTokenData);
    logger.info(`Token test complete for ${tokenMint}`);
    
    res.json({
      success: true,
      token: mockTokenData,
      message: 'Token test completed successfully'
    });
  } catch (error) {
    logger.error(`Error testing token: ${error.message}`);
    Sentry.captureException(error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Whale Transactions endpoint
app.post('/api/whale-transactions', async (req, res) => {
  try {
    const { network, tokenMint } = req.body;

    if (!network || !tokenMint) {
      return res.status(400).json({
        success: false,
        error: 'Network and token mint address are required'
      });
    }

    logger.info(`Fetching whale transactions for network: ${network}, token: ${tokenMint}`);

    const response = await makeApiCallWithRetry(
      `https://api.birdeye.so/v1/whale-transactions`,
      { network, tokenMint },
      {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${BIRDEYE_API_KEY}`
      }
    );

    res.json({
      success: true,
      transactions: response.data.transactions,
      message: 'Whale transactions fetched successfully'
    });
  } catch (error) {
    logger.error(`Error fetching whale transactions: ${error.message}`);
    Sentry.captureException(error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Whale Transactions endpoint
app.get('/api/whale-transactions', async (req, res) => {
  try {
    logger.info(`Fetching whale transactions from Birdeye API`);
    
    try {
      const response = await axios.get('https://public-api.birdeye.so/public/whale_tx', {
        headers: {
          'X-API-KEY': BIRDEYE_API_KEY,
          'x-chain': 'solana', // Default to Solana chain
        },
        params: {
          limit: 10, // Fetch the latest 10 whale transactions
        },
      });
      
      if (response.data && response.data.data && response.data.data.items) {
        logger.info(`Successfully fetched ${response.data.data.items.length} whale transactions`);
        res.json({
          success: true,
          transactions: response.data.data.items,
          message: 'Whale transactions fetched successfully'
        });
      } else {
        logger.warn(`Birdeye API returned unexpected response format`);
        res.status(500).json({
          success: false,
          error: 'Unexpected API response format'
        });
      }
    } catch (error) {
      logger.error(`Error calling Birdeye API: ${error.message}`);
      if (error.response) {
        logger.error(`API response error: ${JSON.stringify(error.response.data)}`);
      }
      throw error;
    }
  } catch (error) {
    logger.error(`Error fetching whale transactions: ${error.message}`);
    Sentry.captureException(error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Bot logs endpoint
app.get('/api/bot-logs', async (req, res) => {
  try {
    logger.info('Fetching bot logs');
    
    // Get query parameters with defaults
    const limit = parseInt(req.query.limit) || 50;
    const level = req.query.level || 'all';
    
    // Validate input parameters
    if (isNaN(limit) || limit < 1 || limit > 1000) {
      return res.status(400).json({
        success: false,
        error: 'Invalid limit parameter. Must be between 1 and 1000.'
      });
    }
    
    // Read log files based on the level requested
    let logFilePath;
    if (level === 'error') {
      logFilePath = path.join(logsDir, 'error.log');
    } else {
      logFilePath = path.join(logsDir, 'combined.log');
    }
    
    // Check if log file exists
    if (!fs.existsSync(logFilePath)) {
      logger.warn(`Log file not found: ${logFilePath}`);
      return res.json({
        success: true,
        logs: [],
        message: 'No logs available'
      });
    }
    
    // Read the log file
    const fileContent = await fs.promises.readFile(logFilePath, 'utf-8');
    const logLines = fileContent.split('\n').filter(line => line.trim() !== '');
    
    // Get the most recent logs up to the limit
    const recentLogs = logLines.slice(-limit).map(line => {
      try {
        // Try to parse as JSON first
        return JSON.parse(line);
      } catch (e) {
        // If not JSON, return as raw text
        return { timestamp: new Date().toISOString(), level: 'info', message: line };
      }
    });
    
    logger.info(`Successfully fetched ${recentLogs.length} bot logs`);
    
    res.json({
      success: true,
      logs: recentLogs,
      message: `Retrieved ${recentLogs.length} log entries`
    });
  } catch (error) {
    logger.error(`Error fetching bot logs: ${error.message}`);
    Sentry.captureException(error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Add comprehensive error handling middleware
app.use(Sentry.Handlers.errorHandler()); // Sentry error handler must come before other error handlers

app.use((err, req, res, next) => {
  // Log the error with our enhanced logger
  logger.error(`Unhandled error: ${err.message}`, { 
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    user: req.user?.id || 'anonymous'
  });
  
  // Send error response to client
  res.status(500).json({ 
    success: false, 
    error: 'Internal server error', 
    message: process.env.NODE_ENV === 'development' ? err.message : 'An unexpected error occurred',
    errorId: res.sentry // Include Sentry error ID if available
  });
});

// Import route modules
const tradeformRoutes = require('./routes/tradeform');

// Use route modules
app.use('/api', tradeformRoutes);

// Start server
app.listen(PORT, () => {
  logger.info(`Server started on port ${PORT}`);
  logger.info(`API Testing endpoints ready (ChatGPT and Grok)`);
  logger.info(`TradeForm API endpoints ready`);
});
