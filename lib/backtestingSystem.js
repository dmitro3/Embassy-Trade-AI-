'use client';

/**
 * TradeForce AI Backtesting System
 * 
 * This module provides backtesting capabilities for the TradeForce AI platform,
 * allowing users to test trading strategies against historical data and optimize
 * strategy parameters.
 * 
 * Features:
 * - Run backtests with configurable parameters
 * - Generate performance reports
 * - Optimize strategy parameters
 * - Visualize backtest results
 */

import logger from './logger';
import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { getApiKey } from './apiKeys';

class BacktestingEngine {
  constructor() {
    this.initialized = false;
    this.historicalData = {};
    this.backtestResults = {};
    this.optimizationResults = {};
    this.dataProviders = {
      birdeye: null,
      kraken: null,
      binance: null
    };
    
    // Default parameters
    this.defaultParams = {
      timeframe: '1d',
      startDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 90 days back
      endDate: new Date().toISOString().split('T')[0], // Today
      initialCapital: 10000,
      feePercentage: 0.1,
      slippagePercentage: 0.5,
      stopLossPercentage: 5,
      takeProfitPercentage: 15,
      tradeSize: 0.1, // 10% of portfolio per trade
      maxOpenTrades: 5
    };
  }

  /**
   * Initialize the backtesting engine
   * @returns {Promise<boolean>} Success status
   */
  async init() {
    try {
      // Set up data provider connections
      const krakenApiKey = await getApiKey('kraken', 'api');
      if (krakenApiKey) {
        this.dataProviders.kraken = {
          apiKey: krakenApiKey.apiKey,
          apiSecret: krakenApiKey.apiSecret,
          baseUrl: 'https://api.kraken.com/0'
        };
        logger.info('Kraken data provider initialized for backtesting');
      }
      
      // Set up Birdeye for Solana data
      const birdeyeApiKey = await getApiKey('birdeye', 'api');
      if (birdeyeApiKey) {
        this.dataProviders.birdeye = {
          apiKey: birdeyeApiKey.apiKey,
          baseUrl: 'https://api.birdeye.so/v1'
        };
        logger.info('Birdeye data provider initialized for backtesting');
      }
      
      // Set up Binance as fallback
      const binanceApiKey = await getApiKey('binance', 'api');
      if (binanceApiKey) {
        this.dataProviders.binance = {
          apiKey: binanceApiKey.apiKey,
          apiSecret: binanceApiKey.apiSecret,
          baseUrl: 'https://api.binance.com/api/v3'
        };
        logger.info('Binance data provider initialized for backtesting');
      }
      
      this.initialized = true;
      return true;
    } catch (error) {
      logger.error(`Error initializing backtesting engine: ${error.message}`);
      return false;
    }
  }
  
  /**
   * Fetch historical data for backtesting
   * @param {string} symbol - Symbol to fetch data for (e.g., 'BTC/USD')
   * @param {Object} options - Options for data fetching
   * @returns {Promise<Array>} Historical data
   */
  async fetchHistoricalData(symbol, options = {}) {
    try {
      if (!this.initialized) {
        throw new Error('Backtesting engine not initialized');
      }
      
      const params = {
        timeframe: options.timeframe || this.defaultParams.timeframe,
        startDate: options.startDate || this.defaultParams.startDate,
        endDate: options.endDate || this.defaultParams.endDate,
        limit: options.limit || 1000
      };
      
      logger.info(`Fetching historical data for ${symbol} from ${params.startDate} to ${params.endDate}`);
      
      // Determine which data provider to use
      let data = [];
      
      // Try Kraken first for traditional pairs
      if (this.dataProviders.kraken && /^(BTC|ETH|SOL|XRP)\/USD/.test(symbol)) {
        data = await this._fetchKrakenData(symbol, params);
      }
      // For Solana tokens, use Birdeye
      else if (this.dataProviders.birdeye && symbol.length === 44) {
        data = await this._fetchBirdeyeData(symbol, params);
      }
      // Fallback to Binance
      else if (this.dataProviders.binance) {
        data = await this._fetchBinanceData(symbol, params);
      }
      
      // Cache the data
      this.historicalData[`${symbol}_${params.timeframe}`] = data;
      
      return data;
    } catch (error) {
      logger.error(`Error fetching historical data for ${symbol}: ${error.message}`);
      return [];
    }
  }
  
