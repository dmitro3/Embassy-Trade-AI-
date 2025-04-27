/**
 * TradeForce AI Trading Agent - Popup Script
 * 
 * This script handles the functionality of the extension's popup UI,
 * including tab switching, platform connections, and trading controls.
 */

// DOM Elements
const loadingContainer = document.getElementById('loading-container');
const mainContent = document.getElementById('main-content');
const debugIndicator = document.getElementById('debug-indicator');

// Sidebar Buttons
const darkModeToggle = document.getElementById('dark-mode-toggle');
const chatButton = document.getElementById('chat-button');
const tradeButton = document.getElementById('trade-button');
const dashboardButton = document.getElementById('dashboard-button');
const downloadButton = document.getElementById('download-button');
const backButton = document.getElementById('back-button');

// Tab Content
const tradeTab = document.getElementById('trade-tab');
const dashboardTab = document.getElementById('dashboard-tab');
const chatTab = document.getElementById('chat-tab');
const downloadTab = document.getElementById('download-tab');

// Platform Connection Buttons
const connectRobinhoodBtn = document.getElementById('connect-robinhood');
const connectKrakenBtn = document.getElementById('connect-kraken');
const connectAxiomBtn = document.getElementById('connect-axiom');
const connectPhantomBtn = document.getElementById('connect-phantom');

// Platform Status Elements
const robinhoodStatus = document.getElementById('robinhood-status');
const krakenStatus = document.getElementById('kraken-status');
const axiomStatus = document.getElementById('axiom-status');
const phantomStatus = document.getElementById('phantom-status');

// Trading Controls
const tradingStrategySelect = document.getElementById('trading-strategy');
const riskLevelSelect = document.getElementById('risk-level');
const maxTradesInput = document.getElementById('max-trades');
const winRateTargetInput = document.getElementById('win-rate-target');
const tradeAmountInput = document.getElementById('trade-amount');
const amountValueDisplay = document.getElementById('amount-value');
const startTradingBtn = document.getElementById('start-trading');
const stopTradingBtn = document.getElementById('stop-trading');

// Performance Elements
const winRateDisplay = document.getElementById('win-rate');
const totalTradesDisplay = document.getElementById('total-trades');
const totalProfitDisplay = document.getElementById('total-profit');
const activeTradesDisplay = document.getElementById('active-trades');

// Chat Elements
const chatMessages = document.getElementById('chat-messages');
const chatInput = document.getElementById('chat-input');
const sendMessageBtn = document.getElementById('send-message');

// Settings Panel
const settingsPanel = document.getElementById('settings-panel');
const saveSettingsBtn = document.getElementById('save-settings');
const cancelSettingsBtn = document.getElementById('cancel-settings');

// State
let isDarkMode = true;
let isTrading = false;
let platformConnections = {
  robinhood: false,
  kraken: false,
  axiom: false,
  phantom: false
};
let tradeHistory = [];
let activeTradesCount = 0;
let totalTradesCount = 0;
let totalProfit = 0;
let winRate = 65; // Default win rate

/**
 * Initialize the popup
 */
function initialize() {
  // Show loading animation
  loadingContainer.classList.remove('hidden');
  mainContent.classList.add('hidden');
  
  // Simulate loading delay (in a real implementation, this would be actual initialization)
  setTimeout(() => {
    // Hide loading animation and show main content
    loadingContainer.classList.add('hidden');
    mainContent.classList.remove('hidden');
    
    // Check platform connections
    checkPlatformConnections();
    
    // Update performance metrics
    updatePerformanceMetrics();
    
    // Set initial debug indicator
    updateDebugIndicator();
  }, 1500);
  
  // Initialize event listeners
  setupEventListeners();
}

/**
 * Set up event listeners for UI elements
 */
function setupEventListeners() {
  // Sidebar navigation
  darkModeToggle.addEventListener('click', toggleDarkMode);
  chatButton.addEventListener('click', () => switchTab('chat'));
  tradeButton.addEventListener('click', () => switchTab('trade'));
  dashboardButton.addEventListener('click', () => switchTab('dashboard'));
  downloadButton.addEventListener('click', () => switchTab('download'));
  backButton.addEventListener('click', handleBackButton);
  
  // Platform connection buttons
  connectRobinhoodBtn.addEventListener('click', () => connectPlatform('robinhood'));
  connectKrakenBtn.addEventListener('click', () => connectPlatform('kraken'));
  connectAxiomBtn.addEventListener('click', () => connectPlatform('axiom'));
  connectPhantomBtn.addEventListener('click', () => connectPlatform('phantom'));
  
  // Trading controls
  tradeAmountInput.addEventListener('input', updateAmountDisplay);
  startTradingBtn.addEventListener('click', startTrading);
  stopTradingBtn.addEventListener('click', stopTrading);
  
  // Chat functionality
  chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      sendChatMessage();
    }
  });
  sendMessageBtn.addEventListener('click', sendChatMessage);
  
  // Settings panel
  saveSettingsBtn.addEventListener('click', saveSettings);
  cancelSettingsBtn.addEventListener('click', hideSettings);
  
  // Download buttons
  document.getElementById('download-history').addEventListener('click', downloadTradeHistory);
  document.getElementById('download-report').addEventListener('click', downloadPerformanceReport);
  document.getElementById('download-chrome').addEventListener('click', () => downloadExtension('chrome'));
  document.getElementById('download-firefox').addEventListener('click', () => downloadExtension('firefox'));
  document.getElementById('download-edge').addEventListener('click', () => downloadExtension('edge'));
  
  // View full stats button
  document.getElementById('view-full-stats').addEventListener('click', viewFullStats);
}

