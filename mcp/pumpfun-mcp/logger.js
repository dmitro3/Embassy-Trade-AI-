/**
 * Logger for Pump.fun MCP Server
 * 
 * This module provides a Winston-based logger for the Pump.fun MCP Server.
 */

const winston = require('winston');
const { format } = winston;

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4
};

// Define log level colors
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue'
};

// Add colors to Winston
winston.addColors(colors);

// Get log level from environment variable or default to 'info'
const level = process.env.LOG_LEVEL || 'info';

// Define format for console logs
const consoleFormat = format.combine(
  format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  format.colorize({ all: true }),
  format.printf(info => `${info.timestamp} ${info.level}: ${info.message}`)
);

// Define format for file logs
const fileFormat = format.combine(
  format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  format.json()
);

// Create the logger
const logger = winston.createLogger({
  level,
  levels,
  format: fileFormat,
  defaultMeta: { service: 'pumpfun-mcp' },
  transports: [
    // Write logs to console
    new winston.transports.Console({
      format: consoleFormat
    }),
    // Write all logs to pumpfun-mcp.log
    new winston.transports.File({
      filename: 'logs/pumpfun-mcp.log',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    // Write error logs to pumpfun-mcp-error.log
    new winston.transports.File({
      filename: 'logs/pumpfun-mcp-error.log',
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  ]
});

// Create a stream object for Morgan
logger.stream = {
  write: message => {
    logger.http(message.trim());
  }
};

module.exports = logger;