  /**
   * Fetch historical data from Kraken
   * @private
   */
  async _fetchKrakenData(symbol, params) {
    try {
      const krakenSymbol = symbol.replace('/', '');
      
      // Calculate Unix timestamp for start and end dates
      const startTimestamp = Math.floor(new Date(params.startDate).getTime() / 1000);
      const endTimestamp = Math.floor(new Date(params.endDate).getTime() / 1000);
      
      // Map timeframe to Kraken intervals
      const intervalMap = {
        '1m': 1,
        '5m': 5,
        '15m': 15,
        '30m': 30,
        '1h': 60,
        '4h': 240,
        '1d': 1440,
        '7d': 10080,
        '15d': 21600
      };
      
      const interval = intervalMap[params.timeframe];
      
      const response = await axios.get(`${this.dataProviders.kraken.baseUrl}/public/OHLC`, {
        params: {
          pair: krakenSymbol,
          interval,
          since: startTimestamp
        }
      });
      
      if (!response.data || !response.data.result) {
        throw new Error('Invalid response from Kraken');
      }
      
      // Extract and format the data
      const pairData = response.data.result[Object.keys(response.data.result)[0]];
      
      return pairData.map(candle => ({
        timestamp: candle[0] * 1000, // Convert to milliseconds
        open: parseFloat(candle[1]),
        high: parseFloat(candle[2]),
        low: parseFloat(candle[3]),
        close: parseFloat(candle[4]),
        volume: parseFloat(candle[6])
      }));
    } catch (error) {
      logger.error(`Error fetching Kraken data: ${error.message}`);
      return [];
    }
  }
  
  /**
   * Fetch historical data from Birdeye
   * @private
   */
  async _fetchBirdeyeData(symbol, params) {
    try {
      // Map timeframe to Birdeye resolution
      const resolutionMap = {
        '1m': '1',
        '5m': '5',
        '15m': '15',
        '30m': '30',
        '1h': '60',
        '4h': '240',
        '1d': 'D',
        '7d': 'W',
        '30d': 'M'
      };
      
      const resolution = resolutionMap[params.timeframe] || 'D';
      
      // Calculate Unix timestamp for start and end dates
      const startTimestamp = Math.floor(new Date(params.startDate).getTime() / 1000);
      const endTimestamp = Math.floor(new Date(params.endDate).getTime() / 1000);
      
      const response = await axios.get(`${this.dataProviders.birdeye.baseUrl}/defi/history_price`, {
        params: {
          address: symbol,
          type: 'getOhlc',
          resolution,
          from: startTimestamp,
          to: endTimestamp
        },
        headers: {
          'X-API-KEY': this.dataProviders.birdeye.apiKey
        }
      });
      
      if (!response.data || !response.data.data || !Array.isArray(response.data.data)) {
        throw new Error('Invalid response from Birdeye');
      }
      
      return response.data.data.map(candle => ({
        timestamp: candle.time * 1000, // Convert to milliseconds
        open: parseFloat(candle.open),
        high: parseFloat(candle.high),
        low: parseFloat(candle.low),
        close: parseFloat(candle.close),
        volume: parseFloat(candle.volume || 0)
      }));
    } catch (error) {
      logger.error(`Error fetching Birdeye data: ${error.message}`);
      return [];
    }
  }
  
