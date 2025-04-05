'use client';

import { useState, useEffect, Suspense, lazy } from 'react';
import { WalletProvider } from "../lib/WalletProvider";
import { useWallet, WalletConnectionButton } from "@/lib/WalletProvider";
import TradePromptHandler from "@/components/TradePromptHandler";
import DesktopAppBanner from "@/components/DesktopAppBanner";
import AutoTradeModal from "@/components/AutoTradeModal";
import FeedbackModal from "@/components/FeedbackModal";
import EmbassyBanner from "@/components/EmbassyBanner";
import WalletConnectModal from "@/components/WalletConnectModal";
import useElectron from '@/lib/useElectron';

// Lazy load the MoonshotSniper component
const MoonshotSniper = lazy(() => import("@/components/MoonshotSniper"));

// Loading fallback for lazy-loaded components
const LoadingFallback = () => (
  <div className="flex items-center justify-center w-full h-64 bg-gray-800 rounded-lg animate-pulse">
    <div className="flex flex-col items-center">
      <svg className="w-10 h-10 text-blue-500 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      <p className="mt-2 text-white">Loading component...</p>
    </div>
  </div>
);

// Wallet connection button component
const WalletButton = () => {
  const { connected, wallet } = useWallet();
  const [showWalletModal, setShowWalletModal] = useState(false);
  
  return (
    <>
      <div className="wallet-button-wrapper tooltip" 
        data-tooltip={connected ? `Connected: ${wallet?.adapter?.name || 'Wallet'}` : "Connect to Solana Wallet"}>
        <WalletConnectionButton />
        
        {connected && (
          <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-green-400 ring-2 ring-blue-600"></span>
        )}
      </div>
      
      <WalletConnectModal
        isOpen={showWalletModal}
        onClose={() => setShowWalletModal(false)}
        onConnect={(walletName) => {
          console.log(`Connected to ${walletName} wallet`);
          setShowWalletModal(false);
        }}
      />
    </>
  );
};

