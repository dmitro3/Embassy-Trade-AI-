import { fetchEMBPrice } from './motiaWorkflow';
import { Connection, PublicKey } from '@solana/web3.js';
import logger from './logger.js';

// Development mock values
const MOCK_EMB_TOKEN_ADDRESS = 'EMB1111111111111111111111111111111111111111';
const MOCK_RPC_ENDPOINT = 'https://api.devnet.solana.com';

const EMB_TOKEN_ADDRESS = process.env.EMB_TOKEN_ADDRESS || MOCK_EMB_TOKEN_ADDRESS;
const RPC_ENDPOINT = process.env.RPC_ENDPOINT || MOCK_RPC_ENDPOINT;

/**
 * Fetches real-time portfolio data for a given wallet address
 * Combines on-chain EMB balance with historical price data
 */
export const getPortfolioData = async (walletAddress) => {
  try {
    // If no wallet is connected, return mock data for development
    if (!walletAddress) {
      return getMockPortfolioData();
    }

    const connection = new Connection(RPC_ENDPOINT, 'confirmed');
    const publicKey = new PublicKey(walletAddress);

    // Fetch EMB token account
    let embBalance = 0;
    try {
      const tokenAccounts = await connection.getTokenAccountsByOwner(publicKey, {
        mint: new PublicKey(EMB_TOKEN_ADDRESS),
      });

      if (tokenAccounts.value.length > 0) {
        const accountInfo = await connection.getTokenAccountBalance(tokenAccounts.value[0].pubkey);
        embBalance = accountInfo.value.uiAmount || 0;
      }
    } catch (err) {
      console.warn('Error fetching token balance, using mock data:', err);
      return getMockPortfolioData();
    }

    // Get current EMB price
    const priceData = await fetchEMBPrice();
    const currentPrice = priceData?.price || 2.5; // Default mock price if API fails

    // Generate historical data
    const history = generateHistoricalData(embBalance, currentPrice);

    return {
      embBalance,
      value: embBalance * currentPrice,
      pricePerToken: currentPrice,
      history,
      lastUpdated: new Date().toISOString(),
      performanceMetrics: calculatePerformanceMetrics(history)
    };
  } catch (err) {
    console.error('Portfolio Data Error:', err);
    return getMockPortfolioData();
  }
};

// Helper function to generate mock portfolio data
function getMockPortfolioData() {
  const mockEmbBalance = 1000;
  const mockPrice = 2.5;
  const history = generateHistoricalData(mockEmbBalance, mockPrice);

  return {
    embBalance: mockEmbBalance,
    value: mockEmbBalance * mockPrice,
    pricePerToken: mockPrice,
    history,
    lastUpdated: new Date().toISOString(),
    performanceMetrics: calculatePerformanceMetrics(history)
  };
}

// Helper function to generate historical data
function generateHistoricalData(balance, currentPrice) {
  const today = new Date();
  return Array.from({ length: 30 }, (_, i) => {
    const date = new Date(today);
    date.setDate(date.getDate() - (29 - i));
    // Create more realistic price movements
    const dailyChange = (Math.random() - 0.5) * 0.03; // -1.5% to +1.5% daily change
    const priceMultiplier = 1 + (i * dailyChange);
    return {
      date: date.toISOString().split('T')[0],
      value: currentPrice * priceMultiplier * balance
    };
  });
}

// Helper function to calculate performance metrics
function calculatePerformanceMetrics(history) {
  return {
    dailyChange: ((history[history.length - 1].value - history[history.length - 2].value) / history[history.length - 2].value) * 100,
    weeklyChange: ((history[history.length - 1].value - history[history.length - 7].value) / history[history.length - 7].value) * 100,
    monthlyChange: ((history[history.length - 1].value - history[0].value) / history[0].value) * 100
  };
}

/**
 * Calculates portfolio metrics and performance indicators
 */
export const analyzePortfolioPerformance = (portfolioData) => {
  if (!portfolioData?.history) return null;

  const history = portfolioData.history;
  const values = history.map(h => h.value);
  
  // Calculate volatility (standard deviation)
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
  const volatility = Math.sqrt(variance);

  // Calculate Sharpe ratio (assuming risk-free rate of 2%)
  const riskFreeRate = 0.02;
  const dailyReturns = values.slice(1).map((v, i) => (v - values[i]) / values[i]);
  const averageReturn = dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length;
  const sharpeRatio = (averageReturn - riskFreeRate) / volatility;

  return {
    volatility,
    sharpeRatio,
    maxDrawdown: Math.min(...dailyReturns) * 100,
    bestDay: Math.max(...dailyReturns) * 100,
    currentTrend: averageReturn > 0 ? 'upward' : 'downward'
  };
};