// test-solana-wallet-connection.js
/**
 * Solana Wallet Connection Test Script for TradeForce AI
 * 
 * This script tests the connection to the Solana devnet and
 * verifies that transaction fetching is working correctly.
 */

const { Connection, PublicKey } = require('@solana/web3.js');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
// Constants
const SOLANA_DEVNET = 'https://api.devnet.solana.com';
const CONNECTION_CONFIG = {
  commitment: 'confirmed',
  maxSupportedTransactionVersion: 0
};

// Command line interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// ANSI color codes for output formatting
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  bright: '\x1b[1m'
};

/**
 * Test Solana connection
 * @returns {Promise<boolean>}
 */
async function testConnection() {
  console.log(`\n${colors.cyan}Testing Solana devnet connection...${colors.reset}`);
  
  try {
    const connection = new Connection(SOLANA_DEVNET, CONNECTION_CONFIG);
    const version = await connection.getVersion();
    
    console.log(`${colors.green}✓ Connected to Solana devnet${colors.reset}`);
    console.log(`${colors.blue}│ Solana Version: ${version['solana-core']}${colors.reset}`);
    console.log(`${colors.blue}│ Feature Set: ${version.featureSet || 'unknown'}${colors.reset}`);
    
    return { success: true, connection };
  } catch (error) {
    console.error(`${colors.red}✗ Failed to connect to Solana devnet: ${error.message}${colors.reset}`);
    return { success: false, error };
  }
}

/**
 * Fetch recent transactions for a wallet
 * @param {Connection} connection - Solana connection
 * @param {string} walletAddress - Solana wallet address
 * @returns {Promise<Array>} - Array of transactions
 */
async function fetchTransactions(connection, walletAddress) {
  console.log(`\n${colors.cyan}Fetching transactions for wallet: ${walletAddress}...${colors.reset}`);
  
  try {
    // Validate public key
    const pubKey = new PublicKey(walletAddress);
    
    // Fetch recent transaction signatures
    console.log(`${colors.yellow}Fetching recent signatures...${colors.reset}`);
    const signatures = await connection.getSignaturesForAddress(pubKey, { limit: 10 });
    
    if (!signatures || signatures.length === 0) {
      console.log(`${colors.yellow}No transactions found for this wallet on devnet${colors.reset}`);
      return { success: true, transactions: [] };
    }
    
    console.log(`${colors.green}✓ Found ${signatures.length} transactions${colors.reset}`);
    
    // Fetch transaction details
    console.log(`${colors.yellow}Fetching transaction details...${colors.reset}`);
    const transactions = [];
    
    for (let i = 0; i < signatures.length; i++) {
      const sig = signatures[i];
      try {
        console.log(`${colors.blue}│ Processing transaction ${i+1}/${signatures.length}...${colors.reset}`);
        
        const txData = await connection.getParsedTransaction(
          sig.signature,
          { maxSupportedTransactionVersion: 0 }
        );
        
        if (txData) {
          const timestamp = sig.blockTime ? new Date(sig.blockTime * 1000).toLocaleString() : 'Unknown';
          const status = txData.meta?.err ? 'Failed' : 'Success';
          
          transactions.push({
            signature: sig.signature,
            timestamp,
            status,
            instructionCount: txData.transaction.message.instructions.length,
            raw: txData
          });
          
          console.log(`${colors.green}│ ✓ ${sig.signature.substr(0, 8)}... | ${timestamp} | ${status}${colors.reset}`);
        } else {
          console.log(`${colors.yellow}│ ! No data for transaction ${sig.signature.substr(0, 8)}...${colors.reset}`);
        }
      } catch (error) {
        console.error(`${colors.red}│ ✗ Failed to fetch transaction ${sig.signature.substr(0, 8)}...: ${error.message}${colors.reset}`);
      }
    }
    
    console.log(`${colors.green}✓ Successfully processed ${transactions.length}/${signatures.length} transactions${colors.reset}`);
    return { success: true, transactions };
    
  } catch (error) {
    console.error(`${colors.red}✗ Failed to fetch transactions: ${error.message}${colors.reset}`);
    return { success: false, error };
  }
}

/**
 * Analyze transactions for trade activity
 * @param {Array} transactions - Array of transactions
 * @returns {Object} - Analysis results
 */
function analyzeTransactions(transactions) {
  console.log(`\n${colors.cyan}Analyzing transactions for trade activity...${colors.reset}`);
  
  const analysis = {
    totalTransactions: transactions.length,
    successful: 0,
    failed: 0,
    potentialTrades: 0,
    tokenTransfers: 0
  };
  
  try {
    transactions.forEach(tx => {
      // Count successful vs failed
      if (tx.status === 'Success') {
        analysis.successful++;
      } else {
        analysis.failed++;
      }
      
      // Check for token program interactions (potential trades or transfers)
      const tokenProgramInteraction = tx.raw.transaction.message.instructions.some(
        instruction => instruction.programId?.toString() === 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'
      );
      
      if (tokenProgramInteraction) {
        analysis.tokenTransfers++;
        
        // Check if this might be a swap/trade (multiple token transfers)
        const tokenBalanceChanges = (tx.raw.meta?.preTokenBalances || []).length + 
                                  (tx.raw.meta?.postTokenBalances || []).length;
        
        if (tokenBalanceChanges >= 4) { // If at least 2 tokens involved (pre+post for each)
          analysis.potentialTrades++;
        }
      }
    });
    
    console.log(`${colors.green}✓ Analysis complete${colors.reset}`);
    console.log(`${colors.blue}│ Total transactions: ${analysis.totalTransactions}${colors.reset}`);
    console.log(`${colors.blue}│ Successful: ${analysis.successful}${colors.reset}`);
    console.log(`${colors.blue}│ Failed: ${analysis.failed}${colors.reset}`);
    console.log(`${colors.blue}│ Token transfers: ${analysis.tokenTransfers}${colors.reset}`);
    console.log(`${colors.blue}│ Potential trades: ${analysis.potentialTrades}${colors.reset}`);
    
    return { success: true, analysis };
    
  } catch (error) {
    console.error(`${colors.red}✗ Failed to analyze transactions: ${error.message}${colors.reset}`);
    return { success: false, error };
  }
}

