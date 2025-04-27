'use client';

import React, { useState, useEffect, Suspense, useTransition } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { toast } from 'react-hot-toast';
import { startAppTransaction, finishAppTransaction } from '../lib/sentryUtils.js';
import tradeDecisionEngine from '../lib/tradeDecisionEngine.js';
import tradeExecutionService from '../lib/tradeExecutionService.js';
import marketDataAggregator from '../lib/marketDataAggregator.js';
import logger from '../lib/logger.js';
import dynamic from 'next/dynamic';

/**
 * TradeForceAI Component
 * 
 * This component provides a user interface for the TradeForce AI trading system.
 * It allows users to:
 * - View and manage their watchlist
 * - Get trading recommendations
 * - Execute trades based on recommendations
 * - View their portfolio and trade history
 */
// Dynamically load TradingViewWidget with no SSR to prevent rendering conflicts
const TradingViewWidget = dynamic(
  () => import('react-tradingview-widget').then((mod) => mod.default),
  { ssr: false }
);

const TradeForceAI = () => {
  // Use React 18 transitions for updating state without blocking UI
  const [isPending, startTransition] = useTransition();
  
  // Wallet connection
  const { publicKey, connected, signTransaction } = useWallet();
  
  // Component state
  const [initialized, setInitialized] = useState(false);
  const [loading, setLoading] = useState(false);
  const [watchlist, setWatchlist] = useState([]);
  const [selectedAsset, setSelectedAsset] = useState('');
  const [newAsset, setNewAsset] = useState('');
  const [recommendation, setRecommendation] = useState(null);
  const [portfolio, setPortfolio] = useState(null);
  const [trades, setTrades] = useState([]);
  const [riskLevel, setRiskLevel] = useState('medium');
  const [timeframe, setTimeframe] = useState('1d');
  const [executionPlatform, setExecutionPlatform] = useState('paper');
  const [walletStatus, setWalletStatus] = useState({ connected: false, publicKey: null });
  const [autoApprove, setAutoApprove] = useState(false);
  const [maxAutoApproveAmount, setMaxAutoApproveAmount] = useState(10);
  const [botLogs, setBotLogs] = useState([]);
  const [showLightbulb, setShowLightbulb] = useState(false);
    // Initialize services with error handling and retry logic
  useEffect(() => {
    const initServices = async () => {
      try {
        setLoading(true);
        
        // Create a transaction for monitoring initialization
        const transaction = startAppTransaction('tradeforce-init', 'component.init');
        
        // Safely initialize market data aggregator first
        try {
          if (!marketDataAggregator.isInitialized()) {
            logger.info('Initializing market data aggregator');
            await marketDataAggregator.init();
          }
        } catch (error) {
          logger.warn(`Market data aggregator initialization warning: ${error.message}`);
          // Continue despite errors - don't block the UI
        }
        
      // Safely initialize trade decision engine with retry
        try {
          if (!tradeDecisionEngine.isInitialized()) {
            logger.info('Initializing trade decision engine');
            await tradeDecisionEngine.init();
          }
        } catch (error) {
          logger.warn(`Trade decision engine initialization warning: ${error.message}`);
          // Continue despite errors
        }
        
        // Load bot logs
        try {
          const logsResponse = await fetch('/api/bot-logs');
          if (logsResponse.ok) {
            const logs = await logsResponse.json();
            setBotLogs(logs);
          }
        } catch (error) {
          logger.warn(`Failed to load bot logs: ${error.message}`);
        }
        
        // Finish the transaction
        finishAppTransaction(transaction);
        
        // Initialize trade execution service
        if (!tradeExecutionService.isInitialized()) {
          await tradeExecutionService.init();
        }
        
        // Get watchlist
        const watchlistAssets = tradeDecisionEngine.getWatchlist();
        setWatchlist(watchlistAssets);
        
        // Set default asset if watchlist is not empty
        if (watchlistAssets.length > 0) {
          setSelectedAsset(watchlistAssets[0]);
        }
        
        // Get portfolio
        const portfolioData = tradeExecutionService.getPaperPortfolio();
        setPortfolio(portfolioData);
        
        // Get active trades
        const activeTrades = tradeExecutionService.getActiveTrades();
        setTrades(activeTrades);
        
        // Get wallet state
        const walletState = tradeExecutionService.getWalletState();
        setWalletStatus({
          connected: walletState.connected,
          publicKey: walletState.publicKey
        });
        setAutoApprove(walletState.autoApprove);
        
        setInitialized(true);
        setLoading(false);
      } catch (error) {
        logger.error(`Error initializing TradeForceAI: ${error.message}`);
        toast.error(`Failed to initialize: ${error.message}`);
        setLoading(false);
      }
    };
    
    initServices();
  }, []);
  
  // Update wallet state when Solana wallet connection changes
  useEffect(() => {
    if (connected && publicKey) {
      const success = tradeExecutionService.setWallet({
        publicKey,
        signTransaction,
        signAllTransactions: null // Add this if available from useWallet()
      });
      
      if (success) {
        const walletState = tradeExecutionService.getWalletState();
        setWalletStatus({
          connected: walletState.connected,
          publicKey: walletState.publicKey
        });
        toast.success('Wallet connected');
      }
    } else {
      tradeExecutionService.clearWallet();
      setWalletStatus({ connected: false, publicKey: null });
    }
  }, [connected, publicKey]);
  
  // Function to check for AI consensus and show the lightbulb indicator
  useEffect(() => {
    // Check if there's a recommendation with high confidence
    if (recommendation && recommendation.confidence >= 0.7) {
      // Show the lightbulb indicator when AI consensus is reached
      setShowLightbulb(true);
      
      // Hide the indicator after 5 seconds
      const timer = setTimeout(() => {
        setShowLightbulb(false);
      }, 5000);
      
      // Log the trade signal
      fetch('/api/bot-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'trade_signal',
          message: `AI consensus reached for ${recommendation.asset}: ${recommendation.signal} signal`,
          params: {
            asset: recommendation.asset,
            signal: recommendation.signal,
            confidence: recommendation.confidence,
            stopLoss: recommendation.stopLoss,
            takeProfit: recommendation.takeProfit
          },
          status: 'info',
          timestamp: new Date().toISOString()
        })
      }).catch(err => console.error('Error logging trade signal:', err));
      
      // Clean up timeout
      return () => clearTimeout(timer);
    }
  }, [recommendation]);
  
  // Handle auto-approve toggle
  const handleAutoApproveToggle = (enabled) => {
    const success = tradeExecutionService.setAutoApprove(enabled, maxAutoApproveAmount);
    if (success) {
      setAutoApprove(enabled);
      toast.success(`Auto-approve ${enabled ? 'enabled' : 'disabled'}`);
    } else {
      toast.error('Failed to update auto-approve setting');
    }
  };
  
  // Handle max auto-approve amount change
  const handleMaxAutoApproveChange = (amount) => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    
    const success = tradeExecutionService.setAutoApprove(autoApprove, numAmount);
    if (success) {
      setMaxAutoApproveAmount(numAmount);
      toast.success(`Max auto-approve amount set to ${numAmount} SOL`);
    } else {
      toast.error('Failed to update max auto-approve amount');
    }
  };
  
  // Add asset to watchlist
  const handleAddToWatchlist = async () => {
    if (!newAsset) {
      toast.error('Please enter an asset symbol or address');
      return;
    }
    
    try {
      setLoading(true);
      
      // Validate asset by getting current price
      await marketDataAggregator.getCurrentPrice(newAsset, { forceRefresh: true });
      
      // Add to watchlist
      const success = tradeDecisionEngine.addToWatchlist(newAsset);
      
      if (success) {
        // Update watchlist
        const watchlistAssets = tradeDecisionEngine.getWatchlist();
        setWatchlist(watchlistAssets);
        
        // Set as selected asset
        setSelectedAsset(newAsset);
        
        // Clear input
        setNewAsset('');
        
        toast.success(`Added ${newAsset} to watchlist`);
      } else {
        toast.error(`Failed to add ${newAsset} to watchlist`);
      }
    } catch (error) {
      logger.error(`Error adding ${newAsset} to watchlist: ${error.message}`);
      toast.error(`Failed to add ${newAsset}: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  // Remove asset from watchlist
  const handleRemoveFromWatchlist = async (asset) => {
    try {
      setLoading(true);
      
      // Remove from watchlist
      const success = tradeDecisionEngine.removeFromWatchlist(asset);
      
      if (success) {
        // Update watchlist
        const watchlistAssets = tradeDecisionEngine.getWatchlist();
        setWatchlist(watchlistAssets);
        
        // Update selected asset if needed
        if (selectedAsset === asset) {
          setSelectedAsset(watchlistAssets.length > 0 ? watchlistAssets[0] : '');
        }
        
        toast.success(`Removed ${asset} from watchlist`);
      } else {
        toast.error(`Failed to remove ${asset} from watchlist`);
      }
    } catch (error) {
      logger.error(`Error removing ${asset} from watchlist: ${error.message}`);
      toast.error(`Failed to remove ${asset}: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  /**
   * Generate trading recommendation for selected asset
   */
  const generateRecommendation = async () => {
    if (!selectedAsset) {
      toast.error('Please select an asset first');
      return;
    }
    
    try {
      setLoading(true);
      
      // Use the new analyzeAsset method to get recommendations with stop-loss and take-profit
      const result = await tradeDecisionEngine.analyzeAsset(selectedAsset, {
        timeframe: timeframe,
        requireConsensus: true,
        consensusThreshold: 0.7
      });
      
      setRecommendation(result);
      
      // If there's consensus, show the lightbulb
      if (result.hasConsensus) {
        setShowLightbulb(true);
        setTimeout(() => setShowLightbulb(false), 5000);
      }
      
      toast.success(`Generated recommendation for ${selectedAsset}`);
    } catch (error) {
      console.error('Error generating recommendation:', error);
      toast.error(`Failed to generate recommendation: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  // Execute trade based on recommendation
  const handleExecuteTrade = async () => {
    if (!recommendation) {
      toast.error('No recommendation available');
      return;
    }
    
    if (recommendation.signal === 'neutral') {
      toast.error('Cannot execute trade with neutral signal');
      return;
    }
    
    try {
      setLoading(true);
      
      // Prepare trade parameters
      const tradeParams = {
        platform: executionPlatform,
        symbol: recommendation.asset,
        side: recommendation.signal,
        quantity: recommendation.quantity,
        orderType: 'market'
      };
      
      // Add wallet if using Solana
      if (executionPlatform === 'solana') {
        if (!connected || !publicKey) {
          toast.error('Please connect your wallet to execute Solana trades');
          setLoading(false);
          return;
        }
        
        tradeParams.wallet = {
          publicKey,
          signTransaction
        };
      }
      
      // Execute trade
      const tradeResult = await tradeExecutionService.executeTrade(tradeParams);
      
      // Update portfolio
      const portfolioData = tradeExecutionService.getPaperPortfolio();
      setPortfolio(portfolioData);
      
      // Update trades
      const activeTrades = tradeExecutionService.getActiveTrades();
      setTrades(activeTrades);
      
      toast.success(`Trade executed: ${tradeResult.orderId}`);
    } catch (error) {
      logger.error(`Error executing trade: ${error.message}`);
      toast.error(`Failed to execute trade: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  // Reset paper portfolio
  const handleResetPortfolio = async () => {
    try {
      setLoading(true);
      
      // Reset portfolio
      const portfolioData = tradeExecutionService.resetPaperPortfolio();
      setPortfolio(portfolioData);
      
      toast.success('Portfolio reset');
    } catch (error) {
      logger.error(`Error resetting portfolio: ${error.message}`);
      toast.error(`Failed to reset portfolio: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  // Render loading state
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
        <p className="text-lg">Loading TradeForce AI...</p>
      </div>
    );
  }
  
  // Render initialization error
  if (!initialized) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <p className="font-bold">Error</p>
          <p>Failed to initialize TradeForce AI. Please try again later.</p>
        </div>
        <button
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          onClick={() => window.location.reload()}
        >
          Retry
        </button>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">TradeForce AI Trading System</h1>
      
      {/* Trading alert indicator (lightbulb) */}
      {showLightbulb && (
        <div className="fixed top-4 right-4 z-50">
          <div className="bg-yellow-400 p-3 rounded-full animate-pulse shadow-lg flex items-center">
            <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.757a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM5.05 6.464A1 1 0 106.464 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM5 10a1 1 0 01-1 1H3a1 1 0 110-2h1a1 1 0 011 1zM8 16v-1h4v1a2 2 0 11-4 0zM12 14c.015-.34.208-.646.477-.859a7 7 0 10-4.954 0c.27.213.462.519.476.859h4.002z" />
            </svg>
            <span className="ml-2 text-white font-bold">Trade Signal!</span>
          </div>
        </div>
      )}
      
      {/* Main grid layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column - Watchlist and Asset Selection */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <h2 className="text-xl font-semibold mb-4">Watchlist</h2>
          
          {/* Add to watchlist */}
          <div className="flex mb-4">
            <input
              type="text"
              className="flex-grow px-3 py-2 border rounded-l-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Asset symbol or address"
              value={newAsset}
              onChange={(e) => setNewAsset(e.target.value)}
            />
            <button
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-r-lg"
              onClick={handleAddToWatchlist}
            >
              Add
            </button>
          </div>
          
          {/* Watchlist items */}
          <div className="space-y-2 mb-6">
            {watchlist.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400">No assets in watchlist</p>
            ) : (
              watchlist.map((asset) => (
                <div
                  key={asset}
                  className={`flex justify-between items-center p-2 rounded ${
                    selectedAsset === asset ? 'bg-blue-100 dark:bg-blue-900' : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <button
                    className="flex-grow text-left"
                    onClick={() => setSelectedAsset(asset)}
                  >
                    {asset}
                  </button>
                  <button
                    className="text-red-500 hover:text-red-700"
                    onClick={() => handleRemoveFromWatchlist(asset)}
                  >
                    <span className="sr-only">Remove</span>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              ))
            )}
          </div>
          
          {/* Wallet Status */}
          <div className="mb-6 p-3 border rounded-lg bg-gray-50 dark:bg-gray-700">
            <h3 className="text-lg font-semibold mb-2">Wallet Status</h3>
            <div className="flex items-center mb-2">
              <div className={`w-3 h-3 rounded-full mr-2 ${walletStatus.connected ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span>{walletStatus.connected ? 'Connected' : 'Not Connected'}</span>
            </div>
            {walletStatus.connected && walletStatus.publicKey && (
              <div className="text-xs text-gray-500 break-all">
                {walletStatus.publicKey.substring(0, 8)}...{walletStatus.publicKey.substring(walletStatus.publicKey.length - 8)}
              </div>
            )}
          </div>
          
          {/* Auto-approve Settings */}
          <div className="mb-6 p-3 border rounded-lg bg-gray-50 dark:bg-gray-700">
            <h3 className="text-lg font-semibold mb-2">Auto-approve</h3>
            <div className="flex items-center justify-between mb-3">
              <span>Enable auto-approve</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer"
                  checked={autoApprove}
                  onChange={(e) => handleAutoApproveToggle(e.target.checked)}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
              </label>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Max amount (SOL)</label>
              <div className="flex">
                <input
                  type="number"
                  className="flex-grow px-3 py-2 border rounded-l-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="10"
                  value={maxAutoApproveAmount}
                  onChange={(e) => setMaxAutoApproveAmount(e.target.value)}
                  min="0.1"
                  step="0.1"
                />
                <button
                  className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-r-lg"
                  onClick={() => handleMaxAutoApproveChange(maxAutoApproveAmount)}
                >
                  Set
                </button>
              </div>
            </div>
          </div>
          
          {/* Analysis settings */}
          <h3 className="text-lg font-semibold mb-2">Analysis Settings</h3>
          
          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium mb-1">Timeframe</label>
              <select
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={timeframe}
                onChange={(e) => setTimeframe(e.target.value)}
              >
                <option value="1h">1 Hour</option>
                <option value="4h">4 Hours</option>
                <option value="1d">1 Day</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Risk Level</label>
              <select
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={riskLevel}
                onChange={(e) => setRiskLevel(e.target.value)}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>
          
          {/* Get recommendation button */}
          <button
            className="w-full bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg mb-4"
            onClick={generateRecommendation}
            disabled={!selectedAsset}
          >
            Get Recommendation
          </button>
        </div>
        
        {/* Middle column - Chart and Trading Actions */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <h2 className="text-xl font-semibold mb-4">Market Data</h2>
          
          {/* Live TradingView Chart */}
          <div className="mb-6 rounded overflow-hidden">
            <Suspense fallback={<div className="h-80 bg-gray-100 dark:bg-gray-700 animate-pulse flex items-center justify-center">Loading Chart...</div>}>
              <TradingViewWidget
                symbol={selectedAsset ? `${selectedAsset}USD` : "SOLUSD"}
                theme="dark"
                autosize
                interval="60"
                timezone="Etc/UTC"
                style="1"
                locale="en"
                toolbar_bg="#f1f3f6"
                enable_publishing={false}
                hide_top_toolbar={false}
                save_image={false}
                container_id="tradingview_chart"
              />
            </Suspense>
          </div>
          
          {/* Trading recommendations and actions */}
          <h2 className="text-xl font-semibold mb-4">Trading Recommendation</h2>
          
          {recommendation ? (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="font-medium">Asset:</span>
                <span>{recommendation.asset}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="font-medium">Current Price:</span>
                <span>${recommendation.currentPrice.toFixed(4)}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="font-medium">Signal:</span>
                <span className={`font-bold ${
                  recommendation.signal === 'buy' ? 'text-green-500' :
                  recommendation.signal === 'sell' ? 'text-red-500' :
                  'text-gray-500'
                }`}>
                  {recommendation.signal.toUpperCase()}
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="font-medium">Strength:</span>
                <div className="w-32 bg-gray-200 rounded-full h-2.5">
                  <div
                    className={`h-2.5 rounded-full ${
                      recommendation.signal === 'buy' ? 'bg-green-500' :
                      recommendation.signal === 'sell' ? 'bg-red-500' :
                      'bg-gray-500'
                    }`}
                    style={{ width: `${recommendation.confidence * 100}%` }}
                  ></div>
                </div>
              </div>
              
              {/* Stop-Loss and Take-Profit Targets */}
              {recommendation.stopLoss && (
                <div className="flex justify-between items-center">
                  <span className="font-medium">Stop Loss:</span>
                  <span className="text-red-500 font-semibold">${recommendation.stopLoss.toFixed(4)}</span>
                </div>
              )}
              
              {recommendation.takeProfit && (
                <div className="flex justify-between items-center">
                  <span className="font-medium">Take Profit:</span>
                  <span className="text-green-500 font-semibold">${recommendation.takeProfit.toFixed(4)}</span>
                </div>
              )}
              
              {recommendation.riskReward && (
                <div className="flex justify-between items-center">
                  <span className="font-medium">Risk/Reward:</span>
                  <span className="font-semibold">{recommendation.riskReward.toFixed(2)}</span>
                </div>
              )}
              
              <div className="flex justify-between items-center">
                <span className="font-medium">Recommended Quantity:</span>
                <span>{recommendation.quantity ? recommendation.quantity.toFixed(4) : 'N/A'}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="font-medium">Timestamp:</span>
                <span>{new Date(recommendation.timestamp).toLocaleString()}</span>
              </div>
              
              <hr className="my-4" />
              
              <div>
                <h3 className="text-lg font-semibold mb-2">Execution Settings</h3>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-1">Platform</label>
                  <select
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={executionPlatform}
                    onChange={(e) => setExecutionPlatform(e.target.value)}
                  >
                    <option value="paper">Paper Trading</option>
                    <option value="solana">Solana</option>
                  </select>
                </div>
                
                <button
                  className={`w-full font-bold py-2 px-4 rounded-lg ${
                    recommendation.signal === 'neutral' ?
                    'bg-gray-300 cursor-not-allowed' :
                    recommendation.signal === 'buy' ?
                    'bg-green-500 hover:bg-green-700 text-white' :
                    'bg-red-500 hover:bg-red-700 text-white'
                  }`}
                  onClick={handleExecuteTrade}
                  disabled={recommendation.signal === 'neutral'}
                >
                  {recommendation.signal === 'buy' ? 'Execute Buy' :
                   recommendation.signal === 'sell' ? 'Execute Sell' :
                   'No Action'}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-64">
              <p className="text-gray-500 dark:text-gray-400 mb-4">No recommendation available</p>
              <p className="text-sm text-gray-400 dark:text-gray-500">Select an asset and click "Get Recommendation"</p>
            </div>
          )}
        </div>
        
        {/* Right column - Portfolio and Bot Logs */}
        <div className="flex flex-col gap-6">
          {/* Portfolio section */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Portfolio</h2>
              <button
                className="text-sm bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 px-3 py-1 rounded"
                onClick={handleResetPortfolio}
              >
                Reset
              </button>
            </div>
            
            {portfolio ? (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Cash:</span>
                  <span>${portfolio.cash.toFixed(2)}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="font-medium">Portfolio Value:</span>
                  <span>${portfolio.portfolioValue.toFixed(2)}</span>
                </div>
                
                <h3 className="text-lg font-semibold mt-6 mb-2">Positions</h3>
                
                {portfolio.positions.length === 0 ? (
                  <p className="text-gray-500 dark:text-gray-400">No positions</p>
                ) : (
                  <div className="space-y-2">
                    {portfolio.positions.map((position) => (
                      <div
                        key={position.asset}
                        className="border rounded-lg p-3"
                      >
                        <div className="flex justify-between items-center">
                          <span className="font-medium">{position.asset}</span>
                          <span className={position.unrealizedPnLPercent >= 0 ? 'text-green-500' : 'text-red-500'}>
                            {position.unrealizedPnLPercent >= 0 ? '+' : ''}
                            {position.unrealizedPnLPercent.toFixed(2)}%
                          </span>
                        </div>
                        
                        <div className="flex justify-between items-center text-sm text-gray-500 dark:text-gray-400">
                          <span>{position.quantity.toFixed(4)} @ ${position.averagePrice.toFixed(4)}</span>
                          <span>${position.marketValue.toFixed(2)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                <h3 className="text-lg font-semibold mt-6 mb-2">Recent Transactions</h3>
                
                {portfolio.transactions.length === 0 ? (
                  <p className="text-gray-500 dark:text-gray-400">No transactions</p>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {portfolio.transactions.slice(-5).reverse().map((transaction) => (
                      <div
                        key={transaction.id}
                        className="border rounded-lg p-3"
                      >
                        <div className="flex justify-between items-center">
                          <span className="font-medium">{transaction.asset}</span>
                          <span className={transaction.side === 'buy' ? 'text-green-500' : 'text-red-500'}>
                            {transaction.side.toUpperCase()}
                          </span>
                        </div>
                        
                        <div className="flex justify-between items-center text-sm text-gray-500 dark:text-gray-400">
                          <span>{transaction.quantity.toFixed(4)} @ ${transaction.price.toFixed(4)}</span>
                          <span>${transaction.value.toFixed(2)}</span>
                        </div>
                        
                        <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                          {new Date(transaction.timestamp).toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center h-64">
                <p className="text-gray-500 dark:text-gray-400">Loading portfolio...</p>
              </div>
            )}
          </div>
          
          {/* Bot Logs Section */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <h2 className="text-xl font-semibold mb-4">Bot Activity Logs</h2>
            <div className="max-h-80 overflow-y-auto space-y-2">
              {botLogs.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400">No bot activity recorded yet.</p>
              ) : (
                botLogs.map((log, index) => (
                  <div key={index} className="bg-gray-50 dark:bg-gray-700 p-2 rounded">
                    <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400">
                      <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        log.status === 'completed' ? 'bg-green-100 text-green-800' : 
                        log.status === 'error' ? 'bg-red-100 text-red-800' : 
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {log.status}
                      </span>
                    </div>
                    <p className="mt-1 text-sm">{log.action}: {log.message || ''}</p>
                    {log.result && (
                      <div className="mt-1 text-xs text-gray-600 dark:text-gray-300">
                        Result: {typeof log.result === 'object' ? JSON.stringify(log.result) : log.result}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
            <button 
              className="mt-4 w-full bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
              onClick={() => {
                fetch('/api/bot-logs')
                  .then(res => res.json())
                  .then(logs => setBotLogs(logs))
                  .catch(error => toast.error(`Failed to fetch logs: ${error.message}`));
              }}
            >
              Refresh Logs
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TradeForceAI;
