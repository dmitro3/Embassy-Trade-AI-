/**
 * AuditLogger.js
 * 
 * A utility for tamper-proof audit logging of all trades and user actions.
 * Logs are stored locally and synced to a backend database when possible.
 */

/**
 * Audit logger for tracking trades and user actions
 */
class AuditLogger {
  /**
   * Create a new audit logger
   * 
   * @param {Object} options - Configuration options
   * @param {string} options.apiEndpoint - The API endpoint for syncing logs
   * @param {number} options.syncInterval - The interval in minutes for syncing logs
   * @param {number} options.maxRetries - The maximum number of retries for syncing logs
   * @param {number} options.retryDelay - The delay in milliseconds between retries
   */
  constructor(options = {}) {
    this.apiEndpoint = options.apiEndpoint || 'https://api.embassytrade.com/audit-logs';
    this.syncInterval = options.syncInterval || 5; // 5 minutes
    this.maxRetries = options.maxRetries || 3;
    this.retryDelay = options.retryDelay || 5000; // 5 seconds
    
    this.pendingLogs = [];
    this.syncInProgress = false;
    
    // Load pending logs from storage
    this._loadPendingLogs();
    
    // Set up periodic sync
    this._setupPeriodicSync();
  }
  
  /**
   * Log an event
   * 
   * @param {string} eventType - The type of event (e.g., 'TRADE_EXECUTED', 'WALLET_CONNECTED')
   * @param {Object} details - The event details
   * @returns {Promise<string>} - The ID of the log entry
   */
  async logEvent(eventType, details) {
    try {
      // Create a log entry
      const logEntry = this._createLogEntry(eventType, details);
      
      // Store locally first
      await this._storeLogEntry(logEntry);
      
      // Try to sync immediately
      this.syncLogs();
      
      return logEntry.id;
    } catch (error) {
      console.error('Error logging event:', error);
      throw error;
    }
  }
  
  /**
   * Log a trade execution
   * 
   * @param {Object} trade - The trade details
   * @returns {Promise<string>} - The ID of the log entry
   */
  async logTradeExecution(trade) {
    return this.logEvent('TRADE_EXECUTED', {
      platform: trade.platform,
      symbol: trade.symbol,
      side: trade.side,
      amount: trade.amount,
      price: trade.price,
      timestamp: trade.timestamp || new Date().toISOString(),
      tradeId: trade.id,
      reason: trade.reason
    });
  }
  
  /**
   * Log a trade closure
   * 
   * @param {Object} trade - The trade details
   * @returns {Promise<string>} - The ID of the log entry
   */
  async logTradeClosure(trade) {
    return this.logEvent('TRADE_CLOSED', {
      platform: trade.platform,
      symbol: trade.symbol,
      side: trade.side,
      amount: trade.amount,
      entryPrice: trade.entryPrice,
      exitPrice: trade.exitPrice,
      pnl: trade.pnl,
      pnlPercentage: trade.pnlPercentage,
      timestamp: trade.closeTime || new Date().toISOString(),
      tradeId: trade.id
    });
  }
  
  /**
   * Log a wallet connection
   * 
   * @param {string} wallet - The wallet type (e.g., 'phantom')
   * @param {string} publicKey - The public key of the wallet
   * @returns {Promise<string>} - The ID of the log entry
   */
  async logWalletConnection(wallet, publicKey) {
    return this.logEvent('WALLET_CONNECTED', {
      wallet,
      publicKey
    });
  }
  
  /**
   * Log a wallet disconnection
   * 
   * @param {string} wallet - The wallet type (e.g., 'phantom')
   * @param {string} publicKey - The public key of the wallet
   * @returns {Promise<string>} - The ID of the log entry
   */
  async logWalletDisconnection(wallet, publicKey) {
    return this.logEvent('WALLET_DISCONNECTED', {
      wallet,
      publicKey
    });
  }
  
  /**
   * Log a platform connection
   * 
   * @param {string} platform - The platform (e.g., 'robinhood', 'kraken', 'axiom')
   * @returns {Promise<string>} - The ID of the log entry
   */
  async logPlatformConnection(platform) {
    return this.logEvent('PLATFORM_CONNECTED', {
      platform
    });
  }
  
  /**
   * Log a platform disconnection
   * 
   * @param {string} platform - The platform (e.g., 'robinhood', 'kraken', 'axiom')
   * @returns {Promise<string>} - The ID of the log entry
   */
  async logPlatformDisconnection(platform) {
    return this.logEvent('PLATFORM_DISCONNECTED', {
      platform
    });
  }
  
