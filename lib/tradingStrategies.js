'use client';

import { startAppTransaction, finishAppTransaction } from './sentryUtils.js';
import logger from './logger.js';

/**
 * Trading Strategies
 * 
 * This service provides various trading strategies for technical analysis.
 * It includes implementations of common indicators and trading signals.
 */
class TradingStrategies {
  constructor() {
    this.initialized = false;
    this.strategies = {
      movingAverageCrossover: this.movingAverageCrossover.bind(this),
      macdStrategy: this.macdStrategy.bind(this),
      rsiOscillator: this.rsiOscillator.bind(this),
      bollingerBandReversion: this.bollingerBandReversion.bind(this),
      ichimokuCloud: this.ichimokuCloud.bind(this),
    };
  }

  /**
   * Initialize the trading strategies (alias for init)
   */
  async initialize() {
    return this.init();
  }

  /**
   * Initialize the trading strategies
   */
  async init() {
    const transaction = startAppTransaction('trading-strategies-init', 'strategies.init');
    
    try {
      this.initialized = true;
      logger.info('Trading strategies initialized successfully');
      return true;
    } catch (error) {
      logger.error(`Trading strategies initialization error: ${error.message}`);
      return false;
    } finally {
      finishAppTransaction(transaction);
    }
  }

  /**
   * Check if the strategies are initialized
   * 
   * @returns {boolean} - Whether the strategies are initialized
   */
  isInitialized() {
    return this.initialized;
  }

  /**
   * Ensure the strategies are initialized
   * 
   * @throws {Error} - If the strategies are not initialized
   */
  ensureInitialized() {
    if (!this.initialized) {
      throw new Error('Trading strategies not initialized');
    }
  }

  /**
   * Get available strategies
   * 
   * @returns {Array<string>} - Available strategy IDs
   */
  getAvailableStrategies() {
    return Object.keys(this.strategies);
  }

  /**
   * Get strategy description
   * 
   * @param {string} strategyId - Strategy ID
   * @returns {Object} - Strategy description
   */
  getStrategyDescription(strategyId) {
    const descriptions = {
      movingAverageCrossover: {
        name: 'Moving Average Crossover',
        description: 'Generates signals based on the crossover of fast and slow moving averages.',
        params: {
          fastPeriod: 'Period for the fast moving average',
          slowPeriod: 'Period for the slow moving average',
          signalType: 'Type of moving average (sma or ema)',
        },
      },
      macdStrategy: {
        name: 'MACD Strategy',
        description: 'Generates signals based on the MACD indicator.',
        params: {
          fastPeriod: 'Period for the fast EMA',
          slowPeriod: 'Period for the slow EMA',
          signalPeriod: 'Period for the signal line',
          useHistogram: 'Whether to use the histogram for signals',
        },
      },
      rsiOscillator: {
        name: 'RSI Oscillator',
        description: 'Generates signals based on the RSI indicator.',
        params: {
          period: 'Period for the RSI calculation',
          overbought: 'Overbought threshold',
          oversold: 'Oversold threshold',
          useAdaptiveThresholds: 'Whether to use adaptive thresholds',
        },
      },
      bollingerBandReversion: {
        name: 'Bollinger Band Reversion',
        description: 'Generates signals based on price movements relative to Bollinger Bands.',
        params: {
          period: 'Period for the moving average',
          stdDev: 'Number of standard deviations for the bands',
          useVolume: 'Whether to consider volume in signals',
          requireClosing: 'Whether to require closing prices for signals',
        },
      },
      ichimokuCloud: {
        name: 'Ichimoku Cloud',
        description: 'Generates signals based on the Ichimoku Cloud indicator.',
        params: {
          conversionPeriod: 'Period for the conversion line',
          basePeriod: 'Period for the base line',
          laggingSpanPeriod: 'Period for the lagging span',
          displacement: 'Displacement period',
        },
      },
    };
    
    return descriptions[strategyId] || {
      name: strategyId,
      description: 'No description available',
      params: {},
    };
  }

  /**
   * Calculate Simple Moving Average (SMA)
   * 
   * @param {Array<number>} prices - Price data
   * @param {number} period - Period for the moving average
   * @returns {Array<number>} - SMA values
   */
  calculateSMA(prices, period) {
    const result = [];
    
    for (let i = 0; i < prices.length; i++) {
      if (i < period - 1) {
        result.push(null);
        continue;
      }
      
      let sum = 0;
      for (let j = 0; j < period; j++) {
        sum += prices[i - j];
      }
      
      result.push(sum / period);
    }
    
    return result;
  }

