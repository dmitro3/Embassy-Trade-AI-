const winston = require('winston');
require('winston-mongodb');
const path = require('path');
const fs = require('fs');

// Ensure logs directory exists
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

// Define log file paths
const errorLogPath = path.join(logsDir, 'error.log');
const combinedLogPath = path.join(logsDir, 'combined.log');
const serverLogPath = path.join(logsDir, 'server.log');

// Custom format for console output
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaString = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
    return `${timestamp} ${level}: ${message} ${metaString}`;
  })
);

// Custom format for file output (no colors, more detailed)
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.json()
);

// Create the logger instance
const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  defaultMeta: { service: 'embassy-trade-ai' },
  transports: [
    // Console transport
    new winston.transports.Console({
      format: consoleFormat
    }),
    
    // Error log file
    new winston.transports.File({
      filename: errorLogPath,
      level: 'error',
      format: fileFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    
    // Combined log file
    new winston.transports.File({
      filename: combinedLogPath,
      format: fileFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    
    // Server-specific log file
    new winston.transports.File({
      filename: serverLogPath,
      format: fileFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  ],
  // Handle uncaught exceptions and unhandled rejections
  exceptionHandlers: [
    new winston.transports.File({ 
      filename: path.join(logsDir, 'exceptions.log'),
      format: fileFormat
    })
  ],
  rejectionHandlers: [
    new winston.transports.File({ 
      filename: path.join(logsDir, 'rejections.log'),
      format: fileFormat
    })
  ],
  exitOnError: false
});

// Add MongoDB transport if MongoDB connection string is available
if (process.env.MONGODB_URI) {
  logger.add(new winston.transports.MongoDB({
    db: process.env.MONGODB_URI,
    collection: 'logs',
    options: { useUnifiedTopology: true },
    storeHost: true,
    capped: true,
    cappedSize: 10000000, // 10MB
    expireAfterSeconds: 2592000 // 30 days
  }));
  
  logger.info('MongoDB transport added to logger');
} else {
  logger.warn('MongoDB URI not found, skipping MongoDB transport');
}

// Create child loggers for different components
const createChildLogger = (component) => {
  return logger.child({ component });
};

// Export the logger and child logger factory
module.exports = {
  logger,
  createChildLogger,
  // Convenience exports for common components
  serverLogger: createChildLogger('server'),
  apiLogger: createChildLogger('api'),
  botLogger: createChildLogger('trading-bot'),
  authLogger: createChildLogger('auth'),
  dbLogger: createChildLogger('database')
};
