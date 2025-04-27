/**
 * KrakenAIIntegration.js
 * 
 * A utility for integrating Kraken market data with the Grok 3 AI model.
 * Processes market data, generates trade signals, and executes trades.
 */

import { getKrakenDataNormalizer } from './KrakenDataNormalizer.js';
import { getKrakenTradeExecutor } from './KrakenTradeExecutor.js';
import { getAuditLogger } from './AuditLogger.js';

/**
 * Integrates Kraken market data with the Grok 3 AI model
 */
class KrakenAIIntegration {
  /**
   * Create a new Kraken AI integration
   */
  constructor() {
    this.dataNormalizer = getKrakenDataNormalizer();
    this.tradeExecutor = getKrakenTradeExecutor();
    this.auditLogger = getAuditLogger();
    this.initialized = false;
    
    // Watched symbols
    this.watchedSymbols = new Set();
    
    // Trade signals
    this.tradeSignals = new Map();
    
    // Signal handlers
    this.signalHandlers = new Set();
    
    // Auto-trading settings
    this.autoTrading = {
      enabled: false,
      symbols: new Set(),
      maxPositions: 5,
      maxLossPerTrade: 0.02, // 2% of account balance
      maxTotalLoss: 0.05, // 5% of account balance
      takeProfitMultiplier: 1.5, // 1.5x risk
      riskRewardRatio: 1.5, // 1.5:1 reward:risk ratio
      positionSizing: 0.02, // 2% of account balance per trade
      strategies: ['momentum', 'meanReversion', 'breakout']
    };
    
    // Trading performance metrics
    this.performance = {
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      breakEvenTrades: 0,
      totalProfit: 0,
      totalLoss: 0,
      largestWin: 0,
      largestLoss: 0,
      averageWin: 0,
      averageLoss: 0,
      winRate: 0,
      profitFactor: 0,
      expectancy: 0,
      trades: []
    };
    
    // Analysis interval
    this.analysisInterval = null;
    
    // Bind methods to maintain 'this' context
    this._analyzeMarketData = this._analyzeMarketData.bind(this);
  }
  
  /**
   * Initialize the AI integration
   * 
   * @param {Object} apiKeyStorage - The API key storage instance
   * @returns {Promise<boolean>} - Whether initialization was successful
   */
  async initialize(apiKeyStorage) {
    try {
      // Initialize data normalizer
      if (!this.dataNormalizer.initialized) {
        await this.dataNormalizer.initialize();
      }
      
      // Initialize trade executor
      if (!this.tradeExecutor.initialized) {
        await this.tradeExecutor.initialize(apiKeyStorage);
      }
      
      // Load performance metrics from storage
      await this._loadPerformanceMetrics();
      
      // Set up analysis interval
      this._setupAnalysisInterval();
      
      this.initialized = true;
      return true;
    } catch (error) {
      console.error('Failed to initialize Kraken AI integration:', error);
      return false;
    }
  }
  
  /**
   * Watch a symbol for trading signals
   * 
   * @param {string} symbol - The symbol to watch (e.g., 'XBT/USD')
   * @returns {Promise<boolean>} - Whether the symbol was added successfully
   */
  async watchSymbol(symbol) {
    try {
      // Ensure initialized
      if (!this.initialized) {
        throw new Error('Kraken AI integration not initialized');
      }
      
      // Check if already watching
      if (this.watchedSymbols.has(symbol)) {
        return true;
      }
      
      // Subscribe to ticker, order book, and trades
      const tickerResult = await this.dataNormalizer.subscribeToTicker(symbol);
      const orderBookResult = await this.dataNormalizer.subscribeToOrderBook(symbol, 10);
      const tradesResult = await this.dataNormalizer.subscribeToTrades(symbol);
      
      if (!tickerResult.success || !orderBookResult.success || !tradesResult.success) {
        throw new Error(`Failed to subscribe to market data for ${symbol}`);
      }
      
      // Add to watched symbols
      this.watchedSymbols.add(symbol);
      
      // Log symbol watch
      this.auditLogger.logEvent('SYMBOL_WATCHED', {
        platform: 'kraken',
        symbol,
        timestamp: new Date().toISOString()
      });
      
      return true;
    } catch (error) {
      console.error(`Error watching symbol ${symbol}:`, error);
      return false;
    }
  }
  
