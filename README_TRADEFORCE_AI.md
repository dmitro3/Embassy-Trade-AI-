# TradeForce AI

A fully autonomous, high-frequency trading system with machine learning-driven strategies, seamless wallet connectivity, live market data, and a professional user experience on Solana's DevNet.

## Overview

TradeForce AI is a revolutionary trading platform that leverages artificial intelligence to make trading decisions with a target win rate of 65%+. It connects to wallets in one click, scans market data in real-time, uses AI agents to provide trading signals, features live charts and PnL tracking, and integrates with multiple exchanges and DEXs.

## Features

- **Seamless Web3 Connectivity**: One-click wallet integration with Phantom and Solflare
- **Advanced Market Data Integration**: Multi-source data aggregation with sub-500ms latency
- **AI-Driven Trading Intelligence**: Three specialized AI agents with Round Table consensus
- **High-Frequency Trading Execution**: 5-minute trading intervals with automatic risk management
- **Professional User Experience**: TradingView charts, real-time portfolio tracking, and risk adjustment
- **Multi-Platform Control**: Web dashboard, browser extension, and Telegram bot
- **Enterprise-Grade Security**: AES-256 encryption, OAuth 2.0 authentication, and audit logging

## Installation

### Prerequisites

- Node.js 16.x or higher
- Redis 6.x or higher
- MongoDB 5.x or higher
- Solana CLI tools

