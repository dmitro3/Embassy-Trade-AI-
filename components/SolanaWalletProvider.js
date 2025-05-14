// filepath: c:\Users\pablo\Projects\embassy-trade-motia\web\components\SolanaWalletProvider.js
'use client';

import React, { useMemo } from 'react';
import { 
  ConnectionProvider, 
  WalletProvider 
} from '@solana/wallet-adapter-react';
import { 
  PhantomWalletAdapter,
  SolflareWalletAdapter,
  BackpackWalletAdapter
} from '@solana/wallet-adapter-wallets';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { clusterApiUrl, Connection } from '@solana/web3.js';
import logger from '../lib/logger';

// Import wallet adapter styles
import '@solana/wallet-adapter-react-ui/styles.css';

/**
 * SolanaWalletProvider Component
 * 
 * Provides Solana wallet connection functionality for the application
 * Wraps children with necessary providers for wallet connectivity
 * Always uses DevNet for trading functionality
 */
const SolanaWalletProvider = ({ children, network = 'devnet' }) => {
  // Always use devnet for trading functionality
  const forcedNetwork = 'devnet';
  
  // Define Solana network endpoint based on network parameter
  const endpoint = useMemo(() => {
    // Log if network parameter is different from forced network
    if (network !== forcedNetwork) {
      logger.info(`Network parameter '${network}' overridden to '${forcedNetwork}' for trading functionality`);
    }
    
    // Use a more reliable RPC endpoint with higher rate limits for DevNet
    return 'https://api.devnet.solana.com';
  }, [network]);
  
  // Initialize wallet adapters with the most reliable options
  const wallets = useMemo(() => [
    new PhantomWalletAdapter(),
    new SolflareWalletAdapter(),
    new BackpackWalletAdapter()
  ], []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          {children}
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};

export default SolanaWalletProvider;
