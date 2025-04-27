'use client';

import { startAppTransaction, finishAppTransaction } from './sentryUtils.js';
import logger from './logger.js';
import marketDataAggregator from './marketDataAggregator.js';
import tradingStrategies from './tradingStrategies.js';
import tradeExecutionService from './tradeExecutionService.js';
import axios from 'axios';

/**
 * Trade Decision Engine
 * 
 * This service analyzes market data and generates trading signals.
 * It uses AI and technical analysis to make trading decisions.
 */
class TradeDecisionEngine {
  constructor() {
    this.initialized = false;
    this.activeStrategies = new Map();
    this.signalHistory = new Map();
    this.watchlist = new Set();
    
    // Default strategy weights
    this.strategyWeights = {
      movingAverageCrossover: 0.2,
      macdStrategy: 0.2,
      rsiOscillator: 0.2,
      bollingerBandReversion: 0.2,
      ichimokuCloud: 0.2
    };
    
    // Risk management settings
    this.riskSettings = {
      maxPositionSize: 0.05, // 5% of portfolio
      stopLossPercent: 0.02, // 2% stop loss
      takeProfitPercent: 0.05, // 5% take profit
      maxDailyLoss: 0.03, // 3% max daily loss
      maxOpenPositions: 5 // Maximum number of open positions
    };
    
    // Market sentiment analysis
    this.marketSentiment = {
      overall: 'neutral', // 'bullish', 'neutral', 'bearish'
      lastUpdated: null,
      indicators: {}
    };
  }

  /**
   * Initialize the trade decision engine (alias for init)
   */
  async initialize() {
    return this.init();
  }

  /**
   * Initialize the trade decision engine
   */
  async init() {
    const transaction = startAppTransaction('trade-decision-init', 'decision.init');
    
    try {
      // Initialize market data aggregator
      if (!marketDataAggregator.isInitialized()) {
        await marketDataAggregator.initialize();
      }
      
      // Initialize trading strategies
      if (!tradingStrategies.isInitialized()) {
        await tradingStrategies.initialize();
      }
      
      // Initialize trade execution service
      if (!tradeExecutionService.isInitialized()) {
        await tradeExecutionService.initialize();
      }
      
      // Initialize default active strategies
      this.initDefaultStrategies();
      
      this.initialized = true;
      logger.info('Trade decision engine initialized successfully');
      return true;
    } catch (error) {
      logger.error(`Trade decision engine initialization error: ${error.message}`);
      return false;
    } finally {
      finishAppTransaction(transaction);
    }
  }

  /**
   * Initialize default strategies
   */
  initDefaultStrategies() {
    // Moving Average Crossover
    this.activeStrategies.set('movingAverageCrossover', {
      name: 'Moving Average Crossover',
      enabled: true,
      params: {
        fastPeriod: 9,
        slowPeriod: 21,
        signalType: 'ema'
      },
      timeframes: ['1h', '4h', '1d'],
      assets: []
    });
    
    // MACD Strategy
    this.activeStrategies.set('macdStrategy', {
      name: 'MACD Strategy',
      enabled: true,
      params: {
        fastPeriod: 12,
        slowPeriod: 26,
        signalPeriod: 9,
        useHistogram: true
      },
      timeframes: ['1h', '4h', '1d'],
      assets: []
    });
    
    // RSI Oscillator
    this.activeStrategies.set('rsiOscillator', {
      name: 'RSI Oscillator',
      enabled: true,
      params: {
        period: 14,
        overbought: 70,
        oversold: 30,
        useAdaptiveThresholds: true
      },
      timeframes: ['1h', '4h', '1d'],
      assets: []
    });
    
    // Bollinger Band Reversion
    this.activeStrategies.set('bollingerBandReversion', {
      name: 'Bollinger Band Reversion',
      enabled: true,
      params: {
        period: 20,
        stdDev: 2,
        useVolume: true,
        requireClosing: true
      },
      timeframes: ['1h', '4h', '1d'],
      assets: []
    });
    
    // Ichimoku Cloud
    this.activeStrategies.set('ichimokuCloud', {
      name: 'Ichimoku Cloud',
      enabled: true,
      params: {
        conversionPeriod: 9,
        basePeriod: 26,
        laggingSpanPeriod: 52,
        displacement: 26
      },
      timeframes: ['4h', '1d'],
      assets: []
    });
  }

