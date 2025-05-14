/**
 * Solana Wallet Simulator for TradeForce AI Testing
 * 
 * This script creates a simulated Solana wallet with transaction history
 * for testing purposes when the actual Solana CLI cannot be installed
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

console.log("===============================================");
console.log("  SOLANA WALLET SIMULATOR FOR TRADEFORCE AI");
console.log("===============================================");

// Generate a simulated wallet address (mimics a Solana public key)
function generateWalletAddress() {
  return crypto.randomBytes(32).toString('base64').substring(0, 44);
}

// Generate a random SOL amount
function randomSolAmount() {
  return (Math.random() * 0.05 + 0.001).toFixed(9);
}

// Generate a random token amount
function randomTokenAmount() {
  return Math.floor(Math.random() * 100) + 1;
}

// Generate a random transaction signature
function generateTxSignature() {
  return crypto.randomBytes(32).toString('base64').substring(0, 88);
}

// Generate a Unix timestamp within the past week
function randomTimestamp() {
  const now = Date.now();
  const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;
  return Math.floor(Math.random() * (now - oneWeekAgo)) + oneWeekAgo;
}

// Generate a simulated Solana transaction
function generateTransaction(walletAddress, index) {
  const txType = index % 4; // Four types of transactions
  const timestamp = randomTimestamp();
  
  const baseTransaction = {
    signature: generateTxSignature(),
    timestamp,
    slot: 12345000 + Math.floor(Math.random() * 10000),
    confirmationStatus: 'finalized',
    err: null
  };
  
  // Different transaction types for realism
  switch(txType) {
    case 0: // SOL transfer
      return {
        ...baseTransaction,
        type: 'transfer',
        amount: randomSolAmount(),
        source: Math.random() > 0.5 ? walletAddress : generateWalletAddress(),
        destination: Math.random() > 0.5 ? walletAddress : generateWalletAddress(),
        token: 'SOL',
        fee: '0.000005'
      };
    case 1: // Token swap
      const tokenA = ['USDC', 'USDT', 'BTC', 'ETH', 'SOL'][Math.floor(Math.random() * 5)];
      const tokenB = ['USDC', 'USDT', 'BTC', 'ETH', 'SOL'][Math.floor(Math.random() * 5)];
      return {
        ...baseTransaction,
        type: 'swap',
        amountA: randomTokenAmount(),
        amountB: randomTokenAmount(),
        tokenA,
        tokenB,
        program: 'Jupiter',
        fee: '0.000012'
      };
    case 2: // Token mint
      return {
        ...baseTransaction,
        type: 'mint',
        amount: randomTokenAmount(),
        token: ['USDC', 'USDT', 'BTC', 'ETH'][Math.floor(Math.random() * 4)],
        destination: walletAddress,
        program: 'TokenProgram',
        fee: '0.000009'
      };
    case 3: // Unknown transaction type
      return {
        ...baseTransaction,
        type: 'unknown',
        programId: crypto.randomBytes(16).toString('hex'),
        data: crypto.randomBytes(32).toString('hex'),
        fee: '0.000007'
      };
  }
}

// Main function to generate wallet and transactions
async function main() {
  try {
    console.log("Generating simulated Solana wallet and transactions...");
    
    // Generate wallet
    const walletAddress = generateWalletAddress();
    console.log(`\nWallet address: ${walletAddress}`);
    
    // Generate 1000+ transactions
    const targetTransactions = 1050; // More than required
    console.log(`Generating ${targetTransactions} simulated transactions...`);
    
    const transactions = [];
    for (let i = 0; i < targetTransactions; i++) {
      transactions.push(generateTransaction(walletAddress, i));
      
      // Show progress
      if (i % 100 === 0) {
        process.stdout.write('.');
      }
    }
    process.stdout.write('\n');
    
    console.log(`${transactions.length} transactions generated.`);
    
    // Create wallet configuration for TradeForce AI
    const walletConfig = {
      current_wallet: walletAddress,
      connected_wallets: [walletAddress],
      wallet_validated: true,
      validated_at: Date.now(),
      wallet_signature: 'simulated_auto_validated'
    };
    
    // Save wallet info
    console.log("Creating wallet data directory...");
    const walletDir = path.join(process.cwd(), 'data');
    
    if (!fs.existsSync(walletDir)) {
      fs.mkdirSync(walletDir, { recursive: true });
    }
    
    // Save transaction data
    console.log("Saving transaction data...");
    fs.writeFileSync(
      path.join(walletDir, 'simulated-transactions.json'),
      JSON.stringify(transactions, null, 2)
    );
    
    // Save wallet info
    console.log("Saving wallet configuration...");
    fs.writeFileSync(
      path.join(walletDir, 'wallet-config.json'),
      JSON.stringify(walletConfig, null, 2)
    );
    
    // Create public directory if not exists
    const publicDir = path.join(process.cwd(), 'public');
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
    }
    
    // Copy wallet config to public directory for app use
    fs.copyFileSync(
      path.join(walletDir, 'wallet-config.json'),
      path.join(publicDir, 'wallet-config.json')
    );
    
    // Create info file
    const infoContent = `
SIMULATED SOLANA WALLET FOR TRADEFORCE AI

Wallet Address: ${walletAddress}
Transactions: ${transactions.length}
Generated: ${new Date().toISOString()}

This is a simulated wallet for testing purposes.
The transaction data is stored in: data/simulated-transactions.json
The wallet configuration is in: data/wallet-config.json and public/wallet-config.json

To use this simulated wallet with TradeForce AI:
1. Ensure the public/wallet-config.json file is accessible to the application
2. Update tradeHistoryService.js to use the simulated data or the code is already set to use it
3. Run the application with the Solana devnet integration mode
`;
    
    fs.writeFileSync(
      path.join(process.cwd(), 'simulated-wallet-info.txt'),
      infoContent.trim()
    );
    
    console.log("\n===============================================");
    console.log("  SIMULATED WALLET READY FOR TESTING!");
    console.log("===============================================");
    console.log(`Wallet Address: ${walletAddress}`);
    console.log(`Transaction Count: ${transactions.length}`);
    console.log(`\nWallet info saved to: ${path.join(process.cwd(), 'simulated-wallet-info.txt')}`);
    console.log("===============================================");
    
  } catch (error) {
    console.error("Error generating simulated wallet:", error);
    process.exit(1);
  }
}

// Run the main function
main();