  /**
   * Fetch historical data from Binance
   * @private
   */
  async _fetchBinanceData(symbol, params) {
    try {
      // Convert symbol format if needed
      const binanceSymbol = symbol.replace('/', '');
      
      // Map timeframe to Binance intervals
      const intervalMap = {
        '1m': '1m',
        '5m': '5m',
        '15m': '15m',
        '30m': '30m',
        '1h': '1h',
        '4h': '4h',
        '1d': '1d',
        '7d': '1w',
        '30d': '1M'
      };
      
      const interval = intervalMap[params.timeframe] || '1d';
      
      // Calculate timestamp for start and end dates
      const startTime = new Date(params.startDate).getTime();
      const endTime = new Date(params.endDate).getTime();
      
      const response = await axios.get(`${this.dataProviders.binance.baseUrl}/klines`, {
        params: {
          symbol: binanceSymbol,
          interval,
          startTime,
          endTime,
          limit: params.limit
        }
      });
      
      if (!response.data || !Array.isArray(response.data)) {
        throw new Error('Invalid response from Binance');
      }
      
      return response.data.map(candle => ({
        timestamp: candle[0], // Already in milliseconds
        open: parseFloat(candle[1]),
        high: parseFloat(candle[2]),
        low: parseFloat(candle[3]),
        close: parseFloat(candle[4]),
        volume: parseFloat(candle[5])
      }));
    } catch (error) {
      logger.error(`Error fetching Binance data: ${error.message}`);
      return [];
    }
  }
  
  /**
   * Run a backtest with the given parameters
   * @param {Object} params - Backtest parameters
   * @returns {Object} Backtest results
   */
  async runBacktest(params) {
    try {
      if (!this.initialized) {
        throw new Error('Backtesting engine not initialized');
      }
      
      // Merge with default params
      const backtestParams = {
        ...this.defaultParams,
        ...params
      };
      
      logger.info(`Running backtest with parameters: ${JSON.stringify(backtestParams)}`);
      
      // Ensure we have historical data for each symbol
      const symbols = Array.isArray(backtestParams.symbols) ? backtestParams.symbols : [backtestParams.symbols];
      const historicalDataPromises = symbols.map(symbol => 
        this.fetchHistoricalData(symbol, {
          timeframe: backtestParams.timeframe,
          startDate: backtestParams.startDate,
          endDate: backtestParams.endDate
        })
      );
      
      const historicalDataResults = await Promise.all(historicalDataPromises);
      
      // Check if we have enough data to run the backtest
      const validData = historicalDataResults.every(data => data && data.length > 0);
      if (!validData) {
        throw new Error('Insufficient historical data for backtest');
      }
      
      // Create a portfolio
      const portfolio = {
        cash: backtestParams.initialCapital,
        positions: {},
        trades: [],
        equity: [{ timestamp: historicalDataResults[0][0].timestamp, value: backtestParams.initialCapital }]
      };
      
      // Run the strategy simulation
      const result = await this._simulateStrategy(historicalDataResults, portfolio, backtestParams);
      
      // Calculate performance metrics
      const metrics = this._calculatePerformanceMetrics(result);
      
      // Store the results
      const backtestId = `backtest_${Date.now()}`;
      this.backtestResults[backtestId] = {
        params: backtestParams,
        result,
        metrics
      };
      
      return {
        id: backtestId,
        params: backtestParams,
        metrics,
        equity: result.equity,
        trades: result.trades
      };
    } catch (error) {
      logger.error(`Error running backtest: ${error.message}`);
      return { error: error.message };
    }
  }
  
