# Consensus Prediction MCP Server

A Model Context Protocol (MCP) server for generating consensus-based token price predictions using multiple AI models. This service leverages OpenAI's advanced language models and Birdeye's market data to provide reliable trading signals for cryptocurrency tokens.

## Key Features

- **Multi-Model Consensus**: Generates predictions using multiple AI models and aggregates them into a consensus forecast
- **Technical Analysis**: Analyzes tokens using various technical indicators and market data
- **Model Confidence Weighting**: Weights predictions based on confidence levels for more reliable results
- **Token Search**: Searches for tokens by name or symbol
- **Enhanced Error Handling**: Implements robust error handling with circuit breaker pattern, retry logic, and detailed error reporting
- **Performance Optimized**: Includes caching, response time optimization, and efficient resource usage
- **Comprehensive Testing**: Complete test suite including unit, integration, and performance tests
- **Swagger Documentation**: Provides interactive API documentation
- **MCP Integration**: Supports the Model Context Protocol for seamless AI agent integration

## Prerequisites

- Node.js (v18 or higher)
- OpenAI API key(s)
- Birdeye API key

## Installation

1. Clone the repository
2. Install dependencies:

```bash
cd consensus-prediction-mcp
npm install
```

3. Create a `.env` file based on `.env.example`:

```bash
cp .env.example .env
```

4. Add your API keys to the `.env` file:

```
OPENAI_API_KEYS=your-openai-api-key-1,your-openai-api-key-2
BIRDEYE_API_KEY=your-birdeye-api-key
```

## Running the Server

Start the server with:

```bash
npm start
```

For development with automatic restart:

```bash
npm run dev
```

## Testing

The project includes a comprehensive test suite:

```bash
# Run all tests
npm test

# Run only unit tests
npm run test:unit

# Run only integration tests
npm run test:integration

# Run tests with coverage
npm run test:coverage
```

## Resilience Features

### Circuit Breaker Pattern

The server implements the circuit breaker pattern to prevent cascading failures when external services are unavailable:

- **Automatic Detection**: Detects when external services are failing
- **Fail Fast**: Quickly rejects requests to failing services
- **Self Healing**: Automatically tests service recovery after a timeout period
- **Detailed Monitoring**: Provides status information on all external service connections

### Retry Logic

Implements intelligent retry logic for transient failures:

- **Exponential Backoff**: Increases delay between retry attempts
- **Jitter**: Adds randomness to retry delays to prevent thundering herd problems
- **Selective Retries**: Only retries idempotent operations and appropriate error codes

### Caching

Implements smart caching to improve performance and reduce external API calls:

- **Configurable TTL**: Set different cache durations for different types of data
- **Cache Statistics**: Monitor cache hit rates and performance
- **Automatic Invalidation**: Cache entries expire after their TTL

For development with auto-reload:

```bash
npm run dev
```

The server will start on port 3123 (or the port specified in your `.env` file).

## API Endpoints

The server exposes the following RESTful API endpoints:

### Prediction

- `POST /api/predict`: Generate a consensus prediction for a token
  - Parameters:
    - `tokenAddress` (required): Token address to predict
    - `timeframe` (optional, default: '1D'): Timeframe for prediction (1H, 4H, 1D, 1W)

### Analysis

- `POST /api/analyze`: Analyze a token using technical indicators
  - Parameters:
    - `tokenAddress` (required): Token address to analyze

### Search

- `GET /api/search`: Search for tokens by name or symbol
  - Parameters:
    - `query` (required): Search query
    - `limit` (optional, default: 10): Maximum number of results

### System

- `GET /api/status`: Get server status
- `GET /api/health`: Health check endpoint
- `GET /api/mcp/endpoints`: Get available MCP endpoints
- `GET /mcp-config`: Get MCP server configuration

## MCP Tools

The server provides the following MCP tools:

1. `generatePrediction`: Generate a consensus price prediction for a token
2. `analyzeToken`: Analyze a token using technical indicators
3. `searchTokens`: Search for tokens by name or symbol

Example tool usage:

```javascript
const result = await client.useTool({
  serverName: 'consensus-prediction-mcp',
  toolName: 'generatePrediction',
  arguments: {
    tokenAddress: 'So11111111111111111111111111111111111111112',
    timeframe: '1D'
  }
});
```

## Integration Example

See [integration-example.js](./integration-example.js) for a complete example of how to use the MCP server in your application.

## Testing

Run the server and test the integration with:

```bash
npm test
```

## Extending the Server

You can extend the server with additional models or connectors for other data sources:

1. Add new connectors in the `connectors/` directory
2. Modify the `consensusPrediction.js` file to use the new connectors
3. Update the routes in `predictionRoutes.js` to expose new functionality

## Architecture

- **index.js**: Main entry point that sets up the Express server and middleware
- **skills/consensusPrediction.js**: Core prediction service that communicates with AI models
- **connectors/**: Data source connectors (Birdeye, etc.)
- **routes/**: API route handlers
- **utils/**: Utility functions for logging, HTTP requests, etc.

## Logging

Logs are stored in the `logs/` directory, with daily rotation:

- `combined-%DATE%.log`: All logs
- `error-%DATE%.log`: Error logs only

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
