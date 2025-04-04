'use client';

import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import Image from 'next/image';
import { EMB_TOKEN_CONFIG } from '@/lib/embToken';
import { useWallet } from '@/lib/WalletProvider';

/**
 * Specialized modal for wallet connection using the new design
 * This modal is designed to connect to Solana wallets like Phantom
 */
const WalletConnectModal = ({ isOpen, onClose, onConnect }) => {
  const [activeTab, setActiveTab] = useState('connect'); // 'connect' or 'buy'
  const { select, connect, connecting, connected, wallet } = useWallet();
  
  // Handle wallet connection
  const handleConnectWallet = async (walletName) => {
    try {
      // Select the wallet adapter
      select(walletName);
      
      // Connect to the selected wallet
      await connect();
      
      // Call the onConnect callback if provided
      if (onConnect) {
        onConnect(walletName);
      }
      
      // Close the modal after successful connection
      if (connected) {
        onClose();
      }
    } catch (error) {
      console.error(`Error connecting to ${walletName}:`, error);
    }
  };
  
  // If already connected, close modal
  useEffect(() => {
    if (connected && wallet) {
      onClose();
    }
  }, [connected, wallet, onClose]);
  
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={activeTab === 'connect' ? "Connect Your Wallet" : "Get EMB Tokens"}
      primaryAction={{
        label: activeTab === 'connect' ? "Connect Wallet" : "Buy EMB Tokens",
        onClick: activeTab === 'connect' 
          ? () => handleConnectWallet('phantom') // Default to phantom if no selection
          : () => window.open(EMB_TOKEN_CONFIG.links.pump, '_blank'),
      }}
      secondaryAction={{
        label: "Cancel",
        onClick: onClose,
      }}
    >
      <div className="space-y-5">
        <div className="flex border-b border-gray-700">
          <button
            onClick={() => setActiveTab('connect')}
            className={`px-4 py-2 font-medium text-sm focus:outline-none ${
              activeTab === 'connect' 
                ? 'text-blue-400 border-b-2 border-blue-400' 
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            Connect Wallet
          </button>
          <button
            onClick={() => setActiveTab('buy')}
            className={`px-4 py-2 font-medium text-sm focus:outline-none ${
              activeTab === 'buy' 
                ? 'text-blue-400 border-b-2 border-blue-400' 
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            Buy EMB Tokens
          </button>
        </div>
        
        {activeTab === 'connect' && (
          <>
            <p className="text-gray-300 mb-4">
              Connect to a Solana wallet to start trading with Embassy AI.
              Connect your wallet to access all features and manage your trades.
            </p>
            
            <div className="bg-gray-800/50 p-4 rounded-lg">
              <h4 className="text-white font-medium mb-2">Supported Wallets</h4>
              <div className="flex flex-wrap gap-3">
                <WalletOption
                  name="Phantom"
                  image="/phantom.png" 
                  onClick={() => handleConnectWallet('phantom')} 
                />
                <WalletOption
                  name="Solflare"
                  image="/images/wallets/solflare.png" 
                  onClick={() => handleConnectWallet('solflare')} 
                />
                <WalletOption
                  name="Backpack"
                  image="/images/wallets/backpack.png" 
                  onClick={() => handleConnectWallet('backpack')} 
                />
                <WalletOption
                  name="Pumpfun"
                  image="/images/wallets/pumpfun.png" 
                  onClick={() => handleConnectWallet('pumpfun')}
                  disabled 
                />
                <WalletOption
                  name="Moby"
                  image="/images/wallets/moby.png" 
                  onClick={() => handleConnectWallet('moby')} 
                  disabled
                />
                <WalletOption
                  name="Axibt"
                  image="/images/wallets/axibt.png" 
                  onClick={() => handleConnectWallet('axibt')} 
                  disabled
                />
              </div>
            </div>
            
            {connecting && (
              <div className="bg-blue-900/30 p-4 rounded-lg border border-blue-700/40">
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-400 mr-3"></div>
                  <span className="text-blue-300">Connecting to wallet...</span>
                </div>
              </div>
            )}
            
            <div className="bg-gray-800/50 p-4 rounded-lg">
              <h4 className="text-white font-medium mb-2">Account Requirements</h4>
              <ul className="list-disc list-inside text-gray-300 text-sm">
                <li>Minimum 1 SOL for trade entry point</li>
                <li>Solana blockchain transaction fees may apply</li>
                <li>EMB tokens for premium features (optional)</li>
              </ul>
            </div>
          </>
        )}
        
        {activeTab === 'buy' && (
          <>
            <p className="text-gray-300 mb-4">
              Embassy AI uses EMB tokens to power premium features across the platform. Purchase EMB tokens to unlock additional capabilities.
            </p>
            
            <div className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 p-4 rounded-lg border border-purple-800/40">
              <h4 className="text-white font-medium mb-2 flex items-center">
                <svg className="w-5 h-5 mr-2 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M11 17a1 1 0 001.447.894l4-2A1 1 0 0017 15V9.236a1 1 0 00-1.447-.894l-4 2a1 1 0 00-.553.894V17zM15.211 6.276a1 1 0 000-1.788l-4.764-2.382a1 1 0 00-.894 0L4.789 4.488a1 1 0 000 1.788l4.764 2.382a1 1 0 00.894 0l4.764-2.382zM4.447 8.342A1 1 0 003 9.236V15a1 1 0 00.553.894l4 2A1 1 0 009 17v-5.764a1 1 0 00-.553-.894l-4-2z" />
                </svg>
                EMB Token Information
              </h4>
              
              <div className="mt-2 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-300">Token Symbol:</span>
                  <span className="text-blue-300 font-mono">EMB</span>
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-300">Token Contract:</span>
                  <a 
                    href={EMB_TOKEN_CONFIG.links.explorer} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-300 font-mono hover:underline truncate max-w-[200px]"
                  >
                    {EMB_TOKEN_CONFIG.contract}
                  </a>
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-300">Network:</span>
                  <span className="text-blue-300 font-mono">Solana {EMB_TOKEN_CONFIG.network}</span>
                </div>
              </div>
            </div>
            
            <div className="bg-gray-800/50 p-4 rounded-lg">
              <h4 className="text-white font-medium mb-3">Purchase Options</h4>
              
              <div className="space-y-3">
                <a 
                  href={EMB_TOKEN_CONFIG.links.pump} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="flex items-center justify-between p-3 bg-purple-900/30 hover:bg-purple-800/40 rounded-lg border border-purple-800/40 transition-colors"
                >
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-purple-800/60 rounded-full flex items-center justify-center mr-3">
                      <span className="text-purple-200 text-lg font-bold">P</span>
                    </div>
                    <div>
                      <div className="font-medium text-white">pump.fun</div>
                      <div className="text-xs text-purple-300">Recommended purchase method</div>
                    </div>
                  </div>
                  <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </a>
                
                <div className="p-3 bg-gray-700/30 rounded-lg border border-gray-700">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-gray-800 rounded-full flex items-center justify-center mr-3">
                      <span className="text-gray-400 text-lg font-bold">J</span>
                    </div>
                    <div>
                      <div className="font-medium text-white">Jupiter Aggregator</div>
                      <div className="text-xs text-gray-400">Coming soon</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-gray-800/50 p-4 rounded-lg">
              <h4 className="text-white font-medium mb-2">EMB Token Benefits</h4>
              <ul className="list-disc list-inside text-gray-300 text-sm space-y-1">
                <li>Access to premium features across the platform</li>
                <li>Enhanced rewards in trading and arcade games</li>
                <li>Priority AI model access and faster response times</li>
                <li>Exclusive community access and governance rights</li>
              </ul>
            </div>
          </>
        )}
        
        <div className="mt-4 text-sm text-gray-400">
          By connecting your wallet, you agree to the Embassy AI Terms of Service and Privacy Policy.
        </div>
      </div>
    </Modal>
  );
};

// Helper component for wallet options
const WalletOption = ({ name, image, onClick, disabled = false }) => {
  return (
    <button
      className={`flex items-center space-x-2 p-2 rounded-md border ${
        disabled 
          ? 'border-gray-700 bg-gray-800/30 cursor-not-allowed opacity-60' 
          : 'border-blue-600/30 bg-blue-900/20 hover:bg-blue-900/30'
      }`}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
    >
      <div className="w-6 h-6 relative">
        <Image src={image} alt={name} width={24} height={24} />
      </div>
      <span className={`text-sm ${disabled ? 'text-gray-400' : 'text-blue-200'}`}>
        {name} {disabled && '(Coming Soon)'}
      </span>
    </button>
  );
};

export default WalletConnectModal;