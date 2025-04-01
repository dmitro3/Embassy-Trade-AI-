const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// specific Electron APIs without exposing the entire API
contextBridge.exposeInMainWorld('electron', {
  // Notification API
  notification: {
    show: (options) => ipcRenderer.send('show-notification', options)
  },
  
  // Dialog API
  dialog: {
    show: (options) => ipcRenderer.invoke('show-dialog', options)
  },
  
  // App info
  appInfo: {
    version: process.env.npm_package_version || '0.1.0',
    platform: process.platform,
    isDesktopApp: true // Flag to identify desktop app
  },
  
  // Online/Offline mode handling
  connectivity: {
    checkOnlineStatus: () => ipcRenderer.invoke('check-online-status'),
    useOfflineMode: () => ipcRenderer.send('use-offline-mode'),
    useOnlineMode: () => ipcRenderer.send('use-online-mode')
  },
  
  // New moonshot sniper feature
  moonshot: {
    fetchListings: () => ipcRenderer.invoke('fetch-moonshot-listings'),
    invest: (coin, amount) => ipcRenderer.invoke('invest-moonshot', { coin, amount })
  },
  
  // Auto-trading feature
  autoTrading: {
    startDeepSearch: () => ipcRenderer.invoke('start-auto-trade-search'),
    executeTrade: (trade) => ipcRenderer.invoke('execute-auto-trade', trade),
    getSearchResults: () => ipcRenderer.invoke('get-auto-trade-results')
  },
  
  // Feedback system
  feedback: {
    submitFeedback: (data) => ipcRenderer.invoke('submit-feedback', data)
  },
  
  // IPC for receiving messages from main process
  on: (channel, callback) => {
    // Whitelist channels to listen to
    const validChannels = [
      'toggle-auto-trading', 
      'update-trading-status', 
      'update-available', 
      'update-progress', 
      'update-downloaded',
      'auto-trade-progress',
      'patch-applied'
    ];
    
    if (validChannels.includes(channel)) {
      // Remove any old listeners to avoid duplicates
      ipcRenderer.removeAllListeners(channel);
      // Add new listener
      ipcRenderer.on(channel, (_, data) => callback(data));
    }
  },
  
  // IPC for sending messages to main process
  send: (channel, data) => {
    // Whitelist channels to send to
    const validChannels = [
      'trading-status-update', 
      'log-data', 
      'check-for-updates', 
      'install-update',
      'open-web-version'
    ];
    
    if (validChannels.includes(channel)) {
      ipcRenderer.send(channel, data);
    }
  }
});