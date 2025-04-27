/**
 * Axiom Trade Master Bot - Content Script
 * 
 * This script is injected into the Axiom Trade website to handle browser automation.
 * It communicates with the extension background script to execute trades and monitor the market.
 */

// Constants
const SELECTORS = {
  // Wallet connection
  CONNECT_WALLET_BUTTON: '.wallet-connect-button, button:contains("Connect Wallet")',
  PHANTOM_OPTION: '.wallet-adapter-modal-list button:contains("Phantom")',
  SOLFLARE_OPTION: '.wallet-adapter-modal-list button:contains("Solflare")',
  WALLET_CONNECTED: '.wallet-connected, .wallet-address',
  
  // Trading interface
  MARKET_SELECTOR: '.market-selector, select[name="market"]',
  BUY_BUTTON: '.buy-button, button:contains("Buy")',
  SELL_BUTTON: '.sell-button, button:contains("Sell")',
  AMOUNT_INPUT: 'input[name="amount"], .trade-amount-input',
  PRICE_INPUT: 'input[name="price"], .price-input',
  STOP_LOSS_INPUT: 'input[name="stopLoss"], .stop-loss-input',
  TAKE_PROFIT_INPUT: 'input[name="takeProfit"], .take-profit-input',
  EXECUTE_TRADE_BUTTON: '.execute-trade-button, button:contains("Execute Trade")',
  CONFIRM_TRADE_BUTTON: '.confirm-trade-button, button:contains("Confirm")',
  
  // Market data
  TRENDING_TOKENS: '.trending-tokens, .trending-list',
  TOKEN_ROW: '.token-row, .token-item',
  TOKEN_NAME: '.token-name',
  TOKEN_PRICE: '.token-price',
  TOKEN_VOLUME: '.token-volume',
  TOKEN_CHANGE: '.token-change',
  
  // Active trades
  ACTIVE_TRADES: '.active-trades, .positions-list',
  CLOSE_POSITION_BUTTON: '.close-position, button:contains("Close")',
  
  // Notifications
  NOTIFICATION: '.notification, .alert'
};

// State
let isConnected = false;
let isObserving = false;
let currentMarket = null;
let activeTrades = [];
let trendingTokens = [];
let observer = null;

// Initialize content script
function initialize() {
  console.log('Axiom Trade Master Bot content script initialized');
  
  // Listen for messages from the extension
  chrome.runtime.onMessage.addListener(handleMessage);
  
  // Check if already on Axiom Trade
  if (window.location.hostname.includes('axiom.trade')) {
    // Wait for page to fully load
    if (document.readyState === 'complete') {
      onPageLoad();
    } else {
      window.addEventListener('load', onPageLoad);
    }
  }
}

/**
 * Handle messages from the extension
 */
