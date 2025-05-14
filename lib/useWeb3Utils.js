'use client';

import { useState, useEffect, useCallback } from 'react';
import { Connection, PublicKey } from '@solana/web3.js';
import { useWallet } from '@solana/wallet-adapter-react';

/**
 * Utility hook for Solana Web3 functionality
 * Provides network detection (mainnet/devnet/testnet), wallet balance, and faucet functionality
 */
const useWeb3Utils = () => {
  const { publicKey, connected } = useWallet();
  const [network, setNetwork] = useState('unknown');
  const [walletBalance, setWalletBalance] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Set up connections for different networks
  const connections = {
    mainnet: new Connection('https://api.mainnet-beta.solana.com'),
    devnet: new Connection('https://api.devnet.solana.com'),
    testnet: new Connection('https://api.testnet.solana.com')
  };

  // Function to detect wallet network
  const detectWalletNetwork = useCallback(async () => {
    if (!publicKey || !connected) {
      setNetwork('unknown');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Check mainnet first
      try {
        const mainnetBalance = await connections.mainnet.getBalance(publicKey);
        if (mainnetBalance !== undefined) {
          setNetwork('mainnet');
          setWalletBalance(mainnetBalance / 1_000_000_000);
          setIsLoading(false);
          return;
        }
      } catch (e) {
        console.log('Not mainnet, checking other networks...');
      }

      // Check devnet
      try {
        const devnetBalance = await connections.devnet.getBalance(publicKey);
        if (devnetBalance !== undefined) {
          setNetwork('devnet');
          setWalletBalance(devnetBalance / 1_000_000_000);
          setIsLoading(false);
          return;
        }
      } catch (e) {
        console.log('Not devnet, checking other networks...');
      }

      // Check testnet
      try {
        const testnetBalance = await connections.testnet.getBalance(publicKey);
        if (testnetBalance !== undefined) {
          setNetwork('testnet');
          setWalletBalance(testnetBalance / 1_000_000_000);
          setIsLoading(false);
          return;
        }
      } catch (e) {
        console.log('Not testnet either.');
      }

      // If we reach here, we couldn't determine the network
      setNetwork('unknown');
      setWalletBalance(null);
    } catch (error) {
      console.error('Error detecting wallet network:', error);
      setError(error.message);
      setNetwork('unknown');
      setWalletBalance(null);
    } finally {
      setIsLoading(false);
    }
  }, [publicKey, connected]);

  // Function to request SOL from devnet faucet
  const requestDevnetSol = useCallback(async () => {
    if (!publicKey || network !== 'devnet') {
      setError('Can only request SOL on devnet with a connected wallet');
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/faucet/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          wallet: publicKey.toString(),
          network: 'devnet',
          amount: 1 // 1 SOL
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        // Wait for transaction to confirm
        await new Promise(resolve => setTimeout(resolve, 2000));
        await detectWalletNetwork(); // Refresh balance
        return true;
      } else {
        throw new Error(data.message || 'Error requesting SOL from faucet');
      }
    } catch (error) {
      console.error('Faucet request error:', error);
      setError(error.message);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [publicKey, network, detectWalletNetwork]);

  // Detect network when wallet connection state changes
  useEffect(() => {
    if (connected && publicKey) {
      detectWalletNetwork();
    } else {
      setNetwork('unknown');
      setWalletBalance(null);
    }
  }, [connected, publicKey, detectWalletNetwork]);

  return {
    network,
    walletBalance,
    isLoading,
    error,
    detectWalletNetwork,
    requestDevnetSol,
    connections
  };
};

export default useWeb3Utils;
