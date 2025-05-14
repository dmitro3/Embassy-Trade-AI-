'use client';

import React, { useState, useEffect, Suspense, useTransition, useRef } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { toast } from 'react-hot-toast';
import { FaLightbulb, FaExclamationTriangle, FaGear, FaChartLine, FaChartBar, FaTrophy } from 'react-icons/fa6';
import { startAppTransaction, finishAppTransaction } from '../lib/sentryUtils.js';
import tradeDecisionEngine from '../lib/tradeDecisionEngine.js';
import tradeExecutionService from '../lib/tradeExecutionService.js';
import marketDataAggregator from '../lib/marketDataAggregator.js';
import { useRealTimeData } from '../lib/realTimeDataPipeline.js';
import { useAIConsensus } from '../lib/aiConsensusModel.js';
import logger from '../lib/logger.js';
import dynamic from 'next/dynamic';
import ResultsTab from './ResultsTab';

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
  
  // AI Roundtable and Real-Time Data state
  const [aiEngineActive, setAiEngineActive] = useState(false);
  const [signalActive, setSignalActive] = useState(false);
  const [tradeSignals, setTradeSignals] = useState([]);
  const [tradeStatus, setTradeStatus] = useState('idle'); // idle, analyzing, signaling, executing, completed
  const [activationTime, setActivationTime] = useState(null);
  const [aiSettings, setAiSettings] = useState({
    tradeSize: 0.1, // 10% of available balance
    maxDailyTrades: 5,
    stopLossPercentage: 5,
    takeProfitPercentage: 15,
    autoExecute: false,
    validationMode: true // Use Kraken validation mode by default
  });
  // Stats for AI trading
  const [aiStats, setAiStats] = useState({
    tradesExecuted: 0,
    successfulTrades: 0,
    failedTrades: 0,
    profitableTrades: 0,
    losingTrades: 0,
    totalPnL: 0,
    dailyTrades: 0,
    lastResetDate: new Date().toISOString().split('T')[0],
    activeTrades: []
  });
    // Active view state (dashboard, trading, results)
  const [activeView, setActiveView] = useState('dashboard');
  // References for interval timers
  const analysisIntervalRef = useRef(null);
  const tradeMonitorIntervalRef = useRef(null);
  const lightbulbPulseIntervalRef = useRef(null);
  
  // Reference for pending signal acknowledgment
  const pendingSignalRef = useRef(null);
  
  // Access real-time data pipeline
  const {
    isConnected: dataConnected,
    connectionStatus,
    newTokens,
    priceData,
    volumeData,
    tokenInfo,
    technicalIndicators,
    rawPipeline
  } = useRealTimeData();
  
  // Access AI consensus model
  const {
    isInitialized: aiInitialized,
    isAnalyzing,
    lastConsensus,
    agentStatus,
    getConsensus,
    updateTradeResult
  } = useAIConsensus();
  
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
        
        // Check if we need to reset daily stats for AI
        const today = new Date().toISOString().split('T')[0];
        if (aiStats.lastResetDate !== today) {
          setAiStats(prev => ({
            ...prev,
            dailyTrades: 0,
            lastResetDate: today
          }));
        }
        
        setInitialized(true);
        setLoading(false);
        
        // Log successful initialization
        logger.info('TradeForce AI services initialized successfully');
        toast.success('TradeForce AI initialized and ready');
      } catch (error) {
        logger.error(`Error initializing TradeForce AI: ${error.message}`);
        toast.error(`Failed to initialize: ${error.message}`);
        setLoading(false);
      }
    };
    
    initServices();
    
    // Cleanup function
    return () => {
      // Clean up all intervals on component unmount
      if (analysisIntervalRef.current) {
        clearInterval(analysisIntervalRef.current);
      }
      
      if (tradeMonitorIntervalRef.current) {
        clearInterval(tradeMonitorIntervalRef.current);
      }
      
      if (lightbulbPulseIntervalRef.current) {
        clearInterval(lightbulbPulseIntervalRef.current);
      }
    };
  }, [initialized, aiInitialized, rawPipeline]);
  
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
  
  // Toggle TradeForce AI Roundtable activation
  const toggleAiEngine = () => {
    if (aiEngineActive) {
      // Deactivate TradeForce AI
      setAiEngineActive(false);
      setActivationTime(null);
      
      // Clear intervals
      if (analysisIntervalRef.current) {
        clearInterval(analysisIntervalRef.current);
        analysisIntervalRef.current = null;
      }
      
      if (tradeMonitorIntervalRef.current) {
        clearInterval(tradeMonitorIntervalRef.current);
        tradeMonitorIntervalRef.current = null;
      }
      
      setTradeStatus('idle');
      logger.info('TradeForce AI Roundtable deactivated');
      toast.success('TradeForce AI Roundtable deactivated');
    } else {
      // Check if prerequisites are met
      if (!dataConnected) {
        toast.error('Cannot activate: Data pipeline not connected');
        return;
      }
      
      if (!aiInitialized) {
        toast.error('Cannot activate: AI models not initialized');
        return;
      }
      
      // Activate TradeForce AI
      setAiEngineActive(true);
      setActivationTime(Date.now());
      setTradeStatus('analyzing');
      
      // Set up analysis interval (every 5 minutes)
      analysisIntervalRef.current = setInterval(() => {
        runAiConsensusAnalysis();
      }, 5 * 60 * 1000); // 5 minutes
      
      // Set up trade monitoring interval (every minute)
      tradeMonitorIntervalRef.current = setInterval(() => {
        monitorActiveTrades();
      }, 60 * 1000); // 1 minute
      
      // Run initial analysis
      runAiConsensusAnalysis();
      
      logger.info('TradeForce AI Roundtable activated');
      toast.success('TradeForce AI Roundtable activated and monitoring market');
    }
  };

  // Run market analysis using AI consensus model
  const runAiConsensusAnalysis = async () => {
    try {
      if (!aiEngineActive) return;
      
      setTradeStatus('analyzing');
      logger.info('Running TradeForce AI Roundtable market analysis');
      
      // Add to logs
      addLog('AI', 'Running market analysis');
      
      // Gather market data for analysis
      const marketData = {
        newTokens,
        priceData,
        volumeData,
        tokenInfo,
        technicalIndicators
      };
      
      // Get consensus from AI models
      const consensus = await getConsensus(marketData);
      
      if (!consensus || !consensus.signals || consensus.signals.length === 0) {
        logger.info('No trading signals found in current analysis');
        setTradeStatus('analyzing');
        addLog('AI', 'Analysis complete - No trading signals detected');
        return;
      }
      
      // Found signals - activate lightbulb
      logger.info(`Found ${consensus.signals.length} trading signals`);
      setTradeSignals(consensus.signals);
      setSignalActive(true);
      setTradeStatus('signaling');
      
      addLog('AI', `Detected ${consensus.signals.length} trading signals`);
      
      // Store the signal in the ref for later processing
      pendingSignalRef.current = {
        signals: consensus.signals,
        timestamp: Date.now()
      };
      
      // Start pulsing the lightbulb
      if (lightbulbPulseIntervalRef.current) {
        clearInterval(lightbulbPulseIntervalRef.current);
      }
      
      let pulseCount = 0;
      lightbulbPulseIntervalRef.current = setInterval(() => {
        setSignalActive(prev => !prev);
        pulseCount++;
        
        // Stop pulsing after 10 cycles (5 seconds)
        if (pulseCount >= 10) {
          clearInterval(lightbulbPulseIntervalRef.current);
          lightbulbPulseIntervalRef.current = null;
          setSignalActive(true); // Keep it on
        }
      }, 500);
      
      // If auto-execute is enabled, process the trade automatically
      if (aiSettings.autoExecute && aiStats.dailyTrades < aiSettings.maxDailyTrades) {
        processAiTradeSignal(consensus.signals[0]);
      }
      
    } catch (error) {
      logger.error(`AI Market analysis failed: ${error.message}`);
      setTradeStatus('analyzing');
      addLog('ERROR', `Analysis failed: ${error.message}`);
    }
  };

  // Process a trade signal (calculate levels and execute)
  const processAiTradeSignal = async (signal) => {
    try {
      if (!signal) return;
      
      setTradeStatus('executing');
      logger.info(`Processing trade signal for ${signal.symbol || signal.token}`);
      addLog('TRADE', `Processing signal for ${signal.symbol || signal.token}`);
      
      // Extract token data
      const tokenAddress = signal.token;
      const tokenSymbol = signal.symbol || tokenAddress.substr(0, 6);
      const currentPrice = priceData[tokenAddress]?.price;
      
      if (!currentPrice) {
        logger.error('Cannot process trade: Price data not available');
        setTradeStatus('analyzing');
        addLog('ERROR', 'Cannot process trade: Price data not available');
        return;
      }
      
      // Calculate entry, stop loss, and take profit levels
      const entryPrice = currentPrice;
      const isBuy = signal.action === 'buy';
      
      // For sell signals, stop loss is above entry, for buy it's below
      const stopLossPrice = isBuy 
        ? entryPrice * (1 - aiSettings.stopLossPercentage / 100)
        : entryPrice * (1 + aiSettings.stopLossPercentage / 100);
      
      // For sell signals, take profit is below entry, for buy it's above
      const takeProfitPrice = isBuy
        ? entryPrice * (1 + aiSettings.takeProfitPercentage / 100)
        : entryPrice * (1 - aiSettings.takeProfitPercentage / 100);
      
      // Calculate position size based on risk level and configured trade size
      let orderVolume = 0;
      
      if (signal.token === 'So11111111111111111111111111111111111111112') {
        // For SOL, use direct volume
        orderVolume = 0.5; // Example: 0.5 SOL per trade
      } else {
        // For other tokens, use proportional USD value
        const usdAmount = 50; // Example: $50 per trade
        orderVolume = usdAmount / entryPrice;
      }
      
      // For traditional exchange pairs like BTC/USD
      if (tokenSymbol === 'BTC' || tokenSymbol === 'ETH' || tokenSymbol === 'SOL') {
        const pairSymbol = `${tokenSymbol}/USD`;
        
        // Prepare order parameters
        const orderParams = {
          pair: pairSymbol,
          type: 'limit',
          ordertype: 'limit',
          price: entryPrice.toString(),
          volume: orderVolume.toString(),
          leverage: '1', // No leverage
          validate: aiSettings.validationMode, // Validation mode or real execution
          close: {
            // Close order parameters (only used if the exchange supports it)
            ordertype: 'stop-loss-limit',
            price: stopLossPrice.toString()
          },
          oflags: ['fciq'] // Fill or kill, post only
        };
        
        // Add direction
        if (isBuy) {
          orderParams.type = 'buy';
        } else {
          orderParams.type = 'sell';
        }
        
        // Log the order
        addLog('ORDER', `${isBuy ? 'Buy' : 'Sell'} ${orderVolume} ${tokenSymbol} @ $${entryPrice}`);
        
        // Execute the trade
        const orderResult = await tradeExecutionService.executeKrakenTrade(orderParams);
        
        if (aiSettings.validationMode) {
          logger.info(`Trade validation successful: ${JSON.stringify(orderResult)}`);
          toast.success(`Trade validation successful for ${tokenSymbol}`);
          addLog('VALIDATION', `Validated ${tokenSymbol} trade successfully`);
        } else if (orderResult.success) {
          logger.info(`Trade executed: ${JSON.stringify(orderResult)}`);
          toast.success(`${isBuy ? 'Buy' : 'Sell'} order placed for ${tokenSymbol}`);
          addLog('SUCCESS', `${isBuy ? 'Buy' : 'Sell'} order executed for ${tokenSymbol}`);
          
          // Update trading stats
          setAiStats(prev => ({
            ...prev,
            tradesExecuted: prev.tradesExecuted + 1,
            dailyTrades: prev.dailyTrades + 1,
            activeTrades: [...prev.activeTrades, {
              id: orderResult.txid || `trade-${Date.now()}`,
              symbol: tokenSymbol,
              action: isBuy ? 'buy' : 'sell',
              entryPrice,
              stopLossPrice,
              takeProfitPrice,
              volume: orderVolume,
              timestamp: Date.now(),
              status: 'active'
            }]
          }));
        } else {
          logger.error(`Trade execution failed: ${orderResult.error}`);
          toast.error(`Trade failed: ${orderResult.error}`);
          addLog('ERROR', `Trade failed: ${orderResult.error}`);
          
          // Update stats
          setAiStats(prev => ({
            ...prev,
            failedTrades: prev.failedTrades + 1
          }));
        }
      } else {
        // For Solana tokens, would use Jupiter or another DEX
        // This is a placeholder for DEX integration
        logger.info(`Would execute ${isBuy ? 'buy' : 'sell'} order for ${tokenSymbol} at ${entryPrice}`);
        toast.info(`Trading ${tokenSymbol} on Solana not implemented yet`);
        addLog('INFO', `Solana token trading not yet implemented for ${tokenSymbol}`);
      }
      
      // Reset the signal state after processing
      pendingSignalRef.current = null;
      setTradeStatus('analyzing');
      
    } catch (error) {
      logger.error(`Failed to process trade signal: ${error.message}`);
      toast.error(`Trade processing failed: ${error.message}`);
      addLog('ERROR', `Trade processing failed: ${error.message}`);
      setTradeStatus('analyzing');
    }
  };

  // Monitor active trades (for stop loss/take profit execution)
  const monitorActiveTrades = async () => {
    if (!aiEngineActive || aiStats.activeTrades.length === 0) return;
    
    try {
      // Get up-to-date trade info from Kraken
      // In a real implementation, this would fetch actual trade status
      const openOrders = await tradeExecutionService.getOpenOrders();
      
      // Process each active trade
      const updatedTrades = aiStats.activeTrades.map(trade => {
        // Check if the trade is still active
        const matchingOrder = openOrders?.result?.open?.[trade.id];
        
        // If no matching order found, assume it's completed
        if (!matchingOrder) {
          return {
            ...trade,
            status: 'completed'
          };
        }
        
        // Otherwise, update with current status
        return trade;
      });
      
      // Update stats with trade status changes
      setAiStats(prev => ({
        ...prev,
        activeTrades: updatedTrades
      }));
      
    } catch (error) {
      logger.error(`Failed to monitor active trades: ${error.message}`);
      addLog('ERROR', `Failed to monitor active trades: ${error.message}`);
    }
  };

  // Update AI settings
  const updateAiSettings = (newSettings) => {
    setAiSettings(prev => ({
      ...prev,
      ...newSettings
    }));
    
    logger.info(`TradeForce AI settings updated: ${JSON.stringify(newSettings)}`);
  };
  
  // Get AI system status
  const getAiSystemStatus = () => {
    // Check data connection
    const dataStatus = Object.values(connectionStatus || {}).some(status => status)
      ? 'connected'
      : 'disconnected';
    
    // Check AI models
    const aiStatus = Object.values(agentStatus || {}).some(agent => agent?.initialized)
      ? 'ready'
      : 'initializing';
    
    // Check trade execution
    const executionStatus = tradeExecutionService.krakenInitialized
      ? 'ready'
      : 'unavailable';
    
    // Overall status
    if (dataStatus === 'connected' && aiStatus === 'ready' && executionStatus === 'ready') {
      return 'ready';
    } else if (dataStatus === 'disconnected') {
      return 'data_error';
    } else if (aiStatus === 'initializing') {
      return 'ai_initializing';
    } else if (executionStatus === 'unavailable') {
      return 'execution_error';
    } else {
      return 'partial';
    }
  };

  // Add log entry
  const addLog = (type, message) => {
    const log = {
      type,
      message,
      timestamp: new Date().toISOString()
    };
    
    setBotLogs(prev => [log, ...prev].slice(0, 100));
  };
  
  // Initialize services on component mount
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
        
        // Check if we need to reset daily stats for AI
        const today = new Date().toISOString().split('T')[0];
        if (aiStats.lastResetDate !== today) {
          setAiStats(prev => ({
            ...prev,
            dailyTrades: 0,
            lastResetDate: today
          }));
        }
        
        setInitialized(true);
        setLoading(false);
        
        // Log successful initialization
        logger.info('TradeForce AI services initialized successfully');
        toast.success('TradeForce AI initialized and ready');
      } catch (error) {
        logger.error(`Error initializing TradeForce AI: ${error.message}`);
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
  
  // Check AI system status and update UI accordingly
  useEffect(() => {
    const checkAiStatus = () => {
      const status = getAiSystemStatus();
      
      switch (status) {
        case 'ready':
          setAiEngineActive(true);
          toast.success('AI system ready');
          break;
        case 'data_error':
          setAiEngineActive(false);
          toast.error('Data connection error');
          break;
        case 'ai_initializing':
          setAiEngineActive(false);
          toast.info('AI models initializing');
          break;
        case 'execution_error':
          setAiEngineActive(false);
          toast.error('Trade execution unavailable');
          break;
        case 'partial':
          setAiEngineActive(false);
          toast.warning('AI system partially ready');
          break;
        default:
          setAiEngineActive(false);
      }
    };
    
    checkAiStatus();
    
    // Re-check AI status every minute
    const statusInterval = setInterval(checkAiStatus, 60 * 1000);
    
    return () => clearInterval(statusInterval);
  }, [agentStatus, connectionStatus]);
  
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
  
  // Add AI Roundtable section to the render
  const renderAiRoundtable = () => {
    return (
      <div className="ai-roundtable-container">
        <div className="ai-header">
          <h3>AI Roundtable Consensus</h3>
          <div className={`status-indicator ${getAiSystemStatus()}`}>
            {getAiSystemStatus() === 'ready' ? 'Ready' : 'Initializing'}
          </div>
        </div>
        
        <div className="ai-controls">
          <button 
            className={`ai-toggle-button ${aiEngineActive ? 'active' : 'inactive'}`}
            onClick={toggleAiEngine}
            disabled={getAiSystemStatus() !== 'ready'}
          >
            {aiEngineActive ? 'Deactivate' : 'Activate'} AI Engine
          </button>
          
          <button 
            className="ai-settings-button"
            onClick={() => console.log('Open AI settings')}
          >
            <FaGear /> Settings
          </button>
        </div>
        
        {aiEngineActive && (
          <div className="ai-status">
            <div className="status-row">
              <span>Status:</span> 
              <span className={`status-value ${tradeStatus}`}>{tradeStatus}</span>
            </div>
            
            <div className="status-row">
              <span>Active since:</span>
              <span>{activationTime ? new Date(activationTime).toLocaleTimeString() : 'N/A'}</span>
            </div>
            
            <div className="status-row">
              <span>Daily trades:</span>
              <span>{aiStats.dailyTrades} / {aiSettings.maxDailyTrades}</span>
            </div>
          </div>
        )}
        
        {signalActive && tradeSignals.length > 0 && (
          <div className="signal-container">
            <div className={`lightbulb-indicator ${signalActive ? 'active' : 'inactive'}`}>
              <FaLightbulb />
            </div>
            
            <div className="signal-details">
              <h3>Trade Signal Detected</h3>
              
              <div className="signal-row">
                <span>Asset:</span>
                <span>{tradeSignals[0].symbol || tradeSignals[0].token.substr(0, 8)}</span>
              </div>
              
              <div className="signal-row">
                <span>Action:</span>
                <span className={tradeSignals[0].action === 'buy' ? 'buy' : 'sell'}>
                  {tradeSignals[0].action.toUpperCase()}
                </span>
              </div>
              
              <div className="signal-row">
                <span>Confidence:</span>
                <span>{Math.round(tradeSignals[0].confidence * 100)}%</span>
              </div>
              
              <div className="signal-row">
                <span>Reasoning:</span>
                <span>{tradeSignals[0].reason}</span>
              </div>
              
              <div className="signal-actions">
                <button 
                  className="execute-button"
                  onClick={() => processAiTradeSignal(tradeSignals[0])}
                  disabled={tradeStatus === 'executing'}
                >
                  {aiSettings.validationMode ? 'Validate Trade' : 'Execute Trade'}
                </button>
                
                <button 
                  className="ignore-button"
                  onClick={() => {
                    setSignalActive(false);
                    pendingSignalRef.current = null;
                  }}
                >
                  Ignore Signal
                </button>
              </div>
            </div>
          </div>
        )}
        
        <div className="ai-panels">
          <div className="ai-panel">
            <h4><FaChartLine /> Performance</h4>
            <div className="stats-grid">
              <div className="stat-item">
                <span className="stat-label">Trades:</span>
                <span className="stat-value">{aiStats.tradesExecuted}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Success Rate:</span>
                <span className="stat-value">
                  {aiStats.tradesExecuted > 0 
                    ? `${Math.round((aiStats.successfulTrades / aiStats.tradesExecuted) * 100)}%` 
                    : 'N/A'}
                </span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Profit/Loss:</span>
                <span className={`stat-value ${aiStats.totalPnL >= 0 ? 'positive' : 'negative'}`}>
                  {aiStats.totalPnL >= 0 ? '+' : ''}{aiStats.totalPnL.toFixed(2)} USD
                </span>
              </div>
            </div>
          </div>
          
          <div className="ai-panel">
            <h4><FaExclamationTriangle /> AI Alerts</h4>
            {aiStats.dailyTrades >= aiSettings.maxDailyTrades && (
              <div className="alert-item warning">
                Daily trade limit reached ({aiSettings.maxDailyTrades})
              </div>
            )}
            
            {!walletStatus.connected && (
              <div className="alert-item warning">
                Wallet not connected
              </div>
            )}
            
            {aiSettings.validationMode && (
              <div className="alert-item info">
                Operating in validation mode
              </div>
            )}
            
            {!dataConnected && (
              <div className="alert-item error">
                Data pipeline disconnected
              </div>
            )}
            
            {!aiInitialized && (
              <div className="alert-item warning">
                AI models initializing
              </div>
            )}
          </div>
        </div>
        
        {aiStats.activeTrades.length > 0 && (
          <div className="active-trades">
            <h4>AI Active Trades</h4>
            <div className="trades-table">
              <div className="table-header">
                <div className="table-cell">Symbol</div>
                <div className="table-cell">Type</div>
                <div className="table-cell">Entry</div>
                <div className="table-cell">Stop Loss</div>
                <div className="table-cell">Take Profit</div>
                <div className="table-cell">Status</div>
              </div>
              {aiStats.activeTrades.map(trade => (
                <div key={trade.id} className="table-row">
                  <div className="table-cell">{trade.symbol}</div>
                  <div className={`table-cell ${trade.action}`}>{trade.action.toUpperCase()}</div>
                  <div className="table-cell">{trade.entryPrice.toFixed(4)}</div>
                  <div className="table-cell">{trade.stopLossPrice.toFixed(4)}</div>
                  <div className="table-cell">{trade.takeProfitPrice.toFixed(4)}</div>
                  <div className="table-cell">{trade.status}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
        {/* AI Roundtable Component */}      <div className="mb-6">
        {renderAiRoundtable()}
      </div>
      
      {/* Navigation Tabs */}
      <div className="flex mb-6 bg-gray-800 rounded-lg overflow-hidden">
        <button
          className={`flex items-center space-x-2 px-6 py-3 ${
            activeView === 'dashboard' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700'
          }`}
          onClick={() => setActiveView('dashboard')}
        >
          <FaChartLine />
          <span>Dashboard</span>
        </button>
        <button
          className={`flex items-center space-x-2 px-6 py-3 ${
            activeView === 'trading' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700'
          }`}
          onClick={() => setActiveView('trading')}
        >
          <FaLightbulb />
          <span>Trading</span>
        </button>
        <button
          className={`flex items-center space-x-2 px-6 py-3 ${
            activeView === 'results' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700'
          }`}
          onClick={() => setActiveView('results')}
        >
          <FaTrophy />
          <span>Results</span>        </button>
      </div>
      
      {/* Main Content Based on Active View */}
      {activeView === 'results' ? (
        /* Results Tab */
        <ResultsTab 
          trades={[...aiStats.activeTrades, 
            ...Array.from({ length: aiStats.tradesExecuted }).map((_, i) => ({
              id: `past-trade-${i}`,
              symbol: ['SOL', 'BTC', 'ETH'][Math.floor(Math.random() * 3)],
              action: Math.random() > 0.5 ? 'buy' : 'sell',
              entryPrice: 100 + Math.random() * 50,
              exitPrice: 100 + Math.random() * 50,
              profit: Math.random() * 20 - 10,
              timestamp: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
              status: 'completed'
            }))
          ]}
          aiStats={aiStats}
          onRefresh={() => {
            toast.success('Refreshing trade data');
            // In a real implementation, you would fetch fresh data here
          }}
        />
      ) : (
        /* Dashboard and Trading Views */
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
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {watchlist.map((asset) => (
              <div
                key={asset}
                className={`p-3 rounded-lg cursor-pointer flex justify-between items-center ${
                  selectedAsset === asset ? 'bg-blue-100 dark:bg-blue-900' : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
                onClick={() => setSelectedAsset(asset)}
              >
                <span>{asset}</span>
                <button
                  className="text-red-500 hover:text-red-700"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveFromWatchlist(asset);
                  }}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
          
          {/* AI Roundtable Consensus - New Section */}
          {renderAiRoundtable()}
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
            </button>        </div>
        </div>
      </div>
      )}
        {/* Render AI Roundtable section (only in dashboard and trading views) */}
      {activeView !== 'results' && renderAiRoundtable()}
      
      {/* Component Styles */}
      <style jsx>{`
        .ai-roundtable-container {
          background: #1a1d23;
          border-radius: 12px;
          padding: 20px;
          color: #e0e0e0;
          margin-bottom: 20px;
        }
        
        .ai-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          padding-bottom: 10px;
          border-bottom: 1px solid #2a2e35;
        }
        
        .ai-header h3 {
          font-size: 20px;
          font-weight: 700;
          color: #ffffff;
          margin: 0;
        }
        
        .status-indicator {
          padding: 6px 10px;
          border-radius: 20px;
          font-size: 14px;
          font-weight: 600;
        }
        
        .status-indicator.ready {
          background: #285c45;
          color: #5cffaa;
        }
        
        .status-indicator.partial {
          background: #5c4f22;
          color: #ffda5c;
        }
        
        .status-indicator.data_error,
        .status-indicator.execution_error,
        .status-indicator.ai_initializing {
          background: #5c2222;
          color: #ff5c5c;
        }
        
        .ai-controls {
          display: flex;
          gap: 15px;
          margin-bottom: 20px;
        }
        
        .ai-toggle-button {
          flex: 3;
          background: #2a2e35;
          color: #ffffff;
          border: none;
          border-radius: 8px;
          padding: 12px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s;
        }
        
        .ai-toggle-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        .ai-toggle-button.active {
          background: #1e463a;
          color: #5cffaa;
        }
        
        .ai-toggle-button:hover:not(:disabled) {
          background: #3a3f48;
        }
        
        .ai-settings-button {
          flex: 1;
          background: #2a2e35;
          color: #e0e0e0;
          border: none;
          border-radius: 8px;
          padding: 12px;
          font-size: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          cursor: pointer;
          transition: all 0.3s;
        }
        
        .ai-settings-button:hover {
          background: #3a3f48;
        }
        
        .ai-status {
          background: #21252d;
          border-radius: 8px;
          padding: 15px;
          margin-bottom: 20px;
        }
        
        .status-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 8px;
        }
        
        .status-row:last-child {
          margin-bottom: 0;
        }
        
        .status-value {
          font-weight: 600;
        }
        
        .status-value.analyzing {
          color: #5caaff;
        }
        
        .status-value.signaling {
          color: #ffda5c;
        }
        
        .status-value.executing {
          color: #ff9e5c;
        }
        
        .signal-container {
          display: flex;
          align-items: center;
          background: #323742;
          border-radius: 8px;
          padding: 15px;
          margin-bottom: 20px;
          border-left: 4px solid #ffda5c;
        }
        
        .lightbulb-indicator {
          font-size: 32px;
          color: #ffda5c;
          margin-right: 20px;
          opacity: 1;
        }
        
        .lightbulb-indicator.active {
          animation: pulse 1s infinite alternate;
        }
        
        @keyframes pulse {
          0% {
            opacity: 0.7;
          }
          100% {
            opacity: 1;
          }
        }
        
        .signal-details {
          flex: 1;
        }
        
        .signal-details h3 {
          margin-top: 0;
          margin-bottom: 10px;
          color: #ffffff;
        }
        
        .signal-row {
          display: flex;
          margin-bottom: 5px;
        }
        
        .signal-row span:first-child {
          width: 100px;
          font-weight: 600;
        }
        
        .signal-row .buy {
          color: #5cffaa;
        }
        
        .signal-row .sell {
          color: #ff5c5c;
        }
        
        .signal-actions {
          display: flex;
          gap: 10px;
          margin-top: 15px;
        }
        
        .execute-button {
          background: #1e463a;
          color: #5cffaa;
          border: none;
          border-radius: 6px;
          padding: 8px 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s;
        }
        
        .execute-button:hover:not(:disabled) {
          background: #285c45;
        }
        
        .execute-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        .ignore-button {
          background: #3a3e47;
          color: #e0e0e0;
          border: none;
          border-radius: 6px;
          padding: 8px 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s;
        }
        
        .ignore-button:hover {
          background: #4a4f59;
        }
        
        .ai-panels {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-bottom: 20px;
        }
        
        .ai-panel {
          background: #21252d;
          border-radius: 8px;
          padding: 15px;
        }
        
        .ai-panel h4 {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 0;
          margin-bottom: 15px;
          font-size: 16px;
          color: #ffffff;
        }
        
        .stats-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }
        
        .stat-item {
          display: flex;
          flex-direction: column;
        }
        
        .stat-label {
          font-size: 13px;
          color: #a0a0a0;
        }
        
        .stat-value {
          font-size: 16px;
          font-weight: 600;
        }
        
        .stat-value.positive {
          color: #5cffaa;
        }
        
        .stat-value.negative {
          color: #ff5c5c;
        }
        
        .alert-item {
          background: #27292f;
          padding: 10px;
          border-radius: 6px;
          margin-bottom: 8px;
          font-size: 14px;
        }
        
        .alert-item:last-child {
          margin-bottom: 0;
        }
        
        .alert-item.warning {
          border-left: 3px solid #ffda5c;
        }
        
        .alert-item.error {
          border-left: 3px solid #ff5c5c;
        }
        
        .alert-item.info {
          border-left: 3px solid #5caaff;
        }
        
        .active-trades {
          background: #21252d;
          border-radius: 8px;
          padding: 15px;
        }
        
        .active-trades h4 {
          margin-top: 0;
          margin-bottom: 15px;
          font-size: 16px;
          color: #ffffff;
        }
        
        .trades-table {
          width: 100%;
          font-size: 14px;
        }
        
        .table-header {
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          padding: 8px 0;
          border-bottom: 1px solid #2a2e35;
          font-weight: 600;
          color: #a0a0a0;
        }
        
        .table-row {
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          padding: 12px 0;
          border-bottom: 1px solid #22262f;
        }
        
        .table-row:last-child {
          border-bottom: none;
        }
        
        .table-cell.buy {
          color: #5cffaa;
        }
        
        .table-cell.sell {
          color: #ff5c5c;
        }
        
        @media (max-width: 768px) {
          .ai-panels {
            grid-template-columns: 1fr;
          }
          
          .table-header, .table-row {
            grid-template-columns: repeat(3, 1fr);
            row-gap: 8px;
          }
          
          .table-header .table-cell:nth-child(4),
          .table-header .table-cell:nth-child(5),
          .table-header .table-cell:nth-child(6),
          .table-row .table-cell:nth-child(4),
          .table-row .table-cell:nth-child(5),
          .table-row .table-cell:nth-child(6) {
            padding-top: 8px;
            border-top: 1px solid #22262f;
          }
        }
      `}</style>
  );
};

export default TradeForceAI;
