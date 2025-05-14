# DEXScreener MCP Server

## Overview

The DEXScreener MCP Server is a Model Context Protocol (MCP) server that provides real-time data and analysis from DEXScreener for the TradeForce AI Trading System. This server focuses on trending tokens, volume analysis, and technical pattern recognition (cup and handle, bull flag) on Solana DEXs.

## Features

- **Trending Token Discovery**: Fetch trending tokens from Solana DEXs with volume metrics
- **Technical Pattern Recognition**: Analyze tokens for bullish patterns (cup and handle, bull flag)
- **Token Details**: Get comprehensive token information from multiple sources
- **Real-time Data**: Fetch and cache data with automatic refreshing
- **MongoDB Integration**: Secure API key storage and retrieval

## Tools

The server provides the following tools:

### 1. `get_trending_tokens`

Retrieves trending tokens from DEXScreener with filtering options.

**Parameters:**
- `limit` (optional): Maximum number of tokens to return (default: 50)
- `minVolume` (optional): Minimum 24h volume in USD (default: 1000)
- `minVolumeChange` (optional): Minimum 24h volume change percentage (default: 0)

**Returns:**
- Array of token objects with price, volume, and other metrics

### 2. `analyze_token_patterns`

Analyzes a token for bullish technical patterns on specified timeframes.

**Parameters:**
- `tokenAddress`: Solana token address to analyze
- `timeframes` (optional): Array of timeframes to analyze (default: ['5m', '15m'])

**Returns:**
- Analysis results for each timeframe, including detected patterns and confidence scores

### 3. `get_token_details`

Provides detailed information about a specific token.

**Parameters:**
- `tokenAddress`: Solana token address to get details for

**Returns:**
- Comprehensive token details including price, volume, social links, and more

## Resources

The server provides the following resources:

### 1. `trending_tokens`

List of trending tokens on Solana DEXs.

### 2. `bullish_patterns`

Tokens showing bullish patterns (cup and handle, bull flag) with confidence scores.

## Setup

### Prerequisites

- Node.js 16+
- MongoDB Atlas account
- Birdeye API key
- SHYFT API key

### Installation

1. Install dependencies:
   ```
   npm install
   ```

2. Create a `.env` file with the following variables:
   ```
   PORT=3002
   MONGODB_URI=mongodb://localhost:27017/tradeforce
   BIRDEYE_API_KEY=your_birdeye_api_key
   SHYFT_API_KEY=your_shyft_api_key
   ```

3. Start the server:
   ```
   npm start
   ```
   
   Or use the provided batch file:
   ```
   start-server.bat
   ```

## API Endpoints

### Configuration

- `GET /mcp-config`: Get MCP server configuration

### Token Data

- `GET /trending-tokens`: Get trending tokens with optional filtering
- `GET /analyze-patterns/:tokenAddress`: Analyze token for bullish patterns
- `GET /token/:tokenAddress`: Get detailed token information
- `GET /bullish-tokens`: Get tokens showing bullish patterns

### MCP Tools

- `POST /tools/get_trending_tokens`: Get trending tokens
- `POST /tools/analyze_token_patterns`: Analyze token patterns
- `POST /tools/get_token_details`: Get token details

### MCP Resources

- `GET /resources/trending_tokens`: Get trending tokens resource
- `GET /resources/bullish_patterns`: Get tokens with bullish patterns resource

## Testing

To test the server, run:

```
npm test
```

Or use the provided batch file:

```
test-server.bat
```

## Pattern Recognition

### Cup and Handle Pattern

The Cup and Handle pattern is a bullish continuation pattern that resembles a cup with a handle. The server detects this pattern by:

1. Identifying a rounded bottom (cup)
2. Finding a small pullback after the cup (handle)
3. Looking for a potential breakout above the handle

### Bull Flag Pattern

The Bull Flag pattern is a bullish continuation pattern that shows a strong uptrend (pole) followed by a consolidation period (flag). The server detects this pattern by:

1. Identifying a strong uptrend (pole)
2. Finding a consolidation period with a slight downward or flat slope (flag)
3. Looking for a potential breakout above the flag

## Integration with TradeForce

The DEXScreener MCP Server integrates with the TradeForce AI Trading System through the MCP client. Example usage:

```javascript
// Import the MCP client
const { useMcpTool, accessMcpResource } = require('../../lib/mcpClient');

// Get trending tokens
const tokens = await useMcpTool('dexscreener-mcp', 'get_trending_tokens', { limit: 10 });

// Analyze a token for patterns
const patterns = await useMcpTool('dexscreener-mcp', 'analyze_token_patterns', { 
  tokenAddress: 'So11111111111111111111111111111111111111112',
  timeframes: ['5m', '15m']
});

// Get token details
const tokenDetails = await useMcpTool('dexscreener-mcp', 'get_token_details', {
  tokenAddress: 'So11111111111111111111111111111111111111112'
});

// Access resources
const trendingTokens = await accessMcpResource('dexscreener-mcp', 'trending_tokens');
const bullishPatterns = await accessMcpResource('dexscreener-mcp', 'bullish_patterns');
```

## License

MIT
