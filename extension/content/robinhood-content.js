/**
 * TradeForce AI Trading Agent - Robinhood Content Script
 * 
 * This script is injected into the Robinhood website to handle browser automation.
 * It communicates with the extension background script to execute trades and monitor the market.
 */

// Constants
const SELECTORS = {
  // Authentication
  LOGIN_USERNAME: 'input[name="username"], input[type="email"]',
  LOGIN_PASSWORD: 'input[name="password"], input[type="password"]',
  LOGIN_BUTTON: 'button[type="submit"], button:contains("Sign In")',
  MFA_INPUT: 'input[name="mfa_code"], input[placeholder*="code"]',
  MFA_SUBMIT: 'button[type="submit"], button:contains("Submit")',
  
  // Navigation
  CRYPTO_TAB: 'a[href*="crypto"], a:contains("Crypto")',
  ACCOUNT_MENU: '.account-menu, .user-menu',
  
  // Trading interface
  SEARCH_INPUT: 'input[placeholder*="Search"], input[type="search"]',
  CRYPTO_LIST: '.crypto-list, .asset-list',
  CRYPTO_ITEM: '.crypto-item, .asset-item',
  CRYPTO_NAME: '.crypto-name, .asset-name',
  CRYPTO_PRICE: '.crypto-price, .asset-price',
  CRYPTO_CHANGE: '.crypto-change, .asset-change',
  
  // Order form
  BUY_BUTTON: 'button:contains("Buy"), .buy-button',
  SELL_BUTTON: 'button:contains("Sell"), .sell-button',
  ORDER_TYPE: 'select[name="orderType"], .order-type-selector',
  MARKET_ORDER: 'option[value="market"], .market-order-option',
  LIMIT_ORDER: 'option[value="limit"], .limit-order-option',
  QUANTITY_INPUT: 'input[name="quantity"], input[placeholder*="Amount"]',
  PRICE_INPUT: 'input[name="price"], input[placeholder*="Price"]',
  REVIEW_ORDER_BUTTON: 'button:contains("Review"), button:contains("Review Order")',
  SUBMIT_ORDER_BUTTON: 'button:contains("Submit"), button:contains("Place Order")',
  
  // Order status
  ORDER_CONFIRMATION: '.order-confirmation, .success-message',
  ORDER_ERROR: '.order-error, .error-message',
  
  // Portfolio
  PORTFOLIO_SECTION: '.portfolio, .positions',
  POSITION_ROW: '.position-row, .position-item',
  POSITION_NAME: '.position-name',
  POSITION_QUANTITY: '.position-quantity',
  POSITION_VALUE: '.position-value',
  POSITION_RETURN: '.position-return',
  
  // Order history
  HISTORY_TAB: 'a[href*="history"], a:contains("History")',
  ORDER_HISTORY: '.order-history, .history-list',
  ORDER_ROW: '.order-row, .history-item',
  ORDER_STATUS: '.order-status',
  ORDER_DETAILS: '.order-details'
};

// State
let isLoggedIn = false;
let isObserving = false;
let cryptoList = [];
let positions = [];
let orderHistory = [];
let observer = null;