// Client layout component
export default function ClientLayout({ children }) {
  // Use state to track if we're on the client
  const [isMounted, setIsMounted] = useState(false);
  const [showMoonshotModal, setShowMoonshotModal] = useState(false);
  const [showAutoTradeModal, setShowAutoTradeModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [isAutoTrading, setIsAutoTrading] = useState(false);
  const [showBanner, setShowBanner] = useState(true);
  const { isElectron, isDesktopApp, onAutoTradingToggle } = useElectron();

  // Only render wallet components after initial mount to avoid hydration errors
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Listen for auto-trading toggle events from system tray
  useEffect(() => {
    if (isElectron) {
      return onAutoTradingToggle((enabled) => {
        setIsAutoTrading(enabled);
        if (enabled) {
          setShowAutoTradeModal(true);
        } else {
          setShowAutoTradeModal(false);
        }
      });
    }
  }, [isElectron, onAutoTradingToggle]);

  // Handle auto-trade toggle
  const handleAutoTradeToggle = () => {
    const newState = !isAutoTrading;
    setIsAutoTrading(newState);
    
    if (newState) {
      setShowAutoTradeModal(true);
    } else {
      setShowAutoTradeModal(false);
    }
  };

  return (
    <WalletProvider>
      {/* Embassy Banner */}
      {isMounted && showBanner && <EmbassyBanner onClose={() => setShowBanner(false)} />}
      
      {/* Desktop App Banner */}
      {isMounted && <DesktopAppBanner />}
      
      {/* Main Content */}
      <div className="min-h-screen flex flex-col">
        {children}
      
        {/* Fixed Action Bar */}
        {isMounted && (
          <div className="fixed bottom-4 right-4 flex flex-col space-y-3">
            {/* Wallet Connect Button */}
            {isMounted && <WalletButton />}
            
            {/* Feedback Button */}
            <button
              onClick={() => setShowFeedbackModal(true)}
              className="bg-purple-600 hover:bg-purple-700 text-white p-3 rounded-full shadow-lg flex items-center justify-center tooltip"
              aria-label="Report Issue or Give Feedback"
              data-tooltip="Report Issue or Give Feedback"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
              </svg>
            </button>
            
            {/* Moonshot Sniper Button */}
            <button
              onClick={() => setShowMoonshotModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full shadow-lg flex items-center justify-center tooltip"
              aria-label="Moonshot Sniper"
              data-tooltip="Find high-potential new coin listings"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </button>
            
            {/* Auto-Trade Button */}
            <button
              onClick={handleAutoTradeToggle}
              className={`${isAutoTrading ? 'bg-green-600 hover:bg-green-700' : 'bg-indigo-600 hover:bg-indigo-700'} text-white p-3 rounded-full shadow-lg flex items-center justify-center tooltip`}
              aria-label="Auto-Trade Toggle"
              data-tooltip="AI-driven trade search and execution"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </button>
            
            {/* Web Download Button - Fixed URL to point to the correct download page */}
            {isMounted && !isDesktopApp && (
              <a
                href="https://embassyai.xyz/"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-gray-800 hover:bg-gray-900 text-white p-3 rounded-full shadow-lg flex items-center justify-center tooltip"
                aria-label="Download Desktop App"
                data-tooltip="Download the Desktop App for more features"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </a>
            )}

            {/* Swap Tokens Button */}
            <a
              href="/trade?tab=swap"
              className="bg-teal-600 hover:bg-teal-700 text-white p-3 rounded-full shadow-lg flex items-center justify-center tooltip"
              aria-label="Swap Tokens"
              data-tooltip="Swap tokens and get EMB"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
            </a>
          </div>
        )}
      </div>
      
      {/* Modal Components */}
      {isMounted && (
        <>
          <TradePromptHandler />
          
          {showMoonshotModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
              <Suspense fallback={<LoadingFallback />}>
                <MoonshotSniper onClose={() => setShowMoonshotModal(false)} />
              </Suspense>
            </div>
          )}
          
          <AutoTradeModal 
            isOpen={showAutoTradeModal} 
            onClose={() => {
              setShowAutoTradeModal(false);
              setIsAutoTrading(false);
            }} 
          />
          
          <FeedbackModal 
            isOpen={showFeedbackModal} 
            onClose={() => setShowFeedbackModal(false)} 
          />
        </>
      )}
      
      {/* Tooltip Styles */}
      <style jsx global>{`
        .tooltip {
          position: relative;
        }
        
        .tooltip::after {
          content: attr(data-tooltip);
          position: absolute;
          right: 100%;
          margin-right: 10px;
          top: 50%;
          transform: translateY(-50%);
          padding: 5px 10px;
          background-color: rgba(0, 0, 0, 0.8);
          color: white;
          border-radius: 4px;
          font-size: 0.75rem;
          white-space: nowrap;
          opacity: 0;
          visibility: hidden;
          transition: opacity 0.2s, visibility 0.2s;
        }
        
        .tooltip:hover::after {
          opacity: 1;
          visibility: visible;
        }
        
        @media (max-width: 640px) {
          .tooltip::after {
            display: none;
          }
        }

        /* Custom wallet button styles */
        .wallet-button-wrapper {
          position: relative;
        }
        
        .wallet-button-wrapper :global(.wallet-adapter-button) {
          background: linear-gradient(to right, #3b82f6, #4f46e5);
          color: white;
          border-radius: 9999px;
          padding: 0.75rem;
          height: auto;
          width: auto;
          min-width: auto;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
        }
        
        .wallet-button-wrapper :global(.wallet-adapter-button:hover) {
          background: linear-gradient(to right, #2563eb, #4338ca);
        }
        
        .wallet-button-wrapper :global(.wallet-adapter-button-start-icon) {
          margin: 0;
          width: 20px;
          height: 20px;
        }
        
        .wallet-button-wrapper :global(.wallet-adapter-button-text) {
          display: none;
        }
      `}</style>
    </WalletProvider>
  );
}