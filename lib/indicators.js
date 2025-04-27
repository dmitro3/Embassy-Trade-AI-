// filepath: c:\Users\pablo\Projects\embassy-trade-motia\web\lib\indicators.js
'use client';

import logger from './logger.js';

/**
 * Technical trading indicators implementation
 */
class TechnicalIndicators {
  /**
   * Calculate Simple Moving Average (SMA)
   * 
   * @param {Array} prices - Array of price values
   * @param {number} period - Period for SMA calculation
   * @returns {number|null} - SMA value or null if insufficient data
   */
  calculateSMA(prices, period) {
    if (prices.length < period) {
      return null;
    }
    
    const slice = prices.slice(prices.length - period);
    const sum = slice.reduce((total, price) => total + price, 0);
    return sum / period;
  }
  
  /**
   * Calculate Exponential Moving Average (EMA)
   * 
   * @param {Array} prices - Array of price values
   * @param {number} period - Period for EMA calculation
   * @returns {number|null} - EMA value or null if insufficient data
   */
  calculateEMA(prices, period) {
    if (prices.length < period) {
      return null;
    }
    
    const k = 2 / (period + 1);
    
    // Start with SMA
    let ema = this.calculateSMA(prices.slice(0, period), period);
    
    // Calculate EMA for remaining prices
    for (let i = period; i < prices.length; i++) {
      ema = prices[i] * k + ema * (1 - k);
    }
    
    return ema;
  }
  
  /**
   * Calculate Relative Strength Index (RSI)
   * 
   * @param {Array} prices - Array of price values
   * @param {number} period - Period for RSI calculation (typically 14)
   * @returns {number|null} - RSI value or null if insufficient data
   */
  calculateRSI(prices, period = 14) {
    if (prices.length <= period) {
      return null;
    }
    
    // Calculate price changes
    const changes = [];
    for (let i = 1; i < prices.length; i++) {
      changes.push(prices[i] - prices[i - 1]);
    }
    
    // Calculate gains and losses
    const gains = changes.map(change => Math.max(0, change));
    const losses = changes.map(change => Math.abs(Math.min(0, change)));
    
    // Calculate average gain and average loss
    const avgGain = this.calculateSMA(gains.slice(0, period), period);
    const avgLoss = this.calculateSMA(losses.slice(0, period), period);
    
    if (avgLoss === 0) {
      return 100; // No losses means RSI = 100
    }
    
    // Calculate RS and RSI
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  }
  
  /**
   * Calculate MACD (Moving Average Convergence Divergence)
   * 
   * @param {Array} prices - Array of price values
   * @param {number} fastPeriod - Fast EMA period (typically 12)
   * @param {number} slowPeriod - Slow EMA period (typically 26)
   * @param {number} signalPeriod - Signal EMA period (typically 9)
   * @returns {Object|null} - MACD values or null if insufficient data
   */
  calculateMACD(prices, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
    if (prices.length <= slowPeriod + signalPeriod) {
      return null;
    }
    
    // Calculate fast and slow EMAs
    const fastEMA = this.calculateEMA(prices, fastPeriod);
    const slowEMA = this.calculateEMA(prices, slowPeriod);
    
    // Calculate MACD line
    const macdLine = fastEMA - slowEMA;
    
    // Calculate signal line (EMA of MACD line)
    // This is a simplification - ideally we'd calculate EMA of MACD over time
    const signalLine = this.calculateEMA([...Array(signalPeriod - 1).fill(macdLine), macdLine], signalPeriod);
    
    // Calculate histogram
    const histogram = macdLine - signalLine;
    
    return {
      macdLine,
      signalLine,
      histogram
    };
  }
  
  /**
   * Calculate Bollinger Bands
   * 
   * @param {Array} prices - Array of price values
   * @param {number} period - Period for Bollinger Bands (typically 20)
   * @param {number} stdDev - Standard deviation multiplier (typically 2)
   * @returns {Object|null} - Bollinger Bands or null if insufficient data
   */
  calculateBollingerBands(prices, period = 20, stdDev = 2) {
    if (prices.length < period) {
      return null;
    }
    
    // Calculate SMA
    const middle = this.calculateSMA(prices.slice(prices.length - period), period);
    
    // Calculate standard deviation
    const slice = prices.slice(prices.length - period);
    const squaredDifferences = slice.map(price => Math.pow(price - middle, 2));
    const variance = squaredDifferences.reduce((total, squared) => total + squared, 0) / period;
    const standardDeviation = Math.sqrt(variance);
    
    // Calculate upper and lower bands
    const upper = middle + (standardDeviation * stdDev);
    const lower = middle - (standardDeviation * stdDev);
    
    return {
      upper,
      middle,
      lower
    };
  }
  
