import { NextResponse } from 'next/server';
import logger from '../../../../lib/logger';

/**
 * Mock Token API Endpoint
 * 
 * Provides mock token data as a fallback when the main API is not available
 * 
 * @route GET /api/mock/tokens
 */
export async function GET() {
  try {
    logger.info('Serving mock token data');
    
    // Mock token data with realistic values
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
    
    // Add a slight randomness to prices to simulate market movement
    const randomizedTokens = tokens.map(token => {
      const randomFactor = 1 + (Math.random() * 0.02 - 0.01); // -1% to +1%
      return {
        ...token,
        price: token.price * randomFactor
      };
    });
    
    return NextResponse.json({
      success: true,
      tokens: randomizedTokens,
      timestamp: new Date().toISOString(),
      source: 'mock'
    });
  } catch (error) {
    logger.error(`Error in mock tokens API: ${error.message}`);
    
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * Mock Token API Endpoint - POST method
 * 
 * @route POST /api/mock/tokens
 * @body { filter?: object, sort?: object }
 */
export async function POST(request) {
  try {
    // Parse request body
    const body = await request.json();
    const { filter = {}, sort = {} } = body;
    
    logger.info('Serving mock token data (POST)');
    
    // Mock token data
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
    
    // Add a slight randomness to prices to simulate market movement
    const randomizedTokens = filteredTokens.map(token => {
      const randomFactor = 1 + (Math.random() * 0.02 - 0.01); // -1% to +1%
      return {
        ...token,
        price: token.price * randomFactor
      };
    });
    
    return NextResponse.json({
      success: true,
      tokens: randomizedTokens,
      timestamp: new Date().toISOString(),
      source: 'mock',
      filter,
      sort
    });
  } catch (error) {
    logger.error(`Error in mock tokens API (POST): ${error.message}`);
    
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