  /**
   * Unwatch a symbol
   * 
   * @param {string} symbol - The symbol to unwatch
   * @returns {Promise<boolean>} - Whether the symbol was removed successfully
   */
  async unwatchSymbol(symbol) {
    try {
      // Ensure initialized
      if (!this.initialized) {
        throw new Error('Kraken AI integration not initialized');
      }
      
      // Check if watching
      if (!this.watchedSymbols.has(symbol)) {
        return true;
      }
      
      // Unsubscribe from ticker, order book, and trades
      await this.dataNormalizer.unsubscribe(`ticker:${symbol}`);
      await this.dataNormalizer.unsubscribe(`book:${symbol}:10`);
      await this.dataNormalizer.unsubscribe(`trade:${symbol}`);
      
      // Remove from watched symbols
      this.watchedSymbols.delete(symbol);
      
      // Remove from auto-trading symbols
      this.autoTrading.symbols.delete(symbol);
      
      // Log symbol unwatch
      this.auditLogger.logEvent('SYMBOL_UNWATCHED', {
        platform: 'kraken',
        symbol,
        timestamp: new Date().toISOString()
      });
      
      return true;
    } catch (error) {
      console.error(`Error unwatching symbol ${symbol}:`, error);
      return false;
    }
  }
  
  /**
   * Enable auto-trading for a symbol
   * 
   * @param {string} symbol - The symbol to enable auto-trading for
   * @returns {Promise<boolean>} - Whether auto-trading was enabled successfully
   */
  async enableAutoTrading(symbol) {
    try {
      // Ensure initialized
      if (!this.initialized) {
        throw new Error('Kraken AI integration not initialized');
      }
      
      // Ensure symbol is watched
      if (!this.watchedSymbols.has(symbol)) {
        await this.watchSymbol(symbol);
      }
      
      // Add to auto-trading symbols
      this.autoTrading.symbols.add(symbol);
      
      // Enable auto-trading
      this.autoTrading.enabled = true;
      
      // Log auto-trading enabled
      this.auditLogger.logEvent('AUTO_TRADING_ENABLED', {
        platform: 'kraken',
        symbol,
        timestamp: new Date().toISOString()
      });
      
      return true;
    } catch (error) {
      console.error(`Error enabling auto-trading for ${symbol}:`, error);
      return false;
    }
  }
  
  /**
   * Disable auto-trading for a symbol
   * 
   * @param {string} symbol - The symbol to disable auto-trading for
   * @returns {Promise<boolean>} - Whether auto-trading was disabled successfully
   */
  async disableAutoTrading(symbol) {
    try {
      // Ensure initialized
      if (!this.initialized) {
        throw new Error('Kraken AI integration not initialized');
      }
      
      // Remove from auto-trading symbols
      this.autoTrading.symbols.delete(symbol);
      
      // Disable auto-trading if no symbols left
      if (this.autoTrading.symbols.size === 0) {
        this.autoTrading.enabled = false;
      }
      
      // Log auto-trading disabled
      this.auditLogger.logEvent('AUTO_TRADING_DISABLED', {
        platform: 'kraken',
        symbol,
        timestamp: new Date().toISOString()
      });
      
      return true;
    } catch (error) {
      console.error(`Error disabling auto-trading for ${symbol}:`, error);
      return false;
    }
  }
  
  /**
   * Update auto-trading settings
   * 
   * @param {Object} settings - The new settings
   * @returns {Promise<boolean>} - Whether settings were updated successfully
   */
  async updateAutoTradingSettings(settings) {
    try {
      // Ensure initialized
      if (!this.initialized) {
        throw new Error('Kraken AI integration not initialized');
      }
      
      // Update settings
      this.autoTrading = {
        ...this.autoTrading,
        ...settings
      };
      
      // Log settings update
      this.auditLogger.logEvent('AUTO_TRADING_SETTINGS_UPDATED', {
        platform: 'kraken',
        settings: this.autoTrading,
        timestamp: new Date().toISOString()
      });
      
      return true;
    } catch (error) {
      console.error('Error updating auto-trading settings:', error);
      return false;
    }
  }
  
