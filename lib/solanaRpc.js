'use client';

import logger from './logger';

/**
 * SolanaRpcClient
 * 
 * A utility class for making Solana RPC calls with retry logic and error handling
 */
class SolanaRpcClient {
  /**
   * Execute a function with retry logic
   * 
   * @param {Function} fn - The async function to execute
   * @param {number} retryCount - Number of retries
   * @param {number} delay - Delay between retries in milliseconds
   * @returns {Promise<any>} - The result of the function
   */
  static async executeWithRetry(fn, retryCount = 3, delay = 1000) {
    let lastError;
    
    for (let attempt = 0; attempt <= retryCount; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        
        // Check if we should retry
        if (attempt < retryCount) {
          logger.warn(`RPC call failed, retrying (${attempt + 1}/${retryCount}): ${error.message}`);
          
          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, delay * (attempt + 1)));
        } else {
          logger.error(`RPC call failed after ${retryCount} retries: ${error.message}`);
          throw error;
        }
      }
    }
    
    throw lastError;
  }
  
  /**
   * Get transaction details with retry logic
   * 
   * @param {Connection} connection - Solana connection
   * @param {string} signature - Transaction signature
   * @param {Object} options - Options for getTransaction
   * @returns {Promise<Object>} - Transaction details
   */
  static async getTransaction(connection, signature, options = {}) {
    return this.executeWithRetry(
      async () => {
        const tx = await connection.getTransaction(signature, {
          maxSupportedTransactionVersion: 0,
          ...options
        });
        
        if (!tx) {
          throw new Error(`Transaction ${signature} not found`);
        }
        
        return tx;
      },
      3,
      1000
    );
  }
  
  /**
   * Get signatures for address with retry logic
   * 
   * @param {Connection} connection - Solana connection
   * @param {PublicKey} address - Account address
   * @param {Object} options - Options for getSignaturesForAddress
   * @returns {Promise<Array>} - Array of signatures
   */
  static async getSignaturesForAddress(connection, address, options = {}) {
    return this.executeWithRetry(
      async () => {
        const signatures = await connection.getSignaturesForAddress(address, options);
        return signatures;
      },
      3,
      1000
    );
  }
  
  /**
   * Get token accounts by owner with retry logic
   * 
   * @param {Connection} connection - Solana connection
   * @param {PublicKey} owner - Owner address
   * @param {Object} options - Options for getTokenAccountsByOwner
   * @returns {Promise<Array>} - Array of token accounts
   */
  static async getTokenAccountsByOwner(connection, owner, options = {}) {
    return this.executeWithRetry(
      async () => {
        const accounts = await connection.getTokenAccountsByOwner(owner, options);
        return accounts;
      },
      3,
      1000
    );
  }
  
  /**
   * Get account info with retry logic
   * 
   * @param {Connection} connection - Solana connection
   * @param {PublicKey} address - Account address
   * @param {Object} options - Options for getAccountInfo
   * @returns {Promise<Object>} - Account info
   */
  static async getAccountInfo(connection, address, options = {}) {
    return this.executeWithRetry(
      async () => {
        const accountInfo = await connection.getAccountInfo(address, options);
        return accountInfo;
      },
      3,
      1000
    );
  }
  
  /**
   * Get balance with retry logic
   * 
   * @param {Connection} connection - Solana connection
   * @param {PublicKey} address - Account address
   * @returns {Promise<number>} - Account balance in lamports
   */
  static async getBalance(connection, address) {
    return this.executeWithRetry(
      async () => {
        const balance = await connection.getBalance(address);
        return balance;
      },
      3,
      1000
    );
  }
  
  /**
   * Send transaction with retry logic
   * 
   * @param {Connection} connection - Solana connection
   * @param {Transaction} transaction - Transaction to send
   * @param {Array} signers - Array of signers
   * @param {Object} options - Options for sendTransaction
   * @returns {Promise<string>} - Transaction signature
   */
  static async sendTransaction(connection, transaction, signers, options = {}) {
    return this.executeWithRetry(
      async () => {
        const signature = await connection.sendTransaction(transaction, signers, options);
        return signature;
      },
      3,
      1000
    );
  }
}

export default SolanaRpcClient;
