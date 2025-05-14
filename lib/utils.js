/**
 * Utility functions for TradeForce AI
 */

/**
 * Format a timestamp into ISO string
 * 
 * @param {number|Date} timestamp - The timestamp to format
 * @returns {string} - Formatted timestamp string
 */
export function formatTimestamp(timestamp) {
  return new Date(timestamp).toISOString();
}

/**
 * Format a number as currency
 * 
 * @param {number} value - The number to format
 * @param {string} currency - Currency code (default: USD)
 * @returns {string} - Formatted currency string
 */
export function formatCurrency(value, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(value);
}

/**
 * Format a number as percentage
 * 
 * @param {number} value - The number to format
 * @param {number} digits - Number of decimal digits (default: 2)
 * @returns {string} - Formatted percentage string
 */
export function formatPercentage(value, digits = 2) {
  return `${value.toFixed(digits)}%`;
}

/**
 * Truncate a string in the middle
 * 
 * @param {string} str - The string to truncate
 * @param {number} startChars - Number of starting characters to keep
 * @param {number} endChars - Number of ending characters to keep
 * @returns {string} - Truncated string
 */
export function truncateMiddle(str, startChars = 4, endChars = 4) {
  if (!str) return '';
  if (str.length <= startChars + endChars) return str;
  return `${str.substring(0, startChars)}...${str.substring(str.length - endChars)}`;
}

/**
 * Delay execution for a specified time
 * 
 * @param {number} ms - Milliseconds to wait
 * @returns {Promise} - Promise that resolves after the delay
 */
export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Generate a unique ID
 * 
 * @returns {string} - Unique ID string
 */
export function generateId() {
  return `id-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}
