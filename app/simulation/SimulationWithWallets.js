'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { toast, Toaster } from 'react-hot-toast';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

// Import our custom components
import SolanaWalletModalProvider from '../../components/SolanaWalletModalProvider';
import WalletBalanceDisplay from '../../components/WalletBalanceDisplay';
import MLConsensusTrading from '../../components/MLConsensusTrading';
import PaperTradingExecutor from '../../components/PaperTradingExecutor';

// Project components (using relative paths to avoid @/ prefix issues)
import CoinSelector from '../../components/CoinSelector';
import useTradeSignalSimulator from '../../lib/simulateTradeSignals';

// Dynamically import components with browser APIs to avoid SSR issues
const TradingSimulator = dynamic(
  () => import('../../components/TradingSimulator'),
  { ssr: false, loading: () => <p className="text-gray-400">Loading trading simulator...</p> }
);

// Generate a safer key for trades
const generateTradeKey = (trade) => {
  // Using a combination of truly unique values to ensure key uniqueness
  const randomPart = Math.random().toString(36).substring(2, 10);
  return `trade-${trade.id}-${trade.status}-${randomPart}-${Date.now()}`;
};

// Wrapper component for simulation page with wallet integration
const TradeSimulationWithWallets = () => {
  // Network selection (defaulting to devnet for paper trading)
  const [selectedNetwork, setSelectedNetwork] = useState(WalletAdapterNetwork.Devnet);
  
  return (
    <SolanaWalletModalProvider network={selectedNetwork} autoConnect={true}>
      <SimulationPageContent 
        network={selectedNetwork} 
        onNetworkChange={setSelectedNetwork} 
      />
    </SolanaWalletModalProvider>
  );
};