  /**
   * Moving Average Crossover Strategy
   * 
   * @param {Array} marketData - Historical market data
   * @param {Object} params - Strategy parameters
   * @returns {Object} - Trading signal
   */
  async movingAverageCrossover(marketData, params = {}) {
    try {
      // Extract close prices from market data
      const prices = marketData.map(candle => typeof candle === 'object' ? candle.close : candle);
      
      // Set default periods
      const fastPeriod = params.fastPeriod || 9;
      const slowPeriod = params.slowPeriod || 21;
      
      // Need sufficient data
      if (prices.length < slowPeriod + 5) {
        return { action: 'hold', confidence: 0.5, notes: ['Insufficient data for MA crossover strategy'] };
      }
      
      // Calculate recent MAs
      const fastMA = this.calculateSMA(prices, fastPeriod);
      const slowMA = this.calculateSMA(prices, slowPeriod);
      
      // Calculate previous MAs (one period back)
      const previousPrices = prices.slice(0, prices.length - 1);
      const previousFastMA = this.calculateSMA(previousPrices, fastPeriod);
      const previousSlowMA = this.calculateSMA(previousPrices, slowPeriod);
      
      // Check for crossover
      const isBullishCrossover = previousFastMA <= previousSlowMA && fastMA > slowMA;
      const isBearishCrossover = previousFastMA >= previousSlowMA && fastMA < slowMA;
      
      // Calculate trend strength
      const trendStrength = Math.abs(fastMA - slowMA) / slowMA;
      const normalizedStrength = Math.min(1, trendStrength * 10); // Normalize between 0 and 1
      
      // Generate signal
      let action = 'hold';
      let confidence = 0.5;
      let notes = [];
      
      if (isBullishCrossover) {
        action = 'buy';
        confidence = 0.5 + normalizedStrength / 2;
        notes.push(`Bullish MA crossover: Fast(${fastPeriod})=${fastMA.toFixed(2)} crossed above Slow(${slowPeriod})=${slowMA.toFixed(2)}`);
      } else if (isBearishCrossover) {
        action = 'sell';
        confidence = 0.5 + normalizedStrength / 2;
        notes.push(`Bearish MA crossover: Fast(${fastPeriod})=${fastMA.toFixed(2)} crossed below Slow(${slowPeriod})=${slowMA.toFixed(2)}`);
      } else if (fastMA > slowMA) {
        action = 'hold';
        confidence = 0.5 + normalizedStrength / 4;
        notes.push(`Bullish trend: Fast(${fastPeriod})=${fastMA.toFixed(2)} > Slow(${slowPeriod})=${slowMA.toFixed(2)}`);
      } else {
        action = 'hold';
        confidence = 0.5 + normalizedStrength / 4;
        notes.push(`Bearish trend: Fast(${fastPeriod})=${fastMA.toFixed(2)} < Slow(${slowPeriod})=${slowMA.toFixed(2)}`);
      }
      
      return { action, confidence, notes };
    } catch (error) {
      logger.error(`Moving Average Crossover error: ${error.message}`);
      return { action: 'hold', confidence: 0.5, notes: [`Error: ${error.message}`] };
    }
  }
  
