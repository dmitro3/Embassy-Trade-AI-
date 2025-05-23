import { NextResponse } from 'next/server';
import logger from '../../../../lib/logger';

/**
 * Token API Endpoint
 * 
 * Provides token data for the TradeForce dashboard
 * 
 * @route GET /api/tradeforce/tokens
 */
export async function GET() {
  try {
    // In a real implementation, this would fetch data from a database or external API
    // For now, we'll return mock data
    
    const tokens = [
      {
        symbol: 'SOL',
        name: 'Solana',
        address: 'So11111111111111111111111111111111111111112',
        price: 150.42,
        priceChangePercent24h: 2.5,
        volume24h: 1250000000,
        marketCap: 65000000000,
        isNew: false
      },
      {
        symbol: 'RAY',
        name: 'Raydium',
        address: '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R',
        price: 0.345,
        priceChangePercent24h: -1.2,
        volume24h: 25000000,
        marketCap: 350000000,
        isNew: false
      },
      {
        symbol: 'JUP',
        name: 'Jupiter',
        address: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN',
        price: 1.23,
        priceChangePercent24h: 5.7,
        volume24h: 75000000,
        marketCap: 1200000000,
        isNew: false
      },
      {
        symbol: 'BONK',
        name: 'Bonk',
        address: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
        price: 0.00002,
        priceChangePercent24h: 12.3,
        volume24h: 45000000,
        marketCap: 750000000,
        isNew: true
      }
    ];
    
    return NextResponse.json({
      success: true,
      tokens,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error(`Error in tokens API: ${error.message}`);
    
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * Token API Endpoint - POST method
 * 
 * Allows for filtering and sorting tokens
 * 
 * @route POST /api/tradeforce/tokens
 * @body { filter?: object, sort?: object }
 */
export async function POST(request) {
  try {
    // Parse request body
    const body = await request.json();
    const { filter = {}, sort = {} } = body;
    
    // In a real implementation, this would fetch and filter data from a database or external API
    // For now, we'll return mock data
    
    const tokens = [
      {
        symbol: 'SOL',
        name: 'Solana',
        address: 'So11111111111111111111111111111111111111112',
        price: 150.42,
        priceChangePercent24h: 2.5,
        volume24h: 1250000000,
        marketCap: 65000000000,
        isNew: false
      },
      {
        symbol: 'RAY',
        name: 'Raydium',
        address: '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R',
        price: 0.345,
        priceChangePercent24h: -1.2,
        volume24h: 25000000,
        marketCap: 350000000,
        isNew: false
      },
      {
        symbol: 'JUP',
        name: 'Jupiter',
        address: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN',
        price: 1.23,
        priceChangePercent24h: 5.7,
        volume24h: 75000000,
        marketCap: 1200000000,
        isNew: false
      },
      {
        symbol: 'BONK',
        name: 'Bonk',
        address: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
        price: 0.00002,
        priceChangePercent24h: 12.3,
        volume24h: 45000000,
        marketCap: 750000000,
        isNew: true
      }
    ];
    
    // Apply simple filtering if provided
    let filteredTokens = tokens;
    if (filter.symbol) {
      filteredTokens = filteredTokens.filter(token => 
        token.symbol.toLowerCase().includes(filter.symbol.toLowerCase())
      );
    }
    
    if (filter.minPrice !== undefined) {
      filteredTokens = filteredTokens.filter(token => token.price >= filter.minPrice);
    }
    
    if (filter.maxPrice !== undefined) {
      filteredTokens = filteredTokens.filter(token => token.price <= filter.maxPrice);
    }
    
    // Apply simple sorting if provided
    if (sort.field && sort.direction) {
      filteredTokens.sort((a, b) => {
        if (sort.direction === 'asc') {
          return a[sort.field] > b[sort.field] ? 1 : -1;
        } else {
          return a[sort.field] < b[sort.field] ? 1 : -1;
        }
      });
    }
    
    return NextResponse.json({
      success: true,
      tokens: filteredTokens,
      timestamp: new Date().toISOString(),
      filter,
      sort
    });
  } catch (error) {
    logger.error(`Error in tokens API (POST): ${error.message}`);
    
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
