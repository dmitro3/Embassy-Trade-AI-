import { NextResponse } from 'next/server';
import { Connection } from '@solana/web3.js';
import EMBAITokenManager from '../../../../lib/embaiToken';

// Mock burn statistics for development (would be stored in a database in production)
const mockBurnStats = {
  totalBurned: 25731.42,
  topBurners: [
    { wallet: "3xJUz4bxRy1oBzFWKcj7CJpKLRGHbJtqEyqQstvKnT9N", amount: 5230.75 },
    { wallet: "7kMcj2PkKJM9zNXVcYmj5MJcZVT6UwGGfLJMnXMpTuqm", amount: 4120.33 },
    { wallet: "GjeNJAHxEDopzBh2hFgvFTHiCYMGsuk3hpSMLv4Gbr4F", amount: 3450.12 },
    { wallet: "4diBGK9LZqKnEDmtvwTxfXqGLQJPJEiG4tPQUXWQUWzJ", amount: 2890.65 },
    { wallet: "DuoxFvyP6a3TmrmL1RwHTPUMwGQwqHZ8bhSXwdTNFKRo", amount: 1945.20 },
    { wallet: "8aHYbTKGx6LbdrDH7pGxYKmPJY9YJrBQfnJqpj8vBcP3", amount: 1782.97 },
    { wallet: "6vZjsVVZNeK6hH9J1TQJKpqEh2rcVGKLnhxGHwmvhTSf", amount: 1230.45 },
    { wallet: "9Ssnw8HDGZCYvH3qSz1MbhyFRDqPr3R5uwGFKhsYVNbT", amount: 980.33 },
    { wallet: "2M8Lf8a12r9SWUhXMXYjJBT3ZQkPf1bPLeJsgNZW4KbC", amount: 876.55 },
    { wallet: "5MS9uUQDZq2CpX1jtEJtP9bYhJ6c5AS8NDnmNopktA7K", amount: 745.90 }
  ],
  recentBurns: [
    { wallet: "3xJUz4bxRy1oBzFWKcj7CJpKLRGHbJtqEyqQstvKnT9N", amount: 230.75, timestamp: Date.now() - 1000 * 60 * 5 }, // 5 minutes ago
    { wallet: "7kMcj2PkKJM9zNXVcYmj5MJcZVT6UwGGfLJMnXMpTuqm", amount: 120.33, timestamp: Date.now() - 1000 * 60 * 15 }, // 15 minutes ago
    { wallet: "GjeNJAHxEDopzBh2hFgvFTHiCYMGsuk3hpSMLv4Gbr4F", amount: 450.12, timestamp: Date.now() - 1000 * 60 * 30 }, // 30 minutes ago
    { wallet: "4diBGK9LZqKnEDmtvwTxfXqGLQJPJEiG4tPQUXWQUWzJ", amount: 90.65, timestamp: Date.now() - 1000 * 60 * 45 }, // 45 minutes ago
    { wallet: "DuoxFvyP6a3TmrmL1RwHTPUMwGQwqHZ8bhSXwdTNFKRo", amount: 145.20, timestamp: Date.now() - 1000 * 60 * 60 }, // 1 hour ago
    { wallet: "8aHYbTKGx6LbdrDH7pGxYKmPJY9YJrBQfnJqpj8vBcP3", amount: 82.97, timestamp: Date.now() - 1000 * 60 * 60 * 2 }, // 2 hours ago
    { wallet: "6vZjsVVZNeK6hH9J1TQJKpqEh2rcVGKLnhxGHwmvhTSf", amount: 130.45, timestamp: Date.now() - 1000 * 60 * 60 * 3 }, // 3 hours ago
    { wallet: "9Ssnw8HDGZCYvH3qSz1MbhyFRDqPr3R5uwGFKhsYVNbT", amount: 80.33, timestamp: Date.now() - 1000 * 60 * 60 * 5 }, // 5 hours ago
    { wallet: "2M8Lf8a12r9SWUhXMXYjJBT3ZQkPf1bPLeJsgNZW4KbC", amount: 76.55, timestamp: Date.now() - 1000 * 60 * 60 * 8 }, // 8 hours ago
    { wallet: "5MS9uUQDZq2CpX1jtEJtP9bYhJ6c5AS8NDnmNopktA7K", amount: 45.90, timestamp: Date.now() - 1000 * 60 * 60 * 12 } // 12 hours ago
  ]
};

/**
 * GET handler for /api/embai/burn-stats
 * Returns statistics about EMBAI token burns
 */
export async function GET() {
  try {
    // Initialize the Solana connection for devnet
    const connection = new Connection(
      process.env.RPC_ENDPOINT || 'https://api.devnet.solana.com', 
      'confirmed'
    );
    
    // Initialize the EMBAI token manager
    const embaiManager = new EMBAITokenManager(connection);
    
    // Get token info (includes burn statistics)
    const tokenInfo = await embaiManager.getTokenInfo();
    
    // In production, we would query a database for burn statistics
    // For development, we'll use mock data combined with the total burned from the token manager
    
    // Use the actual burned amount from token manager, but keep mock data for leaderboard and recent burns
    const burnStats = {
      ...mockBurnStats,
      totalBurned: tokenInfo.statistics?.totalBurned || mockBurnStats.totalBurned
    };
    
    return NextResponse.json({
      success: true,
      totalBurned: burnStats.totalBurned,
      topBurners: burnStats.topBurners,
      recentBurns: burnStats.recentBurns
    });
  } catch (error) {
    console.error('Error fetching burn statistics:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to fetch burn statistics. Please try again later.' 
      },
      { status: 500 }
    );
  }
}