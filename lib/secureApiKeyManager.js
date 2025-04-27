'use client';

import crypto from 'crypto';
import { startAppTransaction, finishAppTransaction } from './sentryUtils.js';
import logger from './logger.js';

/**
 * Secure API Key Manager
 * 
 * This service provides secure storage and retrieval of API keys using AES-256 encryption.
 * It ensures that sensitive API keys are never exposed in plaintext in memory or storage.
 */
class SecureApiKeyManager {
  constructor() {
    this.initialized = false;
    this.encryptionKey = process.env.API_KEY_ENCRYPTION_KEY;
    this.ivLength = 16; // For AES, this is always 16 bytes
    this.algorithm = 'aes-256-cbc';
    this.encryptedKeys = new Map();
    
    // Initialize with environment variables if available
    this.init();
  }

  /**
   * Initialize the secure API key manager
   */
  init() {
    const transaction = startAppTransaction('secure-api-key-init', 'security.init');
    
    try {
      // Check if encryption key is available
      if (!this.encryptionKey || this.encryptionKey.length < 32) {
        logger.warn('API_KEY_ENCRYPTION_KEY is missing or too short. Secure API key management is disabled.');
        return false;
      }
      
      // Ensure encryption key is exactly 32 bytes (256 bits)
      this.encryptionKey = this.encryptionKey.slice(0, 32).padEnd(32, '0');
      
      // Load API keys from environment variables
      this.loadApiKeysFromEnv();
      
      this.initialized = true;
      logger.info('Secure API key manager initialized successfully');
      return true;
    } catch (error) {
      logger.error(`Secure API key manager initialization error: ${error.message}`);
      return false;
    } finally {
      finishAppTransaction(transaction);
    }
  }

  /**
   * Load API keys from environment variables
   */
  loadApiKeysFromEnv() {
    try {
      // Load SHYFT API key
      if (process.env.NEXT_PUBLIC_SHYFT_API_KEY) {
        this.storeApiKey('shyft', process.env.NEXT_PUBLIC_SHYFT_API_KEY);
      }
      
      // Load Birdeye API key
      if (process.env.NEXT_PUBLIC_BIRDEYE_API_KEY) {
        this.storeApiKey('birdeye', process.env.NEXT_PUBLIC_BIRDEYE_API_KEY);
      }
      
      // Load Photon private key
      if (process.env.NEXT_PUBLIC_PHOTON_PRIVATE_KEY) {
        this.storeApiKey('photon', process.env.NEXT_PUBLIC_PHOTON_PRIVATE_KEY);
      }
      
      logger.info('API keys loaded from environment variables');
    } catch (error) {
      logger.error(`Error loading API keys from environment: ${error.message}`);
    }
  }

