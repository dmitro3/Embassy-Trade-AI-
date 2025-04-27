/**
 * SecureStorage.js
 * 
 * A utility for securely storing sensitive data in the browser extension
 * using AES-256 encryption with the Web Crypto API.
 */

class SecureStorage {
  /**
   * Encrypt data using AES-256-GCM
   * 
   * @param {Object|string} data - The data to encrypt
   * @param {string} password - The password to derive the encryption key from
   * @returns {Promise<Object>} - The encrypted data object with iv and salt
   */
  static async encrypt(data, password) {
    try {
      // Generate random salt and initialization vector
      const salt = crypto.getRandomValues(new Uint8Array(16));
      const iv = crypto.getRandomValues(new Uint8Array(12));
      
      // Derive encryption key from password
      const passwordKey = await this._deriveKey(password, salt);
      
      // Convert data to string if it's an object
      const dataString = typeof data === 'object' ? JSON.stringify(data) : String(data);
      
      // Encode data as buffer
      const encoder = new TextEncoder();
      const dataBuffer = encoder.encode(dataString);
      
      // Encrypt the data
      const encryptedData = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        passwordKey,
        dataBuffer
      );
      
      // Convert encrypted data to array for storage
      return {
        encrypted: Array.from(new Uint8Array(encryptedData)),
        iv: Array.from(iv),
        salt: Array.from(salt)
      };
    } catch (error) {
      console.error('Encryption error:', error);
      throw new Error('Failed to encrypt data');
    }
  }
  
  /**
   * Decrypt data using AES-256-GCM
   * 
   * @param {Object} encryptedObj - The encrypted data object with iv and salt
   * @param {string} password - The password used for encryption
   * @returns {Promise<Object|string>} - The decrypted data
   */
  static async decrypt(encryptedObj, password) {
    try {
      const { encrypted, iv, salt } = encryptedObj;
      
      // Derive the same key using the stored salt
      const passwordKey = await this._deriveKey(password, new Uint8Array(salt));
      
      // Decrypt the data
      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: new Uint8Array(iv) },
        passwordKey,
        new Uint8Array(encrypted)
      );
      
      // Decode the decrypted data
      const decoder = new TextDecoder();
      const decryptedString = decoder.decode(decrypted);
      
      // Try to parse as JSON, return as string if not valid JSON
      try {
        return JSON.parse(decryptedString);
      } catch (e) {
        return decryptedString;
      }
    } catch (error) {
      console.error('Decryption error:', error);
      throw new Error('Failed to decrypt data');
    }
  }
  
  /**
   * Derive an encryption key from a password and salt using PBKDF2
   * 
   * @param {string} password - The password to derive the key from
   * @param {Uint8Array} salt - The salt for key derivation
   * @returns {Promise<CryptoKey>} - The derived key
   * @private
   */
  static async _deriveKey(password, salt) {
    // Convert password to buffer
    const encoder = new TextEncoder();
    const passwordBuffer = encoder.encode(password);
    
    // Import password as key material
    const importedKey = await crypto.subtle.importKey(
      'raw',
      passwordBuffer,
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );
    
    // Derive a key using PBKDF2
    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt,
        iterations: 100000, // High iteration count for security
        hash: 'SHA-256'
      },
      importedKey,
      { name: 'AES-GCM', length: 256 }, // AES-256
      false,
      ['encrypt', 'decrypt']
    );
  }
  
  /**
   * Generate a secure random password
   * 
   * @param {number} length - The length of the password to generate
   * @returns {string} - A random password
   */
  static generatePassword(length = 32) {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';
    const randomValues = new Uint8Array(length);
    crypto.getRandomValues(randomValues);
    
    let result = '';
    for (let i = 0; i < length; i++) {
      result += charset.charAt(randomValues[i] % charset.length);
    }
    
    return result;
  }
}

/**
 * API Key Storage - A wrapper around SecureStorage for managing API keys
 */
class ApiKeyStorage {
  constructor() {
    this.masterPasswordKey = 'master_password_hash';
    this.initialized = false;
  }
  
  /**
   * Initialize the API key storage
   * 
   * @param {string} masterPassword - The master password for encrypting/decrypting API keys
   * @returns {Promise<boolean>} - Whether initialization was successful
   */
  async initialize(masterPassword) {
    try {
      // Check if master password is already set
      const result = await chrome.storage.local.get(this.masterPasswordKey);
      const storedHash = result[this.masterPasswordKey];
      
      if (storedHash) {
        // Verify the master password
        const isValid = await this._verifyMasterPassword(masterPassword, storedHash);
        if (!isValid) {
          throw new Error('Invalid master password');
        }
      } else {
        // First time setup - store the hashed master password
        const passwordHash = await this._hashPassword(masterPassword);
        await chrome.storage.local.set({ [this.masterPasswordKey]: passwordHash });
      }
      
      this.masterPassword = masterPassword;
      this.initialized = true;
      return true;
    } catch (error) {
      console.error('Failed to initialize API key storage:', error);
      return false;
    }
  }
  
