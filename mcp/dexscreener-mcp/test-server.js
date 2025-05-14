// mcp/dexscreener-mcp/test-server.js
const axios = require('axios');

// Configuration
const SERVER_URL = 'http://localhost:3002';
const SOL_ADDRESS = 'So11111111111111111111111111111111111111112';

// Test functions
async function testMcpConfig() {
  try {
    console.log('\n🧪 Testing MCP Configuration...');
    const response = await axios.get(`${SERVER_URL}/mcp-config`);
    console.log('✅ MCP Configuration:', response.data);
    return true;
  } catch (error) {
    console.error('❌ MCP Configuration Error:', error.message);
    return false;
  }
}

async function testTrendingTokens() {
  try {
    console.log('\n🧪 Testing Trending Tokens...');
    const response = await axios.get(`${SERVER_URL}/trending-tokens?limit=5`);
    console.log(`✅ Retrieved ${response.data.length} trending tokens:`);
    response.data.forEach((token, index) => {
      console.log(`  ${index + 1}. ${token.symbol} - $${token.price.toFixed(6)} - Vol: $${token.volume24h.toFixed(2)}`);
    });
    return true;
  } catch (error) {
    console.error('❌ Trending Tokens Error:', error.message);
    return false;
  }
}

async function testTokenPatterns() {
  try {
    console.log('\n🧪 Testing Token Pattern Analysis...');
    const response = await axios.get(`${SERVER_URL}/analyze-patterns/${SOL_ADDRESS}?timeframes=5m,15m`);
    console.log('✅ Pattern Analysis Results:');
    
    for (const [timeframe, patterns] of Object.entries(response.data)) {
      console.log(`\n  📊 Timeframe: ${timeframe}`);
      
      if (patterns.cupAndHandle.detected) {
        console.log(`    Cup and Handle: Detected (Confidence: ${(patterns.cupAndHandle.confidence * 100).toFixed(2)}%)`);
      } else {
        console.log('    Cup and Handle: Not Detected');
      }
      
      if (patterns.bullFlag.detected) {
        console.log(`    Bull Flag: Detected (Confidence: ${(patterns.bullFlag.confidence * 100).toFixed(2)}%)`);
      } else {
        console.log('    Bull Flag: Not Detected');
      }
    }
    
    return true;
  } catch (error) {
    console.error('❌ Token Pattern Analysis Error:', error.message);
    return false;
  }
}

async function testTokenDetails() {
  try {
    console.log('\n🧪 Testing Token Details...');
    const response = await axios.get(`${SERVER_URL}/token/${SOL_ADDRESS}`);
    const token = response.data;
    
    console.log('✅ Token Details:');
    console.log(`  Symbol: ${token.symbol}`);
    console.log(`  Name: ${token.name}`);
    console.log(`  Price: $${token.price.toFixed(6)}`);
    console.log(`  24h Volume: $${token.volume24h.toFixed(2)}`);
    console.log(`  24h Change: ${token.priceChangePercent.h24.toFixed(2)}%`);
    console.log(`  Liquidity: $${token.liquidity.toFixed(2)}`);
    
    return true;
  } catch (error) {
    console.error('❌ Token Details Error:', error.message);
    return false;
  }
}

async function testBullishTokens() {
  try {
    console.log('\n🧪 Testing Bullish Tokens...');
    const response = await axios.get(`${SERVER_URL}/bullish-tokens?limit=3&timeframe=15m&minConfidence=0.6`);
    
    if (response.data.length === 0) {
      console.log('✅ No bullish tokens found with current criteria');
    } else {
      console.log(`✅ Found ${response.data.length} bullish tokens:`);
      response.data.forEach((token, index) => {
        console.log(`  ${index + 1}. ${token.symbol} - $${token.price.toFixed(6)}`);
        
        if (token.patterns.cupAndHandle.detected) {
          console.log(`     Cup and Handle (${(token.patterns.cupAndHandle.confidence * 100).toFixed(2)}%)`);
        }
        
        if (token.patterns.bullFlag.detected) {
          console.log(`     Bull Flag (${(token.patterns.bullFlag.confidence * 100).toFixed(2)}%)`);
        }
      });
    }
    
    return true;
  } catch (error) {
    console.error('❌ Bullish Tokens Error:', error.message);
    return false;
  }
}

