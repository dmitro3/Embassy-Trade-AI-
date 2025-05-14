/**
 * API Keys Configuration for Pump.fun MCP Server
 * 
 * This module provides secure access to API keys for external services.
 * In a production environment, these keys should be stored in environment variables
 * or a secure key management system.
 */

// Load environment variables
require('dotenv').config();

// Logger
const logger = require('../logger');

/**
 * API Keys Manager
 */
class ApiKeysManager {
  constructor() {
    // Initialize API keys from environment variables
    this.keys = {
      shyft: process.env.SHYFT_API_KEY,
      birdeye: process.env.BIRDEYE_API_KEY,
      photon: process.env.PHOTON_API_KEY
    };
    
    // Validate API keys
    this.validateKeys();
  }
  
  /**
   * Validate API keys
   * 
   * @private
   */
  validateKeys() {
    // Check if required API keys are present
    if (!this.keys.shyft) {
      logger.warn('SHYFT_API_KEY is not set. SHYFT API functionality will be limited.');
    }
    
    if (!this.keys.birdeye) {
      logger.warn('BIRDEYE_API_KEY is not set. Birdeye API functionality will be limited.');
    }
    
    if (!this.keys.photon) {
      logger.warn('PHOTON_API_KEY is not set. Photon API functionality will be limited.');
    }
  }
  
  /**
   * Get API key
   * 
   * @param {string} service - Service name (shyft, birdeye, photon)
   * @returns {string|null} - API key or null if not found
   */
  getKey(service) {
    const key = this.keys[service.toLowerCase()];
    
    if (!key) {
      logger.warn(`API key for ${service} is not available.`);
      return null;
    }
    
    return key;
  }
  
  /**
   * Check if API key is valid
   * 
   * @param {string} service - Service name (shyft, birdeye, photon)
   * @returns {boolean} - True if API key is valid, false otherwise
   */
  isKeyValid(service) {
    return !!this.getKey(service);
  }
  
  /**
   * Get API key headers for a service
   * 
   * @param {string} service - Service name (shyft, birdeye, photon)
   * @returns {Object} - Headers object with API key
   */
  getHeaders(service) {
    const key = this.getKey(service);
    
    if (!key) {
      return {};
    }
    
    switch (service.toLowerCase()) {
      case 'shyft':
        return { 'x-api-key': key };
      case 'birdeye':
        return { 'X-API-KEY': key };
      case 'photon':
        return { 'Authorization': `Bearer ${key}` };
      default:
        logger.warn(`Unknown service: ${service}`);
        return {};
    }
  }
  
  /**
   * Update API key
   * 
   * @param {string} service - Service name (shyft, birdeye, photon)
   * @param {string} key - API key
   */
  updateKey(service, key) {
    if (!service || !key) {
      logger.error('Service name and API key are required.');
      return;
    }
    
    const serviceName = service.toLowerCase();
    
    if (!['shyft', 'birdeye', 'photon'].includes(serviceName)) {
      logger.error(`Unknown service: ${service}`);
      return;
    }
    
    this.keys[serviceName] = key;
    logger.info(`API key for ${service} has been updated.`);
  }
  
  /**
   * Get all API keys (masked for security)
   * 
   * @returns {Object} - Object with masked API keys
   */
  getAllKeys() {
    const maskedKeys = {};
    
    for (const [service, key] of Object.entries(this.keys)) {
      if (key) {
        // Mask API key (show only first 4 and last 4 characters)
        const maskedKey = key.length > 8
          ? `${key.substring(0, 4)}...${key.substring(key.length - 4)}`
          : '********';
        
        maskedKeys[service] = maskedKey;
      } else {
        maskedKeys[service] = null;
      }
    }
    
    return maskedKeys;
  }
}

// Create and export singleton instance
const apiKeys = new ApiKeysManager();
module.exports = apiKeys;
