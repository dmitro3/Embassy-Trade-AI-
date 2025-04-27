'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { startAppTransaction, finishAppTransaction } from '../lib/sentryUtils';
import ErrorBoundary from './ErrorBoundary';
import TechnicalChart from './TechnicalChart';
import { useTheme } from '../lib/ThemeProvider';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey, Transaction, TransactionInstruction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, createTransferInstruction, getAssociatedTokenAddress, TokenAccountNotFoundError } from '@solana/spl-token';
import { toast } from 'react-toastify';
import axios from 'axios';
import TradeTab from './TradeTab';
import PnLTab from './PnLTab';
import TradeInsights from './TradeInsights';
import TradeSignals from './TradeSignals';
import WhaleTracker from './WhaleTracker';
import useTradeWebSocket from '../lib/useTradeWebSocket';
import tokenSniperService from '../lib/tokenSniperService';
import logger, { metrics } from '../lib/logger';
import { BIRDEYE_API_KEY, SOLANA_RPC_URL, RPC_RETRY_CONFIG } from '../lib/apiKeys';
import { safeGetTokenAccount, getTokenBalance } from '../lib/tokenAccountUtils';
import Modal from './Modal';
import ArcadeChess from './ArcadeChess';
import { signInWithGoogle, signOut, onAuthChange } from '../lib/firebase';
import { automateTrade } from '../lib/mcpService';
import TradingBot from '../lib/TradingBot';
import swarmNodeService from '../lib/swarmNodeService';

// Updated token mints with correct addresses
const VALID_TOKEN_MINTS = {
  SOL: "So11111111111111111111111111111111111111112",
  EMB: "D8U9GxmBGs98geNjWkrYf4GUjHqDvMgG5XdL41TXpump", // Updated to correct Pump.fun address
  USDC: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v" // Updated to Devnet USDC address
};

// Devnet test wallet for trading
const DEVNET_TEST_WALLET = 'Gzf96o4iZdPtytRdoqVwo1fbzgQ4AkhwtET3LhG3p8dS';

