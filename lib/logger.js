/**
 * logger.js - Browser-compatible logger for Embassy Trade Bot
 * 
 * This module provides centralized logging capabilities and performance metrics 
 * collection for the trading bot and sniper functionality that works in the browser.
 * It forwards logs to the backend server at http://localhost:5000/logs.
 * Now includes fallback mechanisms for when the backend is unavailable.
 */

import axios from 'axios';
import fallbackLogger from './loggerFallback.js'; // Added .js

// Performance metrics collection class (kept from original)
class MetricsCollector {
  constructor() {
    this.reset();
  }

  reset() {
    this.snipeAttempts = 0;
    this.successfulSnipes = 0;
    this.snipeTimes = [];
    this.tradeAttempts = 0;
    this.successfulTrades = 0;
    this.apiResponseTimes = [];
    this.errors = {
      count: 0,
      byType: {}
    };
    // Performance metrics specific to AI testing
    this.aiTestRuns = 0;
    this.aiModelPerformance = {
      grok: { winRate: 0, snipeSuccessRate: 0, averageSnipeTime: 0 },
      gpt4: { winRate: 0, snipeSuccessRate: 0, averageSnipeTime: 0 }
    };
    this.patternDetectionStats = {};
  }

  recordSnipe(success, timeToSnipe) {
    this.snipeAttempts++;
    if (success) {
      this.successfulSnipes++;
    }
    if (typeof timeToSnipe === 'number') {
      this.snipeTimes.push(timeToSnipe);
    }
  }

  recordTrade(success) {
    this.tradeAttempts++;
    if (success) {
      this.successfulTrades++;
    }
  }

  recordApiResponse(responseTime) {
    if (typeof responseTime === 'number') {
      this.apiResponseTimes.push(responseTime);
    }
  }

  recordError(type = 'unknown') {
    this.errors.count++;
    this.errors.byType[type] = (this.errors.byType[type] || 0) + 1;
  }

  // Method to record AI test results
  recordAITestRun(aiModel, results) {
    this.aiTestRuns++;
    
    if (aiModel === 'grok' || aiModel === 'gpt4') {
      this.aiModelPerformance[aiModel] = {
        winRate: parseFloat(results.summary?.winRate || 0),
        snipeSuccessRate: parseFloat(results.summary?.snipeSuccessRate || 0),
        averageSnipeTime: parseFloat(results.summary?.averageSnipeTime || 0)
      };
    }
    
    // Record pattern detection statistics
    if (results.patterns) {
      Object.keys(results.patterns).forEach(pattern => {
        if (!this.patternDetectionStats[pattern]) {
          this.patternDetectionStats[pattern] = [];
        }
        
        this.patternDetectionStats[pattern].push({
          successRate: results.patterns[pattern].successRate,
          timestamp: Date.now()
        });
      });
    }
    
    logger.info(`AI Test Run (${aiModel}) completed`, {
      winRate: results.summary?.winRate,
      snipeSuccessRate: results.summary?.snipeSuccessRate,
      averageSnipeTime: results.summary?.averageSnipeTime,
      timestamp: Date.now()
    });
  }

  getMetrics() {
    const snipeSuccessRate = this.snipeAttempts > 0 
      ? (this.successfulSnipes / this.snipeAttempts) * 100 
      : 0;

    const tradeSuccessRate = this.tradeAttempts > 0 
      ? (this.successfulTrades / this.tradeAttempts) * 100 
      : 0;

    const averageSnipeTime = this.snipeTimes.length > 0 
      ? this.snipeTimes.reduce((sum, time) => sum + time, 0) / this.snipeTimes.length 
      : 0;

    const averageApiResponseTime = this.apiResponseTimes.length > 0 
      ? this.apiResponseTimes.reduce((sum, time) => sum + time, 0) / this.apiResponseTimes.length 
      : 0;

    return {
      snipeAttempts: this.snipeAttempts,
      successfulSnipes: this.successfulSnipes,
      snipeSuccessRate,
      averageSnipeTime,
      tradeAttempts: this.tradeAttempts,
      successfulTrades: this.successfulTrades,
      tradeSuccessRate,
      averageApiResponseTime,
      errorCount: this.errors.count,
      errorsByType: this.errors.byType,
      aiTestRuns: this.aiTestRuns,
      aiModelPerformance: this.aiModelPerformance,
      patternDetectionStats: this.patternDetectionStats
    };
  }
}

// Create metrics collector instance
const metrics = new MetricsCollector();

// Browser-compatible logger that forwards logs to the backend
class BrowserLogger {
  constructor() {
    this.logQueue = [];
    this.isProcessing = false;
    this.serverUrl = 'http://localhost:5000/logs';
    this.backendAvailable = true; // Track if backend is available
    this.failedAttempts = 0;
    this.retryTimeout = null;
    this.localStorageKey = 'embassyTrade_logs';
    
    // Check backend availability when created
    this._checkBackendAvailability();
  }
  
  // Check if backend is available
  async _checkBackendAvailability() {
    let timeoutId;
    try {
      const controller = new AbortController();
      timeoutId = setTimeout(() => controller.abort(), 2000);
      const response = await fetch(`${this.serverUrl.replace('/logs', '')}/api/health`, {
        method: 'GET',
        signal: controller.signal
      });
      if (timeoutId) clearTimeout(timeoutId);
      this.backendAvailable = response.ok;
      if (!this.backendAvailable) {
        console.warn('Backend server is not available, using fallback logger');
      }
    } catch (error) {
      if (timeoutId) clearTimeout(timeoutId);
      console.warn('Backend server check failed, using fallback logger', error.message);
      this.backendAvailable = false;
    }
  }
  // Helper method to store logs locally
  _storeLocally(log) {
    try {
      // Use our fallback logger
      const fallbackMethod = log.level === 'error' ? 'error' : 
                             log.level === 'warn' ? 'warn' : 
                             log.level === 'debug' ? 'debug' : 'info';
      
      fallbackLogger[fallbackMethod](log.message, log.meta);
    } catch (e) {
      console.error('Failed to store log locally:', e);
    }
  }

