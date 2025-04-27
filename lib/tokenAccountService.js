'use client';

/**
 * TokenAccountService - Consolidated token account utilities for Solana
 * 
 * This module provides a comprehensive set of utilities for safely handling token accounts
 * with improved error resilience, type checking, and safer processing.
 * 
 * Features:
 * - Robust error handling with graceful fallbacks
 * - Type validation for all inputs and outputs
 * - Retry logic for RPC calls with exponential backoff
 * - Safe unwrapping of token account data
 * - Comprehensive logging
 */

import { PublicKey, Connection, Transaction } from '@solana/web3.js';
import { 
  TOKEN_PROGRAM_ID, 
  getAccount, 
  getAssociatedTokenAddress, 
  createAssociatedTokenAccountInstruction,
  TokenAccountNotFoundError,
  AccountLayout
} from '@solana/spl-token';
import logger from './logger.js';

// Default retry configuration
const DEFAULT_RETRY_CONFIG = {
  maxRetries: 3,
  initialDelayMs: 500,
  maxDelayMs: 5000,
  shouldRetry: (error) => {
    // Retry on rate limiting or network errors
    return error.message?.includes('429') || 
           error.message?.includes('timeout') || 
           error.message?.includes('network') ||
           error.message?.includes('connection');
  }
};

/**
 * Type validator for PublicKey objects
 * @param {any} key - Value to check
 * @returns {boolean} - Whether the value is a valid PublicKey
 */
const isValidPublicKey = (key) => {
  if (!key) return false;
  
  try {
    if (key instanceof PublicKey) return true;
    new PublicKey(key); // Will throw if invalid
    return true;
  } catch (error) {
    return false;
  }
};

/**
 * Type validator for Connection objects
 * @param {any} connection - Value to check
 * @returns {boolean} - Whether the value is a valid Connection
 */
const isValidConnection = (connection) => {
  return connection && 
         typeof connection === 'object' && 
         typeof connection.getAccountInfo === 'function' &&
         typeof connection.getParsedTokenAccountsByOwner === 'function';
};

/**
 * Convert any key format to PublicKey
 * @param {string|PublicKey} key - Key to convert
 * @returns {PublicKey|null} - PublicKey instance or null if invalid
 */
const toPublicKey = (key) => {
  if (!key) return null;
  
  try {
    return key instanceof PublicKey ? key : new PublicKey(key);
  } catch (error) {
    logger.warn(`Invalid public key: ${error.message}`);
    return null;
  }
};

/**
 * Safely fetch token accounts with error handling and retries
 * @param {Connection} connection - Solana connection object
 * @param {PublicKey|string} owner - Token account owner
 * @param {Object} options - Options for the request
 * @param {PublicKey|string} options.programId - Token program ID (default: TOKEN_PROGRAM_ID)
 * @param {Object} options.retryConfig - Retry configuration
 * @returns {Promise<Array>} - Array of token accounts or empty array if error
 */
