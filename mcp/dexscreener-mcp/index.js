// mcp/dexscreener-mcp/index.js
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { MongoClient } = require('mongodb');
const winston = require('winston');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

// Load environment variables - try multiple locations
dotenv.config(); // Load default .env
dotenv.config({ path: '.env.local' }); // Load .env.local
// Try to load from the workspace root if we're in a subdirectory
const rootEnvPath = path.resolve(process.cwd(), '../../.env.local');
if (fs.existsSync(rootEnvPath)) {
  dotenv.config({ path: rootEnvPath });
}

// Create logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message }) => {
      return `${timestamp} ${level}: ${message}`;
    })
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'dexscreener-mcp.log' })
  ]
});

// Initialize Express app
const app = express();
app.use(cors());
app.use(express.json());

// MongoDB connection
let mongoClient;
let db;

// MCP configuration
const MCP_CONFIG = {
  name: 'dexscreener-mcp',
  version: '1.0.0',
  description: 'DEXScreener MCP Server for TradeForce AI Trading System',
  port: process.env.PORT || 3002,
  tools: [
    {
      name: 'get_trending_tokens',
      description: 'Get trending tokens from DEXScreener with volume increase metrics'
    },
    {
      name: 'analyze_token_patterns',
      description: 'Analyze token for bullish patterns (cup and handle, bull flag)'
    },
    {
      name: 'get_token_details',
      description: 'Get detailed information about a specific token'
    }
  ],
  resources: [
    {
      name: 'trending_tokens',
      description: 'List of trending tokens on Solana DEXs'
    },
    {
      name: 'bullish_patterns',
      description: 'Tokens showing bullish patterns (cup and handle, bull flag)'
    }
  ]
};

// Save MCP configuration
fs.writeFileSync(
  path.join(__dirname, 'mcp-config.json'),
  JSON.stringify(MCP_CONFIG, null, 2)
);

// Cache for trending tokens
let trendingTokensCache = [];
let lastCacheUpdate = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Cache for pattern analysis
let patternAnalysisCache = new Map();
const PATTERN_CACHE_TTL = 15 * 60 * 1000; // 15 minutes

// Connect to MongoDB
async function connectToMongoDB() {
  try {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
    mongoClient = new MongoClient(uri);
    await mongoClient.connect();
    db = mongoClient.db('tradeforce');
    logger.info('Connected to MongoDB');
  } catch (error) {
    logger.error(`MongoDB connection error: ${error.message}`);
  }
}

// Get API key from MongoDB
async function getApiKey(provider) {
  try {
    if (!db) {
      logger.warn('MongoDB not connected, using fallback API key');
      return process.env[`${provider.toUpperCase()}_API_KEY`] || '';
    }
    
    const apiKey = await db.collection('api_keys').findOne({ provider });
    if (apiKey && apiKey.api_key) {
      return apiKey.api_key;
    } else {
      logger.warn(`API key for ${provider} not found in MongoDB, using fallback`);
      return process.env[`${provider.toUpperCase()}_API_KEY`] || '';
    }
  } catch (error) {
    logger.error(`Error fetching API key: ${error.message}`);
    return process.env[`${provider.toUpperCase()}_API_KEY`] || '';
  }
}