/**
 * Switch between tabs
 * 
 * @param {string} tabName - The name of the tab to switch to
 */
function switchTab(tabName) {
  // Remove active class from all sidebar buttons
  document.querySelectorAll('.sidebar-button').forEach(btn => {
    btn.classList.remove('active');
  });
  
  // Remove active class from all tab content
  document.querySelectorAll('.tab-content').forEach(tab => {
    tab.classList.remove('active');
  });
  
  // Add active class to selected tab and button
  document.getElementById(`${tabName}-tab`).classList.add('active');
  
  switch (tabName) {
    case 'chat':
      chatButton.classList.add('active');
      break;
    case 'trade':
      tradeButton.classList.add('active');
      break;
    case 'dashboard':
      dashboardButton.classList.add('active');
      break;
    case 'download':
      downloadButton.classList.add('active');
      break;
  }
}

/**
 * Handle back button click
 */
function handleBackButton() {
  // If settings panel is visible, hide it
  if (!settingsPanel.classList.contains('hidden')) {
    hideSettings();
    return;
  }
  
  // Otherwise, go back to trade tab
  switchTab('trade');
}

/**
 * Toggle dark mode
 */
function toggleDarkMode() {
  isDarkMode = !isDarkMode;
  
  if (isDarkMode) {
    document.body.classList.remove('light-mode');
    darkModeToggle.innerHTML = '<i class="fas fa-moon"></i>';
  } else {
    document.body.classList.add('light-mode');
    darkModeToggle.innerHTML = '<i class="fas fa-sun"></i>';
  }
}

/**
 * Connect to a trading platform
 * 
 * @param {string} platform - The platform to connect to
 */
function connectPlatform(platform) {
  // Show loading state on button
  const connectButton = document.getElementById(`connect-${platform}`);
  const originalText = connectButton.textContent;
  connectButton.textContent = 'Connecting...';
  connectButton.disabled = true;
  
  // Simulate connection process (in a real implementation, this would connect to the actual platform)
  setTimeout(() => {
    // Update connection status
    platformConnections[platform] = true;
    
    // Update UI
    const statusElement = document.getElementById(`${platform}-status`);
    statusElement.classList.remove('not-connected');
    statusElement.classList.add('connected');
    
    // Update button
    connectButton.textContent = 'Connected';
    
    // Send message to background script
    chrome.runtime.sendMessage({
      action: 'platformConnected',
      platform: platform
    });
    
    // Update debug indicator
    updateDebugIndicator();
    
    // Check if all required platforms are connected
    checkAllPlatformsConnected();
  }, 2000);
}

/**
 * Check if all required platforms are connected
 */
function checkAllPlatformsConnected() {
  // Enable start trading button if at least one platform is connected
  const anyConnected = Object.values(platformConnections).some(connected => connected);
  startTradingBtn.disabled = !anyConnected;
}

/**
 * Check platform connections
 */
function checkPlatformConnections() {
  // Send message to background script to check connections
  chrome.runtime.sendMessage({ action: 'checkConnections' }, (response) => {
    if (response && response.connections) {
      platformConnections = response.connections;
      
      // Update UI for each platform
      Object.keys(platformConnections).forEach(platform => {
        const statusElement = document.getElementById(`${platform}-status`);
        const connectButton = document.getElementById(`connect-${platform}`);
        
        if (platformConnections[platform]) {
          statusElement.classList.remove('not-connected');
          statusElement.classList.add('connected');
          connectButton.textContent = 'Connected';
        }
      });
      
      // Check if all required platforms are connected
      checkAllPlatformsConnected();
    }
  });
}

/**
 * Update amount display when slider changes
 */
function updateAmountDisplay() {
  amountValueDisplay.textContent = parseFloat(tradeAmountInput.value).toFixed(1);
}

/**
 * Start AI trading
 */
