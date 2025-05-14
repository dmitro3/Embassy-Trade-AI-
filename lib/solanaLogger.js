'use client';

import logger from './logger';

/**
 * Enhanced Solana transaction and performance logging system
 * 
 * This logger extends the base logger with specialized methods for tracking
 * Solana blockchain transactions, performance metrics, and trade execution
 */
class SolanaLogger {
  constructor() {
    this.baseLogger = logger;
    this.perfMetrics = {
      transactionTimes: [],
      loadTimes: [],
      blockchainQueries: 0,
      errors: {
        count: 0,
        types: {}
      },
      lastRefreshTime: 0
    };
    
    // Buffer for batch logging
    this.logBuffer = [];
    
    // Set flush interval to write logs in batches
    if (typeof window !== 'undefined') {
      this.flushInterval = setInterval(() => this.flushLogs(), 10000); // Flush every 10 seconds
    }
  }
  
  /**
   * Log transaction start
   * 
   * @param {String} txId - Transaction ID or signature
   * @param {Object} metadata - Additional transaction context
   */
  txStart(txId, metadata = {}) {
    const txRecord = {
      id: txId,
      startTime: performance.now(),
      metadata,
      status: 'pending'
    };
    
    // Store in memory
    if (typeof window !== 'undefined') {
      window._solanaTxRecords = window._solanaTxRecords || {};
      window._solanaTxRecords[txId] = txRecord;
    }
    
    this.baseLogger.info(`Solana TX started: ${txId}`, {
      action: 'tx_start',
      txId,
      ...metadata
    });
  }
  
  /**
   * Log transaction completion
   * 
   * @param {String} txId - Transaction ID or signature
   * @param {Boolean} success - Whether the transaction succeeded
   * @param {Object} result - Transaction result data 
   */
  txEnd(txId, success = true, result = {}) {
    // Get stored record if available
    let txRecord;
    if (typeof window !== 'undefined' && window._solanaTxRecords) {
      txRecord = window._solanaTxRecords[txId];
    }
    
    const endTime = performance.now();
    const duration = txRecord ? endTime - txRecord.startTime : null;
    
    if (duration) {
      this.perfMetrics.transactionTimes.push(duration);
      
      // Keep only last 100 transaction times
      if (this.perfMetrics.transactionTimes.length > 100) {
        this.perfMetrics.transactionTimes.shift();
      }
    }
    
    // Update status
    if (txRecord) {
      txRecord.status = success ? 'success' : 'failed';
      txRecord.endTime = endTime;
      txRecord.duration = duration;
      txRecord.result = result;
    }
    
    const logMethod = success ? 'info' : 'error';
    this.baseLogger[logMethod](`Solana TX ${success ? 'completed' : 'failed'}: ${txId}`, {
      action: 'tx_end',
      txId,
      duration,
      success,
      ...result
    });
  }
  
  /**
   * Log blockchain query
   * 
   * @param {String} queryType - Type of query (getParsedTransaction, getSignaturesForAddress, etc.)
   * @param {Object} params - Query parameters
   */
  blockchainQuery(queryType, params = {}) {
    this.perfMetrics.blockchainQueries++;
    
    this.logBuffer.push({
      timestamp: Date.now(),
      level: 'debug',
      message: `Solana blockchain query: ${queryType}`,
      data: {
        action: 'blockchain_query',
        queryType,
        params
      }
    });
  }
  
  /**
   * Log trade detection
   * 
   * @param {String} signature - Transaction signature
   * @param {Object} tradeDetails - Trade details extracted from the transaction
   */
  tradeDetected(signature, tradeDetails) {
    this.baseLogger.info(`Solana trade detected: ${signature.substring(0, 8)}...`, {
      action: 'trade_detected',
      signature,
      tradeDetails
    });
  }
  
  /**
   * Log performance metric
   * 
   * @param {String} metricName - Name of the metric
   * @param {Number} value - Metric value
   * @param {String} unit - Unit of measurement
   */
  recordMetric(metricName, value, unit = 'ms') {
    this.logBuffer.push({
      timestamp: Date.now(),
      level: 'debug',
      message: `Metric: ${metricName} = ${value} ${unit}`,
      data: {
        action: 'metric',
        name: metricName,
        value,
        unit
      }
    });
    
    // Update specific metrics
    if (metricName === 'loadTime') {
      this.perfMetrics.loadTimes.push(value);
      
      // Keep only last 20 load times
      if (this.perfMetrics.loadTimes.length > 20) {
        this.perfMetrics.loadTimes.shift();
      }
    }
  }
  
