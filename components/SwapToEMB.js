"use client";

import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletConnectionButton } from '../lib/WalletProvider';
import { JupiterProviderWrapper } from '../lib/JupiterProviderWrapper';
import EMB_TOKEN_CONFIG from '../lib/embToken'; // Import the token config

// Token Metadata using consistent token address from config
const TOKEN_METADATA = {
  'So11111111111111111111111111111111111111112': {
    symbol: 'SOL',
    name: 'Solana',
    decimals: 9,
    logoURI: '/images/tokens/sol.png'
  },
  'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZvyTDt1v': {
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
    logoURI: '/images/tokens/usdc.png'
  },
  [EMB_TOKEN_CONFIG.contract]: {
    symbol: EMB_TOKEN_CONFIG.symbol,
    name: EMB_TOKEN_CONFIG.name,
    decimals: EMB_TOKEN_CONFIG.decimals,
    logoURI: '/images/tokens/emb.png'
  }
};

function SwapToEMBContent() {
  const { connected } = useWallet();
  const [showInfo, setShowInfo] = useState(false);

  // Function to redirect to PumpFun
  const redirectToPumpFun = () => {
    window.open(EMB_TOKEN_CONFIG.links.pump, '_blank');
  };

  // UI for wallet not connected
  if (!connected) {
    return (
      <div className="bg-gray-800 text-white rounded-lg shadow-md p-5">
        <div className="text-center mb-4">
          <h2 className="text-lg font-semibold mb-2">Get EMB Token</h2>
          <p className="text-gray-300">Connect your wallet to access EMB token</p>
        </div>
        <div className="flex justify-center">
          <WalletConnectionButton />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 text-white rounded-lg shadow-md p-5">
      <div className="mb-5">
        <h2 className="text-lg font-semibold mb-1">Get EMB Token</h2>
        <p className="text-sm text-gray-300">
          Purchase EMB to unlock paper trading and premium features!
        </p>
      </div>

      {/* EMB Token Card */}
      <div className="mb-5 border border-gray-700 rounded-lg p-4 bg-gradient-to-r from-gray-900 to-gray-800">
        <div className="flex items-center mb-3">
          <img 
            src="/images/tokens/emb.png" 
            alt="EMB"
            className="w-10 h-10 rounded-full mr-3"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = '/images/tokens/unknown.png';
            }}
          />
          <div>
            <h3 className="font-bold text-lg">{EMB_TOKEN_CONFIG.name} ({EMB_TOKEN_CONFIG.symbol})</h3>
            <p className="text-sm text-gray-300">Early access token</p>
          </div>
        </div>
        
        <div className="bg-gray-700 rounded-lg p-3 mb-3 shadow-sm">
          <p className="text-sm mb-1"><span className="font-medium">Token:</span> {EMB_TOKEN_CONFIG.symbol}</p>
          <p className="text-sm mb-1"><span className="font-medium">Network:</span> Solana</p>
          <p className="text-sm text-xs text-gray-300 break-all">
            <span className="font-medium">Address:</span> {EMB_TOKEN_CONFIG.contract}
          </p>
        </div>

        {showInfo && (
          <div className="bg-gray-700 rounded-lg p-3 mb-3">
            <h4 className="font-medium text-sm mb-1">What can you do with EMB?</h4>
            <ul className="text-sm list-disc pl-5 space-y-1 text-gray-300">
              <li>Access paper trading features</li>
              <li>Play arcade games (1 EMB per chess game)</li>
              <li>Unlock premium trading features</li>
              <li>Participate in the Embassy ecosystem</li>
            </ul>
          </div>
        )}

        <button 
          onClick={() => setShowInfo(!showInfo)} 
          className="text-sm text-blue-400 hover:text-blue-300 mb-4 flex items-center"
        >
          {showInfo ? 'Hide info' : 'Show more info'}
          <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ml-1 transition-transform ${showInfo ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* Get EMB Button */}
      <button
        onClick={redirectToPumpFun}
        className="w-full py-3 rounded-lg font-medium bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center"
      >
        <span>Get EMB on Pump.fun</span>
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
        </svg>
      </button>

      <div className="mt-4 p-3 bg-amber-900 border border-amber-800 rounded-lg">
        <h4 className="font-medium text-amber-200 text-sm mb-1">Important Note:</h4>
        <p className="text-sm text-amber-300">
          After purchasing EMB on Pump.fun, return to this app to use it for paper trading and arcade features.
          The token will automatically be recognized by your connected wallet.
        </p>
      </div>

      <div className="mt-4 text-center text-xs text-gray-400">
        EMB tokens are used for utility within the Embassy platform
      </div>
    </div>
  );
}

// Wrapped component (keeping the wrapper for consistency with the rest of the app)
export default function SwapToEMB(props) {
  return (
    <JupiterProviderWrapper>
      <SwapToEMBContent {...props} />
    </JupiterProviderWrapper>
  );
}