/**
 * Token Account Utilities
 * 
 * Provides helper functions for safely handling token accounts and addressing common errors
 * like TokenAccountNotFoundError when interacting with SPL tokens.
 */

import { getAccount, getAssociatedTokenAddress, createAssociatedTokenAccountInstruction, TokenAccountNotFoundError, AccountLayout, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { PublicKey, Transaction } from '@solana/web3.js';
import logger from './logger.js';
import { RPC_RETRY_CONFIG } from './apiKeys.js';

/**
 * Safely fetch a token account, handling the TokenAccountNotFoundError gracefully
 * @param {Connection} connection - Solana connection
 * @param {PublicKey} wallet - Wallet public key
 * @param {string|PublicKey} mintAddress - Token mint address
 * @param {number} retries - Number of retries for rate limiting (default: 3)
 * @returns {Object|null} Token account info or null if not found
 */
export async function safeGetTokenAccount(connection, wallet, mintAddress, retries = 3) {
  try {
    // Verify inputs to avoid downstream errors
    if (!connection || !wallet || !mintAddress) {
      logger.warn('Missing parameters in safeGetTokenAccount');
      return null;
    }

    // Convert string to PublicKey if needed
    const mintPublicKey = typeof mintAddress === 'string' 
      ? new PublicKey(mintAddress) 
      : mintAddress;
    
    try {
      // Get the associated token address (this won't throw TokenAccountNotFoundError)
      const tokenAddress = await getAssociatedTokenAddress(
        mintPublicKey,
        wallet
      );
      
      // First check if account exists to avoid token program errors
      const accountInfo = await connection.getAccountInfo(tokenAddress);
      
      if (!accountInfo) {
        logger.debug(`Token account ${tokenAddress.toString()} does not exist`);
        return null;
      }
      
      // Safe parsing with try/catch to prevent parse errors from breaking the UI
      try {
        const accountData = AccountLayout.decode(accountInfo.data);
        return {
          address: tokenAddress,
          mint: mintPublicKey,
          owner: wallet,
          amount: accountData.amount
        };
      } catch (parseError) {
        logger.warn(`Failed to parse token account data: ${parseError.message}`);
        return null;
      }
    } catch (err) {
      // Specific handling for different error types
      if (err instanceof TokenAccountNotFoundError) {
        logger.debug(`Token account not found: ${err.message}`);
        return null;
      }
      
      // Handle rate limiting with exponential backoff
      if (err.message && err.message.includes('429') && retries > 0) {
        const delay = Math.min(
          RPC_RETRY_CONFIG.initialDelayMs * Math.pow(2, RPC_RETRY_CONFIG.maxRetries - retries + 1),
          RPC_RETRY_CONFIG.maxDelayMs
        );
        
        logger.debug(`Rate limit hit. Retrying in ${delay}ms (${RPC_RETRY_CONFIG.maxRetries - retries + 1}/${RPC_RETRY_CONFIG.maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        
        // Recursive retry with one less retry attempt
        return safeGetTokenAccount(connection, wallet, mintPublicKey, retries - 1);
      }
      
      throw err;
    }
  } catch (error) {
    // Catch-all handler for any errors that made it through
    if (error instanceof TokenAccountNotFoundError || 
        (error.message && error.message.includes('account does not exist'))) {
      logger.debug(`Token account for mint ${mintAddress?.toString()} not found for wallet ${wallet?.toString()}. This is normal for new tokens.`);
      return null;
    }
    
    logger.warn(`Error fetching token account: ${error.message}`);
    return null;
  }
}

/**
 * Get token balance for a specific mint
 * @param {Connection} connection - Solana connection
 * @param {PublicKey} wallet - Wallet public key
 * @param {string|PublicKey} mintAddress - Token mint address
 * @param {number} decimals - Token decimals (default: 9)
 * @returns {Promise<number>} Token balance or 0 if not found
 */
export async function getTokenBalance(connection, wallet, mintAddress, decimals = 9) {
  try {
    const account = await safeGetTokenAccount(connection, wallet, mintAddress);
    
    if (!account) return 0;
    
    // Convert amount to a number with proper decimal places
    return Number(account.amount) / Math.pow(10, decimals);
  } catch (error) {
    logger.warn(`Error getting token balance: ${error.message}`);
    return 0;
  }
}

/**
 * Create an associated token account if it doesn't exist
 * @param {Connection} connection - Solana connection
 * @param {Object} payer - Signer object with publicKey and signTransaction methods
 * @param {PublicKey} owner - Owner public key
 * @param {PublicKey} mint - Token mint
 * @returns {Promise<PublicKey>} ATA public key
 */
export async function createAssociatedTokenAccount(connection, payer, owner, mint) {
  try {
    const ata = await getAssociatedTokenAddress(mint, owner);
    const accountInfo = await connection.getAccountInfo(ata);
    
    if (accountInfo) {
      logger.info(`ATA already exists for ${mint.toBase58()}`);
      return ata;
    }
    
    const transaction = new Transaction().add(
      createAssociatedTokenAccountInstruction(payer.publicKey, ata, owner, mint)
    );
    
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = payer.publicKey;
    
    const signedTx = await payer.signTransaction(transaction);
    const txId = await connection.sendRawTransaction(signedTx.serialize());
    await connection.confirmTransaction(txId);
    
    logger.info(`Created ATA for ${mint.toBase58()}: ${txId}`);
    return ata;
  } catch (error) {
    logger.error(`Failed to create ATA for ${mint.toBase58()}: ${error.message}`);
    throw error;
  }
}

/**
 * Check if a user holds a specific token
 * @param {Connection} connection - Solana connection
 * @param {PublicKey} wallet - Wallet public key
 * @param {string|PublicKey} mintAddress - Token mint address
 * @returns {Promise<boolean>} True if user holds the token
 */
export async function doesUserHoldToken(connection, wallet, mintAddress) {
  try {
    const balance = await getTokenBalance(connection, wallet, mintAddress);
    return balance > 0;
  } catch (error) {
    logger.warn(`Error checking if user holds token: ${error.message}`);
    return false;
  }
}

/**
 * Get all token accounts for a wallet with retry logic
 * @param {Connection} connection - Solana connection 
 * @param {PublicKey} owner - Wallet public key
 * @param {PublicKey} programId - Token program ID (default: TOKEN_PROGRAM_ID)
 * @param {number} retries - Number of retries for rate limiting
 * @returns {Promise<Object>} Token accounts response with value array
 */
export async function safeGetTokenAccounts(connection, owner, programId = TOKEN_PROGRAM_ID, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const tokenAccounts = await connection.getParsedTokenAccountsByOwner(owner, { programId });
      return tokenAccounts;
    } catch (error) {
      if (error.name === 'TokenAccountNotFoundError') {
        logger.warn(`No token accounts found for ${owner.toBase58()} on attempt ${attempt}`);
        return { value: [] };
      }
      
      if (attempt === retries) {
        logger.error(`Failed to fetch token accounts after ${retries} attempts: ${error.message}`);
        throw error;
      }
      
      logger.warn(`Token account fetch failed, retrying (${attempt}/${retries}): ${error.message}`);
      await new Promise(resolve => setTimeout(resolve, 
        Math.min(RPC_RETRY_CONFIG.initialDelayMs * Math.pow(2, attempt), RPC_RETRY_CONFIG.maxDelayMs))
      );
    }
  }
  
  // Default fallback if somehow we get here
  return { value: [] };
}

export default {
  safeGetTokenAccount,
  safeGetTokenAccounts,
  getTokenBalance,
  createAssociatedTokenAccount,
  doesUserHoldToken
};