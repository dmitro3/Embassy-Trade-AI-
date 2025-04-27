/**
 * TradeForce AI Trading Agent - Background Script
 * 
 * This script runs in the background and manages communication between
 * the popup UI and content scripts injected into trading platforms.
 * It also handles the core trading logic and AI integration.
 */

// State
let isTrading = false;
let tradingParams = {
  strategy: 'combined',
  riskLevel: 'medium',
  maxTrades: 5,
  winRateTarget: 65,
  tradeAmount: 1.0
};
let platformConnections = {
  robinhood: false,
  kraken: false,
  axiom: false,
  phantom: false
};
let activeTrades = [];
let tradeHistory = [];
let settings = {
  maxTrades: 5,
  winRateTarget: 65,
  positionSize: 1.0,
  riskLevel: 'medium',
  strategy: 'combined',
  takeProfit: 50,
  stopLoss: 15,
  autoAdjust: true,
  apiKeys: {
    robinhood: '',
    kraken: '',
    axiom: '',
    grok: ''
  }
};

// Initialize background script
function initialize() {
  console.log('TradeForce AI Trading Agent background script initialized');
  
  // Load settings from storage
  chrome.storage.local.get(['settings', 'platformConnections', 'tradeHistory'], (result) => {
    if (result.settings) {
      settings = result.settings;
    }
    
    if (result.platformConnections) {
      platformConnections = result.platformConnections;
    }
    
    if (result.tradeHistory) {
      tradeHistory = result.tradeHistory;
    }
  });
  
  // Set up alarm for periodic market analysis
  chrome.alarms.create('marketAnalysis', { periodInMinutes: 5 });
  
  // Listen for alarm events
  chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'marketAnalysis') {
      if (isTrading) {
        analyzeMarket();
      }
    }
  });
}

/**
 * Analyze market data and execute trades if conditions are met
 */
async function analyzeMarket() {
  console.log('Analyzing market data...');
  
  // Get market data from connected platforms
  const marketData = await getMarketData();
  
  if (!marketData || Object.keys(marketData).length === 0) {
    console.log('No market data available');
    return;
  }
  
  // Use Grok 3 AI to analyze market data and generate trade recommendations
  const recommendations = await generateTradeRecommendations(marketData);
  
  if (!recommendations || recommendations.length === 0) {
    console.log('No trade recommendations generated');
    return;
  }
  
  // Filter recommendations based on trading parameters
  const filteredRecommendations = filterRecommendations(recommendations);
  
  // Execute trades based on filtered recommendations
  for (const recommendation of filteredRecommendations) {
    if (activeTrades.length < tradingParams.maxTrades) {
      await executeTrade(recommendation);
    }
  }
  
  // Monitor active trades
  monitorActiveTrades();
}

/**
 * Get market data from connected platforms
 * 
 * @returns {Promise<Object>} Market data from connected platforms
 */
async function getMarketData() {
  const marketData = {};
  
  // Get market data from Robinhood
  if (platformConnections.robinhood) {
    try {
      const response = await sendMessageToContentScript('robinhood', { action: 'getCryptoList' });
      if (response && response.success && response.cryptoList) {
        marketData.robinhood = response.cryptoList;
      }
    } catch (error) {
      console.error('Error getting Robinhood market data:', error);
    }
  }
  
  // Get market data from Kraken
  if (platformConnections.kraken) {
    try {
      const response = await sendMessageToContentScript('kraken', { action: 'getMarketPairs' });
      if (response && response.success && response.pairs) {
        marketData.kraken = response.pairs;
      }
    } catch (error) {
      console.error('Error getting Kraken market data:', error);
    }
  }
  
  // Get market data from Axiom
  if (platformConnections.axiom) {
    try {
      const response = await sendMessageToContentScript('axiom', { action: 'getTrendingTokens' });
      if (response && response.success && response.tokens) {
        marketData.axiom = response.tokens;
      }
    } catch (error) {
      console.error('Error getting Axiom market data:', error);
    }
  }
  
  return marketData;
}

/**
 * Generate trade recommendations using Grok 3 AI
 * 
 * @param {Object} marketData - Market data from connected platforms
 * @returns {Promise<Array>} Trade recommendations
 */
