# TradeForce AI - Kraken Integration

This directory contains the components for integrating with Kraken's WebSocket API for real-time market data and trading.

## Components

### KrakenWebSocketManager

Manages WebSocket connections to Kraken's API v2. Handles public and private connections, reconnection logic, and subscription management.

```javascript
import { getKrakenWebSocketManager } from './KrakenWebSocketManager.js';

// Get the singleton instance
const webSocketManager = getKrakenWebSocketManager();

// Initialize with API key storage
await webSocketManager.initialize(apiKeyStorage);

// Connect to public WebSocket
await webSocketManager.connectPublic();

// Connect to private WebSocket (requires API key)
await webSocketManager.connectPrivate();

// Subscribe to a channel
const result = await webSocketManager.subscribe('ticker', 'XBT/USD');

// Add a message handler
const handlerId = webSocketManager.addMessageHandler('ticker', (message) => {
  console.log('Received ticker update:', message);
});

// Unsubscribe from a channel
await webSocketManager.unsubscribe(result.subscriptionKey);

// Remove a message handler
webSocketManager.removeMessageHandler(handlerId);

// Disconnect
webSocketManager.disconnect();
```

### KrakenDataNormalizer

Normalizes and caches market data from Kraken's WebSocket API. Transforms raw WebSocket data into a consistent format for use by the AI model and UI.

```javascript
import { getKrakenDataNormalizer } from './KrakenDataNormalizer.js';

// Get the singleton instance
const dataNormalizer = getKrakenDataNormalizer();

// Initialize
await dataNormalizer.initialize();

// Subscribe to ticker updates
await dataNormalizer.subscribeToTicker('XBT/USD');

// Subscribe to order book updates
await dataNormalizer.subscribeToOrderBook('XBT/USD', 10);

// Subscribe to trades updates
await dataNormalizer.subscribeToTrades('XBT/USD');

// Get ticker data
const ticker = dataNormalizer.getTicker('XBT/USD');

// Get order book data
const orderBook = dataNormalizer.getOrderBook('XBT/USD', 10);

// Get trades data
const trades = dataNormalizer.getTrades('XBT/USD', 100);

// Unsubscribe
await dataNormalizer.unsubscribe('ticker:XBT/USD');

// Dispose
dataNormalizer.dispose();
```

### KrakenTradeExecutor

Executes trades via Kraken's WebSocket API. Handles order placement, modification, and cancellation.

```javascript
import { getKrakenTradeExecutor } from './KrakenTradeExecutor.js';

// Get the singleton instance
const tradeExecutor = getKrakenTradeExecutor();

// Initialize with API key storage
await tradeExecutor.initialize(apiKeyStorage);

// Place an order
const orderResult = await tradeExecutor.placeOrder({
  symbol: 'XBT/USD',
  side: 'buy',
  orderType: 'market',
  volume: 0.01
});

// Get order status
const orderStatus = await tradeExecutor.getOrderStatus(orderResult.orderId);

// Edit an order
await tradeExecutor.editOrder(orderResult.orderId, {
  price: 50000
});

// Cancel an order
await tradeExecutor.cancelOrder(orderResult.orderId);

// Cancel all orders
await tradeExecutor.cancelAllOrders();

// Get open orders
const openOrders = await tradeExecutor.getOpenOrders();

// Wait for order to be filled
const filledOrder = await tradeExecutor.waitForOrderFill(orderResult.orderId, 60000);
```

### KrakenAIIntegration

Integrates Kraken market data with the Grok 3 AI model. Processes market data, generates trade signals, and executes trades.

```javascript
import { getKrakenAIIntegration } from './KrakenAIIntegration.js';

// Get the singleton instance
const aiIntegration = getKrakenAIIntegration();

// Initialize with API key storage
await aiIntegration.initialize(apiKeyStorage);

// Watch a symbol for trading signals
await aiIntegration.watchSymbol('XBT/USD');

// Add a signal handler
const handlerId = aiIntegration.addSignalHandler((signal) => {
  console.log('Received trade signal:', signal);
});

// Get the latest trade signal for a symbol
const signal = aiIntegration.getTradeSignal('XBT/USD');

// Get all trade signals
const signals = aiIntegration.getAllTradeSignals();

// Execute a trade based on a signal
await aiIntegration.executeTrade(signal);

// Enable auto-trading for a symbol
await aiIntegration.enableAutoTrading('XBT/USD');

// Update auto-trading settings
await aiIntegration.updateAutoTradingSettings({
  maxPositions: 3,
  maxLossPerTrade: 0.01,
  positionSizing: 0.01
});

// Disable auto-trading for a symbol
await aiIntegration.disableAutoTrading('XBT/USD');

// Get performance metrics
const metrics = aiIntegration.getPerformanceMetrics();

// Unwatch a symbol
await aiIntegration.unwatchSymbol('XBT/USD');

// Remove a signal handler
aiIntegration.removeSignalHandler(handlerId);
```

## Demo

A demo of the Kraken integration is available in the `demo` directory. To run the demo:

1. Open `demo/kraken-integration-demo.html` in a browser
2. The demo will connect to Kraken's WebSocket API and display real-time market data
3. The AI model will generate trade signals based on the market data
4. You can execute trades based on the signals or enable auto-trading

## Security

- API keys are stored securely using the `SecureStorage` class
- All API requests are logged using the `AuditLogger` class
- WebSocket connections use TLS encryption
- Private WebSocket connections require authentication

## Error Handling

All components include robust error handling and reconnection logic:

- WebSocket connections will automatically reconnect if disconnected
- Rate limiting is implemented to prevent API abuse
- Errors are logged and can be handled by the application

## Performance

- Market data is cached to reduce API calls
- WebSocket connections are reused to reduce overhead
- Data is normalized to a consistent format for efficient processing

## Dependencies

- `SecureStorage.js` - For storing API keys
- `AuditLogger.js` - For logging API requests and trades
