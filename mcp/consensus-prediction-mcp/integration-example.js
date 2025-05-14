/**
 * Consensus Prediction MCP Server - Integration Example
 * 
 * This script demonstrates how to integrate with the Consensus Prediction MCP server
 * from client-side code. It includes examples of generating predictions, analyzing tokens,
 * and searching for tokens using the MCP server's API endpoints.
 */

// Import dependencies
const axios = require('axios');

// Configuration
const SERVER_URL = 'http://localhost:3123'; // Default MCP server URL

/**
 * Generate a consensus prediction for a token
 * 
 * @param {string} tokenAddress - The token address to generate a prediction for
 * @param {string} timeframe - The timeframe for prediction (1H, 4H, 1D, 1W)
 * @returns {Promise<Object>} The prediction result
 */
async function generatePrediction(tokenAddress, timeframe = '1D') {
  try {
    console.log(`Generating prediction for token ${tokenAddress} with timeframe ${timeframe}...`);
    
    const response = await axios.post(`${SERVER_URL}/api/predict`, {
      tokenAddress,
      timeframe
    });
    
    if (response.data.success) {
      return response.data.data;
    } else {
      throw new Error(response.data.error || 'Failed to generate prediction');
    }
  } catch (error) {
    console.error('Error generating prediction:', error.message);
    if (error.response) {
      console.error('Server response:', error.response.data);
    }
    throw error;
  }
}

/**
 * Analyze a token's technical indicators and risk assessment
 * 
 * @param {string} tokenAddress - The token address to analyze
 * @returns {Promise<Object>} The analysis result
 */
async function analyzeToken(tokenAddress) {
  try {
    console.log(`Analyzing token ${tokenAddress}...`);
    
    const response = await axios.post(`${SERVER_URL}/api/analyze`, {
      tokenAddress
    });
    
    if (response.data.success) {
      return response.data.data;
    } else {
      throw new Error(response.data.error || 'Failed to analyze token');
    }
  } catch (error) {
    console.error('Error analyzing token:', error.message);
    if (error.response) {
      console.error('Server response:', error.response.data);
    }
    throw error;
  }
}

/**
 * Search for tokens by name or symbol
 * 
 * @param {string} query - The search query (token name or symbol)
 * @param {number} limit - Maximum number of results to return
 * @returns {Promise<Object>} The search results
 */
async function searchTokens(query, limit = 20) {
  try {
    console.log(`Searching for tokens matching "${query}"...`);
    
    const response = await axios.get(`${SERVER_URL}/api/search`, {
      params: {
        query,
        limit
      }
    });
    
    if (response.data.success) {
      return response.data.data;
    } else {
      throw new Error(response.data.error || 'Failed to search tokens');
    }
  } catch (error) {
    console.error('Error searching tokens:', error.message);
    if (error.response) {
      console.error('Server response:', error.response.data);
    }
    throw error;
  }
}

/**
 * Get server status
 * 
 * @returns {Promise<Object>} The server status
 */
async function getServerStatus() {
  try {
    console.log('Getting server status...');
    
    const response = await axios.get(`${SERVER_URL}/api/status`);
    
    if (response.data.success) {
      return response.data.data;
    } else {
      throw new Error(response.data.error || 'Failed to get server status');
    }
  } catch (error) {
    console.error('Error getting server status:', error.message);
    if (error.response) {
      console.error('Server response:', error.response.data);
    }
    throw error;
  }
}

/**
 * Clear the server's cache
 * 
 * @returns {Promise<Object>} The result of the operation
 */
async function clearCache() {
  try {
    console.log('Clearing server cache...');
    
    const response = await axios.post(`${SERVER_URL}/api/cache/clear`);
    
    if (response.data.success) {
      return response.data.data;
    } else {
      throw new Error(response.data.error || 'Failed to clear cache');
    }
  } catch (error) {
    console.error('Error clearing cache:', error.message);
    if (error.response) {
      console.error('Server response:', error.response.data);
    }
    throw error;
  }
}

/**
 * Utility to format prediction for display
 * 
 * @param {Object} prediction - The prediction object
 * @returns {string} Formatted prediction
 */
