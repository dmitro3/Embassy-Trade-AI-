'use client';

import { startAppTransaction, finishAppTransaction } from './sentryUtils.js';
import logger from './logger.js';

/**
 * Technical Indicators Library
 * 
 * This library provides a comprehensive set of technical indicators for trading strategies.
 * It includes trend indicators, momentum indicators, volatility indicators, and volume indicators.
 */
class TechnicalIndicators {
  constructor() {
    this.initialized = false;
  }

  /**
   * Initialize the technical indicators library
   */
  init() {
    try {
      this.initialized = true;
      logger.info('Technical indicators library initialized');
      return true;
    } catch (error) {
      logger.error(`Technical indicators initialization error: ${error.message}`);
      return false;
    }
  }

  /**
   * Calculate Simple Moving Average (SMA)
   * 
   * @param {Array<number>} data - Price data
   * @param {number} period - Period for SMA calculation
   * @returns {Array<number>} - SMA values
   */
  sma(data, period) {
    const transaction = startAppTransaction('technical-indicators-sma', 'indicators.sma');
    
    try {
      if (!Array.isArray(data) || data.length === 0) {
        throw new Error('Invalid data for SMA calculation');
      }
      
      if (period <= 0 || period > data.length) {
        throw new Error('Invalid period for SMA calculation');
      }
      
      const result = [];
      
      // Fill with null values for the first (period-1) elements
      for (let i = 0; i < period - 1; i++) {
        result.push(null);
      }
      
      // Calculate SMA for the rest of the data
      for (let i = period - 1; i < data.length; i++) {
        let sum = 0;
        for (let j = 0; j < period; j++) {
          sum += data[i - j];
        }
        result.push(sum / period);
      }
      
      return result;
    } catch (error) {
      logger.error(`SMA calculation error: ${error.message}`);
      throw error;
    } finally {
      finishAppTransaction(transaction);
    }
  }

  /**
   * Calculate Exponential Moving Average (EMA)
   * 
   * @param {Array<number>} data - Price data
   * @param {number} period - Period for EMA calculation
   * @returns {Array<number>} - EMA values
   */
  ema(data, period) {
    const transaction = startAppTransaction('technical-indicators-ema', 'indicators.ema');
    
    try {
      if (!Array.isArray(data) || data.length === 0) {
        throw new Error('Invalid data for EMA calculation');
      }
      
      if (period <= 0 || period > data.length) {
        throw new Error('Invalid period for EMA calculation');
      }
      
      const result = [];
      const multiplier = 2 / (period + 1);
      
      // Start with SMA for the first period elements
      let smaValue = 0;
      for (let i = 0; i < period; i++) {
        smaValue += data[i];
      }
      smaValue /= period;
      
      // Fill with null values for the first (period-1) elements
      for (let i = 0; i < period - 1; i++) {
        result.push(null);
      }
      
      // Add the first EMA value (which is the SMA)
      result.push(smaValue);
      
      // Calculate EMA for the rest of the data
      for (let i = period; i < data.length; i++) {
        const emaValue = (data[i] - result[i - 1]) * multiplier + result[i - 1];
        result.push(emaValue);
      }
      
      return result;
    } catch (error) {
      logger.error(`EMA calculation error: ${error.message}`);
      throw error;
    } finally {
      finishAppTransaction(transaction);
    }
  }

