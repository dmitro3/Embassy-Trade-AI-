/**
 * TradeForm API Routes
 * Provides data for the TradeForm component
 */

const express = require('express');
const router = express.Router();
const { Connection, clusterApiUrl } = require('@solana/web3.js');
const logger = require('../utils/logger');

// Mock data for development
const mockTradeData = {
  markets: [
    { symbol: 'SOL/USD', price: 138.42, change24h: 2.5, volume: 1250000 },
    { symbol: 'BTC/USD', price: 62150.50, change24h: -0.8, volume: 28500000 },
    { symbol: 'ETH/USD', price: 3291.14, change24h: 1.2, volume: 15800000 },
  ],
  recommendations: [
    {
      type: 'buy',
      asset: 'SOL',
      price: 138.42,
      confidence: 0.85,
      reason: 'Strong momentum with increasing volume',
      stopLoss: 132.50,
      takeProfit: 150.00
    },
    {
      type: 'sell',
      asset: 'BTC',
      price: 62150.50,
      confidence: 0.72,
      reason: 'Overbought on daily timeframe',
      stopLoss: 64000.00,
      takeProfit: 58000.00
    }
  ],
  userStats: {
    totalTrades: 24,
    winRate: 68.5,
    avgProfit: 12.3,
    balance: 1250.75
  },
  timestamp: new Date().toISOString()
};

/**
 * GET /api/tradeform-data
 * Returns trade form data for the frontend
 */
router.get('/tradeform-data', async (req, res) => {
  try {
    logger.info('TradeForm data requested');
    
    // In a real implementation, this would fetch live data from various sources
    // For now, we'll return mock data with a slight delay to simulate API latency
    
    // Add a small delay to simulate network latency
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // Add a timestamp to the mock data
    const responseData = {
      ...mockTradeData,
      timestamp: new Date().toISOString()
    };
    
    // Log the response for debugging
    logger.info(`Returning TradeForm data: ${JSON.stringify(responseData)}`);
    
    res.json(responseData);
  } catch (error) {
    logger.error(`Error fetching TradeForm data: ${error.message}`);
    res.status(500).json({ error: 'Failed to fetch trade data' });
  }
});

/**
 * POST /api/tradeform-data/execute
 * Executes a trade based on the provided parameters
 */
router.post('/tradeform-data/execute', async (req, res) => {
  try {
    const { asset, type, amount, price } = req.body;
    
    if (!asset || !type || !amount) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }
    
    logger.info(`Trade execution requested: ${JSON.stringify(req.body)}`);
    
    // In a real implementation, this would execute a trade via Photon or another service
    // For now, we'll simulate a successful trade
    
    // Add a delay to simulate trade execution
    await new Promise(resolve => setTimeout(resolve, 1200));
    
    // Generate a mock trade result
    const tradeResult = {
      success: true,
      tradeId: `trade_${Date.now()}`,
      asset,
      type,
      amount,
      executedPrice: price || mockTradeData.markets.find(m => m.symbol.includes(asset))?.price || 100,
      timestamp: new Date().toISOString(),
      fee: (amount * 0.001).toFixed(4), // 0.1% fee
      status: 'executed'
    };
    
    logger.info(`Trade executed: ${JSON.stringify(tradeResult)}`);
    
    res.json(tradeResult);
  } catch (error) {
    logger.error(`Error executing trade: ${error.message}`);
    res.status(500).json({ error: 'Failed to execute trade' });
  }
});

module.exports = router;
