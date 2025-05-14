// Test script for Kraken API connection
// This script checks if the Kraken API connection is working properly
// and displays diagnostic information

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const dotenv = require('dotenv');

// Load environment variables from .env.local
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

// Kraken API keys
const KRAKEN_API_KEY = process.env.KRAKEN_API_KEY || '';
const KRAKEN_API_SECRET = process.env.KRAKEN_API_SECRET || '';

async function testKrakenConnection() {
  console.log('=== Kraken API Connection Test ===');
  
  // Check if API keys are set
  if (!KRAKEN_API_KEY || !KRAKEN_API_SECRET) {
    console.log('\n⚠️ Missing Kraken API keys. Please set them in .env.local file.');
    console.log('You can configure them using the configure-kraken-api.bat script.');
    console.log('\nAttempting to connect to public API only...');
  } else {
    console.log('Kraken API keys found in configuration.');
    console.log(`API Key: ${KRAKEN_API_KEY.substring(0, 4)}...${KRAKEN_API_KEY.substring(KRAKEN_API_KEY.length - 4)}`);
    console.log('API Secret: [hidden]');
  }
  
  // Test public endpoint
  console.log('\n1. Testing public endpoint (Time)...');
  try {
    const publicResponse = await axios.get('https://api.kraken.com/0/public/Time', {
      timeout: 10000,
      headers: {
        'User-Agent': 'TradeForce-AI-Test-Script/1.0'
      }
    });
    
    if (publicResponse.status === 200 && publicResponse.data?.result?.unixtime) {
      console.log('✅ Public API connection successful!');
      console.log(`Server time: ${new Date(publicResponse.data.result.unixtime * 1000).toISOString()}`);
    } else {
      console.log('❌ Public API response format unexpected:', publicResponse.data);
    }
  } catch (error) {
    console.log('❌ Public API connection failed:');
    console.log(error.message);
    if (error.response) {
      console.log(`Status code: ${error.response.status}`);
      console.log('Response data:', error.response.data);
    }
    if (error.request) {
      console.log('No response received');
    }
    
    // Network diagnostics
    console.log('\nNetwork diagnostics:');
    try {
      const { execSync } = require('child_process');
      console.log('\nPinging api.kraken.com...');
      const pingResult = execSync('ping -n 4 api.kraken.com', { encoding: 'utf8' });
      console.log(pingResult);
    } catch (e) {
      console.log('Failed to run ping:', e.message);
    }
    
    return;
  }
  
  // Test private endpoint if API keys are set
  if (KRAKEN_API_KEY && KRAKEN_API_SECRET) {
    console.log('\n2. Testing private endpoint (Balance)...');
    try {
      // Create nonce
      const nonce = Date.now().toString();
      
      // Create message
      const message = new URLSearchParams();
      message.append('nonce', nonce);
      
      const path = '/0/private/Balance';
      const secret = Buffer.from(KRAKEN_API_SECRET, 'base64');
      
      // Create signature according to Kraken API docs
      const hash = crypto.createHash('sha256');
      const hmac = crypto.createHmac('sha512', secret);
      const hashDigest = hash.update(nonce + message.toString()).digest('binary');
      const hmacDigest = hmac.update(path + hashDigest, 'binary').digest('base64');
      
      // Make authenticated request
      const authResponse = await axios.post('https://api.kraken.com/0/private/Balance', message.toString(), {
        headers: {
          'API-Key': KRAKEN_API_KEY,
          'API-Sign': hmacDigest,
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'TradeForce-AI-Test-Script/1.0'
        },
        timeout: 10000
      });
        if (authResponse.status === 200) {
        if (authResponse.data.error && authResponse.data.error.length > 0) {
          console.log('❌ API Authentication failed:');
          console.log(authResponse.data.error.join(', '));
        } else {
          console.log('✅ API Authentication successful!');
          console.log('Account balance available');
          privateApiOk = true;
        }
      } else {
        console.log('❌ API Authentication response unexpected:', authResponse.status);
      }
    } catch (error) {
      console.log('❌ API Authentication failed:');
      console.log(error.message);
      if (error.response) {
        console.log(`Status code: ${error.response.status}`);
        console.log('Response data:', error.response.data);
      }
    }
  }
  
  // Test WebSocket API
  console.log('\n3. Testing WebSocket connection...');
  try {
    const WebSocket = require('ws');
    const ws = new WebSocket('wss://ws.kraken.com');
    
    let connected = false;
    let messageReceived = false;
    
    const wsPromise = new Promise((resolve, reject) => {
      // Set connection timeout
      const timeout = setTimeout(() => {
        if (!messageReceived) {
          reject(new Error('WebSocket connection timeout'));
        }
      }, 10000);
      
      ws.on('open', function open() {
        console.log('WebSocket connection established');
        connected = true;
        
        // Subscribe to ticker
        ws.send(JSON.stringify({
          name: 'subscribe',
          reqid: 1,
          pair: ['XBT/USD'],
          subscription: { name: 'ticker' }
        }));
      });
      
      ws.on('message', function incoming(data) {
        if (!messageReceived) {          messageReceived = true;
          clearTimeout(timeout);
          console.log('✅ Received WebSocket data successfully');
          wsApiOk = true;
          resolve();
        }
        
        // Close connection after first message
        ws.terminate();
      });
      
      ws.on('error', function error(err) {
        console.log('WebSocket error:', err.message);
        reject(err);
      });
    });
    
    await wsPromise;
  } catch (error) {
    console.log('❌ WebSocket connection failed:');
    console.log(error.message);
  }
    // Update status flags
  publicApiOk = true;
  
  console.log('\nDiagnostic summary:');
  console.log('------------------');
  console.log(`Public API: ${publicApiOk ? '✅ OK' : '❌ Failed'}`);
  if (KRAKEN_API_KEY && KRAKEN_API_SECRET) {
    console.log(`Private API: ${privateApiOk ? '✅ OK' : '❌ Failed'}`);
  } else {
    console.log('Private API: ⚠️ Not tested (missing API keys)');
  }
  console.log(`WebSocket API: ${wsApiOk ? '✅ OK' : '❌ Failed'}`);
  
  if (!publicApiOk) {
    console.log('\nRecommendations:');
    console.log('1. Check your internet connection');
    console.log('2. Ensure api.kraken.com is not blocked by firewall or proxy');
    console.log('3. Try accessing https://status.kraken.com to check service status');
  }
  
  if (KRAKEN_API_KEY && KRAKEN_API_SECRET && !privateApiOk) {
    console.log('\nAPI Key recommendations:');
    console.log('1. Verify that your API key and secret are correct');
    console.log('2. Check API key permissions on Kraken website');
    console.log('3. Ensure API key has not been revoked or expired');
  }
}

// Run the test
let publicApiOk = false;
let privateApiOk = false;
let wsApiOk = false;

testKrakenConnection()
  .then(() => console.log('\nTest completed'))
  .catch(err => console.error('Test failed with error:', err));