  /**
   * Calculate Exponential Moving Average (EMA)
   * 
   * @param {Array<number>} prices - Price data
   * @param {number} period - Period for the moving average
   * @returns {Array<number>} - EMA values
   */
  calculateEMA(prices, period) {
    const result = [];
    const multiplier = 2 / (period + 1);
    
    // Start with SMA for the first value
    let ema = prices.slice(0, period).reduce((sum, price) => sum + price, 0) / period;
    
    for (let i = 0; i < prices.length; i++) {
      if (i < period - 1) {
        result.push(null);
        continue;
      }
      
      if (i === period - 1) {
        result.push(ema);
        continue;
      }
      
      // EMA = (Close - Previous EMA) * multiplier + Previous EMA
      ema = (prices[i] - ema) * multiplier + ema;
      result.push(ema);
    }
    
    return result;
  }

  /**
   * Calculate Relative Strength Index (RSI)
   * 
   * @param {Array<number>} prices - Price data
   * @param {number} period - Period for the RSI calculation
   * @returns {Array<number>} - RSI values
   */
  calculateRSI(prices, period) {
    const result = [];
    const gains = [];
    const losses = [];
    
    // Calculate price changes
    for (let i = 0; i < prices.length; i++) {
      if (i === 0) {
        gains.push(0);
        losses.push(0);
        result.push(null);
        continue;
      }
      
      const change = prices[i] - prices[i - 1];
      gains.push(change > 0 ? change : 0);
      losses.push(change < 0 ? -change : 0);
      
      if (i < period) {
        result.push(null);
        continue;
      }
      
      // Calculate average gains and losses
      const avgGain = gains.slice(i - period + 1, i + 1).reduce((sum, gain) => sum + gain, 0) / period;
      const avgLoss = losses.slice(i - period + 1, i + 1).reduce((sum, loss) => sum + loss, 0) / period;
      
      // Calculate RS and RSI
      const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
      const rsi = 100 - (100 / (1 + rs));
      
      result.push(rsi);
    }
    
    return result;
  }

  /**
   * Calculate Moving Average Convergence Divergence (MACD)
   * 
   * @param {Array<number>} prices - Price data
   * @param {number} fastPeriod - Period for the fast EMA
   * @param {number} slowPeriod - Period for the slow EMA
   * @param {number} signalPeriod - Period for the signal line
   * @returns {Object} - MACD values
   */
  calculateMACD(prices, fastPeriod, slowPeriod, signalPeriod) {
    const fastEMA = this.calculateEMA(prices, fastPeriod);
    const slowEMA = this.calculateEMA(prices, slowPeriod);
    const macdLine = [];
    
    // Calculate MACD line
    for (let i = 0; i < prices.length; i++) {
      if (i < slowPeriod - 1) {
        macdLine.push(null);
        continue;
      }
      
      macdLine.push(fastEMA[i] - slowEMA[i]);
    }
    
    // Calculate signal line
    const signalLine = this.calculateEMA(macdLine.filter(value => value !== null), signalPeriod);
    
    // Pad signal line with nulls
    const paddedSignalLine = Array(prices.length - signalLine.length).fill(null).concat(signalLine);
    
    // Calculate histogram
    const histogram = [];
    
    for (let i = 0; i < prices.length; i++) {
      if (macdLine[i] === null || paddedSignalLine[i] === null) {
        histogram.push(null);
        continue;
      }
      
      histogram.push(macdLine[i] - paddedSignalLine[i]);
    }
    
    return {
      macdLine,
      signalLine: paddedSignalLine,
      histogram,
    };
  }

  /**
   * Calculate Bollinger Bands
   * 
   * @param {Array<number>} prices - Price data
   * @param {number} period - Period for the moving average
   * @param {number} stdDev - Number of standard deviations
   * @returns {Object} - Bollinger Bands values
   */
  calculateBollingerBands(prices, period, stdDev) {
    const middleBand = this.calculateSMA(prices, period);
    const upperBand = [];
    const lowerBand = [];
    
    for (let i = 0; i < prices.length; i++) {
      if (i < period - 1) {
        upperBand.push(null);
        lowerBand.push(null);
        continue;
      }
      
      // Calculate standard deviation
      const slice = prices.slice(i - period + 1, i + 1);
      const mean = slice.reduce((sum, price) => sum + price, 0) / period;
      const squaredDiffs = slice.map(price => Math.pow(price - mean, 2));
      const variance = squaredDiffs.reduce((sum, diff) => sum + diff, 0) / period;
      const standardDeviation = Math.sqrt(variance);
      
      // Calculate bands
      upperBand.push(middleBand[i] + (standardDeviation * stdDev));
      lowerBand.push(middleBand[i] - (standardDeviation * stdDev));
    }
    
    return {
      upperBand,
      middleBand,
      lowerBand,
    };
  }

