/**
 * API Route: /api/performance/history
 * 
 * This API endpoint provides historical performance data for trading strategies,
 * including metrics like win rate, drawdown, risk-adjusted returns, and profit/loss trends.
 */

import { NextResponse } from 'next/server';
import logger from '../../../../lib/logger';
import tradeExecutionService from '../../../../lib/tradeExecutionService';

/**
 * GET handler for /api/performance/history
 * 
 * @param {Request} request - The request object
 * @returns {Promise<NextResponse>} - The response object
 */
export async function GET(request) {
  try {
    // Get URL parameters
    const { searchParams } = new URL(request.url);
    const timeframe = searchParams.get('timeframe') || '1m';
    
    // Get trade history from the trade execution service
    const trades = await tradeExecutionService.getTradeHistory(timeframe);
    
    // Process trade history to generate performance data
    const { history, metrics } = processTradeHistory(trades);
    
    // Return the performance data
    return NextResponse.json({
      success: true,
      history,
      metrics
    });
  } catch (error) {
    logger.error(`Error in performance history API: ${error.message}`);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

/**
 * Process trade history to generate performance data
 * 
 * @param {Array} trades - Array of trade objects
 * @returns {Object} - Object containing history and metrics
 */
function processTradeHistory(trades) {
  // Initialize metrics
  const metrics = {
    winRate: 0,
    sharpeRatio: 0,
    sortinoRatio: 0,
    maxDrawdown: 0,
    totalTrades: trades.length,
    profitableTrades: 0,
    averageProfit: 0,
    averageLoss: 0,
    profitFactor: 0,
    expectancy: 0
  };
  
  // If no trades, return empty data
  if (trades.length === 0) {
    return { history: [], metrics };
  }
  
  // Group trades by day
  const tradesByDay = groupTradesByDay(trades);
  
  // Calculate daily performance metrics
  const history = calculateDailyPerformance(tradesByDay);
  
  // Calculate overall metrics
  calculateOverallMetrics(trades, history, metrics);
  
  return { history, metrics };
}

/**
 * Group trades by day
 * 
 * @param {Array} trades - Array of trade objects
 * @returns {Object} - Object with dates as keys and arrays of trades as values
 */
function groupTradesByDay(trades) {
  const tradesByDay = {};
  
  trades.forEach(trade => {
    const date = new Date(trade.timestamp);
    const dateString = date.toISOString().split('T')[0];
    
    if (!tradesByDay[dateString]) {
      tradesByDay[dateString] = [];
    }
    
    tradesByDay[dateString].push(trade);
  });
  
  return tradesByDay;
}

/**
 * Calculate daily performance metrics
 * 
 * @param {Object} tradesByDay - Object with dates as keys and arrays of trades as values
 * @returns {Array} - Array of daily performance objects
 */
function calculateDailyPerformance(tradesByDay) {
  const history = [];
  let cumulativePnl = 0;
  let highWaterMark = 0;
  let winRateWindow = [];
  const winRateWindowSize = 10; // Moving average window size
  
  // Sort dates
  const dates = Object.keys(tradesByDay).sort();
  
  dates.forEach(date => {
    const dailyTrades = tradesByDay[date];
    const timestamp = new Date(date).getTime();
    
    // Calculate daily PnL
    let dailyPnl = 0;
    let wins = 0;
    let losses = 0;
    
    dailyTrades.forEach(trade => {
      const pnl = trade.profitLoss || 0;
      dailyPnl += pnl;
      
      if (pnl > 0) {
        wins++;
      } else if (pnl < 0) {
        losses++;
      }
    });
    
    // Update cumulative PnL
    cumulativePnl += dailyPnl;
    
    // Update high water mark
    if (cumulativePnl > highWaterMark) {
      highWaterMark = cumulativePnl;
    }
    
    // Calculate drawdown
    const drawdown = highWaterMark > 0 ? ((highWaterMark - cumulativePnl) / highWaterMark) * 100 : 0;
    
    // Calculate win rate
    const dailyWinRate = dailyTrades.length > 0 ? (wins / dailyTrades.length) * 100 : 0;
    
    // Update win rate window
    winRateWindow.push(dailyWinRate);
    if (winRateWindow.length > winRateWindowSize) {
      winRateWindow.shift();
    }
    
    // Calculate win rate moving average
    const winRateMA = winRateWindow.reduce((sum, rate) => sum + rate, 0) / winRateWindow.length;
    
    // Add daily performance to history
    history.push({
      timestamp,
      date,
      pnl: dailyPnl,
      cumulativePnl,
      drawdown,
      trades: dailyTrades.length,
      wins,
      losses,
      winRate: dailyWinRate,
      winRateMA
    });
  });
  
  return history;
}

/**
 * Calculate overall performance metrics
 * 
 * @param {Array} trades - Array of trade objects
 * @param {Array} history - Array of daily performance objects
 * @param {Object} metrics - Object to store metrics
 */
function calculateOverallMetrics(trades, history, metrics) {
  // Calculate win rate
  const wins = trades.filter(trade => (trade.profitLoss || 0) > 0).length;
  metrics.profitableTrades = wins;
  metrics.winRate = trades.length > 0 ? (wins / trades.length) * 100 : 0;
  
  // Calculate profit and loss metrics
  let totalProfit = 0;
  let totalLoss = 0;
  let profitCount = 0;
  let lossCount = 0;
  
  trades.forEach(trade => {
    const pnl = trade.profitLoss || 0;
    
    if (pnl > 0) {
      totalProfit += pnl;
      profitCount++;
    } else if (pnl < 0) {
      totalLoss += Math.abs(pnl);
      lossCount++;
    }
  });
  
  metrics.averageProfit = profitCount > 0 ? totalProfit / profitCount : 0;
  metrics.averageLoss = lossCount > 0 ? totalLoss / lossCount : 0;
  metrics.profitFactor = totalLoss > 0 ? totalProfit / totalLoss : totalProfit > 0 ? Infinity : 0;
  
  // Calculate expectancy
  metrics.expectancy = trades.length > 0 ? 
    (metrics.winRate / 100 * metrics.averageProfit) - ((100 - metrics.winRate) / 100 * metrics.averageLoss) : 0;
  
  // Calculate max drawdown
  metrics.maxDrawdown = history.reduce((max, day) => Math.max(max, day.drawdown), 0);
  
  // Calculate risk-adjusted returns
  calculateRiskAdjustedReturns(trades, metrics);
}

/**
 * Calculate risk-adjusted returns
 * 
 * @param {Array} trades - Array of trade objects
 * @param {Object} metrics - Object to store metrics
 */
function calculateRiskAdjustedReturns(trades, metrics) {
  // Extract daily returns
  const returns = trades.map(trade => {
    const pnl = trade.profitLoss || 0;
    const value = trade.value || 1; // Avoid division by zero
    return pnl / value * 100; // Return as percentage
  });
  
  // Calculate mean return
  const meanReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
  
  // Calculate standard deviation
  const squaredDiffs = returns.map(r => Math.pow(r - meanReturn, 2));
  const variance = squaredDiffs.reduce((sum, d) => sum + d, 0) / returns.length;
  const stdDev = Math.sqrt(variance);
  
  // Calculate downside deviation (for Sortino ratio)
  const downsideReturns = returns.filter(r => r < 0);
  const downsideSquaredDiffs = downsideReturns.map(r => Math.pow(r, 2));
  const downsideVariance = downsideSquaredDiffs.length > 0 ? 
    downsideSquaredDiffs.reduce((sum, d) => sum + d, 0) / downsideSquaredDiffs.length : 0;
  const downsideDeviation = Math.sqrt(downsideVariance);
  
  // Calculate risk-free rate (assume 0% for simplicity)
  const riskFreeRate = 0;
  
  // Calculate Sharpe ratio
  metrics.sharpeRatio = stdDev > 0 ? (meanReturn - riskFreeRate) / stdDev : 0;
  
  // Calculate Sortino ratio
  metrics.sortinoRatio = downsideDeviation > 0 ? (meanReturn - riskFreeRate) / downsideDeviation : 0;
}
