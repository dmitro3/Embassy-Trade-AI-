'use client';

import { Connection } from '@solana/web3.js';
import { getConnection } from './networks';

/**
 * Enhanced Solana RPC client with robust error handling
 * Implements exponential backoff, automatic retries, and connection fallbacks
 */
class SolanaRpcClient {
  // Retry configuration
  static MAX_RETRIES = 5;
  static INITIAL_BACKOFF_MS = 500;
  static MAX_BACKOFF_MS = 15000;
  static JITTER_FACTOR = 0.2; // Add randomness to prevent thundering herd

  /**
   * Execute a Solana RPC call with automatic retries and exponential backoff
   * @param {Function} method - The function to execute (e.g., connection.getBalance)
   * @param {Array} args - Arguments to pass to the method
   * @returns {Promise<any>} - Result of the RPC call
   */
  static async executeWithRetry(method, ...args) {
    let connection = getConnection();
    let retries = 0;
    let lastError = null;

    while (retries <= this.MAX_RETRIES) {
      try {
        return await method.apply(connection, args);
      } catch (error) {
        lastError = error;

        // Check for rate limit error (HTTP 429)
        const isRateLimited = error.message && (
          error.message.includes('429') || 
          error.message.includes('rate limit') ||
          error.message.toLowerCase().includes('too many requests')
        );

        // Check for server errors
        const isServerError = error.message && (
          error.message.includes('server error') ||
          error.message.includes('503') ||
          error.message.includes('500') ||
          error.message.includes('502') ||
          error.message.includes('504')
        );

        // Don't retry if it's not a rate limit or server error
        if (!isRateLimited && !isServerError) {
          throw error;
        }

        // Log the error
        console.warn(`Solana RPC error (attempt ${retries + 1}/${this.MAX_RETRIES + 1}): ${error.message}`);

        // If we've reached max retries, throw the last error
        if (retries >= this.MAX_RETRIES) {
          console.error('Max RPC retries reached. Last error:', error);
          throw error;
        }

        // Calculate exponential backoff with jitter
        const backoff = Math.min(
          this.INITIAL_BACKOFF_MS * Math.pow(2, retries),
          this.MAX_BACKOFF_MS
        );
        
        // Add jitter (±20%) to prevent thundering herd problem
        const jitter = backoff * this.JITTER_FACTOR * (Math.random() * 2 - 1);
        const delay = backoff + jitter;

        console.log(`Retrying after ${Math.round(delay)}ms delay...`);
        await new Promise(resolve => setTimeout(resolve, delay));

        // If we had a rate limit error, try to get a fresh connection
        // This might use a different endpoint from the fallback list
        if (isRateLimited && retries >= 1) {
          connection = getConnection(true); // force new connection
        }

        retries++;
      }
    }
  }

  /**
   * Get account info with retry mechanism
   * @param {PublicKey} pubkey - The public key of the account
   * @param {Object} options - Connection options
   * @returns {Promise<Object>} - Account info
   */
  static async getAccountInfo(pubkey, options = {}) {
    return this.executeWithRetry(
      Connection.prototype.getAccountInfo,
      pubkey,
      options
    );
  }

  /**
   * Get token account balance with retry mechanism
   * @param {PublicKey} pubkey - The public key of the token account
   * @param {Object} options - Connection options
   * @returns {Promise<Object>} - Token account balance
   */
  static async getTokenAccountBalance(pubkey, options = {}) {
    return this.executeWithRetry(
      Connection.prototype.getTokenAccountBalance,
      pubkey,
      options
    );
  }

  /**
   * Get multiple token accounts with retry mechanism
   * @param {Array} pubkeys - Array of public keys
   * @param {Object} options - Connection options
   * @returns {Promise<Array>} - Array of token accounts
   */
  static async getMultipleAccountsInfo(pubkeys, options = {}) {
    return this.executeWithRetry(
      Connection.prototype.getMultipleAccountsInfo,
      pubkeys,
      options
    );
  }

  /**
   * Get recent blockhash with retry mechanism
   * @param {Object} options - Connection options
   * @returns {Promise<Object>} - Recent blockhash
   */
  static async getRecentBlockhash(options = {}) {
    return this.executeWithRetry(
      Connection.prototype.getLatestBlockhash,
      options
    );
  }

  /**
   * Send transaction with retry mechanism
   * @param {Transaction} transaction - The transaction to send
   * @param {Array} signers - Array of signers
   * @param {Object} options - Connection options
   * @returns {Promise<string>} - Transaction signature
   */
  static async sendTransaction(transaction, signers = [], options = {}) {
    return this.executeWithRetry(
      Connection.prototype.sendTransaction,
      transaction,
      signers,
      options
    );
  }

  /**
   * Get token accounts by owner with retry mechanism
   * @param {PublicKey} owner - Owner public key
   * @param {Object} filter - Token account filter
   * @param {Object} options - Connection options
   * @returns {Promise<Array>} - Token accounts
   */
  static async getTokenAccountsByOwner(owner, filter, options = {}) {
    return this.executeWithRetry(
      Connection.prototype.getTokenAccountsByOwner,
      owner,
      filter,
      options
    );
  }
}

export default SolanaRpcClient;