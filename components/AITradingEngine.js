'use client';

import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import logger from '../lib/logger';
import tradeExecutionService from '../lib/tradeExecutionService';

/**
 * AITradingEngine Component
 * 
 * Implements AI-driven trading automation:
 * - Analyzes market data in real-time
 * - Identifies trading opportunities
 * - Executes trades based on configurable strategies
 * - Manages risk with customizable parameters
 */
const AITradingEngine = ({ 
  tokenData = {}, 
  marketData = {}, 
  walletConnected = false,
  onTradeExecuted = () => {}
}) => {
  // State variables
  const [isActive, setIsActive] = useState(false);
  const [activationTime, setActivationTime] = useState(null);
  const [strategy, setStrategy] = useState('momentum');
  const [riskLevel, setRiskLevel] = useState('medium');
  const [tradingLimits, setTradingLimits] = useState({
    maxTradesPerHour: 3,
    maxTradesPerDay: 10,
    maxPositionSize: 0.1, // 10% of available balance
    stopLossPercentage: 5,
    takeProfitPercentage: 15
  });
  const [tradingStats, setTradingStats] = useState({
    tradesExecuted: 0,
    successfulTrades: 0,
    failedTrades: 0,
    profitableTrades: 0,
    losingTrades: 0,
    pendingTrades: 0,
    totalPnL: 0
  });
  
  // Trading queue for managing automated trades
  const [tradingQueue, setTradingQueue] = useState([]);
  
  // References for interval timers
  const marketAnalysisIntervalRef = useRef(null);
  const tradeExecutionIntervalRef = useRef(null);
  
  // Session trading records
  const [tradeHistory, setTradeHistory] = useState([]);
  
  /**
   * Strategies implementation
   */
  const tradingStrategies = {
    // Momentum trading strategy
    momentum: {
      name: 'Momentum Trading',
      description: 'Identifies and trades with the momentum of the market trend',
      analyze: (data) => {
        // Get token price data
        const tokenPrices = Object.entries(data).map(([token, info]) => ({
          token,
          price: info.price || 0,
          priceChange: info.priceChange24h || 0,
          volume: info.volume24h || 0,
          marketCap: info.marketCap || 0,
          timestamp: info.lastUpdated || Date.now()
        }));
        
        // Filter tokens with high momentum
        const potentialTrades = tokenPrices
          .filter(token => {
            // Token must have data
            if (!token.price || !token.priceChange || !token.volume) return false;
            
            // Look for strong momentum based on risk level
            let momentumThreshold;
            switch (riskLevel) {
              case 'low': momentumThreshold = 5; break;
              case 'medium': momentumThreshold = 3; break;
              case 'high': momentumThreshold = 1.5; break;
              default: momentumThreshold = 3;
            }
            
            return Math.abs(token.priceChange) > momentumThreshold;
          })
          .map(token => ({
            token: token.token,
            action: token.priceChange > 0 ? 'buy' : 'sell',
            confidence: Math.min(Math.abs(token.priceChange) / 10, 0.99),
            price: token.price,
            reason: `${token.priceChange > 0 ? 'Upward' : 'Downward'} momentum of ${token.priceChange.toFixed(2)}%`,
            recommendedSize: calculatePositionSize(token.token, Math.abs(token.priceChange))
          }));
          
        return potentialTrades;
      }
    },
    
    // Mean reversion strategy
    meanReversion: {
      name: 'Mean Reversion',
      description: 'Trades based on price deviations from historical averages',
      analyze: (data) => {
        // This would require historical price data which we don't have in this implementation
        // For demonstration, we'll simulate mean reversion analysis
        const tokenPrices = Object.entries(data).map(([token, info]) => ({
          token,
          price: info.price || 0,
          priceChange: info.priceChange24h || 0
        }));
        
        // Simulate mean reversion logic (would use historical moving averages in reality)
        const potentialTrades = tokenPrices
          .filter(token => {
            // Token must have data
            if (!token.price || !token.priceChange) return false;
            
            // Look for extreme deviations based on risk level
            let deviationThreshold;
            switch (riskLevel) {
              case 'low': deviationThreshold = 8; break;
              case 'medium': deviationThreshold = 6; break;
              case 'high': deviationThreshold = 4; break;
              default: deviationThreshold = 6;
            }
            
            return Math.abs(token.priceChange) > deviationThreshold;
          })
          .map(token => ({
            token: token.token,
            // In mean reversion, we go against the trend
            action: token.priceChange > 0 ? 'sell' : 'buy',
            confidence: Math.min(Math.abs(token.priceChange) / 15, 0.9),
            price: token.price,
            reason: `Potential ${token.priceChange > 0 ? 'overbought' : 'oversold'} condition with ${Math.abs(token.priceChange).toFixed(2)}% deviation`,
            recommendedSize: calculatePositionSize(token.token, Math.abs(token.priceChange) / 2)
          }));
          
        return potentialTrades;
      }
    },
    
    // Pattern recognition strategy
    patternRecognition: {
      name: 'Pattern Recognition',
      description: 'Identifies chart patterns for potential entry and exit points',
      analyze: (data) => {
        // This would require candle data which we don't have in this implementation
        // For demonstration, we'll simulate pattern recognition
        const patterns = ['Double Top', 'Double Bottom', 'Head and Shoulders', 'Inverse Head and Shoulders'];
        
        // Get random subset of tokens
        const tokens = Object.keys(data).filter(token => 
          data[token] && data[token].price
        );
        
        // Simulate finding patterns in 10-20% of tokens based on risk level
        const patternChance = riskLevel === 'low' ? 0.1 : riskLevel === 'medium' ? 0.15 : 0.2;
        
        const potentialTrades = tokens
          .filter(() => Math.random() < patternChance)
          .map(token => {
            const randomPattern = patterns[Math.floor(Math.random() * patterns.length)];
            const isBullish = Math.random() > 0.5;
            
            return {
              token,
              action: isBullish ? 'buy' : 'sell',
              confidence: 0.5 + (Math.random() * 0.3),
              price: data[token].price,
              reason: `Detected ${randomPattern} pattern (${isBullish ? 'bullish' : 'bearish'})`,
              recommendedSize: calculatePositionSize(token, 0.05)
            };
          });
          
        return potentialTrades;
      }
    }
  };
  
  /**
   * Calculate position size based on token volatility and risk level
   */
  const calculatePositionSize = (token, volatility) => {
    // Base size on risk level
    let baseSize;
    switch (riskLevel) {
      case 'low': baseSize = 0.05; break;    // 5% of available balance
      case 'medium': baseSize = 0.1; break;  // 10% of available balance
      case 'high': baseSize = 0.2; break;    // 20% of available balance
      default: baseSize = 0.1;
    }
    
    // Adjust based on volatility (higher volatility = smaller position)
    const volatilityFactor = 1 - Math.min(volatility / 20, 0.5);
    
    // Ensure we don't exceed max position size
    return Math.min(baseSize * volatilityFactor, tradingLimits.maxPositionSize);
  };
  
  /**
   * Analyze market data and identify potential trading opportunities
   */
  const analyzeMarket = () => {
    if (!isActive || !tokenData || Object.keys(tokenData).length === 0) {
      return [];
    }
    
    try {
      // Get current strategy
      const selectedStrategy = tradingStrategies[strategy];
      if (!selectedStrategy || !selectedStrategy.analyze) {
        logger.error(`Invalid strategy: ${strategy}`);
        return [];
      }
      
      // Run strategy analysis
      const tradingOpportunities = selectedStrategy.analyze(tokenData);
      
      if (tradingOpportunities.length > 0) {
        logger.info(`AI identified ${tradingOpportunities.length} potential trading opportunities`);
      }
      
      return tradingOpportunities;
    } catch (error) {
      logger.error(`Error analyzing market data: ${error.message}`);
      return [];
    }
  };
  
  /**
   * Process trading opportunities and add to queue
   */
  const processTradeOpportunities = () => {
    // Don't process if engine is not active
    if (!isActive) return;
    
    try {
      // Analyze market data
      const opportunities = analyzeMarket();
      
      // Skip if no opportunities found
      if (!opportunities || opportunities.length === 0) return;
      
      // Filter opportunities by confidence
      const confidenceThreshold = riskLevel === 'low' ? 0.7 : riskLevel === 'medium' ? 0.6 : 0.5;
      
      // Get high confidence opportunities
      const highConfidenceTrades = opportunities
        .filter(trade => trade.confidence >= confidenceThreshold)
        .slice(0, 2); // Limit to top 2 opportunities
      
      // Add to trading queue
      if (highConfidenceTrades.length > 0) {
        setTradingQueue(prev => [
          ...prev,
          ...highConfidenceTrades.map(trade => ({
            ...trade,
            id: `trade-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            status: 'pending',
            timestamp: Date.now()
          }))
        ]);
        
        // Update pending trades count
        setTradingStats(prev => ({
          ...prev,
          pendingTrades: prev.pendingTrades + highConfidenceTrades.length
        }));
        
        // Log the opportunities
        logger.info(`Added ${highConfidenceTrades.length} trades to execution queue`);
      }
    } catch (error) {
      logger.error(`Error processing trade opportunities: ${error.message}`);
    }
  };
  
  /**
   * Execute pending trades from queue
   */
  const executeTrades = async () => {
    // Don't execute if engine is not active
    if (!isActive) return;
    
    // Don't execute if wallet is not connected
    if (!walletConnected) {
      logger.warn('Cannot execute trades: Wallet not connected');
      return;
    }
    
    // Get pending trades
    const pendingTrades = tradingQueue.filter(trade => trade.status === 'pending');
    
    // Skip if no pending trades
    if (pendingTrades.length === 0) return;
    
    // Check if we've hit trading limits
    const lastHourTrades = tradeHistory.filter(trade => 
      trade.timestamp > Date.now() - 60 * 60 * 1000
    ).length;
    
    const lastDayTrades = tradeHistory.filter(trade => 
      trade.timestamp > Date.now() - 24 * 60 * 60 * 1000
    ).length;
    
    if (lastHourTrades >= tradingLimits.maxTradesPerHour) {
      logger.warn(`Hourly trade limit (${tradingLimits.maxTradesPerHour}) reached`);
      return;
    }
    
    if (lastDayTrades >= tradingLimits.maxTradesPerDay) {
      logger.warn(`Daily trade limit (${tradingLimits.maxTradesPerDay}) reached`);
      return;
    }
    
    // Execute first pending trade
    const tradeToExecute = pendingTrades[0];
    
    try {
      // Update trade status
      setTradingQueue(prev => prev.map(trade => 
        trade.id === tradeToExecute.id ? { ...trade, status: 'executing' } : trade
      ));
      
      logger.info(`Executing ${tradeToExecute.action} trade for ${tradeToExecute.token}`);
      
      // Simulate trade execution (would call real trade execution in production)
      await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate API call
      
      // Simulate success/failure (90% success rate)
      const isSuccessful = Math.random() < 0.9;
      
      if (isSuccessful) {
        // Update trade status
        setTradingQueue(prev => prev.map(trade => 
          trade.id === tradeToExecute.id 
            ? { ...trade, status: 'completed', executionPrice: tradeToExecute.price * (1 + (Math.random() * 0.01 * (tradeToExecute.action === 'buy' ? 1 : -1))) }
            : trade
        ));
        
        // Update trading stats
        setTradingStats(prev => ({
          ...prev,
          tradesExecuted: prev.tradesExecuted + 1,
          successfulTrades: prev.successfulTrades + 1,
          pendingTrades: prev.pendingTrades - 1,
          // Simulate PnL (60% chance of profitable trade)
          profitableTrades: prev.profitableTrades + (Math.random() < 0.6 ? 1 : 0),
          losingTrades: prev.losingTrades + (Math.random() < 0.6 ? 0 : 1),
          totalPnL: prev.totalPnL + (Math.random() < 0.6 
            ? Math.random() * tradeToExecute.recommendedSize * 100 
            : -Math.random() * tradeToExecute.recommendedSize * 40)
        }));
        
        // Add to trade history
        const tradeRecord = {
          id: tradeToExecute.id,
          token: tradeToExecute.token,
          action: tradeToExecute.action,
          price: tradeToExecute.price,
          amount: tradeToExecute.recommendedSize,
          timestamp: Date.now(),
          strategy,
          reason: tradeToExecute.reason,
          status: 'completed'
        };
        
        setTradeHistory(prev => [...prev, tradeRecord]);
        
        // Notify parent component
        onTradeExecuted(tradeRecord);
        
        // Show success toast
        toast.success(`AI executed ${tradeToExecute.action} trade for ${tradeToExecute.token}`);
      } else {
        // Update trade status on failure
        setTradingQueue(prev => prev.map(trade => 
          trade.id === tradeToExecute.id ? { ...trade, status: 'failed', error: 'Execution failed' } : trade
        ));
        
        // Update trading stats
        setTradingStats(prev => ({
          ...prev,
          tradesExecuted: prev.tradesExecuted + 1,
          failedTrades: prev.failedTrades + 1,
          pendingTrades: prev.pendingTrades - 1
        }));
        
        // Show error toast
        toast.error(`Failed to execute ${tradeToExecute.action} trade for ${tradeToExecute.token}`);
      }
    } catch (error) {
      logger.error(`Error executing trade: ${error.message}`);
      
      // Update trade status on error
      setTradingQueue(prev => prev.map(trade => 
        trade.id === tradeToExecute.id ? { ...trade, status: 'failed', error: error.message } : trade
      ));
      
      // Update trading stats
      setTradingStats(prev => ({
        ...prev,
        failedTrades: prev.failedTrades + 1,
        pendingTrades: prev.pendingTrades - 1
      }));
      
      // Show error toast
      toast.error(`Error executing trade: ${error.message}`);
    }
  };
  
  /**
   * Toggle AI trading engine activation
   */
  const toggleActivation = () => {
    if (isActive) {
      // Deactivate trading engine
      setIsActive(false);
      setActivationTime(null);
      
      // Clear intervals
      if (marketAnalysisIntervalRef.current) {
        clearInterval(marketAnalysisIntervalRef.current);
        marketAnalysisIntervalRef.current = null;
      }
      
      if (tradeExecutionIntervalRef.current) {
        clearInterval(tradeExecutionIntervalRef.current);
        tradeExecutionIntervalRef.current = null;
      }
      
      logger.info('AI Trading Engine deactivated');
      toast.info('AI Trading Engine deactivated');
    } else {
      // Activate trading engine
      setIsActive(true);
      setActivationTime(Date.now());
      
      // Set up market analysis interval (every 30 seconds)
      marketAnalysisIntervalRef.current = setInterval(processTradeOpportunities, 30000);
      
      // Set up trade execution interval (every 1 minute)
      tradeExecutionIntervalRef.current = setInterval(executeTrades, 60000);
      
      logger.info('AI Trading Engine activated');
      toast.success('AI Trading Engine activated');
      
      // Immediate first analysis
      processTradeOpportunities();
    }
  };
  
  /**
   * Update strategy settings
   */
  const updateStrategy = (newStrategy) => {
    setStrategy(newStrategy);
    logger.info(`Trading strategy updated to ${newStrategy}`);
  };
  
  /**
   * Update risk level
   */
  const updateRiskLevel = (newRiskLevel) => {
    setRiskLevel(newRiskLevel);
    
    // Update trading limits based on risk level
    switch (newRiskLevel) {
      case 'low':
        setTradingLimits({
          maxTradesPerHour: 1,
          maxTradesPerDay: 5,
          maxPositionSize: 0.05,
          stopLossPercentage: 3,
          takeProfitPercentage: 9
        });
        break;
      case 'medium':
        setTradingLimits({
          maxTradesPerHour: 3,
          maxTradesPerDay: 10,
          maxPositionSize: 0.1,
          stopLossPercentage: 5,
          takeProfitPercentage: 15
        });
        break;
      case 'high':
        setTradingLimits({
          maxTradesPerHour: 5,
          maxTradesPerDay: 20,
          maxPositionSize: 0.2,
          stopLossPercentage: 10,
          takeProfitPercentage: 30
        });
        break;
      default:
        // Use medium risk as default
        setTradingLimits({
          maxTradesPerHour: 3,
          maxTradesPerDay: 10,
          maxPositionSize: 0.1,
          stopLossPercentage: 5,
          takeProfitPercentage: 15
        });
    }
    
    logger.info(`Risk level updated to ${newRiskLevel}`);
  };
  
  /**
   * Format activation time
   */
  const getActivationTimeString = () => {
    if (!activationTime) return 'Not active';
    
    const now = Date.now();
    const diffMs = now - activationTime;
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };
  
  /**
   * Clean up intervals on unmount
   */
  useEffect(() => {
    return () => {
      if (marketAnalysisIntervalRef.current) {
        clearInterval(marketAnalysisIntervalRef.current);
      }
      
      if (tradeExecutionIntervalRef.current) {
        clearInterval(tradeExecutionIntervalRef.current);
      }
    };
  }, []);
  
  // Update activation time display periodically
  useEffect(() => {
    if (!isActive) return;
    
    const timerId = setInterval(() => {
      // Trigger re-render to update time display
      setActivationTime(prev => prev);
    }, 1000);
    
    return () => clearInterval(timerId);
  }, [isActive]);
  
  return (
    <div className="ai-trading-engine bg-gray-800 rounded-lg p-5 shadow-lg">
      <h2 className="text-xl font-semibold mb-4 flex items-center">
        <span className="mr-2">AI Trading Engine</span>
        {isActive && (
          <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-green-900 text-green-300">
            <span className="animate-pulse mr-1">●</span>
            Active
          </span>
        )}
      </h2>
      
      {/* Status and Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-gray-700 p-4 rounded-lg">
          <h3 className="text-sm text-gray-400 mb-2">Status</h3>
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">{isActive ? 'Active' : 'Inactive'}</div>
              {isActive && (
                <div className="text-sm text-gray-400">
                  Runtime: {getActivationTimeString()}
                </div>
              )}
            </div>
            
            <button
              onClick={toggleActivation}
              disabled={!walletConnected}
              className={`px-4 py-2 rounded-md transition ${
                isActive
                  ? 'bg-red-600 hover:bg-red-700'
                  : 'bg-green-600 hover:bg-green-700'
              } ${!walletConnected ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isActive ? 'Deactivate' : 'Activate'}
            </button>
          </div>
          
          {!walletConnected && (
            <div className="text-yellow-400 text-sm mt-2">
              Connect wallet to activate trading
            </div>
          )}
        </div>
        
        <div className="bg-gray-700 p-4 rounded-lg">
          <h3 className="text-sm text-gray-400 mb-2">Performance</h3>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <div className="text-xs text-gray-400">Executed</div>
              <div className="font-medium">{tradingStats.tradesExecuted}</div>
            </div>
            <div>
              <div className="text-xs text-gray-400">Win Rate</div>
              <div className="font-medium">
                {tradingStats.tradesExecuted > 0
                  ? `${((tradingStats.profitableTrades / tradingStats.tradesExecuted) * 100).toFixed(1)}%`
                  : '0%'}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-400">PnL</div>
              <div className={`font-medium ${tradingStats.totalPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {tradingStats.totalPnL >= 0 ? '+' : ''}{tradingStats.totalPnL.toFixed(2)} USD
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Configuration */}
      <div className="bg-gray-700 p-4 rounded-lg mb-6">
        <h3 className="text-sm text-gray-400 mb-3">Configuration</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Strategy selection */}
          <div>
            <label className="block text-sm font-medium mb-2">Trading Strategy</label>
            <select
              value={strategy}
              onChange={(e) => updateStrategy(e.target.value)}
              disabled={isActive}
              className="w-full bg-gray-800 border border-gray-600 rounded-md px-3 py-2"
            >
              {Object.entries(tradingStrategies).map(([key, strategyObj]) => (
                <option key={key} value={key}>
                  {strategyObj.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-400 mt-1">
              {tradingStrategies[strategy]?.description}
            </p>
          </div>
          
          {/* Risk level selection */}
          <div>
            <label className="block text-sm font-medium mb-2">Risk Level</label>
            <div className="flex space-x-2">
              {['low', 'medium', 'high'].map((level) => (
                <button
                  key={level}
                  onClick={() => updateRiskLevel(level)}
                  disabled={isActive}
                  className={`flex-1 py-2 px-4 rounded-md ${
                    riskLevel === level
                      ? 'bg-blue-600'
                      : 'bg-gray-600 hover:bg-gray-500'
                  } ${isActive ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {level.charAt(0).toUpperCase() + level.slice(1)}
                </button>
              ))}
            </div>
            
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-3">
              <div className="text-xs text-gray-400">Max Position Size:</div>
              <div className="text-xs text-right">{(tradingLimits.maxPositionSize * 100).toFixed(0)}% of balance</div>
              
              <div className="text-xs text-gray-400">Stop Loss:</div>
              <div className="text-xs text-right">{tradingLimits.stopLossPercentage}%</div>
              
              <div className="text-xs text-gray-400">Take Profit:</div>
              <div className="text-xs text-right">{tradingLimits.takeProfitPercentage}%</div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Trading Queue */}
      <div className="bg-gray-700 p-4 rounded-lg mb-6 overflow-hidden">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-sm text-gray-400">Trading Queue</h3>
          <div className="text-xs">
            {tradingQueue.filter(trade => trade.status === 'pending').length} pending
          </div>
        </div>
        
        <div className="max-h-48 overflow-y-auto">
          {tradingQueue.length > 0 ? (
            <div className="space-y-2">
              {tradingQueue.slice().reverse().map(trade => (
                <div 
                  key={trade.id} 
                  className={`p-2 rounded-md text-sm ${
                    trade.status === 'pending' ? 'bg-gray-600' :
                    trade.status === 'executing' ? 'bg-yellow-900/30 border border-yellow-800' :
                    trade.status === 'completed' ? 'bg-green-900/30 border border-green-800' :
                    'bg-red-900/30 border border-red-800'
                  }`}
                >
                  <div className="flex justify-between">
                    <div className="font-medium capitalize">
                      {trade.action} {trade.token}
                    </div>
                    <div className="text-xs capitalize">
                      {trade.status === 'executing' && (
                        <span className="flex items-center">
                          <span className="w-2 h-2 border-t border-r border-white border-solid rounded-full animate-spin mr-1"></span>
                          {trade.status}
                        </span>
                      )}
                      {trade.status !== 'executing' && trade.status}
                    </div>
                  </div>
                  
                  <div className="text-xs mt-1 flex justify-between">
                    <div>Confidence: {(trade.confidence * 100).toFixed(0)}%</div>
                    <div className="text-gray-400">{new Date(trade.timestamp).toLocaleTimeString()}</div>
                  </div>
                  
                  {trade.error && (
                    <div className="text-xs text-red-400 mt-1">{trade.error}</div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4 text-gray-500">
              No pending trades
            </div>
          )}
        </div>
      </div>
      
      {/* Recent Executions */}
      <div className="bg-gray-700 p-4 rounded-lg">
        <h3 className="text-sm text-gray-400 mb-3">Recent Executions</h3>
        
        {tradeHistory.length > 0 ? (
          <div className="max-h-48 overflow-y-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-400">
                  <th className="text-left py-2">Token</th>
                  <th className="text-left py-2">Action</th>
                  <th className="text-right py-2">Time</th>
                  <th className="text-right py-2">Strategy</th>
                </tr>
              </thead>
              <tbody>
                {tradeHistory.slice().reverse().map(trade => (
                  <tr key={trade.id} className="border-t border-gray-600">
                    <td className="py-2">{trade.token}</td>
                    <td className="py-2 capitalize">{trade.action}</td>
                    <td className="py-2 text-right">{new Date(trade.timestamp).toLocaleTimeString()}</td>
                    <td className="py-2 text-right capitalize">{trade.strategy}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-4 text-gray-500">
            No execution history
          </div>
        )}
      </div>
    </div>
  );
};

export default AITradingEngine;
