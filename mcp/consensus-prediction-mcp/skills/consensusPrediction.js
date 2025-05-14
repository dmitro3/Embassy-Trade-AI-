/**
 * Consensus Prediction Skill
 * 
 * This module implements the core consensus prediction functionality that aggregates
 * forecasts from multiple language models to generate a unified market prediction.
 */

const { Configuration, OpenAIApi } = require('openai');
const { logger, auditLogger } = require('../utils/logger');
const birdeyeConnector = require('../connectors/birdeye-connector');

// LLM models to use for predictions
const MODELS = {
  PRIMARY: 'gpt-4o',
  SECONDARY: 'gpt-3.5-turbo-0125',
  TERTIARY: 'gpt-3.5-turbo'
};

// Default confidence thresholds
const DEFAULT_THRESHOLDS = {
  HIGH: 0.75,
  MEDIUM: 0.5,
  LOW: 0.25
};

/**
 * Initialize OpenAI API client
 * 
 * @param {string} apiKey - OpenAI API key
 * @returns {Object} OpenAI API client
 */
function initializeOpenAI(apiKey) {
  const configuration = new Configuration({
    apiKey
  });
  
  return new OpenAIApi(configuration);
}

/**
 * Get market data for a token
 * 
 * @param {string} tokenAddress - Token address
 * @param {string} birdeyeApiKey - Birdeye API key
 * @returns {Promise<Object>} Combined token data
 */
async function getTokenMarketData(tokenAddress, birdeyeApiKey) {
  try {
    // Fetch basic token data
    const tokenData = await birdeyeConnector.getTokenData(tokenAddress, birdeyeApiKey);
    
    // Fetch current price
    const priceData = await birdeyeConnector.getTokenPrice(tokenAddress, birdeyeApiKey);
    
    // Fetch market metrics
    const marketData = await birdeyeConnector.getMarketData(tokenAddress, birdeyeApiKey);
    
    // Fetch historical data
    const historicalData = await birdeyeConnector.getHistoricalData(tokenAddress, '1D', birdeyeApiKey);
    
    // Process and simplify historical data for LLM consumption
    const simplifiedHistory = processHistoricalData(historicalData);
    
    return {
      token: tokenData,
      price: priceData,
      market: marketData,
      history: simplifiedHistory
    };
  } catch (error) {
    logger.error(`Error fetching token market data for ${tokenAddress}`, {
      error: error.message,
      stack: error.stack
    });
    
    throw new Error(`Failed to fetch market data: ${error.message}`);
  }
}

/**
 * Process historical data to simplify it for LLM consumption
 * 
 * @param {Array} historicalData - Raw historical data
 * @returns {Object} Simplified historical data
 */
function processHistoricalData(historicalData) {
  if (!historicalData || historicalData.length === 0) {
    return {
      trend: 'unknown',
      volatility: 'unknown',
      summary: []
    };
  }
  
  // Sort data by timestamp
  const sortedData = [...historicalData].sort((a, b) => a.timestamp - b.timestamp);
  
  // Calculate price changes and trends
  const priceChanges = [];
  let volatilitySum = 0;
  
  for (let i = 1; i < sortedData.length; i++) {
    const prevPrice = sortedData[i - 1].close;
    const currentPrice = sortedData[i].close;
    const percentChange = ((currentPrice - prevPrice) / prevPrice) * 100;
    
    priceChanges.push({
      timestamp: new Date(sortedData[i].timestamp * 1000).toISOString(),
      percentChange: percentChange.toFixed(2),
      absoluteChange: (currentPrice - prevPrice).toFixed(6)
    });
    
    volatilitySum += Math.abs(percentChange);
  }
  
  // Get overall trend direction
  const firstPrice = sortedData[0].close;
  const lastPrice = sortedData[sortedData.length - 1].close;
  const overallChange = ((lastPrice - firstPrice) / firstPrice) * 100;
  
  let trend;
  if (overallChange > 5) {
    trend = 'strongly_bullish';
  } else if (overallChange > 1) {
    trend = 'bullish';
  } else if (overallChange < -5) {
    trend = 'strongly_bearish';
  } else if (overallChange < -1) {
    trend = 'bearish';
  } else {
    trend = 'neutral';
  }
  
  // Calculate volatility
  const avgVolatility = volatilitySum / priceChanges.length;
  let volatility;
  
  if (avgVolatility > 5) {
    volatility = 'high';
  } else if (avgVolatility > 2) {
    volatility = 'medium';
  } else {
    volatility = 'low';
  }
  
  // Create simplified summary (sample every N points to reduce data)
  const sampleRate = Math.max(1, Math.floor(sortedData.length / 12));
  const summary = [];
  
  for (let i = 0; i < sortedData.length; i += sampleRate) {
    summary.push({
      time: new Date(sortedData[i].timestamp * 1000).toISOString(),
      price: sortedData[i].close
    });
  }
  
  // Always include the latest point
  if (summary[summary.length - 1]?.time !== new Date(sortedData[sortedData.length - 1].timestamp * 1000).toISOString()) {
    summary.push({
      time: new Date(sortedData[sortedData.length - 1].timestamp * 1000).toISOString(),
      price: sortedData[sortedData.length - 1].close
    });
  }
  
  return {
    trend,
    volatility,
    overallChange: overallChange.toFixed(2),
    summary
  };
}