// Fetch trending tokens from DEXScreener
async function fetchTrendingTokens(limit = 50) {
  try {
    // Check cache first
    const now = Date.now();
    if (trendingTokensCache.length > 0 && now - lastCacheUpdate < CACHE_TTL) {
      logger.info('Returning trending tokens from cache');
      return trendingTokensCache;
    }
    
    // Fetch from DEXScreener API
    const response = await axios.get('https://api.dexscreener.com/latest/dex/tokens/solana');
    
    if (!response.data || !response.data.pairs) {
      throw new Error('Invalid response from DEXScreener API');
    }
    
    // Process and sort pairs by volume
    const pairs = response.data.pairs
      .filter(pair => pair.baseToken && pair.baseToken.address && pair.volume && pair.volume.h24)
      .sort((a, b) => parseFloat(b.volume.h24) - parseFloat(a.volume.h24))
      .slice(0, limit);
    
    // Transform to our format
    const tokens = await Promise.all(pairs.map(async pair => {
      // Calculate volume change percentage
      const volumeChangePercent = pair.volume.h24ChangePercent 
        ? parseFloat(pair.volume.h24ChangePercent) 
        : 0;
      
      return {
        tokenAddress: pair.baseToken.address,
        symbol: pair.baseToken.symbol,
        name: pair.baseToken.name || pair.baseToken.symbol,
        price: parseFloat(pair.priceUsd) || 0,
        volume24h: parseFloat(pair.volume.h24) || 0,
        volumeChangePercent: volumeChangePercent,
        liquidity: parseFloat(pair.liquidity.usd) || 0,
        fdv: parseFloat(pair.fdv) || 0,
        pairAddress: pair.pairAddress,
        dexId: pair.dexId,
        url: `https://dexscreener.com/solana/${pair.pairAddress}`,
        createdAt: pair.pairCreatedAt,
        priceChangePercent: {
          h1: parseFloat(pair.priceChange.h1) || 0,
          h24: parseFloat(pair.priceChange.h24) || 0,
          h6: parseFloat(pair.priceChange.h6) || 0,
          h7d: parseFloat(pair.priceChange.h7d) || 0
        }
      };
    }));
    
    // Update cache
    trendingTokensCache = tokens;
    lastCacheUpdate = now;
    
    logger.info(`Fetched ${tokens.length} trending tokens from DEXScreener`);
    return tokens;
  } catch (error) {
    logger.error(`Error fetching trending tokens: ${error.message}`);
    return [];
  }
}

// Fetch historical price data for pattern analysis
async function fetchHistoricalPrices(tokenAddress, timeframe = '5m', limit = 200) {
  try {
    // Use Birdeye API for historical data
    const birdeyeApiKey = await getApiKey('birdeye');
    
    const response = await axios.get(`https://public-api.birdeye.so/defi/ohlcv`, {
      headers: { 'X-API-KEY': birdeyeApiKey },
      params: { 
        address: tokenAddress,
        type: timeframe,
        limit: limit
      }
    });
    
    if (!response.data || !response.data.data || !response.data.data.items) {
      throw new Error('Invalid response from Birdeye API');
    }
    
    return response.data.data.items;
  } catch (error) {
    logger.error(`Error fetching historical prices: ${error.message}`);
    return [];
  }
}

