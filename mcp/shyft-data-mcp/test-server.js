/**
 * Test script for SHYFT Data Normalization MCP Server
 * 
 * This script tests the functionality of the SHYFT Data MCP server
 * by simulating MCP client requests.
 */

import { spawn } from 'child_process';
import { createInterface } from 'readline';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Start the MCP server
console.log('Starting SHYFT Data MCP server...');
const serverProcess = spawn('node', [path.join(__dirname, 'index.js')], {
  stdio: ['pipe', 'pipe', process.stderr']
});

// Create readline interface for server output
const serverOutput = createInterface({
  input: serverProcess.stdout,
  terminal: false
});

// Handle server output
serverOutput.on('line', async (line) => {
  try {
    const message = JSON.parse(line);
    
    if (message.type === 'ready') {
      console.log('Server is ready. Starting tests...');
      await runTests(serverProcess);
    } else if (message.type === 'config') {
      console.log('Received server configuration:', message.config.name);
    } else if (message.type === 'tool_result') {
      console.log(`Received tool result for ID ${message.id}:`, message.success ? 'SUCCESS' : 'FAILURE');
      
      if (message.success) {
        console.log('Data:', JSON.stringify(message.data, null, 2).substring(0, 200) + '...');
      } else {
        console.log('Error:', message.error);
      }
    } else if (message.type === 'resource_result') {
      console.log(`Received resource result for ID ${message.id}:`, message.success ? 'SUCCESS' : 'FAILURE');
      
      if (message.success) {
        console.log('Data:', JSON.stringify(message.data, null, 2).substring(0, 200) + '...');
      } else {
        console.log('Error:', message.error);
      }
    } else if (message.type === 'error') {
      console.error('Server error:', message.error);
    }
  } catch (error) {
    console.error('Error parsing server output:', error.message);
    console.error('Raw output:', line);
  }
});

// Handle server exit
serverProcess.on('exit', (code) => {
  console.log(`Server process exited with code ${code}`);
  process.exit(code);
});

// Handle process exit
process.on('exit', () => {
  serverProcess.kill();
});

// Handle Ctrl+C
process.on('SIGINT', () => {
  console.log('Received SIGINT. Shutting down...');
  serverProcess.kill();
  process.exit(0);
});

/**
 * Run tests against the MCP server
 * 
 * @param {ChildProcess} serverProcess - Server process
 */
async function runTests(serverProcess) {
  try {
    // Test token addresses
    const tokenAddresses = [
      'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
      'So11111111111111111111111111111111111111112', // Wrapped SOL
      'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263', // BONK
      '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU', // SAMO
      'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So' // mSOL
    ];
    
    // Wait for a moment to ensure server is ready
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Test 1: Get token metadata
    console.log('\n=== Test 1: Get token metadata ===');
    await sendToolRequest(serverProcess, 'get_token_metadata', {
      tokenAddress: tokenAddresses[0]
    });
    
    // Wait for response
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Test 2: Get token price
    console.log('\n=== Test 2: Get token price ===');
    await sendToolRequest(serverProcess, 'get_token_price', {
      tokenAddress: tokenAddresses[1]
    });
    
    // Wait for response
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Test 3: Get token holders
    console.log('\n=== Test 3: Get token holders ===');
    await sendToolRequest(serverProcess, 'get_token_holders', {
      tokenAddress: tokenAddresses[2],
      limit: 5
    });
    
    // Wait for response
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Test 4: Get token transactions
    console.log('\n=== Test 4: Get token transactions ===');
    await sendToolRequest(serverProcess, 'get_token_transactions', {
      tokenAddress: tokenAddresses[3],
      limit: 3
    });
    
    // Wait for response
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Test 5: Get token historical prices
    console.log('\n=== Test 5: Get token historical prices ===');
    await sendToolRequest(serverProcess, 'get_token_historical_prices', {
      tokenAddress: tokenAddresses[4],
      timeframe: '1d'
    });
    
    // Wait for response
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Test 6: Get token market data
    console.log('\n=== Test 6: Get token market data ===');
    await sendToolRequest(serverProcess, 'get_token_market_data', {
      tokenAddress: tokenAddresses[0]
    });
    
    // Wait for response
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Test 7: Get multiple tokens market data
    console.log('\n=== Test 7: Get multiple tokens market data ===');
    await sendToolRequest(serverProcess, 'get_multiple_tokens_market_data', {
      tokenAddresses: tokenAddresses.slice(0, 3)
    });
    
    // Wait for response
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Test 8: Get token portfolio
    console.log('\n=== Test 8: Get token portfolio ===');
    await sendToolRequest(serverProcess, 'get_token_portfolio', {
      walletAddress: 'DQyrAcCrDXQ7NeoqGgDCZwBvWDcYmFCjSb9JtteuvPpz'
    });
    
    // Wait for response
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Test 9: Access health resource
    console.log('\n=== Test 9: Access health resource ===');
    await sendResourceRequest(serverProcess, '/health');
    
    // Wait for response
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Test 10: Access token metadata resource
    console.log('\n=== Test 10: Access token metadata resource ===');
    await sendResourceRequest(serverProcess, `/token/${tokenAddresses[0]}/metadata`);
    
    // Wait for response
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log('\n=== All tests completed ===');
    
    // Wait a moment before exiting
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Exit the process
    console.log('Tests completed successfully. Exiting...');
    serverProcess.kill();
    process.exit(0);
  } catch (error) {
    console.error('Error running tests:', error.message);
    serverProcess.kill();
    process.exit(1);
  }
}

/**
 * Send a tool request to the MCP server
 * 
 * @param {ChildProcess} serverProcess - Server process
 * @param {string} toolName - Tool name
 * @param {Object} params - Tool parameters
 */
async function sendToolRequest(serverProcess, toolName, params) {
  const requestId = Date.now().toString();
  
  const request = {
    type: 'tool',
    id: requestId,
    name: toolName,
    params
  };
  
  console.log(`Sending tool request: ${toolName}`);
  console.log('Params:', JSON.stringify(params, null, 2));
  
  serverProcess.stdin.write(JSON.stringify(request) + '\n');
}

/**
 * Send a resource request to the MCP server
 * 
 * @param {ChildProcess} serverProcess - Server process
 * @param {string} uri - Resource URI
 * @param {Object} params - Resource parameters
 */
async function sendResourceRequest(serverProcess, uri, params = {}) {
  const requestId = Date.now().toString();
  
  const request = {
    type: 'resource',
    id: requestId,
    uri,
    params
  };
  
  console.log(`Sending resource request: ${uri}`);
  console.log('Params:', JSON.stringify(params, null, 2));
  
  serverProcess.stdin.write(JSON.stringify(request) + '\n');
}
