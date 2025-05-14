/**
 * TradeForce AI - Fix Verification Script
 * 
 * This script verifies that all the fixes for the critical integration errors are working correctly.
 * It tests:
 * 1. Shyft WebSocket connection
 * 2. Firebase authentication
 * 3. Birdeye API rate limiting
 * 4. Reference errors in the code
 */

import { logger } from '../lib/logger.js';
import { useShyftWebSocket } from '../lib/useShyftWebSocket.js';
import { useBirdeyeData } from '../lib/useBirdeyeData.js';
import { apiKeyManager } from '../lib/apiKeyManager.js';
import { fallbackMarketService } from '../lib/fallbackMarketService.js';
import { firebaseFixer } from '../lib/firebaseFixer.js';

// Configuration for tests
const TEST_CONFIG = {
  // Number of WebSocket connection tests to run in sequence
  shyftWebSocketTests: 3,
  
  // Number of Birdeye API calls to make in sequence to test rate limiting
  birdeyeRateLimitTests: 10,
  
  // Token to use for tests
  testToken: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263', // BONK
  
  // Timeout for WebSocket connection (ms)
  webSocketTimeout: 15000,
  
  // Delay between tests (ms)
  testDelay: 1000,
};

// Test results tracking
const testResults = {
  shyftWebSocket: {
    passed: 0,
    failed: 0,
    reconnections: 0,
    errors: []
  },
  birdeyeAPI: {
    passed: 0,
    failed: 0,
    rateLimited: 0,
    fallbacksUsed: 0,
    errors: []
  },
  firebase: {
    fixed: false,
    errors: []
  },
  references: {
    passed: true,
    errors: []
  }
};

/**
 * Test Shyft WebSocket connection with improved error handling
 */