// Detect Cup and Handle pattern
function detectCupAndHandle(priceData) {
  if (priceData.length < 30) return { detected: false, confidence: 0 };
  
  try {
    // Extract closing prices
    const prices = priceData.map(candle => candle.c);
    
    // Cup and Handle pattern characteristics:
    // 1. Initial decline (left side of cup)
    // 2. Rounded bottom (cup)
    // 3. Rise back to previous high (right side of cup)
    // 4. Small pullback (handle)
    // 5. Breakout above previous high
    
    // Simplified detection algorithm
    const windowSize = Math.min(30, prices.length);
    const recentPrices = prices.slice(-windowSize);
    
    // Find local minimums and maximums
    const localMins = [];
    const localMaxs = [];
    
    for (let i = 1; i < recentPrices.length - 1; i++) {
      if (recentPrices[i] < recentPrices[i-1] && recentPrices[i] < recentPrices[i+1]) {
        localMins.push({ index: i, value: recentPrices[i] });
      }
      if (recentPrices[i] > recentPrices[i-1] && recentPrices[i] > recentPrices[i+1]) {
        localMaxs.push({ index: i, value: recentPrices[i] });
      }
    }
    
    if (localMins.length < 1 || localMaxs.length < 2) {
      return { detected: false, confidence: 0 };
    }
    
    // Check for cup shape (U-shape)
    const cupBottom = localMins[0];
    const leftPeak = localMaxs[0];
    const rightPeak = localMaxs[localMaxs.length - 1];
    
    if (leftPeak.index > cupBottom.index || rightPeak.index < cupBottom.index) {
      return { detected: false, confidence: 0 };
    }
    
    // Check if right peak is close to left peak height
    const peakDiff = Math.abs(rightPeak.value - leftPeak.value) / leftPeak.value;
    if (peakDiff > 0.1) { // Allow 10% difference
      return { detected: false, confidence: 0 };
    }
    
    // Check for handle (small pullback after right peak)
    if (rightPeak.index >= recentPrices.length - 3) {
      return { detected: false, confidence: 0 };
    }
    
    const handlePullback = Math.min(...recentPrices.slice(rightPeak.index + 1));
    const pullbackPercent = (rightPeak.value - handlePullback) / rightPeak.value;
    
    // Handle should be a small pullback (5-15% is ideal)
    if (pullbackPercent < 0.03 || pullbackPercent > 0.2) {
      return { detected: false, confidence: 0 };
    }
    
    // Check for potential breakout
    const lastPrice = recentPrices[recentPrices.length - 1];
    const breakoutPotential = lastPrice > rightPeak.value * 0.95;
    
    // Calculate confidence based on pattern quality
    let confidence = 0.5;
    
    // Adjust confidence based on pattern characteristics
    if (peakDiff < 0.05) confidence += 0.1; // Peaks are very close in height
    if (pullbackPercent >= 0.05 && pullbackPercent <= 0.15) confidence += 0.1; // Ideal handle depth
    if (breakoutPotential) confidence += 0.2; // Potential breakout
    
    return {
      detected: true,
      confidence: Math.min(confidence, 0.95),
      pattern: 'Cup and Handle',
      details: {
        leftPeak: leftPeak.value,
        cupBottom: cupBottom.value,
        rightPeak: rightPeak.value,
        handle: handlePullback,
        currentPrice: lastPrice,
        breakoutPotential
      }
    };
  } catch (error) {
    logger.error(`Error detecting Cup and Handle pattern: ${error.message}`);
    return { detected: false, confidence: 0 };
  }
}

// Detect Bull Flag pattern
function detectBullFlag(priceData) {
  if (priceData.length < 20) return { detected: false, confidence: 0 };
  
  try {
    // Extract closing prices
    const prices = priceData.map(candle => candle.c);
    
    // Bull Flag pattern characteristics:
    // 1. Strong uptrend (pole)
    // 2. Consolidation in a downward channel (flag)
    // 3. Breakout above the flag
    
    // Simplified detection algorithm
    const windowSize = Math.min(20, prices.length);
    const recentPrices = prices.slice(-windowSize);
    
    // Check for strong uptrend (pole)
    const poleStart = recentPrices[0];
    const potentialPoleEnd = Math.max(...recentPrices.slice(0, windowSize / 2));
    const poleEndIndex = recentPrices.indexOf(potentialPoleEnd);
    
    if (poleEndIndex < 3) {
      return { detected: false, confidence: 0 };
    }
    
    const poleGain = (potentialPoleEnd - poleStart) / poleStart;
    if (poleGain < 0.1) { // Pole should show at least 10% gain
      return { detected: false, confidence: 0 };
    }
    
    // Check for consolidation (flag)
    const flagPrices = recentPrices.slice(poleEndIndex);
    if (flagPrices.length < 5) {
      return { detected: false, confidence: 0 };
    }
    
    // Calculate linear regression for flag
    const xValues = Array.from({ length: flagPrices.length }, (_, i) => i);
    const xMean = xValues.reduce((sum, x) => sum + x, 0) / xValues.length;
    const yMean = flagPrices.reduce((sum, y) => sum + y, 0) / flagPrices.length;
    
    let numerator = 0;
    let denominator = 0;
    
    for (let i = 0; i < xValues.length; i++) {
      numerator += (xValues[i] - xMean) * (flagPrices[i] - yMean);
      denominator += Math.pow(xValues[i] - xMean, 2);
    }
    
    const slope = denominator !== 0 ? numerator / denominator : 0;
    
    // Flag should have a slight downward or flat slope
    if (slope > 0.01) {
      return { detected: false, confidence: 0 };
    }
    
    // Check flag height (should be smaller than pole)
    const flagHeight = Math.max(...flagPrices) - Math.min(...flagPrices);
    const flagHeightRatio = flagHeight / potentialPoleEnd;
    
    if (flagHeightRatio > 0.5) { // Flag should be less than 50% of pole height
      return { detected: false, confidence: 0 };
    }
    
    // Check for potential breakout
    const lastPrice = recentPrices[recentPrices.length - 1];
    const flagTop = Math.max(...flagPrices.slice(0, -1));
    const breakoutPotential = lastPrice > flagTop;
    
    // Calculate confidence based on pattern quality
    let confidence = 0.5;
    
    // Adjust confidence based on pattern characteristics
    if (poleGain > 0.2) confidence += 0.1; // Strong pole
    if (slope < -0.001 && slope > -0.01) confidence += 0.1; // Ideal flag slope
    if (flagHeightRatio < 0.3) confidence += 0.1; // Compact flag
    if (breakoutPotential) confidence += 0.2; // Potential breakout
    
    return {
      detected: true,
      confidence: Math.min(confidence, 0.95),
      pattern: 'Bull Flag',
      details: {
        poleStart,
        poleEnd: potentialPoleEnd,
        poleGain: poleGain * 100,
        flagSlope: slope,
        flagHeight,
        currentPrice: lastPrice,
        breakoutPotential
      }
    };
  } catch (error) {
    logger.error(`Error detecting Bull Flag pattern: ${error.message}`);
    return { detected: false, confidence: 0 };
  }
}