function handleMessage(message, sender, sendResponse) {
  console.log('Content script received message:', message);
  
  switch (message.action) {
    case 'checkConnection':
      sendResponse({ isConnected: isWalletConnected() });
      break;
      
    case 'connectWallet':
      connectWallet(message.wallet)
        .then(result => sendResponse(result))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true; // Keep channel open for async response
      
    case 'getTrendingTokens':
      scrapeTrendingTokens()
        .then(tokens => sendResponse({ success: true, tokens }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;
      
    case 'executeTrade':
      executeTrade(message.tradeParams)
        .then(result => sendResponse(result))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;
      
    case 'closeTrade':
      closeTrade(message.tradeId)
        .then(result => sendResponse(result))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;
      
    case 'startObserving':
      startObserving()
        .then(() => sendResponse({ success: true }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;
      
    case 'stopObserving':
      stopObserving();
      sendResponse({ success: true });
      break;
  }
}

/**
 * Actions to perform when the page is fully loaded
 */
function onPageLoad() {
  console.log('Axiom Trade page loaded');
  
  // Check if wallet is connected
  isConnected = isWalletConnected();
  
  // Inject helper functions
  injectHelpers();
  
  // Notify extension that page is ready
  chrome.runtime.sendMessage({
    action: 'pageReady',
    url: window.location.href,
    isConnected
  });
}

/**
 * Inject helper functions into the page
 */
function injectHelpers() {
  const script = document.createElement('script');
  script.textContent = `
    // Helper functions that run in the page context
    
    window.axiomBotHelpers = {
      // Get wallet address if connected
      getWalletAddress: function() {
        // This implementation will depend on how Axiom stores the wallet address
        // For example, it might be in localStorage, a global variable, etc.
        return localStorage.getItem('walletAddress') || null;
      },
      
      // Get current market data
      getMarketData: function() {
        // This implementation will depend on how Axiom stores market data
        // It might be in a global variable, Redux store, etc.
        return window.marketData || null;
      },
      
      // Get active trades
      getActiveTrades: function() {
        // This implementation will depend on how Axiom stores active trades
        return window.activeTrades || [];
      }
    };
  `;
  
  document.head.appendChild(script);
}

/**
 * Check if wallet is connected
 */
function isWalletConnected() {
  const walletElement = document.querySelector(SELECTORS.WALLET_CONNECTED);
  return !!walletElement;
}

/**
 * Connect wallet to Axiom
 */
async function connectWallet(walletType = 'phantom') {
  console.log(`Connecting ${walletType} wallet to Axiom`);
  
  try {
    // Click connect wallet button
    const connectButton = await waitForElement(SELECTORS.CONNECT_WALLET_BUTTON);
    connectButton.click();
    
    // Wait for wallet options to appear
    await sleep(1000);
    
    // Select the appropriate wallet
    let walletOption;
    if (walletType.toLowerCase() === 'phantom') {
      walletOption = await waitForElement(SELECTORS.PHANTOM_OPTION);
    } else if (walletType.toLowerCase() === 'solflare') {
      walletOption = await waitForElement(SELECTORS.SOLFLARE_OPTION);
    } else {
      throw new Error(`Unsupported wallet type: ${walletType}`);
    }
    
    walletOption.click();
    
    // Wait for wallet to connect
    await sleep(2000);
    
    // Check if connection was successful
    isConnected = isWalletConnected();
    
    if (isConnected) {
      return { success: true };
    } else {
      return { success: false, error: 'Failed to connect wallet' };
    }
  } catch (error) {
    console.error('Error connecting wallet:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Scrape trending tokens from the Axiom interface
 */
async function scrapeTrendingTokens() {
  console.log('Scraping trending tokens');
  
  try {
    // Wait for trending tokens section to load
    const trendingSection = await waitForElement(SELECTORS.TRENDING_TOKENS);
    
    // Get all token rows
    const tokenRows = trendingSection.querySelectorAll(SELECTORS.TOKEN_ROW);
    
    // Extract token data
    const tokens = Array.from(tokenRows).map(row => {
      const name = row.querySelector(SELECTORS.TOKEN_NAME)?.textContent.trim();
      const price = parseFloat(row.querySelector(SELECTORS.TOKEN_PRICE)?.textContent.replace(/[^0-9.]/g, ''));
      const volume = parseFloat(row.querySelector(SELECTORS.TOKEN_VOLUME)?.textContent.replace(/[^0-9.]/g, ''));
      const change = parseFloat(row.querySelector(SELECTORS.TOKEN_CHANGE)?.textContent.replace(/[^0-9.+-]/g, ''));
      
      return {
        name,
        price,
        volume,
        change,
        timestamp: Date.now()
      };
    });
    
    // Update state
    trendingTokens = tokens;
    
    return tokens;
  } catch (error) {
    console.error('Error scraping trending tokens:', error);
    throw error;
  }
}

/**
 * Execute a trade on Axiom
 */
async function executeTrade(params) {
  console.log('Executing trade:', params);
  
  try {
    // Select market
    const marketSelector = await waitForElement(SELECTORS.MARKET_SELECTOR);
    marketSelector.value = params.market;
    triggerEvent(marketSelector, 'change');
    
    // Wait for market to load
    await sleep(1000);
    
    // Click buy or sell button
    if (params.direction === 'long') {
      const buyButton = await waitForElement(SELECTORS.BUY_BUTTON);
      buyButton.click();
    } else {
      const sellButton = await waitForElement(SELECTORS.SELL_BUTTON);
      sellButton.click();
    }
    
    // Set amount
    const amountInput = await waitForElement(SELECTORS.AMOUNT_INPUT);
    amountInput.value = params.amount;
    triggerEvent(amountInput, 'input');
    
    // Set stop loss if provided
    if (params.stopLoss) {
      const stopLossInput = await waitForElement(SELECTORS.STOP_LOSS_INPUT);
      stopLossInput.value = params.stopLoss;
      triggerEvent(stopLossInput, 'input');
    }
    
    // Set take profit if provided
    if (params.takeProfit) {
      const takeProfitInput = await waitForElement(SELECTORS.TAKE_PROFIT_INPUT);
      takeProfitInput.value = params.takeProfit;
      triggerEvent(takeProfitInput, 'input');
    }
    
    // Click execute trade button
    const executeButton = await waitForElement(SELECTORS.EXECUTE_TRADE_BUTTON);
    executeButton.click();
    
    // Wait for confirmation dialog
    await sleep(1000);
    
    // Click confirm button
    const confirmButton = await waitForElement(SELECTORS.CONFIRM_TRADE_BUTTON);
    confirmButton.click();
    
    // Wait for trade to execute
    await sleep(2000);
    
    // Check for success notification
    const notification = document.querySelector(SELECTORS.NOTIFICATION);
    const isSuccess = notification && notification.textContent.includes('success');
    
    if (isSuccess) {
      return { 
        success: true,
        tradeId: `trade_${Date.now()}`,
        market: params.market,
        direction: params.direction,
        amount: params.amount,
        timestamp: new Date().toISOString()
      };
    } else {
      return { success: false, error: 'Trade execution failed' };
    }
  } catch (error) {
    console.error('Error executing trade:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Close a trade position
 */
async function closeTrade(tradeId) {
  console.log('Closing trade:', tradeId);
  
  try {
    // Find the trade in the active trades section
    const activeTradesSection = await waitForElement(SELECTORS.ACTIVE_TRADES);
    
    // This is a simplified implementation
    // In a real scenario, you would need to find the specific trade by ID
    const closeButtons = activeTradesSection.querySelectorAll(SELECTORS.CLOSE_POSITION_BUTTON);
    
    if (closeButtons.length === 0) {
      throw new Error('No close buttons found');
    }
    
    // Click the first close button (in a real implementation, find the correct one)
    closeButtons[0].click();
    
    // Wait for confirmation dialog
    await sleep(1000);
    
    // Click confirm button
    const confirmButton = await waitForElement(SELECTORS.CONFIRM_TRADE_BUTTON);
    confirmButton.click();
    
    // Wait for trade to close
    await sleep(2000);
    
    // Check for success notification
    const notification = document.querySelector(SELECTORS.NOTIFICATION);
    const isSuccess = notification && notification.textContent.includes('success');
    
    if (isSuccess) {
      return { success: true, tradeId };
    } else {
      return { success: false, error: 'Failed to close trade' };
    }
  } catch (error) {
    console.error('Error closing trade:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Start observing the page for changes
 */
async function startObserving() {
  if (isObserving) return;
  
  console.log('Starting observation of Axiom Trade');
  
  isObserving = true;
  
  // Create a mutation observer to watch for DOM changes
  observer = new MutationObserver(mutations => {
    // Check for new trending tokens
    if (mutations.some(mutation => 
      mutation.target.matches(SELECTORS.TRENDING_TOKENS) || 
      mutation.target.closest(SELECTORS.TRENDING_TOKENS)
    )) {
      scrapeTrendingTokens()
        .then(tokens => {
          chrome.runtime.sendMessage({
            action: 'trendingTokensUpdated',
            tokens
          });
        })
        .catch(console.error);
    }
    
    // Check for changes in active trades
    if (mutations.some(mutation => 
      mutation.target.matches(SELECTORS.ACTIVE_TRADES) || 
      mutation.target.closest(SELECTORS.ACTIVE_TRADES)
    )) {
      // In a real implementation, you would scrape active trades here
      // and send them to the extension
    }
  });
  
  // Start observing the entire document
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    characterData: true
  });
  
  // Initial scrape of trending tokens
  await scrapeTrendingTokens();
}

/**
 * Stop observing the page
 */
function stopObserving() {
  if (!isObserving) return;
  
  console.log('Stopping observation of Axiom Trade');
  
  isObserving = false;
  
  if (observer) {
    observer.disconnect();
    observer = null;
  }
}

/**
 * Wait for an element to appear in the DOM
 */
async function waitForElement(selector, timeout = 10000) {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    const element = document.querySelector(selector);
    if (element) return element;
    await sleep(100);
  }
  
  throw new Error(`Timeout waiting for element: ${selector}`);
}

/**
 * Sleep for a specified number of milliseconds
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Trigger an event on an element
 */
function triggerEvent(element, eventType) {
  const event = new Event(eventType, { bubbles: true });
  element.dispatchEvent(event);
}

// Initialize the content script
initialize();
