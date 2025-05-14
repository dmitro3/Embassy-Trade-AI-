/**
 * Test Script for Pump.fun MCP Server
 * 
 * This script tests the functionality of the Pump.fun MCP Server by making
 * requests to its API endpoints.
 */

// Load environment variables
require('dotenv').config();

const axios = require('axios');

// Server URL
const SERVER_URL = `http://localhost:${process.env.PORT || 3001}`;

// Test token address (SOL)
const TEST_TOKEN_ADDRESS = 'So11111111111111111111111111111111111111112';

/**
 * Run tests
 */
async function runTests() {
  console.log('Testing Pump.fun MCP Server...');
  console.log(`Server URL: ${SERVER_URL}`);
  console.log('-----------------------------------');
  
  try {
    // Test 1: Health check
    await testHealthCheck();
    
    // Test 2: MCP configuration
    await testMcpConfig();
    
    // Test 3: Get new launches
    await testGetNewLaunches();
    
    // Test 4: Analyze token
    await testAnalyzeToken();
    
    // Test 5: Get sniping opportunities
    await testGetSnipingOpportunities();
    
    // Test 6: Monitor token
    await testMonitorToken();
    
    // Test 7: Get monitored tokens
    await testGetMonitoredTokens();
    
    // Test 8: Get launch statistics
    await testGetLaunchStatistics();
    
    console.log('-----------------------------------');
    console.log('All tests completed successfully!');
  } catch (error) {
    console.error('Test failed:', error.message);
    process.exit(1);
  }
}

/**
 * Test health check endpoint
 */
async function testHealthCheck() {
  try {
    console.log('Test 1: Health check');
    const response = await axios.get(`${SERVER_URL}/health`);
    
    if (response.status === 200 && response.data.status === 'ok') {
      console.log('✅ Health check passed');
    } else {
      throw new Error(`Health check failed: ${JSON.stringify(response.data)}`);
    }
  } catch (error) {
    console.error('❌ Health check failed:', error.message);
    throw error;
  }
}

/**
 * Test MCP configuration endpoint
 */
async function testMcpConfig() {
  try {
    console.log('Test 2: MCP configuration');
    const response = await axios.get(`${SERVER_URL}/mcp-config`);
    
    if (response.status === 200 && response.data.name === 'pumpfun-mcp') {
      console.log('✅ MCP configuration passed');
    } else {
      throw new Error(`MCP configuration failed: ${JSON.stringify(response.data)}`);
    }
  } catch (error) {
    console.error('❌ MCP configuration failed:', error.message);
    throw error;
  }
}

/**
 * Test get new launches endpoint
 */
async function testGetNewLaunches() {
  try {
    console.log('Test 3: Get new launches');
    const response = await axios.post(`${SERVER_URL}/tools/get_new_launches`, {
      limit: 5,
      minLiquidity: 1000
    });
    
    if (response.status === 200 && response.data.success) {
      console.log('✅ Get new launches passed');
    } else {
      throw new Error(`Get new launches failed: ${JSON.stringify(response.data)}`);
    }
  } catch (error) {
    console.error('❌ Get new launches failed:', error.message);
    throw error;
  }
}

/**
 * Test analyze token endpoint
 */
async function testAnalyzeToken() {
  try {
    console.log('Test 4: Analyze token');
    const response = await axios.post(`${SERVER_URL}/tools/analyze_token`, {
      tokenAddress: TEST_TOKEN_ADDRESS,
      detailed: true
    });
    
    if (response.status === 200 && response.data.success) {
      console.log('✅ Analyze token passed');
    } else {
      throw new Error(`Analyze token failed: ${JSON.stringify(response.data)}`);
    }
  } catch (error) {
    console.error('❌ Analyze token failed:', error.message);
    throw error;
  }
}

/**
 * Test get sniping opportunities endpoint
 */
async function testGetSnipingOpportunities() {
  try {
    console.log('Test 5: Get sniping opportunities');
    const response = await axios.post(`${SERVER_URL}/tools/get_sniping_opportunities`, {
      minConfidence: 0.7,
      maxResults: 3
    });
    
    if (response.status === 200 && response.data.success) {
      console.log('✅ Get sniping opportunities passed');
    } else {
      throw new Error(`Get sniping opportunities failed: ${JSON.stringify(response.data)}`);
    }
  } catch (error) {
    console.error('❌ Get sniping opportunities failed:', error.message);
    throw error;
  }
}

/**
 * Test monitor token endpoint
 */
async function testMonitorToken() {
  try {
    console.log('Test 6: Monitor token');
    const response = await axios.post(`${SERVER_URL}/tools/monitor_token`, {
      tokenAddress: TEST_TOKEN_ADDRESS,
      alertThreshold: 5
    });
    
    if (response.status === 200 && response.data.success) {
      console.log('✅ Monitor token passed');
    } else {
      throw new Error(`Monitor token failed: ${JSON.stringify(response.data)}`);
    }
  } catch (error) {
    console.error('❌ Monitor token failed:', error.message);
    throw error;
  }
}

/**
 * Test get monitored tokens endpoint
 */
async function testGetMonitoredTokens() {
  try {
    console.log('Test 7: Get monitored tokens');
    const response = await axios.get(`${SERVER_URL}/resources/monitored_tokens`);
    
    if (response.status === 200 && response.data.success) {
      console.log('✅ Get monitored tokens passed');
    } else {
      throw new Error(`Get monitored tokens failed: ${JSON.stringify(response.data)}`);
    }
  } catch (error) {
    console.error('❌ Get monitored tokens failed:', error.message);
    throw error;
  }
}

/**
 * Test get launch statistics endpoint
 */
async function testGetLaunchStatistics() {
  try {
    console.log('Test 8: Get launch statistics');
    const response = await axios.get(`${SERVER_URL}/resources/launch_statistics`);
    
    if (response.status === 200 && response.data.success) {
      console.log('✅ Get launch statistics passed');
    } else {
      throw new Error(`Get launch statistics failed: ${JSON.stringify(response.data)}`);
    }
  } catch (error) {
    console.error('❌ Get launch statistics failed:', error.message);
    throw error;
  }
}

// Run tests
runTests();