/**
 * Save wallet to local storage file for testing
 * @param {string} walletAddress - Wallet address to save
 */
function saveWalletToLocalStorage(walletAddress) {
  const localStoragePath = path.join(__dirname, 'localStorage.json');
  let data = {};
  
  try {
    // Read existing data if file exists
    if (fs.existsSync(localStoragePath)) {
      data = JSON.parse(fs.readFileSync(localStoragePath, 'utf8'));
    }
    
    // Update with wallet info
    data.wallet_address = walletAddress;
    data.wallet_validated = 'true';
    data.connected_wallets = JSON.stringify([walletAddress]);
    
    // Write back to file
    fs.writeFileSync(localStoragePath, JSON.stringify(data, null, 2));
    
    console.log(`\n${colors.green}✓ Wallet saved for testing${colors.reset}`);
    console.log(`${colors.yellow}Note: Run the app with localStorage debugging enabled to use this file${colors.reset}`);
  } catch (error) {
    console.error(`${colors.red}✗ Failed to save wallet info: ${error.message}${colors.reset}`);
  }
}

/**
 * Main function to run the test
 */
async function main() {
  console.log(`\n${colors.bright}${colors.magenta}=== TradeForce AI - Solana Wallet Connection Test ===\n${colors.reset}`);
  
  // Test Solana connection
  const connectionResult = await testConnection();
  if (!connectionResult.success) {
    console.error(`\n${colors.red}Connection test failed. Please check your internet connection and try again.${colors.reset}`);
    process.exit(1);
  }
  
  // Prompt for wallet address
  rl.question(`\n${colors.yellow}Enter your Solana wallet address: ${colors.reset}`, async (walletAddress) => {
    // Validate wallet address format
    let isValid = false;
    try {
      new PublicKey(walletAddress);
      isValid = true;
    } catch (error) {
      console.error(`\n${colors.red}Invalid wallet address format. Please check and try again.${colors.reset}`);
      rl.close();
      return;
    }
    
    if (isValid) {
      // Fetch transactions
      const txResult = await fetchTransactions(connectionResult.connection, walletAddress);
      
      if (txResult.success && txResult.transactions.length > 0) {
        // Analyze transactions
        const analysisResult = analyzeTransactions(txResult.transactions);
        
        if (analysisResult.success) {
          // Check if this wallet is suitable for the application
          const suitability = 
            analysisResult.analysis.potentialTrades > 0 ? 'Excellent' :
            analysisResult.analysis.tokenTransfers > 0 ? 'Good' :
            analysisResult.analysis.totalTransactions > 0 ? 'Fair' :
            'Poor';
          
          console.log(`\n${colors.cyan}Wallet Integration Suitability: ${
            suitability === 'Excellent' ? colors.green + 'Excellent' :
            suitability === 'Good' ? colors.bright + colors.blue + 'Good' :
            suitability === 'Fair' ? colors.yellow + 'Fair' :
            colors.red + 'Poor'
          }${colors.reset}`);
          
          if (txResult.transactions.length > 0) {
            console.log(`\n${colors.yellow}Would you like to save this wallet for testing? (y/n)${colors.reset}`);
            rl.question('', (answer) => {
              if (answer.toLowerCase() === 'y') {
                saveWalletToLocalStorage(walletAddress);
              }
              
              console.log(`\n${colors.bright}${colors.green}Test completed successfully!${colors.reset}`);
              rl.close();
            });
          } else {
            console.log(`\n${colors.bright}${colors.green}Test completed successfully!${colors.reset}`);
            rl.close();
          }
        } else {
          console.log(`\n${colors.bright}${colors.yellow}Test completed with some issues.${colors.reset}`);
          rl.close();
        }
      } else {
        console.log(`\n${colors.yellow}This wallet has no transactions on Solana devnet.${colors.reset}`);
        console.log(`${colors.yellow}To use this wallet with TradeForce AI:${colors.reset}`);
        console.log(`${colors.yellow}1. Make sure it has some SOL (use a faucet)${colors.reset}`);
        console.log(`${colors.yellow}2. Perform some token swaps on devnet${colors.reset}`);
        console.log(`${colors.yellow}3. Run this test again${colors.reset}`);
        
        rl.close();
      }
    }
  });
}

// Run the test
main().catch(error => {
  console.error(`${colors.red}Unhandled error: ${error}${colors.reset}`);
  process.exit(1);
});