  /**
   * Calculate Ichimoku Cloud
   * 
   * @param {Array<Object>} ohlcv - OHLCV data
   * @param {number} conversionPeriod - Period for the conversion line
   * @param {number} basePeriod - Period for the base line
   * @param {number} laggingSpanPeriod - Period for the lagging span
   * @param {number} displacement - Displacement period
   * @returns {Object} - Ichimoku Cloud values
   */
  calculateIchimokuCloud(ohlcv, conversionPeriod, basePeriod, laggingSpanPeriod, displacement) {
    const conversionLine = [];
    const baseLine = [];
    const leadingSpanA = [];
    const leadingSpanB = [];
    const laggingSpan = [];
    
    for (let i = 0; i < ohlcv.length; i++) {
      // Conversion Line (Tenkan-sen)
      if (i < conversionPeriod - 1) {
        conversionLine.push(null);
      } else {
        const periodHigh = Math.max(...ohlcv.slice(i - conversionPeriod + 1, i + 1).map(candle => candle.high));
        const periodLow = Math.min(...ohlcv.slice(i - conversionPeriod + 1, i + 1).map(candle => candle.low));
        conversionLine.push((periodHigh + periodLow) / 2);
      }
      
      // Base Line (Kijun-sen)
      if (i < basePeriod - 1) {
        baseLine.push(null);
      } else {
        const periodHigh = Math.max(...ohlcv.slice(i - basePeriod + 1, i + 1).map(candle => candle.high));
        const periodLow = Math.min(...ohlcv.slice(i - basePeriod + 1, i + 1).map(candle => candle.low));
        baseLine.push((periodHigh + periodLow) / 2);
      }
      
      // Leading Span A (Senkou Span A)
      if (i < Math.max(conversionPeriod, basePeriod) - 1) {
        leadingSpanA.push(null);
      } else {
        const avgValue = (conversionLine[i] + baseLine[i]) / 2;
        leadingSpanA.push(avgValue);
      }
      
      // Leading Span B (Senkou Span B)
      if (i < laggingSpanPeriod - 1) {
        leadingSpanB.push(null);
      } else {
        const periodHigh = Math.max(...ohlcv.slice(i - laggingSpanPeriod + 1, i + 1).map(candle => candle.high));
        const periodLow = Math.min(...ohlcv.slice(i - laggingSpanPeriod + 1, i + 1).map(candle => candle.low));
        leadingSpanB.push((periodHigh + periodLow) / 2);
      }
      
      // Lagging Span (Chikou Span)
      if (i < displacement) {
        laggingSpan.push(null);
      } else {
        laggingSpan.push(ohlcv[i - displacement].close);
      }
    }
    
    // Displace Leading Spans forward
    const displacedLeadingSpanA = Array(displacement).fill(null).concat(leadingSpanA.slice(0, leadingSpanA.length - displacement));
    const displacedLeadingSpanB = Array(displacement).fill(null).concat(leadingSpanB.slice(0, leadingSpanB.length - displacement));
    
    return {
      conversionLine,
      baseLine,
      leadingSpanA: displacedLeadingSpanA,
      leadingSpanB: displacedLeadingSpanB,
      laggingSpan,
    };
  }

  /**
   * Moving Average Crossover Strategy
   * 
   * @param {Array<number>} prices - Price data
   * @param {Object} params - Strategy parameters
   * @returns {Object} - Strategy results
   */
  movingAverageCrossover(prices, params = {}) {
    this.ensureInitialized();
    
    const {
      fastPeriod = 9,
      slowPeriod = 21,
      signalType = 'ema',
    } = params;
    
    // Calculate moving averages
    let fastMA;
    let slowMA;
    
    if (signalType === 'ema') {
      fastMA = this.calculateEMA(prices, fastPeriod);
      slowMA = this.calculateEMA(prices, slowPeriod);
    } else {
      fastMA = this.calculateSMA(prices, fastPeriod);
      slowMA = this.calculateSMA(prices, slowPeriod);
    }
    
    // Generate signals
    const signals = [];
    
    for (let i = 0; i < prices.length; i++) {
      if (i < slowPeriod) {
        signals.push(null);
        continue;
      }
      
      const prevFastMA = fastMA[i - 1];
      const prevSlowMA = slowMA[i - 1];
      const currFastMA = fastMA[i];
      const currSlowMA = slowMA[i];
      
      if (prevFastMA < prevSlowMA && currFastMA > currSlowMA) {
        signals.push('buy');
      } else if (prevFastMA > prevSlowMA && currFastMA < currSlowMA) {
        signals.push('sell');
      } else {
        signals.push(null);
      }
    }
    
    return {
      fastMA,
      slowMA,
      signals: signals.filter(signal => signal !== null),
    };
  }

