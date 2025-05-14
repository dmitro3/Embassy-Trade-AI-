'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { ToastContainer } from 'react-toastify';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';
import { clusterApiUrl } from '@solana/web3.js';
import '@solana/wallet-adapter-react-ui/styles.css';

// Dynamically import components to avoid SSR issues with wallet adapters
const TradeForceAI = dynamic(
  () => import('../../components/TradeForceAIV2'),
  { ssr: false }
);

const PhantomWalletConnector = dynamic(
  () => import('../../components/PhantomWalletConnector'),
  { ssr: false }
);

// Use our custom wrapper component instead of direct dynamic import
const WalletButton = dynamic(
  () => import('../../components/WalletButton'),
  { ssr: false }
);

// Dynamically import error logger to capture client-side errors
const ErrorLogger = dynamic(
  () => import('../../scripts/error-logger'),
  { ssr: false }
);

// Dynamically import the automated error monitor
const AutomatedErrorMonitor = dynamic(
  () => import('../../components/AutomatedErrorMonitor'),
  { ssr: false }
);

// Dynamically import MongoDB diagnostic component
const MongoDBDiagnostic = dynamic(
  () => import('../../components/MongoDBDiagnostic'),
  { ssr: false }
);

// Dynamically import Web3 error handler
const Web3ErrorHandler = dynamic(
  () => import('../../components/Web3ErrorHandler'),
  { ssr: false }
);

// Dynamically import Offline Status Indicator
const OfflineStatusIndicator = dynamic(
  () => import('../../components/OfflineStatusIndicator'),
  { ssr: false }
);

// Import error boundary for catching React errors
import EnhancedErrorBoundary from '../../components/EnhancedErrorBoundary';

// Import toastify styles
import 'react-toastify/dist/ReactToastify.css';

/**
 * TradeForce AI Page
 * 
 * Main page for the TradeForce AI trading dashboard
 * Provides wallet connection and trading interface
 * Enhanced with multi-exchange connectivity and AI trading capabilities
 */
export default function TradeForceAIPage() {
  // Set up Solana network (DevNet)
  const network = WalletAdapterNetwork.Devnet;
  const endpoint = clusterApiUrl(network);
    // Set up wallet adapters (Phantom, Solflare)
  const wallets = React.useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter()
    ],
    []
  );    return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        {/* Web3 error handler (invisible) */}
        <Web3ErrorHandler />
        
        {/* Automated error monitoring */}
        <AutomatedErrorMonitor />
        
        <div className="min-h-screen bg-gray-900 text-white">
          {/* Header with wallet connection */}
          <header className="border-b border-gray-800 bg-gray-900 sticky top-0 z-10">
            <div className="container mx-auto px-4 py-3 flex justify-between items-center">
              <div className="flex items-center space-x-4">
                <h1 className="text-2xl font-bold">TradeForce AI</h1>
                <span className="px-2 py-1 bg-blue-600 text-xs rounded-full">DevNet</span>
              </div>
              <div className="wallet-adapter-dropdown">
                <WalletButton className="!bg-blue-600 hover:!bg-blue-700" />
              </div>
            </div>
          </header>
          
          {/* Main content wrapped in error boundary */}          <main className="container mx-auto px-4 py-8">            <EnhancedErrorBoundary 
              message="We encountered a problem with the TradeForce AI dashboard. Please try again."
              showToast={true}
            >
              <TradeForceAI />
            </EnhancedErrorBoundary>
          </main>
          
          {/* Footer */}
          <footer className="border-t border-gray-800 bg-gray-900 py-6">
            <div className="container mx-auto px-4 text-center text-gray-500 text-sm">
              <p>TradeForce AI Trading System &copy; 2025</p>
              <p className="mt-2">
                Trading on DevNet only. Not financial advice. Use at your own risk.
              </p>
              <div className="flex justify-center items-center space-x-4 mt-4">
                <span className="text-xs bg-blue-900/50 text-blue-300 px-2 py-1 rounded-full">Multi-Exchange Compatible</span>
                <span className="text-xs bg-purple-900/50 text-purple-300 px-2 py-1 rounded-full">AI-Powered</span>
                <span className="text-xs bg-green-900/50 text-green-300 px-2 py-1 rounded-full">Low Latency</span>
              </div>
            </div>
          </footer>          {/* Error logger component (hidden) */}
          <ErrorLogger />
          
          {/* MongoDB diagnostic tool */}
          <MongoDBDiagnostic />
            {/* Toast notifications */}
          <ToastContainer
            position="bottom-right"
            theme="dark"
            autoClose={5000}
            hideProgressBar={false}
            newestOnTop
            closeOnClick
            rtl={false}
            pauseOnFocusLoss
            draggable
            pauseOnHover
          />
          
          {/* Offline status indicator */}
          <OfflineStatusIndicator 
            position="bottom-left"
            enableAutoSync={true}
            theme="auto"
            onReconnect={(offlineTime) => {
              // Log reconnection for analysis
              console.info(`Reconnected after ${offlineTime} seconds offline`);
              
              if (offlineTime > 60) {
                // If offline for more than a minute, refresh data
                window.dispatchEvent(new CustomEvent('app:refresh-data'));
              }
            }}
          />
        </div>
      </WalletProvider>
    </ConnectionProvider>
  );
}