async function generateTradeRecommendations(marketData) {
  console.log('Generating trade recommendations...');
  
  // In a real implementation, this would call the Grok 3 API
  // For demo purposes, generate mock recommendations
  
  const recommendations = [];
  
  // Generate recommendations for each platform
  Object.keys(marketData).forEach(platform => {
    const platformData = marketData[platform];
    
    // Generate 1-3 recommendations per platform
    const numRecommendations = Math.floor(Math.random() * 3) + 1;
    
    for (let i = 0; i < numRecommendations; i++) {
      // Select a random asset from the platform data
      const assetIndex = Math.floor(Math.random() * platformData.length);
      const asset = platformData[assetIndex];
      
      // Generate a recommendation
      const recommendation = {
        platform,
        symbol: asset.symbol || asset.name,
        side: Math.random() > 0.5 ? 'buy' : 'sell',
        confidence: 0.5 + Math.random() * 0.4, // 50-90% confidence
        price: asset.price,
        reason: `${tradingParams.strategy} strategy signal with ${Math.floor(Math.random() * 30) + 70}% probability`,
        timestamp: new Date().toISOString()
      };
      
      recommendations.push(recommendation);
    }
  });
  
  // Sort recommendations by confidence (highest first)
  return recommendations.sort((a, b) => b.confidence - a.confidence);
}

/**
 * Filter trade recommendations based on trading parameters
 * 
 * @param {Array} recommendations - Trade recommendations
 * @returns {Array} Filtered recommendations
 */
function filterRecommendations(recommendations) {
  console.log('Filtering recommendations...');
  
  // Filter based on confidence threshold
  let confidenceThreshold;
  
  switch (tradingParams.riskLevel) {
    case 'low':
      confidenceThreshold = 0.8; // 80% confidence required for conservative strategy
      break;
    case 'medium':
      confidenceThreshold = 0.7; // 70% confidence required for balanced strategy
      break;
    case 'high':
      confidenceThreshold = 0.6; // 60% confidence required for aggressive strategy
      break;
    default:
      confidenceThreshold = 0.7;
  }
  
  // Filter recommendations
  return recommendations.filter(rec => {
    // Check confidence threshold
    if (rec.confidence < confidenceThreshold) {
      return false;
    }
    
    // Check if we already have an active trade for this symbol
    const existingTrade = activeTrades.find(trade => 
      trade.symbol === rec.symbol && trade.platform === rec.platform
    );
    
    if (existingTrade) {
      return false;
    }
    
    return true;
  });
}

/**
 * Execute a trade based on a recommendation
 * 
 * @param {Object} recommendation - Trade recommendation
 * @returns {Promise<Object>} Trade result
 */
async function executeTrade(recommendation) {
  console.log('Executing trade:', recommendation);
  
  try {
    // Prepare trade parameters
    const tradeParams = {
      symbol: recommendation.symbol,
      side: recommendation.side,
      amount: tradingParams.tradeAmount,
      price: recommendation.price,
      type: 'market',
      takeProfit: settings.takeProfit,
      stopLoss: settings.stopLoss
    };
    
    // Send trade execution message to the appropriate content script
    const response = await sendMessageToContentScript(recommendation.platform, {
      action: 'executeTrade',
      tradeParams
    });
    
    if (response && response.success) {
      // Create trade object
      const trade = {
        id: response.tradeId || `trade_${Date.now()}`,
        symbol: recommendation.symbol,
        side: recommendation.side,
        amount: tradingParams.tradeAmount,
        entryPrice: recommendation.price,
        platform: recommendation.platform,
        status: 'open',
        openTime: new Date().toISOString(),
        confidence: recommendation.confidence,
        reason: recommendation.reason
      };
      
      // Add to active trades
      activeTrades.push(trade);
      
      // Notify popup
      chrome.runtime.sendMessage({
        action: 'tradeExecuted',
        trade
      });
      
      return trade;
    } else {
      console.error('Trade execution failed:', response?.error || 'Unknown error');
      return null;
    }
  } catch (error) {
    console.error('Error executing trade:', error);
    return null;
  }
}

/**
 * Monitor active trades and close them if conditions are met
 */
async function monitorActiveTrades() {
  console.log('Monitoring active trades...');
  
  if (activeTrades.length === 0) {
    return;
  }
  
  // Get current market data
  const marketData = await getMarketData();
  
  if (!marketData || Object.keys(marketData).length === 0) {
    return;
  }
  
  // Check each active trade
  for (const trade of [...activeTrades]) {
    const platform = trade.platform;
    const platformData = marketData[platform];
    
    if (!platformData) {
      continue;
    }
    
    // Find current price for the trade's symbol
    const assetData = platformData.find(asset => 
      (asset.symbol === trade.symbol) || (asset.name === trade.symbol)
    );
    
    if (!assetData) {
      continue;
    }
    
    const currentPrice = assetData.price;
    
    // Calculate profit/loss
    let pnl;
    if (trade.side === 'buy') {
      pnl = (currentPrice - trade.entryPrice) * trade.amount;
    } else {
      pnl = (trade.entryPrice - currentPrice) * trade.amount;
    }
    
    // Calculate profit/loss percentage
    const pnlPercentage = (pnl / (trade.entryPrice * trade.amount)) * 100;
    
    // Check if take profit or stop loss is hit
    if (pnlPercentage >= settings.takeProfit || pnlPercentage <= -settings.stopLoss) {
      // Close the trade
      await closeTrade(trade, currentPrice, pnl, pnlPercentage);
    }
  }
}