  /**
   * Simulate the trading strategy
   * @private
   */
  async _simulateStrategy(historicalDataSets, portfolio, params) {
    // Clone the portfolio to avoid modifying the original
    const portfolioClone = JSON.parse(JSON.stringify(portfolio));
    
    // For each data point in time, apply the strategy
    const mainDataSet = historicalDataSets[0]; // Use the first symbol as the main timeline
    
    for (let i = 50; i < mainDataSet.length; i++) { // Start from 50 to have enough data for indicators
      const currentDate = new Date(mainDataSet[i].timestamp);
      
      // Prepare data for strategy
      const dataForStrategy = historicalDataSets.map((dataSet, index) => {
        // Find the closest data point for this timestamp
        const matchingPoint = dataSet.find(d => new Date(d.timestamp).toDateString() === currentDate.toDateString());
        if (!matchingPoint) return null;
        
        // Calculate indicators for this data point
        return {
          symbol: Array.isArray(params.symbols) ? params.symbols[index] : params.symbols,
          timestamp: matchingPoint.timestamp,
          open: matchingPoint.open,
          high: matchingPoint.high,
          low: matchingPoint.low,
          close: matchingPoint.close,
          volume: matchingPoint.volume,
          sma20: this._calculateSMA(dataSet, i, 20),
          sma50: this._calculateSMA(dataSet, i, 50),
          rsi14: this._calculateRSI(dataSet, i, 14)
        };
      }).filter(Boolean);
      
      // Skip if we don't have data for all symbols
      if (dataForStrategy.length !== historicalDataSets.length) continue;
      
      // Apply the strategy
      const signals = this._applyStrategy(dataForStrategy, params);
      
      // Process any open positions for stop-loss/take-profit
      this._processOpenPositions(portfolioClone, dataForStrategy, params);
      
      // Execute trades based on signals
      this._executeTrades(portfolioClone, signals, dataForStrategy, params);
      
      // Update equity curve
      const equity = this._calculatePortfolioValue(portfolioClone, dataForStrategy);
      portfolioClone.equity.push({
        timestamp: mainDataSet[i].timestamp,
        value: equity
      });
    }
    
    // Close any remaining positions at the end of the backtest
    const finalDataPoints = historicalDataSets.map((dataSet, index) => {
      const lastPoint = dataSet[dataSet.length - 1];
      return {
        symbol: Array.isArray(params.symbols) ? params.symbols[index] : params.symbols,
        close: lastPoint.close
      };
    });
    
    this._closeAllPositions(portfolioClone, finalDataPoints);
    
    return portfolioClone;
  }
  
  /**
   * Apply the trading strategy to generate signals
   * @private
   */
  _applyStrategy(dataPoints, params) {
    const signals = [];
    
    // Apply the selected strategy
    switch (params.strategy) {
      case 'sma_crossover':
        // Generate signals based on SMA crossover
        for (const data of dataPoints) {
          if (data.sma20 > data.sma50) {
            signals.push({
              symbol: data.symbol,
              action: 'buy',
              reason: 'SMA20 crossed above SMA50',
              confidence: 0.7,
              price: data.close,
              timestamp: data.timestamp
            });
          } else if (data.sma20 < data.sma50) {
            signals.push({
              symbol: data.symbol,
              action: 'sell',
              reason: 'SMA20 crossed below SMA50',
              confidence: 0.7,
              price: data.close,
              timestamp: data.timestamp
            });
          }
        }
        break;
        
      case 'rsi_overbought_oversold':
        // Generate signals based on RSI overbought/oversold
        for (const data of dataPoints) {
          if (data.rsi14 < 30) {
            signals.push({
              symbol: data.symbol,
              action: 'buy',
              reason: 'RSI oversold (below 30)',
              confidence: 0.8,
              price: data.close,
              timestamp: data.timestamp
            });
          } else if (data.rsi14 > 70) {
            signals.push({
              symbol: data.symbol,
              action: 'sell',
              reason: 'RSI overbought (above 70)',
              confidence: 0.8,
              price: data.close,
              timestamp: data.timestamp
            });
          }
        }
        break;
        
      case 'ai_consensus':
      default:
        // Simulate AI consensus - this would be replaced with actual AI consensus logic
        for (const data of dataPoints) {
          // Simple trend-following logic as placeholder
          const shortTrend = (data.close - data.open) / data.open;
          const momentum = data.volume > this._calculateAverageVolume(data.symbol, data.timestamp);
          
          if (shortTrend > 0.02 && momentum && data.rsi14 < 70) {
            signals.push({
              symbol: data.symbol,
              action: 'buy',
              reason: 'Positive trend with volume confirmation',
              confidence: 0.75,
              price: data.close,
              timestamp: data.timestamp
            });
          } else if (shortTrend < -0.02 && momentum && data.rsi14 > 30) {
            signals.push({
              symbol: data.symbol,
              action: 'sell',
              reason: 'Negative trend with volume confirmation',
              confidence: 0.75,
              price: data.close,
              timestamp: data.timestamp
            });
          }
        }
        break;
    }
    
    return signals;
  }
  