// Analyze token for bullish patterns
async function analyzeTokenPatterns(tokenAddress, timeframes = ['5m', '15m']) {
  try {
    // Check cache first
    const cacheKey = `${tokenAddress}-${timeframes.join('-')}`;
    const now = Date.now();
    if (patternAnalysisCache.has(cacheKey)) {
      const cachedData = patternAnalysisCache.get(cacheKey);
      if (now - cachedData.timestamp < PATTERN_CACHE_TTL) {
        logger.info(`Returning pattern analysis from cache for ${tokenAddress}`);
        return cachedData.data;
      }
    }
    
    const results = {};
    
    for (const timeframe of timeframes) {
      const priceData = await fetchHistoricalPrices(tokenAddress, timeframe);
      
      if (priceData.length === 0) {
        results[timeframe] = {
          cupAndHandle: { detected: false, confidence: 0 },
          bullFlag: { detected: false, confidence: 0 }
        };
        continue;
      }
      
      const cupAndHandle = detectCupAndHandle(priceData);
      const bullFlag = detectBullFlag(priceData);
      
      results[timeframe] = {
        cupAndHandle,
        bullFlag,
        lastUpdated: new Date().toISOString()
      };
    }
    
    // Update cache
    patternAnalysisCache.set(cacheKey, {
      timestamp: now,
      data: results
    });
    
    logger.info(`Analyzed patterns for token ${tokenAddress}`);
    return results;
  } catch (error) {
    logger.error(`Error analyzing token patterns: ${error.message}`);
    return {};
  }
}