/**
 * Generate a prediction prompt for the LLM
 * 
 * @param {Object} marketData - Token market data
 * @param {Object} options - Prompt options
 * @returns {string} Formatted prompt
 */
function generatePrompt(marketData, options = {}) {
  const { timeframe = '4h', analysisType = 'standard' } = options;
  
  // Basic token information
  const tokenInfo = `
Token: ${marketData.token.name} (${marketData.token.symbol})
Address: ${marketData.token.address}
Current Price: $${marketData.price.value.toFixed(6)}
Last Updated: ${marketData.price.updateHumanTime}
  `.trim();
  
  // Market metrics
  const marketMetrics = `
Volume (24h): $${marketData.market.volume24h.toLocaleString()}
Volume Change (24h): ${marketData.market.volumeChange24h.toFixed(2)}%
Price Change (24h): ${marketData.market.priceChange24h.toFixed(2)}%
Liquidity: $${marketData.market.liquidity.toLocaleString()}
Liquidity Change (24h): ${marketData.market.liquidityChange24h.toFixed(2)}%
FDV: $${marketData.market.fdv.toLocaleString()}
Holders: ${marketData.market.holders.toLocaleString()}
  `.trim();
  
  // Historical trend
  const historicalTrend = `
Price Trend: ${marketData.history.trend.replace('_', ' ')}
Volatility: ${marketData.history.volatility}
Overall Change: ${marketData.history.overallChange}%
  `.trim();
  
  // Historical price points
  const pricePoints = marketData.history.summary.map(point => 
    `- ${new Date(point.time).toLocaleString()}: $${point.price.toFixed(6)}`
  ).join('\n');
  
  // Build the final prompt based on analysis type
  let analysisPrompt;
  if (analysisType === 'detailed') {
    analysisPrompt = `
Conduct a thorough analysis of this Solana token. Consider:
1. Price patterns, support/resistance levels, and trend direction
2. Market indicators including volume, liquidity, and holder changes
3. Historical volatility patterns and what they suggest
4. Any anomalies in the data that might indicate manipulation
5. Technical indicators that might be relevant (e.g., recent MA crossovers)

Based on this analysis, predict the token's price movement for the next ${timeframe}. Provide:
- Price movement direction (bullish, bearish, or neutral)
- Confidence level (high, medium, low) with justification
- Key factors supporting your prediction
- Potential risk factors that could invalidate your prediction
    `.trim();
  } else {
    analysisPrompt = `
Analyze this Solana token data and predict the price movement for the next ${timeframe}.

Your prediction must include:
1. Direction: Will the price go UP, DOWN, or SIDEWAYS?
2. Confidence: How confident are you in this prediction (0-100%)?
3. Reasoning: Brief explanation of key factors behind your prediction
    `.trim();
  }
  
  // Assemble the final prompt
  return `
## TOKEN ANALYSIS REQUEST

${tokenInfo}

## MARKET METRICS
${marketMetrics}

## HISTORICAL TREND
${historicalTrend}

## PRICE HISTORY
${pricePoints}

## ANALYSIS INSTRUCTIONS
${analysisPrompt}

## OUTPUT FORMAT
Provide your response in this JSON format:
{
  "direction": "UP|DOWN|SIDEWAYS",
  "confidence": 75, // 0-100
  "reasoning": "Brief explanation of your prediction",
  "keyFactors": ["factor1", "factor2"]
}
  `.trim();
}

/**
 * Get a prediction from a single LLM model
 * 
 * @param {Object} openai - OpenAI API client
 * @param {string} model - Model name
 * @param {string} prompt - Prediction prompt
 * @returns {Promise<Object>} Prediction result
 */
