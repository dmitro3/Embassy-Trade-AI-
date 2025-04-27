// Mock implementation for winston in the browser

// Helper to send logs to backend when possible
const logToBackend = (level, message, meta = {}) => {
  if (typeof window !== 'undefined') {
    try {
      fetch('/api/logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          level,
          message,
          timestamp: new Date().toISOString(),
          meta,
        }),
        // Using keepalive to ensure logs are sent even during page transitions
        keepalive: true,
      }).catch(err => {
        // Silently fail if the server is unavailable - just log to console
        console.warn('[Logger] Failed to send log to server:', err);
      });
    } catch (error) {
      // Silently continue if fetch fails
      console.warn('[Logger] Error in browser logger:', error);
    }
  }
};

const mockLogger = {
  info: (message, meta) => {
    console.info('[Info]', message, meta || '');
    logToBackend('info', message, meta);
  },
  error: (message, meta) => {
    console.error('[Error]', message, meta || '');
    logToBackend('error', message, meta);
  },
  warn: (message, meta) => {
    console.warn('[Warning]', message, meta || '');
    logToBackend('warn', message, meta);
  },
  debug: (message, meta) => {
    console.debug('[Debug]', message, meta || '');
    logToBackend('debug', message, meta);
  },
  log: (level, message, meta) => {
    console.log(`[${level}]`, message, meta || '');
    logToBackend(level, message, meta);
  },
};

module.exports = {
  createLogger: () => mockLogger,
  format: {
    combine: () => {},
    timestamp: () => {},
    printf: () => {},
    colorize: () => {},
    json: () => {},
    errors: () => {},
    splat: () => {},
    simple: () => {},
  },
  transports: {
    Console: function() {},
    File: function() {},
    Stream: function() {},
    Http: function() {},
  },
  addColors: () => {},
};