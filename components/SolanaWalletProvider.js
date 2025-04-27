// filepath: c:\Users\pablo\Projects\embassy-trade-motia\web\components\SolanaWalletProvider.js
'use client';

import React, { useMemo } from 'react';
import { 
  ConnectionProvider, 
  WalletProvider 
} from '@solana/wallet-adapter-react';
import { 
  PhantomWalletAdapter,
  SolflareWalletAdapter
} from '@solana/wallet-adapter-wallets';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { clusterApiUrl } from '@solana/web3.js';

// Import wallet adapter styles
import '@solana/wallet-adapter-react-ui/styles.css';

/**
 * SolanaWalletProvider Component
 * 
 * Provides Solana wallet connection functionality for the application
 * Wraps children with necessary providers for wallet connectivity
 */
const SolanaWalletProvider = ({ children, network = 'devnet' }) => {
  // Define Solana network endpoint based on network parameter
  const endpoint = useMemo(() => {
    switch (network) {
      case 'mainnet':
        return 'https://api.mainnet-beta.solana.com';
      case 'testnet':
        return clusterApiUrl('testnet');
      case 'devnet':
      default:
        return clusterApiUrl('devnet');
    }  }, [network]);
  
  // Initialize wallet adapters with only the most reliable options
  const wallets = useMemo(() => [
    new PhantomWalletAdapter(),
    new SolflareWalletAdapter()
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
