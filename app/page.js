'use client';

import { useState, useEffect } from 'react';
import {
  tradingFlow,
  conversionFlow,
  conversionEmbToSolFlow,
  marketDataPollingFlow,
  connectWalletStep,
  disconnectWalletStep,
  fetchBalancesStep,
  detectWallets,
} from './motiaWorkflow';

export default function Home() {
  const [walletAddress, setWalletAddress] = useState(null);
  const [walletProvider, setWalletProvider] = useState(null);
  const [marketData, setMarketData] = useState(null);
  const [solBalance, setSolBalance] = useState(0);
  const [embBalance, setEmbBalance] = useState(0);
  const [availableWallets, setAvailableWallets] = useState([]);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');

  useEffect(() => {
    const wallets = detectWallets();
    setAvailableWallets(wallets);

    if (window.solana?.isConnected) {
      reconnectWallet();
    }
  }, []);

  const reconnectWallet = async () => {
    try {
      setConnectionStatus('connecting');
      const result = await connectWalletStep();
      if (result.success) {
        setWalletAddress(result.walletAddress);
        setWalletProvider('Phantom'); // Assuming Phantom for now
        const balanceResult = await fetchBalancesStep(result.walletAddress);
        if (balanceResult.success) {
          setSolBalance(balanceResult.solBalance);
          setEmbBalance(balanceResult.embBalance);
        }
        setConnectionStatus('connected');
      } else {
        setConnectionStatus('error');
      }
    } catch (err) {
      console.error('Reconnection Error:', err);
      setConnectionStatus('error');
    }
  };

  const disconnectWallet = async () => {
    try {
      const result = await disconnectWalletStep();
      if (result.success) {
        setWalletAddress(null);
        setSolBalance(0);
        setEmbBalance(0);
        setWalletProvider(null);
        setConnectionStatus('disconnected');
        alert('Wallet disconnected successfully!');
      } else {
        alert('Failed to disconnect wallet: ' + result.error);
      }
    } catch (err) {
      console.error('Wallet Disconnection Error:', err);
      alert('Failed to disconnect wallet: ' + err.message);
    }
  };

  const connectWallet = async () => {
    try {
      setConnectionStatus('connecting');
      const result = await connectWalletStep();
      if (result.success) {
        setWalletAddress(result.walletAddress);
        setWalletProvider('Phantom'); // Assuming Phantom for now
        const balanceResult = await fetchBalancesStep(result.walletAddress);
        if (balanceResult.success) {
          setSolBalance(balanceResult.solBalance);
          setEmbBalance(balanceResult.embBalance);
        } else {
          alert('Failed to fetch balances: ' + balanceResult.error);
        }
        setConnectionStatus('connected');
        alert('Wallet connected successfully!');
      } else {
        setConnectionStatus('error');
        alert('Failed to connect wallet: ' + result.error);
      }
    } catch (err) {
      console.error('Wallet Connection Error:', err);
      setConnectionStatus('error');
      alert('Failed to connect wallet: ' + err.message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Navigation Bar */}
      <nav className="bg-gray-800 p-4 flex justify-between items-center">
        <div className="flex space-x-4">
          <a href="#" className="text-white hover:text-gray-300">Dashboard</a>
          <a href="#" className="text-white hover:text-gray-300">Trade</a>
          <a href="#" className="text-white hover:text-gray-300">Strategies</a>
          <a href="#" className="text-white hover:text-gray-300">Scanner</a>
          <a href="#" className="text-white hover:text-gray-300">Tokenomics</a>
        </div>
        <div className="flex items-center space-x-4">
          {walletAddress ? (
            <>
              <span>Connected: {walletProvider} ({walletAddress.slice(0, 6)}...{walletAddress.slice(-4)})</span>
              <button
                onClick={disconnectWallet}
                className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded"
              >
                Disconnect
              </button>
            </>
          ) : (
            <button
              onClick={connectWallet}
              className={`${
                connectionStatus === 'connecting' ? 'bg-gray-600' : 'bg-blue-600 hover:bg-blue-700'
              } text-white font-semibold py-2 px-4 rounded`}
              disabled={connectionStatus === 'connecting'}
            >
              {connectionStatus === 'connecting' ? 'Connecting...' : 'Connect Wallet'}
            </button>
          )}
        </div>
      </nav>
      {/* Hero Section */}
      <header className="text-center py-16 bg-gray-800">
        <h1 className="text-5xl font-bold mb-4">Professional Trading Made Simple on Solana</h1>
        <p className="text-lg mb-6">Trade smarter with advanced strategies and seamless wallet integration.</p>
        <div className="space-x-4">
          <button className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-6 rounded">
            Get Started
          </button>
          <button className="bg-gray-700 hover:bg-gray-600 text-white font-semibold py-2 px-6 rounded">
            Learn Trading Strategies
          </button>
        </div>
      </header>
      {/* Trading Strategies Section */}
      <section className="py-16 px-8">
        <h2 className="text-3xl font-bold mb-8 text-center">Trading Strategies</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-gray-800 p-6 rounded-lg">
            <h3 className="text-xl font-semibold mb-2">Moving Average Crossover</h3>
            <p className="text-gray-400 mb-4">A strategy based on crossing moving averages to identify trends.</p>
            <button className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded">
              Learn More
            </button>
          </div>
          <div className="bg-gray-800 p-6 rounded-lg">
            <h3 className="text-xl font-semibold mb-2">RSI Divergence</h3>
            <p className="text-gray-400 mb-4">Identify potential reversals using RSI divergence signals.</p>
            <button className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded">
              Learn More
            </button>
          </div>
          <div className="bg-gray-800 p-6 rounded-lg">
            <h3 className="text-xl font-semibold mb-2">Breakout Trading</h3>
            <p className="text-gray-400 mb-4">Capture profits from price breakouts in volatile markets.</p>
            <button className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded">
              Learn More
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}