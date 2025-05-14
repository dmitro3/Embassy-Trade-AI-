/**
 * Wallet Configuration for TradeForce AI
 * 
 * Real Solana integration with devnet support
 * Updated for improved blockchain data fetching
 */
export const WALLET_CONFIG = {
  // Connection settings
  networkEndpoint: 'https://api.devnet.solana.com',
  connectionConfig: {
    commitment: 'confirmed',
    maxSupportedTransactionVersion: 0
  },
  
  // Wallet validation
  requireSignature: true,
  minTransactions: 0, // No minimum requirement for testing
  validationMode: true,
  persistSignatures: true,
  
  // Data settings
  enableMockData: false, // Use real blockchain data only
  fetchLimit: 50,        // Limit transactions fetched per wallet
  refreshInterval: 60000, // 1 minute refresh interval
  
  // Performance
  logPerformanceMetrics: true,
  
  // Wallet support
  allowedWallets: ['Phantom', 'Solflare', 'Slope', 'Sollet', 'Backpack']
};