  /**
   * Check if the engine is initialized
   * 
   * @returns {boolean} - Whether the engine is initialized
   */
  isInitialized() {
    return this.initialized;
  }

  /**
   * Ensure the engine is initialized
   * 
   * @throws {Error} - If the engine is not initialized
   */
  ensureInitialized() {
    if (!this.initialized) {
      throw new Error('Trade decision engine not initialized');
    }
  }

  /**
   * Add asset to watchlist
   * 
   * @param {string} asset - Asset symbol or address
   * @returns {boolean} - Success status
   */
  addToWatchlist(asset) {
    try {
      this.ensureInitialized();
      
      if (!asset) {
        throw new Error('Asset is required');
      }
      
      this.watchlist.add(asset);
      logger.info(`Added ${asset} to watchlist`);
      
      return true;
    } catch (error) {
      logger.error(`Error adding ${asset} to watchlist: ${error.message}`);
      return false;
    }
  }

  /**
   * Remove asset from watchlist
   * 
   * @param {string} asset - Asset symbol or address
   * @returns {boolean} - Success status
   */
  removeFromWatchlist(asset) {
    try {
      this.ensureInitialized();
      
      if (!asset) {
        throw new Error('Asset is required');
      }
      
      const result = this.watchlist.delete(asset);
      
      if (result) {
        logger.info(`Removed ${asset} from watchlist`);
      } else {
        logger.warn(`${asset} not found in watchlist`);
      }
      
      return result;
    } catch (error) {
      logger.error(`Error removing ${asset} from watchlist: ${error.message}`);
      return false;
    }
  }

  /**
   * Get watchlist
   * 
   * @returns {Array<string>} - Watchlist assets
   */
  getWatchlist() {
    try {
      this.ensureInitialized();
      return Array.from(this.watchlist);
    } catch (error) {
      logger.error(`Error getting watchlist: ${error.message}`);
      return [];
    }
  }

