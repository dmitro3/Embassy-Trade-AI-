/**
 * Kraken Integration Demo
 * 
 * This file demonstrates how to use the Kraken integration components together.
 * It shows how to initialize the components, subscribe to market data, and execute trades.
 */

import { getKrakenWebSocketManager } from '../lib/KrakenWebSocketManager.js';
import { getKrakenDataNormalizer } from '../lib/KrakenDataNormalizer.js';
import { getKrakenTradeExecutor } from '../lib/KrakenTradeExecutor.js';
import { getKrakenAIIntegration } from '../lib/KrakenAIIntegration.js';
import { ApiKeyStorage } from '../lib/SecureStorage.js';
import { getAuditLogger } from '../lib/AuditLogger.js';

/**
 * Run the Kraken integration demo
 */
async function runKrakenIntegrationDemo() {
  try {
    console.log('Starting Kraken integration demo...');
    
    // Initialize API key storage
    const apiKeyStorage = new ApiKeyStorage();
    await apiKeyStorage.initialize();
    
    // Initialize audit logger
    const auditLogger = getAuditLogger();
    
    // Initialize WebSocket manager
    console.log('Initializing WebSocket manager...');
    const webSocketManager = getKrakenWebSocketManager();
    await webSocketManager.initialize(apiKeyStorage);
    
    // Initialize data normalizer
    console.log('Initializing data normalizer...');
    const dataNormalizer = getKrakenDataNormalizer();
    await dataNormalizer.initialize();
    
    // Initialize trade executor
    console.log('Initializing trade executor...');
    const tradeExecutor = getKrakenTradeExecutor();
    await tradeExecutor.initialize(apiKeyStorage);
    
    // Initialize AI integration
    console.log('Initializing AI integration...');
    const aiIntegration = getKrakenAIIntegration();
    await aiIntegration.initialize(apiKeyStorage);
    
    // Subscribe to market data
    console.log('Subscribing to market data...');
    const symbol = 'XBT/USD';
    await aiIntegration.watchSymbol(symbol);
    
    // Add signal handler
    console.log('Adding signal handler...');
    const handlerId = aiIntegration.addSignalHandler((signal) => {
      console.log('Received trade signal:', signal);
      
      // Log signal to UI
      document.getElementById('signals').innerHTML += `
        <div class="signal ${signal.side}">
          <h3>${signal.side.toUpperCase()} ${signal.symbol} at ${signal.price}</h3>
          <p>Strategy: ${signal.strategy}</p>
          <p>Confidence: ${signal.confidence.toFixed(2)}</p>
          <p>Reason: ${signal.reason}</p>
          <p>Stop Loss: ${signal.stopLoss}</p>
          <p>Take Profit: ${signal.takeProfit}</p>
          <button class="execute-button" data-signal-id="${signal.timestamp}">Execute Trade</button>
        </div>
      `;
      
      // Add event listener for execute button
      document.querySelectorAll('.execute-button').forEach(button => {
        button.addEventListener('click', async (event) => {
          const signalId = event.target.dataset.signalId;
          const signalToExecute = aiIntegration.getAllTradeSignals()[symbol];
          
          if (signalToExecute && signalToExecute.timestamp.toString() === signalId) {
            console.log('Executing trade for signal:', signalToExecute);
            const result = await aiIntegration.executeTrade(signalToExecute);
            
            if (result.success) {
              console.log('Trade executed successfully:', result);
              event.target.disabled = true;
              event.target.textContent = 'Executed';
            } else {
              console.error('Failed to execute trade:', result.error);
              event.target.textContent = 'Failed';
            }
          }
        });
      });
    });
    
    // Enable auto-trading (optional)
    // console.log('Enabling auto-trading...');
    // await aiIntegration.enableAutoTrading(symbol);
    
    // Update auto-trading settings (optional)
    // console.log('Updating auto-trading settings...');
    // await aiIntegration.updateAutoTradingSettings({
    //   maxPositions: 3,
    //   maxLossPerTrade: 0.01,
    //   positionSizing: 0.01
    // });
    
    console.log('Demo initialized successfully!');
    console.log('Watching for trade signals...');
    
    // Set up cleanup function
    window.addEventListener('beforeunload', async () => {
      console.log('Cleaning up...');
      
      // Remove signal handler
      aiIntegration.removeSignalHandler(handlerId);
      
      // Unwatch symbol
      await aiIntegration.unwatchSymbol(symbol);
      
      // Disconnect WebSocket
      webSocketManager.disconnect();
    });
    
    // Set up UI update interval
    setInterval(() => {
      // Update ticker data
      const ticker = dataNormalizer.getTicker(symbol);
      if (ticker) {
        document.getElementById('ticker').innerHTML = `
          <div>
            <h3>${symbol} Ticker</h3>
            <p>Last: ${ticker.last}</p>
            <p>Bid: ${ticker.bid}</p>
            <p>Ask: ${ticker.ask}</p>
            <p>24h High: ${ticker.high}</p>
            <p>24h Low: ${ticker.low}</p>
            <p>24h Volume: ${ticker.volume}</p>
          </div>
        `;
      }
      
      // Update performance metrics
      const metrics = aiIntegration.getPerformanceMetrics();
      document.getElementById('performance').innerHTML = `
        <div>
          <h3>Performance Metrics</h3>
          <p>Total Trades: ${metrics.totalTrades}</p>
          <p>Winning Trades: ${metrics.winningTrades}</p>
          <p>Losing Trades: ${metrics.losingTrades}</p>
          <p>Win Rate: ${metrics.winRate.toFixed(2)}%</p>
          <p>Profit Factor: ${metrics.profitFactor.toFixed(2)}</p>
          <p>Total Profit: ${metrics.totalProfit.toFixed(2)}</p>
        </div>
      `;
    }, 1000);
  } catch (error) {
    console.error('Error running Kraken integration demo:', error);
  }
}

// Run the demo when the page loads
document.addEventListener('DOMContentLoaded', runKrakenIntegrationDemo);
