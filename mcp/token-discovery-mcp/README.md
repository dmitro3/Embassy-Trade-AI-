# Token Discovery MCP Server

This MCP (Model Context Protocol) server provides advanced token discovery and sniping capabilities for the TradeForce AI trading system. It enables the system to identify new token listings, analyze their potential, monitor price movements, and prepare sniping transactions.

## Features

- **New Token Discovery**: Scan for newly listed tokens on Solana DEXs
- **Token Analysis**: Analyze tokens for trading potential with risk scoring
- **Contract Auditing**: Identify potential security risks in token contracts
- **Social Sentiment Analysis**: Gauge community sentiment around tokens
- **Price & Volume Monitoring**: Track price and volume changes with alerts
- **Sniping Transaction Preparation**: Prepare transactions for token sniping

## Tools

The server provides the following MCP tools:

### 1. scan_new_tokens

Scan for new token listings on Solana DEXs.

**Parameters:**
- `timeframe` (string): Timeframe to scan (e.g., "1h", "24h", "7d")
- `minLiquidity` (number): Minimum liquidity in USD
- `limit` (number): Maximum number of tokens to return

**Example:**
```json
{
  "tool": "scan_new_tokens",
  "arguments": {
    "timeframe": "24h",
    "minLiquidity": 10000,
    "limit": 10
  }
}
```

### 2. analyze_token

Analyze a token for trading potential.

**Parameters:**
- `tokenAddress` (string): Solana token address to analyze
- `includeContractAudit` (boolean): Whether to include contract audit information
- `includeSocialMetrics` (boolean): Whether to include social media metrics

**Example:**
```json
{
  "tool": "analyze_token",
  "arguments": {
    "tokenAddress": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    "includeContractAudit": true,
    "includeSocialMetrics": true
  }
}
```

### 3. monitor_token

Add a token to the monitoring watchlist.

**Parameters:**
- `tokenAddress` (string): Solana token address to monitor
- `alertThresholds` (object): Price and volume thresholds for alerts
  - `priceChangePercent` (number): Price change percentage threshold
  - `volumeChangePercent` (number): Volume change percentage threshold

**Example:**
```json
{
  "tool": "monitor_token",
  "arguments": {
    "tokenAddress": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    "alertThresholds": {
      "priceChangePercent": 5,
      "volumeChangePercent": 100
    }
  }
}
```

### 4. prepare_snipe

Prepare a token sniping transaction.

**Parameters:**
- `tokenAddress` (string): Solana token address to snipe
- `amount` (number): Amount in SOL to spend
- `maxSlippage` (number): Maximum slippage percentage
- `useFlashbots` (boolean): Whether to use Flashbots for MEV protection

**Example:**
```json
{
  "tool": "prepare_snipe",
  "arguments": {
    "tokenAddress": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    "amount": 1.5,
    "maxSlippage": 1,
    "useFlashbots": true
  }
}
```

## Resources

The server provides the following MCP resources:

### 1. new_token_listings

List of newly listed tokens on Solana DEXs.

**URI:** `/resources/new_token_listings`

### 2. watchlist

List of tokens being monitored.

**URI:** `/resources/watchlist`

### 3. token_analysis

Detailed analysis of a specific token.

**URI:** `/resources/token_analysis/{tokenAddress}`

## Setup

1. Install dependencies:
   ```
   npm install
   ```

2. Configure environment variables in `.env` file:
   ```
   SOLANA_RPC_URL=https://api.devnet.solana.com
   SHYFT_API_KEY=your_shyft_api_key
   BIRDEYE_API_KEY=your_birdeye_api_key
   PORT=3100
   ```

3. Start the server:
   ```
   npm start
   ```

## Integration with TradeForce AI

This MCP server enhances the TradeForce AI trading system with advanced token discovery and sniping capabilities. To integrate it with the system:

1. Add the server to the MCP settings file:
   ```json
   {
     "mcpServers": {
       "github.com/tradeforce/token-discovery-mcp": {
         "command": "node",
         "args": ["index.js"],
         "cwd": "mcp/token-discovery-mcp",
         "env": {},
         "autoApprove": [],
         "disabled": false
       }
     }
   }
   ```

2. Use the MCP tools in your trading system:
   ```javascript
   const result = await useMcpTool('github.com/tradeforce/token-discovery-mcp', 'scan_new_tokens', {
     timeframe: '24h',
     minLiquidity: 10000,
     limit: 10
   });
   ```

## License

MIT