### Environment Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/your-organization/tradeforce-ai.git
   cd tradeforce-ai
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env.local` file with the following variables:
   ```
   # API Keys
   SHYFT_API_KEY=whv00T87G8Sd8TeK
   BIRDEYE_API_KEY=67f8ce614c594ab2b3efb742f8db69db
   
   # Firebase Configuration
   FIREBASE_API_KEY=your-firebase-api-key
   FIREBASE_AUTH_DOMAIN=your-firebase-auth-domain
   FIREBASE_PROJECT_ID=your-firebase-project-id
   FIREBASE_STORAGE_BUCKET=your-firebase-storage-bucket
   FIREBASE_MESSAGING_SENDER_ID=your-firebase-messaging-sender-id
   FIREBASE_APP_ID=your-firebase-app-id
   
   # MongoDB
   MONGODB_URI=your-mongodb-uri
   
   # Redis
   REDIS_URL=your-redis-url
   
   # Solana Network
   SOLANA_NETWORK=devnet
   
   # Security
   ENCRYPTION_KEY=your-encryption-key
   ```

4. Set up Redis:
   ```bash
   # Start Redis server
   redis-server
   ```

5. Set up MongoDB:
   ```bash
   # Start MongoDB server
   mongod --dbpath /path/to/data/db
   ```

### Development

Start the development server:

```bash
npm run dev
```

The application will be available at http://localhost:3000.

### Production

Build and start the production server:

```bash
npm run build
npm start
```

## Usage

### Web Dashboard

1. Navigate to the web dashboard at http://localhost:3000/tradeforce-ai
2. Connect your wallet using the "Connect Wallet" button
3. Add tokens to your watchlist
4. Select a token to view its chart and get trading recommendations
5. Adjust risk tolerance using the slider (1-5%)
6. Toggle auto-trade for fully automated trading
7. Monitor your portfolio and trade history

### Browser Extension

1. Install the browser extension from the `/extension` directory
2. Click on the TradeForce AI icon in your browser toolbar
3. Connect your wallet
4. View quick trading signals and portfolio summary
5. Execute trades directly from the extension

### Telegram Bot

1. Start a chat with the TradeForce AI bot
2. Use the following commands:
   - `/start`: Initialize the bot and authenticate
   - `/status`: Get current system status and portfolio
   - `/trade`: Execute a trade with parameters
   - `/pnl`: Get profit and loss report
   - `/watchlist`: Manage token watchlist
   - `/settings`: Configure trading parameters
   - `/alerts`: Set up price and signal alerts

## Architecture

TradeForce AI is built with a modular architecture consisting of:

1. **External Services Layer**
   - Shyft API for real-time market data
   - Birdeye API for comprehensive analytics
   - Jupiter Aggregator for trade execution
   - Photon for high-frequency trading
   - Solana DevNet for blockchain transactions

2. **Core System Layer**
   - Data Layer with enhanced WebSockets and caching
   - Trading Intelligence with AI agents and consensus
   - Execution Layer with trade services and risk management

3. **Persistence Layer**
   - MongoDB for trade history and user data
   - Redis for high-speed caching
   - Firebase for authentication and real-time updates

4. **User Interface Layer**
   - Web dashboard with Next.js and React
   - Browser extension for quick access
   - Telegram bot for remote control

## AI Trading System

TradeForce AI uses three specialized AI agents to analyze market data and generate trading signals:

1. **Trend Agent**: Uses 50/200-period moving averages and RSI to identify market trends
2. **Momentum Agent**: Uses MACD and volume spikes to detect momentum shifts
3. **Volatility Agent**: Uses Bollinger Bands and ATR to assess market volatility

These agents work together through a Round Table consensus mechanism, requiring 70% agreement before executing trades. Each agent provides a confidence score and explanation for its decision, making the AI system transparent and explainable.

## Development

### Project Structure

```
tradeforce-ai/
├── app/                    # Next.js pages and routes
│   ├── api/                # API routes
│   ├── tradeforce-ai/      # Main application page
│   └── ...
├── components/             # React components
│   ├── AITradingEngine.js  # AI trading engine component
│   ├── PnLTracking.js      # PnL tracking component
│   └── ...
├── lib/                    # Utility libraries
│   ├── tradeDecisionEngine.js  # Trade decision engine
│   ├── tradeExecutionService.js # Trade execution service
│   └── ...
├── extension/              # Browser extension
├── public/                 # Static assets
├── scripts/                # Utility scripts
├── .env.local              # Environment variables
└── ...
```

### Key Components

- **tradeDecisionEngine.js**: Coordinates AI agents and generates trading signals
- **tradeExecutionService.js**: Executes trades based on signals from the decision engine
- **marketDataAggregator.js**: Collects and normalizes market data from multiple sources
- **enhancedShyftWebSocket.js**: Manages WebSocket connections to Shyft API
- **AITradingEngine.js**: React component for the AI trading engine
- **PnLTracking.js**: React component for PnL tracking and visualization

### Adding New Features

1. Create a new component in the `components/` directory
2. Import and use the component in the appropriate page
3. Add any necessary API routes in the `app/api/` directory
4. Update the documentation to reflect the new feature

## Testing

Run the test suite:

```bash
npm test
```

### Test Coverage

- Unit tests for core components
- Integration tests for API endpoints
- End-to-end tests for user workflows
- Performance tests for latency and throughput

## Security

TradeForce AI implements several security measures:

- AES-256 encryption for API keys
- OAuth 2.0 authentication with Google and Apple
- Client-side transaction signing
- JWT token-based session management
- HTTPS for all API communications
- WebSocket secure (WSS) for real-time data
- Data encryption at rest
- Comprehensive audit logging

## Performance

TradeForce AI is optimized for high performance:

- API response times < 100ms
- WebSocket latency < 50ms
- Trade execution time < 500ms
- UI updates < 200ms

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit your changes: `git commit -am 'Add my feature'`
4. Push to the branch: `git push origin feature/my-feature`
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Disclaimer

TradeForce AI is for educational and demonstration purposes only. It operates on Solana's DevNet and does not use real assets. The system is not financial advice, and all trading carries risk. Use at your own discretion.

## Documentation

For more detailed documentation, see the following files:

- [Implementation Plan](./TRADEFORCE_AI_IMPLEMENTATION_PLAN.md)
- [Technical Specification](./TRADEFORCE_AI_TECHNICAL_SPEC.md)
- [Task Breakdown](./TRADEFORCE_AI_TASK_BREAKDOWN.md)
- [Executive Summary](./TRADEFORCE_AI_EXECUTIVE_SUMMARY.md)

## Contact

For questions or support, please contact the development team at [dev@tradeforce.ai](mailto:dev@tradeforce.ai).
