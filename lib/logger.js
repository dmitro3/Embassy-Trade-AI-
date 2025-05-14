'use client';

/**
 * Enhanced logging system with context tracking
 * Provides structured logging capabilities for better error tracking and diagnosis
 */
export const logger = {
  /**
   * Log an informational message
   * 
   * @param {string} message - The message to log
   * @param {Object} context - Additional context data
   */
  info: (message, context = {}) => {
    console.info(`[INFO] ${message}`, context);
    
    // Add to log buffer for aggregation
    if (typeof window !== 'undefined') {
      window._tradeforceLogBuffer = window._tradeforceLogBuffer || [];
      window._tradeforceLogBuffer.push({
        level: 'info',
        message,
        context,
        timestamp: new Date().toISOString()
      });
    }
  },
  
  /**
   * Log a warning message
   * 
   * @param {string} message - The message to log
   * @param {Object} context - Additional context data
   */
  warn: (message, context = {}) => {
    console.warn(`[WARN] ${message}`, context);
    
    // Add to log buffer for aggregation
    if (typeof window !== 'undefined') {
      window._tradeforceLogBuffer = window._tradeforceLogBuffer || [];
      window._tradeforceLogBuffer.push({
        level: 'warn',
        message,
        context,
        timestamp: new Date().toISOString()
      });
    }
  },
  
  /**
   * Log an error message
   * 
   * @param {string} message - The message to log
   * @param {Error|Object} error - The error object or additional context
   * @param {Object} context - Additional context data
   */
  error: (message, error = {}, context = {}) => {
    if (error instanceof Error) {
      console.error(`[ERROR] ${message}`, {
        errorMessage: error.message,
        stack: error.stack,
        ...context
      });
      
      // Add to log buffer for aggregation
      if (typeof window !== 'undefined') {
        window._tradeforceLogBuffer = window._tradeforceLogBuffer || [];
        window._tradeforceLogBuffer.push({
          level: 'error',
          message,
          errorMessage: error.message,
          stack: error.stack,
          context,
          timestamp: new Date().toISOString()
        });
      }
    } else {
      console.error(`[ERROR] ${message}`, { ...error, ...context });
      
      // Add to log buffer for aggregation
      if (typeof window !== 'undefined') {
        window._tradeforceLogBuffer = window._tradeforceLogBuffer || [];
        window._tradeforceLogBuffer.push({
          level: 'error',
          message,
          context: { ...error, ...context },
          timestamp: new Date().toISOString()
        });
      }
    }
  },
  
  /**
   * Log a debug message (only in development)
   * 
   * @param {string} message - The message to log
   * @param {Object} context - Additional context data
   */
  debug: (message, context = {}) => {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(`[DEBUG] ${message}`, context);
      
      // Add to log buffer for aggregation
      if (typeof window !== 'undefined') {
        window._tradeforceLogBuffer = window._tradeforceLogBuffer || [];
        window._tradeforceLogBuffer.push({
          level: 'debug',
          message,
          context,
          timestamp: new Date().toISOString()
        });
      }
    }
  },
  
  /**
   * Get all logs from the buffer
   * 
   * @returns {Array} - Array of log entries
   */
  getLogs: () => {
    if (typeof window !== 'undefined') {
      return window._tradeforceLogBuffer || [];
    }
    return [];
  },
  
  /**
   * Clear the log buffer
   */
  clearLogs: () => {
    if (typeof window !== 'undefined') {
      window._tradeforceLogBuffer = [];
    }
  },
  
  /**
   * Aggregate errors by type and count occurrences
   * Useful for detecting recurring issues
   * 
   * @returns {Object} - Aggregated error counts by type
   */
  getErrorAggregation: () => {
    if (typeof window === 'undefined') {
      return {};
    }
    
    const errors = (window._tradeforceLogBuffer || [])
      .filter(log => log.level === 'error');
    
    return errors.reduce((acc, error) => {
      const errorType = error.errorMessage || error.message;
      acc[errorType] = (acc[errorType] || 0) + 1;
      return acc;
    }, {});
  }
};

export default logger;
export { logger };