function startTrading() {
  // Get trading parameters
  const tradingParams = {
    strategy: tradingStrategySelect.value,
    riskLevel: riskLevelSelect.value,
    maxTrades: parseInt(maxTradesInput.value),
    winRateTarget: parseInt(winRateTargetInput.value),
    tradeAmount: parseFloat(tradeAmountInput.value)
  };
  
  // Send message to background script
  chrome.runtime.sendMessage({
    action: 'startTrading',
    params: tradingParams
  });
  
  // Update UI
  isTrading = true;
  startTradingBtn.classList.add('hidden');
  stopTradingBtn.classList.remove('hidden');
  
  // Disable trading controls
  tradingStrategySelect.disabled = true;
  riskLevelSelect.disabled = true;
  maxTradesInput.disabled = true;
  winRateTargetInput.disabled = true;
  tradeAmountInput.disabled = true;
  
  // Add system message to chat
  addSystemMessage('AI trading has been activated. I will now monitor the markets and execute trades based on your parameters.');
}

/**
 * Stop AI trading
 */
function stopTrading() {
  // Send message to background script
  chrome.runtime.sendMessage({ action: 'stopTrading' });
  
  // Update UI
  isTrading = false;
  startTradingBtn.classList.remove('hidden');
  stopTradingBtn.classList.add('hidden');
  
  // Enable trading controls
  tradingStrategySelect.disabled = false;
  riskLevelSelect.disabled = false;
  maxTradesInput.disabled = false;
  winRateTargetInput.disabled = false;
  tradeAmountInput.disabled = false;
  
  // Add system message to chat
  addSystemMessage('AI trading has been deactivated. All active trades have been closed.');
}

/**
 * Update performance metrics
 */
function updatePerformanceMetrics() {
  // In a real implementation, this would fetch actual metrics from the background script
  winRateDisplay.textContent = `${winRate}%`;
  totalTradesDisplay.textContent = totalTradesCount;
  totalProfitDisplay.textContent = `$${totalProfit.toFixed(2)}`;
  activeTradesDisplay.textContent = `${activeTradesCount}/${maxTradesInput.value}`;
}

/**
 * Send a chat message
 */
function sendChatMessage() {
  const message = chatInput.value.trim();
  
  if (message) {
    // Add user message to chat
    addUserMessage(message);
    
    // Clear input
    chatInput.value = '';
    
    // Send message to background script for AI processing
    chrome.runtime.sendMessage({
      action: 'processChatMessage',
      message: message
    }, (response) => {
      if (response && response.reply) {
        // Add AI response to chat
        addSystemMessage(response.reply);
      }
    });
    
    // For demo purposes, add a simulated AI response
    setTimeout(() => {
      const responses = [
        "I've analyzed the current market conditions and recommend focusing on momentum strategies today.",
        "Based on your trading parameters, I've identified 3 potential opportunities in the crypto market.",
        "Your current win rate is 65%, which is on target. Would you like me to adjust any parameters to potentially improve this?",
        "I've noticed increased volatility in the market. Consider reducing your position sizes temporarily.",
        "Your most profitable trades have been on Kraken. Would you like me to focus more on that platform?"
      ];
      
      const randomResponse = responses[Math.floor(Math.random() * responses.length)];
      addSystemMessage(randomResponse);
    }, 1000);
  }
}

/**
 * Add a user message to the chat
 * 
 * @param {string} message - The message to add
 */
