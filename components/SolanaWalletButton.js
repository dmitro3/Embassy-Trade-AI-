'use client';

import React, { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { LAMPORTS_PER_SOL, Connection, clusterApiUrl } from '@solana/web3.js';
import logger from '../lib/logger';

/**
 * SolanaWalletButton Component
 * 
 * Enhanced wallet button component that displays connection status,
 * wallet address in truncated format, and SOL balance.
 * Always connects to DevNet for trading functionality.
 */
export function SolanaWalletButton({ 
  className = '', 
  showBalance = true,
  connection = null,
  onConnect = () => {},
  onDisconnect = () => {},
  showDevNetBadge = true
}) {
  const { 
    publicKey, 
    connected, 
    connecting, 
    disconnect,
    wallet
  } = useWallet();
  
  const [mounted, setMounted] = useState(false);
  const [balance, setBalance] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(0);

  // Create a default connection to DevNet if none provided
  const devnetConnection = React.useMemo(() => {
    if (!connection) {
      return new Connection('https://api.devnet.solana.com', 'confirmed');
    }
    return connection;
  }, [connection]);

  // Ensure component is mounted before rendering wallet UI
  // This prevents hydration errors with SSR
  useEffect(() => {
    setMounted(true);
  }, []);

  // Format wallet address for display (e.g., "Gzf9...p8D5")
  const formatWalletAddress = (address) => {
    if (!address) return '';
    const addressStr = address.toString();
    return `${addressStr.substring(0, 4)}...${addressStr.substring(addressStr.length - 4)}`;
  };

  // Fetch wallet balance when connected
  useEffect(() => {
    if (connected && publicKey && devnetConnection) {
      const fetchBalance = async () => {
        setIsLoading(true);
        try {
          const walletBalance = await devnetConnection.getBalance(publicKey);
          setBalance(walletBalance / LAMPORTS_PER_SOL);
          setLastRefresh(Date.now());
          logger.info(`Wallet balance updated: ${walletBalance / LAMPORTS_PER_SOL} SOL`);
        } catch (error) {
          logger.error(`Error fetching wallet balance: ${error.message}`);
          setBalance(0);
        } finally {
          setIsLoading(false);
        }
      };

      fetchBalance();
      
      // Set up interval to refresh balance every 30 seconds
      const intervalId = setInterval(fetchBalance, 30000);
      
      // Call onConnect callback
      onConnect(publicKey.toString());
      
      return () => clearInterval(intervalId);
    } else {
      setBalance(0);
    }
  }, [connected, publicKey, devnetConnection, onConnect]);

  // Handle disconnect
  useEffect(() => {
    if (!connected && mounted) {
      onDisconnect();
    }
  }, [connected, mounted, onDisconnect]);

  // Refresh balance on demand
  const refreshBalance = async () => {
    if (!connected || !publicKey || !devnetConnection) return;
    
    setIsLoading(true);
    try {
      const walletBalance = await devnetConnection.getBalance(publicKey);
      setBalance(walletBalance / LAMPORTS_PER_SOL);
      setLastRefresh(Date.now());
    } catch (error) {
      logger.error(`Error refreshing wallet balance: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  if (!mounted) return null;

  return (
    <div className={`wallet-adapter-container flex items-center ${className}`}>
      <WalletMultiButton 
        className="wallet-adapter-button-custom"
        style={{
          backgroundColor: connected ? '#4CAF50' : '#3B82F6',
          borderRadius: '0.375rem',
          padding: '0.5rem 1rem',
          fontSize: '0.875rem',
          fontWeight: '500',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          transition: 'background-color 0.2s ease',
          border: 'none',
          color: 'white'
        }}
      />
      
      {connected && (
        <div className="flex items-center ml-2">
          {showDevNetBadge && (
            <div className="px-2 py-1 bg-purple-600 rounded-md text-white text-xs mr-2">
              DevNet
            </div>
          )}
          
          <div className="wallet-address px-2 py-1 bg-gray-700 rounded-md text-white text-xs">
            {formatWalletAddress(publicKey)}
          </div>
          
          {showBalance && (
            <div 
              className="wallet-balance ml-2 px-3 py-1 bg-blue-800 rounded-md text-white text-sm flex items-center cursor-pointer"
              onClick={refreshBalance}
              title="Click to refresh balance"
            >
              {isLoading ? (
                <span className="inline-block animate-pulse">...</span>
              ) : (
                <>{balance.toFixed(4)} SOL</>
              )}
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                className={`h-3 w-3 ml-1 ${isLoading ? 'animate-spin' : ''}`} 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
