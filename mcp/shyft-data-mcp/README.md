# SHYFT Data Normalization MCP Server

This MCP (Model Context Protocol) server provides normalized data from the SHYFT API for the TradeForce AI trading system. It includes caching, error handling, and retry mechanisms to ensure reliable data access.

## Features

- **Data Normalization**: Standardizes data from SHYFT API into consistent formats
- **Caching**: Implements intelligent caching to reduce API calls and improve performance
- **Error Handling**: Robust error handling with detailed logging
- **Retry Logic**: Exponential backoff retry mechanism for API calls
- **MCP Protocol**: Fully compliant with the Model Context Protocol

## Tools

The server provides the following MCP tools:

1. **get_token_metadata**: Get detailed metadata for a token
2. **get_token_price**: Get current price information for a token
3. **get_token_holders**: Get information about token holders
4. **get_token_transactions**: Get recent transactions for a token
5. **get_token_historical_prices**: Get historical price data for a token
6. **get_token_market_data**: Get comprehensive market data for a token
7. **get_multiple_tokens_market_data**: Get market data for multiple tokens
8. **get_token_portfolio**: Get token portfolio for a wallet address

## Resources

The server provides the following MCP resources:

1. **/health**: Health check endpoint
2. **/token/:address/metadata**: Get token metadata
3. **/token/:address/price**: Get token price
4. **/token/:address/holders**: Get token holders
5. **/token/:address/transactions**: Get token transactions
6. **/token/:address/historical-prices**: Get token historical prices
7. **/token/:address/market-data**: Get token market data
8. **/wallet/:address/portfolio**: Get token portfolio for a wallet

## Installation

1. Install dependencies:
   ```
   npm install
   ```

2. Create a `.env` file with your API keys and configuration (see `.env.example`)

3. Start the server:
   ```
   npm start
   ```
   
   Or use the provided batch file:
   ```
   start-server.bat
   ```

## Testing

Run the test script to verify the server is working correctly:

```
npm test
```

Or use the provided batch file:
```
test-server.bat
```

## Integration with TradeForce AI

This MCP server is designed to be used with the TradeForce AI trading system. It provides normalized data that can be used for:

- Token discovery and analysis
- Market data aggregation
- Trading signal generation
- Portfolio management
- Risk assessment

## Configuration

The server can be configured using environment variables in the `.env` file:

- **SHYFT_API_KEY**: Your SHYFT API key
- **BIRDEYE_API_KEY**: Your Birdeye API key (for fallback data)
- **SOLANA_RPC_URL**: Solana RPC URL
- **SOLANA_NETWORK**: Solana network (mainnet-beta or devnet)
- **PORT**: Server port
- **LOG_LEVEL**: Logging level (debug, info, warn, error)
- **CACHE_TTL_***: Cache TTL settings for different data types

## Example Usage

### Using MCP Tools

```javascript
// Example of using the get_token_metadata tool
const result = await window.useMcpTool(
  'github.com/tradeforce/shyft-data-mcp',
  'get_token_metadata',
  {
    tokenAddress: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' // USDC
  }
);

console.log(result.data);
```

### Using MCP Resources

```javascript
// Example of accessing the token metadata resource
const result = await window.accessMcpResource(
  'github.com/tradeforce/shyft-data-mcp',
  '/token/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/metadata'
);

console.log(result.data);
```

## Error Handling

The server implements robust error handling:

- API errors are retried with exponential backoff
- Detailed error logging
- Graceful degradation when services are unavailable
- Cache fallback for previously fetched data

## Performance Considerations

- Use the `get_multiple_tokens_market_data` tool for batch requests
- Consider the cache TTL settings for different data types
- Monitor API rate limits

## License

MIT
