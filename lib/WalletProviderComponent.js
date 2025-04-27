'use client';

import React, { useCallback, useMemo } from 'react';
import {
  ConnectionProvider,
  WalletProvider
} from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
  CoinbaseWalletAdapter,
  TorusWalletAdapter,
  AvanaWalletAdapter
} from '@solana/wallet-adapter-wallets';
import { 
  WalletModalProvider, 
  WalletMultiButton 
} from '@solana/wallet-adapter-react-ui';
import { clusterApiUrl } from '@solana/web3.js';

// Import wallet adapter CSS
import '@solana/wallet-adapter-react-ui/styles.css';

export function WalletProviderComponent({ children, network = WalletAdapterNetwork.Devnet }) {
  // The network can be set to 'mainnet-beta', 'testnet', or 'devnet'
  
  // The endpoint will be used to connect to the Solana network
  const endpoint = useMemo(() => clusterApiUrl(network), [network]);
  
  // Factory for generating supported wallet adapters
  const wallets = useMemo(() => [
    new PhantomWalletAdapter(),
    new SolflareWalletAdapter(),
    new AvanaWalletAdapter(),
    new CoinbaseWalletAdapter(),
    new TorusWalletAdapter()
  ], []);

  // Error handler for wallet connection issues
  const onError = useCallback(
    (error) => {
      console.error('Wallet connection error:', error);
      
      // Provide user-friendly error messages
      let errorMessage = 'Failed to connect wallet';
      
      if (error.name === 'WalletNotSelectedError') {
        errorMessage = 'Please select a wallet to connect';
      } else if (error.name === 'WalletNotReadyError') {
        errorMessage = 'Wallet is not ready or installed';
      } else if (error.name === 'WalletConnectionError') {
        errorMessage = 'Error connecting to wallet';
      } else if (error.name === 'WalletDisconnectedError') {
        errorMessage = 'Wallet disconnected';
      } else if (error.name === 'WalletTimeoutError') {
        errorMessage = 'Wallet connection timed out';
      }
      
      // You can integrate with your toast system here
      if (typeof window !== 'undefined' && window.toast) {
        window.toast.error(errorMessage);
      }
    },
    []
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect={false} onError={onError}>
        <WalletModalProvider>
          {children}
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