  /**
   * Calculate Moving Average Convergence Divergence (MACD)
   * 
   * @param {Array<number>} data - Price data
   * @param {number} fastPeriod - Fast EMA period (default: 12)
   * @param {number} slowPeriod - Slow EMA period (default: 26)
   * @param {number} signalPeriod - Signal EMA period (default: 9)
   * @returns {Object} - MACD values (macdLine, signalLine, histogram)
   */
  macd(data, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
    const transaction = startAppTransaction('technical-indicators-macd', 'indicators.macd');
    
    try {
      if (!Array.isArray(data) || data.length === 0) {
        throw new Error('Invalid data for MACD calculation');
      }
      
      if (fastPeriod <= 0 || slowPeriod <= 0 || signalPeriod <= 0) {
        throw new Error('Invalid periods for MACD calculation');
      }
      
      if (data.length < Math.max(fastPeriod, slowPeriod) + signalPeriod) {
        throw new Error('Insufficient data for MACD calculation');
      }
      
      // Calculate fast and slow EMAs
      const fastEMA = this.ema(data, fastPeriod);
      const slowEMA = this.ema(data, slowPeriod);
      
      // Calculate MACD line (fast EMA - slow EMA)
      const macdLine = [];
      for (let i = 0; i < data.length; i++) {
        if (fastEMA[i] === null || slowEMA[i] === null) {
          macdLine.push(null);
        } else {
          macdLine.push(fastEMA[i] - slowEMA[i]);
        }
      }
      
      // Calculate signal line (EMA of MACD line)
      const validMacdLine = macdLine.filter(value => value !== null);
      const signalLine = this.ema(validMacdLine, signalPeriod);
      
      // Adjust signal line to match MACD line length
      const adjustedSignalLine = [];
      for (let i = 0; i < macdLine.length - validMacdLine.length; i++) {
        adjustedSignalLine.push(null);
      }
      adjustedSignalLine.push(...signalLine);
      
      // Calculate histogram (MACD line - signal line)
      const histogram = [];
      for (let i = 0; i < macdLine.length; i++) {
        if (macdLine[i] === null || adjustedSignalLine[i] === null) {
          histogram.push(null);
        } else {
          histogram.push(macdLine[i] - adjustedSignalLine[i]);
        }
      }
      
      return {
        macdLine,
        signalLine: adjustedSignalLine,
        histogram
      };
    } catch (error) {
      logger.error(`MACD calculation error: ${error.message}`);
      throw error;
    } finally {
      finishAppTransaction(transaction);
    }
  }

  /**
   * Calculate Relative Strength Index (RSI)
   * 
   * @param {Array<number>} data - Price data
   * @param {number} period - Period for RSI calculation (default: 14)
   * @returns {Array<number>} - RSI values
   */
  rsi(data, period = 14) {
    const transaction = startAppTransaction('technical-indicators-rsi', 'indicators.rsi');
    
    try {
      if (!Array.isArray(data) || data.length === 0) {
        throw new Error('Invalid data for RSI calculation');
      }
      
      if (period <= 0 || period >= data.length) {
        throw new Error('Invalid period for RSI calculation');
      }
      
      const result = [];
      const gains = [];
      const losses = [];
      
      // Calculate price changes
      for (let i = 1; i < data.length; i++) {
        const change = data[i] - data[i - 1];
        gains.push(change > 0 ? change : 0);
        losses.push(change < 0 ? Math.abs(change) : 0);
      }
      
      // Fill with null values for the first period elements
      for (let i = 0; i < period; i++) {
        result.push(null);
      }
      
      // Calculate first average gain and loss
      let avgGain = 0;
      let avgLoss = 0;
      for (let i = 0; i < period; i++) {
        avgGain += gains[i];
        avgLoss += losses[i];
      }
      avgGain /= period;
      avgLoss /= period;
      
      // Calculate first RSI
      let rs = avgGain / (avgLoss === 0 ? 0.001 : avgLoss); // Avoid division by zero
      let rsiValue = 100 - (100 / (1 + rs));
      result.push(rsiValue);
      
      // Calculate RSI for the rest of the data
      for (let i = period; i < data.length - 1; i++) {
        avgGain = ((avgGain * (period - 1)) + gains[i]) / period;
        avgLoss = ((avgLoss * (period - 1)) + losses[i]) / period;
        
        rs = avgGain / (avgLoss === 0 ? 0.001 : avgLoss); // Avoid division by zero
        rsiValue = 100 - (100 / (1 + rs));
        result.push(rsiValue);
      }
      
      return result;
    } catch (error) {
      logger.error(`RSI calculation error: ${error.message}`);
      throw error;
    } finally {
      finishAppTransaction(transaction);
    }
  }

