/**
 * Photon API Client for Embassy Trade AI
 * Handles secure integration with Photon Network for trade execution
 */

import axios from 'axios';
import bs58 from 'bs58';
import { Connection, PublicKey, Keypair, clusterApiUrl } from '@solana/web3.js';
import EMBAITokenManager from '../../lib/embaiToken.js';
import 'dotenv/config';

// Secure access to private keys
const PHOTON_PRIVATE_KEY = process.env.PHOTON_PRIVATE_KEY;
const SPL_PRIVATE_KEY = process.env.SPL_PRIVATE_KEY;
const EMBAI_MINT_ADDRESS = process.env.EMBAI_MINT_ADDRESS || '3xAcrqNddNmc8piAk6HHxhKJtr7gt6hKCkXHhCkcA84G';

// API configuration
const PHOTON_API_BASE_URL = 'https://api.photonnetwork.io/v1';
const TRADING_ROUTES = {
  PLACE_ORDER: '/orders',
  CANCEL_ORDER: '/orders/:id',
  GET_ORDERS: '/orders',
  GET_MARKET_DATA: '/markets/:pair',
  WALLET_BALANCE: '/wallet/balance'
};

// Initialize token manager for fee calculations and burning
const tokenManager = new EMBAITokenManager(new Connection(clusterApiUrl('devnet')));

// Securely load API keys from environment variables
const PHOTON_API_KEY = process.env.PHOTON_PRIVATE_KEY || '38HQ8wNk38Q4VCfrSfESGgggoefgPF9kaeZbYvLC6nKqGTLnQN136CLRiqi6e68yppFB5ypjwzjNCTdjyoieiQQe';
const SPL_PRIVATE_KEY_ENV = process.env.SPL_PRIVATE_KEY || '3wJWjehmeLyhDhWgEzfGf89vLrqqAu8rW2zz9ddSwzL2MqYkuuWEXLXwKPvrVyvAfaXk61nKDSr9sTjpmMoDuTkL';

/**
 * Creates a secure client for making authenticated API calls to Photon
 * NEVER expose the API key in client-side code
 */