  /**
   * MACD Strategy
   * 
   * @param {Array<number>} prices - Price data
   * @param {Object} params - Strategy parameters
   * @returns {Object} - Strategy results
   */
  macdStrategy(prices, params = {}) {
    this.ensureInitialized();
    
    const {
      fastPeriod = 12,
      slowPeriod = 26,
      signalPeriod = 9,
      useHistogram = true,
    } = params;
    
    // Calculate MACD
    const macd = this.calculateMACD(prices, fastPeriod, slowPeriod, signalPeriod);
    
    // Generate signals
    const signals = [];
    
    for (let i = 0; i < prices.length; i++) {
      if (i < slowPeriod + signalPeriod - 1) {
        signals.push(null);
        continue;
      }
      
      if (useHistogram) {
        // Use histogram crossover
        const prevHistogram = macd.histogram[i - 1];
        const currHistogram = macd.histogram[i];
        
        if (prevHistogram < 0 && currHistogram > 0) {
          signals.push('buy');
        } else if (prevHistogram > 0 && currHistogram < 0) {
          signals.push('sell');
        } else {
          signals.push(null);
        }
      } else {
        // Use MACD line crossover
        const prevMacd = macd.macdLine[i - 1];
        const prevSignal = macd.signalLine[i - 1];
        const currMacd = macd.macdLine[i];
        const currSignal = macd.signalLine[i];
        
        if (prevMacd < prevSignal && currMacd > currSignal) {
          signals.push('buy');
        } else if (prevMacd > prevSignal && currMacd < currSignal) {
          signals.push('sell');
        } else {
          signals.push(null);
        }
      }
    }
    
    return {
      macdLine: macd.macdLine,
      signalLine: macd.signalLine,
      histogram: macd.histogram,
      signals: signals.filter(signal => signal !== null),
    };
  }

  /**
   * RSI Oscillator Strategy
   * 
   * @param {Array<number>} prices - Price data
   * @param {Object} params - Strategy parameters
   * @returns {Object} - Strategy results
   */
  rsiOscillator(prices, params = {}) {
    this.ensureInitialized();
    
    const {
      period = 14,
      overbought = 70,
      oversold = 30,
      useAdaptiveThresholds = false,
    } = params;
    
    // Calculate RSI
    const rsi = this.calculateRSI(prices, period);
    
    // Generate signals
    const signals = [];
    
    for (let i = 0; i < prices.length; i++) {
      if (i < period + 1) {
        signals.push(null);
        continue;
      }
      
      const prevRSI = rsi[i - 1];
      const currRSI = rsi[i];
      
      if (useAdaptiveThresholds) {
        // Use adaptive thresholds based on recent RSI values
        const recentRSI = rsi.slice(Math.max(0, i - 20), i);
        const validRSI = recentRSI.filter(value => value !== null);
        
        if (validRSI.length > 0) {
          const maxRSI = Math.max(...validRSI);
          const minRSI = Math.min(...validRSI);
          const adaptiveOverbought = Math.min(overbought, maxRSI - 5);
          const adaptiveOversold = Math.max(oversold, minRSI + 5);
          
          if (prevRSI < adaptiveOversold && currRSI > adaptiveOversold) {
            signals.push('buy');
          } else if (prevRSI > adaptiveOverbought && currRSI < adaptiveOverbought) {
            signals.push('sell');
          } else {
            signals.push(null);
          }
        } else {
          signals.push(null);
        }
      } else {
        // Use fixed thresholds
        if (prevRSI < oversold && currRSI > oversold) {
          signals.push('buy');
        } else if (prevRSI > overbought && currRSI < overbought) {
          signals.push('sell');
        } else {
          signals.push(null);
        }
      }
    }
    
    return {
      rsi,
      signals: signals.filter(signal => signal !== null),
    };
  }

