// API route to provide mock bot status data for the TradeForce interface
// This serves as a fallback when MCP or other services are unavailable

import { NextResponse } from 'next/server';
// Import logger for proper error handling
const logger = console;

/**
 * GET handler for the mock bot API
 * 
 * @param {Request} request - The incoming request object
 * @returns {NextResponse} - JSON response with mock bot status data
 */
export async function GET(request) {
  try {
    // Generate mock bot status data
    const mockBotStatus = {
      success: true,
      status: 'active',
      logs: generateMockLogs(),
      activeTrades: generateMockActiveTrades(),
      consensus: generateMockConsensus(),
      marketState: {
        trend: 'bullish',
        volatility: 'medium',
        confidence: 0.82
      }
    };
    
    return NextResponse.json(mockBotStatus, { status: 200 });
  } catch (error) {
    logger.error(`Error in mock bot API: ${error.message}`);
    return NextResponse.json(
      { error: 'Failed to fetch bot status' },
      { status: 500 }
    );
  }
}

/**
 * POST handler for the mock bot API
 * 
 * @param {Request} request - The incoming request object
 * @returns {NextResponse} - JSON response with mock bot control result
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { action } = body;
    
    if (action === 'start') {
      return NextResponse.json({
        success: true,
        message: 'Trading bot started',
        status: 'active'
      }, { status: 200 });
    } else if (action === 'stop') {
      return NextResponse.json({
        success: true,
        message: 'Trading bot stopped',
        status: 'inactive'
      }, { status: 200 });
    } else if (action === 'pause') {
      return NextResponse.json({
        success: true,
        message: 'Trading bot paused',
        status: 'paused'
      }, { status: 200 });
    } else if (action === 'resume') {
      return NextResponse.json({
        success: true,
        message: 'Trading bot resumed',
        status: 'active'
      }, { status: 200 });
    } else {
      return NextResponse.json(
        { 
          success: false,
          error: 'Invalid action',
          message: `Action '${action}' is not supported`
        },
        { status: 400 }
      );
    }
  } catch (error) {
    logger.error(`Error in mock bot control API: ${error.message}`);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to control bot',
        message: error.message
      },
      { status: 500 }
    );
  }
}

/**
 * Generate mock bot logs
 * 
 * @returns {Array} - Array of mock log objects
 */
function generateMockLogs() {
  const now = Date.now();
  
  return [
    {
      timestamp: new Date(now - 15000).toISOString(),
      type: 'system',
      message: 'Bot initialized and running'
    },
    {
      timestamp: new Date(now - 12000).toISOString(),
      type: 'info',
      message: 'Connected to Solana Devnet'
    },
    {
      timestamp: new Date(now - 10000).toISOString(),
      type: 'info',
      message: 'Market scan started'
    },
    {
      timestamp: new Date(now - 8000).toISOString(),
      type: 'success',
      message: 'Found 3 potential trading opportunities'
    },
    {
      timestamp: new Date(now - 5000).toISOString(),
      type: 'info',
      message: 'Analyzing SOL/USD market conditions'
    },
    {
      timestamp: new Date(now - 2000).toISOString(),
      type: 'system',
      message: 'Performing technical analysis on selected tokens'
    },
    {
      timestamp: new Date(now).toISOString(),
      type: 'info',
      message: 'Waiting for next scheduled scan'
    }
  ];
}

/**
 * Generate mock active trades with simulated live market data
 * Each time this function is called, it generates slightly different prices
 * to simulate market movement, creating a more realistic live data experience
 * 
 * @returns {Array} - Array of mock active trades with realistic price movements
 */
function generateMockActiveTrades() {
  // Get stored trades or initialize with defaults
  let storedTrades;
  
  try {
    // In a real implementation, this might come from a database or cache
    // For our mock implementation, we'll just simulate market movements
    storedTrades = [
      { 
        id: 'trade-1', 
        token: 'BONK/SOL', 
        entry: 0.00000012, 
        basePrice: 0.00000015,
        lastUpdate: Date.now(),
        size: 0.5, 
        time: '2h 15m',
        volatility: 0.04 // 4% volatility
      },
      { 
        id: 'trade-2', 
        token: 'JUP/SOL', 
        entry: 0.0112, 
        basePrice: 0.0118,
        lastUpdate: Date.now(),
        size: 0.7, 
        time: '45m',
        volatility: 0.02 // 2% volatility
      },
      { 
        id: 'trade-3', 
        token: 'SOL/USDC', 
        entry: 142.75, 
        basePrice: 144.28,
        lastUpdate: Date.now(),
        size: 1.2, 
        time: '3h 10m',
        volatility: 0.015 // 1.5% volatility 
      }
    ];
  } catch (error) {
    logger.error(`Error retrieving stored trades: ${error.message}`);
    // Provide fallback if something goes wrong
    return [
      { 
        id: 'trade-1', 
        token: 'BONK/SOL', 
        entry: 0.00000012, 
        current: 0.00000015, 
        size: 0.5, 
        profit: 25, 
        time: '2h 15m' 
      },
      { 
        id: 'trade-2', 
        token: 'JUP/SOL', 
        entry: 0.0112, 
        current: 0.0118, 
        size: 0.7, 
        profit: 5.3, 
        time: '45m' 
      }
    ];
  }
  
  // Update prices to simulate live market movements
  return storedTrades.map(trade => {
    // Simulate price movement using random walk with volatility factor
    const timeDiff = (Date.now() - trade.lastUpdate) / 1000; // seconds
    const randomFactor = (Math.random() - 0.5) * 2; // -1 to 1
    const priceChange = trade.basePrice * trade.volatility * randomFactor * Math.min(timeDiff / 300, 1);
    const current = trade.basePrice + priceChange;
    
    // Calculate profit percentage
    const profit = ((current - trade.entry) / trade.entry) * 100;
    
    return {
      id: trade.id,
      token: trade.token,
      entry: trade.entry,
      current: current,
      size: trade.size,
      profit: parseFloat(profit.toFixed(2)),
      time: trade.time
    };
  });
}

/**
 * Generate mock RoundTable AI consensus
 * 
 * @returns {Object} - Mock consensus data
 */
function generateMockConsensus() {
  return {
    overall: 0.78,
    shortTerm: 0.65,
    midTerm: 0.82,
    longTerm: 0.88,
    recommendation: 'Buy',
    confidence: 'High',
    timestamp: new Date().toISOString()
  };
}
