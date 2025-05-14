/**
 * DexScreener API Integration Test
 * 
 * This test verifies the integration with DexScreener API
 * and tests fallback mechanisms.
 */

import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { fetchTokenDataFromDexScreener, fetchPairsFromDexScreener } from '../../lib/dexScreenerApi';

// Create a mock for axios
const mock = new MockAdapter(axios);

describe('DexScreener API Integration', () => {
  beforeEach(() => {
    // Reset mock before each test
    mock.reset();
    
    // Clear cache between tests
    jest.clearAllMocks();
  });
  
  test('should successfully fetch token data from primary endpoint', async () => {
    // Setup mock response for direct API
    const mockResponse = {
      pairs: [
        {
          chainId: 'solana',
          dexId: 'raydium',
          baseToken: {
            address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
            name: 'USD Coin',
            symbol: 'USDC'
          },
          quoteToken: {
            address: 'So11111111111111111111111111111111111111112',
            name: 'Wrapped SOL',
            symbol: 'SOL'
          },
          priceNative: '0.04586',
          priceUsd: '0.04586',
          txns: {
            h24: { buys: 86, sells: 73 }
          }
        }
      ]
    };
    
    // Mock the direct API endpoint
    mock.onGet('https://api.dexscreener.com/latest/dex/search')
      .reply(200, mockResponse);
    
    // Call the function
    const result = await fetchTokenDataFromDexScreener('SOL');
    
    // Verify response
    expect(result).toEqual(mockResponse);
    expect(mock.history.get.length).toBe(1);
    expect(mock.history.get[0].url).toContain('dexscreener.com');
  });
  
  test('should fallback to MCP server when primary endpoint fails', async () => {
    // Mock response from the direct API (failure)
    mock.onGet('https://api.dexscreener.com/latest/dex/search')
      .reply(429, { error: 'Too many requests' });
    
    // Mock response from MCP server (success)
    const mockMcpResponse = {
      pairs: [
        {
          chainId: 'solana',
          dexId: 'raydium',
          baseToken: { symbol: 'USDC' },
          quoteToken: { symbol: 'SOL' },
          priceUsd: '0.04586'
        }
      ]
    };
    
    mock.onGet('http://localhost:3008/api/dexscreener-mcp/search')
      .reply(200, mockMcpResponse);
    
    // Call the function
    const result = await fetchTokenDataFromDexScreener('SOL');
    
    // Verify fallback worked
    expect(result).toEqual(mockMcpResponse);
    expect(mock.history.get.length).toBe(2);
    expect(mock.history.get[1].url).toContain('localhost:3008');
  });
  
  test('should fetch pairs by token address', async () => {
    const tokenAddress = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
    
    // Setup mock response
    const mockResponse = {
      pairs: [
        {
          chainId: 'solana',
          dexId: 'raydium',
          baseToken: { address: tokenAddress },
          quoteToken: { symbol: 'SOL' }
        },
        {
          chainId: 'solana',
          dexId: 'orca',
          baseToken: { address: tokenAddress },
          quoteToken: { symbol: 'BONK' }
        }
      ]
    };
    
    // Mock the endpoint
    mock.onGet(`https://api.dexscreener.com/latest/dex/pairs/solana/${tokenAddress}`)
      .reply(200, mockResponse);
    
    // Call the function
    const result = await fetchPairsFromDexScreener(tokenAddress);
    
    // Verify response
    expect(result).toEqual(mockResponse);
    expect(result.pairs.length).toBe(2);
    expect(mock.history.get.length).toBe(1);
  });
  
  test('should throw error when both primary and fallback endpoints fail', async () => {
    // Mock both endpoints to fail
    mock.onGet('https://api.dexscreener.com/latest/dex/search')
      .reply(500, { error: 'Server error' });
      
    mock.onGet('http://localhost:3008/api/dexscreener-mcp/search')
      .reply(500, { error: 'Proxy error' });
    
    // Call the function and expect it to throw
    await expect(fetchTokenDataFromDexScreener('SOL'))
      .rejects
      .toThrow('Failed to fetch token data');
      
    // Verify both endpoints were tried
    expect(mock.history.get.length).toBe(2);
  });
  
  test('should respect rate limits', async () => {
    // Setup mock for multiple calls
    const mockResponse = { pairs: [{ chainId: 'solana' }] };
    mock.onGet('https://api.dexscreener.com/latest/dex/search')
      .reply(200, mockResponse);
    
    // Make multiple calls in rapid succession
    const promises = [];
    for (let i = 0; i < 5; i++) {
      promises.push(fetchTokenDataFromDexScreener('SOL'));
    }
    
    // Wait for all promises to resolve
    await Promise.all(promises);
    
    // Verify headers show rate limiting in action
    const requests = mock.history.get.filter(req => 
      req.url.includes('dexscreener.com')
    );
    
    // Expect proper headers for rate limiting
    requests.forEach(req => {
      expect(req.headers).toBeDefined();
      expect(req.headers['User-Agent']).toBeDefined();
    });
    
    // Expect proper number of requests
    expect(requests.length).toBe(5);
  });
});
