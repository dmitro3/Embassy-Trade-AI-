/**
 * Integration Example for Pump.fun MCP Server
 * 
 * This script demonstrates how to integrate with the Pump.fun MCP Server
 * from a client application.
 */

// Load environment variables
require('dotenv').config();

const axios = require('axios');

// Server URL
const SERVER_URL = `http://localhost:${process.env.PORT || 3001}`;

/**
 * Main function
 */
async function main() {
  console.log('Pump.fun MCP Server Integration Example');
  console.log(`Server URL: ${SERVER_URL}`);
  console.log('-----------------------------------');
  
  try {
    // Example 1: Get MCP configuration
    await getMcpConfig();
    
    // Example 2: Get new token launches
    await getNewLaunches();
    
    // Example 3: Analyze a specific token
    await analyzeToken('So11111111111111111111111111111111111111112'); // SOL token address
    
    // Example 4: Get sniping opportunities
    await getSnipingOpportunities();
    
    // Example 5: Monitor a token
    await monitorToken('So11111111111111111111111111111111111111112'); // SOL token address
    
    console.log('-----------------------------------');
    console.log('Integration examples completed successfully!');
  } catch (error) {
    console.error('Integration example failed:', error.message);
    process.exit(1);
  }
}

/**
 * Get MCP configuration
 */
async function getMcpConfig() {
  try {
    console.log('Example 1: Get MCP configuration');
    const response = await axios.get(`${SERVER_URL}/mcp-config`);
    
    console.log('MCP Server Name:', response.data.name);
    console.log('MCP Server Version:', response.data.version);
    console.log('Available Tools:', response.data.tools.map(tool => tool.name).join(', '));
    console.log('Available Resources:', response.data.resources.map(resource => resource.name).join(', '));
    console.log('✅ Successfully retrieved MCP configuration');
    console.log();
  } catch (error) {
    console.error('❌ Failed to get MCP configuration:', error.message);
    throw error;
  }
}

/**
 * Get new token launches
 */
async function getNewLaunches() {
  try {
    console.log('Example 2: Get new token launches');
    const response = await axios.post(`${SERVER_URL}/tools/get_new_launches`, {
      limit: 3,
      minLiquidity: 1000
    });
    
    if (response.data.success) {
      const launches = response.data.launches;
      console.log(`Found ${launches.length} new token launches:`);
      
      launches.forEach((launch, index) => {
        console.log(`${index + 1}. ${launch.symbol} (${launch.address})`);
        console.log(`   Launch Time: ${new Date(launch.launchTime).toLocaleString()}`);
        console.log(`   Liquidity: $${launch.liquidity.toLocaleString()}`);
        console.log(`   Risk Score: ${launch.riskScore.toFixed(2)}`);
      });
    } else {
      console.log('No new token launches found.');
    }
    
    console.log('✅ Successfully retrieved new token launches');
    console.log();
  } catch (error) {
    console.error('❌ Failed to get new token launches:', error.message);
    throw error;
  }
}

/**
 * Analyze a specific token
 * 
 * @param {string} tokenAddress - Token address to analyze
 */
async function analyzeToken(tokenAddress) {
  try {
    console.log(`Example 3: Analyze token (${tokenAddress})`);
    const response = await axios.post(`${SERVER_URL}/tools/analyze_token`, {
      tokenAddress,
      detailed: true
    });
    
    if (response.data.success) {
      const analysis = response.data;
      console.log(`Token: ${analysis.symbol} (${analysis.name})`);
      console.log(`Risk Score: ${analysis.riskScore.toFixed(2)}`);
      console.log(`Snipe Recommendation: ${analysis.snipeRecommendation ? 'Yes' : 'No'}`);
      console.log(`Confidence: ${(analysis.confidence * 100).toFixed(2)}%`);
      
      if (analysis.details) {
        console.log('Details:');
        console.log(`- Liquidity: $${analysis.details.liquidity.value.toLocaleString()}`);
        console.log(`- Holder Concentration: ${(analysis.details.holderConcentration.topHoldersPercentage).toFixed(2)}%`);
        console.log(`- Contract Risk: ${analysis.details.contractRisk.isVerified ? 'Verified' : 'Not Verified'}`);
        console.log(`- Market Volatility: ${analysis.details.marketVolatility.priceChangePercent24h.toFixed(2)}%`);
      }
    } else {
      console.log(`Failed to analyze token: ${response.data.error}`);
    }
    
    console.log('✅ Successfully analyzed token');
    console.log();
  } catch (error) {
    console.error('❌ Failed to analyze token:', error.message);
    throw error;
  }
}

/**
 * Get sniping opportunities
 */
async function getSnipingOpportunities() {
  try {
    console.log('Example 4: Get sniping opportunities');
    const response = await axios.post(`${SERVER_URL}/tools/get_sniping_opportunities`, {
      minConfidence: 0.7,
      maxResults: 3
    });
    
    if (response.data.success) {
      const opportunities = response.data.opportunities;
      console.log(`Found ${opportunities.length} sniping opportunities:`);
      
      opportunities.forEach((opportunity, index) => {
        console.log(`${index + 1}. ${opportunity.symbol} (${opportunity.address})`);
        console.log(`   Risk Score: ${opportunity.riskScore.toFixed(2)}`);
        console.log(`   Confidence: ${((1 - opportunity.riskScore) * 100).toFixed(2)}%`);
        console.log(`   Liquidity: $${opportunity.liquidity.toLocaleString()}`);
      });
    } else {
      console.log('No sniping opportunities found.');
    }
    
    console.log('✅ Successfully retrieved sniping opportunities');
    console.log();
  } catch (error) {
    console.error('❌ Failed to get sniping opportunities:', error.message);
    throw error;
  }
}

/**
 * Monitor a token
 * 
 * @param {string} tokenAddress - Token address to monitor
 */
async function monitorToken(tokenAddress) {
  try {
    console.log(`Example 5: Monitor token (${tokenAddress})`);
    const response = await axios.post(`${SERVER_URL}/tools/monitor_token`, {
      tokenAddress,
      alertThreshold: 5
    });
    
    if (response.data.success) {
      console.log(`Message: ${response.data.message}`);
      console.log('Token details:');
      console.log(`- Symbol: ${response.data.token.symbol}`);
      console.log(`- Name: ${response.data.token.name}`);
      console.log(`- Alert Threshold: ${response.data.token.alertThreshold}%`);
      console.log(`- Last Price: $${response.data.token.lastPrice}`);
      console.log(`- Last Checked: ${new Date(response.data.token.lastChecked).toLocaleString()}`);
    } else {
      console.log(`Failed to monitor token: ${response.data.error}`);
    }
    
    console.log('✅ Successfully set up token monitoring');
    console.log();
  } catch (error) {
    console.error('❌ Failed to monitor token:', error.message);
    throw error;
  }
}

// Run the main function
main();