  /**
   * Encrypt a value using AES-256-CBC
   * 
   * @param {string} value - Value to encrypt
   * @returns {string} - Encrypted value as hex string with IV
   */
  encrypt(value) {
    try {
      if (!this.initialized) {
        throw new Error('Secure API key manager not initialized');
      }
      
      // Generate a random initialization vector
      const iv = crypto.randomBytes(this.ivLength);
      
      // Create cipher with key and iv
      const cipher = crypto.createCipheriv(
        this.algorithm, 
        Buffer.from(this.encryptionKey), 
        iv
      );
      
      // Encrypt the value
      let encrypted = cipher.update(value, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      // Return iv + encrypted value (iv is needed for decryption)
      return iv.toString('hex') + ':' + encrypted;
    } catch (error) {
      logger.error(`Encryption error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Decrypt a value using AES-256-CBC
   * 
   * @param {string} encryptedValue - Encrypted value as hex string with IV
   * @returns {string} - Decrypted value
   */
  decrypt(encryptedValue) {
    try {
      if (!this.initialized) {
        throw new Error('Secure API key manager not initialized');
      }
      
      // Split iv and encrypted value
      const parts = encryptedValue.split(':');
      if (parts.length !== 2) {
        throw new Error('Invalid encrypted value format');
      }
      
      const iv = Buffer.from(parts[0], 'hex');
      const encrypted = parts[1];
      
      // Create decipher with key and iv
      const decipher = crypto.createDecipheriv(
        this.algorithm, 
        Buffer.from(this.encryptionKey), 
        iv
      );
      
      // Decrypt the value
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      logger.error(`Decryption error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Store an API key securely
   * 
   * @param {string} service - Service name (e.g., 'shyft', 'birdeye')
   * @param {string} apiKey - API key to store
   * @returns {boolean} - Success status
   */
  storeApiKey(service, apiKey) {
    const transaction = startAppTransaction('secure-api-key-store', 'security.store');
    
    try {
      if (!this.initialized) {
        throw new Error('Secure API key manager not initialized');
      }
      
      if (!service || !apiKey) {
        throw new Error('Service name and API key are required');
      }
      
      // Encrypt the API key
      const encryptedKey = this.encrypt(apiKey);
      
      // Store the encrypted key
      this.encryptedKeys.set(service.toLowerCase(), encryptedKey);
      
      logger.info(`API key for ${service} stored securely`);
      return true;
    } catch (error) {
      logger.error(`Error storing API key for ${service}: ${error.message}`);
      return false;
    } finally {
      finishAppTransaction(transaction);
    }
  }

  /**
   * Get an API key securely
   * 
   * @param {string} service - Service name (e.g., 'shyft', 'birdeye')
   * @returns {string|null} - API key or null if not found
   */
  getApiKey(service) {
    const transaction = startAppTransaction('secure-api-key-get', 'security.get');
    
    try {
      if (!this.initialized) {
        throw new Error('Secure API key manager not initialized');
      }
      
      if (!service) {
        throw new Error('Service name is required');
      }
      
      // Get the encrypted key
      const encryptedKey = this.encryptedKeys.get(service.toLowerCase());
      
      if (!encryptedKey) {
        logger.warn(`API key for ${service} not found`);
        return null;
      }
      
      // Decrypt the API key
      const apiKey = this.decrypt(encryptedKey);
      
      return apiKey;
    } catch (error) {
      logger.error(`Error getting API key for ${service}: ${error.message}`);
      return null;
    } finally {
      finishAppTransaction(transaction);
    }
  }

  /**
   * Check if an API key exists
   * 
   * @param {string} service - Service name (e.g., 'shyft', 'birdeye')
   * @returns {boolean} - Whether the API key exists
   */
  hasApiKey(service) {
    try {
      if (!this.initialized) {
        return false;
      }
      
      return this.encryptedKeys.has(service.toLowerCase());
    } catch (error) {
      logger.error(`Error checking API key for ${service}: ${error.message}`);
      return false;
    }
  }

  /**
   * Remove an API key
   * 
   * @param {string} service - Service name (e.g., 'shyft', 'birdeye')
   * @returns {boolean} - Success status
   */
  removeApiKey(service) {
    try {
      if (!this.initialized) {
        throw new Error('Secure API key manager not initialized');
      }
      
      if (!service) {
        throw new Error('Service name is required');
      }
      
      const result = this.encryptedKeys.delete(service.toLowerCase());
      
      if (result) {
        logger.info(`API key for ${service} removed`);
      } else {
        logger.warn(`API key for ${service} not found`);
      }
      
      return result;
    } catch (error) {
      logger.error(`Error removing API key for ${service}: ${error.message}`);
      return false;
    }
  }

  /**
   * Get all available service names
   * 
   * @returns {Array<string>} - List of service names
   */
  getAvailableServices() {
    try {
      if (!this.initialized) {
        return [];
      }
      
      return Array.from(this.encryptedKeys.keys());
    } catch (error) {
      logger.error(`Error getting available services: ${error.message}`);
      return [];
    }
  }
}

// Create singleton instance
const secureApiKeyManager = new SecureApiKeyManager();

export default secureApiKeyManager;
