# TradeForce AI Trading System

A fully functional, autonomous trading dApp on Solana that enables professional traders to execute trades on DevNet with real-time data and AI-driven signals.

## Features

- **Web3 Wallet Integration**: Connect Phantom wallet in DevNet mode, displaying SOL balance
- **Live Token Data**: Real-time data for SOL, RAY, JUP, and BONK using Shyft WebSocket and Birdeye API
- **Trade Execution**: Execute buy/sell orders on Solana DevNet using Photon API
- **PnL Log**: Track trade history with entry/exit prices and profit/loss
- **AI Automation**: Three AI agents (Trend, Momentum, Volatility) analyze live data and execute trades with consensus

## Architecture

The TradeForce AI system consists of the following components:

1. **Frontend Dashboard**: React-based UI with real-time updates
2. **Web3 Integration**: Solana wallet connection and transaction handling
3. **Data Services**: Real-time market data from Shyft and Birdeye
4. **AI Trading Engine**: Consensus-based trading signals from multiple AI agents
5. **Trade Execution**: DevNet trade execution via Photon API

## Getting Started

### Prerequisites

- Node.js 16+ and npm
- Phantom Wallet browser extension

### Installation

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Start the development server:
   ```
   npm run dev
   ```
   
   Or use the provided batch file:
   ```
   start-tradeforce-ai.bat
   ```

4. Open your browser and navigate to:
   ```
   http://localhost:3000/tradeforce-ai
   ```

## Usage

1. **Connect Wallet**: Click the "Connect Wallet" button to connect your Phantom wallet in DevNet mode
2. **View Market Data**: Browse the list of available tokens with real-time price and volume data
3. **Check AI Signals**: Select a token to view AI trading signals and consensus
4. **Execute Trades**: When a strong consensus is reached, execute trades with the click of a button
5. **Monitor Performance**: Track your active trades and performance in the Active Trades panel

## API Endpoints

The system provides the following API endpoints:

- `/api/tradeforce/tokens`: Get token data
- `/api/tradeforce/roundTable`: Get AI trading signals
- `/api/mock/tokens`: Mock token data for testing

## Components

- **TradeForceDashboard**: Main dashboard component
- **RoundTableConsensus**: AI trading signals and execution
- **useShyftWebSocket**: Real-time data from Shyft
- **useBirdeyeData**: Market data from Birdeye
- **tokenFetchService**: Token data fetching and caching
- **tradeExecutionService**: Trade execution via Photon
- **roundTableAI**: AI consensus engine
- **technicalIndicators**: Technical analysis indicators

## Technical Details

### Real-time Data

The system uses WebSocket connections to Shyft for real-time token data updates, with fallback to REST API calls. Additional market data is fetched from Birdeye API.

### AI Trading Signals

The RoundTable AI system uses three specialized agents:

1. **Trend Agent**: Analyzes price trends using moving averages
2. **Momentum Agent**: Analyzes momentum using RSI and MACD
3. **Volatility Agent**: Analyzes market volatility and risk metrics

These agents vote on trading decisions, and trades are executed when a strong consensus (70%+) is reached.

### Trade Execution

Trades are executed on Solana DevNet using the Photon API, which provides access to liquidity from various DEXes. Each trade includes:

- Stop-loss at 2% below entry price
- Take-profit at 5% above entry price
- Transaction confirmation on-chain

## Security

- API keys are stored securely and never exposed to the client
- All transactions require explicit user approval via wallet signing
- DevNet-only trading to prevent real financial risk

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Solana Foundation for DevNet infrastructure
- Shyft and Birdeye for market data APIs
- Photon for trade execution