  /**
   * Log an error with categorization
   * 
   * @param {String} errorType - Category of error
   * @param {String} message - Error message
   * @param {Error|Object} error - Error object or details
   */
  solanaError(errorType, message, error = {}) {
    // Track error metrics
    this.perfMetrics.errors.count++;
    this.perfMetrics.errors.types[errorType] = (this.perfMetrics.errors.types[errorType] || 0) + 1;
    
    // Log the error
    this.baseLogger.error(`Solana error (${errorType}): ${message}`, error);
  }
  
  /**
   * Get performance metrics summary
   * 
   * @returns {Object} Performance metrics
   */
  getPerformanceMetrics() {
    const metrics = { ...this.perfMetrics };
    
    // Calculate averages
    if (metrics.transactionTimes.length > 0) {
      metrics.avgTransactionTime = metrics.transactionTimes.reduce((sum, time) => sum + time, 0) / 
        metrics.transactionTimes.length;
    } else {
      metrics.avgTransactionTime = 0;
    }
    
    if (metrics.loadTimes.length > 0) {
      metrics.avgLoadTime = metrics.loadTimes.reduce((sum, time) => sum + time, 0) / 
        metrics.loadTimes.length;
    } else {
      metrics.avgLoadTime = 0;
    }
    
    return metrics;
  }
  
  /**
   * Record data refresh timing
   */
  recordRefresh() {
    const now = Date.now();
    const lastRefresh = this.perfMetrics.lastRefreshTime;
    
    if (lastRefresh > 0) {
      const refreshInterval = now - lastRefresh;
      this.recordMetric('refreshInterval', refreshInterval, 'ms');
    }
    
    this.perfMetrics.lastRefreshTime = now;
  }
  
  /**
   * Flush buffered logs to base logger
   * 
   * @private
   */
  flushLogs() {
    if (this.logBuffer.length === 0) return;
    
    // Group similar logs
    const groupedLogs = this.logBuffer.reduce((groups, log) => {
      const key = `${log.level}-${log.data?.action || 'unknown'}`;
      groups[key] = groups[key] || [];
      groups[key].push(log);
      return groups;
    }, {});
    
    // Log summaries for each group
    Object.entries(groupedLogs).forEach(([key, logs]) => {
      const firstLog = logs[0];
      if (logs.length <= 3) {
        // Log individual entries if there are only a few
        logs.forEach(log => {
          this.baseLogger[log.level](log.message, log.data);
        });
      } else {
        // Log a summary for larger groups
        this.baseLogger[firstLog.level](
          `${firstLog.message} (${logs.length} similar events)`, 
          { 
            action: firstLog.data?.action,
            count: logs.length,
            firstTimestamp: new Date(logs[0].timestamp).toISOString(),
            lastTimestamp: new Date(logs[logs.length - 1].timestamp).toISOString()
          }
        );
      }
    });
    
    // Clear buffer
    this.logBuffer = [];
  }
  
  /**
   * Create a report of Solana activities
   * 
   * @returns {Object} Activity report
   */
  generateActivityReport() {
    const metrics = this.getPerformanceMetrics();
    
    // Get transaction records
    let transactions = [];
    if (typeof window !== 'undefined' && window._solanaTxRecords) {
      transactions = Object.values(window._solanaTxRecords)
        .sort((a, b) => (b.startTime || 0) - (a.startTime || 0))
        .slice(0, 50); // Only keep the 50 most recent
    }
    
    return {
      timestamp: new Date().toISOString(),
      metrics,
      recentTransactions: transactions.map(tx => ({
        id: tx.id,
        status: tx.status,
        duration: tx.duration,
        startTime: new Date(tx.startTime).toISOString(),
        metadata: tx.metadata
      }))
    };
  }
}

// Create singleton instance
const solanaLogger = new SolanaLogger();

export default solanaLogger;
