import { PublicKey } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';

/**
 * Utility functions for safer token account handling
 * Helps prevent TokenAccountNotFoundError
 */

/**
 * Safely fetch token accounts with error handling
 * @param {Connection} connection - Solana connection object
 * @param {PublicKey} owner - Token account owner
 * @returns {Promise<Array>} - Array of token accounts or empty array if error
 */
export const safeGetTokenAccounts = async (connection, owner) => {
  try {
    // Validate inputs
    if (!connection || !owner) {
      console.warn('Invalid connection or owner for token accounts');
      return [];
    }

    // Set a timeout to prevent hanging requests
    const timeout = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Token accounts request timed out')), 10000)
    );
    
    // Get token accounts with timeout
    const accountsPromise = connection.getParsedTokenAccountsByOwner(
      owner,
      { programId: TOKEN_PROGRAM_ID }
    );
    
    const accounts = await Promise.race([accountsPromise, timeout]);
    return accounts?.value || [];
  } catch (error) {
    console.warn('Error fetching token accounts:', error.message);
    // Return empty array instead of failing
    return [];
  }
};

/**
 * Safely get a single token account by mint
 * @param {Connection} connection - Solana connection object
 * @param {PublicKey} owner - Token account owner
 * @param {PublicKey} mint - Token mint address
 * @returns {Promise<Object|null>} - Token account or null if not found/error
 */
export const safeGetTokenAccountByMint = async (connection, owner, mint) => {
  try {
    const accounts = await safeGetTokenAccounts(connection, owner);
    
    // Find the account with the matching mint
    return accounts.find(account => {
      try {
        const parsedInfo = account?.account?.data?.parsed?.info;
        return parsedInfo?.mint === mint.toString();
      } catch (e) {
        return false;
      }
    }) || null;
  } catch (error) {
    console.warn('Error finding token account by mint:', error.message);
    return null;
  }
};

/**
 * Safely unwrap token account data with robust error handling
 * @param {Object} tokenAccount - Token account from getParsedTokenAccounts
 * @returns {Object|null} - Unwrapped data or null if invalid
 */
export const safeUnwrapTokenAccount = (tokenAccount) => {
  try {
    if (!tokenAccount || !tokenAccount.account || !tokenAccount.account.data || 
        !tokenAccount.account.data.parsed || !tokenAccount.account.data.parsed.info) {
      return null;
    }
    
    const info = tokenAccount.account.data.parsed.info;
    
    // Validate essential fields
    if (!info.mint || !info.tokenAmount || info.tokenAmount.decimals === undefined) {
      return null;
    }
    
    return {
      mint: info.mint,
      owner: info.owner,
      amount: info.tokenAmount.amount,
      decimals: info.tokenAmount.decimals,
      uiAmount: info.tokenAmount.uiAmount,
      address: tokenAccount.pubkey.toString()
    };
  } catch (error) {
    console.warn('Error unwrapping token account:', error.message);
    return null;
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
    const pubkey = typeof address === 'string' ? new PublicKey(address) : address;
    const accountInfo = await connection.getAccountInfo(pubkey);
    return accountInfo !== null;
  } catch (error) {
    return false;
  }
};