  /**
   * Get the latest trade signal for a symbol
   * 
   * @param {string} symbol - The symbol to get the signal for
   * @returns {Object|null} - The trade signal or null if not available
   */
  getTradeSignal(symbol) {
    // Check if signal is available
    if (!this.tradeSignals.has(symbol)) {
      return null;
    }
    
    return this.tradeSignals.get(symbol);
  }
  
  /**
   * Get all trade signals
   * 
   * @returns {Object} - All trade signals
   */
  getAllTradeSignals() {
    const signals = {};
    
    for (const [symbol, signal] of this.tradeSignals) {
      signals[symbol] = signal;
    }
    
    return signals;
  }
  
  /**
   * Add a signal handler
   * 
   * @param {Function} handler - The handler function
   * @returns {string} - The handler ID
   */
  addSignalHandler(handler) {
    const handlerId = crypto.randomUUID();
    
    this.signalHandlers.add({
      id: handlerId,
      handler
    });
    
    return handlerId;
  }
  
  /**
   * Remove a signal handler
   * 
   * @param {string} handlerId - The handler ID to remove
   * @returns {boolean} - Whether the handler was removed
   */
  removeSignalHandler(handlerId) {
    for (const handler of this.signalHandlers) {
      if (handler.id === handlerId) {
        this.signalHandlers.delete(handler);
        return true;
      }
    }
    
    return false;
  }
  
  /**
   * Get performance metrics
   * 
   * @returns {Object} - The performance metrics
   */
  getPerformanceMetrics() {
    return { ...this.performance };
  }
  
