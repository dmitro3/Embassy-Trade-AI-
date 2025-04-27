# TradeForce AI Trading System

## Overview

TradeForce AI is an advanced trading system that integrates multiple data sources, AI-powered analysis, and automated trade execution capabilities. The system is designed to provide traders with comprehensive market data, intelligent trading signals, and seamless execution across different platforms.

## Architecture

The TradeForce AI Trading System follows a modular architecture with several key components:

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Frontend (Next.js/React)                      │
└───────────────────────────────────┬─────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       AXIOM Trade API Interface                      │
└───────────┬───────────────────────┬───────────────────────┬─────────┘
            │                       │                       │
            ▼                       ▼                       ▼
┌───────────────────┐   ┌───────────────────┐   ┌───────────────────┐
│ Market Data       │   │ Trade Execution   │   │ AI Analysis       │
│ Aggregator        │   │ Service           │   │ Service           │
└─────┬──────┬──────┘   └─────────┬─────────┘   └─────────┬─────────┘
      │      │                    │                       │
      │      │                    │                       │
      ▼      ▼                    ▼                       ▼
┌──────┐ ┌──────┐         ┌─────────────┐         ┌─────────────┐
│SHYFT │ │Bird- │         │SwarmNode    │         │Grok 3       │
│API   │ │eye   │         │Service      │         │API          │
└──────┘ └──────┘         └─────────────┘         └─────────────┘
      ▲      ▲                    ▲                       ▲
      │      │                    │                       │
      │      │                    │                       │
┌─────┴──────┴──────┐   ┌─────────┴─────────┐   ┌─────────┴─────────┐
│ AXIOM Scraper     │   │ Broker/Exchange   │   │ External AI       │
│ Service           │   │ APIs              │   │ Services          │
└───────────────────┘   └───────────────────┘   └───────────────────┘
```

### Core Components

1. **AXIOM Trade API Interface** (`axiomTradeAPI.js`)
   - Main interface for frontend applications
   - Provides unified access to all trading functionality
   - Handles initialization of all services

2. **Market Data Aggregator** (`marketDataAggregator.js`)
   - Aggregates data from multiple sources
   - Prioritizes data sources based on reliability and recency
   - Provides fallback mechanisms when primary sources fail
   - Caches data to improve performance

3. **Trade Execution Service** (`tradeExecutionService.js`)
   - Handles trade execution across different platforms
   - Supports multiple execution modes (paper, devnet, mainnet)
   - Implements risk management rules
   - Maintains trade history and active orders

4. **Data Sources**
   - **SHYFT API** (`shyftService.js`) - Solana token data
   - **Birdeye API** (`birdeyeService.js`) - Comprehensive market data
   - **AXIOM Scraper** (`axiomScraper.js`) - Web scraper for AXIOM Markets

5. **AI Integration**
   - **Grok 3 Trading Service** (`Grok3TradingService.js`) - AI-powered market analysis
   - Natural language instruction processing
   - Trade prediction and parameter generation

6. **Execution Backend**
   - **SwarmNode Service** (`swarmNodeService.js`) - Serverless AI agent execution

## Features

- **Multi-source Market Data**: Aggregates data from multiple sources for comprehensive market insights
- **AI-Powered Analysis**: Utilizes Grok 3 AI for market analysis and trade predictions
- **Automated Trading**: Supports automated trading strategies with risk management
- **Multiple Execution Modes**: Paper trading, devnet, and mainnet execution options
- **Natural Language Processing**: Process trading instructions in natural language
- **Secure API Key Management**: Encrypted storage of API keys
- **Fallback Mechanisms**: Graceful degradation when primary services are unavailable

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Python 3.9+ (for Flask server)
- Solana CLI tools (optional, for blockchain interactions)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/tradeforce-ai.git
   cd tradeforce-ai
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   Create a `.env.local` file with the following variables:
   ```
   NEXT_PUBLIC_SHYFT_API_KEY=your_shyft_api_key
   NEXT_PUBLIC_BIRDEYE_API_KEY=your_birdeye_api_key
   NEXT_PUBLIC_GROK_API_KEY=your_grok_api_key
   NEXT_PUBLIC_PHOTON_API_KEY=your_photon_api_key
   NEXT_PUBLIC_SWARMNODE_API_KEY=your_swarmnode_api_key
   API_KEY_ENCRYPTION_KEY=your_32_character_encryption_key
   ```

4. Set up Python environment (for Flask server):
   ```bash
   cd backend
   python -m venv venv
   venv\Scripts\activate  # On Windows
   source venv/bin/activate  # On Unix/macOS
   pip install -r requirements.txt
   ```

### Running the System

1. Start the development servers:
   ```bash
   npm run start-dev
   ```
   This will start:
   - Next.js frontend on port 3008
   - Node.js backend on port 5000
   - WebSocket server on port 3009
   - Flask server on port 5001

2. Open your browser and navigate to:
   ```
   http://localhost:3008/tradeforce
   ```

3. Run the test suite:
   ```bash
   node test-trading-system.js
   ```
   
   Or open the browser-based test:
   ```
   http://localhost:3008/test-trading-system.html
   ```

## Usage Examples

### Market Data Retrieval

```javascript
import { getMarketData } from './lib/axiomTradeAPI';

// Get market data by address
const marketData = await getMarketData('DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263');

// Get market data by symbol
const bonkData = await getMarketData('BONK');
```

### Token Scanning

```javascript
import { scanTokens } from './lib/axiomTradeAPI';

// Define scanning strategies
const strategies = {
  newToken: true,
  highVolume: true,
  bullishMomentum: false,
  whaleTracking: false
};

// Scan for tokens matching criteria
const matchedTokens = await scanTokens(strategies);
```

### Trade Execution

```javascript
import { executeTrade } from './lib/axiomTradeAPI';

// Execute a trade
const tradeResult = await executeTrade({
  connection,
  publicKey,
  signTransaction,
  token: {
    name: 'BONK/SOL',
    address: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
    price: 0.00000012
  },
  amountInSol: 0.5,
  stopLossPercent: 5,
  takeProfitPercent: 15
});
```

### Natural Language Instructions

```javascript
import { processInstruction } from './lib/axiomTradeAPI';

// Process a natural language instruction
const result = await processInstruction('Buy BONK with 0.5 SOL and set a 5% stop loss');
```

## Configuration

### Risk Parameters

You can configure risk management parameters through the Trade Execution Service:

```javascript
import tradeExecutionService from './lib/tradeExecutionService';

// Set risk parameters
tradeExecutionService.setRiskParameters({
  maxPositionSize: 0.1, // 10% of portfolio
  maxLoss: 0.02, // 2% max loss per trade
  maxDailyLoss: 0.05, // 5% max daily loss
  minWinRate: 0.65, // 65% minimum win rate target
  maxSlippage: 0.01 // 1% max slippage
});
```

### Execution Mode

You can switch between paper trading, devnet, and mainnet modes:

```javascript
import tradeExecutionService from './lib/tradeExecutionService';

// Set execution mode
tradeExecutionService.setExecutionMode('paper'); // 'paper', 'devnet', or 'mainnet'
```

## Security Considerations

- API keys are stored with encryption at rest
- Mainnet trades require explicit confirmation
- Risk management rules are enforced at the service level
- Pool validation is performed before executing trades

## Contributing

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add some amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Solana Foundation for blockchain infrastructure
- SHYFT, Birdeye, and AXIOM for market data
- Grok 3 for AI capabilities
