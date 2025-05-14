'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';
import { LAMPORTS_PER_SOL, Connection, clusterApiUrl } from '@solana/web3.js';
import logger from '../lib/logger';
import tradeExecutionService from '../lib/tradeExecutionService';

/**
 * PhantomWalletConnector Component
 * 
 * Enhanced wallet connector optimized for Phantom and Solflare Wallets.
 * Features:
 * - One-click wallet connection
 * - Automatic reconnection
 * - Real-time balance updates
 * - Transaction signing capability
 * - Multi-wallet support
 * - Detailed error handling
 * - Connection status monitoring
 */
const PhantomWalletConnector = ({ onWalletChange = () => {} }) => {
  // Get wallet from context
  const {
    publicKey,
    connected,
    connecting,
    disconnect,
    select,
    connect,
    wallet
  } = useWallet();
  
  // Component state
  const [balance, setBalance] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isReady, setIsReady] = useState(false);
  const [connectionAttempts, setConnectionAttempts] = useState(0);
  const [lastConnected, setLastConnected] = useState(null);
  const [availableWallets, setAvailableWallets] = useState([]);
  const [selectedWalletName, setSelectedWalletName] = useState('Phantom');
  
  // References
  const balanceIntervalRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const connectionTimeoutRef = useRef(null);
  const walletChangeTimeoutRef = useRef(null);
  const prevWalletStateRef = useRef({ connected: false, publicKey: null });
  
  // Debounced wallet change function to prevent too many updates
  const debouncedWalletChange = useCallback((walletInfo) => {
    if (walletChangeTimeoutRef.current) {
      clearTimeout(walletChangeTimeoutRef.current);
    }
    
    walletChangeTimeoutRef.current = setTimeout(() => {
      onWalletChange(walletInfo);
    }, 300); // Debounce for 300ms
  }, [onWalletChange]);
  
  // Create Devnet connection with better RPC options
  const connection = React.useMemo(() => 
    new Connection(
      clusterApiUrl(WalletAdapterNetwork.Devnet), 
      {
        commitment: 'confirmed',
        confirmTransactionInitialTimeout: 60000, // 60 seconds
        disableRetryOnRateLimit: false,
        fetch: fetch
      }
    ),
    []
  );

  // Detect available wallets
  const detectWallets = useCallback(() => {
    const detected = [];
    
    // Check for Phantom
    if (window?.phantom?.solana) {
      detected.push('Phantom');
    }
    
    // Check for Solflare
    if (window?.solflare?.isSolflare) {
      detected.push('Solflare');
    }
    
    setAvailableWallets(detected);
    
    // If previously selected wallet is not available, default to first available
    if (detected.length > 0 && !detected.includes(selectedWalletName)) {
      setSelectedWalletName(detected[0]);
    }
    
    return detected;
  }, [selectedWalletName]);

  // Ensure component is mounted before accessing wallet
  useEffect(() => {
    setIsReady(true);
    detectWallets();
    
    // Check for wallet changes
    const checkWalletInterval = setInterval(detectWallets, 3000);
    
    return () => {
      clearInterval(checkWalletInterval);
      
      // Clear any other intervals/timeouts
      if (balanceIntervalRef.current) clearInterval(balanceIntervalRef.current);
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (connectionTimeoutRef.current) clearTimeout(connectionTimeoutRef.current);
    };
  }, [detectWallets]);

  // Handle wallet selection
  const selectWallet = useCallback((walletName) => {
    try {
      if (!isReady) return;
      
      setSelectedWalletName(walletName);
      setError(null);
      
      // Create wallet adapter based on selection
      let walletAdapter;
      
      if (walletName === 'Phantom') {
        walletAdapter = new PhantomWalletAdapter();
      } else if (walletName === 'Solflare') {
        walletAdapter = new SolflareWalletAdapter();
      } else {
        throw new Error(`Unsupported wallet: ${walletName}`);
      }
      
      // Select wallet
      select(walletAdapter.name);
      
      logger.info(`${walletName} wallet selected`);
    } catch (error) {
      logger.error(`Error selecting ${selectedWalletName} wallet: ${error.message}`);
      setError(`Failed to select wallet: ${error.message}`);
    }
  }, [isReady, select, selectedWalletName]);

  // Connect to wallet with retry logic
  const connectWallet = async () => {
    try {
      setIsLoading(true);
      setError(null);
      setConnectionAttempts(prev => prev + 1);
      
      // Clear any existing connection timeout
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
      }
      
      // Set connection timeout (15 seconds)
      connectionTimeoutRef.current = setTimeout(() => {
        if (connecting && !connected) {
          logger.warn('Wallet connection timeout');
          setError('Connection timeout. Please try again.');
          setIsLoading(false);
        }
      }, 15000);
      
      // Select wallet if not already selected
      if (!wallet || wallet.adapter.name !== selectedWalletName) {
        selectWallet(selectedWalletName);
      }
      
      // Connect to wallet
      await connect();
      
      // Clear connection timeout
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
        connectionTimeoutRef.current = null;
      }
      
      setLastConnected(new Date().toISOString());
      logger.info(`Connected to ${selectedWalletName} wallet`);
    } catch (error) {
      logger.error(`Error connecting to ${selectedWalletName} wallet: ${error.message}`);
      
      // Provide more user-friendly error messages
      if (error.message.includes('User rejected')) {
        setError('Connection rejected. Please approve the connection request in your wallet.');
      } else if (error.message.includes('timeout')) {
        setError('Connection timeout. Please check if your wallet is unlocked and try again.');
      } else {
        setError(`Failed to connect: ${error.message}`);
      }
      
      // Clear connection timeout
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
        connectionTimeoutRef.current = null;
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Disconnect from wallet
  const disconnectWallet = async () => {
    try {
      // Clear any intervals
      if (balanceIntervalRef.current) {
        clearInterval(balanceIntervalRef.current);
        balanceIntervalRef.current = null;
      }
      
      await disconnect();
      logger.info(`Disconnected from ${selectedWalletName} wallet`);
    } catch (error) {
      logger.error(`Error disconnecting from wallet: ${error.message}`);
      setError(`Failed to disconnect: ${error.message}`);
    }
  };

  // Fetch wallet balance with error handling and caching
  const fetchBalance = useCallback(async () => {
    if (!connected || !publicKey || !connection) return;
    
    try {
      const walletBalance = await connection.getBalance(publicKey);
      const newBalance = walletBalance / LAMPORTS_PER_SOL;
        // Only update if balance has changed
      if (newBalance !== balance) {
        setBalance(newBalance);
        // Balance changes are now handled by the centralized effect
      }
    } catch (error) {
      logger.error(`Error fetching wallet balance: ${error.message}`);
      
      // Don't show error to user for balance fetch failures
      // Just retry on next interval
    }
  }, [connected, publicKey, connection, balance, onWalletChange]);

  // Set up balance polling when connected
  useEffect(() => {
    if (connected && publicKey) {
      // Fetch balance immediately
      fetchBalance();
      
      // Set up interval to refresh balance
      if (balanceIntervalRef.current) {
        clearInterval(balanceIntervalRef.current);
      }
      
      balanceIntervalRef.current = setInterval(fetchBalance, 15000); // Every 15 seconds
    } else {
      // Clear interval when disconnected
      if (balanceIntervalRef.current) {
        clearInterval(balanceIntervalRef.current);
        balanceIntervalRef.current = null;
      }
    }
    
    return () => {
      if (balanceIntervalRef.current) {
        clearInterval(balanceIntervalRef.current);
        balanceIntervalRef.current = null;
      }
    };  }, [connected, publicKey, fetchBalance]);
  
  // Create a centralized wallet state update handler
  useEffect(() => {
    // If not ready yet, don't update
    if (!isReady) return;

    // Only update if there's a real change in wallet state
    const isConnectionChange = connected !== prevWalletStateRef.current.connected;
    const isAddressChange = publicKey?.toString() !== prevWalletStateRef.current.publicKey;
    
    if (!isConnectionChange && !isAddressChange && balance === prevWalletStateRef.current.balance) {
      return; // No meaningful change
    }
    
    // Update our reference to current state
    prevWalletStateRef.current = { 
      connected, 
      publicKey: publicKey?.toString() || null,
      balance
    };
    
    // Build updated wallet info
    const walletInfo = {
      connected: !!connected,
      publicKey: publicKey ? publicKey.toString() : null,
      balance: connected ? balance : 0
    };
    
    // Use the debounced function to prevent too many updates
    debouncedWalletChange(walletInfo);
    
    // Update trade execution service for blockchain transactions
    if (connected && publicKey && wallet) {
      tradeExecutionService.setWallet({
        publicKey,
        signTransaction: async (transaction) => {
          if (!wallet || !wallet.adapter) {
            throw new Error('Wallet adapter not available');
          }
          return await wallet.adapter.signTransaction(transaction);
        },
        signAllTransactions: async (transactions) => {
          if (!wallet || !wallet.adapter) {
            throw new Error('Wallet adapter not available');
          }
          return await wallet.adapter.signAllTransactions(transactions);
        }
      });
    } else {
      tradeExecutionService.clearWallet();
    }
  }, [connected, publicKey, wallet, balance, isReady, debouncedWalletChange]);
  
  // Cleanup function for all intervals and timeouts
  useEffect(() => {
    return () => {
      if (balanceIntervalRef.current) clearInterval(balanceIntervalRef.current);
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (connectionTimeoutRef.current) clearTimeout(connectionTimeoutRef.current);
      if (walletChangeTimeoutRef.current) clearTimeout(walletChangeTimeoutRef.current);
    };
  }, []);
  
  // Format wallet address for display (e.g., "Gzf9...p8D5")
  const formatWalletAddress = (address) => {
    if (!address) return '';
    const addressStr = address.toString();
    return `${addressStr.substring(0, 4)}...${addressStr.substring(addressStr.length - 4)}`;
  };

  // Request DevNet SOL airdrop
  const requestAirdrop = async () => {
    if (!connected || !publicKey) {
      setError('Please connect your wallet first');
      return;
    }
    
    try {
      setIsLoading(true);
      
      // Request airdrop (2 SOL)
      const signature = await connection.requestAirdrop(
        publicKey, 
        2 * LAMPORTS_PER_SOL
      );
      
      // Confirm transaction
      await connection.confirmTransaction(signature, 'confirmed');
      
      logger.info(`Airdrop successful: ${signature}`);
      
      // Update wallet balance after short delay
      setTimeout(fetchBalance, 2000);
      
      setIsLoading(false);
    } catch (error) {
      logger.error(`Airdrop failed: ${error.message}`);
      setError(`Airdrop failed: ${error.message}`);
      setIsLoading(false);
    }
  };

  if (!isReady) {
    return <div className="px-4 py-2 bg-gray-600 rounded-md">Initializing...</div>;
  }

  return (
    <div className="phantom-wallet-connector">
      {/* Error display */}
      {error && (
        <div className="mb-4 px-4 py-3 bg-red-500/20 border border-red-500/50 rounded-md text-red-300 text-sm">
          <div className="flex items-start">
            <svg className="w-4 h-4 text-red-400 mt-0.5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <span>{error}</span>
          </div>
          <button 
            onClick={() => setError(null)} 
            className="mt-2 text-xs text-red-400 hover:text-red-300"
          >
            Dismiss
          </button>
        </div>
      )}
      
      {/* Wallet selection (when not connected) */}
      {!connected && availableWallets.length > 0 && (
        <div className="mb-4">
          <label className="block text-sm text-gray-400 mb-2">Select Wallet</label>
          <div className="flex space-x-2">
            {availableWallets.map(walletName => (
              <button
                key={walletName}
                onClick={() => selectWallet(walletName)}
                className={`px-3 py-2 rounded-md text-sm flex items-center ${
                  selectedWalletName === walletName 
                    ? 'bg-purple-600 text-white' 
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                <img 
                  src={`/images/${walletName.toLowerCase()}-icon.png`} 
                  alt={walletName} 
                  className="w-4 h-4 mr-2" 
                />
                {walletName}
              </button>
            ))}
          </div>
        </div>
      )}
      
      {/* Wallet connection status */}
      {!connected ? (
        <button
          onClick={connectWallet}
          disabled={isLoading || connecting || availableWallets.length === 0}
          className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-md text-white font-medium flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading || connecting ? (
            <>
              <div className="w-4 h-4 border-t-2 border-white border-solid rounded-full animate-spin mr-2"></div>
              Connecting...
            </>
          ) : availableWallets.length === 0 ? (
            <>
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
              </svg>
              No Wallet Detected
            </>
          ) : (
            <>
              <img 
                src={`/images/${selectedWalletName.toLowerCase()}-icon.png`} 
                alt={selectedWalletName} 
                className="w-5 h-5 mr-2" 
              />
              Connect {selectedWalletName} Wallet
            </>
          )}
        </button>
      ) : (
        <div className="connected-wallet">
          <div className="flex justify-between items-center bg-gray-800 p-3 rounded-md mb-3">
            <div className="flex items-center">
              <img 
                src={`/images/${wallet?.adapter?.name.toLowerCase()}-icon.png`} 
                alt={wallet?.adapter?.name} 
                className="w-5 h-5 mr-2" 
              />
              <span className="font-mono text-sm">{formatWalletAddress(publicKey)}</span>
            </div>
            <div className="flex items-center">
              <div className="bg-green-500 h-2 w-2 rounded-full mr-2"></div>
              <span className="text-xs text-gray-400">Connected</span>
            </div>
          </div>
          
          <div className="flex justify-between items-center bg-gray-700 p-3 rounded-md mb-3">
            <span>Balance:</span>
            <div className="font-mono">
              {isLoading ? (
                <span className="animate-pulse">Loading...</span>
              ) : (
                <>{balance.toFixed(4)} SOL</>
              )}
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-2 mb-3">
            <button
              onClick={requestAirdrop}
              disabled={isLoading}
              className="px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded-md text-sm transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-t-2 border-white border-solid rounded-full animate-spin"></div>
              ) : (
                <>
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                  </svg>
                  Request SOL
                </>
              )}
            </button>
            
            <button
              onClick={disconnectWallet}
              className="px-3 py-2 bg-red-600 hover:bg-red-700 rounded-md text-sm transition flex items-center justify-center"
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
              </svg>
              Disconnect
            </button>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="px-2 py-1 bg-purple-600 rounded text-xs">DevNet</div>
            <div className="text-xs text-gray-400">
              {connectionAttempts > 1 ? `${connectionAttempts} connections` : '1 connection'}
            </div>
          </div>
        </div>
      )}
      
      {/* No wallet detected message */}
      {!connected && availableWallets.length === 0 && (
        <div className="mt-4 text-sm text-yellow-400">
          <p>No compatible wallet detected. Please install one of the following:</p>
          <ul className="list-disc ml-5 mt-2">
            <li><a href="https://phantom.app/" target="_blank" rel="noopener noreferrer" className="underline">Phantom Wallet</a></li>
            <li><a href="https://solflare.com/" target="_blank" rel="noopener noreferrer" className="underline">Solflare Wallet</a></li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default PhantomWalletConnector;
