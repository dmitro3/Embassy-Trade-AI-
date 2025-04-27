'use client';

/**
 * Logger fallback implementation for when the backend server is not available
 * This ensures the application doesn't crash when log endpoints are unreachable
 */

const loggerFallback = {
  // Store logs in memory when server is unavailable
  _storedLogs: [],
  _maxStoredLogs: 100,

  // Log levels
  info: function(message, meta = {}) {
    this._logWithFallback('info', message, meta);
  },

  warn: function(message, meta = {}) {
    this._logWithFallback('warn', message, meta);
  },

  error: function(message, meta = {}) {
    this._logWithFallback('error', message, meta);
  },

  debug: function(message, meta = {}) {
    this._logWithFallback('debug', message, meta);
  },

  _logWithFallback: function(level, message, meta = {}) {
    // Always log to console
    const consoleMethod = level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log';
    console[consoleMethod](`[${level.toUpperCase()}] ${message}`, meta);
    
    // Store log in memory
    this._storedLogs.push({
      level,
      message,
      meta,
      timestamp: new Date().toISOString()
    });
    
    // Trim logs if needed
    if (this._storedLogs.length > this._maxStoredLogs) {
      this._storedLogs.shift();
    }
    
    // Try to send to backend, but don't crash if it fails
    this._sendToBackend(level, message, meta).catch(err => {
      console.log('Failed to forward log to backend: ' + err.message + '. Will store locally.');
    });
  },

  _sendToBackend: async function(level, message, meta = {}) {
    try {
      const response = await fetch('http://localhost:5000/logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ level, message, meta }),
      });
      
      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`);
      }
      
      return true;
    } catch (error) {
      // Just store locally if backend is unavailable
      return Promise.reject(error);
    }
  },

  // Method to retrieve stored logs for debugging
  getStoredLogs: function() {
    return [...this._storedLogs];
  }
};

export default loggerFallback;

// Metrics API - simplified version that works without backend
export const metrics = {
  // Track when a feature is used
  trackFeatureUsed: (feature, metadata = {}) => {
    loggerFallback.info(`Feature used: ${feature}`, { ...metadata, type: 'feature_usage' });
  },
  
  // Track when an error occurs
  trackError: (errorType, error, metadata = {}) => {
    loggerFallback.error(`Error: ${errorType}`, { 
      error: error?.message || String(error), 
      stack: error?.stack,
      ...metadata, 
      type: 'error_tracked' 
    });
  },
  
  // Track timing for performance monitoring
  trackTiming: (action, timeMs, metadata = {}) => {
    loggerFallback.info(`Timing: ${action} took ${timeMs}ms`, { 
      timeMs, 
      ...metadata, 
      type: 'timing' 
    });
  }
};
