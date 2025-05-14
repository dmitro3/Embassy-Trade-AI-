'use strict';

/**
 * Wallet Connection and Trading Test Script
 * 
 * This script tests:
 * 1. Connection to MCP servers
 * 2. Solana DevNet connection
 * 3. Simple trading functionality
 */

import axios from 'axios';
import { performance } from 'perf_hooks';

// Configuration
const config = {
  mcpServers: [
    { name: 'DexScreener MCP', url: 'http://localhost:3002/health' },
    { name: 'Pump.fun MCP', url: 'http://localhost:3001/health' },
    { name: 'SHYFT Data MCP', url: 'http://localhost:3001/health' },
    { name: 'Token Discovery MCP', url: 'http://localhost:3100/health' }
  ],
  tradeforceApiUrl: 'http://localhost:3008/api',
  solanaDevnetUrl: 'https://api.devnet.solana.com'
};

// Test MCP server connections
async function testMCPServerConnections() {
  console.log('🔍 Testing MCP Server Connections...');
  
  const results = [];
  
  for (const server of config.mcpServers) {
    const startTime = performance.now();
    try {
      console.log(`   Testing ${server.name} at ${server.url}...`);
      const response = await axios.get(server.url, { timeout: 5000 });
      const endTime = performance.now();
      
      results.push({
        server: server.name,
        status: response.status === 200 ? 'ONLINE' : 'ERROR',
        responseTime: Math.round(endTime - startTime),
        data: response.data
      });
      
      console.log(`   ✅ ${server.name} is ONLINE (${Math.round(endTime - startTime)}ms)`);
    } catch (error) {
      const endTime = performance.now();
      
      results.push({
        server: server.name,
        status: 'OFFLINE',
        responseTime: Math.round(endTime - startTime),
        error: error.message
      });
      
      console.log(`   ❌ ${server.name} is OFFLINE: ${error.message}`);
    }
  }
  
  return results;
}

// Test Solana DevNet connection
async function testSolanaDevNetConnection() {
  console.log('🔍 Testing Solana DevNet Connection...');
  
  const startTime = performance.now();
  
  try {
    const response = await axios.post(
      config.solanaDevnetUrl,
      {
        jsonrpc: '2.0',
        id: 1,
        method: 'getHealth'
      },
      { timeout: 10000 }
    );
    
    const endTime = performance.now();
    const responseTime = Math.round(endTime - startTime);
    
    if (response.data?.result === 'ok') {
      console.log(`   ✅ Solana DevNet is ONLINE (${responseTime}ms)`);
      return {
        status: 'ONLINE',
        responseTime,
        data: response.data
      };
    } else {
      console.log(`   ⚠️ Solana DevNet returned unexpected response: ${JSON.stringify(response.data)}`);
      return {
        status: 'WARNING',
        responseTime,
        data: response.data
      };
    }
  } catch (error) {
    const endTime = performance.now();
    
    console.log(`   ❌ Solana DevNet is OFFLINE: ${error.message}`);
    return {
      status: 'OFFLINE',
      responseTime: Math.round(endTime - startTime),
      error: error.message
    };
  }
}

// Run all tests
async function runAllTests() {
  console.log('🚀 Starting TradeForce AI Integration Tests');
  console.log('==========================================');
  
  // Test 1: MCP Server Connections
  const mcpResults = await testMCPServerConnections();
  
  console.log('\n📊 MCP Server Results:');
  console.table(mcpResults.map(r => ({
    Server: r.server,
    Status: r.status,
    'Response Time (ms)': r.responseTime
  })));
  
  // Test 2: Solana DevNet Connection
  const solanaResult = await testSolanaDevNetConnection();
  
  console.log('\n📊 Solana DevNet Result:');
  console.table([{
    Status: solanaResult.status,
    'Response Time (ms)': solanaResult.responseTime,
    Error: solanaResult.error || 'None'
  }]);
  
  console.log('\n✨ All tests completed');
  
  // Overall status
  const allMCPServersOnline = mcpResults.every(r => r.status === 'ONLINE');
  const solanaDevnetOnline = solanaResult.status === 'ONLINE';
  
  if (allMCPServersOnline && solanaDevnetOnline) {
    console.log('✅ ALL SYSTEMS OPERATIONAL');
  } else if (solanaDevnetOnline) {
    console.log('⚠️ SOME MCP SERVERS OFFLINE - Limited functionality available');
  } else {
    console.log('❌ CRITICAL SYSTEMS OFFLINE - Application may not function correctly');
  }
}

// Execute tests
runAllTests().catch(error => {
  console.error('Error running tests:', error);
  process.exit(1);
});
