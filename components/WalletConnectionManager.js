'use client';

import React, { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import WalletBalanceDisplay from './WalletBalanceDisplay';
import WalletTokens from './WalletTokens';
import WalletTransactionHistory from './WalletTransactionHistory';
import useWeb3Utils from '../lib/useWeb3Utils';
import toast from 'react-hot-toast';

/**
 * WalletConnectionManager
 * 
 * A comprehensive wallet management component that integrates wallet connection,
 * balance display, and token management in one unified interface.
 */
const WalletConnectionManager = ({ className = '', onSelectToken }) => {
  const { publicKey, connected } = useWallet();
  const { network, isLoading } = useWeb3Utils();
  const [showTokens, setShowTokens] = useState(false);
  const [selectedTab, setSelectedTab] = useState('overview');

  // Toggle token display
  const toggleTokens = () => {
    setShowTokens(!showTokens);
  };

  // Copy wallet address to clipboard
  const copyAddressToClipboard = () => {
    if (!publicKey) return;
    
    try {
      navigator.clipboard.writeText(publicKey.toString());
      toast.success('Wallet address copied to clipboard');
    } catch (error) {
      console.error('Failed to copy address:', error);
      toast.error('Failed to copy address');
    }
  };

  // Format public key for display
  const formatPublicKey = (key) => {
    if (!key) return '';
    const keyStr = key.toString();
    return `${keyStr.slice(0, 6)}...${keyStr.slice(-4)}`;
  };

  // Get network badge color
  const getNetworkBadgeColor = () => {
    switch (network) {
      case 'mainnet':
      case 'mainnet-beta':
        return 'bg-blue-500';
      case 'devnet':
        return 'bg-green-500';
      case 'testnet':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-500';
    }
  };

  // Get network display name
  const getNetworkDisplayName = () => {
    switch (network) {
      case 'mainnet':
      case 'mainnet-beta':
        return 'Mainnet';
      case 'devnet':
        return 'Devnet';
      case 'testnet':
        return 'Testnet';
      default:
        return 'Unknown';
    }
  };

  return (
    <div className={`wallet-connection-manager ${className}`}>
      <div className="bg-gray-800 rounded-lg p-4 shadow-lg">
        {/* Wallet Connection Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">Wallet</h2>
          <WalletMultiButton className="wallet-adapter-button-custom" />
        </div>

        {/* Connected Wallet Info */}
        {connected ? (
          <div>
            {/* Network and Address Bar */}
            <div className="flex items-center justify-between mb-4 bg-gray-700 rounded-lg p-2">
              <div className="flex items-center">
                <span className={`w-3 h-3 rounded-full mr-2 ${getNetworkBadgeColor()}`}></span>
                <span className="text-sm font-medium text-gray-300">{getNetworkDisplayName()}</span>
              </div>
              <div 
                className="flex items-center cursor-pointer hover:text-blue-400 transition-colors"
                onClick={copyAddressToClipboard}
              >
                <span className="text-sm text-gray-300">{formatPublicKey(publicKey)}</span>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-700 mb-4">
              <button
                className={`py-2 px-4 text-sm font-medium ${
                  selectedTab === 'overview' 
                    ? 'text-blue-400 border-b-2 border-blue-400' 
                    : 'text-gray-400 hover:text-gray-300'
                }`}
                onClick={() => setSelectedTab('overview')}
              >
                Overview
              </button>
              <button
                className={`py-2 px-4 text-sm font-medium ${
                  selectedTab === 'tokens' 
                    ? 'text-blue-400 border-b-2 border-blue-400' 
                    : 'text-gray-400 hover:text-gray-300'
                }`}
                onClick={() => setSelectedTab('tokens')}
              >
                Tokens
              </button>
              <button
                className={`py-2 px-4 text-sm font-medium ${
                  selectedTab === 'activity' 
                    ? 'text-blue-400 border-b-2 border-blue-400' 
                    : 'text-gray-400 hover:text-gray-300'
                }`}
                onClick={() => setSelectedTab('activity')}
              >
                Activity
              </button>
            </div>

            {/* Tab Content */}
            <div className="tab-content">
              {selectedTab === 'overview' && (
                <div className="overview-tab">
                  <WalletBalanceDisplay className="mb-4" />
                  
                  {/* Quick Actions */}
                  <div className="mt-4">
                    <h3 className="text-sm font-medium text-gray-400 mb-2">Quick Actions</h3>
                    <div className="grid grid-cols-2 gap-2">
                      <button 
                        className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded text-sm transition"
                        onClick={() => setSelectedTab('tokens')}
                      >
                        View All Tokens
                      </button>
                      {(network === 'devnet' || network === 'testnet') && (
                        <button 
                          className="bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded text-sm transition"
                          onClick={() => toast.success('Airdrop functionality is available in the Balance Display')}
                        >
                          Request Airdrop
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {selectedTab === 'tokens' && (
                <div className="tokens-tab">
                  <WalletTokens onSelectToken={onSelectToken} />
                </div>
              )}

              {selectedTab === 'activity' && (
                <div className="activity-tab">
                  <WalletTransactionHistory />
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-6">
            <p className="text-gray-400 mb-4">Connect your wallet to access TradeForce features</p>
            <div className="flex flex-col items-center space-y-2">
              <div className="text-sm text-gray-500">Supported wallets:</div>
              <div className="flex space-x-3">
                <img src="/images/wallets/phantom.png" alt="Phantom" className="h-6 w-6" />
                <img src="/images/wallets/solflare.png" alt="Solflare" className="h-6 w-6" />
                <img src="/images/wallets/coinbase.png" alt="Coinbase" className="h-6 w-6" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Custom Styles */}
      <style jsx global>{`
        .wallet-adapter-button-custom {
          background-color: #3b82f6 !important;
          transition: background-color 0.2s ease;
        }
        .wallet-adapter-button-custom:hover {
          background-color: #2563eb !important;
        }
      `}</style>
    </div>
  );
};

export default WalletConnectionManager;
