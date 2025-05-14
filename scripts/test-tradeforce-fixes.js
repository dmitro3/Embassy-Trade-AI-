#!/usr/bin/env node

/**
 * Test Runner Script for TradeForce AI
 * 
 * This script runs targeted tests for the most recently fixed components
 * to verify that they're working correctly.
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get directory name in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const testConfig = {
  // Components with specific tests
  components: [
    'PhantomWalletConnector',
    'enhancedShyftWebSocket',
    'useOfflineMode',
  ],
  
  // Files that need coverage testing
  coverageFiles: [
    'components/PhantomWalletConnector.js',
    'lib/enhancedShyftWebSocket.js',
    'hooks/useOfflineMode.js',
    'components/OfflineStatusIndicator.js',
  ],
  
  // Integration test files
  integrationTests: [
    'tests/integration/wallet-connection.test.js',
    'tests/integration/websocket-stability.test.js',
  ],
  
  // Test timeout in milliseconds
  timeout: 30000,
};

console.log('🧪 Running TradeForce AI Test Suite');
console.log('====================================');

// Helper to run command with proper error handling
function runCommand(command, description) {
  console.log(`\n🚀 ${description}...\n`);
  try {
    execSync(command, { stdio: 'inherit' });
    return true;
  } catch (error) {
    console.error(`❌ ${description} failed!`);
    return false;
  }
}

// Step 1: Unit tests for specific components
console.log('\n📋 Running component tests for recent fixes:\n');

let componentsSucceeded = true;
for (const component of testConfig.components) {
  componentsSucceeded = runCommand(
    `npx jest --testMatch="**/${component}*test*" --forceExit --detectOpenHandles`,
    `Testing ${component}`
  ) && componentsSucceeded;
}

// Step 2: Check test coverage for specific files
console.log('\n📊 Checking test coverage for critical files:\n');

const coveragePattern = testConfig.coverageFiles.map(file => `"web/${file}"`).join(' ');
const coverageSucceeded = runCommand(
  `npx jest --coverage --collectCoverageFrom=${coveragePattern} --forceExit --detectOpenHandles`,
  `Checking test coverage`
);

// Step 3: Integration tests
console.log('\n🔄 Running integration tests:\n');

let integrationSucceeded = true;
for (const testFile of testConfig.integrationTests) {
  if (fs.existsSync(path.join(process.cwd(), testFile))) {
    integrationSucceeded = runCommand(
      `npx jest ${testFile} --forceExit --detectOpenHandles`,
      `Running ${testFile}`
    ) && integrationSucceeded;
  } else {
    console.log(`⚠️ Integration test file not found: ${testFile} (skipping)`);
  }
}

// Step 4: End-to-end test (if available)
console.log('\n🌐 Running E2E tests for TradeForce AI:\n');

const e2eSuccess = runCommand(
  `npx cypress run --spec "cypress/e2e/tradeforce-ai/**/*.cy.js"`,
  `Running E2E tests`
);

// Print summary
console.log('\n📝 Test Summary:');
console.log('================');
console.log(`Component Tests: ${componentsSucceeded ? '✅ Passed' : '❌ Failed'}`);
console.log(`Coverage Checks: ${coverageSucceeded ? '✅ Passed' : '❌ Failed'}`);
console.log(`Integration Tests: ${integrationSucceeded ? '✅ Passed' : '❌ Failed'}`);
console.log(`E2E Tests: ${e2eSuccess ? '✅ Passed' : '❌ Failed'}`);

// Overall result
const allSucceeded = componentsSucceeded && coverageSucceeded && integrationSucceeded && e2eSuccess;
console.log(`\nOverall Result: ${allSucceeded ? '✅ All tests passed!' : '❌ Some tests failed!'}\n`);

// Exit with proper code
process.exit(allSucceeded ? 0 : 1);
