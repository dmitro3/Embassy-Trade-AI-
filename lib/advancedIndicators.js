/**
 * Advanced Technical Indicators
 * 
 * This module provides advanced technical indicators for trading strategies,
 * including Ichimoku Cloud and Fibonacci Retracement.
 */

/**
 * Calculate Ichimoku Cloud components
 * 
 * @param {Array} prices - Array of price objects with high, low, and close properties
 * @param {Object} params - Parameters for Ichimoku Cloud calculation
 * @param {number} params.tenkanPeriod - Tenkan-sen (Conversion Line) period (default: 9)
 * @param {number} params.kijunPeriod - Kijun-sen (Base Line) period (default: 26)
 * @param {number} params.senkouSpanBPeriod - Senkou Span B period (default: 52)
 * @param {number} params.displacement - Displacement period (default: 26)
 * @returns {Object} - Ichimoku Cloud components
 */
export function calculateIchimokuCloud(prices, params = {}) {
  // Default parameters
  const tenkanPeriod = params.tenkanPeriod || 9;
  const kijunPeriod = params.kijunPeriod || 26;
  const senkouSpanBPeriod = params.senkouSpanBPeriod || 52;
  const displacement = params.displacement || 26;
  
  if (prices.length < Math.max(tenkanPeriod, kijunPeriod, senkouSpanBPeriod) + displacement) {
    throw new Error('Not enough price data for Ichimoku Cloud calculation');
  }
  
  const result = [];
  
  for (let i = 0; i < prices.length; i++) {
    // Skip if not enough data for calculation
    if (i < Math.max(tenkanPeriod, kijunPeriod, senkouSpanBPeriod) - 1) {
      result.push({
        date: prices[i].date,
        tenkanSen: null,
        kijunSen: null,
        senkouSpanA: null,
        senkouSpanB: null,
        chikouSpan: null
      });
      continue;
    }
    
    // Calculate Tenkan-sen (Conversion Line)
    const tenkanSen = calculateDonchian(prices, i, tenkanPeriod);
    
    // Calculate Kijun-sen (Base Line)
    const kijunSen = calculateDonchian(prices, i, kijunPeriod);
    
    // Calculate Senkou Span A (Leading Span A)
    let senkouSpanA = null;
    if (tenkanSen !== null && kijunSen !== null) {
      senkouSpanA = (tenkanSen + kijunSen) / 2;
    }
    
    // Calculate Senkou Span B (Leading Span B)
    const senkouSpanB = calculateDonchian(prices, i, senkouSpanBPeriod);
    
    // Calculate Chikou Span (Lagging Span)
    let chikouSpan = null;
    if (i - displacement >= 0) {
      chikouSpan = prices[i - displacement].close;
    }
    
    result.push({
      date: prices[i].date,
      tenkanSen,
      kijunSen,
      senkouSpanA,
      senkouSpanB,
      chikouSpan
    });
  }
  
  // Displace Senkou Span A and B forward
  for (let i = 0; i < result.length - displacement; i++) {
    if (i + displacement < result.length) {
      result[i + displacement].senkouSpanA = result[i].senkouSpanA;
      result[i + displacement].senkouSpanB = result[i].senkouSpanB;
    }
  }
  
  return result;
}

/**
 * Calculate Donchian Channel (highest high and lowest low)
 * 
 * @param {Array} prices - Array of price objects with high and low properties
 * @param {number} currentIndex - Current index
 * @param {number} period - Period for calculation
 * @returns {number|null} - Donchian Channel middle value
 */
function calculateDonchian(prices, currentIndex, period) {
  if (currentIndex < period - 1) {
    return null;
  }
  
  let highestHigh = -Infinity;
  let lowestLow = Infinity;
  
  for (let i = currentIndex - period + 1; i <= currentIndex; i++) {
    highestHigh = Math.max(highestHigh, prices[i].high);
    lowestLow = Math.min(lowestLow, prices[i].low);
  }
  
  return (highestHigh + lowestLow) / 2;
}

/**
 * Calculate Fibonacci Retracement levels
 * 
 * @param {number} high - Highest price in the trend
 * @param {number} low - Lowest price in the trend
 * @param {Array} levels - Fibonacci levels to calculate (default: [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1])
 * @returns {Object} - Fibonacci Retracement levels
 */
export function calculateFibonacciRetracement(high, low, levels = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1]) {
  const range = high - low;
  const result = {};
  
  levels.forEach(level => {
    result[level] = high - (range * level);
  });
  
  return result;
}

/**
 * Calculate Fibonacci Extension levels
 * 
 * @param {number} high - Highest price in the trend
 * @param {number} low - Lowest price in the trend
 * @param {Array} levels - Fibonacci levels to calculate (default: [0, 0.618, 1, 1.618, 2.618, 3.618, 4.236])
 * @returns {Object} - Fibonacci Extension levels
 */
export function calculateFibonacciExtension(high, low, levels = [0, 0.618, 1, 1.618, 2.618, 3.618, 4.236]) {
  const range = high - low;
  const result = {};
  
  levels.forEach(level => {
    result[level] = low + (range * level);
  });
  
  return result;
}

