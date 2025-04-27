/**
 * TradeForce AI Trading Agent - Kraken Content Script
 * 
 * This script is injected into the Kraken website to handle browser automation.
 * It communicates with the extension background script to execute trades and monitor the market.
 */

// Constants
const SELECTORS = {
  // Authentication
  LOGIN_USERNAME: 'input[name="username"], input[id="username"]',
  LOGIN_PASSWORD: 'input[name="password"], input[id="password"]',
  LOGIN_BUTTON: 'button[type="submit"], button:contains("Sign In")',
  TWO_FA_INPUT: 'input[name="twofa"], input[placeholder*="2FA"]',
  TWO_FA_SUBMIT: 'button[type="submit"], button:contains("Submit")',
  
  // Navigation
  TRADE_TAB: 'a[href*="trade"], a:contains("Trade")',
  MARKETS_TAB: 'a[href*="markets"], a:contains("Markets")',
  PORTFOLIO_TAB: 'a[href*="portfolio"], a:contains("Portfolio")',
  HISTORY_TAB: 'a[href*="history"], a:contains("History")',
  
  // Trading interface
  MARKET_SELECTOR: '.market-selector, select[name="market"]',
  PAIR_SEARCH: 'input[placeholder*="Search"], input[type="search"]',
  PAIR_LIST: '.pair-list, .market-list',
  PAIR_ITEM: '.pair-item, .market-item',
  PAIR_NAME: '.pair-name, .market-name',
  PAIR_PRICE: '.pair-price, .market-price',
  PAIR_CHANGE: '.pair-change, .market-change',
  
  // Order form
  BUY_BUTTON: 'button:contains("Buy"), .buy-button',
  SELL_BUTTON: 'button:contains("Sell"), .sell-button',
  ORDER_TYPE_SELECTOR: 'select[name="ordertype"], .order-type-selector',
  MARKET_ORDER_OPTION: 'option[value="market"], .market-order-option',
  LIMIT_ORDER_OPTION: 'option[value="limit"], .limit-order-option',
  AMOUNT_INPUT: 'input[name="amount"], input[placeholder*="Amount"]',
  PRICE_INPUT: 'input[name="price"], input[placeholder*="Price"]',
  SUBMIT_ORDER_BUTTON: 'button:contains("Submit"), button:contains("Place Order")',
  CONFIRM_ORDER_BUTTON: 'button:contains("Confirm"), button:contains("Confirm Order")',
  
  // Order status
  ORDER_CONFIRMATION: '.order-confirmation, .success-message',
  ORDER_ERROR: '.order-error, .error-message',
  
  // Portfolio
  PORTFOLIO_SECTION: '.portfolio, .balances',
  ASSET_ROW: '.asset-row, .balance-row',
  ASSET_NAME: '.asset-name, .balance-asset',
  ASSET_BALANCE: '.asset-balance, .balance-amount',
  ASSET_VALUE: '.asset-value, .balance-value',
  
  // Order history
  ORDER_HISTORY: '.order-history, .history-list',
  ORDER_ROW: '.order-row, .history-item',
  ORDER_PAIR: '.order-pair',
  ORDER_TYPE: '.order-type',
  ORDER_AMOUNT: '.order-amount',
  ORDER_PRICE: '.order-price',
  ORDER_STATUS: '.order-status',
  ORDER_DATE: '.order-date'
};

// State
let isLoggedIn = false;
let isObserving = false;
let marketPairs = [];
let portfolio = [];
let orderHistory = [];
let observer = null;

