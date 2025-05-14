/**
 * Logger Utility
 * 
 * This module provides logging functionality for the consensus prediction MCP server.
 * It configures Winston loggers for both application and audit logging.
 */

const winston = require('winston');
const { createLogger, format, transports } = winston;
const { combine, timestamp, printf, colorize, json } = format;

// Determine the log level from environment variables or use default
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
const LOG_PATH = process.env.LOG_PATH || './logs';

// Create the logs directory if it doesn't exist
const fs = require('fs');
if (!fs.existsSync(LOG_PATH)) {
  fs.mkdirSync(LOG_PATH, { recursive: true });
}

// Custom format for console output
const consoleFormat = printf(({ level, message, timestamp, ...metadata }) => {
  let msg = `${timestamp} [${level}]: ${message}`;
  
  if (Object.keys(metadata).length > 0) {
    msg += ` ${JSON.stringify(metadata)}`;
  }
  
  return msg;
});

// Create the application logger
const logger = createLogger({
  level: LOG_LEVEL,
  format: combine(
    timestamp(),
    json()
  ),
  defaultMeta: { service: 'consensus-prediction-mcp' },
  transports: [
    // Write to console with colors
    new transports.Console({
      format: combine(
        colorize(),
        timestamp(),
        consoleFormat
      )
    }),
    // Write to application log file
    new transports.File({
      filename: `${LOG_PATH}/application.log`,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      tailable: true
    }),
    // Write errors to separate file
    new transports.File({
      level: 'error',
      filename: `${LOG_PATH}/error.log`,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      tailable: true
    })
  ]
});

// Create a separate logger for audit logs (predictions, etc.)
const auditLogger = createLogger({
  level: 'info',
  format: combine(
    timestamp(),
    json()
  ),
  defaultMeta: { service: 'consensus-prediction-audit' },
  transports: [
    // Write to audit log file
    new transports.File({
      filename: `${LOG_PATH}/audit.log`,
      maxsize: 10485760, // 10MB
      maxFiles: 10,
      tailable: true
    })
  ]
});

// Express middleware for logging HTTP requests
const requestMiddleware = (req, res, next) => {
  const start = Date.now();
  
  // When the response is finished, log the request details
  res.on('finish', () => {
    const duration = Date.now() - start;
    
    logger.debug('HTTP Request', {
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress,
      userAgent: req.headers['user-agent']
    });
    
    // Log detailed information for API errors
    if (res.statusCode >= 400) {
      logger.error('API Error', {
        method: req.method,
        url: req.originalUrl,
        status: res.statusCode,
        duration: `${duration}ms`,
        ip: req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress,
        userAgent: req.headers['user-agent'],
        body: req.method !== 'GET' ? JSON.stringify(req.body) : undefined
      });
    }
  });
  
  next();
};

// Log unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Promise Rejection', {
    reason: reason.toString(),
    stack: reason.stack
  });
});

// Log uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', {
    error: error.message,
    stack: error.stack
  });
  
  // Exit with error code if in development
  if (process.env.NODE_ENV === 'development') {
    process.exit(1);
  }
});

module.exports = {
  logger,
  auditLogger,
  requestMiddleware
};
