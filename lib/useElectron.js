import { useState, useEffect, useCallback } from 'react';

/**
 * Custom hook to interact with Electron features from React components
 * Safely falls back to web functionality when running in browser
 * Supports hybrid online/offline mode for Vercel deployment
 */
export default function useElectron() {
  const [isElectron, setIsElectron] = useState(false);
  const [isDesktopApp, setIsDesktopApp] = useState(false);
  const [appVersion, setAppVersion] = useState('0.1.0');
  const [platform, setPlatform] = useState('web');
  const [isOnline, setIsOnline] = useState(true);
  const [autoTradeProgress, setAutoTradeProgress] = useState(0);

  // Initialize on mount
  useEffect(() => {
    const isRunningInElectron = window?.electron !== undefined;
    setIsElectron(isRunningInElectron);
    
    if (isRunningInElectron) {
      setAppVersion(window.electron.appInfo?.version || '0.1.0');
      setPlatform(window.electron.appInfo?.platform || 'web');
      setIsDesktopApp(window.electron.appInfo?.isDesktopApp || false);
      
      // Check online status
      window.electron.connectivity.checkOnlineStatus().then(online => {
        setIsOnline(online);
      });
      
      // Listen for auto trade progress updates
      window.electron.on('auto-trade-progress', (data) => {
        setAutoTradeProgress(data.progress);
      });
      
      // Listen for patch applied notifications
      window.electron.on('patch-applied', (data) => {
        showNotification('Auto-Patch Applied', data.message);
      });
    }
  }, []);

  /**
   * Switch to online mode (load app from Vercel)
   */
  const useOnlineMode = useCallback(() => {
    if (isElectron && window.electron.connectivity) {
      window.electron.connectivity.useOnlineMode();
      setIsOnline(true);
    }
  }, [isElectron]);

  /**
   * Switch to offline mode (load app from local)
   */
  const useOfflineMode = useCallback(() => {
    if (isElectron && window.electron.connectivity) {
      window.electron.connectivity.useOfflineMode();
      setIsOnline(false);
    }
  }, [isElectron]);

  /**
   * Check if we're currently online
   */
  const checkOnlineStatus = useCallback(async () => {
    if (isElectron && window.electron.connectivity) {
      const status = await window.electron.connectivity.checkOnlineStatus();
      setIsOnline(status);
      return status;
    }
    return navigator.onLine;
  }, [isElectron]);

  /**
   * Show a native desktop notification
   */
  const showNotification = useCallback((title, body) => {
    if (isElectron) {
      window.electron.notification.show({ title, body });
    } else if ('Notification' in window) {
      // Fallback to web notifications
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          new Notification(title, { body });
        }
      });
    } else {
      console.log(`Notification: ${title} - ${body}`);
    }
  }, [isElectron]);

  /**
   * Show a dialog box
   */
  const showDialog = useCallback(async (type, title, message) => {
    if (isElectron) {
      return await window.electron.dialog.show({ type, title, message });
    } else {
      // Fallback to browser alerts
      alert(`${title}: ${message}`);
      return { response: 0 };
    }
  }, [isElectron]);

  /**
   * Listen to auto trading toggle events from the system tray
   */
  const onAutoTradingToggle = useCallback((callback) => {
    if (isElectron) {
      window.electron.on('toggle-auto-trading', callback);
      return () => {
        // Cleanup function for useEffect
        window.electron.on('toggle-auto-trading', null);
      };
    }
    return () => {}; // Empty cleanup function for web
  }, [isElectron]);

  /**
   * Send trading status updates to main process for logging
   */
  const sendTradingStatus = useCallback((status) => {
    if (isElectron) {
      window.electron.send('trading-status-update', status);
    } else {
      console.log('Trading Status Update:', status);
    }
  }, [isElectron]);

  /**
   * Log data to the desktop app's log files
   */
  const logData = useCallback((level, message, data) => {
    if (isElectron) {
      window.electron.send('log-data', { level, message, data });
    } else {
      if (level === 'error') {
        console.error(message, data);
      } else {
        console.log(message, data);
      }
    }
  }, [isElectron]);

  /**
   * Open the web version in browser
   */
  const openWebVersion = useCallback(() => {
    if (isElectron) {
      window.electron.send('open-web-version');
    } else {
      // Already in web version, do nothing
      console.log('Already in web version');
    }
  }, [isElectron]);

  /**
   * Fetch moonshot listings (new coin listings)
   */
  const fetchMoonshotListings = useCallback(async () => {
    if (isElectron && window.electron.moonshot) {
      return await window.electron.moonshot.fetchListings();
    } else {
      // Web fallback - mock data
      return [
        { id: 1, name: 'New Token A', ticker: 'NTA', listing: 'Major Exchange Launch', potentialGain: '+120%', risk: 'High' },
        { id: 2, name: 'DeFi Project B', ticker: 'DPB', listing: 'Cross-Chain Integration', potentialGain: '+85%', risk: 'Medium' },
        { id: 3, name: 'Gaming Token C', ticker: 'GTC', listing: 'Partnership Announcement', potentialGain: '+200%', risk: 'Very High' }
      ];
    }
  }, [isElectron]);

  /**
   * Invest in moonshot coin
   */
  const investInMoonshot = useCallback(async (coin, amount) => {
    if (isElectron && window.electron.moonshot) {
      return await window.electron.moonshot.invest(coin, amount);
    } else {
      // Web fallback - mock response
      return {
        success: true,
        message: `Simulated investment of $${amount} in ${coin.name}`,
        transactionId: `MOCK-${Date.now()}`
      };
    }
  }, [isElectron]);

  /**
   * Start AI-driven deep search for auto trading opportunities
   */
  const startAutoTradeSearch = useCallback(async () => {
    if (isElectron && window.electron.autoTrading) {
      return await window.electron.autoTrading.startDeepSearch();
    } else {
      // Web fallback - simulate progress updates
      setAutoTradeProgress(0);
      const interval = setInterval(() => {
        setAutoTradeProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            return 100;
          }
          return prev + 10;
        });
      }, 500);
      
      return { simulated: true };
    }
  }, [isElectron]);

  /**
   * Get auto trade search results
   */
  const getAutoTradeResults = useCallback(async () => {
    if (isElectron && window.electron.autoTrading) {
      return await window.electron.autoTrading.getSearchResults();
    } else {
      // Web fallback - mock results
      return [
        { id: 1, pair: 'BTC/USDT', strategy: 'Breakout', profitPotential: '+3.2%', risk: 'Medium', volume: '$1.2B' },
        { id: 2, pair: 'ETH/USDT', strategy: 'Reversion', profitPotential: '+2.8%', risk: 'Low', volume: '$800M' },
        { id: 3, pair: 'SOL/USDT', strategy: 'Momentum', profitPotential: '+5.5%', risk: 'High', volume: '$450M' }
      ];
    }
  }, [isElectron]);

  /**
   * Execute an auto trade
   */
  const executeAutoTrade = useCallback(async (trade) => {
    if (isElectron && window.electron.autoTrading) {
      return await window.electron.autoTrading.executeTrade(trade);
    } else {
      // Web fallback - mock execution
      return {
        success: true,
        message: `Simulated trade execution for ${trade.pair}`,
        orderId: `MOCK-${Date.now()}`
      };
    }
  }, [isElectron]);

  /**
   * Submit user feedback (bug reports, feature requests, etc.)
   */
  const submitFeedback = useCallback(async (data) => {
    if (isElectron && window.electron.feedback) {
      return await window.electron.feedback.submitFeedback(data);
    } else {
      // Web fallback - log to console and mock success
      console.log('Feedback submitted:', data);
      return { success: true, id: Date.now() };
    }
  }, [isElectron]);

  return {
    isElectron,
    isDesktopApp,
    appVersion,
    platform,
    isOnline,
    autoTradeProgress,
    useOnlineMode,
    useOfflineMode,
    checkOnlineStatus,
    showNotification,
    showDialog,
    onAutoTradingToggle,
    sendTradingStatus,
    logData,
    openWebVersion,
    fetchMoonshotListings,
    investInMoonshot,
    startAutoTradeSearch,
    getAutoTradeResults,
    executeAutoTrade,
    submitFeedback
  };
}