// Initialize content script
function initialize() {
  console.log('TradeForce AI Trading Agent - Kraken content script initialized');
  
  // Listen for messages from the extension
  chrome.runtime.onMessage.addListener(handleMessage);
  
  // Check if already on Kraken
  if (window.location.hostname.includes('kraken.com')) {
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
    case 'checkLogin':
      sendResponse({ isLoggedIn: checkLoginStatus() });
      break;
      
    case 'login':
      login(message.credentials)
        .then(result => sendResponse(result))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true; // Keep channel open for async response
      
    case 'getMarketPairs':
      getMarketPairs()
        .then(pairs => sendResponse({ success: true, pairs }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;
      
    case 'getPortfolio':
      getPortfolio()
        .then(assets => sendResponse({ success: true, assets }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;
      
    case 'executeTrade':
      executeTrade(message.tradeParams)
        .then(result => sendResponse(result))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;
      
    case 'getOrderHistory':
      getOrderHistory()
        .then(history => sendResponse({ success: true, history }))
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
  console.log('Kraken page loaded');
  
  // Check if logged in
  isLoggedIn = checkLoginStatus();
  
  // Inject helper functions
  injectHelpers();
  
  // Notify extension that page is ready
  chrome.runtime.sendMessage({
    action: 'pageReady',
    platform: 'kraken',
    url: window.location.href,
    isLoggedIn
  });
}

/**
 * Inject helper functions into the page
 */
function injectHelpers() {
  const script = document.createElement('script');
  script.textContent = `
    // Helper functions that run in the page context
    
    window.tradeforceHelpers = {
      // Get account information
      getAccountInfo: function() {
        // This implementation will depend on how Kraken stores account info
        try {
          // Try to access account info from Kraken's global state
          if (window.App && window.App.state && window.App.state.account) {
            return window.App.state.account;
          }
          
          // Try localStorage as fallback
          const accountData = localStorage.getItem('accountData');
          return accountData ? JSON.parse(accountData) : null;
        } catch (e) {
          console.error('Error getting account info:', e);
          return null;
        }
      },
      
      // Get current market data
      getMarketData: function() {
        // This implementation will depend on how Kraken stores market data
        if (window.App && window.App.state && window.App.state.markets) {
          return window.App.state.markets;
        }
        
        return null;
      },
      
      // Get current balances
      getBalances: function() {
        // This implementation will depend on how Kraken stores balances
        if (window.App && window.App.state && window.App.state.balances) {
          return window.App.state.balances;
        }
        
        return null;
      }
    };
  `;
  
  document.head.appendChild(script);
}

/**
 * Check if user is logged in
 */
function checkLoginStatus() {
  // Check for login elements vs. dashboard elements
  const loginForm = document.querySelector(SELECTORS.LOGIN_USERNAME);
  const portfolioTab = document.querySelector(SELECTORS.PORTFOLIO_TAB);
  
  return !loginForm && !!portfolioTab;
}

/**
 * Login to Kraken
 */
async function login(credentials) {
  console.log('Logging in to Kraken');
  
  try {
    // Check if already logged in
    if (checkLoginStatus()) {
      return { success: true, message: 'Already logged in' };
    }
    
    // Enter username
    const usernameInput = await waitForElement(SELECTORS.LOGIN_USERNAME);
    usernameInput.value = credentials.username;
    triggerEvent(usernameInput, 'input');
    
    // Enter password
    const passwordInput = await waitForElement(SELECTORS.LOGIN_PASSWORD);
    passwordInput.value = credentials.password;
    triggerEvent(passwordInput, 'input');
    
    // Click login button
    const loginButton = await waitForElement(SELECTORS.LOGIN_BUTTON);
    loginButton.click();
    
    // Wait for potential 2FA prompt
    await sleep(2000);
    
    // Check for 2FA input
    const twoFAInput = document.querySelector(SELECTORS.TWO_FA_INPUT);
    if (twoFAInput) {
      // If 2FA is required but not provided, return with 2FA required status
      if (!credentials.twoFACode) {
        return { success: false, twoFARequired: true };
      }
      
      // Enter 2FA code
      twoFAInput.value = credentials.twoFACode;
      triggerEvent(twoFAInput, 'input');
      
      // Submit 2FA
      const twoFASubmit = await waitForElement(SELECTORS.TWO_FA_SUBMIT);
      twoFASubmit.click();
      
      // Wait for login to complete
      await sleep(3000);
    } else {
      // Wait for login to complete without 2FA
      await sleep(2000);
    }
    
    // Check if login was successful
    isLoggedIn = checkLoginStatus();
    
    if (isLoggedIn) {
      return { success: true };
    } else {
      return { success: false, error: 'Login failed' };
    }
  } catch (error) {
    console.error('Error logging in:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get list of available market pairs
 */
async function getMarketPairs() {
  console.log('Getting market pairs');
  
  try {
    // Navigate to markets tab if not already there
    const currentUrl = window.location.href;
    if (!currentUrl.includes('/markets')) {
      const marketsTab = await waitForElement(SELECTORS.MARKETS_TAB);
      marketsTab.click();
      
      // Wait for navigation
      await sleep(2000);
    }
    
    // Wait for pair list to load
    const pairListElement = await waitForElement(SELECTORS.PAIR_LIST);
    
    // Get all pair items
    const pairItems = pairListElement.querySelectorAll(SELECTORS.PAIR_ITEM);
    
    // Extract pair data
    const pairs = Array.from(pairItems).map(item => {
      const name = item.querySelector(SELECTORS.PAIR_NAME)?.textContent.trim();
      const price = parseFloat(item.querySelector(SELECTORS.PAIR_PRICE)?.textContent.replace(/[^0-9.]/g, ''));
      const changeText = item.querySelector(SELECTORS.PAIR_CHANGE)?.textContent.trim();
      const change = parseFloat(changeText?.replace(/[^0-9.+-]/g, '') || '0');
      
      // Extract pair ID from the item's data attributes or href
      let pairId = '';
      const link = item.querySelector('a');
      if (link && link.href) {
        const match = link.href.match(/\/trade\/([^\/]+)/);
        if (match) {
          pairId = match[1];
        }
      }
      
      // Parse base and quote currencies from pair name
      let baseCurrency = '';
      let quoteCurrency = '';
      
      if (name) {
        const parts = name.split('/');
        if (parts.length === 2) {
          baseCurrency = parts[0].trim();
          quoteCurrency = parts[1].trim();
        }
      }
      
      return {
        name,
        pairId,
        baseCurrency,
        quoteCurrency,
        price,
        change,
        timestamp: Date.now()
      };
    });
    
    // Update state
    marketPairs = pairs;
    
    return pairs;
  } catch (error) {
    console.error('Error getting market pairs:', error);
    throw error;
  }
}

/**
 * Get portfolio assets
 */
async function getPortfolio() {
  console.log('Getting portfolio');
  
  try {
    // Navigate to portfolio tab if not already there
    const currentUrl = window.location.href;
    if (!currentUrl.includes('/portfolio')) {
      const portfolioTab = await waitForElement(SELECTORS.PORTFOLIO_TAB);
      portfolioTab.click();
      
      // Wait for navigation
      await sleep(2000);
    }
    
    // Wait for portfolio section to load
    const portfolioSection = await waitForElement(SELECTORS.PORTFOLIO_SECTION);
    
    // Get all asset rows
    const assetRows = portfolioSection.querySelectorAll(SELECTORS.ASSET_ROW);
    
    // Extract asset data
    const assets = Array.from(assetRows).map(row => {
      const name = row.querySelector(SELECTORS.ASSET_NAME)?.textContent.trim();
      const balance = parseFloat(row.querySelector(SELECTORS.ASSET_BALANCE)?.textContent.replace(/[^0-9.]/g, ''));
      const value = parseFloat(row.querySelector(SELECTORS.ASSET_VALUE)?.textContent.replace(/[^0-9.]/g, ''));
      
      return {
        name,
        balance,
        value,
        timestamp: Date.now()
      };
    });
    
    // Update state
    portfolio = assets;
    
    return assets;
  } catch (error) {
    console.error('Error getting portfolio:', error);
    throw error;
  }
}

/**
 * Execute a trade on Kraken
 */
async function executeTrade(params) {
  console.log('Executing trade:', params);
  
  try {
    // Navigate to the specific trading pair page
    if (params.pairId) {
      window.location.href = `https://trade.kraken.com/trade/${params.pairId}`;
      
      // Wait for page to load
      await sleep(3000);
    } else if (params.pair) {
      // Search for the pair
      const searchInput = await waitForElement(SELECTORS.PAIR_SEARCH);
      searchInput.value = params.pair;
      triggerEvent(searchInput, 'input');
      
      // Wait for search results
      await sleep(1000);
      
      // Click on the first result
      const firstResult = document.querySelector('.search-result a');
      if (firstResult) {
        firstResult.click();
        
        // Wait for page to load
        await sleep(3000);
      } else {
        throw new Error(`Pair ${params.pair} not found`);
      }
    } else {
      throw new Error('Pair ID or pair name is required');
    }
    
    // Click buy or sell button
    if (params.side === 'buy') {
      const buyButton = await waitForElement(SELECTORS.BUY_BUTTON);
      buyButton.click();
    } else {
      const sellButton = await waitForElement(SELECTORS.SELL_BUTTON);
      sellButton.click();
    }
    
    // Wait for order form to load
    await sleep(1000);
    
    // Select order type (market or limit)
    if (params.type) {
      const orderTypeSelect = await waitForElement(SELECTORS.ORDER_TYPE_SELECTOR);
      orderTypeSelect.click();
      
      await sleep(500);
      
      if (params.type === 'market') {
        const marketOption = await waitForElement(SELECTORS.MARKET_ORDER_OPTION);
        marketOption.click();
      } else if (params.type === 'limit') {
        const limitOption = await waitForElement(SELECTORS.LIMIT_ORDER_OPTION);
        limitOption.click();
        
        // Set price for limit order
        if (params.price) {
          const priceInput = await waitForElement(SELECTORS.PRICE_INPUT);
          priceInput.value = params.price;
          triggerEvent(priceInput, 'input');
        }
      }
    }
    
    // Set amount
    const amountInput = await waitForElement(SELECTORS.AMOUNT_INPUT);
    amountInput.value = params.amount;
    triggerEvent(amountInput, 'input');
    
    // Click submit order button
    const submitButton = await waitForElement(SELECTORS.SUBMIT_ORDER_BUTTON);
    submitButton.click();
    
    // Wait for confirmation dialog
    await sleep(1000);
    
    // Check if confirmation is required
    const confirmButton = document.querySelector(SELECTORS.CONFIRM_ORDER_BUTTON);
    if (confirmButton) {
      confirmButton.click();
      
      // Wait for order to process
      await sleep(2000);
    }
    
    // Check for confirmation or error
    const confirmation = document.querySelector(SELECTORS.ORDER_CONFIRMATION);
    const error = document.querySelector(SELECTORS.ORDER_ERROR);
    
    if (confirmation) {
      // Extract order ID if available
      let orderId = `kraken_order_${Date.now()}`;
      const orderIdMatch = confirmation.textContent.match(/Order ID: ([A-Za-z0-9-]+)/);
      if (orderIdMatch) {
        orderId = orderIdMatch[1];
      }
      
      return { 
        success: true,
        tradeId: orderId,
        pair: params.pair,
        pairId: params.pairId,
        side: params.side,
        amount: params.amount,
        type: params.type,
        price: params.price,
        platform: 'kraken',
        timestamp: new Date().toISOString()
      };
    } else if (error) {
      return { success: false, error: error.textContent.trim() };
    } else {
      return { success: false, error: 'Unknown error executing trade' };
    }
  } catch (error) {
    console.error('Error executing trade:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get order history
 */
async function getOrderHistory() {
  console.log('Getting order history');
  
  try {
    // Navigate to history tab if not already there
    const currentUrl = window.location.href;
    if (!currentUrl.includes('/history')) {
      const historyTab = await waitForElement(SELECTORS.HISTORY_TAB);
      historyTab.click();
      
      // Wait for navigation
      await sleep(2000);
    }
    
    // Wait for order history to load
    const historySection = await waitForElement(SELECTORS.ORDER_HISTORY);
    
    // Get all order rows
    const orderRows = historySection.querySelectorAll(SELECTORS.ORDER_ROW);
    
    // Extract order data
    const orders = Array.from(orderRows).map(row => {
      const pair = row.querySelector(SELECTORS.ORDER_PAIR)?.textContent.trim();
      const type = row.querySelector(SELECTORS.ORDER_TYPE)?.textContent.trim();
      const amount = parseFloat(row.querySelector(SELECTORS.ORDER_AMOUNT)?.textContent.replace(/[^0-9.]/g, ''));
      const price = parseFloat(row.querySelector(SELECTORS.ORDER_PRICE)?.textContent.replace(/[^0-9.]/g, ''));
      const status = row.querySelector(SELECTORS.ORDER_STATUS)?.textContent.trim();
      const dateText = row.querySelector(SELECTORS.ORDER_DATE)?.textContent.trim();
      
      // Parse side (buy/sell) from type
      let side = '';
      if (type) {
        if (type.toLowerCase().includes('buy')) {
          side = 'buy';
        } else if (type.toLowerCase().includes('sell')) {
          side = 'sell';
        }
      }
      
      // Parse date
      let timestamp = new Date().toISOString();
      if (dateText) {
        try {
          timestamp = new Date(dateText).toISOString();
        } catch (e) {
          console.error('Error parsing date:', e);
        }
      }
      
      return {
        pair,
        side,
        type,
        amount,
        price,
        status,
        timestamp
      };
    });
    
    // Update state
    orderHistory = orders;
    
    return orders;
  } catch (error) {
    console.error('Error getting order history:', error);
    throw error;
  }
}

/**
 * Start observing the page for changes
 */
async function startObserving() {
  if (isObserving) return;
  
  console.log('Starting observation of Kraken');
  
  isObserving = true;
  
  // Create a mutation observer to watch for DOM changes
  observer = new MutationObserver(mutations => {
    // Check for changes in market pairs
    if (mutations.some(mutation => 
      mutation.target.matches(SELECTORS.PAIR_LIST) || 
      mutation.target.closest(SELECTORS.PAIR_LIST)
    )) {
      getMarketPairs()
        .then(pairs => {
          chrome.runtime.sendMessage({
            action: 'marketPairsUpdated',
            platform: 'kraken',
            pairs
          });
        })
        .catch(console.error);
    }
    
    // Check for changes in portfolio
    if (mutations.some(mutation => 
      mutation.target.matches(SELECTORS.PORTFOLIO_SECTION) || 
      mutation.target.closest(SELECTORS.PORTFOLIO_SECTION)
    )) {
      getPortfolio()
        .then(assets => {
          chrome.runtime.sendMessage({
            action: 'portfolioUpdated',
            platform: 'kraken',
            assets
          });
        })
        .catch(console.error);
    }
    
    // Check for changes in order history
    if (mutations.some(mutation => 
      mutation.target.matches(SELECTORS.ORDER_HISTORY) || 
      mutation.target.closest(SELECTORS.ORDER_HISTORY)
    )) {
      getOrderHistory()
        .then(history => {
          chrome.runtime.sendMessage({
            action: 'orderHistoryUpdated',
            platform: 'kraken',
            history
          });
        })
        .catch(console.error);
    }
  });
  
  // Start observing the entire document
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    characterData: true
  });
  
  // Initial data fetch
  try {
    await getMarketPairs();
    await getPortfolio();
    await getOrderHistory();
  } catch (error) {
    console.error('Error fetching initial data:', error);
  }
}

/**
 * Stop observing the page
 */
function stopObserving() {
  if (!isObserving) return;
  
  console.log('Stopping observation of Kraken');
  
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
