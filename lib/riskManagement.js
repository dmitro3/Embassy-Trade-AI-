import logger from './logger.js';

/**
 * Risk levels and their corresponding thresholds
 */
const RISK_LEVELS = {
  LOW: { maxVolatility: 0.05, maxDrawdown: 0.03, minSharpe: 1.5 },
  MEDIUM: { maxVolatility: 0.10, maxDrawdown: 0.07, minSharpe: 1.0 },
  HIGH: { maxVolatility: 0.20, maxDrawdown: 0.15, minSharpe: 0.5 }
};

/**
 * Calculate portfolio volatility based on historical prices
 */
const calculateVolatility = (prices) => {
  const returns = prices.slice(1).map((price, i) => (price - prices[i]) / prices[i]);
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / returns.length;
  return Math.sqrt(variance);
};

/**
 * Calculate maximum drawdown from a series of prices
 */
const calculateMaxDrawdown = (prices) => {
  let maxDrawdown = 0;
  let peak = prices[0];

  for (const price of prices) {
    if (price > peak) {
      peak = price;
    } else {
      const drawdown = (peak - price) / peak;
      maxDrawdown = Math.max(maxDrawdown, drawdown);
    }
  }

  return maxDrawdown;
};

/**
 * Calculate Sharpe ratio based on returns and risk-free rate
 */
const calculateSharpeRatio = (returns, riskFreeRate = 0.02) => {
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const volatility = calculateVolatility(returns);
  return (mean - riskFreeRate) / volatility;
};

/**
 * Analyze trade history and current market conditions
 */
export const analyzeTradeRisk = async (tradeHistory) => {
  const recentTrades = tradeHistory.slice(-10);
  const prices = recentTrades.map(trade => trade.price);
  const returns = recentTrades.map(trade => trade.profit / trade.amount);

  // Get current market price
  const currentPrice = await fetchEMBPrice();
  
  const volatility = calculateVolatility(prices);
  const maxDrawdown = calculateMaxDrawdown(prices);
  const sharpeRatio = calculateSharpeRatio(returns);

  // Determine risk level based on metrics
  let riskLevel = 'HIGH';
  for (const [level, thresholds] of Object.entries(RISK_LEVELS)) {
    if (volatility <= thresholds.maxVolatility &&
        maxDrawdown <= thresholds.maxDrawdown &&
        sharpeRatio >= thresholds.minSharpe) {
      riskLevel = level;
      break;
    }
  }

  // Calculate optimal position size based on risk level
  const accountValue = recentTrades[0]?.accountValue || 0;
  const riskPercentage = {
    LOW: 0.05,
    MEDIUM: 0.03,
    HIGH: 0.01
  }[riskLevel];

  const positionSize = accountValue * riskPercentage;

  // Generate risk-adjusted recommendations
  const recommendations = [];
  if (volatility > RISK_LEVELS.MEDIUM.maxVolatility) {
    recommendations.push('Consider reducing position sizes due to high market volatility');
  }
  if (maxDrawdown > RISK_LEVELS.MEDIUM.maxDrawdown) {
    recommendations.push('Set tighter stop-losses to protect against significant drawdowns');
  }
  if (sharpeRatio < RISK_LEVELS.MEDIUM.minSharpe) {
    recommendations.push('Review trading strategy as risk-adjusted returns are suboptimal');
  }

  return {
    riskLevel,
    metrics: {
      volatility: volatility * 100,
      maxDrawdown: maxDrawdown * 100,
      sharpeRatio
    },
    recommendations,
    suggestedPositionSize: positionSize,
    stopLossPercentage: maxDrawdown * 1.5, // 1.5x the historical max drawdown
    timestamp: new Date().toISOString()
  };
};

/**
 * Generate smart stop-loss and take-profit levels
 */
export const generateSmartLevels = async (entryPrice, riskLevel = 'MEDIUM') => {
  const priceData = await fetchEMBPrice();
  const currentPrice = priceData.price;
  
  const volatilityMultiplier = {
    LOW: 2,
    MEDIUM: 1.5,
    HIGH: 1
  }[riskLevel];

  const atr = Math.abs(currentPrice - entryPrice) * volatilityMultiplier;
  
  return {
    stopLoss: entryPrice - atr,
    takeProfit: entryPrice + (atr * 1.5), // Risk:Reward ratio of 1:1.5
    timestamp: new Date().toISOString()
  };
};

/**
 * Validate trade parameters against risk management rules
 */
export const validateTradeParameters = async (tradeParams, riskAnalysis) => {
  const errors = [];
  const warnings = [];

  // Check position size
  if (tradeParams.amount > riskAnalysis.suggestedPositionSize * 1.5) {
    errors.push('Position size exceeds recommended risk limit');
  } else if (tradeParams.amount > riskAnalysis.suggestedPositionSize * 1.2) {
    warnings.push('Position size is approaching risk limit');
  }

  // Validate stop-loss
  if (!tradeParams.stopLoss) {
    errors.push('Stop-loss is required for risk management');
  } else {
    const stopLossPercentage = Math.abs(tradeParams.stopLoss - tradeParams.entryPrice) / tradeParams.entryPrice;
    if (stopLossPercentage > riskAnalysis.stopLossPercentage) {
      warnings.push('Stop-loss distance is wider than recommended');
    }
  }

  // Check trade timing
  if (riskAnalysis.riskLevel === 'HIGH' && tradeParams.orderType === 'market') {
    warnings.push('Consider using limit orders in high volatility conditions');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    timestamp: new Date().toISOString()
  };
};

/**
 * Calculate leverage-adjusted risk metrics
 */
export const analyzeLeverageRisk = (leverage, volatility, accountValue) => {
  const leveragedVolatility = volatility * leverage;
  const maxLoss = accountValue * leverage;
  
  // Recommended stop-loss gets tighter with higher leverage
  const stopLossPercentage = Math.max(2, 10 / leverage);
  
  // Maximum position size decreases with leverage
  const maxPositionSize = accountValue / leverage;
  
  return {
    leveragedVolatility,
    maxPotentialLoss: maxLoss,
    recommendedStopLoss: stopLossPercentage,
    maxPositionSize,
    riskLevel: leveragedVolatility > 0.15 ? 'HIGH' : leveragedVolatility > 0.08 ? 'MEDIUM' : 'LOW'
  };
};

/**
 * Validate leverage trade parameters
 */
export const validateLeverageTrade = (tradeParams, accountValue) => {
  const errors = [];
  const warnings = [];
  const { leverage, amount, marketVolatility } = tradeParams;
  
  // Basic leverage checks
  if (leverage > 20) {
    errors.push('Leverage exceeds maximum allowed (20x)');
  }
  
  // Position size validation
  const leverageRisk = analyzeLeverageRisk(leverage, marketVolatility, accountValue);
  if (amount > leverageRisk.maxPositionSize) {
    errors.push(`Position size too large for ${leverage}x leverage. Maximum: $${leverageRisk.maxPositionSize.toFixed(2)}`);
  }
  
  // Volatility warnings
  if (leverageRisk.leveragedVolatility > 0.15) {
    warnings.push(`High risk: ${leverage}x leverage on ${(marketVolatility * 100).toFixed(1)}% volatile market`);
  }
  
  // Stop-loss validation
  if (!tradeParams.stopLoss) {
    errors.push(`Stop-loss required for leveraged trades. Recommended: ${leverageRisk.recommendedStopLoss}%`);
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    leverageRisk,
    timestamp: new Date().toISOString()
  };
};