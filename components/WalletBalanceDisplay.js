'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { Connection, LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
import toast from 'react-hot-toast';

/**
 * Component to display wallet details including network, address, and balance
 * Also includes functionality for requesting airdrop for paper trading
 */
const WalletBalanceDisplay = ({ className = '' }) => {
  const { connection } = useConnection();
  const { publicKey, connected } = useWallet();
  const [balance, setBalance] = useState(null);
  const [network, setNetwork] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  
  // Detect the current network based on connection
  const detectNetwork = useCallback(async () => {
    if (!connected || !publicKey || !connection) return;
    
    try {
      // Get genesis hash to determine network
      const genesisHash = await connection.getGenesisHash();
      
      switch (genesisHash) {
        case '5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d':
          setNetwork(WalletAdapterNetwork.Mainnet);
          break;
        case 'EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG':
          setNetwork(WalletAdapterNetwork.Devnet);
          break;
        case '4uhcVJyU9pJkvQyS88uRDiswHXSCkY3zQawwpjk2NsNY':
          setNetwork(WalletAdapterNetwork.Testnet);
          break;
        default:
          setNetwork('unknown');
      }
    } catch (error) {
      console.error('Error detecting network:', error);
      setNetwork('unknown');
    }
  }, [connection, publicKey, connected]);
  
  // Get wallet balance
  const fetchBalance = useCallback(async () => {
    if (!connected || !publicKey || !connection) {
      setBalance(null);
      return;
    }
    
    try {
      setIsLoading(true);
      const walletBalance = await connection.getBalance(publicKey);
      setBalance(walletBalance / LAMPORTS_PER_SOL);
    } catch (error) {
      console.error('Error fetching balance:', error);
      toast.error('Failed to fetch wallet balance');
      setBalance(null);
    } finally {
      setIsLoading(false);
    }
  }, [connection, publicKey, connected]);
  
  // Request airdrop for paper trading (only on devnet/testnet)
  const requestAirdrop = async (amount = 1) => {
    if (!connected || !publicKey || !connection) {
      toast.error('Please connect your wallet first');
      return;
    }
    
    if (network === WalletAdapterNetwork.Mainnet) {
      toast.error('Airdrops are only available on devnet and testnet');
      return;
    }
    
    try {
      setIsLoading(true);
      const signature = await connection.requestAirdrop(publicKey, amount * LAMPORTS_PER_SOL);
      await connection.confirmTransaction(signature);
      toast.success(`Successfully airdropped ${amount} SOL for paper trading`);
      fetchBalance(); // Refresh balance
    } catch (error) {
      console.error('Airdrop error:', error);
      toast.error('Failed to request SOL airdrop');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Update balance and network when wallet connection changes
  useEffect(() => {
    if (connected) {
      detectNetwork();
      fetchBalance();
      
      // Poll for balance updates
      const interval = setInterval(fetchBalance, 30000); // Every 30 seconds
      return () => clearInterval(interval);
    } else {
      setBalance(null);
      setNetwork(null);
    }
  }, [connected, publicKey, connection, detectNetwork, fetchBalance]);
  
  // Format public key for display
  const formatPublicKey = (key) => {
    if (!key) return '';
    const keyStr = key.toString();
    return `${keyStr.slice(0, 4)}...${keyStr.slice(-4)}`;
  };
  
  return (
    <div className={`wallet-balance-display ${className}`}>
      {connected ? (
        <div className="bg-gray-800 rounded-lg p-3 relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {/* Network Indicator */}
              <div className="flex items-center">
                <span className={`w-2 h-2 rounded-full mr-2 ${
                  network === WalletAdapterNetwork.Mainnet ? 'bg-blue-500' :
                  network === WalletAdapterNetwork.Devnet ? 'bg-green-500' :
                  network === WalletAdapterNetwork.Testnet ? 'bg-yellow-500' :
                  'bg-gray-500'
                }`}></span>
                <span className="text-sm font-medium text-gray-300 capitalize">
                  {network || 'unknown'}
                </span>
              </div>
              
              <span className="text-gray-500 px-1">|</span>
              
              {/* Wallet Address */}
              <div className="text-sm text-gray-300">
                {formatPublicKey(publicKey)}
              </div>
            </div>
            
            {/* Balance Display */}
            <div 
              className="flex items-center cursor-pointer"
              onClick={() => setShowDropdown(!showDropdown)}
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mr-2"></div>
              ) : null}
              <div className="font-mono font-medium">
                {balance !== null ? `${balance.toFixed(4)} SOL` : '-- SOL'}
              </div>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
          
          {/* Dropdown for airdrop options */}
          {showDropdown && (network === WalletAdapterNetwork.Devnet || network === WalletAdapterNetwork.Testnet) && (
            <div className="absolute right-0 mt-2 w-48 bg-gray-800 border border-gray-700 rounded-md shadow-lg z-10">
              <div className="p-2">
                <p className="text-xs text-gray-400 mb-2">Request test SOL for paper trading</p>
                <div className="flex flex-col space-y-1">
                  <button 
                    onClick={() => {
                      requestAirdrop(1);
                      setShowDropdown(false);
                    }}
                    className="text-left px-3 py-2 text-sm rounded hover:bg-gray-700"
                  >
                    Request 1 SOL
                  </button>
                  <button 
                    onClick={() => {
                      requestAirdrop(2);
                      setShowDropdown(false);
                    }}
                    className="text-left px-3 py-2 text-sm rounded hover:bg-gray-700"
                  >
                    Request 2 SOL
                  </button>
                  <button 
                    onClick={() => {
                      requestAirdrop(5);
                      setShowDropdown(false);
                    }}
                    className="text-left px-3 py-2 text-sm rounded hover:bg-gray-700"
                  >
                    Request 5 SOL
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-gray-800 rounded-lg p-3 text-gray-400 text-sm">
          Not connected
        </div>
      )}
    </div>
  );
};

export default WalletBalanceDisplay;