// Get token details
async function getTokenDetails(tokenAddress) {
  try {
    // Get token details from DEXScreener
    const response = await axios.get(`https://api.dexscreener.com/latest/dex/tokens/${tokenAddress}`);
    
    if (!response.data || !response.data.pairs || response.data.pairs.length === 0) {
      throw new Error('Token not found on DEXScreener');
    }
    
    // Get the most liquid pair
    const pairs = response.data.pairs.sort((a, b) => 
      parseFloat(b.liquidity.usd) - parseFloat(a.liquidity.usd)
    );
    
    const pair = pairs[0];
    
    // Get additional data from Birdeye
    const birdeyeApiKey = await getApiKey('birdeye');
    const birdeyeResponse = await axios.get(`https://public-api.birdeye.so/public/token_meta`, {
      headers: { 'X-API-KEY': birdeyeApiKey },
      params: { address: tokenAddress }
    }).catch(() => ({ data: { data: {} } }));
    
    const birdeyeData = birdeyeResponse.data.data || {};
    
    // Combine data
    return {
      tokenAddress,
      symbol: pair.baseToken.symbol,
      name: pair.baseToken.name || pair.baseToken.symbol,
      price: parseFloat(pair.priceUsd) || 0,
      volume24h: parseFloat(pair.volume.h24) || 0,
      volumeChangePercent: pair.volume.h24ChangePercent 
        ? parseFloat(pair.volume.h24ChangePercent) 
        : 0,
      liquidity: parseFloat(pair.liquidity.usd) || 0,
      fdv: parseFloat(pair.fdv) || 0,
      pairAddress: pair.pairAddress,
      dexId: pair.dexId,
      url: `https://dexscreener.com/solana/${pair.pairAddress}`,
      createdAt: pair.pairCreatedAt,
      priceChangePercent: {
        h1: parseFloat(pair.priceChange.h1) || 0,
        h24: parseFloat(pair.priceChange.h24) || 0,
        h6: parseFloat(pair.priceChange.h6) || 0,
        h7d: parseFloat(pair.priceChange.h7d) || 0
      },
      logoURI: birdeyeData.logoURI || '',
      twitter: birdeyeData.twitter || '',
      website: birdeyeData.website || '',
      coingeckoId: birdeyeData.coingeckoId || '',
      decimals: birdeyeData.decimals || 9
    };
  } catch (error) {
    logger.error(`Error getting token details: ${error.message}`);
    throw error;
  }
}

// API Routes

// MCP configuration endpoint
app.get('/mcp-config', (req, res) => {
  res.json(MCP_CONFIG);
});

// Get trending tokens
app.get('/trending-tokens', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const minVolume = parseFloat(req.query.minVolume) || 1000;
    const minVolumeChange = parseFloat(req.query.minVolumeChange) || 0;
    
    let tokens = await fetchTrendingTokens(limit);
    
    // Apply filters
    tokens = tokens.filter(token => 
      token.volume24h >= minVolume && 
      token.volumeChangePercent >= minVolumeChange
    );
    
    res.json(tokens);
  } catch (error) {
    logger.error(`Error in /trending-tokens: ${error.message}`);
    res.status(500).json({ error: 'Failed to fetch trending tokens' });
  }
});

// Analyze token patterns
app.get('/analyze-patterns/:tokenAddress', async (req, res) => {
  try {
    const { tokenAddress } = req.params;
    const timeframes = req.query.timeframes 
      ? req.query.timeframes.split(',') 
      : ['5m', '15m'];
    
    const patterns = await analyzeTokenPatterns(tokenAddress, timeframes);
    res.json(patterns);
  } catch (error) {
    logger.error(`Error in /analyze-patterns: ${error.message}`);
    res.status(500).json({ error: 'Failed to analyze token patterns' });
  }
});

// Get token details
app.get('/token/:tokenAddress', async (req, res) => {
  try {
    const { tokenAddress } = req.params;
    const tokenDetails = await getTokenDetails(tokenAddress);
    res.json(tokenDetails);
  } catch (error) {
    logger.error(`Error in /token: ${error.message}`);
    res.status(500).json({ error: 'Failed to get token details' });
  }
});

// Get bullish tokens
app.get('/bullish-tokens', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const timeframe = req.query.timeframe || '15m';
    const minConfidence = parseFloat(req.query.minConfidence) || 0.7;
    
    // Get trending tokens first
    const tokens = await fetchTrendingTokens(50);
    
    // Analyze patterns for each token
    const results = [];
    
    for (const token of tokens) {
      const patterns = await analyzeTokenPatterns(token.tokenAddress, [timeframe]);
      
      if (!patterns[timeframe]) continue;
      
      const { cupAndHandle, bullFlag } = patterns[timeframe];
      
      if ((cupAndHandle.detected && cupAndHandle.confidence >= minConfidence) ||
          (bullFlag.detected && bullFlag.confidence >= minConfidence)) {
        
        results.push({
          ...token,
          patterns: patterns[timeframe]
        });
        
        if (results.length >= limit) break;
      }
    }
    
    res.json(results);
  } catch (error) {
    logger.error(`Error in /bullish-tokens: ${error.message}`);
    res.status(500).json({ error: 'Failed to get bullish tokens' });
  }
});

