# DexScreener API Integration Guide

## Overview
The TradeForce AI application integrates with DexScreener's API to retrieve real-time market data for Solana tokens. This document outlines the integration details, available endpoints, and implementation patterns used in the application.

## API Base URL
```
https://api.dexscreener.com/latest
```

## Authentication
DexScreener API currently does not require authentication for basic usage. However, there are rate limits in place:
- 60 requests per minute per IP address
- 2 concurrent requests per IP address

## Endpoints Used

### 1. Token Search
```
GET /dex/search/?q={tokenAddress}
```
Returns information about a specific token by its address.

**Parameters:**
- `q`: Token address or symbol to search for

**Response Example:**
```json
{
  "pairs": [
    {
      "chainId": "solana",
      "dexId": "raydium",
      "url": "https://dexscreener.com/solana/...",
      "pairAddress": "...",
      "baseToken": {
        "address": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
        "name": "USD Coin",
        "symbol": "USDC"
      },
      "quoteToken": {
        "address": "...",
        "name": "Token Name",
        "symbol": "TOKEN"
      },
      "priceNative": "0.04586",
      "priceUsd": "0.04586",
      "txns": {
        "h24": {
          "buys": 86,
          "sells": 73
        },
        "h6": {
          "buys": 33,
          "sells": 21
        },
        "h1": {
          "buys": 10,
          "sells": 7
        }
      },
      "volume": {
        "h24": 124563.53,
        "h6": 45832.12,
        "h1": 12365.27
      },
      "liquidity": {
        "usd": 1456789.23
      },
      "fdv": 4567892.12,
      "pairCreatedAt": 1656782456
    }
  ]
}
```

### 2. Pairs by Token Address
```
GET /dex/pairs/solana/{tokenAddress}
```
Returns all trading pairs for a specific token address.

**Parameters:**
- `tokenAddress`: The token's contract address

**Response Format:**
Same as Token Search but includes all available pairs.

## Implementation Details

### Error Handling Strategy

The application implements a robust error handling strategy for DexScreener API connections:

1. **Primary Connection**: Direct API call to DexScreener
2. **Fallback Connection**: Local MCP (Model Context Protocol) server as proxy
3. **Caching Layer**: In-memory cache with TTL (Time To Live) of 5 minutes
4. **Rate Limiting**: Automatic throttling to stay within API limits

### Code Example: Enhanced API Connection

```javascript
// In ExchangeConnector.js
const fetchTokenData = async (tokenAddress) => {
  // Check cache first
  const cachedData = tokenCache.get(tokenAddress);
  if (cachedData) return cachedData;
  
  let success = false;
  let data = null;
  
  try {
    // Try local MCP server first (as proxy)
    const mpcEndpoint = `http://localhost:3008/api/dexscreener-mcp/pairs/solana/${tokenAddress}`;
    const response = await axios.get(mpcEndpoint, { timeout: 5000 });
    
    if (response.status === 200 && response.data?.pairs?.length > 0) {
      success = true;
      data = response.data;
    }
  } catch (error) {
    logger.warn(`DexScreener MCP proxy failed: ${error.message}`);
  }
  
  // Fallback to direct API if MCP fails
  if (!success) {
    try {
      const directEndpoint = `https://api.dexscreener.com/latest/dex/pairs/solana/${tokenAddress}`;
      const directResponse = await axios.get(directEndpoint, { 
        timeout: 8000,
        headers: {
          'User-Agent': 'TradeForce-AI/1.0.0'
        }
      });
      
      if (directResponse.status === 200 && directResponse.data?.pairs?.length > 0) {
        success = true;
        data = directResponse.data;
      }
    } catch (directError) {
      logger.error(`DexScreener direct API connection failed: ${directError.message}`);
      throw new Error(`Failed to fetch token data: ${directError.message}`);
    }
  }
  
  // Cache successful responses
  if (success && data) {
    tokenCache.set(tokenAddress, data, 300); // Cache for 5 minutes
  }
  
  return data;
};
```

## Rate Limiting Implementation

To avoid exceeding API limits, the application implements a token bucket rate limiter:

```javascript
// Rate limiter for DexScreener API
const dexScreenerRateLimiter = new TokenBucketRateLimiter({
  bucketSize: 60,       // Maximum 60 requests
  refillRate: 1,        // Refill 1 token per second
  refillInterval: 1000  // Check every second
});

// Usage in API calls
async function rateLimitedApiCall(endpoint) {
  await dexScreenerRateLimiter.consume(1);
  return axios.get(endpoint);
}
```

## Best Practices

1. **Always check the cache first** before making API requests
2. **Implement proper error handling** for all API calls
3. **Use the local MCP proxy** when available to reduce direct API dependency
4. **Set reasonable timeouts** (5-8 seconds) for API requests
5. **Implement exponential backoff** for retries
6. **Monitor rate limits** to avoid being throttled

## Monitoring and Logging

All API calls are logged with the following information:
- Endpoint called
- Response status
- Response time
- Error details (if any)

Logs are available in:
- Console during development
- `/logs/api-connections.log` in production
- Automated Error Monitor UI

## Troubleshooting

If you encounter issues with the DexScreener API:

1. Check if the API is operational: `https://status.dexscreener.com`
2. Verify the correct token address format (Solana addresses are base58 encoded)
3. Check the rate limiting status via the Error Monitor
4. Test direct API access via the diagnostics page: `/diagnostics/api-test`

## Future Improvements

1. Implement a shared API rate limiter across multiple instances
2. Add persistent caching with Redis
3. Create a dedicated status dashboard for API health