/**
 * Close a trade
 * 
 * @param {Object} trade - Trade to close
 * @param {number} exitPrice - Exit price
 * @param {number} pnl - Profit/loss amount
 * @param {number} pnlPercentage - Profit/loss percentage
 */
async function closeTrade(trade, exitPrice, pnl, pnlPercentage) {
  console.log('Closing trade:', trade);
  
  try {
    // Send close trade message to the appropriate content script
    const response = await sendMessageToContentScript(trade.platform, {
      action: 'closeTrade',
      tradeId: trade.id
    });
    
    // Update trade object
    trade.exitPrice = exitPrice;
    trade.closeTime = new Date().toISOString();
    trade.status = 'closed';
    trade.pnl = pnl;
    trade.pnlPercentage = pnlPercentage;
    
    // Remove from active trades
    activeTrades = activeTrades.filter(t => t.id !== trade.id);
    
    // Add to trade history
    tradeHistory.push(trade);
    
    // Save trade history to storage
    chrome.storage.local.set({ tradeHistory });
    
    // Notify popup
    chrome.runtime.sendMessage({
      action: 'tradeClosed',
      trade
    });
    
    // Update win rate
    updateWinRate();
    
    return true;
  } catch (error) {
    console.error('Error closing trade:', error);
    return false;
  }
}

/**
 * Update win rate based on trade history
 */
function updateWinRate() {
  if (tradeHistory.length === 0) {
    return;
  }
  
  // Count winning trades
  const winningTrades = tradeHistory.filter(trade => trade.pnl > 0);
  
  // Calculate win rate
  const winRate = (winningTrades.length / tradeHistory.length) * 100;
  
  // Notify popup
  chrome.runtime.sendMessage({
    action: 'winRateUpdated',
    winRate
  });
  
  // Check if win rate is below target
  if (winRate < tradingParams.winRateTarget && settings.autoAdjust) {
    // Adjust trading parameters to improve win rate
    adjustTradingParameters(winRate);
  }
}

/**
 * Adjust trading parameters to improve win rate
 * 
 * @param {number} currentWinRate - Current win rate
 */
function adjustTradingParameters(currentWinRate) {
  console.log('Adjusting trading parameters to improve win rate');
  
  // Calculate win rate deficit
  const winRateDeficit = tradingParams.winRateTarget - currentWinRate;
  
  // Adjust parameters based on deficit
  if (winRateDeficit > 10) {
    // Significant deficit - make major adjustments
    
    // Reduce risk level
    if (tradingParams.riskLevel === 'high') {
      tradingParams.riskLevel = 'medium';
    } else if (tradingParams.riskLevel === 'medium') {
      tradingParams.riskLevel = 'low';
    }
    
    // Reduce trade amount
    tradingParams.tradeAmount = Math.max(0.1, tradingParams.tradeAmount * 0.8);
    
    // Increase take profit and reduce stop loss
    settings.takeProfit = Math.min(100, settings.takeProfit * 1.2);
    settings.stopLoss = Math.max(5, settings.stopLoss * 0.8);
  } else if (winRateDeficit > 5) {
    // Moderate deficit - make minor adjustments
    
    // Slightly reduce trade amount
    tradingParams.tradeAmount = Math.max(0.1, tradingParams.tradeAmount * 0.9);
    
    // Slightly adjust take profit and stop loss
    settings.takeProfit = Math.min(100, settings.takeProfit * 1.1);
    settings.stopLoss = Math.max(5, settings.stopLoss * 0.9);
  }
  
  // Save adjusted settings
  chrome.storage.local.set({ settings });
}

/**
 * Send a message to a content script
 * 
 * @param {string} platform - Platform to send message to
 * @param {Object} message - Message to send
 * @returns {Promise<Object>} Response from content script
 */