  /**
   * Process open positions for stop-loss/take-profit
   * @private
   */
  _processOpenPositions(portfolio, dataPoints, params) {
    // Get current price map
    const priceMap = dataPoints.reduce((map, data) => {
      map[data.symbol] = { price: data.close, timestamp: data.timestamp };
      return map;
    }, {});
    
    // Check each position
    Object.keys(portfolio.positions).forEach(symbol => {
      const position = portfolio.positions[symbol];
      const currentPrice = priceMap[symbol]?.price;
      
      if (!currentPrice) return;
      
      // Check for stop-loss
      if (position.direction === 'long' && currentPrice <= position.stopLossPrice) {
        // Trigger stop-loss for long position
        this._closePosition(portfolio, symbol, currentPrice, priceMap[symbol].timestamp, 'stop_loss');
      }
      else if (position.direction === 'short' && currentPrice >= position.stopLossPrice) {
        // Trigger stop-loss for short position
        this._closePosition(portfolio, symbol, currentPrice, priceMap[symbol].timestamp, 'stop_loss');
      }
      // Check for take-profit
      else if (position.direction === 'long' && currentPrice >= position.takeProfitPrice) {
        // Trigger take-profit for long position
        this._closePosition(portfolio, symbol, currentPrice, priceMap[symbol].timestamp, 'take_profit');
      }
      else if (position.direction === 'short' && currentPrice <= position.takeProfitPrice) {
        // Trigger take-profit for short position
        this._closePosition(portfolio, symbol, currentPrice, priceMap[symbol].timestamp, 'take_profit');
      }
    });
  }
  
  /**
   * Execute trades based on signals
   * @private
   */
  _executeTrades(portfolio, signals, dataPoints, params) {
    // Skip if we've reached max open trades
    if (Object.keys(portfolio.positions).length >= params.maxOpenTrades) {
      return;
    }
    
    // Process each signal
    for (const signal of signals) {
      // Skip if confidence is too low
      if (signal.confidence < 0.6) {
        continue;
      }
      
      // Skip if we already have a position in this symbol
      if (portfolio.positions[signal.symbol]) {
        continue;
      }
      
      // Calculate position size
      const positionSize = portfolio.cash * params.tradeSize;
      
      // Skip if position size is too small
      if (positionSize < 10) {
        continue;
      }
      
      const quantity = positionSize / signal.price;
      
      // Execute the trade
      if (signal.action === 'buy') {
        // Calculate stop loss and take profit prices
        const stopLossPrice = signal.price * (1 - params.stopLossPercentage / 100);
        const takeProfitPrice = signal.price * (1 + params.takeProfitPercentage / 100);
        
        // Create position
        portfolio.positions[signal.symbol] = {
          direction: 'long',
          entryPrice: signal.price,
          quantity,
          stopLossPrice,
          takeProfitPrice,
          entryTimestamp: signal.timestamp
        };
        
        // Deduct from cash (including fees)
        const fee = positionSize * (params.feePercentage / 100);
        portfolio.cash -= (positionSize + fee);
        
        // Log the trade
        portfolio.trades.push({
          symbol: signal.symbol,
          direction: 'buy',
          price: signal.price,
          quantity,
          value: positionSize,
          fee,
          timestamp: signal.timestamp,
          reason: signal.reason
        });
      } else if (signal.action === 'sell' && params.allowShorts) {
        // For short position (if allowed)
        // Calculate stop loss and take profit prices
        const stopLossPrice = signal.price * (1 + params.stopLossPercentage / 100);
        const takeProfitPrice = signal.price * (1 - params.takeProfitPercentage / 100);
        
        // Create position
        portfolio.positions[signal.symbol] = {
          direction: 'short',
          entryPrice: signal.price,
          quantity,
          stopLossPrice,
          takeProfitPrice,
          entryTimestamp: signal.timestamp
        };
        
        // Deduct fees
        const fee = positionSize * (params.feePercentage / 100);
        portfolio.cash -= fee;
        
        // Log the trade
        portfolio.trades.push({
          symbol: signal.symbol,
          direction: 'sell',
          price: signal.price,
          quantity,
          value: positionSize,
          fee,
          timestamp: signal.timestamp,
          reason: signal.reason
        });
      }
    }
  }
  
