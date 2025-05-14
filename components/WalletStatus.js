// WalletStatus.js - TradeForce AI wallet connection status component
'use client';

import React, { useState, useEffect } from 'react';
import { FaCheckCircle, FaExclamationTriangle, FaWallet, FaSync } from 'react-icons/fa';
import { WALLET_CONFIG } from '../lib/walletConfig';

/**
 * WalletStatus Component
 * 
 * Displays wallet connection status for TradeForce AI Solana integration
 * Shows validation status, network, and connection details
 */
const WalletStatus = ({ onRefresh }) => {
  const [status, setStatus] = useState({
    isConnected: false,
    address: null,
    isValidated: false,
    network: null,
    lastRefresh: null,
    errorMsg: null,
  });
  
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Check wallet status on mount and when visibility changes
  useEffect(() => {
    checkWalletStatus();
    
    // Add visibility change listener to refresh wallet status when tab becomes visible
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkWalletStatus();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Clean up
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);
  
  // Check wallet connection status
  const checkWalletStatus = () => {
    try {
      let walletAddress = null;
      let isValidated = false;
      
      // Check for validated wallet in localStorage
      if (typeof window !== 'undefined' && window.localStorage) {
        walletAddress = window.localStorage.getItem('wallet_address');
        isValidated = window.localStorage.getItem('wallet_validated') === 'true';
        
        // If no validated wallet, check for connected wallets
        if (!walletAddress) {
          const connectedWallets = window.localStorage.getItem('connected_wallets');
          if (connectedWallets) {
            try {
              const wallets = JSON.parse(connectedWallets);
              if (Array.isArray(wallets) && wallets.length > 0) {
                // Use first connected wallet
                walletAddress = wallets[0];
              }
            } catch (e) {
              console.error('Failed to parse connected wallets', e);
            }
          }
        }
      }
      
      // Detect network (based on endpoint in WALLET_CONFIG)
      let network = 'unknown';
      if (WALLET_CONFIG.networkEndpoint) {
        if (WALLET_CONFIG.networkEndpoint.includes('devnet')) {
          network = 'devnet';
        } else if (WALLET_CONFIG.networkEndpoint.includes('mainnet')) {
          network = 'mainnet';
        } else if (WALLET_CONFIG.networkEndpoint.includes('testnet')) {
          network = 'testnet';
        }
      }
      
      setStatus({
        isConnected: !!walletAddress,
        address: walletAddress,
        isValidated,
        network,
        lastRefresh: new Date(),
        errorMsg: null,
      });
    } catch (error) {
      console.error('Error checking wallet status:', error);
      setStatus(prev => ({
        ...prev,
        errorMsg: error.message,
        lastRefresh: new Date()
      }));
    }
  };
  
  // Handle refresh button click
  const handleRefresh = async () => {
    if (isRefreshing) return;
    
    setIsRefreshing(true);
    try {
      // Re-check wallet status
      checkWalletStatus();
      
      // Call parent refresh function if available
      if (typeof onRefresh === 'function') {
        await onRefresh();
      }
    } catch (error) {
      console.error('Error during refresh:', error);
      setStatus(prev => ({
        ...prev,
        errorMsg: error.message
      }));
    } finally {
      setIsRefreshing(false);
    }
  };
  
  // Format wallet address for display
  const formatAddress = (address) => {
    if (!address) return '';
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };
  
  return (
    <div className="wallet-status-container border rounded-md p-3 flex flex-col shadow-sm">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-medium flex items-center">
          <FaWallet className="mr-2" /> Wallet Status
        </h3>
        <button 
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
          title="Refresh wallet status"
        >
          {isRefreshing ? (
            <FaSync className="animate-spin mr-1" size={14} />
          ) : (
            <FaSync className="mr-1" size={14} />
          )}
          {isRefreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>
      
      <div className="mt-2 space-y-1 text-sm">
        {/* Connection Status */}
        <div className="flex items-center justify-between">
          <span className="text-gray-500">Connection:</span>
          <span className={`font-medium flex items-center ${status.isConnected ? 'text-green-600' : 'text-red-600'}`}>
            {status.isConnected ? (
              <>
                <FaCheckCircle className="mr-1" size={12} />
                Connected
              </>
            ) : (
              <>
                <FaExclamationTriangle className="mr-1" size={12} />
                Not Connected
              </>
            )}
          </span>
        </div>
        
        {/* Validation Status */}
        {status.isConnected && (
          <div className="flex items-center justify-between">
            <span className="text-gray-500">Validation:</span>
            <span className={`font-medium flex items-center ${status.isValidated ? 'text-green-600' : 'text-yellow-600'}`}>
              {status.isValidated ? (
                <>
                  <FaCheckCircle className="mr-1" size={12} />
                  Verified
                </>
              ) : (
                <>
                  <FaExclamationTriangle className="mr-1" size={12} />
                  Unverified
                </>
              )}
            </span>
          </div>
        )}
        
        {/* Network */}
        <div className="flex items-center justify-between">
          <span className="text-gray-500">Network:</span>
          <span className={`font-medium ${status.network === 'devnet' ? 'text-purple-600' : 'text-blue-600'}`}>
            {status.network === 'devnet' ? 'Devnet' : 
             status.network === 'mainnet' ? 'Mainnet' : 
             status.network === 'testnet' ? 'Testnet' : 'Unknown'}
          </span>
        </div>
        
        {/* Wallet Address */}
        {status.isConnected && status.address && (
          <div className="flex items-center justify-between">
            <span className="text-gray-500">Address:</span>
            <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
              {formatAddress(status.address)}
            </span>
          </div>
        )}
        
        {/* Error Message */}
        {status.errorMsg && (
          <div className="mt-2 text-xs text-red-600 bg-red-50 p-2 rounded">
            Error: {status.errorMsg}
          </div>
        )}
      </div>
      
      {/* Wallet connection details */}
      <div className="mt-3 text-xs text-gray-400 border-t pt-2">
        {status.isConnected ? (
          status.isValidated ? 
            'Wallet connected and validated for trading' : 
            'Wallet connected but not validated - signature required'
        ) : (
          'Connect wallet to access real blockchain data'
        )}
      </div>
    </div>
  );
};

export default WalletStatus;