  /**
   * Analyze asset and generate trading recommendation with stop-loss and take-profit
   * 
   * @param {string} asset - Asset symbol
   * @param {Object} options - Analysis options
   * @returns {Promise<Object>} - Trading recommendation
   */
  async analyzeAsset(asset, options = {}) {
    const transaction = startAppTransaction('analyze-asset', 'trading.analyze');
    
    try {
      this.ensureInitialized();
      
      if (!asset) {
        throw new Error('Asset is required');
      }
      
      // Set default options
      const analysisOptions = {
        timeframe: options.timeframe || '1h',
        strategies: options.strategies || Array.from(this.activeStrategies.keys()),
        requireConsensus: options.requireConsensus !== undefined ? options.requireConsensus : true,
        consensusThreshold: options.consensusThreshold || 0.7,
        ...options
      };
      
      logger.info(`Analyzing ${asset} with timeframe ${analysisOptions.timeframe}`);
      
      // Get market data
      const marketData = await marketDataAggregator.getMarketData(asset, analysisOptions.timeframe);
      
      if (!marketData || !marketData.success) {
        throw new Error(`Failed to get market data for ${asset}`);
      }
      
      // Current price from market data
      const currentPrice = marketData.data?.price || marketData.data?.close?.[marketData.data.close.length - 1] || 100;
      
      // Run strategies and collect signals
      const signals = [];
      let totalWeight = 0;
      
      for (const strategyKey of analysisOptions.strategies) {
        const strategyConfig = this.activeStrategies.get(strategyKey);
        
        if (strategyConfig && strategyConfig.enabled) {
          const weight = this.strategyWeights[strategyKey] || 0.2; // Default weight if not specified
          
          try {
            // If the strategy exists in tradingStrategies, run it
            if (typeof tradingStrategies[strategyKey] === 'function') {
              const signal = await tradingStrategies[strategyKey](marketData.data, strategyConfig.params);
              
              signals.push({
                strategy: strategyKey,
                signal: signal.signal || 'hold',
                confidence: signal.confidence || 0.5,
                weight
              });
              
              totalWeight += weight;
            }
          } catch (strategyError) {
            logger.error(`Error running strategy ${strategyKey} for ${asset}: ${strategyError.message}`);
          }
        }
      }
      
      // Calculate consensus
      let buySignals = 0;
      let sellSignals = 0;
      let holdSignals = 0;
      let buyConfidence = 0;
      let sellConfidence = 0;
      
      for (const signal of signals) {
        if (signal.signal === 'buy') {
          buySignals++;
          buyConfidence += signal.confidence * signal.weight;
        } else if (signal.signal === 'sell') {
          sellSignals++;
          sellConfidence += signal.confidence * signal.weight;
        } else {
          holdSignals++;
        }
      }
      
      // Determine recommendation
      let recommendedAction = 'hold';
      let confidence = 0.5;
      
      if (buySignals > sellSignals && buyConfidence / totalWeight > analysisOptions.consensusThreshold) {
        recommendedAction = 'buy';
        confidence = buyConfidence / totalWeight;
      } else if (sellSignals > buySignals && sellConfidence / totalWeight > analysisOptions.consensusThreshold) {
        recommendedAction = 'sell';
        confidence = sellConfidence / totalWeight;
      }
      
      // Calculate stop-loss and take-profit based on volatility and confidence
      const stopLossPercent = this.riskSettings.stopLossPercent * (1.5 - confidence); // Higher confidence = tighter stop-loss
      const takeProfitPercent = this.riskSettings.takeProfitPercent * confidence * 1.5; // Higher confidence = higher take-profit
      
      // Calculate actual stop-loss and take-profit prices
      const stopLossPrice = recommendedAction === 'buy' 
        ? currentPrice * (1 - stopLossPercent)
        : recommendedAction === 'sell'
          ? currentPrice * (1 + stopLossPercent)
          : null;
          
      const takeProfitPrice = recommendedAction === 'buy'
        ? currentPrice * (1 + takeProfitPercent)
        : recommendedAction === 'sell'
          ? currentPrice * (1 - takeProfitPercent)
          : null;
      
      // Create recommendation object
      const recommendation = {
        asset,
        timeframe: analysisOptions.timeframe,
        currentPrice,
        signal: recommendedAction,
        confidence,
        hasConsensus: confidence >= analysisOptions.consensusThreshold,
        stopLoss: stopLossPrice,
        takeProfit: takeProfitPrice,
        riskReward: takeProfitPrice && stopLossPrice ? 
          Math.abs((takeProfitPrice - currentPrice) / (currentPrice - stopLossPrice)) : null,
        timestamp: new Date().toISOString(),
        signals,
        buySignals,
        sellSignals,
        holdSignals,
        totalSignals: signals.length
      };
      
      // Log the recommendation
      logger.info(`Analysis for ${asset}: ${recommendation.signal} (confidence: ${(recommendation.confidence * 100).toFixed(2)}%)`);
      
      // Store the recommendation in signal history
      this.signalHistory.set(asset, recommendation);
      
      return recommendation;
    } catch (error) {
      logger.error(`Error analyzing ${asset}: ${error.message}`);
      
      // Return a basic recommendation object even if there's an error
      return {
        asset,
        signal: 'hold',
        confidence: 0,
        hasConsensus: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    } finally {
      finishAppTransaction(transaction);
    }
  }
}

// Create singleton instance
const tradeDecisionEngine = new TradeDecisionEngine();

export default tradeDecisionEngine;
