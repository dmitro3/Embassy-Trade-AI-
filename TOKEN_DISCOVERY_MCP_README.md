# Token Discovery MCP Integration

This document provides instructions on how to use the Token Discovery MCP integration with the TradeForce AI trading system.

## Overview

The Token Discovery MCP server enhances the TradeForce AI trading system with advanced token discovery and sniping capabilities. It enables the system to identify new token listings, analyze their potential, monitor price movements, and prepare sniping transactions.

## Features

- **New Token Discovery**: Scan for newly listed tokens on Solana DEXs
- **Token Analysis**: Analyze tokens for trading potential with risk scoring
- **Contract Auditing**: Identify potential security risks in token contracts
- **Social Sentiment Analysis**: Gauge community sentiment around tokens
- **Price & Volume Monitoring**: Track price and volume changes with alerts
- **Sniping Transaction Preparation**: Prepare transactions for token sniping

## Installation

1. **Install Dependencies**:
   ```
   cd mcp/token-discovery-mcp
   npm install
   ```

2. **Update MCP Settings**:
   ```
   cd scripts
   node update-mcp-settings.js
   ```
   Or simply run the `update-mcp-settings.bat` script.

## Usage

### Starting the MCP Server

You can start the Token Discovery MCP server using the provided batch file:

```
start-token-discovery-mcp.bat
```

This will:
1. Update the MCP settings to include the Token Discovery MCP server
2. Start the Token Discovery MCP server

### Using the Token Discovery Page

Once the MCP server is running, you can access the Token Discovery page in the TradeForce AI trading system:

1. Navigate to the Token Discovery page using the navigation menu
2. Use the interface to scan for new tokens, analyze tokens, and monitor tokens

### MCP Tools

The Token Discovery MCP server provides the following tools:

#### 1. scan_new_tokens

Scan for new token listings on Solana DEXs.

**Parameters:**
- `timeframe` (string): Timeframe to scan (e.g., "1h", "24h", "7d")
- `minLiquidity` (number): Minimum liquidity in USD
- `limit` (number): Maximum number of tokens to return

**Example:**
```javascript
const result = await window.useMcpTool('github.com/tradeforce/token-discovery-mcp', 'scan_new_tokens', {
  timeframe: '24h',
  minLiquidity: 10000,
  limit: 10
});
```

#### 2. analyze_token

Analyze a token for trading potential.

**Parameters:**
- `tokenAddress` (string): Solana token address to analyze
- `includeContractAudit` (boolean): Whether to include contract audit information
- `includeSocialMetrics` (boolean): Whether to include social media metrics

**Example:**
```javascript
const result = await window.useMcpTool('github.com/tradeforce/token-discovery-mcp', 'analyze_token', {
  tokenAddress: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  includeContractAudit: true,
  includeSocialMetrics: true
});
```

#### 3. monitor_token

Add a token to the monitoring watchlist.

**Parameters:**
- `tokenAddress` (string): Solana token address to monitor
- `alertThresholds` (object): Price and volume thresholds for alerts
  - `priceChangePercent` (number): Price change percentage threshold
  - `volumeChangePercent` (number): Volume change percentage threshold

**Example:**
```javascript
const result = await window.useMcpTool('github.com/tradeforce/token-discovery-mcp', 'monitor_token', {
  tokenAddress: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  alertThresholds: {
    priceChangePercent: 5,
    volumeChangePercent: 100
  }
});
```

#### 4. prepare_snipe

Prepare a token sniping transaction.

**Parameters:**
- `tokenAddress` (string): Solana token address to snipe
- `amount` (number): Amount in SOL to spend
- `maxSlippage` (number): Maximum slippage percentage
- `useFlashbots` (boolean): Whether to use Flashbots for MEV protection

**Example:**
```javascript
const result = await window.useMcpTool('github.com/tradeforce/token-discovery-mcp', 'prepare_snipe', {
  tokenAddress: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  amount: 1.5,
  maxSlippage: 1,
  useFlashbots: true
});
```

### MCP Resources

The Token Discovery MCP server provides the following resources:

#### 1. new_token_listings

List of newly listed tokens on Solana DEXs.

**Example:**
```javascript
const result = await window.accessMcpResource('github.com/tradeforce/token-discovery-mcp', '/resources/new_token_listings');
```

#### 2. watchlist

List of tokens being monitored.

**Example:**
```javascript
const result = await window.accessMcpResource('github.com/tradeforce/token-discovery-mcp', '/resources/watchlist');
```

#### 3. token_analysis

Detailed analysis of a specific token.

**Example:**
```javascript
const result = await window.accessMcpResource('github.com/tradeforce/token-discovery-mcp', `/resources/token_analysis/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`);
```

## Integration Example

See the `mcp/token-discovery-mcp/integration-example.js` file for a complete example of how to integrate the Token Discovery MCP server with the TradeForce AI trading system.

## Testing

You can test the Token Discovery MCP server using the provided test script:

```
cd mcp/token-discovery-mcp
node test-server.js
```

Or simply run the `test-server.bat` script.

## Troubleshooting

If you encounter any issues with the Token Discovery MCP server, check the following:

1. Make sure the MCP server is running
2. Check the MCP settings file to ensure the server is properly configured
3. Check the server logs for any error messages

## License

MIT
