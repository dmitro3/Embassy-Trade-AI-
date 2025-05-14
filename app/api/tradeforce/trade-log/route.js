'use server';

import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

// File path for storing trades
const TRADES_FILE_PATH = path.join(process.cwd(), 'data', 'trades.json');

/**
 * Ensure directory exists
 * 
 * @param {string} filePath - Path to the file
 */
async function ensureDirectoryExists(filePath) {
  try {
    const dirname = path.dirname(filePath);
    await fs.mkdir(dirname, { recursive: true });
  } catch (error) {
    console.error('Error ensuring directory exists:', error);
  }
}

/**
 * Read trades from file
 * 
 * @returns {Promise<Array>} - Trades array
 */
async function readTrades() {
  try {
    await ensureDirectoryExists(TRADES_FILE_PATH);
    
    const data = await fs.readFile(TRADES_FILE_PATH, 'utf-8').catch(() => '[]');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading trades:', error);
    return [];
  }
}

/**
 * Write trades to file
 * 
 * @param {Array} trades - Trades array
 */
async function writeTrades(trades) {
  try {
    await ensureDirectoryExists(TRADES_FILE_PATH);
    await fs.writeFile(TRADES_FILE_PATH, JSON.stringify(trades, null, 2));
  } catch (error) {
    console.error('Error writing trades:', error);
  }
}

/**
 * GET handler for retrieving trades
 */
export async function GET(request) {
  try {
    const trades = await readTrades();
    
    return NextResponse.json({ 
      success: true, 
      trades 
    });
  } catch (error) {
    console.error('Error getting trades:', error);
    
    return NextResponse.json(
      { success: false, error: 'Failed to get trades' },
      { status: 500 }
    );
  }
}

/**
 * POST handler for adding new trades
 */
export async function POST(request) {
  try {
    const trade = await request.json();
    
    // Validate trade
    if (!trade || !trade.tokenPair) {
      return NextResponse.json(
        { success: false, error: 'Invalid trade data' },
        { status: 400 }
      );
    }
    
    // Add trade ID if not provided
    if (!trade.id) {
      trade.id = `trade_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    }
    
    // Add timestamp if not provided
    if (!trade.timestamp) {
      trade.timestamp = new Date().toISOString();
    }
    
    // Read existing trades
    const trades = await readTrades();
    
    // Add new trade
    trades.unshift(trade);
    
    // Write updated trades
    await writeTrades(trades);
    
    return NextResponse.json({ 
      success: true, 
      trade 
    });
  } catch (error) {
    console.error('Error adding trade:', error);
    
    return NextResponse.json(
      { success: false, error: 'Failed to add trade' },
      { status: 500 }
    );
  }
}

/**
 * PUT handler for updating trades
 */
export async function PUT(request) {
  try {
    const { id, updates } = await request.json();
    
    // Validate input
    if (!id || !updates) {
      return NextResponse.json(
        { success: false, error: 'Invalid update data' },
        { status: 400 }
      );
    }
    
    // Read existing trades
    const trades = await readTrades();
    
    // Find trade by ID
    const tradeIndex = trades.findIndex(t => t.id === id);
    
    if (tradeIndex === -1) {
      return NextResponse.json(
        { success: false, error: 'Trade not found' },
        { status: 404 }
      );
    }
    
    // Update trade
    trades[tradeIndex] = { ...trades[tradeIndex], ...updates };
    
    // Write updated trades
    await writeTrades(trades);
    
    return NextResponse.json({ 
      success: true, 
      trade: trades[tradeIndex] 
    });
  } catch (error) {
    console.error('Error updating trade:', error);
    
    return NextResponse.json(
      { success: false, error: 'Failed to update trade' },
      { status: 500 }
    );
  }
}

/**
 * DELETE handler for deleting trades
 */
export async function DELETE(request) {
  try {
    const { id } = await request.json();
    
    // Validate input
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Trade ID is required' },
        { status: 400 }
      );
    }
    
    // Read existing trades
    const trades = await readTrades();
    
    // Filter out the trade to delete
    const newTrades = trades.filter(t => t.id !== id);
    
    // Write updated trades
    await writeTrades(newTrades);
    
    return NextResponse.json({ 
      success: true
    });
  } catch (error) {
    console.error('Error deleting trade:', error);
    
    return NextResponse.json(
      { success: false, error: 'Failed to delete trade' },
      { status: 500 }
    );
  }
}
