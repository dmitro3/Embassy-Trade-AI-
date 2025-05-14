/**
 * Verify Wallet Configuration Script
 * 
 * This script checks if the wallet configuration is properly set up for
 * real Solana blockchain data integration.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Paths to check
const walletConfigPath = path.join(__dirname, 'lib', 'walletConfig.js');
const tradeHistoryPath = path.join(__dirname, 'lib', 'tradeHistoryService.js');
const validateWalletPath = path.join(__dirname, 'lib', 'validateWalletSignature.js');

// ANSI color codes for output formatting
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bgGreen: '\x1b[42m',
  bgRed: '\x1b[41m',
  bright: '\x1b[1m'
};

console.log(`${colors.bright}${colors.cyan}=== TradeForce AI Solana Integration Verification ===\n${colors.reset}`);

// Check wallet configuration
function checkWalletConfig() {
  console.log(`${colors.bright}Checking wallet configuration...${colors.reset}`);
  
  try {
    if (!fs.existsSync(walletConfigPath)) {
      console.error(`${colors.red}✗ Wallet configuration file not found!${colors.reset}`);
      return false;
    }
    
    const content = fs.readFileSync(walletConfigPath, 'utf8');
    
    const checks = {
      'Using Devnet endpoint': content.includes('devnet.solana.com'),
      'Mock data disabled': content.includes('enableMockData: false'),
      'Signature validation enabled': content.includes('requireSignature: true'),
      'Zero minimum transactions': content.includes('minTransactions: 0'),
      'Performance metrics enabled': content.includes('logPerformanceMetrics: true'),
    };
    
    let passed = true;
    Object.entries(checks).forEach(([check, result]) => {
      if (result) {
        console.log(`${colors.green}✓ ${check}${colors.reset}`);
      } else {
        console.log(`${colors.red}✗ ${check}${colors.reset}`);
        passed = false;
      }
    });
    
    return passed;
  } catch (error) {
    console.error(`${colors.red}Error checking wallet configuration: ${error.message}${colors.reset}`);
    return false;
  }
}

// Check trade history service
function checkTradeHistoryService() {
  console.log(`\n${colors.bright}Checking trade history service...${colors.reset}`);
  
  try {
    if (!fs.existsSync(tradeHistoryPath)) {
      console.error(`${colors.red}✗ Trade history service file not found!${colors.reset}`);
      return false;
    }
    
    const content = fs.readFileSync(tradeHistoryPath, 'utf8');
    
    const checks = {
      'Imports wallet config': content.includes('import { WALLET_CONFIG }') || content.includes("require('./walletConfig')"),
      'Connects to Solana': content.includes('new Connection('),
      'Fetches real transactions': content.includes('fetchSolanaTrades') && content.includes('getSignaturesForAddress'),
      'Handles wallet validation': content.includes('wallet_validated') || content.includes('getConnectedWallets'),
    };
    
    let passed = true;
    Object.entries(checks).forEach(([check, result]) => {
      if (result) {
        console.log(`${colors.green}✓ ${check}${colors.reset}`);
      } else {
        console.log(`${colors.red}✗ ${check}${colors.reset}`);
        passed = false;
      }
    });
    
    return passed;
  } catch (error) {
    console.error(`${colors.red}Error checking trade history service: ${error.message}${colors.reset}`);
    return false;
  }
}

// Check wallet validation
function checkWalletValidation() {
  console.log(`\n${colors.bright}Checking wallet validation...${colors.reset}`);
  
  try {
    if (!fs.existsSync(validateWalletPath)) {
      console.error(`${colors.red}✗ Wallet validation file not found!${colors.reset}`);
      return false;
    }
    
    const content = fs.readFileSync(validateWalletPath, 'utf8');
    
    const checks = {
      'Imports wallet config': content.includes('import { WALLET_CONFIG }') || content.includes("require('./walletConfig')"),
      'Validates wallet signatures': content.includes('validateWalletSignature'),
      'Checks public key format': content.includes('PublicKey') && content.includes('isOnCurve'),
      'Persistence for validation': content.includes('persistWalletValidation')
    };
    
    let passed = true;
    Object.entries(checks).forEach(([check, result]) => {
      if (result) {
        console.log(`${colors.green}✓ ${check}${colors.reset}`);
      } else {
        console.log(`${colors.red}✗ ${check}${colors.reset}`);
        passed = false;
      }
    });
    
    return passed;
  } catch (error) {
    console.error(`${colors.red}Error checking wallet validation: ${error.message}${colors.reset}`);
    return false;
  }
}

// Check for port conflicts
function checkPortConflicts() {
  console.log(`\n${colors.bright}Checking for port conflicts...${colors.reset}`);
  
  try {
    // Check if port 3008 is in use
    const command = 'netstat -ano | findstr ":3008" | findstr "LISTENING"';
    let isPortUsed = false;
    
    try {
      const result = execSync(command).toString();
      if (result.trim()) {
        isPortUsed = true;
        const pid = result.trim().split(/\s+/).pop();
        console.log(`${colors.yellow}! Port 3008 is in use by process ${pid}${colors.reset}`);
      }
    } catch (e) {
      // If the command fails, it means the port is not in use, which is good
    }
    
    if (!isPortUsed) {
      console.log(`${colors.green}✓ Port 3008 is available${colors.reset}`);
      return true;
    } else {
      console.log(`${colors.yellow}! Run fix-port-conflicts.bat or Fix-PortConflicts.ps1 to resolve port conflicts${colors.reset}`);
      return false;
    }
  } catch (error) {
    console.error(`${colors.red}Error checking port conflicts: ${error.message}${colors.reset}`);
    return false;
  }
}

// Run all checks
function runChecks() {
  const walletConfigOk = checkWalletConfig();
  const tradeHistoryOk = checkTradeHistoryService();
  const walletValidationOk = checkWalletValidation();
  const portOk = checkPortConflicts();
  
  console.log(`\n${colors.bright}=== Summary ===\n${colors.reset}`);
  console.log(`Wallet Configuration: ${walletConfigOk ? colors.green + '✓ PASS' : colors.red + '✗ FAIL'}${colors.reset}`);
  console.log(`Trade History Service: ${tradeHistoryOk ? colors.green + '✓ PASS' : colors.red + '✗ FAIL'}${colors.reset}`);
  console.log(`Wallet Validation: ${walletValidationOk ? colors.green + '✓ PASS' : colors.red + '✗ FAIL'}${colors.reset}`);
  console.log(`Port Availability: ${portOk ? colors.green + '✓ PASS' : colors.yellow + '! WARNING'}${colors.reset}`);
  
  if (walletConfigOk && tradeHistoryOk && walletValidationOk) {
    console.log(`\n${colors.bgGreen}${colors.bright} SUCCESS: TradeForce AI is properly configured for real Solana data! ${colors.reset}`);
    return true;
  } else {
    console.log(`\n${colors.bgRed}${colors.bright} ISSUE: Some configuration problems need to be fixed ${colors.reset}`);
    return false;
  }
}

// Execute all checks
runChecks();

// Export for use in other scripts
module.exports = { runChecks };