// Main simulation page content
const SimulationPageContent = ({ network, onNetworkChange }) => {
  const { publicKey, connected } = useWallet();
  const walletAddress = publicKey ? publicKey.toString() : null;
  
  // State for selected coin and balances
  const [selectedCoin, setSelectedCoin] = useState('SOL');
  const [mockBalances, setMockBalances] = useState({
    SOL: 100,
    USDC: 100,
    JITO: 100,
    EMB: 0
  });
  
  // ML trading states
  const [currentTradeSignal, setCurrentTradeSignal] = useState(null);
  const [autoTradeEnabled, setAutoTradeEnabled] = useState(false);
  const [tradeHistory, setTradeHistory] = useState([]);
  
  // App state
  const [isLoading, setIsLoading] = useState(false);
  const [networkSwitchLoading, setNetworkSwitchLoading] = useState(false);
  
  // Handle network change
  const handleNetworkChange = (newNetwork) => {
    setNetworkSwitchLoading(true);
    onNetworkChange(newNetwork);
    
    // Simulate network switching delay
    setTimeout(() => {
      setNetworkSwitchLoading(false);
      toast.success(`Switched to ${newNetwork}`);
    }, 1000);
  };
  
  // Handle trade signal from ML consensus
  const handleTradeSignal = (signal) => {
    console.log('Received trade signal from ML consensus:', signal);
    setCurrentTradeSignal(signal);
    
    // Add to trade history if auto-trade is enabled
    if (autoTradeEnabled) {
      const newTrade = {
        ...signal,
        key: generateTradeKey({ ...signal, status: 'executed' }),
        status: 'executed',
        timestamp: Date.now()
      };
      
      setTradeHistory(prev => [newTrade, ...prev]);
    }
  };
  
  // Handle auto-trade toggle
  const handleAutoTradeToggle = (enabled) => {
    setAutoTradeEnabled(enabled);
    
    if (enabled) {
      toast.success('Auto-trading enabled. Trades will be executed automatically.');
    } else {
      toast.info('Auto-trading disabled. You will need to manually confirm trades.');
    }
  };
  
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Toast notifications */}
      <Toaster position="top-right" />
      
      {/* Beta Banner */}
      <div className="bg-amber-500 text-black p-2 text-center font-medium">
        Beta Mode: Proof of Concept for Solana Early Adopters
      </div>
      
      {/* Navigation */}
      <nav className="bg-gray-800/80 backdrop-blur-sm p-4 sticky top-0 z-50 shadow-lg">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex space-x-6">
            <Link href="/" className="text-white hover:text-blue-300">Dashboard</Link>
            <Link href="/simulation" className="text-blue-400 hover:text-blue-300 font-medium">Simulation</Link>
            <Link href="/tradeforce" className="text-white hover:text-blue-300">TradeForce</Link>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Network selector */}
            <div className="hidden md:block">
              <select 
                value={network}
                onChange={(e) => handleNetworkChange(e.target.value)}
                disabled={networkSwitchLoading}
                className="bg-gray-700 border border-gray-600 rounded-md px-3 py-1.5 text-sm"
              >
                <option value={WalletAdapterNetwork.Devnet}>Devnet</option>
                <option value={WalletAdapterNetwork.Testnet}>Testnet</option>
                <option value={WalletAdapterNetwork.Mainnet}>Mainnet</option>
              </select>
            </div>
            
            {/* Wallet connect button */}
            <WalletMultiButton className="!bg-blue-600 hover:!bg-blue-700" />
          </div>
        </div>
      </nav>
      
      <main className="max-w-7xl mx-auto p-6">
        {/* Wallet Status Section */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-4">Embassy Trading Simulator</h1>
          
          <div className="bg-gray-800 p-4 rounded-lg shadow-lg">
            <h2 className="text-xl font-semibold mb-3">Wallet Connection</h2>
            
            {connected ? (
              <div className="flex flex-col md:flex-row gap-4">
                <WalletBalanceDisplay className="flex-1" />
                
                <div className="bg-green-500/10 text-green-400 p-3 rounded-lg border border-green-500/30 flex-1 flex items-center">
                  <div className="mr-3">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium">Wallet Connected</p>
                    <p className="text-sm">Ready for paper trading on {network}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-gray-700/50 p-4 rounded-lg">
                <p className="text-center text-gray-300 mb-4">
                  Connect your wallet to start paper trading with ML-powered signals
                </p>
                <div className="flex justify-center">
                  <WalletMultiButton className="!bg-blue-600 hover:!bg-blue-700" />
                </div>
              </div>
            )}
          </div>
        </div>
        
        {connected && (
          <>
            {/* ML Consensus & Trading Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
              {/* Left: ML Consensus */}
              <div className="lg:col-span-1">
                <MLConsensusTrading 
                  onTradeSignal={handleTradeSignal}
                  onAutoTrade={handleAutoTradeToggle}
                  tradingEnabled={connected}
                />
              </div>
              
              {/* Right: Paper Trading Execution */}
              <div className="lg:col-span-2">
                <PaperTradingExecutor 
                  tradeSignal={currentTradeSignal}
                  autoTradeEnabled={autoTradeEnabled}
                />
              </div>
            </div>
            
            {/* Trading Simulator */}
            <div className="bg-gray-800 p-6 rounded-xl shadow-lg">
              <h2 className="text-2xl font-bold mb-4">Trading Simulator</h2>
              <div>
                <CoinSelector 
                  selectedCoin={selectedCoin} 
                  onCoinChange={setSelectedCoin} 
                />
                
                <TradingSimulator 
                  onSuccessfulTrade={(trade) => {
                    const tradeWithCoin = { ...trade, tradingCoin: selectedCoin };
                    setTradeHistory(prev => [...prev, tradeWithCoin]);
                  }}
                  selectedCoin={selectedCoin}
                  coinBalance={mockBalances[selectedCoin]}
                />
              </div>
            </div>
          </>
        )}
        
        {/* Download App Button */}
        <div className="mt-8 text-center">
          <a 
            href="https://embassyai.xyz/" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-colors inline-flex items-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download App for More Features
          </a>
        </div>
      </main>
    </div>
  );
};

export default TradeSimulationWithWallets;
