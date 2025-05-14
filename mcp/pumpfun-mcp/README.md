# Pump.fun MCP Server

A Model Context Protocol (MCP) server for monitoring Pump.fun token launches and identifying sniping opportunities on Solana.

## Overview

The Pump.fun MCP Server provides tools and resources for the TradeForce AI Trading System to monitor new token launches on Pump.fun, analyze token risks, and identify sniping opportunities. It integrates directly with the Pump.fun API to fetch new token launches and metadata, and uses SHYFT and Birdeye APIs for additional data and risk assessment.

## Features

- **Real-time Token Launch Monitoring**: Polls the Pump.fun API for new token launches
- **Token Metadata Retrieval**: Fetches detailed token metadata from Pump.fun
- **Risk Assessment**: Analyzes tokens for various risk factors (liquidity, holder concentration, contract risk, market volatility)
- **Sniping Opportunities**: Identifies potential sniping opportunities based on risk assessment
- **Token Monitoring**: Monitors tokens for price changes and alerts
- **MCP Compliance**: Provides MCP-compliant tools and resources for integration with TradeForce AI

## MCP Tools

The server provides the following MCP tools:

1. **get_new_launches**: Retrieves recent token launches with filtering options
2. **analyze_token**: Performs detailed risk and opportunity analysis on specific tokens
3. **get_sniping_opportunities**: Identifies current sniping opportunities based on configurable criteria
4. **monitor_token**: Adds tokens to a monitoring list with price change alerts

## MCP Resources

The server provides the following MCP resources:

1. **monitored_tokens**: List of tokens currently being monitored
2. **launch_statistics**: Statistics about recent token launches

## Prerequisites

- Node.js (v16 or higher)
- npm (v7 or higher)
- Access to Pump.fun API

## Installation

1. Clone the repository or copy the files to your local machine
2. Navigate to the `mcp/pumpfun-mcp` directory
3. Install dependencies:

```bash
npm install
```

4. Create a `.env` file with the following environment variables:

```
# API Keys
SHYFT_API_KEY=your_shyft_api_key
BIRDEYE_API_KEY=your_birdeye_api_key
PHOTON_API_KEY=your_photon_api_key

# Server Configuration
PORT=3001
LOG_LEVEL=info
TRADEFORCE_API_ENDPOINT=http://localhost:3000/api

# Risk Assessment Configuration
MIN_LIQUIDITY_THRESHOLD=5000
MIN_HOLDERS_THRESHOLD=10
MAX_RISK_SCORE_FOR_AUTO_SNIPE=0.7

# Polling Configuration
POLLING_INTERVAL=60000
```

## Usage

### Starting the Server

Run the following command to start the server:

```bash
npm start
```

Or use the provided batch file:

```bash
start-server.bat
```

### Testing the Server

Run the following command to test the server:

```bash
npm test
```

Or use the provided batch file:

```bash
test-server.bat
```

### Integration Example

An integration example is provided in `integration-example.js`. You can run it using:

```bash
node integration-example.js
```

Or use the provided batch file:

```bash
test-integration.bat
```

## API Endpoints

### MCP Configuration

```
GET /mcp-config
```

Returns the MCP configuration with available tools and resources.

### Health Check

```
GET /health
```

Returns the health status of the server.

### Tools

#### Get New Launches

```
POST /tools/get_new_launches
```

Parameters:
- `limit` (optional): Maximum number of launches to return (default: 10)
- `minLiquidity` (optional): Minimum liquidity in USD (default: 5000)

#### Analyze Token

```
POST /tools/analyze_token
```

Parameters:
- `tokenAddress` (required): Solana token address
- `detailed` (optional): Whether to return detailed analysis (default: false)

#### Get Sniping Opportunities

```
POST /tools/get_sniping_opportunities
```

Parameters:
- `minConfidence` (optional): Minimum confidence score (0-1) (default: 0.7)
- `maxResults` (optional): Maximum number of results to return (default: 5)

#### Monitor Token

```
POST /tools/monitor_token
```

Parameters:
- `tokenAddress` (required): Solana token address
- `alertThreshold` (optional): Price change threshold for alerts (percentage) (default: 10)

### Resources

#### Monitored Tokens

```
GET /resources/monitored_tokens
```

Returns a list of tokens currently being monitored.

#### Launch Statistics

```
GET /resources/launch_statistics
```

Returns statistics about recent token launches.

## Integration with TradeForce AI

The Pump.fun MCP Server is designed to integrate with the TradeForce AI Trading System. It provides tools and resources for token discovery, risk assessment, and sniping opportunities.

### Key Components

- **pumpfun-connector.js**: Handles direct communication with the Pump.fun API for fetching new token launches and metadata
- **risk-assessment.js**: Analyzes tokens for various risk factors and provides a risk score
- **index.js**: Main server file that provides MCP-compliant tools and resources

To integrate with TradeForce AI, add the server to the MCP configuration:

```json
{
  "servers": [
    {
      "name": "pumpfun-mcp",
      "url": "http://localhost:3001",
      "description": "Pump.fun MCP Server for token launches and sniping opportunities"
    }
  ]
}
```

## License

MIT
