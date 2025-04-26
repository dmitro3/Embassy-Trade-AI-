/**
 * Token Discovery MCP Server Test Script
 * 
 * This script tests the Token Discovery MCP server by making requests to its API endpoints.
 */

import axios from 'axios';

// Configuration
const SERVER_URL = 'http://localhost:3100';
const TEST_TOKEN_ADDRESS = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'; // USDC

// Helper function to make API requests
async function makeRequest(endpoint, method = 'GET', data = null) {
  try {
    const config = {
      method,
      url: `${SERVER_URL}${endpoint}`,
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    if (data) {
      config.data = data;
    }
    
    const response = await axios(config);
    return response.data;
  } catch (error) {
    console.error(`Error making request to ${endpoint}:`, error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
    throw error;
  }
}

// Test server info endpoint
async function testServerInfo() {
  console.log('\n=== Testing Server Info ===');
  try {
    const info = await makeRequest('/');
    console.log('Server name:', info.name);
    console.log('Server version:', info.version);
    console.log('Server description:', info.description);
    console.log('Available tools:', info.tools.map(tool => tool.name).join(', '));
    console.log('Available resources:', info.resources.map(resource => resource.name).join(', '));
    console.log('✅ Server info test passed');
    return true;
  } catch (error) {
    console.error('❌ Server info test failed');
    return false;
  }
}

// Test scan_new_tokens tool
async function testScanNewTokens() {
  console.log('\n=== Testing scan_new_tokens Tool ===');
  try {
    const data = {
      tool: 'scan_new_tokens',
      arguments: {
        timeframe: '24h',
        minLiquidity: 10000,
        limit: 5
      }
    };
    
    const result = await makeRequest('/execute', 'POST', data);
    
    console.log('Success:', result.success);
    console.log('Token count:', result.data?.length || 0);
    
    if (result.data && result.data.length > 0) {
      console.log('First token:', {
        address: result.data[0].address,
        symbol: result.data[0].symbol,
        name: result.data[0].name,
        liquidity: result.data[0].liquidity,
        riskScore: result.data[0].riskScore
      });
    }
    
    console.log('✅ scan_new_tokens test passed');
    return true;
  } catch (error) {
    console.error('❌ scan_new_tokens test failed');
    return false;
  }
}

// Test analyze_token tool
async function testAnalyzeToken() {
  console.log('\n=== Testing analyze_token Tool ===');
  try {
    const data = {
      tool: 'analyze_token',
      arguments: {
        tokenAddress: TEST_TOKEN_ADDRESS,
        includeContractAudit: true,
        includeSocialMetrics: true
      }
    };
    
    const result = await makeRequest('/execute', 'POST', data);
    
    console.log('Success:', result.success);
    
    if (result.data) {
      console.log('Token analysis:', {
        address: result.data.address,
        symbol: result.data.symbol,
        name: result.data.name,
        price: result.data.price,
        riskScore: result.data.riskScore,
        recommendation: result.data.tradingRecommendation?.action
      });
    }
    
    console.log('✅ analyze_token test passed');
    return true;
  } catch (error) {
    console.error('❌ analyze_token test failed');
    return false;
  }
}

// Test monitor_token tool
async function testMonitorToken() {
  console.log('\n=== Testing monitor_token Tool ===');
  try {
    const data = {
      tool: 'monitor_token',
      arguments: {
        tokenAddress: TEST_TOKEN_ADDRESS,
        alertThresholds: {
          priceChangePercent: 5,
          volumeChangePercent: 100
        }
      }
    };
    
    const result = await makeRequest('/execute', 'POST', data);
    
    console.log('Success:', result.success);
    console.log('Message:', result.message);
    console.log('Watchlist count:', result.watchlistCount);
    
    console.log('✅ monitor_token test passed');
    return true;
  } catch (error) {
    console.error('❌ monitor_token test failed');
    return false;
  }
}

// Test prepare_snipe tool
async function testPrepareSnipe() {
  console.log('\n=== Testing prepare_snipe Tool ===');
  try {
    const data = {
      tool: 'prepare_snipe',
      arguments: {
        tokenAddress: TEST_TOKEN_ADDRESS,
        amount: 1.5,
        maxSlippage: 1,
        useFlashbots: true
      }
    };
    
    const result = await makeRequest('/execute', 'POST', data);
    
    console.log('Success:', result.success);
    
    if (result.data) {
      console.log('Snipe transaction:', {
        tokenAddress: result.data.tokenAddress,
        tokenSymbol: result.data.tokenSymbol,
        inputAmount: result.data.inputAmount,
        estimatedOutput: result.data.estimatedOutput,
        minOutput: result.data.minOutput
      });
    }
    
    console.log('✅ prepare_snipe test passed');
    return true;
  } catch (error) {
    console.error('❌ prepare_snipe test failed');
    return false;
  }
}

// Test new_token_listings resource
async function testNewTokenListingsResource() {
  console.log('\n=== Testing new_token_listings Resource ===');
  try {
    const result = await makeRequest('/resources/new_token_listings');
    
    console.log('Token count:', result.count);
    
    if (result.data && result.data.length > 0) {
      console.log('First token:', {
        address: result.data[0].address,
        symbol: result.data[0].symbol,
        name: result.data[0].name,
        discoveredAt: new Date(result.data[0].discoveredAt).toLocaleString()
      });
    }
    
    console.log('✅ new_token_listings resource test passed');
    return true;
  } catch (error) {
    console.error('❌ new_token_listings resource test failed');
    return false;
  }
}

// Test watchlist resource
async function testWatchlistResource() {
  console.log('\n=== Testing watchlist Resource ===');
  try {
    const result = await makeRequest('/resources/watchlist');
    
    console.log('Watchlist count:', result.count);
    
    if (result.data && result.data.length > 0) {
      console.log('First token in watchlist:', {
        address: result.data[0].address,
        symbol: result.data[0].symbol,
        name: result.data[0].name
      });
    }
    
    console.log('✅ watchlist resource test passed');
    return true;
  } catch (error) {
    console.error('❌ watchlist resource test failed');
    return false;
  }
}

// Test token_analysis resource
async function testTokenAnalysisResource() {
  console.log('\n=== Testing token_analysis Resource ===');
  try {
    const result = await makeRequest(`/resources/token_analysis/${TEST_TOKEN_ADDRESS}`);
    
    console.log('Success:', result.success);
    
    if (result.data) {
      console.log('Token analysis:', {
        address: result.data.address,
        symbol: result.data.symbol,
        name: result.data.name,
        fromCache: result.fromCache || false
      });
    }
    
    console.log('✅ token_analysis resource test passed');
    return true;
  } catch (error) {
    console.error('❌ token_analysis resource test failed');
    return false;
  }
}

// Run all tests
async function runAllTests() {
  console.log('Starting Token Discovery MCP Server tests...');
  
  let passedTests = 0;
  let totalTests = 0;
  
  // Test server info
  totalTests++;
  if (await testServerInfo()) {
    passedTests++;
  }
  
  // Test tools
  totalTests++;
  if (await testScanNewTokens()) {
    passedTests++;
  }
  
  totalTests++;
  if (await testAnalyzeToken()) {
    passedTests++;
  }
  
  totalTests++;
  if (await testMonitorToken()) {
    passedTests++;
  }
  
  totalTests++;
  if (await testPrepareSnipe()) {
    passedTests++;
  }
  
  // Test resources
  totalTests++;
  if (await testNewTokenListingsResource()) {
    passedTests++;
  }
  
  totalTests++;
  if (await testWatchlistResource()) {
    passedTests++;
  }
  
  totalTests++;
  if (await testTokenAnalysisResource()) {
    passedTests++;
  }
  
  // Print summary
  console.log('\n=== Test Summary ===');
  console.log(`Passed: ${passedTests}/${totalTests} tests`);
  
  if (passedTests === totalTests) {
    console.log('✅ All tests passed!');
  } else {
    console.log(`❌ ${totalTests - passedTests} tests failed.`);
  }
}

// Run the tests
runAllTests().catch(error => {
  console.error('Error running tests:', error);
  process.exit(1);
});