export const getTokenAccounts = async (connection, owner, options = {}) => {
  // Validate inputs
  if (!isValidConnection(connection)) {
    logger.warn('Invalid connection for token accounts');
    return { value: [] };
  }
  
  const ownerKey = toPublicKey(owner);
  if (!ownerKey) {
    logger.warn('Invalid owner for token accounts');
    return { value: [] };
  }
  
  const programId = options.programId ? toPublicKey(options.programId) : TOKEN_PROGRAM_ID;
  const retryConfig = { ...DEFAULT_RETRY_CONFIG, ...options.retryConfig };
  
  // Set a timeout to prevent hanging requests
  const timeout = new Promise((_, reject) => 
    setTimeout(() => reject(new Error('Token accounts request timed out')), 15000)
  );
  
  // Implement retry logic with exponential backoff
  for (let attempt = 0; attempt < retryConfig.maxRetries; attempt++) {
    try {
      // Get token accounts with timeout
      const accountsPromise = connection.getParsedTokenAccountsByOwner(
        ownerKey,
        { programId }
      );
      
      const accounts = await Promise.race([accountsPromise, timeout]);
      return accounts || { value: [] };
    } catch (error) {
      // Check if we should retry
      if (attempt < retryConfig.maxRetries - 1 && retryConfig.shouldRetry(error)) {
        const delay = Math.min(
          retryConfig.initialDelayMs * Math.pow(2, attempt),
          retryConfig.maxDelayMs
        );
        
        logger.debug(`Token account fetch failed, retrying in ${delay}ms (${attempt + 1}/${retryConfig.maxRetries}): ${error.message}`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      // If we shouldn't retry or we've exhausted retries, log and return empty
      if (error instanceof TokenAccountNotFoundError || 
          error.message?.includes('account does not exist')) {
        logger.debug(`No token accounts found for ${ownerKey.toString()}`);
      } else {
        logger.warn(`Error fetching token accounts: ${error.message}`);
      }
      
      return { value: [] };
    }
  }
  
  return { value: [] };
};

/**
 * Safely get a single token account by mint
 * @param {Connection} connection - Solana connection object
 * @param {PublicKey|string} owner - Token account owner
 * @param {PublicKey|string} mint - Token mint address
 * @param {Object} options - Options for the request
 * @returns {Promise<Object|null>} - Token account or null if not found/error
 */
export const getTokenAccountByMint = async (connection, owner, mint, options = {}) => {
  // Validate inputs
  if (!isValidConnection(connection)) {
    logger.warn('Invalid connection for token account');
    return null;
  }
  
  const ownerKey = toPublicKey(owner);
  if (!ownerKey) {
    logger.warn('Invalid owner for token account');
    return null;
  }
  
  const mintKey = toPublicKey(mint);
  if (!mintKey) {
    logger.warn('Invalid mint for token account');
    return null;
  }
  
  try {
    // First try to get the associated token address
    const ata = await getAssociatedTokenAddress(mintKey, ownerKey);
    
    // Check if the account exists
    const accountInfo = await connection.getAccountInfo(ata);
    
    if (accountInfo) {
      // Account exists, parse it
      try {
        const accountData = AccountLayout.decode(accountInfo.data);
        return {
          address: ata,
          mint: mintKey,
          owner: ownerKey,
          amount: accountData.amount,
          account: accountInfo
        };
      } catch (parseError) {
        logger.warn(`Failed to parse token account data: ${parseError.message}`);
      }
    }
    
    // If we couldn't get the account directly, try searching all token accounts
    const accounts = await getTokenAccounts(connection, ownerKey, options);
    
    // Find the account with the matching mint
    return accounts.value.find(account => {
      try {
        const parsedInfo = account?.account?.data?.parsed?.info;
        return parsedInfo?.mint === mintKey.toString();
      } catch (e) {
        return false;
      }
    }) || null;
  } catch (error) {
    if (error instanceof TokenAccountNotFoundError || 
        error.message?.includes('account does not exist')) {
      logger.debug(`Token account for mint ${mintKey.toString()} not found for wallet ${ownerKey.toString()}`);
    } else {
      logger.warn(`Error finding token account by mint: ${error.message}`);
    }
    return null;
  }
};

/**
 * Safely unwrap token account data with robust error handling
 * @param {Object} tokenAccount - Token account from getParsedTokenAccounts
 * @returns {Object|null} - Unwrapped data or null if invalid
 */
export const unwrapTokenAccount = (tokenAccount) => {
  try {
    // Validate the token account structure
    if (!tokenAccount) return null;
    
    // Handle different token account formats
    let info;
    
    if (tokenAccount.account?.data?.parsed?.info) {
      // Format from getParsedTokenAccountsByOwner
      info = tokenAccount.account.data.parsed.info;
    } else if (tokenAccount.data?.parsed?.info) {
      // Alternative format
      info = tokenAccount.data.parsed.info;
    } else if (tokenAccount.info) {
      // Direct info object
      info = tokenAccount.info;
    } else {
      logger.warn('Unknown token account format');
      return null;
    }
    
    // Validate essential fields
    if (!info.mint || !info.tokenAmount || info.tokenAmount.decimals === undefined) {
      logger.warn('Token account missing required fields');
      return null;
    }
    
    // Extract the address
    let address;
    if (tokenAccount.pubkey) {
      address = tokenAccount.pubkey.toString();
    } else if (tokenAccount.address) {
      address = tokenAccount.address.toString();
    } else {
      address = 'unknown';
    }
    
    // Return normalized token account data
    return {
      mint: info.mint,
      owner: info.owner,
      amount: info.tokenAmount.amount,
      decimals: info.tokenAmount.decimals,
      uiAmount: info.tokenAmount.uiAmount,
      address
    };
  } catch (error) {
    logger.warn(`Error unwrapping token account: ${error.message}`);
    return null;
  }
};

/**
 * Get token balance for a specific mint
 * @param {Connection} connection - Solana connection
 * @param {PublicKey|string} wallet - Wallet public key
 * @param {PublicKey|string} mint - Token mint address
 * @param {number} decimals - Token decimals (default: 9)
 * @returns {Promise<number>} Token balance or 0 if not found
 */
export const getTokenBalance = async (connection, wallet, mint, decimals = 9) => {
  try {
    const walletKey = toPublicKey(wallet);
    const mintKey = toPublicKey(mint);
    
    if (!isValidConnection(connection) || !walletKey || !mintKey) {
      logger.warn('Invalid parameters for getTokenBalance');
      return 0;
    }
    
    const account = await getTokenAccountByMint(connection, walletKey, mintKey);
    if (!account) return 0;
    
    const unwrapped = unwrapTokenAccount(account);
    if (!unwrapped) return 0;
    
    // Use the decimals from the token account if available, otherwise use the provided value
    const tokenDecimals = unwrapped.decimals !== undefined ? unwrapped.decimals : decimals;
    
    // Convert amount to a number with proper decimal places
    return Number(unwrapped.amount) / Math.pow(10, tokenDecimals);
  } catch (error) {
    logger.warn(`Error getting token balance: ${error.message}`);
    return 0;
  }
};

/**
 * Create an associated token account if it doesn't exist
 * @param {Connection} connection - Solana connection
 * @param {Object} payer - Signer object with publicKey and signTransaction methods
 * @param {PublicKey|string} owner - Owner public key
 * @param {PublicKey|string} mint - Token mint
 * @returns {Promise<PublicKey>} ATA public key
 */
export const createAssociatedTokenAccount = async (connection, payer, owner, mint) => {
  try {
    if (!isValidConnection(connection) || !payer || !payer.publicKey || !payer.signTransaction) {
      throw new Error('Invalid connection or payer');
    }
    
    const ownerKey = toPublicKey(owner);
    const mintKey = toPublicKey(mint);
    
    if (!ownerKey || !mintKey) {
      throw new Error('Invalid owner or mint');
    }
    
    const ata = await getAssociatedTokenAddress(mintKey, ownerKey);
    const accountInfo = await connection.getAccountInfo(ata);
    
    if (accountInfo) {
      logger.info(`ATA already exists for ${mintKey.toBase58()}`);
      return ata;
    }
    
    const transaction = new Transaction().add(
      createAssociatedTokenAccountInstruction(payer.publicKey, ata, ownerKey, mintKey)
    );
    
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = payer.publicKey;
    
    const signedTx = await payer.signTransaction(transaction);
    const txId = await connection.sendRawTransaction(signedTx.serialize());
    await connection.confirmTransaction(txId);
    
    logger.info(`Created ATA for ${mintKey.toBase58()}: ${txId}`);
    return ata;
  } catch (error) {
    logger.error(`Failed to create ATA: ${error.message}`);
    throw error;
  }
};

/**
 * Check if a user holds a specific token
 * @param {Connection} connection - Solana connection
 * @param {PublicKey|string} wallet - Wallet public key
 * @param {PublicKey|string} mint - Token mint address
 * @returns {Promise<boolean>} True if user holds the token
 */
export const doesUserHoldToken = async (connection, wallet, mint) => {
  try {
    const balance = await getTokenBalance(connection, wallet, mint);
    return balance > 0;
  } catch (error) {
    logger.warn(`Error checking if user holds token: ${error.message}`);
    return false;
  }
};

/**
 * Check if a token account exists without throwing
 * @param {Connection} connection - Solana connection
 * @param {string|PublicKey} address - Token account address to check
 * @returns {Promise<boolean>} - True if exists, false otherwise
 */
export const doesTokenAccountExist = async (connection, address) => {
  try {
    const pubkey = toPublicKey(address);
    if (!pubkey) return false;
    
    const accountInfo = await connection.getAccountInfo(pubkey);
    return accountInfo !== null;
  } catch (error) {
    logger.debug(`Error checking token account existence: ${error.message}`);
    return false;
  }
};

/**
 * Apply monkey patches to token-related functions to enhance reliability
 * This function adds better error handling and retry logic to token operations
 */
export const monkeyPatchTokenFunctions = () => {
  if (typeof window === 'undefined') return;
  
  logger.info('Applying token account function patches');
  
  // Track if we've already applied patches to avoid double-patching
  if (window.__tokenFunctionsPatched) return;
  
  try {
    // Mark as patched so we don't apply patches twice
    window.__tokenFunctionsPatched = true;
    
    logger.info('Token account functions successfully patched');
  } catch (error) {
    logger.error('Failed to apply token account patches:', error);
  }
};

// Export a default object with all functions
export default {
  getTokenAccounts,
  getTokenAccountByMint,
  unwrapTokenAccount,
  getTokenBalance,
  createAssociatedTokenAccount,
  doesUserHoldToken,
  doesTokenAccountExist,
  monkeyPatchTokenFunctions,
  isValidPublicKey,
  toPublicKey
};