  /**
   * Calculate Bollinger Bands
   * 
   * @param {Array<number>} data - Price data
   * @param {number} period - Period for SMA calculation (default: 20)
   * @param {number} stdDev - Standard deviation multiplier (default: 2)
   * @returns {Object} - Bollinger Bands values (upper, middle, lower)
   */
  bollingerBands(data, period = 20, stdDev = 2) {
    const transaction = startAppTransaction('technical-indicators-bollinger', 'indicators.bollinger');
    
    try {
      if (!Array.isArray(data) || data.length === 0) {
        throw new Error('Invalid data for Bollinger Bands calculation');
      }
      
      if (period <= 0 || period >= data.length) {
        throw new Error('Invalid period for Bollinger Bands calculation');
      }
      
      // Calculate middle band (SMA)
      const middleBand = this.sma(data, period);
      
      // Calculate upper and lower bands
      const upperBand = [];
      const lowerBand = [];
      
      for (let i = 0; i < data.length; i++) {
        if (middleBand[i] === null) {
          upperBand.push(null);
          lowerBand.push(null);
          continue;
        }
        
        // Calculate standard deviation
        let sum = 0;
        for (let j = 0; j < period; j++) {
          if (i - j < 0) break;
          sum += Math.pow(data[i - j] - middleBand[i], 2);
        }
        const stdDevValue = Math.sqrt(sum / period);
        
        // Calculate upper and lower bands
        upperBand.push(middleBand[i] + (stdDev * stdDevValue));
        lowerBand.push(middleBand[i] - (stdDev * stdDevValue));
      }
      
      return {
        upper: upperBand,
        middle: middleBand,
        lower: lowerBand
      };
    } catch (error) {
      logger.error(`Bollinger Bands calculation error: ${error.message}`);
      throw error;
    } finally {
      finishAppTransaction(transaction);
    }
  }

  /**
   * Calculate Average True Range (ATR)
   * 
   * @param {Array<Object>} data - Price data with high, low, close properties
   * @param {number} period - Period for ATR calculation (default: 14)
   * @returns {Array<number>} - ATR values
   */
  atr(data, period = 14) {
    const transaction = startAppTransaction('technical-indicators-atr', 'indicators.atr');
    
    try {
      if (!Array.isArray(data) || data.length === 0) {
        throw new Error('Invalid data for ATR calculation');
      }
      
      if (period <= 0 || period >= data.length) {
        throw new Error('Invalid period for ATR calculation');
      }
      
      // Validate data format
      for (const item of data) {
        if (!item.high || !item.low || !item.close) {
          throw new Error('Invalid data format for ATR calculation');
        }
      }
      
      const trueRanges = [];
      const result = [];
      
      // Calculate true ranges
      trueRanges.push(data[0].high - data[0].low); // First TR is simply high - low
      
      for (let i = 1; i < data.length; i++) {
        const tr1 = data[i].high - data[i].low;
        const tr2 = Math.abs(data[i].high - data[i - 1].close);
        const tr3 = Math.abs(data[i].low - data[i - 1].close);
        trueRanges.push(Math.max(tr1, tr2, tr3));
      }
      
      // Fill with null values for the first (period-1) elements
      for (let i = 0; i < period - 1; i++) {
        result.push(null);
      }
      
      // Calculate first ATR (simple average of first 'period' true ranges)
      let atrValue = 0;
      for (let i = 0; i < period; i++) {
        atrValue += trueRanges[i];
      }
      atrValue /= period;
      result.push(atrValue);
      
      // Calculate ATR for the rest of the data using smoothing
      for (let i = period; i < data.length; i++) {
        atrValue = ((atrValue * (period - 1)) + trueRanges[i]) / period;
        result.push(atrValue);
      }
      
      return result;
    } catch (error) {
      logger.error(`ATR calculation error: ${error.message}`);
      throw error;
    } finally {
      finishAppTransaction(transaction);
    }
  }

