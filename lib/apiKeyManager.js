'use client';

import { logger } from './logger';

/**
 * API Key Manager for handling API keys with rotation capabilities
 * Tracks API key usage and errors, and automatically rotates keys when needed
 */
class ApiKeyManager {
  constructor() {
    this.apiKeys = {
      shyft: [],
      birdeye: [],
      photon: [],
      jupiter: [],
      kraken: [],
      coinbase: []
    };
    
    this.keyStatus = {};
    this.errorCounts = {};
    this.initialized = false;
    this.encryptionKey = null;
  }
  
  /**
   * Initialize the API key manager with stored keys
   */
  async init() {
    try {
      // In a production environment, these would be loaded from a secure source
      // For now, we're setting default keys
      
      // Shyft API keys
      this.apiKeys.shyft = [
        { key: 'whv00T87G8Sd8TeK', status: 'active', lastUsed: Date.now() }
      ];
      
      // Birdeye API keys
      this.apiKeys.birdeye = [
        { key: '67f8ce614c594ab2b3efb742f8db69db', status: 'active', lastUsed: Date.now() }
      ];
      
      // Photon API keys
      this.apiKeys.photon = [
        { key: '38HQ8wNk38Q4VCfrSfESGgggoefgPF9kaeZbYvLC6nKqGTLnQN136CLRiqi6e68yppFB5ypjwzjNCTdjyoieiQQe', status: 'active', lastUsed: Date.now() }
      ];
      
      // Track key status
      for (const service in this.apiKeys) {
        this.apiKeys[service].forEach(keyObj => {
          const keyId = `${service}:${keyObj.key.substring(0, 8)}`;
          this.keyStatus[keyId] = { 
            status: keyObj.status, 
            errorCount: 0,
            lastError: null,
            lastUsed: keyObj.lastUsed
          };
        });
      }
      
      this.initialized = true;
      logger.info('API Key Manager initialized successfully');
      return true;
    } catch (error) {
      logger.error('Failed to initialize API Key Manager', error);
      return false;
    }
  }
  
  /**
   * Get an API key for a service
   * 
   * @param {string} service - Service name (shyft, birdeye, etc.)
   * @returns {string|null} - API key or null if not available
   */
  async getApiKey(service) {
    if (!this.initialized) {
      await this.init();
    }
    
    if (!this.apiKeys[service] || this.apiKeys[service].length === 0) {
      logger.error(`No API keys available for ${service}`);
      return null;
    }
    
    // Find active keys and sort by least recently used
    const activeKeys = this.apiKeys[service]
      .filter(keyObj => keyObj.status === 'active')
      .sort((a, b) => a.lastUsed - b.lastUsed);
    
    if (activeKeys.length === 0) {
      logger.error(`No active API keys available for ${service}`);
      
      // Try to recover a key if possible
      const recoveryKey = this.apiKeys[service].find(keyObj => 
        keyObj.status === 'error' && 
        Date.now() - keyObj.lastError > 60000 * 30 // 30 minutes recovery time
      );
      
      if (recoveryKey) {
        logger.info(`Recovering API key for ${service} after cooldown period`);
        recoveryKey.status = 'active';
        return recoveryKey.key;
      }
      
      return null;
    }
    
    // Update last used timestamp
    const selectedKey = activeKeys[0];
    selectedKey.lastUsed = Date.now();
    
    return selectedKey.key;
  }
  
  /**
   * Report an error with an API key
   * 
   * @param {string} service - Service name (shyft, birdeye, etc.)
   * @param {string} errorType - Type of error
   * @param {string} errorMessage - Error message
   */
  reportKeyError(service, errorType, errorMessage) {
    if (!this.initialized) {
      logger.error(`API Key Manager not initialized when reporting error for ${service}`);
      return;
    }
    
    // Find the most recently used key for this service
    const keyObj = this.apiKeys[service]?.find(k => 
      k.status === 'active' && 
      k.lastUsed === Math.max(...this.apiKeys[service].map(k2 => k2.lastUsed))
    );
    
    if (!keyObj) {
      logger.error(`Could not find active key for ${service} to report error`);
      return;
    }
    
    const keyId = `${service}:${keyObj.key.substring(0, 8)}`;
    this.keyStatus[keyId] = this.keyStatus[keyId] || { errorCount: 0 };
    this.keyStatus[keyId].errorCount += 1;
    this.keyStatus[keyId].lastError = Date.now();
    this.keyStatus[keyId].lastErrorMessage = errorMessage;
    
    logger.warn(`API key error for ${service}: ${errorMessage}`);
    
    // If too many errors, mark the key as problematic
    if (this.keyStatus[keyId].errorCount >= 5) {
      logger.error(`Disabling API key for ${service} due to multiple errors`);
      keyObj.status = 'error';
      keyObj.lastError = Date.now();
      
      // Try to rotate to a different key if available
      this.rotateApiKey(service);
    }
  }
  
  /**
   * Rotate to a different API key for a service
   * 
   * @param {string} service - Service name (shyft, birdeye, etc.)
   * @returns {boolean} - Whether rotation was successful
   */
  rotateApiKey(service) {
    if (!this.initialized || !this.apiKeys[service] || this.apiKeys[service].length <= 1) {
      return false;
    }
    
    const activeKeys = this.apiKeys[service].filter(k => k.status === 'active');
    if (activeKeys.length <= 1) {
      logger.warn(`Cannot rotate API key for ${service}, no alternatives available`);
      return false;
    }
    
    // Find least recently used active key
    const nextKey = activeKeys.sort((a, b) => a.lastUsed - b.lastUsed)[0];
    nextKey.lastUsed = Date.now();
    
    logger.info(`Rotated to different API key for ${service}`);
    return true;
  }
}

// Create singleton instance
const apiKeyManager = new ApiKeyManager();

export default apiKeyManager;
