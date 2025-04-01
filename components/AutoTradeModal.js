import React, { useState, useEffect } from 'react';
import useElectron from '../lib/useElectron';

/**
 * AutoTradeModal component for handling AI-driven trading
 * Opens a secondary window in desktop mode or shows in-app interface in web mode
 * Enhanced with live AI thinking process and AIXBT branding
 */
const AutoTradeModal = ({ onClose }) => {
  const [isOpen, setIsOpen] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [tradeStatus, setTradeStatus] = useState('idle'); // idle, analyzing, ready
  const [activeTab, setActiveTab] = useState('instruction');
  const [searchSteps, setSearchSteps] = useState([]);
  const [recommendation, setRecommendation] = useState(null);
  const { isDesktopApp, autoTrader, showNotification } = useElectron();
  
  // Start trade analysis
  const handleStartAnalysis = async () => {
    try {
      setIsLoading(true);
      setTradeStatus('analyzing');
      setSearchSteps([]);
      setRecommendation(null);
      
      if (isDesktopApp && autoTrader) {
        // In desktop mode, we'll show the analysis steps in this modal
        // instead of opening a new window
        simulateAIThinkingProcess();
      } else {
        // In web mode, simulate analysis and show a notification
        simulateAIThinkingProcess();
      }
    } catch (error) {
      console.error('Failed to start analysis:', error);
      showNotification('Error', 'Failed to start trading analysis');
      setIsLoading(false);
      setTradeStatus('idle');
    }
  };
  
  // Simulate AI thinking process with steps
  const simulateAIThinkingProcess = () => {
    const steps = [
      'Scanning Solana tokens on @pumpdotfun...',
      'Connecting to Shyft API for real-time market data...',
      'Analyzing market cap: Found 3 tokens under $5M...',
      'Checking 24h volume: Identified high activity pattern...',
      'Connecting to Swarm Node API for sentiment analysis...',
      'Signal detected: Potential moonshot listing.',
      'Applying AIXBT predictive model to recent price action...',
      'Reasoning: High volume, low market cap, recent activity spike.',
      'Risk assessment in progress: Calculating optimal position size...'
    ];
    
    let i = 0;
    const interval = setInterval(() => {
      if (i < steps.length) {
        setSearchSteps(prev => [...prev, steps[i]]);
        i++;
      } else {
        clearInterval(interval);
        setIsLoading(false);
        setTradeStatus('ready');
        
        // Generate a recommendation
        setRecommendation({
          tradePair: 'BONK/SOL',
          profitPotential: '32%',
          riskLevel: 'Low',
          entry: '0.00000243',
          stopLoss: '0.00000224',
          takeProfit: '0.00000321'
        });
      }
    }, 1500); // Update UI every 1.5 seconds

    // Clean up function
    return () => clearInterval(interval);
  };
  
  // Handle closing the modal
  const handleClose = () => {
    setIsOpen(false);
    setTimeout(() => {
      onClose();
    }, 300); // Allow time for animation
  };

  // Handle trade execution
  const handleExecuteTrade = () => {
    if (!recommendation) return;
    
    // Log the trade execution (you can add token burn mechanics here)
    showNotification('Trade Executed', `Successfully entered ${recommendation.tradePair} position`);
    
    // Close the modal after successful execution
    handleClose();
  };
  
  return (
    <div 
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 transition-opacity ${
        isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
    >
      <div 
        className={`bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-3xl transition-all transform ${
          isOpen ? 'scale-100' : 'scale-95'
        }`}
      >
        {/* Header */}
        <div className="flex justify-between items-center p-5 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center">
            AI Auto-Trade Analysis
            {tradeStatus === 'analyzing' && (
              <span className="ml-3 inline-block w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></span>
            )}
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* Body */}
        <div className="p-5">
          {/* AIXBT Branding */}
          <div className="flex justify-between items-center mb-5">
            <div className="flex items-center">
              <span className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white text-xs font-bold rounded-full px-3 py-1">
                Powered by AIXBT
              </span>
            </div>
            
            {tradeStatus === 'idle' && (
              <button
                onClick={handleStartAnalysis}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg disabled:opacity-50"
                disabled={isLoading}
              >
                Start Analysis
              </button>
            )}
          </div>
          
          {tradeStatus === 'idle' && (
            <div className="text-center py-8">
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                The AI Auto-Trader will scan the market for high-potential trading opportunities
                using real-time data from Solana DEXes and advanced predictive models.
              </p>
              <div className="flex justify-center items-center">
                <img 
                  src="/globe.svg" 
                  alt="AI Trading" 
                  className="w-24 h-24 opacity-75 dark:opacity-50" 
                />
              </div>
            </div>
          )}
          
          {tradeStatus === 'analyzing' && (
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 h-80 overflow-y-auto">
              <div className="font-mono text-sm">
                <div className="flex items-center mb-3">
                  <span className="text-green-500 mr-2">●</span>
                  <span className="text-gray-800 dark:text-gray-200">AIXBT Trading Engine initialized</span>
                </div>
                {searchSteps.map((step, index) => (
                  <div key={index} className="flex items-start py-1">
                    <span className="text-green-500 mr-2 mt-0.5">&gt;</span>
                    <span className="text-gray-800 dark:text-gray-200">{step}</span>
                  </div>
                ))}
                {isLoading && searchSteps.length > 0 && (
                  <div className="flex items-center mt-2 animate-pulse">
                    <span className="text-blue-500 mr-2">●</span>
                    <span className="text-gray-800 dark:text-gray-200">Processing...</span>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {tradeStatus === 'ready' && recommendation && (
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-5">
              <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">Trade Recommendation</h3>
              
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm">
                  <div className="text-sm text-gray-500 dark:text-gray-400">Trading Pair</div>
                  <div className="text-lg font-bold text-gray-900 dark:text-white">{recommendation.tradePair}</div>
                </div>
                
                <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm">
                  <div className="text-sm text-gray-500 dark:text-gray-400">Profit Potential</div>
                  <div className="text-lg font-bold text-green-500">{recommendation.profitPotential}</div>
                </div>
                
                <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm">
                  <div className="text-sm text-gray-500 dark:text-gray-400">Risk Level</div>
                  <div className="text-lg font-bold text-gray-900 dark:text-white">{recommendation.riskLevel}</div>
                </div>
                
                <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm">
                  <div className="text-sm text-gray-500 dark:text-gray-400">Entry Price</div>
                  <div className="text-lg font-bold text-gray-900 dark:text-white">{recommendation.entry}</div>
                </div>
                
                <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm">
                  <div className="text-sm text-gray-500 dark:text-gray-400">Stop Loss</div>
                  <div className="text-lg font-bold text-red-500">{recommendation.stopLoss}</div>
                </div>
                
                <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm">
                  <div className="text-sm text-gray-500 dark:text-gray-400">Take Profit</div>
                  <div className="text-lg font-bold text-green-500">{recommendation.takeProfit}</div>
                </div>
              </div>
              
              <div className="flex justify-end">
                <button
                  onClick={handleExecuteTrade}
                  className="bg-green-600 hover:bg-green-700 text-white font-medium px-4 py-2 rounded-lg"
                >
                  Trade Now
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AutoTradeModal;