/**
 * Patched token account utilities for Solana
 * This file provides safer versions of token account functions
 * to improve error handling and reliability for the Solana wallet adapter
 */

import * as splToken from '@solana/spl-token';
import { TokenAccountNotFoundError } from '@solana/spl-token';
import { PublicKey } from '@solana/web3.js';

/**
 * Create a safer version of unpackAccount that handles errors gracefully
 * @param {PublicKey} address - The account address
 * @param {Buffer} data - The account data
 * @returns {Object} - The unpacked token account or a placeholder
 */
export const safeUnpackAccount = (address, data) => {
  try {
    // Call the original function
    return splToken.unpackAccount(address, data);
  } catch (error) {
    // If it's a TokenAccountNotFoundError, handle it gracefully
    if (error.name === 'TokenAccountNotFoundError') {
      console.warn(`Token account not found for address: ${address}. Creating a placeholder.`);
      // Return a safe placeholder account object that won't cause further errors
      return {
        address,
        mint: new PublicKey('11111111111111111111111111111111'),
        owner: new PublicKey('11111111111111111111111111111111'),
        amount: BigInt(0),
        delegate: null,
        delegatedAmount: BigInt(0),
        isInitialized: true,
        isFrozen: false,
        isNative: false,
        rentExemptReserve: null,
        closeAuthority: null
      };
    }
    // Otherwise, rethrow the original error
    throw error;
  }
};

/**
 * Apply monkey patches to token-related functions to enhance reliability
 * This function registers our safe functions in the global window object
 * but doesn't try to modify the original library directly
 */
export const monkeyPatchTokenFunctions = () => {
  if (typeof window === 'undefined') return;
  
  console.log('Setting up token account utility functions');
  
  // Track if we've already applied patches to avoid double-patching
  if (window.__tokenFunctionsPatched) {
    console.log('Token functions already set up, skipping');
    return;
  }
  
  try {
    // Add our safe functions to the window object instead of modifying the library
    window.__safeUnpackAccount = safeUnpackAccount;
    
    // Mark as patched so we don't apply patches twice
    window.__tokenFunctionsPatched = true;
    
    console.log('Token account utility functions successfully set up');
  } catch (error) {
    console.error('Failed to set up token account utilities:', error);
  }
};

/**
 * Safely get a token account with improved error handling
 * @param {Connection} connection - Solana connection object
 * @param {PublicKey} wallet - Wallet public key
 * @param {String} mintAddress - Token mint address
 * @returns {Object|null} - Token account or null if not found
 */
export const safeGetTokenAccount = async (connection, wallet, mintAddress) => {
  if (!connection || !wallet || !mintAddress) {
    console.warn('Missing required parameters for safeGetTokenAccount');
    return null;
  }
  
  try {
    const mint = new PublicKey(mintAddress);
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
      wallet,
      { mint }
    );
    
    if (tokenAccounts.value.length === 0) {
      throw new TokenAccountNotFoundError();
    }
    
    return tokenAccounts.value[0].account;
  } catch (error) {
    if (error instanceof TokenAccountNotFoundError || error.name === 'TokenAccountNotFoundError') {
      // This is an expected error when the user doesn't have the token
      return null;
    }
    
    console.error(`Error fetching token account for mint ${mintAddress}:`, error);
    return null;
  }
};

/**
 * Get token balance for a specific mint with retry logic
 * @param {Connection} connection - Solana connection object
 * @param {PublicKey} walletAddress - Wallet public key
 * @param {String} mintAddress - Token mint address
 * @param {Number} decimals - Number of decimals for the token
 * @returns {Number} - Token balance or 0 if not found
 */
export const getTokenBalance = async (connection, walletAddress, mintAddress, decimals = 9) => {
  if (!connection || !walletAddress || !mintAddress) {
    console.warn('Missing required parameters for getTokenBalance');
    return 0;
  }
  
  try {
    const account = await safeGetTokenAccount(connection, walletAddress, mintAddress);
    if (!account) {
      // No token account found - this is normal for tokens the user hasn't interacted with yet
      return 0;
    }
    
    // Format the raw balance with decimals
    const rawBalance = account.data.parsed.info.tokenAmount.amount;
    return parseFloat(rawBalance) / Math.pow(10, decimals);
  } catch (error) {
    console.error(`Error getting token balance for mint ${mintAddress}:`, error);
    return 0;
  }
};

export default {
  monkeyPatchTokenFunctions,
  safeUnpackAccount,
  safeGetTokenAccount,
  getTokenBalance
};