function sendMessageToContentScript(platform, message) {
  return new Promise((resolve, reject) => {
    // Find tabs with the platform URL
    let urlPattern;
    
    switch (platform) {
      case 'robinhood':
        urlPattern = '*://*.robinhood.com/*';
        break;
      case 'kraken':
        urlPattern = '*://*.kraken.com/*';
        break;
      case 'axiom':
        urlPattern = '*://*.axiom.trade/*';
        break;
      default:
        reject(new Error(`Unknown platform: ${platform}`));
        return;
    }
    
    chrome.tabs.query({ url: urlPattern }, (tabs) => {
      if (tabs.length === 0) {
        reject(new Error(`No tabs found for platform: ${platform}`));
        return;
      }
      
      // Send message to the first matching tab
      chrome.tabs.sendMessage(tabs[0].id, message, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(response);
        }
      });
    });
  });
}

/**
 * Start AI trading
 * 
 * @param {Object} params - Trading parameters
 */
function startTrading(params) {
  console.log('Starting AI trading with params:', params);
  
  // Update trading parameters
  tradingParams = { ...tradingParams, ...params };
  
  // Set trading state
  isTrading = true;
  
  // Perform initial market analysis
  analyzeMarket();
}

/**
 * Stop AI trading
 */
function stopTrading() {
  console.log('Stopping AI trading');
  
  // Set trading state
  isTrading = false;
  
  // Close all active trades
  closeAllTrades();
}

/**
 * Close all active trades
 */
async function closeAllTrades() {
  console.log('Closing all active trades');
  
  // Get current market data
  const marketData = await getMarketData();
  
  if (!marketData || Object.keys(marketData).length === 0) {
    return;
  }
  
  // Close each active trade
  for (const trade of [...activeTrades]) {
    const platform = trade.platform;
    const platformData = marketData[platform];
    
    if (!platformData) {
      continue;
    }
    
    // Find current price for the trade's symbol
    const assetData = platformData.find(asset => 
      (asset.symbol === trade.symbol) || (asset.name === trade.symbol)
    );
    
    if (!assetData) {
      continue;
    }
    
    const currentPrice = assetData.price;
    
    // Calculate profit/loss
    let pnl;
    if (trade.side === 'buy') {
      pnl = (currentPrice - trade.entryPrice) * trade.amount;
    } else {
      pnl = (trade.entryPrice - currentPrice) * trade.amount;
    }
    
    // Calculate profit/loss percentage
    const pnlPercentage = (pnl / (trade.entryPrice * trade.amount)) * 100;
    
    // Close the trade
    await closeTrade(trade, currentPrice, pnl, pnlPercentage);
  }
}

/**
 * Process a chat message using Grok 3 AI
 * 
 * @param {string} message - Chat message
 * @returns {Promise<Object>} AI response
 */
async function processChatMessage(message) {
  console.log('Processing chat message:', message);
  
  // In a real implementation, this would call the Grok 3 API
  // For demo purposes, generate a mock response
  
  const responses = [
    "I've analyzed the current market conditions and recommend focusing on momentum strategies today.",
    "Based on your trading parameters, I've identified 3 potential opportunities in the crypto market.",
    "Your current win rate is 65%, which is on target. Would you like me to adjust any parameters to potentially improve this?",
    "I've noticed increased volatility in the market. Consider reducing your position sizes temporarily.",
    "Your most profitable trades have been on Kraken. Would you like me to focus more on that platform?"
  ];
  
  const randomResponse = responses[Math.floor(Math.random() * responses.length)];
  
  return { reply: randomResponse };
}

// Listen for messages from popup and content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Background script received message:', message);
  
  switch (message.action) {
    case 'checkConnections':
      sendResponse({ connections: platformConnections });
      break;
      
    case 'platformConnected':
      platformConnections[message.platform] = true;
      chrome.storage.local.set({ platformConnections });
      break;
      
    case 'startTrading':
      startTrading(message.params);
      sendResponse({ success: true });
      break;
      
    case 'stopTrading':
      stopTrading();
      sendResponse({ success: true });
      break;
      
    case 'saveSettings':
      settings = message.settings;
      chrome.storage.local.set({ settings });
      sendResponse({ success: true });
      break;
      
    case 'processChatMessage':
      processChatMessage(message.message)
        .then(response => sendResponse(response))
        .catch(error => sendResponse({ error: error.message }));
      return true; // Keep channel open for async response
      
    case 'pageReady':
      // Content script is reporting that a page is ready
      if (message.platform) {
        platformConnections[message.platform] = message.isConnected || message.isLoggedIn || false;
        chrome.storage.local.set({ platformConnections });
      }
      break;
  }
});

// Initialize background script
initialize();