  /**
   * Close a position
   * @private
   */
  _closePosition(portfolio, symbol, price, timestamp, reason = 'manual') {
    const position = portfolio.positions[symbol];
    if (!position) return;
    
    // Calculate position value
    const positionValue = position.quantity * price;
    
    // Calculate profit/loss
    let pnl;
    if (position.direction === 'long') {
      pnl = positionValue - (position.quantity * position.entryPrice);
    } else {
      pnl = (position.quantity * position.entryPrice) - positionValue;
    }
    
    // Apply fees
    const fee = positionValue * (0.1 / 100); // Using 0.1% fee for exits
    
    // Update cash
    portfolio.cash += (positionValue - fee);
    
    // Log the trade
    portfolio.trades.push({
      symbol,
      direction: position.direction === 'long' ? 'sell' : 'buy',
      price,
      quantity: position.quantity,
      value: positionValue,
      fee,
      pnl,
      timestamp,
      reason,
      holdingTime: timestamp - position.entryTimestamp // holding time in milliseconds
    });
    
    // Remove the position
    delete portfolio.positions[symbol];
  }
  
  /**
   * Close all positions at the end of the backtest
   * @private
   */
  _closeAllPositions(portfolio, finalDataPoints) {
    // Create a map of final prices
    const priceMap = finalDataPoints.reduce((map, data) => {
      map[data.symbol] = data.close;
      return map;
    }, {});
    
    // Close each position
    Object.keys(portfolio.positions).forEach(symbol => {
      if (priceMap[symbol]) {
        this._closePosition(portfolio, symbol, priceMap[symbol], Date.now(), 'backtest_end');
      }
    });
  }
  
  /**
   * Calculate portfolio value
   * @private
   */
  _calculatePortfolioValue(portfolio, dataPoints) {
    // Start with cash
    let value = portfolio.cash;
    
    // Create a map of current prices
    const priceMap = dataPoints.reduce((map, data) => {
      map[data.symbol] = data.close;
      return map;
    }, {});
    
    // Add value of each position
    Object.keys(portfolio.positions).forEach(symbol => {
      const position = portfolio.positions[symbol];
      const currentPrice = priceMap[symbol];
      
      if (currentPrice) {
        value += position.quantity * currentPrice;
      }
    });
    
    return value;
  }
  
  /**
   * Calculate SMA (Simple Moving Average)
   * @private
   */
  _calculateSMA(data, currentIndex, period) {
    if (currentIndex < period) return null;
    
    let sum = 0;
    for (let i = 0; i < period; i++) {
      sum += data[currentIndex - i].close;
    }
    
    return sum / period;
  }
  
