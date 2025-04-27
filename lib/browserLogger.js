'use client';

import * as Sentry from '@sentry/nextjs';

/**
 * BrowserLogger - Client-side logging utility that integrates with Sentry
 */
class BrowserLogger {
  constructor(options = {}) {
    this.options = {
      sentryEnabled: true,
      consoleEnabled: true,
      serverReportingEnabled: true,
      minSentryLevel: 'error',
      minServerLevel: 'error',
      component: 'unknown',
      userId: null,
      ...options
    };
    
    this.LOG_LEVELS = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3
    };
    
    if (this.options.userId) {
      this.setUser({ id: this.options.userId });
    }
  }
  
  setUser(user) {
    this.options.userId = user.id;
    
    if (this.options.sentryEnabled) {
      Sentry.setUser(user);
    }
  }
  
  setComponent(component) {
    this.options.component = component;
  }
  
  debug(message, meta = {}) {
    this._log('debug', message, meta);
  }
  
  info(message, meta = {}) {
    this._log('info', message, meta);
  }
  
  warn(message, meta = {}) {
    this._log('warn', message, meta);
  }
  
  error(messageOrError, meta = {}) {
    if (messageOrError instanceof Error) {
      const error = messageOrError;
      this._log('error', error.message, {
        ...meta,
        stack: error.stack,
        name: error.name
      });
      
      if (this.options.sentryEnabled) {
        Sentry.captureException(error, {
          tags: { component: this.options.component },
          extra: meta
        });
      }
    } else {
      this._log('error', messageOrError, meta);
        if (this.options.sentryEnabled) {
        Sentry.captureMessage(messageOrError, {
          level: 'error', // Use string 'error' instead of Sentry.Severity.Error
          tags: { component: this.options.component },
          extra: meta
        });
      }
    }
  }
  
  _log(level, message, meta = {}) {
    const logLevel = this.LOG_LEVELS[level];
    const enhancedMeta = {
      ...meta,
      component: this.options.component,
      timestamp: new Date().toISOString(),
      userId: this.options.userId
    };
    
    // Console logging
    if (this.options.consoleEnabled) {
      const consoleMethod = level === 'debug' ? 'log' : level;
      console[consoleMethod](`[${level.toUpperCase()}] ${message}`, enhancedMeta);
    }
    
    // Server reporting for higher log levels
    if (
      this.options.serverReportingEnabled &&
      logLevel >= this.LOG_LEVELS[this.options.minServerLevel]
    ) {
      this._reportToServer(level, message, enhancedMeta);
    }
  }
  
  _reportToServer(level, message, meta) {
    fetch('/logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ level, message, meta }),
      // Use keepalive to ensure the request completes even if the page is unloading
      keepalive: true
    }).catch(err => {
      // Fallback to console if server reporting fails
      console.error('Failed to send log to server:', err);    });
  }
  // Create a transaction for performance monitoring
  startTransaction(name, op) {
    if (!this.options.sentryEnabled) return null;
    
    try {
      // Create a simple transaction object that doesn't depend on Sentry APIs
      // This is a fallback since we can't find the right Sentry method
      const transaction = {
        name,
        op,
        status: 'ok',
        startTimestamp: Date.now(),
        finish: function(status = 'ok') {
          this.status = status;
          this.endTimestamp = Date.now();
          return this;
        }
      };
      
      // Try to use Sentry.startSpan if available, otherwise use our fallback
      if (typeof Sentry.startSpan === 'function') {
        try {
          return Sentry.startSpan({ name, op }) || transaction;
        } catch (err) {
          return transaction;
        }
      }
      
      return transaction;
    } catch (error) {
      console.error('Error creating transaction:', error);
      return null;
    }
  }
}

// Create singleton instance
const browserLogger = new BrowserLogger();

// Export both the class and the singleton instance
export { BrowserLogger, browserLogger };
export default browserLogger;