async function testMcpTools() {
  try {
    console.log('\n🧪 Testing MCP Tools...');
    
    // Test get_trending_tokens tool
    console.log('\n  Testing get_trending_tokens tool...');
    const trendingResponse = await axios.post(`${SERVER_URL}/tools/get_trending_tokens`, {
      limit: 3,
      minVolume: 10000,
      minVolumeChange: 5
    });
    
    if (trendingResponse.data.success) {
      console.log(`  ✅ get_trending_tokens: Retrieved ${trendingResponse.data.data.length} tokens`);
    } else {
      console.log(`  ❌ get_trending_tokens: ${trendingResponse.data.error}`);
    }
    
    // Test analyze_token_patterns tool
    console.log('\n  Testing analyze_token_patterns tool...');
    const patternsResponse = await axios.post(`${SERVER_URL}/tools/analyze_token_patterns`, {
      tokenAddress: SOL_ADDRESS,
      timeframes: ['5m', '15m']
    });
    
    if (patternsResponse.data.success) {
      console.log('  ✅ analyze_token_patterns: Analysis completed');
    } else {
      console.log(`  ❌ analyze_token_patterns: ${patternsResponse.data.error}`);
    }
    
    // Test get_token_details tool
    console.log('\n  Testing get_token_details tool...');
    const detailsResponse = await axios.post(`${SERVER_URL}/tools/get_token_details`, {
      tokenAddress: SOL_ADDRESS
    });
    
    if (detailsResponse.data.success) {
      console.log(`  ✅ get_token_details: Retrieved details for ${detailsResponse.data.data.symbol}`);
    } else {
      console.log(`  ❌ get_token_details: ${detailsResponse.data.error}`);
    }
    
    return true;
  } catch (error) {
    console.error('❌ MCP Tools Error:', error.message);
    return false;
  }
}

async function testMcpResources() {
  try {
    console.log('\n🧪 Testing MCP Resources...');
    
    // Test trending_tokens resource
    console.log('\n  Testing trending_tokens resource...');
    const trendingResponse = await axios.get(`${SERVER_URL}/resources/trending_tokens`);
    console.log(`  ✅ trending_tokens: Retrieved ${trendingResponse.data.length} tokens`);
    
    // Test bullish_patterns resource
    console.log('\n  Testing bullish_patterns resource...');
    const patternsResponse = await axios.get(`${SERVER_URL}/resources/bullish_patterns?timeframe=15m&minConfidence=0.6`);
    console.log(`  ✅ bullish_patterns: Retrieved ${patternsResponse.data.length} tokens with bullish patterns`);
    
    return true;
  } catch (error) {
    console.error('❌ MCP Resources Error:', error.message);
    return false;
  }
}

// Run all tests
async function runTests() {
  console.log('🚀 Starting DEXScreener MCP Server Tests...');
  
  let passedTests = 0;
  let totalTests = 7;
  
  // Wait for server to be ready
  console.log('⏳ Waiting for server to be ready...');
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Run tests
  if (await testMcpConfig()) passedTests++;
  if (await testTrendingTokens()) passedTests++;
  if (await testTokenPatterns()) passedTests++;
  if (await testTokenDetails()) passedTests++;
  if (await testBullishTokens()) passedTests++;
  if (await testMcpTools()) passedTests++;
  if (await testMcpResources()) passedTests++;
  
  // Print summary
  console.log('\n📋 Test Summary:');
  console.log(`  Passed: ${passedTests}/${totalTests} (${(passedTests / totalTests * 100).toFixed(2)}%)`);
  
  if (passedTests === totalTests) {
    console.log('🎉 All tests passed!');
  } else {
    console.log('⚠️ Some tests failed.');
  }
}

// Run the tests
runTests().catch(error => {
  console.error('❌ Test Runner Error:', error.message);
});