  /**
   * Calculate RSI (Relative Strength Index)
   * @private
   */
  _calculateRSI(data, currentIndex, period) {
    if (currentIndex < period) return null;
    
    let gains = 0;
    let losses = 0;
    
    for (let i = 0; i < period; i++) {
      const current = data[currentIndex - i].close;
      const previous = data[currentIndex - i - 1].close;
      const change = current - previous;
      
      if (change >= 0) {
        gains += change;
      } else {
        losses -= change;
      }
    }
    
    const avgGain = gains / period;
    const avgLoss = losses / period;
    
    if (avgLoss === 0) return 100;
    
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  }
  
  /**
   * Calculate average volume
   * @private
   */
  _calculateAverageVolume(symbol, timestamp) {
    // This would typically look at historical volume data
    // Simple placeholder implementation that returns a fixed value
    return 1000000; // Arbitrary volume threshold
  }
  
  /**
   * Calculate performance metrics
   * @private
   */
  _calculatePerformanceMetrics(result) {
    try {
      // Extract key data
      const { trades, equity } = result;
      const initialCapital = equity[0].value;
      const finalValue = equity[equity.length - 1].value;
      
      // Calculate basic metrics
      const totalReturn = finalValue - initialCapital;
      const percentReturn = (totalReturn / initialCapital) * 100;
      
      // Calculate trade metrics
      const winningTrades = trades.filter(t => t.pnl > 0);
      const losingTrades = trades.filter(t => t.pnl < 0);
      
      const totalTrades = trades.length;
      const winRate = (winningTrades.length / totalTrades) * 100;
      
      const avgWin = winningTrades.length > 0 
        ? winningTrades.reduce((sum, t) => sum + t.pnl, 0) / winningTrades.length 
        : 0;
      
      const avgLoss = losingTrades.length > 0 
        ? losingTrades.reduce((sum, t) => sum + t.pnl, 0) / losingTrades.length 
        : 0;
      
      const profitFactor = avgLoss !== 0 ? avgWin / Math.abs(avgLoss) : Infinity;
      
      // Calculate drawdown
      let maxDrawdown = 0;
      let peak = equity[0].value;
      
      for (const point of equity) {
        if (point.value > peak) {
          peak = point.value;
        }
        
        const drawdown = (peak - point.value) / peak * 100;
        if (drawdown > maxDrawdown) {
          maxDrawdown = drawdown;
        }
      }
      
      // Calculate Sharpe Ratio (simplified)
      const returns = [];
      for (let i = 1; i < equity.length; i++) {
        const dailyReturn = (equity[i].value - equity[i-1].value) / equity[i-1].value;
        returns.push(dailyReturn);
      }
      
      const avgDailyReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
      const stdDailyReturn = Math.sqrt(returns.reduce((sum, r) => sum + Math.pow(r - avgDailyReturn, 2), 0) / returns.length);
      
      const annualizedReturn = avgDailyReturn * 252; // Assuming 252 trading days per year
      const annualizedRisk = stdDailyReturn * Math.sqrt(252);
      
      const sharpeRatio = annualizedRisk !== 0 ? annualizedReturn / annualizedRisk : 0;
      
      return {
        totalReturn,
        percentReturn,
        totalTrades,
        winRate,
        avgWin,
        avgLoss,
        profitFactor,
        maxDrawdown,
        sharpeRatio
      };
    } catch (error) {
      logger.error(`Error calculating performance metrics: ${error.message}`);
      return {
        error: error.message
      };
    }
  }
  
