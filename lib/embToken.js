"use client";

import { Connection, PublicKey } from '@solana/web3.js';
import { getAssociatedTokenAddress, getAccount, TOKEN_PROGRAM_ID } from '@solana/spl-token';

export const EMB_TOKEN_ADDRESS = 'D8U9GxmBGs98geNjWkrYf4GUjHqDvMgG5XdL41TXpump';
const RPC_URL = 'https://devnet-rpc.shyft.to?api_key=oRVaHOZ1n2McZ0BW';

// Export the class directly instead of as default
export class EMBTokenManager {
  constructor() {
    this.connection = new Connection(RPC_URL, 'confirmed');
    this.tokenMint = new PublicKey(EMB_TOKEN_ADDRESS);
    this._isConnected = false;
    this._initializeConnection();
  }

  async _initializeConnection() {
    try {
      await this.connection.getRecentBlockhash();
      this._isConnected = true;
    } catch (e) {
      console.error('Failed to initialize Solana connection:', e);
      this._isConnected = false;
    }
  }

  async _ensureConnection() {
    if (!this._isConnected) {
      await this._initializeConnection();
      if (!this._isConnected) {
        throw new Error('Unable to connect to Solana network');
      }
    }
  }

  async getTokenAccount(walletAddress) {
    try {
      await this._ensureConnection();
      
      const walletPublicKey = new PublicKey(walletAddress);
      const tokenAccount = await getAssociatedTokenAddress(
        this.tokenMint,
        walletPublicKey
      );

      try {
        const account = await getAccount(this.connection, tokenAccount);
        return account;
      } catch (e) {
        // Properly handle TokenAccountNotFoundError without throwing
        if (e.name === 'TokenAccountNotFoundError' || e.message?.includes('TokenAccountNotFoundError')) {
          console.log('Token account not found for wallet:', walletAddress);
          return null;
        }
        throw e;
      }
    } catch (e) {
      console.error('Error in getTokenAccount:', e);
      return null;
    }
  }

  async getBalance(walletAddress) {
    try {
      if (!walletAddress) return 0; // Return 0 instead of throwing when no wallet is connected
      
      const tokenAccount = await this.getTokenAccount(walletAddress);
      if (!tokenAccount) {
        console.log('No token account found, simulating test balance');
        return 100; // Simulated balance for testing
      }

      return Number(tokenAccount.amount) / 1e9; // Adjust for decimals
    } catch (e) {
      console.error('Error fetching EMB balance:', e);
      // Return 0 balance on error instead of throwing
      return 0;
    }
  }

  async validateTradeFees(walletAddress) {
    const MIN_TRADE_FEE = 0.1; // 0.1 EMB per trade
    try {
      if (!walletAddress) {
        return {
          canTrade: false,
          tradeFee: MIN_TRADE_FEE,
          balance: 0,
          error: 'No wallet address provided'
        };
      }
      
      const balance = await this.getBalance(walletAddress);
      return {
        canTrade: balance >= MIN_TRADE_FEE,
        tradeFee: MIN_TRADE_FEE,
        balance
      };
    } catch (e) {
      console.error('Error validating trade fees:', e);
      return {
        canTrade: false,
        tradeFee: MIN_TRADE_FEE,
        balance: 0,
        error: e.message
      };
    }
  }

  // Mock function for deducting trade fees (to be implemented with real transaction)
  async deductTradeFee(walletAddress) {
    const fees = await this.validateTradeFees(walletAddress);
    if (!fees.canTrade) {
      throw new Error(`Insufficient EMB balance. Required: ${fees.tradeFee} EMB`);
    }
    // TODO: Implement actual token transfer transaction
    // For now, we'll just simulate the fee deduction
    return true;
  }

  // Check if token account exists
  async hasTokenAccount(walletAddress) {
    try {
      const account = await this.getTokenAccount(walletAddress);
      return account !== null;
    } catch (e) {
      console.error('Error checking token account:', e);
      return false;
    }
  }
}

// Create singleton instance and export it as default
const embTokenManager = new EMBTokenManager();
export default embTokenManager;