/**
 * Calculate Fibonacci Time Zones
 * 
 * @param {Date} startDate - Start date for Fibonacci Time Zones
 * @param {number} timeUnit - Time unit in milliseconds (e.g., 24 * 60 * 60 * 1000 for days)
 * @param {Array} levels - Fibonacci levels to calculate (default: [1, 2, 3, 5, 8, 13, 21, 34, 55, 89])
 * @returns {Array} - Fibonacci Time Zones
 */
export function calculateFibonacciTimeZones(startDate, timeUnit, levels = [1, 2, 3, 5, 8, 13, 21, 34, 55, 89]) {
  const startTime = startDate.getTime();
  const result = [];
  
  levels.forEach(level => {
    const date = new Date(startTime + (timeUnit * level));
    result.push({
      level,
      date
    });
  });
  
  return result;
}

/**
 * Calculate Moving Average Convergence Divergence (MACD)
 * 
 * @param {Array} prices - Array of price objects with close property
 * @param {Object} params - Parameters for MACD calculation
 * @param {number} params.fastPeriod - Fast EMA period (default: 12)
 * @param {number} params.slowPeriod - Slow EMA period (default: 26)
 * @param {number} params.signalPeriod - Signal EMA period (default: 9)
 * @returns {Array} - MACD values
 */
export function calculateMACD(prices, params = {}) {
  const fastPeriod = params.fastPeriod || 12;
  const slowPeriod = params.slowPeriod || 26;
  const signalPeriod = params.signalPeriod || 9;
  
  const closePrices = prices.map(price => price.close);
  
  // Calculate fast EMA
  const fastEMA = calculateEMA(closePrices, fastPeriod);
  
  // Calculate slow EMA
  const slowEMA = calculateEMA(closePrices, slowPeriod);
  
  // Calculate MACD line
  const macdLine = [];
  for (let i = 0; i < closePrices.length; i++) {
    if (i < slowPeriod - 1) {
      macdLine.push(null);
    } else {
      macdLine.push(fastEMA[i] - slowEMA[i]);
    }
  }
  
  // Calculate signal line (EMA of MACD line)
  const signalLine = calculateEMA(macdLine.slice(slowPeriod - 1), signalPeriod);
  
  // Calculate histogram
  const histogram = [];
  for (let i = 0; i < macdLine.length; i++) {
    if (i < slowPeriod - 1 + signalPeriod - 1) {
      histogram.push(null);
    } else {
      const signalIndex = i - (slowPeriod - 1);
      histogram.push(macdLine[i] - signalLine[signalIndex]);
    }
  }
  
  // Combine results
  const result = [];
  for (let i = 0; i < prices.length; i++) {
    result.push({
      date: prices[i].date,
      macd: macdLine[i],
      signal: i < slowPeriod - 1 + signalPeriod - 1 ? null : signalLine[i - (slowPeriod - 1)],
      histogram: histogram[i]
    });
  }
  
  return result;
}

/**
 * Calculate Exponential Moving Average (EMA)
 * 
 * @param {Array} prices - Array of price values
 * @param {number} period - Period for EMA calculation
 * @returns {Array} - EMA values
 */
function calculateEMA(prices, period) {
  const result = [];
  const multiplier = 2 / (period + 1);
  
  // Calculate SMA for the first period
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += prices[i];
  }
  const sma = sum / period;
  
  // Set initial EMA value
  for (let i = 0; i < period - 1; i++) {
    result.push(null);
  }
  result.push(sma);
  
  // Calculate EMA for the rest of the prices
  for (let i = period; i < prices.length; i++) {
    const ema = (prices[i] - result[i - 1]) * multiplier + result[i - 1];
    result.push(ema);
  }
  
  return result;
}

/**
 * Calculate Relative Strength Index (RSI)
 * 
 * @param {Array} prices - Array of price objects with close property
 * @param {number} period - Period for RSI calculation (default: 14)
 * @returns {Array} - RSI values
 */
export function calculateRSI(prices, period = 14) {
  const closePrices = prices.map(price => price.close);
  const result = [];
  
  // Calculate price changes
  const changes = [];
  for (let i = 1; i < closePrices.length; i++) {
    changes.push(closePrices[i] - closePrices[i - 1]);
  }
  
  // Calculate initial average gain and loss
  let avgGain = 0;
  let avgLoss = 0;
  
  for (let i = 0; i < period; i++) {
    if (i < changes.length) {
      if (changes[i] > 0) {
        avgGain += changes[i];
      } else {
        avgLoss += Math.abs(changes[i]);
      }
    }
  }
  
  avgGain /= period;
  avgLoss /= period;
  
  // Calculate RSI
  for (let i = 0; i < prices.length; i++) {
    if (i < period) {
      result.push(null);
    } else {
      // Calculate RS
      const rs = avgGain / avgLoss;
      
      // Calculate RSI
      const rsi = 100 - (100 / (1 + rs));
      result.push(rsi);
      
      // Update average gain and loss for the next period
      if (i < prices.length - 1) {
        const change = closePrices[i + 1] - closePrices[i];
        const gain = change > 0 ? change : 0;
        const loss = change < 0 ? Math.abs(change) : 0;
        
        avgGain = ((avgGain * (period - 1)) + gain) / period;
        avgLoss = ((avgLoss * (period - 1)) + loss) / period;
      }
    }
  }
  
  return result;
}

