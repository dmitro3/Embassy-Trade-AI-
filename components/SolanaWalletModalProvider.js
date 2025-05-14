'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  WalletAdapterNetwork,
  WalletError,
  WalletNotConnectedError 
} from '@solana/wallet-adapter-base';
import { 
  ConnectionProvider,
  WalletProvider,
  useWallet
} from '@solana/wallet-adapter-react';
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
  TorusWalletAdapter,
  LedgerWalletAdapter,
  // SolletWalletAdapter, // Removed - no longer supported
  // SolongWalletAdapter, // Removed - may cause compatibility issues
  // MathWalletAdapter  // Removed - may cause compatibility issues
} from '@solana/wallet-adapter-wallets';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { clusterApiUrl } from '@solana/web3.js';
import toast from 'react-hot-toast';

// Import wallet adapter styles
import '@solana/wallet-adapter-react-ui/styles.css';

/**
 * Component to provide comprehensive Solana wallet integration with modal support
 * Supports multiple networks and handles wallet connection errors
 */
const SolanaWalletModalProvider = ({
  children,
  network = WalletAdapterNetwork.Devnet, // Default to Devnet for paper trading
  autoConnect = true
}) => {
  const [networkError, setNetworkError] = useState(null);
    // Define wallet adapters for popular wallets
  const wallets = useMemo(() => [
    new PhantomWalletAdapter(),
    new SolflareWalletAdapter(),
    new TorusWalletAdapter(),
    new LedgerWalletAdapter()
    // Excluding removed/deprecated wallets and Backpack as requested
  ], []);
  
  // Define endpoints for different networks
  const endpoints = useMemo(() => ({
    [WalletAdapterNetwork.Mainnet]: clusterApiUrl(WalletAdapterNetwork.Mainnet),
    [WalletAdapterNetwork.Devnet]: clusterApiUrl(WalletAdapterNetwork.Devnet),
    [WalletAdapterNetwork.Testnet]: clusterApiUrl(WalletAdapterNetwork.Testnet),
  }), []);
  
  // Get the endpoint for the selected network
  const endpoint = useMemo(() => endpoints[network], [network, endpoints]);
  
  // React to network changes
  useEffect(() => {
    setNetworkError(null);
    console.log(`Connected to Solana ${network} network: ${endpoint}`);
  }, [network, endpoint]);
  
  // Handle wallet connection errors
  const onError = (error) => {
    console.error('Wallet connection error:', error);
    
    let message;
    if (error instanceof WalletNotConnectedError) {
      message = 'Please connect your wallet first';
    } else if (error instanceof WalletError) {
      message = error.message;
    } else {
      message = 'An unknown error occurred while connecting to your wallet';
    }
    
    toast.error(message);
    setNetworkError(message);
  };
  
  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect={autoConnect} onError={onError}>
        <WalletModalProvider>
          {networkError && (
            <div className="bg-red-500/20 text-red-400 px-4 py-2 rounded-md mb-4">
              Wallet Error: {networkError}
            </div>
          )}
          {children}
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};

/**
 * Hook to get the current wallet network (mainnet, devnet, testnet)
 */
export const useWalletNetwork = () => {
  const { publicKey, connected } = useWallet();
  const [currentNetwork, setCurrentNetwork] = useState(null);
  
  useEffect(() => {
    const detectNetwork = async () => {
      if (!connected || !publicKey) {
        setCurrentNetwork(null);
        return;
      }
      
      try {
        // Try to detect the network by checking the genesis hash
        // For demonstration purposes, defaulting to devnet for now
        setCurrentNetwork(WalletAdapterNetwork.Devnet);
      } catch (error) {
        console.error('Error detecting wallet network:', error);
        setCurrentNetwork(null);
      }
    };
    
    detectNetwork();
  }, [publicKey, connected]);
  
  return currentNetwork;
};

export default SolanaWalletModalProvider;