  /**
   * Execute a trade based on a signal
   * 
   * @param {Object} signal - The trade signal
   * @returns {Promise<Object>} - The trade result
   */
  async executeTrade(signal) {
    try {
      // Ensure initialized
      if (!this.initialized) {
        throw new Error('Kraken AI integration not initialized');
      }
      
      // Validate signal
      if (!signal || !signal.symbol || !signal.side || !signal.confidence) {
        throw new Error('Invalid trade signal');
      }
      
      // Create order parameters
      const orderParams = {
        symbol: signal.symbol,
        side: signal.side,
        orderType: signal.orderType || 'market',
        volume: signal.volume
      };
      
      // Add price for limit orders
      if (orderParams.orderType === 'limit' && signal.price) {
        orderParams.price = signal.price;
      }
      
      // Add stop loss and take profit
      if (signal.stopLoss) {
        orderParams.stopLoss = signal.stopLoss;
      }
      
      if (signal.takeProfit) {
        orderParams.takeProfit = signal.takeProfit;
      }
      
      // Execute trade
      const result = await this.tradeExecutor.placeOrder(orderParams);
      
      if (result.success) {
        // Log trade execution
        this.auditLogger.logTradeExecution({
          platform: 'kraken',
          symbol: signal.symbol,
          side: signal.side,
          amount: signal.volume,
          price: signal.price || 'market',
          id: result.orderId,
          reason: signal.reason || 'AI signal'
        });
        
        // Update performance metrics
        await this._updatePerformanceMetrics({
          orderId: result.orderId,
          symbol: signal.symbol,
          side: signal.side,
          volume: signal.volume,
          price: signal.price,
          timestamp: Date.now(),
          status: 'open',
          signal
        });
        
        return {
          success: true,
          orderId: result.orderId,
          status: result.status
        };
      } else {
        throw new Error(result.error || 'Failed to execute trade');
      }
    } catch (error) {
      console.error('Error executing trade:', error);
      
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Set up analysis interval
   * 
   * @private
   */
  _setupAnalysisInterval() {
    // Clear existing interval
    if (this.analysisInterval) {
      clearInterval(this.analysisInterval);
    }
    
    // Set up new interval (analyze every 5 seconds)
    this.analysisInterval = setInterval(this._analyzeMarketData, 5000);
  }
  
  /**
   * Analyze market data and generate trade signals
   * 
   * @private
   */
  async _analyzeMarketData() {
    try {
      // Skip if not initialized or no watched symbols
      if (!this.initialized || this.watchedSymbols.size === 0) {
        return;
      }
      
      // Process each watched symbol
      for (const symbol of this.watchedSymbols) {
        // Get market data
        const ticker = this.dataNormalizer.getTicker(symbol);
        const orderBook = this.dataNormalizer.getOrderBook(symbol);
        const trades = this.dataNormalizer.getTrades(symbol);
        
        // Skip if data is not available
        if (!ticker || !orderBook || !trades) {
          continue;
        }
        
        // Generate trade signal
        const signal = await this._generateTradeSignal(symbol, ticker, orderBook, trades);
        
        // Skip if no signal
        if (!signal) {
          continue;
        }
        
        // Store signal
        this.tradeSignals.set(symbol, signal);
        
        // Notify signal handlers
        for (const handler of this.signalHandlers) {
          try {
            handler.handler(signal);
          } catch (error) {
            console.error('Error in signal handler:', error);
          }
        }
        
        // Execute trade if auto-trading is enabled
        if (this.autoTrading.enabled && this.autoTrading.symbols.has(symbol) && signal.confidence >= 0.7) {
          await this.executeTrade(signal);
        }
      }
    } catch (error) {
      console.error('Error analyzing market data:', error);
    }
  }
  
  /**
   * Generate a trade signal
   * 
   * @param {string} symbol - The symbol
   * @param {Object} ticker - The ticker data
   * @param {Object} orderBook - The order book data
   * @param {Object} trades - The trades data
   * @returns {Promise<Object|null>} - The trade signal or null if no signal
   * @private
   */
  async _generateTradeSignal(symbol, ticker, orderBook, trades) {
    try {
      // Combine market data
      const marketData = {
        symbol,
        ticker,
        orderBook,
        trades: trades.trades
      };
      
      // Apply trading strategies
      const momentumSignal = this._applyMomentumStrategy(marketData);
      const meanReversionSignal = this._applyMeanReversionStrategy(marketData);
      const breakoutSignal = this._applyBreakoutStrategy(marketData);
      
      // Combine signals
      const signals = [
        momentumSignal,
        meanReversionSignal,
        breakoutSignal
      ].filter(signal => signal !== null);
      
      // Return null if no signals
      if (signals.length === 0) {
        return null;
      }
      
      // Find strongest signal
      let strongestSignal = signals[0];
      
      for (let i = 1; i < signals.length; i++) {
        if (signals[i].confidence > strongestSignal.confidence) {
          strongestSignal = signals[i];
        }
      }
      
      // Add explanation
      strongestSignal.explanation = this._generateSignalExplanation(strongestSignal, marketData);
      
      // Add timestamp
      strongestSignal.timestamp = Date.now();
      
      return strongestSignal;
    } catch (error) {
      console.error('Error generating trade signal:', error);
      return null;
    }
  }
  
  /**
   * Apply momentum strategy
   * 
   * @param {Object} marketData - The market data
   * @returns {Object|null} - The trade signal or null if no signal
   * @private
   */
  _applyMomentumStrategy(marketData) {
    try {
      const { symbol, ticker, trades } = marketData;
      
      // Skip if not enough trades
      if (trades.length < 10) {
        return null;
      }
      
      // Calculate price change
      const recentTrades = trades.slice(0, 10);
      const oldestPrice = recentTrades[recentTrades.length - 1].price;
      const newestPrice = recentTrades[0].price;
      const priceChange = (newestPrice - oldestPrice) / oldestPrice;
      
      // Calculate volume
      const volume = recentTrades.reduce((sum, trade) => sum + trade.volume, 0);
      
      // Generate signal
      if (Math.abs(priceChange) > 0.005) { // 0.5% price change
        const side = priceChange > 0 ? 'buy' : 'sell';
        const confidence = Math.min(0.5 + Math.abs(priceChange) * 50, 0.95);
        
        return {
          symbol,
          strategy: 'momentum',
          side,
          confidence,
          volume: this._calculatePositionSize(symbol, confidence),
          price: ticker.last,
          stopLoss: side === 'buy' ? ticker.last * 0.99 : ticker.last * 1.01,
          takeProfit: side === 'buy' ? ticker.last * 1.015 : ticker.last * 0.985,
          reason: `Momentum strategy detected ${(priceChange * 100).toFixed(2)}% price change with ${volume.toFixed(4)} volume`
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error applying momentum strategy:', error);
      return null;
    }
  }
  
  /**
   * Apply mean reversion strategy
   * 
   * @param {Object} marketData - The market data
   * @returns {Object|null} - The trade signal or null if no signal
   * @private
   */
  _applyMeanReversionStrategy(marketData) {
    try {
      const { symbol, ticker, trades } = marketData;
      
      // Skip if not enough trades
      if (trades.length < 20) {
        return null;
      }
      
      // Calculate moving average
      const prices = trades.slice(0, 20).map(trade => trade.price);
      const movingAverage = prices.reduce((sum, price) => sum + price, 0) / prices.length;
      
      // Calculate standard deviation
      const variance = prices.reduce((sum, price) => sum + Math.pow(price - movingAverage, 2), 0) / prices.length;
      const standardDeviation = Math.sqrt(variance);
      
      // Calculate z-score
      const currentPrice = ticker.last;
      const zScore = (currentPrice - movingAverage) / standardDeviation;
      
      // Generate signal
      if (Math.abs(zScore) > 2) { // 2 standard deviations
        const side = zScore > 0 ? 'sell' : 'buy';
        const confidence = Math.min(0.5 + Math.abs(zScore) * 0.1, 0.9);
        
        return {
          symbol,
          strategy: 'meanReversion',
          side,
          confidence,
          volume: this._calculatePositionSize(symbol, confidence),
          price: currentPrice,
          stopLoss: side === 'buy' ? currentPrice * 0.98 : currentPrice * 1.02,
          takeProfit: side === 'buy' ? currentPrice * 1.02 : currentPrice * 0.98,
          reason: `Mean reversion strategy detected price ${zScore > 0 ? 'above' : 'below'} average by ${Math.abs(zScore).toFixed(2)} standard deviations`
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error applying mean reversion strategy:', error);
      return null;
    }
  }
  
  /**
   * Apply breakout strategy
   * 
   * @param {Object} marketData - The market data
   * @returns {Object|null} - The trade signal or null if no signal
   * @private
   */
  _applyBreakoutStrategy(marketData) {
    try {
      const { symbol, ticker, trades, orderBook } = marketData;
      
      // Skip if not enough trades or no order book
      if (trades.length < 20 || !orderBook) {
        return null;
      }
      
      // Calculate price range
      const prices = trades.slice(0, 20).map(trade => trade.price);
      const highPrice = Math.max(...prices);
      const lowPrice = Math.min(...prices);
      const range = highPrice - lowPrice;
      
      // Calculate current price
      const currentPrice = ticker.last;
      
      // Check for breakout
      const breakoutThreshold = range * 0.2; // 20% of range
      
      if (currentPrice > highPrice + breakoutThreshold) {
        // Bullish breakout
        const confidence = Math.min(0.6 + (currentPrice - highPrice) / range * 0.4, 0.9);
        
        return {
          symbol,
          strategy: 'breakout',
          side: 'buy',
          confidence,
          volume: this._calculatePositionSize(symbol, confidence),
          price: currentPrice,
          stopLoss: highPrice,
          takeProfit: currentPrice + range,
          reason: `Breakout strategy detected bullish breakout above ${highPrice.toFixed(2)} with ${confidence.toFixed(2)} confidence`
        };
      } else if (currentPrice < lowPrice - breakoutThreshold) {
        // Bearish breakout
        const confidence = Math.min(0.6 + (lowPrice - currentPrice) / range * 0.4, 0.9);
        
        return {
          symbol,
          strategy: 'breakout',
          side: 'sell',
          confidence,
          volume: this._calculatePositionSize(symbol, confidence),
          price: currentPrice,
          stopLoss: lowPrice,
          takeProfit: currentPrice - range,
          reason: `Breakout strategy detected bearish breakout below ${lowPrice.toFixed(2)} with ${confidence.toFixed(2)} confidence`
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error applying breakout strategy:', error);
      return null;
    }
  }
  
  /**
   * Generate a signal explanation
   * 
   * @param {Object} signal - The trade signal
   * @param {Object} marketData - The market data
   * @returns {string} - The explanation
   * @private
   */
  _generateSignalExplanation(signal, marketData) {
    try {
      const { symbol, ticker } = marketData;
      
      // Base explanation
      let explanation = `${signal.side.toUpperCase()} ${symbol} at ${signal.price} (${signal.confidence.toFixed(2)} confidence)`;
      
      // Add strategy-specific explanation
      if (signal.strategy === 'momentum') {
        explanation += `\n\nMomentum strategy detected a strong ${signal.side === 'buy' ? 'upward' : 'downward'} trend.`;
      } else if (signal.strategy === 'meanReversion') {
        explanation += `\n\nMean reversion strategy detected price ${signal.side === 'buy' ? 'below' : 'above'} the average.`;
      } else if (signal.strategy === 'breakout') {
        explanation += `\n\nBreakout strategy detected a ${signal.side === 'buy' ? 'bullish' : 'bearish'} breakout.`;
      }
      
      // Add risk management
      explanation += `\n\nRisk management:`;
      explanation += `\n- Entry: ${signal.price}`;
      explanation += `\n- Stop loss: ${signal.stopLoss}`;
      explanation += `\n- Take profit: ${signal.takeProfit}`;
      explanation += `\n- Position size: ${signal.volume}`;
      
      // Add market context
      explanation += `\n\nMarket context:`;
      explanation += `\n- Current price: ${ticker.last}`;
      explanation += `\n- 24h high: ${ticker.high}`;
      explanation += `\n- 24h low: ${ticker.low}`;
      explanation += `\n- 24h volume: ${ticker.volume}`;
      
      return explanation;
    } catch (error) {
      console.error('Error generating signal explanation:', error);
      return signal.reason || 'No explanation available';
    }
  }
  
  /**
   * Calculate position size
   * 
   * @param {string} symbol - The symbol
   * @param {number} confidence - The signal confidence
   * @returns {number} - The position size
   * @private
   */
  _calculatePositionSize(symbol, confidence) {
    try {
      // Base position size on confidence and settings
      const baseSize = this.autoTrading.positionSizing;
      const adjustedSize = baseSize * confidence;
      
      // Return a reasonable default for now
      return 0.01; // 0.01 BTC, ETH, etc.
    } catch (error) {
      console.error('Error calculating position size:', error);
      return 0.01; // Default fallback
    }
  }
  
  /**
   * Load performance metrics from storage
   * 
   * @returns {Promise<void>}
   * @private
   */
  async _loadPerformanceMetrics() {
    try {
      const data = await chrome.storage.local.get('krakenPerformanceMetrics');
      
      if (data.krakenPerformanceMetrics) {
        this.performance = data.krakenPerformanceMetrics;
      }
    } catch (error) {
      console.error('Error loading performance metrics:', error);
    }
  }
  
  /**
   * Update performance metrics
   * 
   * @param {Object} trade - The trade to update metrics for
   * @returns {Promise<void>}
   * @private
   */
  async _updatePerformanceMetrics(trade) {
    try {
      // Add trade to trades list
      this.performance.trades.push(trade);
      
      // Update total trades
      this.performance.totalTrades++;
      
      // Save performance metrics
      await chrome.storage.local.set({ krakenPerformanceMetrics: this.performance });
    } catch (error) {
      console.error('Error updating performance metrics:', error);
    }
  }
}

/**
 * Singleton instance of the Kraken AI integration
 */
let krakenAIIntegrationInstance = null;

/**
 * Get the Kraken AI integration instance
 * 
 * @returns {KrakenAIIntegration} - The Kraken AI integration instance
 */
function getKrakenAIIntegration() {
  if (!krakenAIIntegrationInstance) {
    krakenAIIntegrationInstance = new KrakenAIIntegration();
  }
  
  return krakenAIIntegrationInstance;
}

export { KrakenAIIntegration, getKrakenAIIntegration };