  /**
   * Log a settings change
   * 
   * @param {Object} settings - The new settings
   * @returns {Promise<string>} - The ID of the log entry
   */
  async logSettingsChange(settings) {
    // Remove sensitive data
    const sanitizedSettings = { ...settings };
    
    if (sanitizedSettings.apiKeys) {
      // Replace API keys with a placeholder
      sanitizedSettings.apiKeys = Object.keys(sanitizedSettings.apiKeys).reduce((acc, key) => {
        acc[key] = sanitizedSettings.apiKeys[key] ? '[REDACTED]' : null;
        return acc;
      }, {});
    }
    
    return this.logEvent('SETTINGS_CHANGED', sanitizedSettings);
  }
  
  /**
   * Sync logs to the backend
   * 
   * @param {number} retryCount - The current retry count
   * @returns {Promise<boolean>} - Whether the sync was successful
   */
  async syncLogs(retryCount = 0) {
    if (this.syncInProgress || this.pendingLogs.length === 0) {
      return true;
    }
    
    this.syncInProgress = true;
    
    try {
      // Get logs from storage in case they were updated elsewhere
      await this._loadPendingLogs();
      
      if (this.pendingLogs.length === 0) {
        this.syncInProgress = false;
        return true;
      }
      
      // Send logs to backend
      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          logs: this.pendingLogs
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }
      
      // Clear synced logs
      this.pendingLogs = [];
      await this._savePendingLogs();
      
      this.syncInProgress = false;
      return true;
    } catch (error) {
      console.error('Error syncing audit logs:', error);
      
      // Retry if not exceeded max retries
      if (retryCount < this.maxRetries) {
        this.syncInProgress = false;
        
        // Exponential backoff
        const delay = this.retryDelay * Math.pow(2, retryCount);
        
        setTimeout(() => {
          this.syncLogs(retryCount + 1);
        }, delay);
        
        return false;
      }
      
      this.syncInProgress = false;
      return false;
    }
  }
  
  /**
   * Get all logs
   * 
   * @returns {Promise<Array>} - All logs
   */
  async getAllLogs() {
    try {
      // Get logs from storage
      const data = await chrome.storage.local.get('auditLogs');
      return data.auditLogs || [];
    } catch (error) {
      console.error('Error getting audit logs:', error);
      return [];
    }
  }
  
  /**
   * Clear all logs
   * 
   * @returns {Promise<boolean>} - Whether the operation was successful
   */
  async clearAllLogs() {
    try {
      await chrome.storage.local.remove(['auditLogs', 'pendingAuditLogs']);
      this.pendingLogs = [];
      return true;
    } catch (error) {
      console.error('Error clearing audit logs:', error);
      return false;
    }
  }
  
  /**
   * Create a log entry
   * 
   * @param {string} eventType - The type of event
   * @param {Object} details - The event details
   * @returns {Object} - The log entry
   * @private
   */
  _createLogEntry(eventType, details) {
    return {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      eventType,
      details,
      publicKey: this._getUserIdentifier(),
      extensionVersion: chrome.runtime.getManifest().version,
      userAgent: navigator.userAgent,
      hash: null // Will be set by _computeLogHash
    };
  }
  
  /**
   * Store a log entry
   * 
   * @param {Object} logEntry - The log entry to store
   * @returns {Promise<void>}
   * @private
   */
  async _storeLogEntry(logEntry) {
    try {
      // Compute a hash for tamper-proofing
      logEntry.hash = await this._computeLogHash(logEntry);
      
      // Add to pending logs
      this.pendingLogs.push(logEntry);
      
      // Save pending logs
      await this._savePendingLogs();
      
      // Also add to all logs
      await this._addToAllLogs(logEntry);
    } catch (error) {
      console.error('Error storing log entry:', error);
      throw error;
    }
  }
  
  /**
   * Compute a hash for a log entry
   * 
   * @param {Object} logEntry - The log entry to hash
   * @returns {Promise<string>} - The hash
   * @private
   */
  async _computeLogHash(logEntry) {
    try {
      // Create a copy without the hash field
      const logEntryForHashing = { ...logEntry };
      delete logEntryForHashing.hash;
      
      // Convert to string
      const logEntryString = JSON.stringify(logEntryForHashing);
      
      // Compute hash
      const encoder = new TextEncoder();
      const data = encoder.encode(logEntryString);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      
      // Convert to hex string
      return Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
    } catch (error) {
      console.error('Error computing log hash:', error);
      return '';
    }
  }
  
  /**
   * Get the user identifier
   * 
   * @returns {string} - The user identifier
   * @private
   */
  _getUserIdentifier() {
    // Try to get from local storage
    const publicKey = localStorage.getItem('phantom_connection_info');
    
    if (publicKey) {
      try {
        const connectionInfo = JSON.parse(publicKey);
        return connectionInfo.publicKey;
      } catch (e) {
        // Ignore
      }
    }
    
    // Fall back to a device ID
    let deviceId = localStorage.getItem('device_id');
    
    if (!deviceId) {
      deviceId = crypto.randomUUID();
      localStorage.setItem('device_id', deviceId);
    }
    
    return deviceId;
  }
  
  /**
   * Load pending logs from storage
   * 
   * @returns {Promise<void>}
   * @private
   */
  async _loadPendingLogs() {
    try {
      const data = await chrome.storage.local.get('pendingAuditLogs');
      this.pendingLogs = data.pendingAuditLogs || [];
    } catch (error) {
      console.error('Error loading pending audit logs:', error);
      this.pendingLogs = [];
    }
  }
  
  /**
   * Save pending logs to storage
   * 
   * @returns {Promise<void>}
   * @private
   */
  async _savePendingLogs() {
    try {
      await chrome.storage.local.set({ pendingAuditLogs: this.pendingLogs });
    } catch (error) {
      console.error('Error saving pending audit logs:', error);
    }
  }
  
  /**
   * Add a log entry to all logs
   * 
   * @param {Object} logEntry - The log entry to add
   * @returns {Promise<void>}
   * @private
   */
  async _addToAllLogs(logEntry) {
    try {
      // Get existing logs
      const data = await chrome.storage.local.get('auditLogs');
      const logs = data.auditLogs || [];
      
      // Add new log
      logs.push(logEntry);
      
      // Limit the number of logs stored locally (keep the most recent 1000)
      const maxLogs = 1000;
      if (logs.length > maxLogs) {
        logs.splice(0, logs.length - maxLogs);
      }
      
      // Save logs
      await chrome.storage.local.set({ auditLogs: logs });
    } catch (error) {
      console.error('Error adding to all audit logs:', error);
    }
  }
  
  /**
   * Set up periodic sync
   * 
   * @private
   */
  _setupPeriodicSync() {
    // Create an alarm for periodic sync
    chrome.alarms.create('audit_log_sync', {
      periodInMinutes: this.syncInterval
    });
    
    // Listen for alarm events
    chrome.alarms.onAlarm.addListener(alarm => {
      if (alarm.name === 'audit_log_sync') {
        this.syncLogs();
      }
    });
  }
  
  /**
   * Verify the integrity of logs
   * 
   * @returns {Promise<Object>} - The verification result
   */
  async verifyLogIntegrity() {
    try {
      // Get all logs
      const logs = await this.getAllLogs();
      
      if (logs.length === 0) {
        return {
          valid: true,
          message: 'No logs to verify',
          invalidLogs: []
        };
      }
      
      // Verify each log
      const invalidLogs = [];
      
      for (const log of logs) {
        // Skip logs without a hash
        if (!log.hash) continue;
        
        // Compute the hash
        const computedHash = await this._computeLogHash(log);
        
        // Compare with the stored hash
        if (computedHash !== log.hash) {
          invalidLogs.push({
            id: log.id,
            timestamp: log.timestamp,
            eventType: log.eventType
          });
        }
      }
      
      return {
        valid: invalidLogs.length === 0,
        message: invalidLogs.length === 0
          ? 'All logs are valid'
          : `Found ${invalidLogs.length} invalid logs`,
        invalidLogs
      };
    } catch (error) {
      console.error('Error verifying log integrity:', error);
      
      return {
        valid: false,
        message: `Error verifying logs: ${error.message}`,
        invalidLogs: []
      };
    }
  }
}

/**
 * Singleton instance of the audit logger
 */
let auditLoggerInstance = null;

/**
 * Get the audit logger instance
 * 
 * @param {Object} options - Configuration options
 * @returns {AuditLogger} - The audit logger instance
 */
function getAuditLogger(options = {}) {
  if (!auditLoggerInstance) {
    auditLoggerInstance = new AuditLogger(options);
  }
  
  return auditLoggerInstance;
}

export { AuditLogger, getAuditLogger };