  /**
   * RSI Indicator Strategy
   * 
   * @param {Array} marketData - Historical market data
   * @param {Object} params - Strategy parameters
   * @returns {Object} - Trading signal
   */
  async rsiIndicator(marketData, params = {}) {
    try {
      // Extract close prices from market data
      const prices = marketData.map(candle => typeof candle === 'object' ? candle.close : candle);
      
      // Set default parameters
      const period = params.rsiPeriod || 14;
      const oversoldThreshold = params.oversoldThreshold || 30;
      const overboughtThreshold = params.overboughtThreshold || 70;
      
      // Need sufficient data
      if (prices.length < period + 5) {
        return { action: 'hold', confidence: 0.5, notes: ['Insufficient data for RSI strategy'] };
      }
      
      // Calculate RSI
      const rsi = this.calculateRSI(prices, period);
      
      // Calculate previous RSI (one period back)
      const previousPrices = prices.slice(0, prices.length - 1);
      const previousRSI = this.calculateRSI(previousPrices, period);
      
      // Generate signal
      let action = 'hold';
      let confidence = 0.5;
      let notes = [];
      
      if (rsi < oversoldThreshold) {
        // Oversold condition - potential buy
        action = 'buy';
        // The more oversold, the higher the confidence
        confidence = 0.5 + (oversoldThreshold - rsi) / oversoldThreshold;
        notes.push(`Oversold: RSI(${period})=${rsi.toFixed(2)} < ${oversoldThreshold}`);
        
        // Check for reversal (RSI turning up from oversold)
        if (rsi > previousRSI) {
          confidence += 0.1;
          notes.push(`RSI turning up from oversold: ${previousRSI.toFixed(2)} -> ${rsi.toFixed(2)}`);
        }
      } else if (rsi > overboughtThreshold) {
        // Overbought condition - potential sell
        action = 'sell';
        // The more overbought, the higher the confidence
        confidence = 0.5 + (rsi - overboughtThreshold) / (100 - overboughtThreshold);
        notes.push(`Overbought: RSI(${period})=${rsi.toFixed(2)} > ${overboughtThreshold}`);
        
        // Check for reversal (RSI turning down from overbought)
        if (rsi < previousRSI) {
          confidence += 0.1;
          notes.push(`RSI turning down from overbought: ${previousRSI.toFixed(2)} -> ${rsi.toFixed(2)}`);
        }
      } else {
        // Neutral zone
        action = 'hold';
        // Calculate how close RSI is to either threshold
        const distanceToOversold = Math.abs(rsi - oversoldThreshold);
        const distanceToOverbought = Math.abs(rsi - overboughtThreshold);
        const minDistance = Math.min(distanceToOversold, distanceToOverbought);
        
        confidence = 0.5 - (minDistance / (overboughtThreshold - oversoldThreshold)) * 0.3;
        notes.push(`Neutral: RSI(${period})=${rsi.toFixed(2)}`);
      }
      
      // Cap confidence at 0.95
      confidence = Math.min(0.95, confidence);
      
      return { action, confidence, notes };
    } catch (error) {
      logger.error(`RSI Indicator error: ${error.message}`);
      return { action: 'hold', confidence: 0.5, notes: [`Error: ${error.message}`] };
    }
  }
  
  /**
   * MACD Indicator Strategy
   * 
   * @param {Array} marketData - Historical market data
   * @param {Object} params - Strategy parameters
   * @returns {Object} - Trading signal
   */
  async macdIndicator(marketData, params = {}) {
    try {
      // Extract close prices from market data
      const prices = marketData.map(candle => typeof candle === 'object' ? candle.close : candle);
      
      // Set default parameters
      const fastPeriod = params.fastPeriod || 12;
      const slowPeriod = params.slowPeriod || 26;
      const signalPeriod = params.signalPeriod || 9;
      
      // Need sufficient data
      if (prices.length < slowPeriod + signalPeriod + 5) {
        return { action: 'hold', confidence: 0.5, notes: ['Insufficient data for MACD strategy'] };
      }
      
      // Calculate MACD
      const macd = this.calculateMACD(prices, fastPeriod, slowPeriod, signalPeriod);
      
      // Calculate previous MACD (one period back)
      const previousPrices = prices.slice(0, prices.length - 1);
      const previousMACD = this.calculateMACD(previousPrices, fastPeriod, slowPeriod, signalPeriod);
      
      // Generate signal
      let action = 'hold';
      let confidence = 0.5;
      let notes = [];
      
      // Check for signal line crossover
      const isBullishCrossover = previousMACD.macdLine <= previousMACD.signalLine && 
                                macd.macdLine > macd.signalLine;
      
      const isBearishCrossover = previousMACD.macdLine >= previousMACD.signalLine && 
                                macd.macdLine < macd.signalLine;
      
      if (isBullishCrossover) {
        action = 'buy';
        
        // Calculate confidence based on histogram strength and direction
        const histogramStrength = Math.abs(macd.histogram) / prices[prices.length - 1] * 1000; // Normalize
        confidence = 0.6 + Math.min(0.3, histogramStrength);
        
        notes.push(`Bullish MACD crossover: MACD=${macd.macdLine.toFixed(4)} crossed above Signal=${macd.signalLine.toFixed(4)}`);
        
        // Add extra confidence if crossing above zero
        if (previousMACD.macdLine < 0 && macd.macdLine > 0) {
          confidence += 0.1;
          notes.push('MACD line crossing above zero');
        }
      } else if (isBearishCrossover) {
        action = 'sell';
        
        // Calculate confidence based on histogram strength and direction
        const histogramStrength = Math.abs(macd.histogram) / prices[prices.length - 1] * 1000; // Normalize
        confidence = 0.6 + Math.min(0.3, histogramStrength);
        
        notes.push(`Bearish MACD crossover: MACD=${macd.macdLine.toFixed(4)} crossed below Signal=${macd.signalLine.toFixed(4)}`);
        
        // Add extra confidence if crossing below zero
        if (previousMACD.macdLine > 0 && macd.macdLine < 0) {
          confidence += 0.1;
          notes.push('MACD line crossing below zero');
        }
      } else {
        // No crossover, check MACD direction
        if (macd.macdLine > macd.signalLine) {
          action = 'hold';
          notes.push('MACD above signal line: Bullish trend');
          confidence = 0.5 + Math.min(0.2, Math.abs(macd.histogram) / prices[prices.length - 1] * 500);
        } else {
          action = 'hold';
          notes.push('MACD below signal line: Bearish trend');
          confidence = 0.5 + Math.min(0.2, Math.abs(macd.histogram) / prices[prices.length - 1] * 500);
        }
      }
      
      // Cap confidence at 0.95
      confidence = Math.min(0.95, confidence);
      
      return { action, confidence, notes };
    } catch (error) {
      logger.error(`MACD Indicator error: ${error.message}`);
      return { action: 'hold', confidence: 0.5, notes: [`Error: ${error.message}`] };
    }
  }
  
