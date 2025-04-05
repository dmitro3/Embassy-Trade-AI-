'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Header from '@/components/Header';
import TradeTab from '@/components/TradeTab';
import SwapToEMB from '@/components/SwapToEMB';
import WalletTokens from '@/components/WalletTokens';
import EmbassyBanner from '@/components/EmbassyBanner';
import PaperTrading from '@/components/PaperTrading';
import ChatWithAIXBT from '@/components/ChatWithAIXBT';
import { WalletProvider, useWallet } from '@/lib/WalletProvider';

/**
 * Trade page that displays the Photon trading interface and token swap functionality
 */
export default function TradePage() {
  const [activeTab, setActiveTab] = useState('trade');
  const searchParams = useSearchParams();
  
  // Set active tab based on URL query parameter
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'swap' || tab === 'trade' || tab === 'paper') {
      setActiveTab(tab);
    }
  }, [searchParams]);

  return (
    <WalletProvider>
      <div className="min-h-screen bg-gray-950">
        <Header />
        <main className="container mx-auto px-4 py-6">
          {/* Trade page header with banner */}
          <div className="relative mb-6 rounded-xl overflow-hidden">
            <EmbassyBanner className="h-[180px]" variant="light" />
            
            {/* Overlay content */}
            <div className="absolute inset-0 flex items-center px-6">
              <div>
                <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
                  {activeTab === 'trade' ? 'Photon Trading' : 
                   activeTab === 'paper' ? 'Paper Trading' : 'Token Swap'}
                </h1>
                <p className="text-gray-300 max-w-xl">
                  {activeTab === 'trade' 
                    ? 'Advanced AI-powered trading platform with real-time signals and automated execution'
                    : activeTab === 'paper'
                    ? 'Practice trading with EMB token rewards and zero risk using Alpaca paper trading API'
                    : 'Swap your tokens for EMB tokens to unlock premium features and enhanced rewards'
                  }
                </p>
              </div>
            </div>
          </div>
          
          {/* Tab Navigation */}
          <div className="flex border-b border-gray-800 mb-6">
            <button
              onClick={() => setActiveTab('trade')}
              className={`px-4 py-2 font-medium text-sm focus:outline-none ${
                activeTab === 'trade' 
                  ? 'text-blue-400 border-b-2 border-blue-400' 
                  : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              Live Trading
            </button>
            <button
              onClick={() => setActiveTab('paper')}
              className={`px-4 py-2 font-medium text-sm focus:outline-none ${
                activeTab === 'paper' 
                  ? 'text-blue-400 border-b-2 border-blue-400' 
                  : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              Paper Trading
            </button>
            <button
              onClick={() => setActiveTab('swap')}
              className={`px-4 py-2 font-medium text-sm focus:outline-none ${
                activeTab === 'swap' 
                  ? 'text-blue-400 border-b-2 border-blue-400' 
                  : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              Swap Tokens
            </button>
          </div>
          
          {/* Tab Content */}
          {activeTab === 'trade' ? (
            <div className="h-[calc(100vh-64px-48px-212px-48px)]">
              <TradeTab />
            </div>
          ) : activeTab === 'paper' ? (
            <PaperTrading />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <SwapSection />
              </div>
              <div className="lg:col-span-1">
                <TokenListSection />
              </div>
            </div>
          )}
        </main>
        
        {/* Chat with AIXBT - shown only in trade tabs */}
        {(activeTab === 'trade' || activeTab === 'paper') && <ChatWithAIXBT />}
      </div>
    </WalletProvider>
  );
}

// Component to display the swap interface
function SwapSection() {
  const { connected } = useWallet();
  const [swapComplete, setSwapComplete] = useState(false);
  
  const handleSwapComplete = (result) => {
    setSwapComplete(true);
    setTimeout(() => {
      setSwapComplete(false);
    }, 5000);
  };
  
  if (!connected) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 text-center">
        <h3 className="text-xl font-semibold mb-4 text-white">Connect Your Wallet</h3>
        <p className="text-gray-300 mb-6">Please connect your wallet to swap tokens.</p>
      </div>
    );
  }
  
  return (
    <div>
      {swapComplete && (
        <div className="mb-4 p-4 bg-green-900/30 border border-green-700 rounded-lg text-green-300 flex items-center">
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Swap completed successfully!
        </div>
      )}
      <SwapToEMB onSwapComplete={handleSwapComplete} />
    </div>
  );
}

// Component to display the token list
function TokenListSection() {
  const { connected } = useWallet();
  const [selectedToken, setSelectedToken] = useState(null);
  
  if (!connected) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 text-center">
        <h3 className="text-xl font-semibold mb-4 text-white">Your Tokens</h3>
        <p className="text-gray-300">Connect your wallet to view your tokens.</p>
      </div>
    );
  }
  
  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <h3 className="text-xl font-semibold mb-4 text-white">Your Tokens</h3>
      <WalletTokens onSelectToken={setSelectedToken} />
    </div>
  );
}