// Initialize content script
function initialize() {
  console.log('TradeForce AI Trading Agent - Robinhood content script initialized');
  
  // Listen for messages from the extension
  chrome.runtime.onMessage.addListener(handleMessage);
  
  // Check if already on Robinhood
  if (window.location.hostname.includes('robinhood.com')) {
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
      
    case 'getCryptoList':
      getCryptoList()
        .then(list => sendResponse({ success: true, cryptoList: list }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;
      
    case 'getPositions':
      getPositions()
        .then(positions => sendResponse({ success: true, positions }))
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
  console.log('Robinhood page loaded');
  
  // Check if logged in
  isLoggedIn = checkLoginStatus();
  
  // Inject helper functions
  injectHelpers();
  
  // Notify extension that page is ready
  chrome.runtime.sendMessage({
    action: 'pageReady',
    platform: 'robinhood',
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
        // This implementation will depend on how Robinhood stores account info
        // It might be in localStorage, a global variable, etc.
        try {
          const accountData = localStorage.getItem('accountData');
          return accountData ? JSON.parse(accountData) : null;
        } catch (e) {
          console.error('Error getting account info:', e);
          return null;
        }
      },
      
      // Get current market data
      getMarketData: function() {
        // This implementation will depend on how Robinhood stores market data
        // It might be in a global variable, Redux store, etc.
        if (window.__MARKET_DATA__) {
          return window.__MARKET_DATA__;
        }
        
        // Try to find data in Redux store
        if (window.__REDUX_STATE__ && window.__REDUX_STATE__.marketData) {
          return window.__REDUX_STATE__.marketData;
        }
        
        return null;
      },
      
      // Get crypto positions
      getCryptoPositions: function() {
        // This implementation will depend on how Robinhood stores positions
        if (window.__REDUX_STATE__ && window.__REDUX_STATE__.positions) {
          return window.__REDUX_STATE__.positions.filter(p => p.type === 'crypto');
        }
        
        return [];
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
  const accountMenu = document.querySelector(SELECTORS.ACCOUNT_MENU);
  
  return !loginForm && !!accountMenu;
}

/**
 * Login to Robinhood
 */
async function login(credentials) {
  console.log('Logging in to Robinhood');
  
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
    
    // Wait for potential MFA prompt
    await sleep(2000);
    
    // Check for MFA input
    const mfaInput = document.querySelector(SELECTORS.MFA_INPUT);
    if (mfaInput) {
      // If MFA is required but not provided, return with MFA required status
      if (!credentials.mfaCode) {
        return { success: false, mfaRequired: true };
      }
      
      // Enter MFA code
      mfaInput.value = credentials.mfaCode;
      triggerEvent(mfaInput, 'input');
      
      // Submit MFA
      const mfaSubmit = await waitForElement(SELECTORS.MFA_SUBMIT);
      mfaSubmit.click();
      
      // Wait for login to complete
      await sleep(3000);
    } else {
      // Wait for login to complete without MFA
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
 * Get list of available cryptocurrencies
 */
async function getCryptoList() {
  console.log('Getting crypto list');
  
  try {
    // Navigate to crypto tab if not already there
    const currentUrl = window.location.href;
    if (!currentUrl.includes('/crypto')) {
      const cryptoTab = await waitForElement(SELECTORS.CRYPTO_TAB);
      cryptoTab.click();
      
      // Wait for navigation
      await sleep(2000);
    }
    
    // Wait for crypto list to load
    const cryptoListElement = await waitForElement(SELECTORS.CRYPTO_LIST);
    
    // Get all crypto items
    const cryptoItems = cryptoListElement.querySelectorAll(SELECTORS.CRYPTO_ITEM);
    
    // Extract crypto data
    const cryptos = Array.from(cryptoItems).map(item => {
      const name = item.querySelector(SELECTORS.CRYPTO_NAME)?.textContent.trim();
      const price = parseFloat(item.querySelector(SELECTORS.CRYPTO_PRICE)?.textContent.replace(/[^0-9.]/g, ''));
      const changeText = item.querySelector(SELECTORS.CRYPTO_CHANGE)?.textContent.trim();
      const change = parseFloat(changeText?.replace(/[^0-9.+-]/g, '') || '0');
      
      // Extract currency pair ID from the item's data attributes or href
      let currencyPairId = '';
      const link = item.querySelector('a');
      if (link && link.href) {
        const match = link.href.match(/\/crypto\/([^\/]+)/);
        if (match) {
          currencyPairId = match[1];
        }
      }
      
      return {
        name,
        symbol: name?.split(' ')[0],
        price,
        change,
        currencyPairId,
        timestamp: Date.now()
      };
    });
    
    // Update state
    cryptoList = cryptos;
    
    return cryptos;
  } catch (error) {
    console.error('Error getting crypto list:', error);
    throw error;
  }
}

/**
 * Get current positions
 */
async function getPositions() {
  console.log('Getting positions');
  
  try {
    // Navigate to portfolio if not already there
    const currentUrl = window.location.href;
    if (!currentUrl.includes('/account')) {
      // Click on account or portfolio link
      const accountLink = document.querySelector('a[href*="account"]');
      if (accountLink) {
        accountLink.click();
        
        // Wait for navigation
        await sleep(2000);
      }
    }
    
    // Wait for portfolio section to load
    const portfolioSection = await waitForElement(SELECTORS.PORTFOLIO_SECTION);
    
    // Get all position rows
    const positionRows = portfolioSection.querySelectorAll(SELECTORS.POSITION_ROW);
    
    // Extract position data
    const positionData = Array.from(positionRows).map(row => {
      const name = row.querySelector(SELECTORS.POSITION_NAME)?.textContent.trim();
      const quantity = parseFloat(row.querySelector(SELECTORS.POSITION_QUANTITY)?.textContent.replace(/[^0-9.]/g, ''));
      const value = parseFloat(row.querySelector(SELECTORS.POSITION_VALUE)?.textContent.replace(/[^0-9.]/g, ''));
      const returnText = row.querySelector(SELECTORS.POSITION_RETURN)?.textContent.trim();
      const returnValue = parseFloat(returnText?.replace(/[^0-9.+-]/g, '') || '0');
      
      return {
        name,
        symbol: name?.split(' ')[0],
        quantity,
        value,
        returnValue,
        timestamp: Date.now()
      };
    });
    
    // Update state
    positions = positionData;
    
    return positionData;
  } catch (error) {
    console.error('Error getting positions:', error);
    throw error;
  }
}

/**
 * Execute a trade on Robinhood
 */
async function executeTrade(params) {
  console.log('Executing trade:', params);
  
  try {
    // Navigate to the specific crypto page
    if (params.currencyPairId) {
      window.location.href = `https://robinhood.com/crypto/${params.currencyPairId}`;
      
      // Wait for page to load
      await sleep(3000);
    } else if (params.symbol) {
      // Search for the crypto
      const searchInput = await waitForElement(SELECTORS.SEARCH_INPUT);
      searchInput.value = params.symbol;
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
        throw new Error(`Crypto ${params.symbol} not found`);
      }
    } else {
      throw new Error('Currency pair ID or symbol is required');
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
      const orderTypeSelect = await waitForElement(SELECTORS.ORDER_TYPE);
      orderTypeSelect.click();
      
      await sleep(500);
      
      if (params.type === 'market') {
        const marketOption = await waitForElement(SELECTORS.MARKET_ORDER);
        marketOption.click();
      } else if (params.type === 'limit') {
        const limitOption = await waitForElement(SELECTORS.LIMIT_ORDER);
        limitOption.click();
        
        // Set price for limit order
        if (params.price) {
          const priceInput = await waitForElement(SELECTORS.PRICE_INPUT);
          priceInput.value = params.price;
          triggerEvent(priceInput, 'input');
        }
      }
    }
    
    // Set quantity
    const quantityInput = await waitForElement(SELECTORS.QUANTITY_INPUT);
    quantityInput.value = params.quantity;
    triggerEvent(quantityInput, 'input');
    
    // Click review order button
    const reviewButton = await waitForElement(SELECTORS.REVIEW_ORDER_BUTTON);
    reviewButton.click();
    
    // Wait for confirmation dialog
    await sleep(1000);
    
    // Click submit order button
    const submitButton = await waitForElement(SELECTORS.SUBMIT_ORDER_BUTTON);
    submitButton.click();
    
    // Wait for order to process
    await sleep(2000);
    
    // Check for confirmation or error
    const confirmation = document.querySelector(SELECTORS.ORDER_CONFIRMATION);
    const error = document.querySelector(SELECTORS.ORDER_ERROR);
    
    if (confirmation) {
      // Extract order ID if available
      let orderId = `robinhood_order_${Date.now()}`;
      const orderIdMatch = confirmation.textContent.match(/Order ID: ([A-Za-z0-9-]+)/);
      if (orderIdMatch) {
        orderId = orderIdMatch[1];
      }
      
      return { 
        success: true,
        tradeId: orderId,
        symbol: params.symbol,
        currencyPairId: params.currencyPairId,
        side: params.side,
        quantity: params.quantity,
        type: params.type,
        price: params.price,
        platform: 'robinhood',
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
      const details = row.querySelector(SELECTORS.ORDER_DETAILS)?.textContent.trim();
      const status = row.querySelector(SELECTORS.ORDER_STATUS)?.textContent.trim();
      
      // Parse details to extract symbol, side, quantity, price
      let symbol = '';
      let side = '';
      let quantity = 0;
      let price = 0;
      
      if (details) {
        const buyMatch = details.match(/Buy\s+([0-9.]+)\s+([A-Z]+)/i);
        const sellMatch = details.match(/Sell\s+([0-9.]+)\s+([A-Z]+)/i);
        
        if (buyMatch) {
          side = 'buy';
          quantity = parseFloat(buyMatch[1]);
          symbol = buyMatch[2];
        } else if (sellMatch) {
          side = 'sell';
          quantity = parseFloat(sellMatch[1]);
          symbol = sellMatch[2];
        }
        
        const priceMatch = details.match(/\$([0-9,.]+)/);
        if (priceMatch) {
          price = parseFloat(priceMatch[1].replace(/,/g, ''));
        }
      }
      
      // Extract timestamp
      const timestampElement = row.querySelector('.timestamp, .date');
      const timestamp = timestampElement ? new Date(timestampElement.textContent.trim()).toISOString() : new Date().toISOString();
      
      return {
        symbol,
        side,
        quantity,
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
  
  console.log('Starting observation of Robinhood');
  
  isObserving = true;
  
  // Create a mutation observer to watch for DOM changes
  observer = new MutationObserver(mutations => {
    // Check for changes in crypto list
    if (mutations.some(mutation => 
      mutation.target.matches(SELECTORS.CRYPTO_LIST) || 
      mutation.target.closest(SELECTORS.CRYPTO_LIST)
    )) {
      getCryptoList()
        .then(list => {
          chrome.runtime.sendMessage({
            action: 'cryptoListUpdated',
            platform: 'robinhood',
            cryptoList: list
          });
        })
        .catch(console.error);
    }
    
    // Check for changes in positions
    if (mutations.some(mutation => 
      mutation.target.matches(SELECTORS.PORTFOLIO_SECTION) || 
      mutation.target.closest(SELECTORS.PORTFOLIO_SECTION)
    )) {
      getPositions()
        .then(positions => {
          chrome.runtime.sendMessage({
            action: 'positionsUpdated',
            platform: 'robinhood',
            positions
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
            platform: 'robinhood',
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
    await getCryptoList();
    await getPositions();
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
  
  console.log('Stopping observation of Robinhood');
  
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
