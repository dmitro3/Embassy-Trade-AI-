'use client';

/**
 * Technical Indicators Library
 * 
 * Provides functions for calculating common technical indicators
 * used in trading analysis
 */
const technicalIndicators = {
  /**
   * Calculate Simple Moving Average (SMA)
   * 
   * @param {Array<number>} data - Price data
   * @param {number} period - Period for SMA calculation
   * @returns {Array<number>} - SMA values
   */
  sma: (data, period) => {
    const result = [];
    
    // Need at least 'period' data points
    if (data.length < period) {
      return result;
    }
    
    // Calculate SMA for each window of 'period' data points
    for (let i = period - 1; i < data.length; i++) {
      const windowSlice = data.slice(i - period + 1, i + 1);
      const sum = windowSlice.reduce((acc, val) => acc + val, 0);
      result.push(sum / period);
    }
    
    return result;
  },
  
  /**
   * Calculate Exponential Moving Average (EMA)
   * 
   * @param {Array<number>} data - Price data
   * @param {number} period - Period for EMA calculation
   * @returns {Array<number>} - EMA values
   */
  ema: (data, period) => {
    const result = [];
    
    // Need at least 'period' data points
    if (data.length < period) {
      return result;
    }
    
    // Calculate multiplier
    const multiplier = 2 / (period + 1);
    
    // First EMA is SMA
    const smaFirst = data.slice(0, period).reduce((acc, val) => acc + val, 0) / period;
    result.push(smaFirst);
    
    // Calculate EMA for remaining data points
    for (let i = period; i < data.length; i++) {
      const ema = (data[i] - result[result.length - 1]) * multiplier + result[result.length - 1];
      result.push(ema);
    }
    
    return result;
  },
  
  /**
   * Calculate Relative Strength Index (RSI)
   * 
   * @param {Array<number>} data - Price data
   * @param {number} period - Period for RSI calculation (typically 14)
   * @returns {Array<number>} - RSI values
   */
  rsi: (data, period) => {
    const result = [];
    const gains = [];
    const losses = [];
    
    // Need at least 'period + 1' data points
    if (data.length < period + 1) {
      return result;
    }
    
    // Calculate price changes
    for (let i = 1; i < data.length; i++) {
      const change = data[i] - data[i - 1];
      gains.push(change > 0 ? change : 0);
      losses.push(change < 0 ? Math.abs(change) : 0);
    }
    
    // Calculate first average gain and loss
    const avgGain = gains.slice(0, period).reduce((acc, val) => acc + val, 0) / period;
    const avgLoss = losses.slice(0, period).reduce((acc, val) => acc + val, 0) / period;
    
    // Calculate first RS and RSI
    let rs = avgGain / (avgLoss === 0 ? 0.001 : avgLoss); // Avoid division by zero
    result.push(100 - (100 / (1 + rs)));
    
    // Calculate remaining RSI values
    for (let i = period; i < gains.length; i++) {
      const newAvgGain = (avgGain * (period - 1) + gains[i]) / period;
      const newAvgLoss = (avgLoss * (period - 1) + losses[i]) / period;
      
      rs = newAvgGain / (newAvgLoss === 0 ? 0.001 : newAvgLoss); // Avoid division by zero
      result.push(100 - (100 / (1 + rs)));
    }
    
    return result;
  },
  
  /**
   * Calculate Moving Average Convergence Divergence (MACD)
   * 
   * @param {Array<number>} data - Price data
   * @param {number} fastPeriod - Fast EMA period (typically 12)
   * @param {number} slowPeriod - Slow EMA period (typically 26)
   * @param {number} signalPeriod - Signal EMA period (typically 9)
   * @returns {Array<Object>} - MACD values with line, signal, and histogram
   */
  macd: (data, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) => {
    const result = [];
    
    // Need at least 'slowPeriod + signalPeriod' data points
    if (data.length < slowPeriod + signalPeriod) {
      return result;
    }
    
    // Calculate fast and slow EMAs
    const fastEMA = technicalIndicators.ema(data, fastPeriod);
    const slowEMA = technicalIndicators.ema(data, slowPeriod);
    
    // Calculate MACD line (fast EMA - slow EMA)
    const macdLine = [];
    for (let i = 0; i < slowEMA.length; i++) {
      const fastIndex = i + (fastEMA.length - slowEMA.length);
      macdLine.push(fastEMA[fastIndex] - slowEMA[i]);
    }
    
    // Calculate signal line (EMA of MACD line)
    const signalLine = technicalIndicators.ema(macdLine, signalPeriod);
    
    // Calculate histogram (MACD line - signal line)
    for (let i = 0; i < signalLine.length; i++) {
      const macdIndex = i + (macdLine.length - signalLine.length);
      const histogram = macdLine[macdIndex] - signalLine[i];
      
      result.push({
        macd: macdLine[macdIndex],
        signal: signalLine[i],
        histogram
      });
    }
    
    return result;
  },
  
  /**
   * Calculate Bollinger Bands
   * 
   * @param {Array<number>} data - Price data
   * @param {number} period - Period for SMA calculation (typically 20)
   * @param {number} multiplier - Standard deviation multiplier (typically 2)
   * @returns {Array<Object>} - Bollinger Bands values with upper, middle, and lower bands
   */
  bollinger: (data, period = 20, multiplier = 2) => {
    const result = [];
    
    // Need at least 'period' data points
    if (data.length < period) {
      return result;
    }
    
    // Calculate SMA
    const sma = technicalIndicators.sma(data, period);
    
    // Calculate Bollinger Bands
    for (let i = period - 1; i < data.length; i++) {
      const windowSlice = data.slice(i - period + 1, i + 1);
      const smaIndex = i - (period - 1);
      
      // Calculate standard deviation
      const mean = sma[smaIndex];
      const squaredDiffs = windowSlice.map(val => Math.pow(val - mean, 2));
      const variance = squaredDiffs.reduce((acc, val) => acc + val, 0) / period;
      const stdDev = Math.sqrt(variance);
      
      // Calculate bands
      result.push({
        upper: mean + (multiplier * stdDev),
        middle: mean,
        lower: mean - (multiplier * stdDev)
      });
    }
    
    return result;
  },
  
  /**
   * Calculate Average True Range (ATR)
   * 
   * @param {Array<number>} data - Price data
   * @param {number} period - Period for ATR calculation (typically 14)
   * @returns {Array<number>} - ATR values
   */
  atr: (data, period = 14) => {
    const result = [];
    
    // Need at least 'period + 1' data points
    if (data.length < period + 1) {
      return result;
    }
    
    // Calculate true ranges
    const trueRanges = [];
    for (let i = 1; i < data.length; i++) {
      const high = data[i];
      const low = data[i - 1];
      const previousClose = data[i - 1];
      
      // True Range is the greatest of:
      // 1. Current High - Current Low
      // 2. |Current High - Previous Close|
      // 3. |Current Low - Previous Close|
      const tr1 = Math.abs(high - low);
      const tr2 = Math.abs(high - previousClose);
      const tr3 = Math.abs(low - previousClose);
      
      trueRanges.push(Math.max(tr1, tr2, tr3));
    }
    
    // Calculate first ATR (simple average of first 'period' true ranges)
    const firstATR = trueRanges.slice(0, period).reduce((acc, val) => acc + val, 0) / period;
    result.push(firstATR);
    
    // Calculate remaining ATRs
    for (let i = period; i < trueRanges.length; i++) {
      const atr = ((result[result.length - 1] * (period - 1)) + trueRanges[i]) / period;
      result.push(atr);
    }
    
    return result;
  },
  
  /**
   * Calculate Stochastic Oscillator
   * 
   * @param {Array<number>} data - Price data
   * @param {number} period - Period for %K calculation (typically 14)
   * @param {number} smoothK - Smoothing for %K (typically 1)
   * @param {number} smoothD - Smoothing for %D (typically 3)
   * @returns {Array<Object>} - Stochastic Oscillator values with %K and %D
   */
  stochastic: (data, period = 14, smoothK = 1, smoothD = 3) => {
    const result = [];
    
    // Need at least 'period' data points
    if (data.length < period) {
      return result;
    }
    
    // Calculate %K
    const kValues = [];
    for (let i = period - 1; i < data.length; i++) {
      const windowSlice = data.slice(i - period + 1, i + 1);
      const currentPrice = data[i];
      const lowestLow = Math.min(...windowSlice);
      const highestHigh = Math.max(...windowSlice);
      
      // %K = (Current Close - Lowest Low) / (Highest High - Lowest Low) * 100
      const k = (currentPrice - lowestLow) / (highestHigh - lowestLow) * 100;
      kValues.push(k);
    }
    
    // Smooth %K if needed
    const smoothedK = smoothK > 1 ? technicalIndicators.sma(kValues, smoothK) : kValues;
    
    // Calculate %D (SMA of %K)
    const dValues = technicalIndicators.sma(smoothedK, smoothD);
    
    // Combine %K and %D
    for (let i = 0; i < dValues.length; i++) {
      const kIndex = i + (smoothedK.length - dValues.length);
      
      result.push({
        k: smoothedK[kIndex],
        d: dValues[i]
      });
    }
    
    return result;
  }
};

export default technicalIndicators;