  async _processLogQueue() {
    let timeoutId;
    if (this.isProcessing || this.logQueue.length === 0) {
      return;
    }
    this.isProcessing = true;
    try {
      const log = this.logQueue.shift();
      // Add a timeout to the axios request
      const controller = new AbortController();
      timeoutId = setTimeout(() => controller.abort(), 2000);
      await axios.post(this.serverUrl, {
        level: log.level,
        message: log.message,
        timestamp: log.timestamp,
        ...log.meta
      }, { 
        timeout: 3000, // 3 second timeout
        keepAlive: true
      });
      if (timeoutId) clearTimeout(timeoutId);
      // Reset counters on success
      this.backendAvailable = true;
      this.failedAttempts = 0;
      
      // If there are more logs, process the next one
      if (this.logQueue.length > 0) {
        setTimeout(() => this._processLogQueue(), 50);
      }    } catch (error) {
      this.failedAttempts++;
      this.backendAvailable = false;
      if (timeoutId) clearTimeout(timeoutId);
      // Don't show the error in console repeatedly
      if (this.failedAttempts <= 3) {
        console.warn(`Failed to forward log to backend: ${error.message}. Will store locally.`);
      }
      
      // Store the failed log locally using our fallback logger
      const failedLog = this.logQueue.length > 0 ? this.logQueue.shift() : null;
      if (failedLog) {
        this._storeLocally(failedLog);
      }
      
      // Process remaining queue using fallback logger when backend is unavailable
      while (this.logQueue.length > 0) {
        this._storeLocally(this.logQueue.shift());
      }
      
      // Retry connecting to backend after a delay, but don't block app functionality
      if (!this.retryTimeout) {
        const retryDelay = Math.min(1000 * Math.pow(2, this.failedAttempts), 30000); // Exponential backoff, max 30 seconds
        this.retryTimeout = setTimeout(() => {
          this.retryTimeout = null;
          this._checkBackendAvailability(); // Check if backend is back online
          this._processLogQueue();
        }, retryDelay);
      }
      
      // Continue processing the queue
      if (this.logQueue.length > 0) {
        setTimeout(() => this._processLogQueue(), 100);
      }
    }
    
    this.isProcessing = false;
  }
  
  // Store logs locally when backend is unavailable
  _storeLocally(log) {
    try {
      const localLogs = JSON.parse(localStorage.getItem('embassy_logs') || '[]');
      localLogs.push(log);
      // Keep only the most recent 1000 logs
      while (localLogs.length > 1000) {
        localLogs.shift();
      }
      localStorage.setItem('embassy_logs', JSON.stringify(localLogs));
    } catch (e) {
      // Silently fail if localStorage is not available
    }
  }

  _addToQueue(level, message, meta = {}) {
    const timestamp = new Date().toISOString();
    
    this.logQueue.push({
      level,
      message,
      timestamp,
      meta
    });
    
    // Start processing queue if not already processing
    if (!this.isProcessing) {
      this._processLogQueue();
    }
    
    return { level, message, timestamp, meta };
  }

  _log(level, message, meta = {}) {
    const logInfo = this._addToQueue(level, message, meta);
    
    // Also log to console with appropriate formatting
    const formattedMeta = Object.keys(meta).length > 0 ? JSON.stringify(meta) : '';
    const consoleMessage = `${logInfo.timestamp} [${level.toUpperCase()}] ${message} ${formattedMeta}`;
    
    switch (level) {
      case 'error':
        console.error(consoleMessage);
        break;
      case 'warn':
        console.warn(consoleMessage);
        break;
      case 'info':
        console.info(consoleMessage);
        break;
      case 'debug':
        console.debug(consoleMessage);
        break;
      default:
        console.log(consoleMessage);
    }
    
    return logInfo;
  }

  error(message, meta = {}) {
    return this._log('error', message, meta);
  }

  warn(message, meta = {}) {
    return this._log('warn', message, meta);
  }

  info(message, meta = {}) {
    return this._log('info', message, meta);
  }

  debug(message, meta = {}) {
    return this._log('debug', message, meta);
  }
  
  // Additional method to handle authenticated logs with wallet
  async logWithWallet(level, message, wallet, meta = {}) {
    try {
      if (!wallet || !wallet.publicKey) {
        return this._log(level, message, meta);
      }
      
      const user = wallet.publicKey.toString();
      let signature = null;
      
      try {
        const authMessage = `Sign to authenticate: ${user}`;
        const messageBytes = new TextEncoder().encode(authMessage);
        const signatureBytes = await wallet.signMessage(messageBytes);
        signature = Array.from(signatureBytes).map(b => b.toString(16).padStart(2, '0')).join('');
      } catch (signError) {
        console.warn("Failed to sign log message:", signError.message);
      }
      
      return this._log(level, message, {
        ...meta,
        wallet: user,
        authenticated: !!signature,
        signature
      });
    } catch (error) {
      console.error("Error in logWithWallet:", error);
      return this._log(level, message, meta);
    }
  }
}

// Create logger instance
const logger = new BrowserLogger();
const aiTestingLogger = logger; // Use the same logger instance for AI testing
const performanceLogger = logger; // Use the same logger instance for performance

// Log initialization
logger.info('Browser logger initialized for Embassy Trade Bot');

export { logger, aiTestingLogger, performanceLogger, metrics };
export default logger;