/**
 * Calculate Average Directional Index (ADX)
 * 
 * @param {Array} prices - Array of price objects with high, low, and close properties
 * @param {number} period - Period for ADX calculation (default: 14)
 * @returns {Array} - ADX values
 */
export function calculateADX(prices, period = 14) {
  const result = [];
  
  // Calculate +DI and -DI
  const plusDM = [];
  const minusDM = [];
  const trueRange = [];
  
  for (let i = 1; i < prices.length; i++) {
    // Calculate directional movement
    const upMove = prices[i].high - prices[i - 1].high;
    const downMove = prices[i - 1].low - prices[i].low;
    
    // Calculate +DM and -DM
    if (upMove > downMove && upMove > 0) {
      plusDM.push(upMove);
    } else {
      plusDM.push(0);
    }
    
    if (downMove > upMove && downMove > 0) {
      minusDM.push(downMove);
    } else {
      minusDM.push(0);
    }
    
    // Calculate true range
    const tr1 = prices[i].high - prices[i].low;
    const tr2 = Math.abs(prices[i].high - prices[i - 1].close);
    const tr3 = Math.abs(prices[i].low - prices[i - 1].close);
    trueRange.push(Math.max(tr1, tr2, tr3));
  }
  
  // Calculate smoothed values
  const smoothedPlusDM = calculateSmoothedValues(plusDM, period);
  const smoothedMinusDM = calculateSmoothedValues(minusDM, period);
  const smoothedTR = calculateSmoothedValues(trueRange, period);
  
  // Calculate +DI and -DI
  const plusDI = [];
  const minusDI = [];
  
  for (let i = 0; i < smoothedPlusDM.length; i++) {
    plusDI.push((smoothedPlusDM[i] / smoothedTR[i]) * 100);
    minusDI.push((smoothedMinusDM[i] / smoothedTR[i]) * 100);
  }
  
  // Calculate DX
  const dx = [];
  
  for (let i = 0; i < plusDI.length; i++) {
    const diff = Math.abs(plusDI[i] - minusDI[i]);
    const sum = plusDI[i] + minusDI[i];
    dx.push((diff / sum) * 100);
  }
  
  // Calculate ADX (smoothed DX)
  const adx = calculateSmoothedValues(dx, period);
  
  // Combine results
  for (let i = 0; i < prices.length; i++) {
    if (i < period * 2) {
      result.push({
        date: prices[i].date,
        adx: null,
        plusDI: null,
        minusDI: null
      });
    } else {
      const index = i - (period * 2);
      result.push({
        date: prices[i].date,
        adx: adx[index],
        plusDI: plusDI[index],
        minusDI: minusDI[index]
      });
    }
  }
  
  return result;
}

/**
 * Calculate smoothed values (similar to Wilder's smoothing)
 * 
 * @param {Array} values - Array of values
 * @param {number} period - Period for smoothing
 * @returns {Array} - Smoothed values
 */
function calculateSmoothedValues(values, period) {
  const result = [];
  
  // Calculate initial value (simple sum)
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += values[i];
  }
  result.push(sum);
  
  // Calculate smoothed values
  for (let i = period; i < values.length; i++) {
    const smoothedValue = result[result.length - 1] - (result[result.length - 1] / period) + values[i];
    result.push(smoothedValue);
  }
  
  return result;
}

/**
 * Calculate Bollinger Bands
 * 
 * @param {Array} prices - Array of price objects with close property
 * @param {Object} params - Parameters for Bollinger Bands calculation
 * @param {number} params.period - Period for SMA calculation (default: 20)
 * @param {number} params.stdDev - Number of standard deviations (default: 2)
 * @returns {Array} - Bollinger Bands values
 */
export function calculateBollingerBands(prices, params = {}) {
  const period = params.period || 20;
  const stdDev = params.stdDev || 2;
  
  const result = [];
  const closePrices = prices.map(price => price.close);
  
  for (let i = 0; i < prices.length; i++) {
    if (i < period - 1) {
      result.push({
        date: prices[i].date,
        middle: null,
        upper: null,
        lower: null
      });
    } else {
      // Calculate SMA
      let sum = 0;
      for (let j = i - period + 1; j <= i; j++) {
        sum += closePrices[j];
      }
      const sma = sum / period;
      
      // Calculate standard deviation
      let sumSquaredDiff = 0;
      for (let j = i - period + 1; j <= i; j++) {
        sumSquaredDiff += Math.pow(closePrices[j] - sma, 2);
      }
      const standardDeviation = Math.sqrt(sumSquaredDiff / period);
      
      // Calculate Bollinger Bands
      result.push({
        date: prices[i].date,
        middle: sma,
        upper: sma + (standardDeviation * stdDev),
        lower: sma - (standardDeviation * stdDev)
      });
    }
  }
  
  return result;
}
