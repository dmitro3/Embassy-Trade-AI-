'use client';

import { startAppTransaction, finishAppTransaction } from './sentryUtils.js';
import logger from './logger.js';
import marketDataAggregator from './marketDataAggregator.js';
import tradingStrategies from './tradingStrategies.js';
import tradeExecutionService from './tradeExecutionService.js';
import axios from 'axios';
import * as tf from '@tensorflow/tfjs';

/**
 * Trade Decision Engine
 * 
 * This service analyzes market data and generates trading signals.
 * It uses AI agents and technical analysis to make trading decisions.
 * 
 * Implements 3 AI agents (Trend, Momentum, Volatility) to analyze live data
 * and execute trades with 70%+ consensus.
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
    
    // AI Agents
    this.aiAgents = {
      trend: {
        name: 'Trend Agent',
        enabled: true,
        model: null,
        confidence: 0,
        signal: 'hold',
        lastUpdate: null
      },
      momentum: {
        name: 'Momentum Agent',
        enabled: true,
        model: null,
        confidence: 0,
        signal: 'hold',
        lastUpdate: null
      },
      volatility: {
        name: 'Volatility Agent',
        enabled: true,
        model: null,
        confidence: 0,
        signal: 'hold',
        lastUpdate: null
      }
    };
    
    // Consensus settings
    this.consensusSettings = {
      threshold: 0.7, // 70% consensus required for trade execution
      minAgents: 2, // At least 2 agents must agree
      checkInterval: 5 * 60 * 1000 // Check consensus every 5 minutes
    };
    
    // Trading session
    this.tradingSession = {
      active: false,
      startTime: null,
      trades: [],
      performance: {
        winRate: 0,
        profitLoss: 0,
        totalTrades: 0
      }
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
      
      // Initialize AI agents
      await this.initAIAgents();
      
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
   * Initialize AI agents with TensorFlow.js models
   */
  async initAIAgents() {
    try {
      logger.info('Initializing AI agents');
      
      // Initialize Trend Agent (Linear Regression model)
      this.aiAgents.trend.model = await this.createTrendModel();
      
      // Initialize Momentum Agent (LSTM model)
      this.aiAgents.momentum.model = await this.createMomentumModel();
      
      // Initialize Volatility Agent (Dense Neural Network)
      this.aiAgents.volatility.model = await this.createVolatilityModel();
      
      logger.info('AI agents initialized successfully');
      return true;
    } catch (error) {
      logger.error(`Error initializing AI agents: ${error.message}`);
      return false;
    }
  }
  
  /**
   * Create trend analysis model (Linear Regression)
   */
  async createTrendModel() {
    try {
      // Create a simple linear regression model
      const model = tf.sequential();
      model.add(tf.layers.dense({
        units: 1,
        inputShape: [10], // 10 price points as input
        activation: 'linear'
      }));
      
      model.compile({
        optimizer: tf.train.adam(0.01),
        loss: 'meanSquaredError'
      });
      
      logger.info('Trend model created successfully');
      return model;
    } catch (error) {
      logger.error(`Error creating trend model: ${error.message}`);
      return null;
    }
  }
  
  /**
   * Create momentum analysis model (LSTM)
   */
  async createMomentumModel() {
    try {
      // Create a simple LSTM model for momentum analysis
      const model = tf.sequential();
      model.add(tf.layers.lstm({
        units: 50,
        returnSequences: false,
        inputShape: [20, 5] // 20 time steps, 5 features (OHLCV)
      }));
      model.add(tf.layers.dense({
        units: 1,
        activation: 'sigmoid'
      }));
      
      model.compile({
        optimizer: tf.train.adam(0.001),
        loss: 'binaryCrossentropy',
        metrics: ['accuracy']
      });
      
      logger.info('Momentum model created successfully');
      return model;
    } catch (error) {
      logger.error(`Error creating momentum model: ${error.message}`);
      return null;
    }
  }
  
  /**
   * Create volatility analysis model (Dense Neural Network)
   */
  async createVolatilityModel() {
    try {
      // Create a simple dense neural network for volatility analysis
      const model = tf.sequential();
      model.add(tf.layers.dense({
        units: 32,
        inputShape: [15], // 15 volatility indicators
        activation: 'relu'
      }));
      model.add(tf.layers.dense({
        units: 16,
        activation: 'relu'
      }));
      model.add(tf.layers.dense({
        units: 1,
        activation: 'sigmoid'
      }));
      
      model.compile({
        optimizer: tf.train.adam(0.001),
        loss: 'binaryCrossentropy',
        metrics: ['accuracy']
      });
      
      logger.info('Volatility model created successfully');
      return model;
    } catch (error) {
      logger.error(`Error creating volatility model: ${error.message}`);
      return null;
    }
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
   * Run AI agent round table to get consensus
   * 
   * @param {string} asset - Asset symbol or address
   * @returns {Promise<Object>} - Round table consensus result
   */
  async runRoundTable(asset) {
    const transaction = startAppTransaction('run-round-table', 'ai.roundtable');
    
    try {
      this.ensureInitialized();
      
      if (!asset) {
        throw new Error('Asset is required');
      }
      
      logger.info(`Running AI round table for ${asset}`);
      
      // Get market data
      const marketData = await marketDataAggregator.getMarketData(asset, '1h');
      
      if (!marketData || !marketData.success) {
        throw new Error(`Failed to get market data for ${asset}`);
      }
      
      // Run each AI agent
      const trendSignal = await this.runTrendAgent(asset, marketData.data);
      const momentumSignal = await this.runMomentumAgent(asset, marketData.data);
      const volatilitySignal = await this.runVolatilityAgent(asset, marketData.data);
      
      // Update agent states
      this.aiAgents.trend.signal = trendSignal.signal;
      this.aiAgents.trend.confidence = trendSignal.confidence;
      this.aiAgents.trend.lastUpdate = new Date();
      
      this.aiAgents.momentum.signal = momentumSignal.signal;
      this.aiAgents.momentum.confidence = momentumSignal.confidence;
      this.aiAgents.momentum.lastUpdate = new Date();
      
      this.aiAgents.volatility.signal = volatilitySignal.signal;
      this.aiAgents.volatility.confidence = volatilitySignal.confidence;
      this.aiAgents.volatility.lastUpdate = new Date();
      
      // Calculate consensus
      const signals = [trendSignal, momentumSignal, volatilitySignal];
      const buySignals = signals.filter(s => s.signal === 'buy');
      const sellSignals = signals.filter(s => s.signal === 'sell');
      const holdSignals = signals.filter(s => s.signal === 'hold');
      
      // Calculate weighted confidence
      let buyConfidence = 0;
      let sellConfidence = 0;
      let holdConfidence = 0;
      
      buySignals.forEach(s => buyConfidence += s.confidence);
      sellSignals.forEach(s => sellConfidence += s.confidence);
      holdSignals.forEach(s => holdConfidence += s.confidence);
      
      // Normalize confidences
      const totalConfidence = buyConfidence + sellConfidence + holdConfidence;
      buyConfidence = buyConfidence / totalConfidence;
      sellConfidence = sellConfidence / totalConfidence;
      holdConfidence = holdConfidence / totalConfidence;
      
      // Determine consensus
      let consensusSignal = 'hold';
      let consensusConfidence = holdConfidence;
      
      if (buyConfidence > sellConfidence && buyConfidence > holdConfidence) {
        consensusSignal = 'buy';