function formatPrediction(prediction) {
  const { token, consensus, timeframe, metrics } = prediction;
  
  let output = [
    '==================== PREDICTION RESULT ====================',
    `Token: ${token.name} (${token.symbol})`,
    `Address: ${token.address}`,
    `Current Price: $${token.currentPrice}`,
    `Time Frame: ${timeframe}`,
    '',
    '---------- CONSENSUS ----------',
    `Direction: ${consensus.direction.toUpperCase()}`,
    `Confidence: ${(consensus.confidence * 100).toFixed(2)}%`,
    `Price Target: ${consensus.priceTarget ? '$' + consensus.priceTarget.toFixed(6) : 'None'}`,
    '',
    'Key Reasons:',
    ...consensus.reasons.map(reason => `- ${reason}`),
    '',
    '---------- METRICS ----------',
    `24h Volume: $${metrics.volume24h.toFixed(2)}`,
    `24h Price Change: ${metrics.priceChange24h.toFixed(2)}%`,
    `Liquidity: $${metrics.liquidity.toFixed(2)}`,
    '',
    '---------- MODELS USED ----------',
  ];
  
  prediction.models.forEach(model => {
    output.push(`Model: ${model.name}`);
    output.push(`Direction: ${model.direction} (Confidence: ${(model.confidence * 100).toFixed(2)}%)`);
    output.push(`Reasoning: ${model.reasoning.substring(0, 100)}...`);
    output.push('');
  });
  
  output.push('========================================================');
  
  return output.join('\n');
}

/**
 * Utility to format analysis for display
 * 
 * @param {Object} analysis - The analysis object
 * @returns {string} Formatted analysis
 */
function formatAnalysis(analysis) {
  const { token, metrics, technicalIndicators, marketFactors, riskAssessment, recommendation } = analysis;
  
  let output = [
    '==================== ANALYSIS RESULT ====================',
    `Token: ${token.name} (${token.symbol})`,
    `Address: ${token.address}`,
    `Current Price: $${token.currentPrice}`,
    '',
    '---------- METRICS ----------',
    `24h Volume: $${metrics.volume24h.toFixed(2)}`,
    `24h Price Change: ${metrics.priceChange24h.toFixed(2)}%`,
    `Liquidity: $${metrics.liquidity.toFixed(2)}`,
    '',
    '---------- TECHNICAL INDICATORS ----------',
  ];
  
  technicalIndicators.forEach(indicator => {
    output.push(`${indicator.name}: ${indicator.value}`);
    output.push(`Interpretation: ${indicator.interpretation}`);
    output.push('');
  });
  
  output.push('---------- MARKET FACTORS ----------');
  marketFactors.forEach(factor => {
    output.push(`${factor.name}: ${factor.assessment}`);
  });
  
  output.push('');
  output.push('---------- RISK ASSESSMENT ----------');
  output.push(`Risk Level: ${riskAssessment.riskLevel.toUpperCase()}`);
  output.push(`Volatility: ${riskAssessment.volatilityAssessment}`);
  output.push('Key Risks:');
  riskAssessment.keyRisks.forEach(risk => {
    output.push(`- ${risk}`);
  });
  
  output.push('');
  output.push('---------- RECOMMENDATION ----------');
  output.push(`Action: ${recommendation.action.toUpperCase()}`);
  output.push(`Timeframe: ${recommendation.timeframe}`);
  output.push(`Reasoning: ${recommendation.reasoning}`);
  
  output.push('========================================================');
  
  return output.join('\n');
}

/**
 * Utility to format search results for display
 * 
 * @param {Object} searchResults - The search results object
 * @returns {string} Formatted search results
 */
function formatSearchResults(searchResults) {
  const { query, tokens, count } = searchResults;
  
  let output = [
    '==================== SEARCH RESULTS ====================',
    `Query: "${query}"`,
    `Found: ${count} tokens`,
    ''
  ];
  
  tokens.forEach((token, index) => {
    output.push(`${index + 1}. ${token.name} (${token.symbol})`);
    output.push(`   Address: ${token.address}`);
    output.push('');
  });
  
  output.push('========================================================');
  
  return output.join('\n');
}

/**
 * Example usage
 */
async function runExample() {
  try {
    // Check if server is running
    const status = await getServerStatus();
    console.log('Server Status:', status);
    console.log(`Connected to Consensus Prediction MCP Server v${status.version}`);
    console.log(`Using models: ${status.models.join(', ')}`);
    console.log('');
    
    // Example token addresses (SOL and USDC on Solana)
    const solAddress = 'So11111111111111111111111111111111111111112';
    const usdcAddress = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
    
    // Example 1: Search for tokens
    console.log('Example 1: Searching for tokens');
    const searchResults = await searchTokens('SOL');
    console.log(formatSearchResults(searchResults));
    
    // Example 2: Generate prediction
    console.log('Example 2: Generating prediction');
    const prediction = await generatePrediction(solAddress, '1D');
    console.log(formatPrediction(prediction));
    
    // Example 3: Analyze token
    console.log('Example 3: Analyzing token');
    const analysis = await analyzeToken(usdcAddress);
    console.log(formatAnalysis(analysis));
    
    console.log('All examples completed successfully!');
  } catch (error) {
    console.error('Error running examples:', error.message);
  }
}

// Run the example if this script is executed directly
if (require.main === module) {
  runExample();
}

// Export functions for use in other modules
module.exports = {
  generatePrediction,
  analyzeToken,
  searchTokens,
  getServerStatus,
  clearCache,
  formatPrediction,
  formatAnalysis,
  formatSearchResults
};