  /**
   * Optimize strategy parameters
   * @param {Object} baseParams - Base parameters for the optimization
   * @param {Object} ranges - Parameter ranges to optimize
   * @returns {Promise<Object>} Optimization results
   */
  async optimizeStrategy(baseParams, ranges) {
    try {
      if (!this.initialized) {
        throw new Error('Backtesting engine not initialized');
      }
      
      logger.info(`Optimizing strategy with ranges: ${JSON.stringify(ranges)}`);
      
      // Generate parameter combinations
      const paramCombinations = this._generateParameterCombinations(baseParams, ranges);
      
      // Run backtest for each combination
      const results = [];
      
      for (const params of paramCombinations) {
        const result = await this.runBacktest(params);
        
        if (!result.error) {
          results.push({
            params,
            metrics: result.metrics
          });
        }
      }
      
      // Sort by the target metric (e.g., percentReturn)
      results.sort((a, b) => b.metrics.percentReturn - a.metrics.percentReturn);
      
      // Store top results
      const optimizationId = `optimization_${Date.now()}`;
      this.optimizationResults[optimizationId] = {
        baseParams,
        ranges,
        results
      };
      
      return {
        id: optimizationId,
        results: results.slice(0, 10) // Return top 10 results
      };
    } catch (error) {
      logger.error(`Error optimizing strategy: ${error.message}`);
      return { error: error.message };
    }
  }
  
  /**
   * Generate parameter combinations for optimization
   * @private
   */
  _generateParameterCombinations(baseParams, ranges) {
    const combinations = [];
    const paramNames = Object.keys(ranges);
    
    const generateCombination = (index, current) => {
      if (index === paramNames.length) {
        combinations.push({ ...baseParams, ...current });
        return;
      }
      
      const paramName = paramNames[index];
      const paramRange = ranges[paramName];
      
      for (const value of paramRange) {
        generateCombination(index + 1, { ...current, [paramName]: value });
      }
    };
    
    generateCombination(0, {});
    return combinations;
  }
  
  /**
   * Get backtest results by ID
   * @param {string} id - Backtest ID
   * @returns {Object} Backtest results
   */
  getBacktestResults(id) {
    return this.backtestResults[id] || { error: 'Backtest not found' };
  }
  
  /**
   * Get optimization results by ID
   * @param {string} id - Optimization ID
   * @returns {Object} Optimization results
   */
  getOptimizationResults(id) {
    return this.optimizationResults[id] || { error: 'Optimization not found' };
  }
}

// Singleton instance
const backtestingEngine = new BacktestingEngine();

/**
 * React hook for using the backtesting system in components
 */
export function useBacktesting() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isRunningBacktest, setIsRunningBacktest] = useState(false);
  const [backtestResults, setBacktestResults] = useState(null);
  const [optimizationResults, setOptimizationResults] = useState(null);
  const [error, setError] = useState(null);
  
  // Initialize the backtesting engine
  useEffect(() => {
    const initialize = async () => {
      try {
        if (!backtestingEngine.initialized) {
          const success = await backtestingEngine.init();
          setIsInitialized(success);
          if (!success) {
            setError('Failed to initialize backtesting engine');
          }
        } else {
          setIsInitialized(true);
        }
      } catch (err) {
        setError(err.message);
      }
    };
    
    initialize();
  }, []);
  
  // Function to run a backtest
  const runBacktest = async (params) => {
    try {
      setIsRunningBacktest(true);
      setError(null);
      
      const results = await backtestingEngine.runBacktest(params);
      
      if (results.error) {
        setError(results.error);
      } else {
        setBacktestResults(results);
      }
      
      setIsRunningBacktest(false);
      return results;
    } catch (err) {
      setError(err.message);
      setIsRunningBacktest(false);
      return { error: err.message };
    }
  };
  
  // Function to optimize strategy parameters
  const optimizeStrategy = async (baseParams, ranges) => {
    try {
      setError(null);
      
      const results = await backtestingEngine.optimizeStrategy(baseParams, ranges);
      
      if (results.error) {
        setError(results.error);
      } else {
        setOptimizationResults(results);
      }
      
      return results;
    } catch (err) {
      setError(err.message);
      return { error: err.message };
    }
  };
  
  return {
    isInitialized,
    isRunningBacktest,
    backtestResults,
    optimizationResults,
    error,
    runBacktest,
    optimizeStrategy,
    getBacktestResults: backtestingEngine.getBacktestResults.bind(backtestingEngine),
    getOptimizationResults: backtestingEngine.getOptimizationResults.bind(backtestingEngine)
  };
}

export default backtestingEngine;