  /**
   * Store an API key securely
   * 
   * @param {string} platform - The platform the API key is for (e.g., 'robinhood', 'kraken')
   * @param {Object} apiKeyData - The API key data to store
   * @returns {Promise<boolean>} - Whether the operation was successful
   */
  async storeApiKey(platform, apiKeyData) {
    if (!this.initialized) {
      throw new Error('API key storage not initialized');
    }
    
    try {
      const encrypted = await SecureStorage.encrypt(apiKeyData, this.masterPassword);
      await chrome.storage.local.set({ [`api_key_${platform}`]: encrypted });
      
      // Log the action (without sensitive data)
      console.log(`Stored API key for ${platform}`);
      
      return true;
    } catch (error) {
      console.error(`Failed to store API key for ${platform}:`, error);
      return false;
    }
  }
  
  /**
   * Retrieve an API key
   * 
   * @param {string} platform - The platform to get the API key for
   * @returns {Promise<Object|null>} - The API key data or null if not found
   */
  async getApiKey(platform) {
    if (!this.initialized) {
      throw new Error('API key storage not initialized');
    }
    
    try {
      const result = await chrome.storage.local.get([`api_key_${platform}`]);
      const encrypted = result[`api_key_${platform}`];
      
      if (!encrypted) {
        return null;
      }
      
      return await SecureStorage.decrypt(encrypted, this.masterPassword);
    } catch (error) {
      console.error(`Failed to retrieve API key for ${platform}:`, error);
      return null;
    }
  }
  
  /**
   * Delete an API key
   * 
   * @param {string} platform - The platform to delete the API key for
   * @returns {Promise<boolean>} - Whether the operation was successful
   */
  async deleteApiKey(platform) {
    if (!this.initialized) {
      throw new Error('API key storage not initialized');
    }
    
    try {
      await chrome.storage.local.remove([`api_key_${platform}`]);
      
      // Log the action
      console.log(`Deleted API key for ${platform}`);
      
      return true;
    } catch (error) {
      console.error(`Failed to delete API key for ${platform}:`, error);
      return false;
    }
  }
  
  /**
   * List all stored API key platforms
   * 
   * @returns {Promise<string[]>} - Array of platform names with stored API keys
   */
  async listApiKeyPlatforms() {
    try {
      const allItems = await chrome.storage.local.get(null);
      const platforms = [];
      
      for (const key in allItems) {
        if (key.startsWith('api_key_')) {
          platforms.push(key.replace('api_key_', ''));
        }
      }
      
      return platforms;
    } catch (error) {
      console.error('Failed to list API key platforms:', error);
      return [];
    }
  }
  
  /**
   * Change the master password
   * 
   * @param {string} currentPassword - The current master password
   * @param {string} newPassword - The new master password
   * @returns {Promise<boolean>} - Whether the operation was successful
   */
  async changeMasterPassword(currentPassword, newPassword) {
    try {
      // Verify current password
      const result = await chrome.storage.local.get(this.masterPasswordKey);
      const storedHash = result[this.masterPasswordKey];
      
      if (!storedHash || !(await this._verifyMasterPassword(currentPassword, storedHash))) {
        throw new Error('Current password is incorrect');
      }
      
      // Get all platforms with stored API keys
      const platforms = await this.listApiKeyPlatforms();
      
      // Re-encrypt all API keys with the new password
      for (const platform of platforms) {
        // Get API key with current password
        const apiKeyData = await this.getApiKey(platform);
        
        if (apiKeyData) {
          // Encrypt with new password
          const encrypted = await SecureStorage.encrypt(apiKeyData, newPassword);
          await chrome.storage.local.set({ [`api_key_${platform}`]: encrypted });
        }
      }
      
      // Store new password hash
      const newPasswordHash = await this._hashPassword(newPassword);
      await chrome.storage.local.set({ [this.masterPasswordKey]: newPasswordHash });
      
      // Update instance variable
      this.masterPassword = newPassword;
      
      return true;
    } catch (error) {
      console.error('Failed to change master password:', error);
      return false;
    }
  }
  
  /**
   * Hash a password using SHA-256
   * 
   * @param {string} password - The password to hash
   * @returns {Promise<string>} - The hashed password
   * @private
   */
  async _hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    
    // Convert hash to hex string
    return Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }
  
  /**
   * Verify a password against a stored hash
   * 
   * @param {string} password - The password to verify
   * @param {string} storedHash - The stored hash to verify against
   * @returns {Promise<boolean>} - Whether the password is valid
   * @private
   */
  async _verifyMasterPassword(password, storedHash) {
    const passwordHash = await this._hashPassword(password);
    return passwordHash === storedHash;
  }
}

// Export the classes
export { SecureStorage, ApiKeyStorage };