function addUserMessage(message) {
  const messageElement = document.createElement('div');
  messageElement.className = 'message user';
  
  const contentElement = document.createElement('div');
  contentElement.className = 'message-content';
  contentElement.textContent = message;
  
  messageElement.appendChild(contentElement);
  chatMessages.appendChild(messageElement);
  
  // Scroll to bottom
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

/**
 * Add a system message to the chat
 * 
 * @param {string} message - The message to add
 */
function addSystemMessage(message) {
  const messageElement = document.createElement('div');
  messageElement.className = 'message system';
  
  const contentElement = document.createElement('div');
  contentElement.className = 'message-content';
  contentElement.textContent = message;
  
  messageElement.appendChild(contentElement);
  chatMessages.appendChild(messageElement);
  
  // Scroll to bottom
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

/**
 * Show settings panel
 */
function showSettings() {
  settingsPanel.classList.remove('hidden');
}

/**
 * Hide settings panel
 */
function hideSettings() {
  settingsPanel.classList.add('hidden');
}

/**
 * Save settings
 */
function saveSettings() {
  // Get settings values
  const settings = {
    maxTrades: parseInt(document.getElementById('settings-max-trades').value),
    winRateTarget: parseInt(document.getElementById('settings-win-rate').value),
    positionSize: parseFloat(document.getElementById('settings-position-size').value),
    riskLevel: document.querySelector('input[name="settings-risk-level"]:checked').value,
    strategy: document.getElementById('settings-strategy').value,
    takeProfit: parseInt(document.getElementById('settings-take-profit').value),
    stopLoss: parseInt(document.getElementById('settings-stop-loss').value),
    autoAdjust: document.getElementById('settings-auto-adjust').checked,
    apiKeys: {
      robinhood: document.getElementById('settings-robinhood-api').value,
      kraken: document.getElementById('settings-kraken-api').value,
      axiom: document.getElementById('settings-axiom-api').value,
      grok: document.getElementById('settings-grok-api').value
    }
  };
  
  // Send settings to background script
  chrome.runtime.sendMessage({
    action: 'saveSettings',
    settings: settings
  });
  
  // Update UI with new settings
  maxTradesInput.value = settings.maxTrades;
  winRateTargetInput.value = settings.winRateTarget;
  tradeAmountInput.value = settings.positionSize;
  riskLevelSelect.value = settings.riskLevel;
  tradingStrategySelect.value = settings.strategy;
  
  // Update amount display
  updateAmountDisplay();
  
  // Update performance metrics
  updatePerformanceMetrics();
  
  // Hide settings panel
  hideSettings();
}

/**
 * Download trade history as CSV
 */
function downloadTradeHistory() {
  // In a real implementation, this would fetch actual trade history
  // For demo purposes, generate some mock data
  const mockHistory = [
    { date: '2025-04-20', symbol: 'BTC/USD', side: 'buy', amount: 0.1, price: 72500, pnl: 250, platform: 'kraken' },
    { date: '2025-04-19', symbol: 'ETH/USD', side: 'sell', amount: 0.5, price: 3200, pnl: -75, platform: 'robinhood' },
    { date: '2025-04-18', symbol: 'SOL/USD', side: 'buy', amount: 2.0, price: 150, pnl: 60, platform: 'axiom' },
    { date: '2025-04-17', symbol: 'DOGE/USD', side: 'buy', amount: 100, price: 0.15, pnl: 10, platform: 'robinhood' },
    { date: '2025-04-16', symbol: 'BTC/USD', side: 'sell', amount: 0.05, price: 71000, pnl: 125, platform: 'kraken' }
  ];
  
  // Create CSV content
  const headers = ['Date', 'Symbol', 'Side', 'Amount', 'Price', 'PnL', 'Platform'];
  const csvContent = [
    headers.join(','),
    ...mockHistory.map(trade => [
      trade.date,
      trade.symbol,
      trade.side,
      trade.amount,
      trade.price,
      trade.pnl,
      trade.platform
    ].join(','))
  ].join('\n');
  
  // Create download link
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `tradeforce_history_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Download performance report as PDF
 */
function downloadPerformanceReport() {
  // In a real implementation, this would generate a PDF report
  // For demo purposes, just show an alert
  alert('Performance report download functionality will be available in the next update.');
}

/**
 * Download extension for a specific browser
 * 
 * @param {string} browser - The browser to download for
 */
function downloadExtension(browser) {
  // In a real implementation, this would download the appropriate extension file
  // For demo purposes, redirect to GitHub releases page
  window.open('https://github.com/tradeforce/tradeforce-extension/releases', '_blank');
}

/**
 * View full statistics
 */
function viewFullStats() {
  // Open the win-rate-monitor page in a new tab
  chrome.tabs.create({ url: chrome.runtime.getURL('win-rate-monitor.html') });
}

/**
 * Update debug indicator
 */
function updateDebugIndicator() {
  // In a real implementation, this would check for actual issues
  // For demo purposes, show a random number of issues
  const issues = Math.floor(Math.random() * 2); // 0 or 1 issues
  debugIndicator.textContent = `${issues} Issue${issues !== 1 ? 's' : ''}`;
}

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'tradeExecuted') {
    // Update trade history
    tradeHistory.push(message.trade);
    
    // Update counters
    totalTradesCount++;
    activeTradesCount++;
    totalProfit += message.trade.pnl;
    
    // Update performance metrics
    updatePerformanceMetrics();
    
    // Add system message to chat
    addSystemMessage(`Trade executed: ${message.trade.side} ${message.trade.amount} ${message.trade.symbol} at $${message.trade.price}`);
  } else if (message.action === 'tradeClosed') {
    // Update counters
    activeTradesCount--;
    
    // Update performance metrics
    updatePerformanceMetrics();
    
    // Add system message to chat
    addSystemMessage(`Trade closed: ${message.trade.symbol} with ${message.trade.pnl > 0 ? 'profit' : 'loss'} of $${Math.abs(message.trade.pnl).toFixed(2)}`);
  } else if (message.action === 'winRateUpdated') {
    // Update win rate
    winRate = message.winRate;
    
    // Update performance metrics
    updatePerformanceMetrics();
  }
});

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', initialize);