  /**
   * Bollinger Bands Strategy
   * 
   * @param {Array} marketData - Historical market data
   * @param {Object} params - Strategy parameters
   * @returns {Object} - Trading signal
   */
  async bollingerBands(marketData, params = {}) {
    try {
      // Extract close prices from market data
      const prices = marketData.map(candle => typeof candle === 'object' ? candle.close : candle);
      
      // Get current price
      const currentPrice = prices[prices.length - 1];
      
      // Set default parameters
      const period = params.bperiod || 20;
      const stdDev = params.stdDev || 2;
      
      // Need sufficient data
      if (prices.length < period + 5) {
        return { action: 'hold', confidence: 0.5, notes: ['Insufficient data for Bollinger Bands strategy'] };
      }
      
      // Calculate Bollinger Bands
      const bands = this.calculateBollingerBands(prices, period, stdDev);
      
      // Generate signal
      let action = 'hold';
      let confidence = 0.5;
      let notes = [];
      
      // Calculate percentage bandwidth (volatility)
      const bandwidth = (bands.upper - bands.lower) / bands.middle;
      
      // Calculate position within bands (0 = at lower band, 1 = at upper band)
      let position = (currentPrice - bands.lower) / (bands.upper - bands.lower);
      position = Math.max(0, Math.min(1, position)); // Clamp between 0 and 1
      
      if (currentPrice < bands.lower) {
        // Price below lower band - potential buy (oversold)
        action = 'buy';
        
        // Calculate confidence based on how far below the band
        const deviation = (bands.lower - currentPrice) / bands.lower;
        confidence = 0.7 + Math.min(0.25, deviation * 10);
        
        notes.push(`Price ${currentPrice.toFixed(4)} below lower band ${bands.lower.toFixed(4)}`);
      } else if (currentPrice > bands.upper) {
        // Price above upper band - potential sell (overbought)
        action = 'sell';
        
        // Calculate confidence based on how far above the band
        const deviation = (currentPrice - bands.upper) / bands.upper;
        confidence = 0.7 + Math.min(0.25, deviation * 10);
        
        notes.push(`Price ${currentPrice.toFixed(4)} above upper band ${bands.upper.toFixed(4)}`);
      } else {
        // Price within bands
        if (position < 0.2) {
          // Price near lower band - potential buy
          action = 'buy';
          confidence = 0.5 + (0.2 - position);
          notes.push(`Price ${currentPrice.toFixed(4)} near lower band ${bands.lower.toFixed(4)}`);
        } else if (position > 0.8) {
          // Price near upper band - potential sell
          action = 'sell';
          confidence = 0.5 + (position - 0.8);
          notes.push(`Price ${currentPrice.toFixed(4)} near upper band ${bands.upper.toFixed(4)}`);
        } else {
          // Price in middle of bands - hold
          action = 'hold';
          confidence = 0.5;
          notes.push(`Price ${currentPrice.toFixed(4)} within bands [${bands.lower.toFixed(4)}, ${bands.upper.toFixed(4)}]`);
        }
      }
      
      // Adjust confidence based on bandwidth
      // Low bandwidth = consolidation, less confidence in breakout signals
      if (bandwidth < 0.05) { // Tight bands
        confidence *= 0.8;
        notes.push('Low volatility: Bands are tight, potential breakout soon');
      }
      
      // Cap confidence at 0.95
      confidence = Math.min(0.95, confidence);
      
      return { action, confidence, notes };
    } catch (error) {
      logger.error(`Bollinger Bands error: ${error.message}`);
      return { action: 'hold', confidence: 0.5, notes: [`Error: ${error.message}`] };
    }
  }
}

// Create and export singleton instance
export const technicalIndicators = new TechnicalIndicators();
