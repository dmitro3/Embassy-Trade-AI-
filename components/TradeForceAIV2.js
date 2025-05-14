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
import tradeHistoryService, { useTradeHistory } from '../lib/tradeHistoryService.js';
import { useWalletValidation } from '../lib/validateWalletSignature.js';
import { WALLET_CONFIG } from '../lib/walletConfig.js';

/**
 * TradeForceAI Component
 * 
 * This component provides a user interface for the TradeForce AI trading system.
 * It allows users to:
 * - View and manage their watchlist
 * - Get trading recommendations
 * - Execute trades based on recommendations
 * - View their portfolio and trade history
 * - Access detailed trade performance metrics and results
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

  // Initialize services on component mount
  useEffect(() => {
    const initServices = async () => {
      try {
        setLoading(true);
        
        // Create a transaction for monitoring initialization
        const transaction = startAppTransaction('tradeforce-init', 'component.init');
        
        // Initialize services
        
        // Finish the transaction
        finishAppTransaction(transaction);
        
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
  }, []);
  
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
            onClick={() => setAiEngineActive(!aiEngineActive)}
            disabled={getAiSystemStatus() !== 'ready'}
          >
            {aiEngineActive ? 'Deactivate' : 'Activate'} AI Engine
          </button>
          
          <button 
            className="ai-settings-button"
            onClick={() => toast.info('Settings dialog would open here')}
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
          </div>
        </div>
      </div>
    );
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
  }  // Initialize wallet validation hook for real Solana wallet verification
  const { isValidated, isValidating, validationError, txCount, validateWallet } = useWalletValidation();
  
  // Initialize trade history hook for real Solana devnet data
  const { trades: solTradeHistory, metrics, refreshTrades, isLoading: tradesLoading } = useTradeHistory();
  
  // Track wallet validation state
  const [walletValid, setWalletValid] = useState(false);
  
  // UseEffect for wallet validation and loading Solana trade data
  useEffect(() => {
    const initWithWalletValidation = async () => {
      try {
        // Check if wallet is validated
        if (!isValidated) {
          logger.info('Waiting for wallet validation...');
          setWalletValid(false);
          return;
        }
        
        // If we reach here, the wallet is validated
        logger.info('Wallet validated successfully, initializing trade history');
        setWalletValid(true);
        
        // Display wallet validation success message
        toast.success(`Wallet validated with ${txCount} transactions`);
        
        // Initialize trade history service
        logger.info('Initializing trade history with Solana devnet data');
        await tradeHistoryService.initialize();
        
        // Force a refresh to get latest data from Solana devnet
        toast.info('Loading Solana trade history...');
        
        // This will fetch data when the component loads
        await tradeHistoryService.getAllTrades(true);
        
        logger.info('Solana trade history loaded successfully');
      } catch (error) {
        logger.error('Failed to load trade history:', error);
        toast.error('Failed to load Solana trade data: ' + error.message);
      }
    };
    
    // Only proceed if wallet is connected and we have validation status
    if (walletStatus.connected) {
      initWithWalletValidation();
    } else {
      setWalletValid(false);
    }
  }, [walletStatus.connected, isValidated, txCount]);
  
  // Show validation error if any
  useEffect(() => {
    if (validationError) {
      toast.error(`Wallet validation failed: ${validationError}`);
    }
  }, [validationError]);
  
  // Main render
  return (
    <div className="tradeforce-ai p-4">
      <div className="mb-6">
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
          <FaChartLine className="mr-2" />
          <span>Dashboard</span>
        </button>
        <button
          className={`flex items-center space-x-2 px-6 py-3 ${
            activeView === 'trading' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700'
          }`}
          onClick={() => setActiveView('trading')}
        >
          <FaLightbulb className="mr-2" />
          <span>Trading</span>
        </button>
        <button
          className={`flex items-center space-x-2 px-6 py-3 ${
            activeView === 'results' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700'
          }`}
          onClick={() => setActiveView('results')}
        >
          <FaTrophy className="mr-2" />
          <span>Results</span>
        </button>
      </div>

      {/* Main Content Based on Active View */}      {activeView === 'results' ? (
        /* Results Tab with Real Solana Data - Requires Wallet Validation */
        walletValid ? (
          <ResultsTab 
            trades={solTradeHistory || []}
            aiStats={{
              ...aiStats,
              totalPnL: metrics?.totalPnL || 0,
              winRate: metrics?.winRate || 0,
              tradesExecuted: metrics?.totalTrades || 0
            }}
            onRefresh={() => {
              toast.success('Refreshing Solana trade data');
              refreshTrades();
            }}
          />
        ) : (
          <div className="flex flex-col items-center justify-center p-6 bg-gray-800/50 rounded-lg">          <div className="mb-6 text-center">
              <h2 className="text-2xl font-bold text-white mb-2">Wallet Validation Required</h2>
              <p className="text-gray-300">
                Please connect your Solana devnet wallet to access real transaction data
              </p>
            </div>
            
            {isValidating && (
              <div className="flex items-center justify-center mb-6">
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500 mr-3"></div>
                <p className="text-gray-300">Validating your wallet...</p>
              </div>
            )}
            
            {validationError && (
              <div className="bg-red-900/30 border border-red-700 text-red-300 p-4 rounded-md mb-6 max-w-lg">
                <p className="font-bold">Validation Error</p>
                <p>{validationError}</p>
              </div>
            )}
            
            <button
              onClick={validateWallet}
              disabled={!walletStatus.connected || isValidating}
              className={`px-6 py-3 rounded-lg text-white font-medium flex items-center ${
                !walletStatus.connected || isValidating
                  ? 'bg-gray-700 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {isValidating ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Validating...
                </>
              ) : (
                'Validate Wallet'
              )}
            </button>
          </div>
        )
      ) : (
        /* Dashboard and Trading Views */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column - Watchlist */}
          <div className="bg-gray-800 rounded-lg shadow p-4">
            <h2 className="text-xl font-semibold mb-4">Watchlist</h2>
            
            {/* Watchlist content */}
            <div className="text-center py-10 text-gray-400">
              {activeView === 'dashboard' ? 
                "Dashboard view - Watchlist content would appear here" : 
                "Trading view - Trading interface would appear here"}
            </div>
          </div>
          
          {/* Middle column - Chart */}
          <div className="bg-gray-800 rounded-lg shadow p-4">
            <h2 className="text-xl font-semibold mb-4">Market Data</h2>
            
            {/* Chart placeholder */}
            <div className="bg-gray-700 h-64 rounded flex items-center justify-center mb-4">
              <div className="text-gray-400">Trading chart would appear here</div>
            </div>
            
            {/* Additional content based on active view */}
            <div className="text-center py-4 text-gray-400">
              {activeView === 'dashboard' ? 
                "Dashboard view - Market analytics would appear here" : 
                "Trading view - Order panel would appear here"}
            </div>
          </div>
          
          {/* Right column - Portfolio */}
          <div className="bg-gray-800 rounded-lg shadow p-4">
            <h2 className="text-xl font-semibold mb-4">Portfolio</h2>
            
            {/* Portfolio content */}
            <div className="text-center py-10 text-gray-400">
              {activeView === 'dashboard' ? 
                "Dashboard view - Portfolio summary would appear here" : 
                "Trading view - Trade history would appear here"}
            </div>
          </div>
        </div>
      )}
      
      {/* Component Styles */}
      <style jsx>{`
        .tradeforce-ai {
          color: #e0e0e0;
        }
        
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
        
        @media (max-width: 768px) {
          .ai-panels {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};

export default TradeForceAI;
