'use client';

import React, { useState } from 'react';
import Header from '@/components/Header';
import ArcadeChess from '@/components/ArcadeChess';
import EmbassyBanner from '@/components/EmbassyBanner';
import { useTokenService } from '@/lib/tokenService';
import { WalletProvider } from '@/lib/WalletProvider';
import { useWallet } from '@solana/wallet-adapter-react';

/**
 * Arcade page featuring the chess game with EMB token integration
 */
export default function ArcadePage() {
  return (
    <WalletProvider>
      <ArcadePageContent />
    </WalletProvider>
  );
}

function ArcadePageContent() {
  const { connected, publicKey, balance } = useWallet();
  const { connectWallet, burnTokens } = useTokenService();
  const [burnedTokens, setBurnedTokens] = useState(0);
  
  // Handle token burning for premium game modes
  const handleTokenBurn = async (amount) => {
    if (!connected) return;
    
    try {
      // Call the burnTokens function (corrected from burnToken)
      await burnTokens(amount);
      setBurnedTokens(prev => prev + amount);
      
      return true;
    } catch (error) {
      console.error("Error burning tokens:", error);
      return false;
    }
  };

  return (
    <div className="min-h-screen bg-gray-950">
      <Header />
      
      <main className="container mx-auto px-4 py-6">
        {/* Arcade page header with banner */}
        <div className="relative mb-6 rounded-xl overflow-hidden">
          <EmbassyBanner className="h-[180px]" variant="light" />
          
          {/* Overlay content */}
          <div className="absolute inset-0 flex items-center px-6">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Embassy Arcade</h1>
              <p className="text-gray-300 max-w-xl">
                Play games, earn trading signals, and burn EMB tokens for premium features
              </p>
            </div>
          </div>
        </div>
        
        {/* EMB Token Status Banner */}
        <div className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 rounded-lg p-4 border border-blue-800/30 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-blue-800/40 rounded-full flex items-center justify-center mr-3">
                <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-medium text-white">Embassy Arcade</h2>
                <p className="text-sm text-gray-300">
                  Play games, earn trading signals, burn EMB tokens for premium features
                </p>
              </div>
            </div>
            
            <div className="mt-4 md:mt-0">
              {connected ? (
                <div className="bg-gray-800 rounded-lg px-4 py-2 flex items-center">
                  <div className="mr-4">
                    <div className="text-xs text-gray-400">Wallet</div>
                    <div className="text-white text-sm">{publicKey.toString().slice(0, 6)}...{publicKey.toString().slice(-4)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-purple-400">EMB Balance</div>
                    <div className="text-white font-medium">{balance ? balance.toFixed(2) : '0'}</div>
                  </div>
                </div>
              ) : (
                <button 
                  onClick={connectWallet}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Connect Wallet for Premium Features
                </button>
              )}
            </div>
          </div>
        </div>
        
        {/* Chess Game */}
        <div className="mb-6">
          <ArcadeChess 
            embBalance={balance}
            onTokenBurn={handleTokenBurn}
            isSimulationMode={false}
          />
        </div>
        
        {/* Info section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gray-800 rounded-lg p-5">
            <div className="w-10 h-10 bg-blue-800/40 rounded-lg flex items-center justify-center mb-3">
              <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-white mb-2">Trade While You Play</h3>
            <p className="text-gray-300 text-sm">
              Embassy Arcade is designed to keep you engaged while waiting for trade signals and market movements.
              Win games to unlock exclusive trading opportunities!
            </p>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-5">
            <div className="w-10 h-10 bg-purple-800/40 rounded-lg flex items-center justify-center mb-3">
              <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-white mb-2">EMB Token Utility</h3>
            <p className="text-gray-300 text-sm">
              Burn EMB tokens to unlock premium game features, get higher rewards, and increase your chances
              of receiving trading signals. Each burn contributes to the EMB economy.
            </p>
            {burnedTokens > 0 && (
              <div className="mt-3 p-2 bg-purple-900/20 rounded border border-purple-800/30">
                <span className="text-xs text-purple-300">You've burned: </span>
                <span className="text-purple-400 font-medium">{burnedTokens} EMB</span>
              </div>
            )}
          </div>
          
          <div className="bg-gray-800 rounded-lg p-5">
            <div className="w-10 h-10 bg-green-800/40 rounded-lg flex items-center justify-center mb-3">
              <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-white mb-2">Exclusive Alpha</h3>
            <p className="text-gray-300 text-sm">
              Chess victories have a chance to unlock exclusive trading signals from our AI models.
              Premium mode players receive signals with higher confidence levels and better risk/reward ratios.
            </p>
          </div>
        </div>
        
        {/* Coming soon section */}
        <div className="mt-8 bg-gradient-to-r from-blue-900/20 to-purple-900/20 rounded-xl p-6 border border-blue-800/30">
          <h3 className="text-xl font-semibold text-white mb-3">Coming Soon</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-gray-800/60 p-4 rounded-lg">
              <h4 className="text-blue-400 font-medium mb-2">Multiplayer Chess</h4>
              <p className="text-gray-300 text-sm">Challenge other Embassy traders to head-to-head matches and win EMB tokens.</p>
            </div>
            <div className="bg-gray-800/60 p-4 rounded-lg">
              <h4 className="text-blue-400 font-medium mb-2">Poker Tables</h4>
              <p className="text-gray-300 text-sm">Play Texas Hold'em against AI opponents and other traders to earn rewards.</p>
            </div>
            <div className="bg-gray-800/60 p-4 rounded-lg">
              <h4 className="text-blue-400 font-medium mb-2">Trading Tournaments</h4>
              <p className="text-gray-300 text-sm">Compete in weekly trading competitions with EMB token prize pools.</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}