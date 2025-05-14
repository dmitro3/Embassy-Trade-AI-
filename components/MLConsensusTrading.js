'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import toast from 'react-hot-toast';

// Constant for minimum consensus threshold (percentage of ML models that must agree)
const CONSENSUS_THRESHOLD = 70; // 70% of models must agree

/**
 * Component for ML model consensus trading system
 * Implements a "roundtable" of multiple ML models that vote on trade opportunities
 * Provides auto-trade functionality for paper trading on devnet/testnet
 */
const MLConsensusTrading = ({ 
  onTradeSignal, 
  onAutoTrade, 
  className = '',
  tradingEnabled = true 
}) => {
  const { publicKey, connected } = useWallet();
  const [activeModels, setActiveModels] = useState([
    { id: 'price-momentum', name: 'Price Momentum', active: true, vote: null, confidence: 0 },
    { id: 'volatility', name: 'Volatility Analysis', active: true, vote: null, confidence: 0 },
    { id: 'sentiment', name: 'Market Sentiment', active: true, vote: null, confidence: 0 },
    { id: 'volume-pattern', name: 'Volume Pattern', active: true, vote: null, confidence: 0 },
    { id: 'technical', name: 'Technical Indicators', active: true, vote: null, confidence: 0 }
  ]);
  const [consensusReached, setConsensusReached] = useState(false);
  const [consensusPercentage, setConsensusPercentage] = useState(0);
  const [autoTradeEnabled, setAutoTradeEnabled] = useState(false);
  const [currentSignal, setCurrentSignal] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [tradingStats, setTradingStats] = useState({
    totalTrades: 0,
    winningTrades: 0,
    winRate: 0,
    avgProfit: 0
  });
  
  // Calculate consensus based on model votes
  const calculateConsensus = useCallback(() => {
    const activeModelCount = activeModels.filter(m => m.active).length;
    if (activeModelCount === 0) return { reached: false, percentage: 0, signal: null };
    
    const buyVotes = activeModels.filter(m => m.active && m.vote === 'buy').length;
    const sellVotes = activeModels.filter(m => m.active && m.vote === 'sell').length;
    
    let consensusDirection = null;
    let votesInConsensus = 0;
    
    if (buyVotes > sellVotes) {
      consensusDirection = 'buy';
      votesInConsensus = buyVotes;
    } else if (sellVotes > buyVotes) {
      consensusDirection = 'sell';
      votesInConsensus = sellVotes;
    }
    
    const consensusPercentage = activeModelCount > 0 
      ? (votesInConsensus / activeModelCount) * 100 
      : 0;
    
    const consensusReached = consensusPercentage >= CONSENSUS_THRESHOLD;
    
    // Calculate average confidence for the winning direction
    const avgConfidence = consensusDirection
      ? activeModels
          .filter(m => m.active && m.vote === consensusDirection)
          .reduce((sum, model) => sum + model.confidence, 0) / votesInConsensus
      : 0;
    
    return { 
      reached: consensusReached, 
      percentage: consensusPercentage,
      direction: consensusDirection,
      confidence: avgConfidence
    };
  }, [activeModels]);
  
  // Simulate ML model voting (in a real system, these would be API calls to ML services)
  const runModelAnalysis = useCallback(async () => {
    if (!tradingEnabled || !connected || isAnalyzing) return;
    
    setIsAnalyzing(true);
    
    try {
      // In a real system, this would query actual ML models via API
      // For demo purposes, we're simulating responses
      
      // Get real market data for simulation basis
      const marketData = await fetchMarketData();
      
      // Update models with "predictions"
      const updatedModels = activeModels.map(model => {
        if (!model.active) return model;
        
        // Simulate different model behaviors
        let vote, confidence;
        
        switch (model.id) {
          case 'price-momentum':
            // Price momentum tends to follow recent trends
            vote = marketData.recentTrend === 'up' ? 'buy' : 'sell';
            confidence = Math.random() * 30 + 70; // 70-100%
            break;
            
          case 'volatility':
            // Volatility analysis looks for breakouts
            vote = marketData.volatility > 20 ? 'buy' : 'sell';
            confidence = Math.random() * 40 + 60; // 60-100%
            break;
            
          case 'sentiment':
            // Sentiment analysis from social media, news
            vote = marketData.sentiment > 0 ? 'buy' : 'sell';
            confidence = Math.random() * 50 + 50; // 50-100%
            break;
            
          case 'volume-pattern':
            // Volume pattern analysis
            vote = marketData.volumeAnomaly ? 'buy' : 'sell';
            confidence = Math.random() * 35 + 65; // 65-100%
            break;
            
          case 'technical':
            // Technical indicators
            vote = marketData.technicalSignal === 'bullish' ? 'buy' : 'sell';
            confidence = Math.random() * 25 + 75; // 75-100%
            break;
            
          default:
            vote = Math.random() > 0.5 ? 'buy' : 'sell';
            confidence = Math.random() * 100;
        }
        
        return { ...model, vote, confidence };
      });
      
      setActiveModels(updatedModels);
      
      // Calculate new consensus
      const consensus = calculateConsensus();
      setConsensusReached(consensus.reached);
      setConsensusPercentage(consensus.percentage);
      
      // If consensus reached, generate trading signal
      if (consensus.reached && consensus.direction) {
        const signal = generateTradeSignal(consensus.direction, consensus.confidence, marketData);
        setCurrentSignal(signal);
        
        // Call the parent handler if provided
        if (onTradeSignal) {
          onTradeSignal(signal);
        }
        
        // If auto-trade is enabled, execute the trade
        if (autoTradeEnabled) {
          executePaperTrade(signal);
        }
      }
    } catch (error) {
      console.error('Error running ML analysis:', error);
      toast.error('Failed to analyze market data');
    } finally {
      setIsAnalyzing(false);
      
      // Schedule next analysis
      setTimeout(() => {
        runModelAnalysis();
      }, 30000); // Run every 30 seconds
    }
  }, [activeModels, autoTradeEnabled, calculateConsensus, connected, isAnalyzing, onTradeSignal, tradingEnabled]);
  
  // Toggle model active state
  const toggleModel = (modelId) => {
    setActiveModels(models => 
      models.map(model => 
        model.id === modelId 
          ? { ...model, active: !model.active } 
          : model
      )
    );
  };
  
  // Toggle auto-trading
  const toggleAutoTrading = () => {
    const newState = !autoTradeEnabled;
    setAutoTradeEnabled(newState);
    
    // Notify parent component
    if (onAutoTrade) {
      onAutoTrade(newState);
    }
    
    // Show appropriate toast notification
    if (newState) {
      toast.success('Auto-trading enabled. Trades will be executed automatically when consensus is reached.');
    } else {
      toast.info('Auto-trading disabled. You will need to manually confirm trades.');
    }
  };
  
  // Fetch market data (in a real system, this would come from actual market APIs)
  const fetchMarketData = async () => {
    try {
      // In a real system, this would fetch from cryptocurrency APIs
      // For demo purposes, we're generating synthetic data
      return {
        recentTrend: Math.random() > 0.5 ? 'up' : 'down',
        volatility: Math.random() * 40, // 0-40%
        sentiment: Math.random() * 2 - 1, // -1 to 1
        volumeAnomaly: Math.random() > 0.7, // 30% chance of volume anomaly
        technicalSignal: Math.random() > 0.5 ? 'bullish' : 'bearish',
        price: 10 + Math.random() * 90, // $10-$100
        volume24h: 100000 + Math.random() * 900000, // $100k-$1M
        marketCap: 1000000 + Math.random() * 9000000, // $1M-$10M
        pairSymbol: 'SOL/USDC',
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('Error fetching market data:', error);
      throw new Error('Failed to fetch market data');
    }
  };
  
  // Generate a trade signal based on consensus
  const generateTradeSignal = (direction, confidence, marketData) => {
    return {
      id: `signal-${Date.now()}`,
      timestamp: Date.now(),
      tradePair: marketData.pairSymbol,
      action: direction,
      price: marketData.price,
      profitPotential: `${(confidence / 10).toFixed(2)}%`,
      riskLevel: confidence > 80 ? 'Low' : confidence > 60 ? 'Medium' : 'High',
      pattern: direction === 'buy' ? 'Bullish Consensus' : 'Bearish Consensus',
      models: activeModels
        .filter(m => m.active && m.vote === direction)
        .map(m => ({ name: m.name, confidence: m.confidence }))
    };
  };
  
  // Execute paper trade on devnet/testnet
  const executePaperTrade = async (signal) => {
    if (!connected || !publicKey) {
      toast.error('Wallet not connected');
      return false;
    }
    
    try {
      // In a real system, this would interact with a paper trading API
      // For demo, we're simulating trade execution and tracking stats
      
      // Simulate successful trade execution
      const tradeResult = {
        ...signal,
        executionTimestamp: Date.now(),
        executionPrice: signal.price,
        status: 'executed',
        txHash: `sim-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 7)}`
      };
      
      // Log the trade (in a real system, this would go to a database)
      console.log('Paper trade executed:', tradeResult);
      
      // Update trading statistics
      const isWinningTrade = Math.random() < 0.65; // 65% win rate for demo
      const profit = isWinningTrade 
        ? parseFloat(signal.profitPotential) 
        : -parseFloat(signal.profitPotential) / 2;
      
      setTradingStats(prev => {
        const newTotal = prev.totalTrades + 1;
        const newWinning = prev.winningTrades + (isWinningTrade ? 1 : 0);
        return {
          totalTrades: newTotal,
          winningTrades: newWinning,
          winRate: (newWinning / newTotal) * 100,
          avgProfit: ((prev.avgProfit * prev.totalTrades) + profit) / newTotal
        };
      });
      
      // Notify success
      toast.success(`${signal.action.toUpperCase()} trade executed at $${signal.price.toFixed(2)}`);
      
      return true;
    } catch (error) {
      console.error('Paper trade execution error:', error);
      toast.error('Failed to execute paper trade');
      return false;
    }
  };
  
  // Start the analysis when component mounts
  useEffect(() => {
    if (connected && tradingEnabled) {
      runModelAnalysis();
    }
    
    return () => {
      // Clean up any pending timers
    };
  }, [connected, runModelAnalysis, tradingEnabled]);
  
  return (
    <div className={`ml-consensus-trading ${className}`}>
      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700/50">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium">ML Roundtable Consensus</h2>
          <div className="flex items-center">
            <span className={`w-2 h-2 rounded-full mr-2 ${isAnalyzing ? 'bg-blue-500 animate-pulse' : 'bg-gray-500'}`}></span>
            <span className="text-sm text-gray-400">{isAnalyzing ? 'Analyzing...' : 'Idle'}</span>
          </div>
        </div>
        
        {/* Trading Stats */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          <div className="bg-gray-700/40 rounded p-2 text-center">
            <p className="text-xs text-gray-400">Total Trades</p>
            <p className="font-medium">{tradingStats.totalTrades}</p>
          </div>
          <div className="bg-gray-700/40 rounded p-2 text-center">
            <p className="text-xs text-gray-400">Win Rate</p>
            <p className="font-medium">{tradingStats.winRate.toFixed(1)}%</p>
          </div>
          <div className="bg-gray-700/40 rounded p-2 text-center">
            <p className="text-xs text-gray-400">Avg. Profit</p>
            <p className={`font-medium ${tradingStats.avgProfit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {tradingStats.avgProfit.toFixed(2)}%
            </p>
          </div>
          <div className="bg-gray-700/40 rounded p-2 text-center">
            <p className="text-xs text-gray-400">Consensus</p>
            <p className="font-medium">{consensusPercentage.toFixed(0)}%</p>
          </div>
        </div>
        
        {/* Auto-Trade Toggle */}
        <div className={`mb-4 p-3 rounded-lg ${
          consensusReached ? 'bg-green-500/10 border border-green-500/30' : 'bg-gray-700/30'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-sm">Auto-Trading</h3>
              <p className="text-xs text-gray-400">
                {autoTradeEnabled 
                  ? 'Trades will execute automatically when consensus is reached' 
                  : 'Toggle to enable automatic trade execution'
                }
              </p>
            </div>
            
            <div className="flex items-center">
              <span className={`mr-2 text-sm ${autoTradeEnabled ? 'text-green-500' : 'text-gray-400'}`}>
                {autoTradeEnabled ? 'Enabled' : 'Disabled'}
              </span>
              <button 
                onClick={toggleAutoTrading}
                disabled={!connected}
                className={`relative inline-flex h-6 w-12 items-center rounded-full ${
                  connected ? (autoTradeEnabled ? 'bg-green-600' : 'bg-gray-600') : 'bg-gray-700 opacity-50'
                }`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                  autoTradeEnabled ? 'translate-x-7' : 'translate-x-1'
                }`} />
              </button>
            </div>
          </div>
          
          {consensusReached && (
            <div className="mt-2 text-center">
              <div className="text-sm text-green-500 font-medium">
                Consensus Reached: {consensusPercentage.toFixed(0)}% of models agree on {currentSignal?.action.toUpperCase()}
              </div>
            </div>
          )}
        </div>
        
        {/* ML Models Status */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium mb-2">Active ML Models</h3>
          
          {activeModels.map((model) => (
            <div key={model.id} className="flex items-center justify-between">
              <div className="flex items-center">
                <button
                  onClick={() => toggleModel(model.id)}
                  className={`relative inline-flex h-4 w-8 items-center rounded-full mr-2 ${
                    model.active ? 'bg-blue-600' : 'bg-gray-600'
                  }`}
                >
                  <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition ${
                    model.active ? 'translate-x-4' : 'translate-x-1'
                  }`} />
                </button>
                <span className={`text-sm ${model.active ? 'text-white' : 'text-gray-500'}`}>
                  {model.name}
                </span>
              </div>
              
              <div className="flex items-center">
                {model.vote && model.active && (
                  <>
                    <span className={`text-xs font-medium ${
                      model.vote === 'buy' ? 'text-green-500' : 'text-red-500'
                    }`}>
                      {model.vote.toUpperCase()}
                    </span>
                    <div className="ml-2 w-12 bg-gray-700 rounded-full h-1.5">
                      <div 
                        className={`h-1.5 rounded-full ${
                          model.vote === 'buy' ? 'bg-green-500' : 'bg-red-500'
                        }`} 
                        style={{ width: `${model.confidence}%` }}
                      ></div>
                    </div>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MLConsensusTrading;