  /**
   * Bollinger Band Reversion Strategy
   * 
   * @param {Array<number>} prices - Price data
   * @param {Object} params - Strategy parameters
   * @returns {Object} - Strategy results
   */
  bollingerBandReversion(prices, params = {}) {
    this.ensureInitialized();
    
    const {
      period = 20,
      stdDev = 2,
      useVolume = false,
      requireClosing = true,
    } = params;
    
    // Calculate Bollinger Bands
    const bands = this.calculateBollingerBands(prices, period, stdDev);
    
    // Generate signals
    const signals = [];
    
    for (let i = 0; i < prices.length; i++) {
      if (i < period || i === 0) {
        signals.push(null);
        continue;
      }
      
      const price = prices[i];
      const prevPrice = prices[i - 1];
      const upperBand = bands.upperBand[i];
      const lowerBand = bands.lowerBand[i];
      const middleBand = bands.middleBand[i];
      
      if (requireClosing) {
        // Require closing price to cross back inside the bands
        if (prevPrice < lowerBand && price > lowerBand) {
          signals.push('buy');
        } else if (prevPrice > upperBand && price < upperBand) {
          signals.push('sell');
        } else {
          signals.push(null);
        }
      } else {
        // Generate signals based on price position relative to bands
        if (price < lowerBand) {
          signals.push('buy');
        } else if (price > upperBand) {
          signals.push('sell');
        } else {
          signals.push(null);
        }
      }
    }
    
    return {
      upperBand: bands.upperBand,
      middleBand: bands.middleBand,
      lowerBand: bands.lowerBand,
      signals: signals.filter(signal => signal !== null),
    };
  }

  /**
   * Ichimoku Cloud Strategy
   * 
   * @param {Array<Object>} ohlcv - OHLCV data
   * @param {Object} params - Strategy parameters
   * @returns {Object} - Strategy results
   */
  ichimokuCloud(ohlcv, params = {}) {
    this.ensureInitialized();
    
    const {
      conversionPeriod = 9,
      basePeriod = 26,
      laggingSpanPeriod = 52,
      displacement = 26,
    } = params;
    
    // Calculate Ichimoku Cloud
    const cloud = this.calculateIchimokuCloud(
      ohlcv,
      conversionPeriod,
      basePeriod,
      laggingSpanPeriod,
      displacement
    );
    
    // Extract close prices
    const prices = ohlcv.map(candle => candle.close);
    
    // Generate signals
    const signals = [];
    
    for (let i = 0; i < prices.length; i++) {
      if (i < Math.max(conversionPeriod, basePeriod, laggingSpanPeriod, displacement) + 1) {
        signals.push(null);
        continue;
      }
      
      const price = prices[i];
      const prevPrice = prices[i - 1];
      const conversionLine = cloud.conversionLine[i];
      const baseLine = cloud.baseLine[i];
      const prevConversionLine = cloud.conversionLine[i - 1];
      const prevBaseLine = cloud.baseLine[i - 1];
      const leadingSpanA = cloud.leadingSpanA[i];
      const leadingSpanB = cloud.leadingSpanB[i];
      
      // TK Cross (Tenkan-Kijun Cross)
      const tkCrossBuy = prevConversionLine < prevBaseLine && conversionLine > baseLine;
      const tkCrossSell = prevConversionLine > prevBaseLine && conversionLine < baseLine;
      
      // Price relative to the cloud
      const priceAboveCloud = price > Math.max(leadingSpanA || 0, leadingSpanB || 0);
      const priceBelowCloud = price < Math.min(leadingSpanA || Infinity, leadingSpanB || Infinity);
      
      // Cloud direction
      const bullishCloud = leadingSpanA > leadingSpanB;
      const bearishCloud = leadingSpanA < leadingSpanB;
      
      // Generate signals
      if (tkCrossBuy && priceAboveCloud && bullishCloud) {
        signals.push('buy');
      } else if (tkCrossSell && priceBelowCloud && bearishCloud) {
        signals.push('sell');
      } else {
        signals.push(null);
      }
    }
    
    return {
      conversionLine: cloud.conversionLine,
      baseLine: cloud.baseLine,
      leadingSpanA: cloud.leadingSpanA,
      leadingSpanB: cloud.leadingSpanB,
      laggingSpan: cloud.laggingSpan,
      signals: signals.filter(signal => signal !== null),
    };
  }
}

// Create singleton instance
const tradingStrategies = new TradingStrategies();

export default tradingStrategies;