// MCP Tool Endpoints

// Get trending tokens tool
app.post('/tools/get_trending_tokens', async (req, res) => {
  try {
    const { limit = 50, minVolume = 1000, minVolumeChange = 0 } = req.body;
    
    let tokens = await fetchTrendingTokens(limit);
    
    // Apply filters
    tokens = tokens.filter(token => 
      token.volume24h >= minVolume && 
      token.volumeChangePercent >= minVolumeChange
    );
    
    res.json({
      success: true,
      data: tokens
    });
  } catch (error) {
    logger.error(`Error in get_trending_tokens tool: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch trending tokens',
      message: error.message
    });
  }
});

// Analyze token patterns tool
app.post('/tools/analyze_token_patterns', async (req, res) => {
  try {
    const { tokenAddress, timeframes = ['5m', '15m'] } = req.body;
    
    if (!tokenAddress) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameter: tokenAddress'
      });
    }
    
    const patterns = await analyzeTokenPatterns(tokenAddress, timeframes);
    
    res.json({
      success: true,
      data: patterns
    });
  } catch (error) {
    logger.error(`Error in analyze_token_patterns tool: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to analyze token patterns',
      message: error.message
    });
  }
});

// Get token details tool
app.post('/tools/get_token_details', async (req, res) => {
  try {
    const { tokenAddress } = req.body;
    
    if (!tokenAddress) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameter: tokenAddress'
      });
    }
    
    const tokenDetails = await getTokenDetails(tokenAddress);
    
    res.json({
      success: true,
      data: tokenDetails
    });
  } catch (error) {
    logger.error(`Error in get_token_details tool: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to get token details',
      message: error.message
    });
  }
});

// MCP Resource Endpoints

// Trending tokens resource
app.get('/resources/trending_tokens', async (req, res) => {
  try {
    const tokens = await fetchTrendingTokens(50);
    res.json(tokens);
  } catch (error) {
    logger.error(`Error in trending_tokens resource: ${error.message}`);
    res.status(500).json({ error: 'Failed to fetch trending tokens' });
  }
});

// Bullish patterns resource
app.get('/resources/bullish_patterns', async (req, res) => {
  try {
    const timeframe = req.query.timeframe || '15m';
    const minConfidence = parseFloat(req.query.minConfidence) || 0.7;
    
    // Get trending tokens first
    const tokens = await fetchTrendingTokens(30);
    
    // Analyze patterns for each token
    const results = [];
    
    for (const token of tokens) {
      const patterns = await analyzeTokenPatterns(token.tokenAddress, [timeframe]);
      
      if (!patterns[timeframe]) continue;
      
      const { cupAndHandle, bullFlag } = patterns[timeframe];
      
      if ((cupAndHandle.detected && cupAndHandle.confidence >= minConfidence) ||
          (bullFlag.detected && bullFlag.confidence >= minConfidence)) {
        
        results.push({
          ...token,
          patterns: patterns[timeframe]
        });
      }
    }
    
    res.json(results);
  } catch (error) {
    logger.error(`Error in bullish_patterns resource: ${error.message}`);
    res.status(500).json({ error: 'Failed to get bullish patterns' });
  }
});

// Start server
async function startServer() {
  try {
    await connectToMongoDB();
    
    // Prefetch trending tokens
    await fetchTrendingTokens();
    
    const port = MCP_CONFIG.port;
    app.listen(port, () => {
      logger.info(`DEXScreener MCP Server running on port ${port}`);
    });
  } catch (error) {
    logger.error(`Failed to start server: ${error.message}`);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Shutting down DEXScreener MCP Server...');
  if (mongoClient) {
    await mongoClient.close();
    logger.info('MongoDB connection closed');
  }
  process.exit(0);
});

// Start the server
startServer();