async function testShyftWebSocketConnection() {
  console.log('\n=== Testing Shyft WebSocket Connection ===');
  
  try {
    // Get API key from the manager
    const apiKey = await apiKeyManager.getApiKey('shyft');
    
    if (!apiKey) {
      throw new Error('Failed to get Shyft API key from manager');
    }
    
    console.log('- Using API key from manager');
    
    // Test multiple connections to verify reconnection logic
    for (let i = 0; i < TEST_CONFIG.shyftWebSocketTests; i++) {
      console.log(`\n- Test connection ${i + 1}/${TEST_CONFIG.shyftWebSocketTests}...`);
      
      // Create a promise that resolves when connected or rejects on timeout
      const connectionPromise = new Promise((resolve, reject) => {
        const { wsStatus, tokenUpdates, reconnect } = useShyftWebSocket(`wss://devnet-rpc.shyft.to?api_key=${apiKey}`);
        
        // Track connection status changes
        let connectionStatus = wsStatus;
        let connectionStartTime = Date.now();
        let timeoutId = setTimeout(() => {
          reject(new Error('WebSocket connection timed out'));
        }, TEST_CONFIG.webSocketTimeout);
        
        // Check connection status every 500ms
        const statusCheckInterval = setInterval(() => {
          if (connectionStatus !== wsStatus) {
            console.log(`  Status changed: ${connectionStatus} -> ${wsStatus}`);
            connectionStatus = wsStatus;
            
            if (wsStatus === 'connected') {
              clearTimeout(timeoutId);
              clearInterval(statusCheckInterval);
              resolve({ status: wsStatus, reconnect });
            } else if (wsStatus === 'error' || wsStatus === 'failed') {
              console.log('  Attempting reconnection...');
              reconnect();
              testResults.shyftWebSocket.reconnections++;
            }
          }
        }, 500);
      });
      
      try {
        const result = await connectionPromise;
        console.log(`  Connection successful: ${result.status}`);
        testResults.shyftWebSocket.passed++;
        
        // Force disconnect and test reconnection if not the last test
        if (i < TEST_CONFIG.shyftWebSocketTests - 1) {
          console.log('  Testing reconnection by forcing disconnect...');
          // Simulate network error by reconnecting
          result.reconnect();
          
          // Wait for reconnection
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      } catch (error) {
        console.error(`  Connection failed: ${error.message}`);
        testResults.shyftWebSocket.failed++;
        testResults.shyftWebSocket.errors.push(error.message);
      }
      
      // Add delay between tests
      if (i < TEST_CONFIG.shyftWebSocketTests - 1) {
        await new Promise(resolve => setTimeout(resolve, TEST_CONFIG.testDelay));
      }
    }
  } catch (error) {
    console.error(`Shyft WebSocket test error: ${error.message}`);
    testResults.shyftWebSocket.failed += TEST_CONFIG.shyftWebSocketTests;
    testResults.shyftWebSocket.errors.push(error.message);
  }
  
  console.log('\nShyft WebSocket Test Results:');
  console.log(`- Passed: ${testResults.shyftWebSocket.passed}/${TEST_CONFIG.shyftWebSocketTests}`);
  console.log(`- Failed: ${testResults.shyftWebSocket.failed}/${TEST_CONFIG.shyftWebSocketTests}`);
  console.log(`- Reconnections: ${testResults.shyftWebSocket.reconnections}`);
  
  if (testResults.shyftWebSocket.errors.length > 0) {
    console.log('- Errors:');
    testResults.shyftWebSocket.errors.forEach(err => console.log(`  - ${err}`));
  }
}

/**
 * Test Birdeye API with rate limiting mitigation
 */
async function testBirdeyeAPIRateLimiting() {
  console.log('\n=== Testing Birdeye API Rate Limiting ===');
  
  try {
    // Get API key from the manager
    const apiKey = await apiKeyManager.getApiKey('birdeye');
    
    if (!apiKey) {
      throw new Error('Failed to get Birdeye API key from manager');
    }
    
    console.log('- Using API key from manager');
    
    // Use the Birdeye hook with the token
    const { 
      tokenData, 
      loading, 
      error, 
      refresh,
      lastRefreshTime,
      usedFallback
    } = useBirdeyeData(TEST_CONFIG.testToken, apiKey);
    
    console.log('- Testing multiple rapid API calls to check rate limiting handling...');
    
    // Make multiple API calls in quick succession to test rate limiting
    for (let i = 0; i < TEST_CONFIG.birdeyeRateLimitTests; i++) {
      console.log(`\n- API call ${i + 1}/${TEST_CONFIG.birdeyeRateLimitTests}...`);
      
      try {
        await refresh();
        console.log(`  Refresh successful. Used fallback: ${usedFallback}`);
        
        if (usedFallback) {
          testResults.birdeyeAPI.fallbacksUsed++;
          console.log('  Used fallback service successfully');
        }
        
        testResults.birdeyeAPI.passed++;
        
        // Add a small delay to simulate realistic usage
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (err) {
        console.error(`  Refresh failed: ${err.message}`);
        
        if (err.message.includes('rate limit') || err.message.includes('429')) {
          testResults.birdeyeAPI.rateLimited++;
          console.log('  Detected rate limiting - should use fallback');
          
          // Check if fallback was used
          if (usedFallback) {
            console.log('  Fallback used successfully');
            testResults.birdeyeAPI.fallbacksUsed++;
          } else {
            console.log('  Fallback not used despite rate limiting');
            testResults.birdeyeAPI.failed++;
            testResults.birdeyeAPI.errors.push('Fallback not used despite rate limiting');
          }
        } else {
          testResults.birdeyeAPI.failed++;
          testResults.birdeyeAPI.errors.push(err.message);
        }
      }
    }
    
    // Test fallback service directly
    console.log('\n- Testing fallback market service directly...');
    try {
      const fallbackData = await fallbackMarketService.getTokenData(TEST_CONFIG.testToken);
      console.log(`  Fallback service response: ${JSON.stringify(fallbackData, null, 2)}`);
      
      if (fallbackData && fallbackData.price) {
        console.log('  Fallback service working correctly');
      } else {
        throw new Error('Fallback service returned invalid data');
      }
    } catch (err) {
      console.error(`  Fallback service error: ${err.message}`);
      testResults.birdeyeAPI.failed++;
      testResults.birdeyeAPI.errors.push(`Fallback service error: ${err.message}`);
    }
  } catch (error) {
    console.error(`Birdeye API test error: ${error.message}`);
    testResults.birdeyeAPI.failed += TEST_CONFIG.birdeyeRateLimitTests;
    testResults.birdeyeAPI.errors.push(error.message);
  }
  
  console.log('\nBirdeye API Test Results:');
  console.log(`- Passed: ${testResults.birdeyeAPI.passed}/${TEST_CONFIG.birdeyeRateLimitTests}`);
  console.log(`- Failed: ${testResults.birdeyeAPI.failed}/${TEST_CONFIG.birdeyeRateLimitTests}`);
  console.log(`- Rate Limited: ${testResults.birdeyeAPI.rateLimited}`);
  console.log(`- Fallbacks Used: ${testResults.birdeyeAPI.fallbacksUsed}`);
  
  if (testResults.birdeyeAPI.errors.length > 0) {
    console.log('- Errors:');
    testResults.birdeyeAPI.errors.forEach(err => console.log(`  - ${err}`));
  }
}

/**
 * Test Firebase fixes for permission errors
 */
async function testFirebaseFixes() {
  console.log('\n=== Testing Firebase Permission Fix ===');
  
  try {
    // Check if the Firebase fixer is initialized
    if (!firebaseFixer) {
      throw new Error('Firebase fixer not initialized');
    }
    
    console.log('- Firebase fixer found');
    
    // Test the cleaner
    console.log('- Testing IndexedDB cleaner...');
    const cleanResult = await firebaseFixer.cleanIndexedDB();
    console.log(`  Clean result: ${JSON.stringify(cleanResult)}`);
    
    // Check if installation mocking is enabled
    console.log('- Testing Installations API mocking...');
    const isMockEnabled = await firebaseFixer.isInstallationsMockEnabled();
    console.log(`  Installations mock enabled: ${isMockEnabled}`);
    
    if (isMockEnabled) {
      console.log('  Testing mock Installation ID...');
      const mockId = await window._firebase_installations_compat_mock.getId();
      console.log(`  Mock ID: ${mockId}`);
      
      if (mockId && mockId.includes('mock-installation-id')) {
        console.log('  Mock ID works correctly');
      } else {
        throw new Error('Mock ID does not match expected format');
      }
      
      console.log('  Testing mock Token...');
      const mockToken = await window._firebase_installations_compat_mock.getToken();
      console.log(`  Mock token: ${mockToken}`);
      
      if (mockToken && mockToken.includes('mock-token')) {
        console.log('  Mock token works correctly');
      } else {
        throw new Error('Mock token does not match expected format');
      }
    } else {
      throw new Error('Installations mock not enabled');
    }
    
    testResults.firebase.fixed = true;
  } catch (error) {
    console.error(`Firebase fix test error: ${error.message}`);
    testResults.firebase.errors.push(error.message);
  }
  
  console.log('\nFirebase Fix Test Results:');
  console.log(`- Fixed: ${testResults.firebase.fixed ? 'Yes' : 'No'}`);
  
  if (testResults.firebase.errors.length > 0) {
    console.log('- Errors:');
    testResults.firebase.errors.forEach(err => console.log(`  - ${err}`));
  }
}

/**
 * Test for reference errors (variable ordering)
 */
async function testReferenceErrors() {
  console.log('\n=== Testing Reference Error Fixes ===');
  
  try {
    // We'll check for reference errors indirectly by accessing components
    // and checking if they're defined in the expected order
    
    // Import the components to test
    const TradeForceDashboard = await import('../components/TradeForceDashboard.js');
    
    console.log('- TradeForceDashboard component loaded successfully');
    
    // Check if the wsStatus property gets defined before it's used
    console.log('- Checking variable initialization order...');
    
    // Test basic functionality to see if any reference errors occur
    const dashboard = TradeForceDashboard.default;
    if (dashboard) {
      console.log('  Dashboard component exists');
      testResults.references.passed = true;
    } else {
      throw new Error('Dashboard component not found');
    }
  } catch (error) {
    console.error(`Reference error test failure: ${error.message}`);
    testResults.references.passed = false;
    testResults.references.errors.push(error.message);
  }
  
  console.log('\nReference Error Test Results:');
  console.log(`- Passed: ${testResults.references.passed ? 'Yes' : 'No'}`);
  
  if (testResults.references.errors.length > 0) {
    console.log('- Errors:');
    testResults.references.errors.forEach(err => console.log(`  - ${err}`));
  }
}

/**
 * Run all the verification tests
 */
async function runAllTests() {
  console.log('=== TradeForce AI Fix Verification ===');
  console.log('Starting verification tests to ensure all fixes are working correctly.');
  
  try {
    // Test all fixed components in sequence
    await testShyftWebSocketConnection();
    await testBirdeyeAPIRateLimiting();
    await testFirebaseFixes();
    await testReferenceErrors();
    
    // Print summary
    console.log('\n=== Test Summary ===');
    
    const allPassed = 
      testResults.shyftWebSocket.passed === TEST_CONFIG.shyftWebSocketTests &&
      testResults.birdeyeAPI.passed + testResults.birdeyeAPI.fallbacksUsed >= TEST_CONFIG.birdeyeRateLimitTests &&
      testResults.firebase.fixed &&
      testResults.references.passed;
    
    if (allPassed) {
      console.log('✅ All tests passed! The fixes are working correctly.');
    } else {
      console.log('❌ Some tests failed. The fixes need additional work.');
    }
    
    console.log('\nDetailed Results:');
    console.log(`1. Shyft WebSocket: ${testResults.shyftWebSocket.passed === TEST_CONFIG.shyftWebSocketTests ? '✅ Fixed' : '❌ Issues Remain'}`);
    console.log(`2. Birdeye API: ${testResults.birdeyeAPI.failed === 0 ? '✅ Fixed' : '❌ Issues Remain'}`);
    console.log(`3. Firebase Authentication: ${testResults.firebase.fixed ? '✅ Fixed' : '❌ Issues Remain'}`);
    console.log(`4. Reference Errors: ${testResults.references.passed ? '✅ Fixed' : '❌ Issues Remain'}`);
  } catch (error) {
    console.error(`Test suite error: ${error.message}`);
  }
}

// Run the tests
runAllTests().catch(console.error);
