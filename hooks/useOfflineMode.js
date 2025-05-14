import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Hook to provide offline mode capabilities to the application
 * @param {Object} options Configuration options
 * @param {Function} options.onOfflineStart Callback when entering offline mode
 * @param {Function} options.onOfflineEnd Callback when exiting offline mode
 * @param {Function} options.onConnectivityChange Callback when connectivity changes
 * @param {boolean} options.enableOfflineMode Whether to enable offline mode
 * @param {boolean} options.enableNotifications Whether to enable notifications
 * @returns {Object} Offline mode state and utilities
 */
export function useOfflineMode({
  onOfflineStart,
  onOfflineEnd,
  onConnectivityChange,
  enableOfflineMode = true,
  enableNotifications = true
} = {}) {
  // State to track online/offline status
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  
  // State to track offline mode
  const [offlineModeEnabled, setOfflineModeEnabled] = useState(false);
  
  // Track offline duration
  const [offlineDuration, setOfflineDuration] = useState(0);
  
  // Track offline start time
  const offlineStartTimeRef = useRef(null);
  
  // Interval for updating offline duration
  const durationIntervalRef = useRef(null);
  
  // Track pending operations that need to be synced
  const [pendingOperations, setPendingOperations] = useState([]);
  
  /**
   * Handle going offline
   */
  const handleOffline = useCallback(() => {
    setIsOnline(false);
    
    if (enableOfflineMode) {
      setOfflineModeEnabled(true);
      offlineStartTimeRef.current = Date.now();
      
      // Start tracking offline duration
      durationIntervalRef.current = setInterval(() => {
        if (offlineStartTimeRef.current) {
          const duration = Math.floor((Date.now() - offlineStartTimeRef.current) / 1000);
          setOfflineDuration(duration);
        }
      }, 1000);
      
      // Call offline start callback
      if (onOfflineStart) {
        onOfflineStart();
      }
      
      // Show notification
      if (enableNotifications) {
        try {
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('TradeForce AI - Offline Mode', {
              body: 'Your connection has been lost. The app has entered offline mode.',
              icon: '/icons/offline.png'
            });
          }
        } catch (error) {
          console.warn('Failed to show offline notification:', error);
        }
      }
    }
    
    if (onConnectivityChange) {
      onConnectivityChange(false);
    }
  }, [enableOfflineMode, onOfflineStart, onConnectivityChange, enableNotifications]);
  
  /**
   * Handle coming back online
   */
  const handleOnline = useCallback(() => {
    setIsOnline(true);
    
    if (offlineModeEnabled) {
      setOfflineModeEnabled(false);
      
      // Clear offline duration tracking
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }
      
      // Calculate total offline time
      const totalOfflineTime = offlineStartTimeRef.current 
        ? Math.floor((Date.now() - offlineStartTimeRef.current) / 1000)
        : 0;
      
      // Reset offline tracking
      offlineStartTimeRef.current = null;
      setOfflineDuration(0);
      
      // Call offline end callback
      if (onOfflineEnd) {
        onOfflineEnd(totalOfflineTime);
      }
      
      // Show notification
      if (enableNotifications) {
        try {
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('TradeForce AI - Back Online', {
              body: `Your connection has been restored. You were offline for ${formatDuration(totalOfflineTime)}.`,
              icon: '/icons/online.png'
            });
          }
        } catch (error) {
          console.warn('Failed to show online notification:', error);
        }
      }
      
      // Auto-sync pending operations
      if (pendingOperations.length > 0) {
        syncPendingOperations();
      }
    }
    
    if (onConnectivityChange) {
      onConnectivityChange(true);
    }
  }, [offlineModeEnabled, onOfflineEnd, onConnectivityChange, pendingOperations, enableNotifications]);
  
  /**
   * Format duration in seconds to human readable string
   */
  const formatDuration = (seconds) => {
    if (seconds < 60) {
      return `${seconds} seconds`;
    } else if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      return `${minutes} minute${minutes !== 1 ? 's' : ''}${remainingSeconds ? ` ${remainingSeconds} seconds` : ''}`;
    } else {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      return `${hours} hour${hours !== 1 ? 's' : ''}${minutes ? ` ${minutes} minute${minutes !== 1 ? 's' : ''}` : ''}`;
    }
  };
  
  /**
   * Add operation to pending queue
   */
  const addPendingOperation = useCallback((operation) => {
    setPendingOperations(prev => [...prev, {
      ...operation,
      id: `op-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now()
    }]);
    
    return true;
  }, []);
  
  /**
   * Sync pending operations
   */
  const syncPendingOperations = useCallback(async () => {
    if (!isOnline || pendingOperations.length === 0) {
      return { success: false, reason: !isOnline ? 'offline' : 'no-operations' };
    }
    
    const operations = [...pendingOperations];
    let successCount = 0;
    let failureCount = 0;
    
    // Process operations in order
    for (const operation of operations) {
      try {
        // Process based on operation type
        switch (operation.type) {
          case 'trade':
            // Implement trade sync logic
            await syncTradeOperation(operation);
            break;
          case 'wallet-update':
            // Implement wallet update sync logic
            await syncWalletOperation(operation);
            break;
          case 'api-request':
            // Implement API request sync logic
            await syncApiRequest(operation);
            break;
          default:
            console.warn(`Unknown operation type: ${operation.type}`);
            failureCount++;
            continue;
        }
        
        // Mark operation as processed
        setPendingOperations(prev => prev.filter(op => op.id !== operation.id));
        successCount++;
      } catch (error) {
        console.error(`Failed to sync operation ${operation.id}:`, error);
        failureCount++;
      }
    }
    
    // Return summary
    return {
      success: successCount > 0,
      successCount,
      failureCount,
      remaining: pendingOperations.length - successCount
    };
  }, [isOnline, pendingOperations]);
  
  /**
   * Sync a trade operation
   */
  const syncTradeOperation = async (operation) => {
    try {
      const response = await fetch('/api/trade/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...operation.data,
          offlineCreatedAt: operation.timestamp
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to sync trade: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Trade sync error:', error);
      throw error;
    }
  };
  
  /**
   * Sync a wallet operation
   */
  const syncWalletOperation = async (operation) => {
    try {
      const response = await fetch('/api/wallet/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...operation.data,
          offlineCreatedAt: operation.timestamp
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to sync wallet operation: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Wallet sync error:', error);
      throw error;
    }
  };
  
  /**
   * Sync an API request
   */
  const syncApiRequest = async (operation) => {
    try {
      const { url, method, data } = operation.data;
      
      const response = await fetch(url, {
        method: method || 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Offline-Sync': 'true',
          'X-Offline-Timestamp': operation.timestamp.toString()
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to sync API request: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('API request sync error:', error);
      throw error;
    }
  };
  
  /**
   * Request notification permission
   */
  const requestNotificationPermission = useCallback(async () => {
    if (!('Notification' in window)) {
      return { granted: false, reason: 'not-supported' };
    }
    
    if (Notification.permission === 'granted') {
      return { granted: true };
    }
    
    if (Notification.permission === 'denied') {
      return { granted: false, reason: 'denied' };
    }
    
    try {
      const permission = await Notification.requestPermission();
      return { granted: permission === 'granted' };
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return { granted: false, reason: 'error', error };
    }
  }, []);
  
  // Set up online/offline listeners
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
      
      // Initialize with current state
      setIsOnline(navigator.onLine);
      
      // Request notification permission
      if (enableNotifications) {
        requestNotificationPermission();
      }
      
      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
        
        if (durationIntervalRef.current) {
          clearInterval(durationIntervalRef.current);
        }
      };
    }
  }, [handleOnline, handleOffline, enableNotifications, requestNotificationPermission]);
  
  return {
    isOnline,
    offlineModeEnabled,
    offlineDuration,
    formattedOfflineDuration: formatDuration(offlineDuration),
    pendingOperations,
    pendingOperationCount: pendingOperations.length,
    addPendingOperation,
    syncPendingOperations,
    requestNotificationPermission
  };
}

export default useOfflineMode;