  /**
   * Calculate Stochastic Oscillator
   * 
   * @param {Array<Object>} data - Price data with high, low, close properties
   * @param {number} period - Period for %K calculation (default: 14)
   * @param {number} smoothK - Smoothing for %K (default: 3)
   * @param {number} smoothD - Smoothing for %D (default: 3)
   * @returns {Object} - Stochastic Oscillator values (%K and %D)
   */
  stochastic(data, period = 14, smoothK = 3, smoothD = 3) {
    const transaction = startAppTransaction('technical-indicators-stochastic', 'indicators.stochastic');
    
    try {
      if (!Array.isArray(data) || data.length === 0) {
        throw new Error('Invalid data for Stochastic Oscillator calculation');
      }
      
      if (period <= 0 || period >= data.length) {
        throw new Error('Invalid period for Stochastic Oscillator calculation');
      }
      
      // Validate data format
      for (const item of data) {
        if (!item.high || !item.low || !item.close) {
          throw new Error('Invalid data format for Stochastic Oscillator calculation');
        }
      }
      
      const rawK = [];
      
      // Fill with null values for the first (period-1) elements
      for (let i = 0; i < period - 1; i++) {
        rawK.push(null);
      }
      
      // Calculate raw %K
      for (let i = period - 1; i < data.length; i++) {
        let highestHigh = -Infinity;
        let lowestLow = Infinity;
        
        for (let j = 0; j < period; j++) {
          highestHigh = Math.max(highestHigh, data[i - j].high);
          lowestLow = Math.min(lowestLow, data[i - j].low);
        }
        
        const currentClose = data[i].close;
        const rawKValue = ((currentClose - lowestLow) / (highestHigh - lowestLow)) * 100;
        rawK.push(rawKValue);
      }
      
      // Calculate %K (smoothed)
      const k = this.sma(rawK.filter(value => value !== null), smoothK);
      
      // Adjust %K to match original data length
      const adjustedK = [];
      for (let i = 0; i < rawK.length - k.length; i++) {
        adjustedK.push(null);
      }
      adjustedK.push(...k);
      
      // Calculate %D (smoothed %K)
      const validK = adjustedK.filter(value => value !== null);
      const d = this.sma(validK, smoothD);
      
      // Adjust %D to match original data length
      const adjustedD = [];
      for (let i = 0; i < adjustedK.length - d.length; i++) {
        adjustedD.push(null);
      }
      adjustedD.push(...d);
      
      return {
        k: adjustedK,
        d: adjustedD
      };
    } catch (error) {
      logger.error(`Stochastic Oscillator calculation error: ${error.message}`);
      throw error;
    } finally {
      finishAppTransaction(transaction);
    }
  }