// Wrap the Trade component with Sentry monitoring
const TradeComponent = () => {
  const { isDarkMode } = useTheme();
  
  // Set up Sentry transaction for component load
  useEffect(() => {
    const transaction = startAppTransaction('trade-component-load', 'ui.render');
    
    // Clean up the transaction when component unmounts
    return () => {
      finishAppTransaction(transaction);
    };
  }, []);
  
  // Sample trade data for chart
  const [sampleTradeData, setSampleTradeData] = useState({
    entry: 150.25,
    stopLoss: 145.50,
    takeProfit: 160.00
  });
  const { connection } = useConnection();
  const { publicKey, signTransaction, sendTransaction, connected } = useWallet();
  const wallet = useWallet();
  const [activeTab, setActiveTab] = useState('trade');
  const [amount, setAmount] = useState('');
  const [price, setPrice] = useState('0.00');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tokenAccounts, setTokenAccounts] = useState({});
  const [tokenBalances, setTokenBalances] = useState({});
  const [tradeHistory, setTradeHistory] = useState([]);
  const [tradeInfo, setTradeInfo] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [autoTradingEnabled, setAutoTradingEnabled] = useState(false);
  const [lastAutomatedTrade, setLastAutomatedTrade] = useState(null);
  const [automationInterval, setAutomationInterval] = useState(null);
  const [mcpStatus, setMcpStatus] = useState('idle');
  const cleanupFnRef = useRef(null);

  // Trading bot state
  const [tradingBot, setTradingBot] = useState(null);
  const [botStatus, setBotStatus] = useState('idle');
  const [botStrategy, setBotStrategy] = useState('combined');
  const [devnetTesting, setDevnetTesting] = useState(false);
  const [aiModel, setAiModel] = useState('grok');
  const [showBotControls, setShowBotControls] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [botTradeHistory, setBotTradeHistory] = useState([]);

  const toggleAutoTrading = async () => {
    if (!connected) {
      alert('Please connect your wallet to use automated trading');
      return;
    }

    try {
      if (autoTradingEnabled) {
        if (automationInterval) {
          clearInterval(automationInterval);
          setAutomationInterval(null);
        }
        setAutoTradingEnabled(false);
        setMcpStatus('idle');
        await logger.info('Auto trading disabled');
      } else {
        setAutoTradingEnabled(true);
        setMcpStatus('initialized');
        await logger.info('Auto trading enabled');

        const interval = setInterval(async () => {
          if (!connected || !window.solana) return;

          try {
            setMcpStatus('processing');
            const tradeAmount = Math.random() * 0.1 + 0.05;

            const tradeResult = await automateTrade(window.solana, tradeAmount);

            if (tradeResult && tradeResult.success) {
              setLastAutomatedTrade({
                time: new Date(),
                amount: tradeResult.tradeAmount,
                market: tradeResult.market,
                price: tradeResult.price,
                txId: tradeResult.txId
              });

              await logger.info(`Automated trade executed: ${JSON.stringify(tradeResult)}`);
              setMcpStatus('success');
            }
          } catch (error) {
            console.error('Auto trading error:', error);
            setMcpStatus('error');
            await logger.error(`Auto trading error: ${error.message}`);
          }
        }, 60000);

        setAutomationInterval(interval);
      }
    } catch (error) {
      console.error('Error toggling auto trading:', error);
      await logger.error(`Error toggling auto trading: ${error.message}`);
    }
  };

  useEffect(() => {
    return () => {
      if (automationInterval) {
        clearInterval(automationInterval);
      }
    };
  }, [automationInterval]);

  // Initialize trading bot
  useEffect(() => {
    if (connected && window.solana) {
      const bot = new TradingBot(window.solana, false, {
        strategy: botStrategy,
        useAI: true
      });
      setTradingBot(bot);
      
      // Generate some mock trade history
      const mockHistory = [
        { time: new Date(Date.now() - 3600000), market: 'SOL/USDC', amount: 0.5, price: 152.34, type: 'buy', profit: 0.02 },
        { time: new Date(Date.now() - 7200000), market: 'JUP/USDC', amount: 10, price: 1.23, type: 'sell', profit: -0.01 },
        { time: new Date(Date.now() - 10800000), market: 'BONK/USDC', amount: 10000, price: 0.00002, type: 'buy', profit: 0.05 }
      ];
      setBotTradeHistory(mockHistory);
    }
  }, [connected, botStrategy]);

  // Start/stop trading bot
  const toggleBot = async () => {
    if (!tradingBot) return;
    
    try {
      if (botStatus === 'idle' || botStatus === 'stopped') {
        setBotStatus('starting');
        setIsAnimating(true);
        
        // Start the bot
        const result = await tradingBot.start();
        
        if (result.success) {
          setBotStatus('running');
          await logger.info(`Trading bot started with ${botStrategy} strategy`);
          toast.success(`Trading bot started with ${botStrategy} strategy`);
        } else {
          setBotStatus('error');
          await logger.error(`Failed to start trading bot: ${result.error}`);
          toast.error(`Failed to start trading bot: ${result.error}`);
        }
      } else if (botStatus === 'running') {
        setBotStatus('stopping');
        
        // Stop the bot
        const result = await tradingBot.stop();
        
        if (result.success) {
          setBotStatus('stopped');
          setIsAnimating(false);
          await logger.info('Trading bot stopped');
          toast.info('Trading bot stopped');
        } else {
          setBotStatus('error');
          await logger.error(`Failed to stop trading bot: ${result.error}`);
          toast.error(`Failed to stop trading bot: ${result.error}`);
        }
      }
    } catch (error) {
      setBotStatus('error');
      await logger.error(`Trading bot error: ${error.message}`);
      toast.error(`Trading bot error: ${error.message}`);
    }
  };

  // Change bot strategy
  const changeStrategy = (strategy) => {
    if (botStatus === 'idle' || botStatus === 'stopped') {
      setBotStrategy(strategy);
      if (tradingBot) {
        tradingBot.options.strategy = strategy;
      }
    } else {
      toast.warning('Stop the bot before changing strategy');
    }
  };

  // Toggle devnet testing
  const toggleDevnetTesting = () => {
    if (botStatus === 'idle' || botStatus === 'stopped') {
      setDevnetTesting(!devnetTesting);
      if (tradingBot) {
        tradingBot.isLive = !devnetTesting;
      }
    } else {
      toast.warning('Stop the bot before toggling devnet testing');
    }
  };

  // Change AI model
  const changeAIModel = (model) => {
    setAiModel(model);
    // In a real implementation, this would configure the AI model
  };

  // Add orange UI effects on component mount
  useEffect(() => {
    const tradePageElement = document.querySelector('.trade-page');
    if (tradePageElement) {
      // Add trade-btn class to all buttons in the trade page
      const buttons = tradePageElement.querySelectorAll('button');
      buttons.forEach(button => {
        button.classList.add('trade-btn');
      });
      
      // Add pulse effect to panels
      const panels = tradePageElement.querySelectorAll('.bg-gray-800, .bg-gray-900');
      panels.forEach(panel => {
        panel.classList.add('pulse-orange');
      });
    }
    
    // Add custom CSS for animations
    const style = document.createElement('style');
    style.textContent = `
      @keyframes pulse-orange {
        0% { box-shadow: 0 0 0 0 rgba(249, 115, 22, 0.4); }
        70% { box-shadow: 0 0 0 10px rgba(249, 115, 22, 0); }
        100% { box-shadow: 0 0 0 0 rgba(249, 115, 22, 0); }
      }
      
      .pulse-orange {
        animation: pulse-orange 2s infinite;
      }
      
      @keyframes float {
        0% { transform: translateY(0px); }
        50% { transform: translateY(-10px); }
        100% { transform: translateY(0px); }
      }
      
      .float {
        animation: float 3s ease-in-out infinite;
      }
      
      .trade-btn {
        transition: all 0.3s;
        position: relative;
        overflow: hidden;
      }
      
      .trade-btn:after {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: linear-gradient(45deg, rgba(249, 115, 22, 0) 0%, rgba(249, 115, 22, 0.3) 50%, rgba(249, 115, 22, 0) 100%);
        transform: translateX(-100%);
      }
      
      .trade-btn:hover:after {
        transform: translateX(100%);
        transition: all 0.5s;
      }
      
      .chart-container {
        position: relative;
      }
      
      .chart-overlay {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        background: linear-gradient(180deg, rgba(249, 115, 22, 0.1) 0%, rgba(0, 0, 0, 0) 100%);
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  return (
    <div className="trade-page bg-gradient-to-b from-gray-900 to-black">
      {/* EMB Trading Banner */}
      <div className="bg-gradient-to-r from-orange-600/30 to-red-600/30 p-4 rounded-lg border border-orange-500/30 mb-4 shadow-lg backdrop-blur-sm">
        <div className="flex flex-col md:flex-row items-center justify-between">
          <div className="mb-3 md:mb-0">
            <h4 className="text-white font-bold flex items-center text-xl uppercase">
              <svg className="w-6 h-6 mr-2 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              $EMB TRADING COMING SOON!
            </h4>
            <p className="text-sm text-gray-300 mt-1">
              Buy on Pump.fun to prepare for the upcoming integration. Currently trading with SOL and USDC on Devnet.
            </p>
          </div>
          <a 
            href="https://pump.fun/D8U9GxmBGs98geNjWkrYf4GUjHqDvMgG5XdL41TXpump"
            target="_blank"
            rel="noopener noreferrer" 
            className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white px-4 py-2 rounded-lg whitespace-nowrap transition-all duration-300 transform hover:scale-105 uppercase font-bold"
          >
            BUY ON PUMP.FUN
          </a>
        </div>
      </div>
      
      <div className="trade-header backdrop-blur-sm bg-gray-900/40 p-6 rounded-lg shadow-lg border border-orange-800/30">
        <h1 className="text-white text-4xl font-black mb-4 uppercase tracking-wider text-center bg-clip-text text-transparent bg-gradient-to-r from-orange-500 to-red-500">TRADEFORCE</h1>
        <div className="trade-tabs flex flex-wrap gap-2 justify-center">
          <button 
            className={`px-6 py-3 rounded-lg transition-all duration-300 ${
              activeTab === 'trade' 
                ? 'bg-orange-600 text-white shadow-lg shadow-orange-500/30' 
                : 'bg-gray-800/70 text-gray-300 hover:bg-orange-500/30'
            } trade-btn uppercase font-bold text-lg`}
            onClick={() => setActiveTab('trade')}
          >
            TRADEFORCE
          </button>
          <button 
            className={`px-6 py-3 rounded-lg transition-all duration-300 ${
              activeTab === 'pnl' 
                ? 'bg-orange-600 text-white shadow-lg shadow-orange-500/30' 
                : 'bg-gray-800/70 text-gray-300 hover:bg-orange-500/30'
            } trade-btn uppercase font-bold text-lg`}
            onClick={() => setActiveTab('pnl')}
          >
            PNL
          </button>
          <button 
            className={`px-6 py-3 rounded-lg transition-all duration-300 ${
              activeTab === 'signals' 
                ? 'bg-orange-600 text-white shadow-lg shadow-orange-500/30' 
                : 'bg-gray-800/70 text-gray-300 hover:bg-orange-500/30'
            } trade-btn uppercase font-bold text-lg`}
            onClick={() => setActiveTab('signals')}
          >
            SIGNALS
          </button>
          <button 
            className={`px-6 py-3 rounded-lg transition-all duration-300 ${
              activeTab === 'whales' 
                ? 'bg-orange-600 text-white shadow-lg shadow-orange-500/30' 
                : 'bg-gray-800/70 text-gray-300 hover:bg-orange-500/30'
            } trade-btn uppercase font-bold text-lg`}
            onClick={() => setActiveTab('whales')}
          >
            WHALE TRACKER
          </button>
        </div>

        <div className="mt-6 flex flex-col md:flex-row items-center justify-center gap-4">
          <button
            onClick={() => setShowBotControls(!showBotControls)}
            className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white px-6 py-3 rounded-lg font-bold uppercase tracking-wider transition-all duration-300 transform hover:scale-105 flex items-center"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            TRADING BOT CONTROLS
          </button>
          
          <div className={`bot-status ${botStatus} flex items-center gap-2 bg-gray-800/50 px-4 py-2 rounded-lg`}>
            <span className={`status-indicator w-3 h-3 rounded-full ${
              botStatus === 'idle' ? 'bg-gray-400' :
              botStatus === 'running' ? 'bg-green-500 animate-pulse' :
              botStatus === 'stopped' ? 'bg-yellow-500' :
              botStatus === 'error' ? 'bg-red-500' :
              botStatus === 'starting' || botStatus === 'stopping' ? 'bg-blue-500 animate-pulse' : 'bg-gray-400'
            }`}></span>
            <span className="status-text uppercase font-bold text-white">
              BOT STATUS: {botStatus.toUpperCase()}
            </span>
          </div>
          
          <button
            onClick={toggleBot}
            disabled={botStatus === 'starting' || botStatus === 'stopping'}
            className={`${
              botStatus === 'running' 
                ? 'bg-red-600 hover:bg-red-700' 
                : 'bg-green-600 hover:bg-green-700'
            } text-white px-6 py-3 rounded-lg font-bold uppercase tracking-wider transition-all duration-300 transform hover:scale-105 flex items-center ${
              botStatus === 'starting' || botStatus === 'stopping' ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {botStatus === 'running' ? (
              <>
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                STOP BOT
              </>
            ) : (
              <>
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                START BOT
              </>
            )}
          </button>
        </div>
      </div>

      {/* Bot Controls Panel */}
      {showBotControls && (
        <div className="bot-controls backdrop-blur-sm bg-gray-900/40 mt-4 p-6 rounded-lg border border-orange-800/30 shadow-lg">
          <h3 className="text-orange-400 font-bold mb-4 uppercase text-xl">TRADING BOT CONFIGURATION</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Strategy Selection */}
            <div className="bg-gray-800/50 p-4 rounded-lg">
              <h4 className="text-white font-bold mb-3 uppercase">STRATEGY</h4>
              <div className="space-y-2">
                {['arbitrage', 'momentum', 'statistical', 'combined'].map(strategy => (
                  <button
                    key={strategy}
                    onClick={() => changeStrategy(strategy)}
                    className={`w-full py-2 px-3 rounded-lg text-left font-bold uppercase ${
                      botStrategy === strategy 
                        ? 'bg-orange-600 text-white' 
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    {strategy.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Devnet Testing */}
            <div className="bg-gray-800/50 p-4 rounded-lg">
              <h4 className="text-white font-bold mb-3 uppercase">ENVIRONMENT</h4>
              <div className="space-y-2">
                <button
                  onClick={toggleDevnetTesting}
                  className={`w-full py-2 px-3 rounded-lg text-left font-bold uppercase ${
                    devnetTesting 
                      ? 'bg-orange-600 text-white' 
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  DEVNET TESTING: {devnetTesting ? 'ON' : 'OFF'}
                </button>
                <div className="bg-gray-700 p-3 rounded-lg">
                  <p className="text-sm text-gray-300">
                    When enabled, trades will be simulated on Devnet without using real funds.
                  </p>
                </div>
              </div>
            </div>
            
            {/* AI Model Selection */}
            <div className="bg-gray-800/50 p-4 rounded-lg">
              <h4 className="text-white font-bold mb-3 uppercase">AI MODEL</h4>
              <div className="space-y-2">
                {['grok', 'chatgpt', 'deepseek'].map(model => (
                  <button
                    key={model}
                    onClick={() => changeAIModel(model)}
                    className={`w-full py-2 px-3 rounded-lg text-left font-bold uppercase ${
                      aiModel === model 
                        ? 'bg-orange-600 text-white' 
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    {model.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Last Trade Info */}
      {lastAutomatedTrade && (
        <div className="last-trade-info backdrop-blur-sm bg-gray-900/40 mt-4 p-6 rounded-lg border border-orange-800/30 shadow-lg">
          <h3 className="text-orange-400 font-bold mb-4 uppercase text-xl">LAST AUTOMATED TRADE</h3>
          <div className="trade-details grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="bg-gray-800/50 p-3 rounded-lg">
              <p className="text-gray-400 text-xs uppercase">Time</p>
              <p className="text-white font-bold">{lastAutomatedTrade.time.toLocaleTimeString()}</p>
            </div>
            <div className="bg-gray-800/50 p-3 rounded-lg">
              <p className="text-gray-400 text-xs uppercase">Market</p>
              <p className="text-white font-bold">{lastAutomatedTrade.market}</p>
            </div>
            <div className="bg-gray-800/50 p-3 rounded-lg">
              <p className="text-gray-400 text-xs uppercase">Amount</p>
              <p className="text-white font-bold">{lastAutomatedTrade.amount} SOL</p>
            </div>
            <div className="bg-gray-800/50 p-3 rounded-lg">
              <p className="text-gray-400 text-xs uppercase">Price</p>
              <p className="text-white font-bold">${lastAutomatedTrade.price}</p>
            </div>
            <div className="bg-gray-800/50 p-3 rounded-lg">
              <p className="text-gray-400 text-xs uppercase">Transaction</p>
              <p className="text-white font-bold">{lastAutomatedTrade.txId.substring(0, 8)}...</p>
            </div>
          </div>
        </div>
      )}

      {/* Technical Chart Section */}
      <div className="mt-4 backdrop-blur-sm bg-gray-900/40 p-6 rounded-lg shadow-lg border border-orange-800/30">
        <div className="chart-container">
          <TechnicalChart 
            tradeData={sampleTradeData}
            symbol="SOL/USD"
            initialTimeframe="15m"
            height={400}
          />
          <div className="chart-overlay"></div>
        </div>
      </div>
      
      {/* Main Content Tabs */}
      <div className="mt-4 backdrop-blur-sm bg-gray-900/40 p-6 rounded-lg shadow-lg border border-orange-800/30">
        {activeTab === 'trade' && <TradeTab devnetWallet={DEVNET_TEST_WALLET} />}
        {activeTab === 'pnl' && <PnLTab />}
        {activeTab === 'signals' && <TradeSignals />}
        {activeTab === 'whales' && <WhaleTracker />}
      </div>
    </div>
  );
};

// Custom error fallback UI for Trade component
const tradeFallback = (error, errorInfo, resetErrorBoundary) => (
  <div className="min-h-screen bg-gradient-to-b from-orange-900 to-black p-8">
    <div className="max-w-4xl mx-auto bg-gray-800/50 backdrop-blur-sm rounded-xl p-8 border border-orange-700/50 shadow-xl">
      <div className="flex items-center mb-6">
        <div className="w-12 h-12 flex items-center justify-center bg-red-500/20 rounded-full mr-4">
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className="h-8 w-8 text-red-400" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" 
            />
          </svg>
        </div>
        <div>
          <h2 className="text-2xl font-bold text-white uppercase">TRADEFORCE ERROR</h2>
          <p className="text-orange-300">We encountered an issue while loading the TradeForce component</p>
        </div>
      </div>
      
      <div className="mb-6 p-4 bg-gray-900/50 rounded-lg border border-gray-700">
        <p className="text-red-300 font-medium mb-2">{error?.message || 'An unexpected error occurred'}</p>
        <p className="text-gray-400 text-sm">
          This error has been automatically reported to our team. We'll work on fixing it as soon as possible.
        </p>
      </div>
      
      <div className="flex flex-wrap gap-4">
        <button
          onClick={resetErrorBoundary}
          className="px-6 py-3 bg-orange-600 hover:bg-orange-500 text-white rounded-lg transition-colors shadow-lg flex items-center uppercase font-bold"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Try Again
        </button>
        
        <button
          onClick={() => window.location.href = '/'}
          className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors shadow-lg flex items-center uppercase font-bold"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          Go to Home
        </button>
      </div>
    </div>
  </div>
);

// Export the Trade component wrapped in an ErrorBoundary
const Trade = () => (
  <ErrorBoundary fallback={tradeFallback}>
    <TradeComponent />
  </ErrorBoundary>
);

export default Trade;