async function getPredictionFromModel(openai, model, prompt) {
  try {
    logger.debug(`Requesting prediction from model: ${model}`);
    
    const response = await openai.createChatCompletion({
      model,
      messages: [
        { role: 'system', content: 'You are a cryptocurrency market analyst specializing in technical analysis of Solana tokens.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.1,
      max_tokens: 1000,
      response_format: { type: 'json_object' }
    });
    
    const result = response.data.choices[0].message.content;
    
    // Parse JSON response
    try {
      const parsedResult = JSON.parse(result);
      
      // Validate required fields
      if (!parsedResult.direction || !parsedResult.confidence) {
        throw new Error('Missing required fields in prediction result');
      }
      
      // Normalize direction
      parsedResult.direction = parsedResult.direction.toUpperCase();
      if (!['UP', 'DOWN', 'SIDEWAYS'].includes(parsedResult.direction)) {
        parsedResult.direction = 'SIDEWAYS';
      }
      
      // Normalize confidence to 0-100 scale
      if (parsedResult.confidence < 0) parsedResult.confidence = 0;
      if (parsedResult.confidence > 100) parsedResult.confidence = 100;
      
      logger.debug(`Prediction from ${model}: ${parsedResult.direction} with ${parsedResult.confidence}% confidence`);
      
      return {
        model,
        prediction: parsedResult,
        timestamp: new Date().toISOString()
      };
    } catch (parseError) {
      logger.error(`Failed to parse prediction from ${model}`, {
        error: parseError.message,
        result
      });
      
      throw new Error(`Invalid prediction format from ${model}: ${parseError.message}`);
    }
  } catch (error) {
    logger.error(`Error getting prediction from ${model}`, {
      error: error.message,
      stack: error.stack
    });
    
    throw new Error(`Failed to get prediction from ${model}: ${error.message}`);
  }
}

/**
 * Get predictions from multiple LLM models
 * 
 * @param {Object} openai - OpenAI API client
 * @param {string} prompt - Prediction prompt
 * @param {Array<string>} models - Models to use
 * @returns {Promise<Array>} Predictions from all models
 */
async function getPredictionsFromModels(openai, prompt, models = [MODELS.PRIMARY, MODELS.SECONDARY]) {
  try {
    // Get predictions from all models in parallel
    const predictionPromises = models.map(model => 
      getPredictionFromModel(openai, model, prompt)
        .catch(error => ({
          model,
          error: error.message,
          timestamp: new Date().toISOString()
        }))
    );
    
    const predictions = await Promise.all(predictionPromises);
    
    // Filter out failed predictions
    const validPredictions = predictions.filter(pred => !pred.error);
    
    if (validPredictions.length === 0) {
      throw new Error('All models failed to generate predictions');
    }
    
    return validPredictions;
  } catch (error) {
    logger.error('Error getting predictions from models', {
      error: error.message,
      stack: error.stack
    });
    
    throw new Error(`Failed to get predictions: ${error.message}`);
  }
}

/**
 * Calculate consensus prediction from multiple model predictions
 * 
 * @param {Array} predictions - Predictions from multiple models
 * @returns {Object} Consensus prediction
 */
function calculateConsensus(predictions) {
  if (predictions.length === 0) {
    return {
      direction: 'SIDEWAYS',
      confidence: 0,
      reasoning: 'No valid predictions available',
      keyFactors: ['insufficient data'],
      timestamp: new Date().toISOString(),
      modelCount: 0
    };
  }
  
  // Count directions
  const directionCounts = {
    'UP': 0,
    'DOWN': 0,
    'SIDEWAYS': 0
  };
  
  // Track confidence by direction
  const directionConfidence = {
    'UP': [],
    'DOWN': [],
    'SIDEWAYS': []
  };
  
  // Track key factors
  const allFactors = {};
  
  // Process each prediction
  predictions.forEach(predInfo => {
    const { prediction } = predInfo;
    
    // Count direction
    directionCounts[prediction.direction]++;
    
    // Track confidence
    directionConfidence[prediction.direction].push(prediction.confidence);
    
    // Track key factors
    if (prediction.keyFactors && Array.isArray(prediction.keyFactors)) {
      prediction.keyFactors.forEach(factor => {
        allFactors[factor] = (allFactors[factor] || 0) + 1;
      });
    }
  });
  
  // Find majority direction (or SIDEWAYS in case of tie)
  let majorityDirection = 'SIDEWAYS';
  let maxCount = directionCounts['SIDEWAYS'];
  
  if (directionCounts['UP'] > maxCount) {
    majorityDirection = 'UP';
    maxCount = directionCounts['UP'];
  }
  
  if (directionCounts['DOWN'] > maxCount) {
    majorityDirection = 'DOWN';
    maxCount = directionCounts['DOWN'];
  }
  
  // Calculate average confidence for majority direction
  const confidenceValues = directionConfidence[majorityDirection];
  const averageConfidence = confidenceValues.length > 0
    ? Math.round(confidenceValues.reduce((sum, val) => sum + val, 0) / confidenceValues.length)
    : 50; // Default to medium confidence
  
  // Get top key factors
  const sortedFactors = Object.entries(allFactors)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([factor]) => factor);
  
  // Generate reasoning
  const agreement = Math.round((maxCount / predictions.length) * 100);
  const reasoning = `${agreement}% of models predict ${majorityDirection} with average confidence of ${averageConfidence}%`;
  
  return {
    direction: majorityDirection,
    confidence: averageConfidence,
    agreement,
    reasoning,
    keyFactors: sortedFactors.length > 0 ? sortedFactors : ['model consensus'],
    timestamp: new Date().toISOString(),
    modelCount: predictions.length
  };
}

/**
 * Create a trading recommendation based on consensus prediction
 * 
 * @param {Object} consensus - Consensus prediction
 * @param {Object} options - Options for generating recommendation
 * @returns {Object} Trading recommendation
 */
function createTradeRecommendation(consensus, options = {}) {
  const { thresholds = DEFAULT_THRESHOLDS } = options;
  
  // Default to HOLD
  let action = 'HOLD';
  let risk = 'MEDIUM';
  let explanation = 'Insufficient confidence for a clear recommendation.';
  
  // Determine action based on direction and confidence
  if (consensus.direction === 'UP' && consensus.confidence >= thresholds.HIGH) {
    action = 'BUY';
    risk = 'LOW';
    explanation = 'Strong bullish consensus with high confidence.';
  } else if (consensus.direction === 'UP' && consensus.confidence >= thresholds.MEDIUM) {
    action = 'BUY';
    risk = 'MEDIUM';
    explanation = 'Bullish consensus with moderate confidence.';
  } else if (consensus.direction === 'DOWN' && consensus.confidence >= thresholds.HIGH) {
    action = 'SELL';
    risk = 'LOW';
    explanation = 'Strong bearish consensus with high confidence.';
  } else if (consensus.direction === 'DOWN' && consensus.confidence >= thresholds.MEDIUM) {
    action = 'SELL';
    risk = 'MEDIUM';
    explanation = 'Bearish consensus with moderate confidence.';
  } else if (consensus.direction === 'SIDEWAYS') {
    action = 'HOLD';
    risk = 'LOW';
    explanation = 'Sideways movement expected.';
  }
  
  return {
    action,
    risk,
    explanation,
    basedOn: {
      direction: consensus.direction,
      confidence: consensus.confidence,
      agreement: consensus.agreement
    }
  };
}

/**
 * Generate a full prediction for a token
 * 
 * @param {Object} params - Prediction parameters
 * @param {string} params.tokenAddress - Token address
 * @param {string} params.timeframe - Prediction timeframe
 * @param {Object} params.openaiClient - OpenAI API client
 * @param {string} params.birdeyeApiKey - Birdeye API key
 * @param {Array<string>} params.models - Models to use
 * @param {Object} params.options - Additional options
 * @returns {Promise<Object>} Complete prediction result
 */
async function generatePrediction({
  tokenAddress,
  timeframe = '4h',
  openaiClient,
  birdeyeApiKey,
  models = [MODELS.PRIMARY, MODELS.SECONDARY],
  options = {}
}) {
  try {
    logger.info(`Generating prediction for token ${tokenAddress} with timeframe ${timeframe}`);
    
    // Get market data for the token
    const marketData = await getTokenMarketData(tokenAddress, birdeyeApiKey);
    
    // Create prediction prompt
    const prompt = generatePrompt(marketData, {
      timeframe,
      analysisType: options.analysisType || 'standard'
    });
    
    // Get predictions from models
    const predictions = await getPredictionsFromModels(openaiClient, prompt, models);
    
    // Calculate consensus
    const consensus = calculateConsensus(predictions);
    
    // Create trade recommendation
    const recommendation = createTradeRecommendation(consensus, options);
    
    // Log the prediction for auditing
    auditLogger.info('Prediction completed', {
      tokenAddress,
      tokenSymbol: marketData.token.symbol,
      timeframe,
      consensus,
      recommendation,
      modelCount: predictions.length
    });
    
    // Return complete prediction data
    return {
      token: {
        address: tokenAddress,
        name: marketData.token.name,
        symbol: marketData.token.symbol,
        price: marketData.price.value,
        updated: marketData.price.updateHumanTime
      },
      timeframe,
      predictions: predictions.map(p => ({
        model: p.model,
        direction: p.prediction.direction,
        confidence: p.prediction.confidence,
        reasoning: p.prediction.reasoning,
        timestamp: p.timestamp
      })),
      consensus,
      recommendation,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    logger.error(`Error generating prediction for ${tokenAddress}`, {
      error: error.message,
      stack: error.stack
    });
    
    throw new Error(`Prediction failed: ${error.message}`);
  }
}

module.exports = {
  initializeOpenAI,
  getTokenMarketData,
  generatePrompt,
  getPredictionFromModel,
  getPredictionsFromModels,
  calculateConsensus,
  createTradeRecommendation,
  generatePrediction,
  MODELS
};