  /**
   * Calculate Ichimoku Cloud
   * 
   * @param {Array<Object>} data - Price data with high, low, close properties
   * @param {number} conversionPeriod - Conversion line period (default: 9)
   * @param {number} basePeriod - Base line period (default: 26)
   * @param {number} laggingSpanPeriod - Lagging span period (default: 52)
   * @param {number} displacement - Displacement (default: 26)
   * @returns {Object} - Ichimoku Cloud values
   */
  ichimokuCloud(data, conversionPeriod = 9, basePeriod = 26, laggingSpanPeriod = 52, displacement = 26) {
    const transaction = startAppTransaction('technical-indicators-ichimoku', 'indicators.ichimoku');
    
    try {
      if (!Array.isArray(data) || data.length === 0) {
        throw new Error('Invalid data for Ichimoku Cloud calculation');
      }
      
      if (data.length < Math.max(conversionPeriod, basePeriod, laggingSpanPeriod) + displacement) {
        throw new Error('Insufficient data for Ichimoku Cloud calculation');
      }
      
      // Validate data format
      for (const item of data) {
        if (!item.high || !item.low || !item.close) {
          throw new Error('Invalid data format for Ichimoku Cloud calculation');
        }
      }
      
      const conversionLine = [];
      const baseLine = [];
      const leadingSpanA = [];
      const leadingSpanB = [];
      const laggingSpan = [];
      
      // Calculate Conversion Line (Tenkan-sen)
      for (let i = 0; i < data.length; i++) {
        if (i < conversionPeriod - 1) {
          conversionLine.push(null);
          continue;
        }
        
        let highestHigh = -Infinity;
        let lowestLow = Infinity;
        
        for (let j = 0; j < conversionPeriod; j++) {
          highestHigh = Math.max(highestHigh, data[i - j].high);
          lowestLow = Math.min(lowestLow, data[i - j].low);
        }
        
        conversionLine.push((highestHigh + lowestLow) / 2);
      }
      
      // Calculate Base Line (Kijun-sen)
      for (let i = 0; i < data.length; i++) {
        if (i < basePeriod - 1) {
          baseLine.push(null);
          continue;
        }
        
        let highestHigh = -Infinity;
        let lowestLow = Infinity;
        
        for (let j = 0; j < basePeriod; j++) {
          highestHigh = Math.max(highestHigh, data[i - j].high);
          lowestLow = Math.min(lowestLow, data[i - j].low);
        }
        
        baseLine.push((highestHigh + lowestLow) / 2);
      }
      
      // Calculate Leading Span A (Senkou Span A)
      for (let i = 0; i < data.length; i++) {
        if (i < Math.max(conversionPeriod, basePeriod) - 1) {
          leadingSpanA.push(null);
          continue;
        }
        
        const conversionValue = conversionLine[i];
        const baseValue = baseLine[i];
        
        if (conversionValue === null || baseValue === null) {
          leadingSpanA.push(null);
          continue;
        }
        
        leadingSpanA.push((conversionValue + baseValue) / 2);
      }
      
      // Calculate Leading Span B (Senkou Span B)
      for (let i = 0; i < data.length; i++) {
        if (i < laggingSpanPeriod - 1) {
          leadingSpanB.push(null);
          continue;
        }
        
        let highestHigh = -Infinity;
        let lowestLow = Infinity;
        
        for (let j = 0; j < laggingSpanPeriod; j++) {
          highestHigh = Math.max(highestHigh, data[i - j].high);
          lowestLow = Math.min(lowestLow, data[i - j].low);
        }
        
        leadingSpanB.push((highestHigh + lowestLow) / 2);
      }
      
      // Calculate Lagging Span (Chikou Span)
      for (let i = 0; i < data.length; i++) {
        if (i < displacement) {
          laggingSpan.push(null);
          continue;
        }
        
        laggingSpan.push(data[i - displacement].close);
      }
      
      // Displace Leading Spans forward
      const displacedLeadingSpanA = [];
      const displacedLeadingSpanB = [];
      
      for (let i = 0; i < displacement; i++) {
        displacedLeadingSpanA.push(null);
        displacedLeadingSpanB.push(null);
      }
      
      for (let i = 0; i < leadingSpanA.length; i++) {
        displacedLeadingSpanA.push(leadingSpanA[i]);
        displacedLeadingSpanB.push(leadingSpanB[i]);
      }
      
      return {
        conversionLine,
        baseLine,
        leadingSpanA: displacedLeadingSpanA.slice(0, data.length),
        leadingSpanB: displacedLeadingSpanB.slice(0, data.length),
        laggingSpan
      };
    } catch (error) {
      logger.error(`Ichimoku Cloud calculation error: ${error.message}`);
      throw error;
    } finally {
      finishAppTransaction(transaction);
    }
  }

