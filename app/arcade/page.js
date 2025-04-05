'use client';

import React, { useState, useEffect } from 'react';
import ArcadeChess from '@/components/ArcadeChess';
import { useTokenService } from '@/lib/tokenService';
import { WalletProvider, WalletConnectionButton } from '@/lib/WalletProvider';
import { useWallet } from '@solana/wallet-adapter-react';
import Image from 'next/image';

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
  const [fadeIn, setFadeIn] = useState(false);
  const [bannerLoaded, setBannerLoaded] = useState(false);
  const [bannerError, setBannerError] = useState(false);
  const [logoLoaded, setLogoLoaded] = useState(false);
  
  // Add fade-in animation effect
  useEffect(() => {
    setFadeIn(true);
  }, []);
  
  // Handle image error
  const handleBannerError = (e) => {
    console.error("Banner image failed to load");
    setBannerError(true);
    // Fall back to placeholder
    e.target.src = 'https://via.placeholder.com/1200x300.png?text=Embassy+Banner';
  };
  
  // Handle image load success
  const handleBannerLoaded = () => {
    console.log("Banner image loaded successfully");
    setBannerLoaded(true);
  };

  // Handle AIXBT logo loading
  const handleLogoLoaded = () => {
    console.log("AIXBT logo loaded successfully");
    setLogoLoaded(true);
  };

  // Handle logo error
  const handleLogoError = (e) => {
    console.error("AIXBT logo failed to load");
    // Fall back to placeholder
    e.target.src = 'https://via.placeholder.com/30x30.png?text=AIXBT';
  };

  // Handle token burning for premium game modes
  const handleTokenBurn = async (amount) => {
    if (!connected) return;
    
    try {
      await burnTokens(amount);
      setBurnedTokens(prev => prev + amount);
      
      return true;
    } catch (error) {
      console.error("Error burning tokens:", error);
      return false;
    }
  };

  return (
    <div className="flex min-h-screen bg-[#1A1F2E] text-white">
      <main className="flex-grow px-4 py-6 md:px-6 md:py-8 flex flex-col">
        {/* Enhanced Hero Section with Banner */}
        <div 
          className={`transition-all duration-1000 ${fadeIn ? 'opacity-100 scale-100' : 'opacity-0 scale-95'} relative`}
        >
          {/* Banner Container with stylish overlay */}
          <div className="relative w-full h-full rounded-2xl overflow-hidden mb-8">
            {/* Banner Image with fallback */}
            <div className="relative w-full h-[280px] md:h-[320px]">
              <img
                src="/images/banner.png"
                alt="Embassy Arcade Banner"
                className={`object-cover w-full h-full transition-opacity duration-500 ${bannerLoaded ? 'opacity-100' : 'opacity-0'}`}
                onError={handleBannerError}
                onLoad={handleBannerLoaded}
              />
              
              {/* Fallback display while banner is loading or if it fails */}
              {!bannerLoaded && (
                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-r from-[#9945FF]/20 to-[#00FFA3]/20">
                  <div className="flex flex-col items-center space-y-2">
                    <div className="w-10 h-10 border-4 border-[#9945FF] border-t-transparent rounded-full animate-spin"></div>
                    <div className="text-sm text-gray-300">Loading banner...</div>
                  </div>
                </div>
              )}
            </div>

            {/* Improved Gradient Overlay for better text visibility */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#1A1F2E] via-[#1A1F2E]/60 to-transparent"></div>
            
            {/* Content positioned over the banner with better spacing and styling */}
            <div className="absolute inset-x-0 bottom-0">
              <div className="text-center max-w-3xl mx-auto px-6 pb-10 pt-20">
                <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-[#00FFA3] to-[#9945FF] drop-shadow-lg">
                  Embassy Arcade
                </h1>
                <p className="text-xl text-gray-200 max-w-2xl mx-auto mb-8 drop-shadow-lg">
                  Play games, earn trading signals, and burn EMB tokens for premium features
                </p>
                
                {!connected ? (
                  <div className="flex justify-center">
                    <WalletConnectionButton 
                      className="transition transform hover:scale-105 text-lg py-3 px-8 shadow-lg" 
                      variant="primary"
                    />
                  </div>
                ) : (
                  <div className="inline-flex items-center bg-gray-800/80 backdrop-blur-sm rounded-xl px-6 py-4 border border-gray-700/50 shadow-lg">
                    <div className="mr-6">
                      <div className="text-xs text-gray-400">Wallet</div>
                      <div className="text-white text-sm font-medium">{publicKey.toString().slice(0, 6)}...{publicKey.toString().slice(-4)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-[#00FFA3]">EMB Balance</div>
                      <div className="text-white font-medium">{balance ? balance.toFixed(2) : '0'}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Animated Borders using Solana colors */}
            <div className="absolute inset-0 rounded-2xl pointer-events-none">
              <div className="absolute inset-0 rounded-2xl border border-[#9945FF]/20"></div>
              <div className="absolute -inset-[1px] rounded-2xl border border-[#00FFA3]/10 animate-pulse"></div>
            </div>
          </div>
        </div>
        
        {/* Chess Game Section With AIXBT Badge */}
        <div className={`mt-4 transition-all duration-700 delay-300 ${fadeIn ? 'opacity-100 transform translate-y-0' : 'opacity-0 transform translate-y-10'}`}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-semibold text-white">Chess Game</h2>
            <div className="flex items-center space-x-2 bg-gray-800/40 py-2 px-4 rounded-full border border-gray-700/30">
              <img 
                src="/images/aixbt.png" 
                alt="AIXBT Logo" 
                className={`w-5 h-5 transition-opacity duration-300 ${logoLoaded ? 'opacity-100' : 'opacity-0'}`}
                onLoad={handleLogoLoaded}
                onError={handleLogoError}
              />
              <span className="text-sm text-[#00FFA3]">Powered by AIXBT</span>
            </div>
          </div>
          
          <ArcadeChess 
            embBalance={balance}
            onTokenBurn={handleTokenBurn}
            isSimulationMode={false}
          />
        </div>
        
        {/* Info Cards */}
        <div className={`grid grid-cols-1 md:grid-cols-3 gap-6 mt-10 transition-all duration-700 delay-500 ${fadeIn ? 'opacity-100 transform translate-y-0' : 'opacity-0 transform translate-y-10'}`}>
          <InfoCard 
            icon={
              <svg className="w-6 h-6 text-[#00FFA3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            }
            title="Trade While You Play"
            description="Embassy Arcade is designed to keep you engaged while waiting for trade signals and market movements."
          />
          
          <InfoCard 
            icon={
              <svg className="w-6 h-6 text-[#9945FF]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
            title="EMB Token Utility"
            description="Burn EMB tokens to unlock premium game features, get higher rewards, and increase your chances of receiving trading signals."
            footer={
              burnedTokens > 0 && (
                <div className="mt-3 p-2 bg-[#9945FF]/10 rounded border border-[#9945FF]/30">
                  <span className="text-xs text-[#9945FF]/90">You've burned: </span>
                  <span className="text-[#9945FF] font-medium">{burnedTokens} EMB</span>
                </div>
              )
            }
          />
          
          <InfoCard 
            icon={
              <svg className="w-6 h-6 text-[#00FFA3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
            title="Exclusive Alpha"
            description="Chess victories have a chance to unlock exclusive trading signals from our AI models. Premium players receive higher confidence signals."
          />
        </div>
        
        {/* Coming Soon Section */}
        <div className={`mt-12 transition-all duration-700 delay-700 ${fadeIn ? 'opacity-100 transform translate-y-0' : 'opacity-0 transform translate-y-10'}`}>
          <div className="bg-gradient-to-r from-[#9945FF]/10 to-[#00FFA3]/10 rounded-xl p-6 border border-[#9945FF]/20">
            <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
              <svg className="w-5 h-5 mr-2 text-[#00FFA3]" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
              </svg>
              Coming Soon
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <ComingSoonCard title="Multiplayer Chess" description="Challenge other Embassy traders to head-to-head matches and win EMB tokens." />
              <ComingSoonCard title="Poker Tables" description="Play Texas Hold'em against AI opponents and other traders to earn rewards." />
              <ComingSoonCard title="Trading Tournaments" description="Compete in weekly trading competitions with EMB token prize pools." />
            </div>
          </div>
        </div>
        
        {/* Footer with AIXBT Branding */}
        <div className={`mt-auto pt-12 transition-all duration-700 delay-800 ${fadeIn ? 'opacity-100 transform translate-y-0' : 'opacity-0 transform translate-y-10'}`}>
          <footer className="border-t border-gray-800 pt-6">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <div className="mb-4 md:mb-0">
                <p className="text-gray-400 text-sm">© {new Date().getFullYear()} Embassy AI. All rights reserved.</p>
              </div>
              <div className="flex items-center space-x-2 bg-gradient-to-r from-[#1F2937]/60 to-[#374151]/60 py-2 px-4 rounded-full border border-gray-700/30 backdrop-blur-sm animate-pulse-subtle">
                <img 
                  src="/images/aixbt.png" 
                  alt="AIXBT Logo" 
                  className={`w-5 h-5 transition-opacity duration-300 ${logoLoaded ? 'opacity-100' : 'opacity-0'}`}
                  onLoad={handleLogoLoaded}
                  onError={handleLogoError}
                />
                <span className="text-sm bg-clip-text text-transparent bg-gradient-to-r from-[#00FFA3] to-[#9945FF] font-medium">
                  Powered by AIXBT
                </span>
              </div>
            </div>
          </footer>
        </div>
      </main>
    </div>
  );
}

// Info Card Component
const InfoCard = ({ icon, title, description, footer = null }) => (
  <div className="bg-gray-800/40 backdrop-blur-sm rounded-xl p-6 border border-gray-700/30 hover:border-[#00FFA3]/30 transition-colors">
    <div className="w-12 h-12 bg-gray-700/40 rounded-xl flex items-center justify-center mb-4">
      {icon}
    </div>
    <h3 className="text-lg font-medium text-white mb-2">{title}</h3>
    <p className="text-gray-300 text-sm">
      {description}
    </p>
    {footer}
  </div>
);

// Coming Soon Card Component
const ComingSoonCard = ({ title, description }) => (
  <div className="bg-gray-800/20 backdrop-blur-sm hover:bg-gray-800/40 p-4 rounded-xl border border-gray-700/20 transition-all hover:border-[#9945FF]/30 transform hover:-translate-y-1">
    <h4 className="text-[#9945FF] font-medium mb-2">{title}</h4>
    <p className="text-gray-300 text-sm">{description}</p>
  </div>
);

// Add this at the end of your global.css or create a new style tag
/* 
@keyframes pulse-subtle {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.9; }
}
.animate-pulse-subtle {
  animation: pulse-subtle 3s ease-in-out infinite;
}
*/