class PhotonApiClient {
  constructor() {
    this.client = axios.create({
      baseURL: PHOTON_API_BASE_URL,
      headers: {
        'Authorization': `Bearer ${PHOTON_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    this.connectedWallets = new Map(); // Track connected wallets
  }

  /**
   * Connect a user's wallet to Photon
   * @param {string} walletAddress - The user's Solana wallet address
   * @returns {Promise<Object>} - Connection status
   */
  async connectWallet(walletAddress) {
    try {
      // In a real implementation, this would make an actual API call to Photon
      // For development, we'll simulate success
      
      // Check if wallet is already connected
      if (this.connectedWallets.has(walletAddress)) {
        return {
          success: true,
          walletAddress,
          message: 'Wallet already connected',
          isNewConnection: false
        };
      }
      
      // Simulate connecting to Photon
      console.log(`[Photon API] Connecting wallet ${walletAddress} to Photon`);
      
      // Store connection in memory (would be in database in production)
      this.connectedWallets.set(walletAddress, {
        connectedAt: new Date(),
        lastActive: new Date()
      });
      
      return {
        success: true,
        walletAddress,
        message: 'Wallet successfully connected',
        isNewConnection: true
      };
    } catch (error) {
      console.error('[Photon API] Error connecting wallet:', error);
      throw new Error(`Failed to connect wallet: ${error.message}`);
    }
  }

  /**
   * Execute a trade on behalf of a user
   * @param {Object} tradeParams - Trade parameters
   * @param {string} walletAddress - The user's wallet address
   * @returns {Promise<Object>} - Trade execution result
   */
  async executeTrade(tradeParams, walletAddress) {
    try {
      // Check if wallet is connected
      if (!this.connectedWallets.has(walletAddress)) {
        throw new Error('Wallet not connected to Photon');
      }
      
      // Update last active timestamp
      this.connectedWallets.get(walletAddress).lastActive = new Date();
      
      console.log(`[Photon API] Executing trade for wallet ${walletAddress}`);
      
      // Determine trading fee discount
      let tradingFeeDiscount = 0;
      
      // If this is a live trade and user wants to pay with EMBAI
      if (!tradeParams.isPaperTrade && tradeParams.useEmbaiForFees) {
        // Calculate trading fee with EMBAI discount
        const feeData = tokenManager.calculateTradingFee(tradeParams.amount || 1000, true);
        tradingFeeDiscount = feeData.discount / 100; // Convert percentage to decimal
        
        // In production, we would burn a percentage of the EMBAI tokens used for fees
        // This would be handled securely on the server using the SPL_PRIVATE_KEY_ENV
        // Example:
        // await tokenManager.burnFromTradingFees(feeData.embaiTokensNeeded * tokenManager.BURN_PERCENTAGE, SPL_PRIVATE_KEY_ENV);
        
        console.log(`[Photon API] Applied ${tradingFeeDiscount * 100}% fee discount using EMBAI tokens`);
      }
      
      // In a real implementation, we would make an actual API call to Photon
      // For development, we'll simulate a successful trade
      const traderId = `trader_${walletAddress.substring(0, 8)}`;
      
      // Simulate transaction delay
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Prepare response
      const isPaperTrade = tradeParams.isPaperTrade ?? true;
      const tradeResult = {
        success: true,
        tradeId: `trade_${Date.now()}`,
        traderId,
        market: tradeParams.market,
        direction: tradeParams.action === 'buy' ? 'long' : 'short',
        size: tradeParams.size || 1,
        entryPrice: tradeParams.price || 100,
        status: 'open',
        timestamp: new Date().toISOString(),
        isPaperTrade,
        tradingFeeDiscount,
        executedBy: 'photon_api'
      };
      
      console.log(`[Photon API] Trade executed:`, tradeResult);
      
      return tradeResult;
    } catch (error) {
      console.error('[Photon API] Error executing trade:', error);
      throw new Error(`Failed to execute trade: ${error.message}`);
    }
  }

  /**
   * Close a trade position
   * @param {string} tradeId - ID of the trade to close
   * @param {string} walletAddress - The user's wallet address
   * @returns {Promise<Object>} - Trade closing result
   */
  async closeTrade(tradeId, walletAddress) {
    try {
      // Check if wallet is connected
      if (!this.connectedWallets.has(walletAddress)) {
        throw new Error('Wallet not connected to Photon');
      }
      
      // In a real implementation, we would make an API call to Photon
      // For development, we'll simulate closing a trade
      console.log(`[Photon API] Closing trade ${tradeId} for wallet ${walletAddress}`);
      
      // Simulate calculation of profit/loss
      const profit = Math.random() > 0.5 ? 
        Math.random() * 500 : // Profit
        -1 * Math.random() * 300; // Loss
      
      // Simulate transaction delay
      await new Promise(resolve => setTimeout(resolve, 600));
      
      return {
        success: true,
        tradeId,
        status: 'closed',
        closedAt: new Date().toISOString(),
        profit: profit.toFixed(2),
        message: `Trade ${tradeId} closed successfully`
      };
    } catch (error) {
      console.error('[Photon API] Error closing trade:', error);
      throw new Error(`Failed to close trade: ${error.message}`);
    }
  }

  /**
   * Get user's trading history
   * @param {string} walletAddress - The user's wallet address
   * @returns {Promise<Array>} - List of trades
   */
  async getTrades(walletAddress) {
    try {
      // Check if wallet is connected
      if (!this.connectedWallets.has(walletAddress)) {
        throw new Error('Wallet not connected to Photon');
      }
      
      console.log(`[Photon API] Getting trades for wallet ${walletAddress}`);
      
      // In a real implementation, we would fetch trades from Photon API
      // For development, we'll return mock trades
      const now = Date.now();
      
      return [
        {
          id: 'trade_1',
          market: 'SOL-USD',
          direction: 'long',
          entryPrice: 138.42,
          size: 10,
          status: 'open',
          timestamp: new Date(now - 1000 * 60 * 15).toISOString(),
          isPaperTrade: true,
          profit: null
        },
        {
          id: 'trade_2',
          market: 'BTC-USD',
          direction: 'short',
          entryPrice: 62150.50,
          size: 0.2,
          status: 'closed',
          timestamp: new Date(now - 1000 * 60 * 120).toISOString(),
          closedAt: new Date(now - 1000 * 60 * 90).toISOString(),
          isPaperTrade: true,
          profit: 250.75
        },
        {
          id: 'trade_3',
          market: 'ETH-USD',
          direction: 'long',
          entryPrice: 3291.14,
          size: 2.5,
          status: 'closed',
          timestamp: new Date(now - 1000 * 60 * 240).toISOString(),
          closedAt: new Date(now - 1000 * 60 * 220).toISOString(),
          isPaperTrade: false,
          profit: -125.30
        },
        {
          id: 'trade_4',
          market: 'FARTCOIN-USD',
          direction: 'long',
          entryPrice: 0.0042,
          size: 100000,
          status: 'closed',
          timestamp: new Date(now - 1000 * 60 * 360).toISOString(),
          closedAt: new Date(now - 1000 * 60 * 300).toISOString(),
          isPaperTrade: true,
          profit: 850.50
        }
      ];
    } catch (error) {
      console.error('[Photon API] Error getting trades:', error);
      throw new Error(`Failed to get trades: ${error.message}`);
    }
  }

  /**
   * Get market data from Photon
   * @param {string} market - Market symbol (e.g., 'SOL-USD')
   * @returns {Promise<Object>} - Market data
   */
  async getMarketData(market) {
    try {
      console.log(`[Photon API] Getting market data for ${market}`);
      
      // In a real implementation, this would fetch from Photon API
      // For development, we'll return mock data
      const mockPrices = {
        'SOL-USD': 138.42,
        'BTC-USD': 62150.50,
        'ETH-USD': 3291.14,
        'FARTCOIN-USD': 0.0042,
        'MOBY-USD': 0.0315
      };
      
      const price = mockPrices[market] || 100;
      
      return {
        market,
        price,
        change24h: (Math.random() * 10) - 5, // -5% to +5%
        volume24h: Math.floor(Math.random() * 1000000) + 100000,
        lastUpdated: new Date().toISOString()
      };
    } catch (error) {
      console.error('[Photon API] Error getting market data:', error);
      throw new Error(`Failed to get market data: ${error.message}`);
    }
  }

  /**
   * Get AI-powered trading signals
   * @returns {Promise<Array>} - List of trading signals
   */
  async getAISignals() {
    try {
      console.log('[Photon API] Getting AI trading signals');
      
      // In a real implementation, this would fetch from Photon API's AI component
      // For development, we'll return mock signals
      return [
        {
          id: 'signal_1',
          source: 'AIXBT',
          market: 'SOL-USD',
          direction: 'buy',
          confidence: 0.89,
          timestamp: new Date().toISOString(),
          description: 'Strong momentum detected with increasing volume',
          expiresAt: new Date(Date.now() + 1000 * 60 * 60).toISOString() // 1 hour
        },
        {
          id: 'signal_2',
          source: '@mobyagent',
          market: 'FARTCOIN-USD',
          direction: 'buy',
          confidence: 0.76,
          timestamp: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
          description: 'Whale accumulation detected at low market cap',
          expiresAt: new Date(Date.now() + 1000 * 60 * 50).toISOString() // 50 minutes
        }
      ];
    } catch (error) {
      console.error('[Photon API] Error getting AI signals:', error);
      throw new Error(`Failed to get AI signals: ${error.message}`);
    }
  }
}

// Export a singleton instance
const photonClient = new PhotonApiClient();
export default photonClient;