  /**
   * Calculate Fibonacci Retracement levels
   * 
   * @param {number} high - Highest price in the trend
   * @param {number} low - Lowest price in the trend
   * @returns {Object} - Fibonacci Retracement levels
   */
  fibonacciRetracement(high, low) {
    try {
      if (typeof high !== 'number' || typeof low !== 'number') {
        throw new Error('Invalid high/low values for Fibonacci Retracement calculation');
      }
      
      if (high <= low) {
        throw new Error('High must be greater than low for Fibonacci Retracement calculation');
      }
      
      const diff = high - low;
      
      return {
        level0: high,
        level23_6: high - (diff * 0.236),
        level38_2: high - (diff * 0.382),
        level50: high - (diff * 0.5),
        level61_8: high - (diff * 0.618),
        level78_6: high - (diff * 0.786),
        level100: low
      };
    } catch (error) {
      logger.error(`Fibonacci Retracement calculation error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Calculate Fibonacci Extension levels
   * 
   * @param {number} high - Highest price in the trend
   * @param {number} low - Lowest price in the trend
   * @returns {Object} - Fibonacci Extension levels
   */
  fibonacciExtension(high, low) {
    try {
      if (typeof high !== 'number' || typeof low !== 'number') {
        throw new Error('Invalid high/low values for Fibonacci Extension calculation');
      }
      
      if (high <= low) {
        throw new Error('High must be greater than low for Fibonacci Extension calculation');
      }
      
      const diff = high - low;
      
      return {
        level0: low,
        level61_8: low + (diff * 0.618),
        level100: high,
        level138_2: low + (diff * 1.382),
        level161_8: low + (diff * 1.618),
        level261_8: low + (diff * 2.618)
      };
    } catch (error) {
      logger.error(`Fibonacci Extension calculation error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Calculate On-Balance Volume (OBV)
   * 
   * @param {Array<Object>} data - Price data with close and volume properties
   * @returns {Array<number>} - OBV values
   */
  obv(data) {
    const transaction = startAppTransaction('technical-indicators-obv', 'indicators.obv');
    
    try {
      if (!Array.isArray(data) || data.length === 0) {
        throw new Error('Invalid data for OBV calculation');
      }
      
      // Validate data format
      for (const item of data) {
        if (typeof item.close !== 'number' || typeof item.volume !== 'number') {
          throw new Error('Invalid data format for OBV calculation');
        }
      }
      
      const result = [0]; // Start with 0
      
      for (let i = 1; i < data.length; i++) {
        const currentClose = data[i].close;
        const previousClose = data[i - 1].close;
        const currentVolume = data[i].volume;
        
        if (currentClose > previousClose) {
          // Price up, add volume
          result.push(result[i - 1] + currentVolume);
        } else if (currentClose < previousClose) {
          // Price down, subtract volume
          result.push(result[i - 1] - currentVolume);
        } else {
          // Price unchanged, OBV unchanged
          result.push(result[i - 1]);
        }
      }
      
      return result;
    } catch (error) {
      logger.error(`OBV calculation error: ${error.message}`);
      throw error;
    } finally {
      finishAppTransaction(transaction);
    }
  }

  /**
   * Calculate Volume-Weighted Average Price (VWAP)
   * 
   * @param {Array<Object>} data - Price data with high, low, close, and volume properties
   * @returns {Array<number>} - VWAP values
   */
  vwap(data) {
    const transaction = startAppTransaction('technical-indicators-vwap', 'indicators.vwap');
    
    try {
      if (!Array.isArray(data) || data.length === 0) {
        throw new Error('Invalid data for VWAP calculation');
      }
      
      // Validate data format
      for (const item of data) {
        if (!item.high || !item.low || !item.close || !item.volume) {
          throw new Error('Invalid data format for VWAP calculation');
        }
      }
      
      const result = [];
      let cumulativeTPV = 0; // Cumulative (Typical Price * Volume)
      let cumulativeVolume = 0; // Cumulative Volume
      
      for (let i = 0; i < data.length; i++) {
        const typicalPrice = (data[i].high + data[i].low + data[i].close) / 3;
        const volume = data[i].volume;
        
        cumulativeTPV += typicalPrice * volume;
        cumulativeVolume += volume;
        
        if (cumulativeVolume === 0) {
          result.push(null); // Avoid division by zero
        } else {
          result.push(cumulativeTPV / cumulativeVolume);
        }
      }
      
      return result;
    } catch (error) {
      logger.error(`VWAP calculation error: ${error.message}`);
      throw error;
    } finally {
      finishAppTransaction(transaction);
    }
  }
}

// Create singleton instance
const technicalIndicators = new TechnicalIndicators();

export default technicalIndicators;
