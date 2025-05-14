// filepath: c:\Users\pablo\Projects\embassy-trade-motia\web\lib\shyftService.js
'use client';

import axios from 'axios';
import logger from './logger.js';
import { getApiKey } from './apiKeys.js';

/**
 * SHYFT API Service
 * 
 * Provides access to the SHYFT API for Solana token data
 */
class ShyftService {
  constructor() {
    this.baseUrl = 'https://api.shyft.to/sol/v1';
    this.apiKey = null;
    this.websocketUrl = null;
    this.rpcUrl = null;
    this.graphqlUrl = null;
    this.network = 'devnet'; // Default to devnet
    
    // Initialize API keys
    this.initializeApiKeys();
  }
  
  /**
   * Initialize API keys from MongoDB
   */
  async initializeApiKeys() {
    try {
      // Get API key for current network
      const credentials = await getApiKey('shyft', this.network);
      
      if (credentials) {
        this.apiKey = credentials.api_key;
        this.websocketUrl = credentials.websocket_url;
        this.rpcUrl = credentials.rpc_url;
        this.graphqlUrl = credentials.graphql_url;
        
        logger.info(`SHYFT API keys loaded for ${this.network}`);
      } else {
        // Fallback to environment variables or hardcoded values
        this.apiKey = process.env.NEXT_PUBLIC_SHYFT_API_KEY || (this.network === 'devnet' ? 'oRVaHOZ1n2McZ0BW' : 'whv00T87G8Sd8TeK');
        this.websocketUrl = `wss://${this.network === 'devnet' ? 'devnet-' : ''}rpc.shyft.to?api_key=${this.apiKey}`;
        this.rpcUrl = `https://${this.network === 'devnet' ? 'devnet-' : ''}rpc.shyft.to?api_key=${this.apiKey}`;
        this.graphqlUrl = `https://${this.network === 'devnet' ? 'programs' : 'rpc'}.shyft.to${this.network === 'devnet' ? '/v0/graphql/' : ''}?api_key=${this.apiKey}${this.network === 'devnet' ? '&network=devnet' : ''}`;
        
        logger.warn(`Using fallback SHYFT API keys for ${this.network}`);
      }
    } catch (error) {
      // Fallback to environment variables or hardcoded values
      this.apiKey = process.env.NEXT_PUBLIC_SHYFT_API_KEY || (this.network === 'devnet' ? 'oRVaHOZ1n2McZ0BW' : 'whv00T87G8Sd8TeK');
      this.websocketUrl = `wss://${this.network === 'devnet' ? 'devnet-' : ''}rpc.shyft.to?api_key=${this.apiKey}`;
      this.rpcUrl = `https://${this.network === 'devnet' ? 'devnet-' : ''}rpc.shyft.to?api_key=${this.apiKey}`;
      this.graphqlUrl = `https://${this.network === 'devnet' ? 'programs' : 'rpc'}.shyft.to${this.network === 'devnet' ? '/v0/graphql/' : ''}?api_key=${this.apiKey}${this.network === 'devnet' ? '&network=devnet' : ''}`;
      
      logger.error(`Error loading SHYFT API keys: ${error.message}`);
      logger.warn(`Using fallback SHYFT API keys for ${this.network}`);
    }
  }

  /**
   * Set the network to use (devnet or mainnet)
   * 
   * @param {string} network - The network to use
   */
  async setNetwork(network) {
    if (network !== 'devnet' && network !== 'mainnet-beta') {
      throw new Error('Invalid network. Must be "devnet" or "mainnet-beta"');
    }
    
    // Only update if network changed
    if (this.network !== network) {
      this.network = network;
      
      // Reinitialize API keys for the new network
      await this.initializeApiKeys();
    }
  }
  /**
   * Get token information
   * 
   * @param {string} tokenAddress - The token address
   * @returns {Promise<Object>} - Token information
   */
  async getTokenInfo(tokenAddress) {
    try {
      // Validate token address
      if (!tokenAddress || typeof tokenAddress !== 'string') {
        throw new Error('Invalid token address');
      }
      
      // Clean and validate the address format
      const cleanAddress = tokenAddress.trim();
      if (!/^[A-HJ-NP-Za-km-z1-9]{32,44}$/.test(cleanAddress)) {
        logger.warn(`Invalid token address format: ${tokenAddress}`);
        // Return a minimal fallback object for invalid addresses
        return {
          address: cleanAddress,
          symbol: cleanAddress.substring(0, 4),
          name: `Unknown (${cleanAddress.substring(0, 8)}...)`,
          decimals: 9,
          fallback: true
        };
      }
      
      const url = `${this.baseUrl}/token/get_info`;
      
      // Ensure API key is loaded
      if (!this.apiKey) {
        await this.initializeApiKeys();
      }
      
      const response = await axios.get(url, {
        headers: { 'x-api-key': this.apiKey },
        params: { network: this.network, token_address: cleanAddress },
        timeout: 10000 // 10 second timeout
      });
      
      if (!response.data || !response.data.result) {
        throw new Error('Invalid response from SHYFT API');
      }
      
      return response.data.result;
    } catch (error) {
      logger.error(`SHYFT getTokenInfo error for ${tokenAddress}: ${error.message}`);
      
      // Return fallback data instead of throwing
      return {
        address: tokenAddress,
        symbol: tokenAddress.substring(0, 4),
        name: `Unknown Token (${tokenAddress.substring(0, 8)}...)`,
        decimals: 9,
        fallback: true,
        error: error.message
      };
    }
  }

  /**
   * Get token metadata
   * 
   * @param {string} tokenAddress - The token address
   * @returns {Promise<Object>} - Token metadata
   */
  async getTokenMetadata(tokenAddress) {
    try {
      const url = `${this.baseUrl}/token/meta`;
      
      // Ensure API key is loaded
      if (!this.apiKey) {
        await this.initializeApiKeys();
      }
      
      const response = await axios.get(url, {
        headers: { 'x-api-key': this.apiKey },
        params: { network: this.network, token_address: tokenAddress }
      });
      
      return response.data.result;
    } catch (error) {
      logger.error(`SHYFT getTokenMetadata error: ${error.message}`);
      throw new Error(`Failed to get token metadata: ${error.message}`);
    }
  }
    /**
   * Get token price
   * 
   * @param {string} tokenAddress - The token address
   * @returns {Promise<Object>} - Token price information
   */
  async getTokenPrice(tokenAddress) {
    try {
      // Validate token address
      if (!tokenAddress || typeof tokenAddress !== 'string') {
        throw new Error('Invalid token address');
      }
      
      // Clean address
      const cleanAddress = tokenAddress.trim();
      
      const url = `${this.baseUrl}/token/price`;
      
      // Ensure API key is loaded
      if (!this.apiKey) {
        await this.initializeApiKeys();
      }
      
      const response = await axios.get(url, {
        headers: { 'x-api-key': this.apiKey },
        params: { network: this.network, token_address: cleanAddress },
        timeout: 10000 // 10 second timeout
      });
      
      if (!response.data || !response.data.result) {
        throw new Error('Invalid response from SHYFT API');
      }
      
      return response.data.result;
    } catch (error) {
      logger.error(`SHYFT getTokenPrice error for ${tokenAddress}: ${error.message}`);
      
      // Return fallback data instead of throwing
      let fallbackPrice = 0;
      
      // Generate deterministic placeholder price for known tokens
      if (cleanAddress === 'So11111111111111111111111111111111111111112') {
        fallbackPrice = 150.42; // SOL
      } else if (cleanAddress === 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v') {
        fallbackPrice = 1.00; // USDC
      } else {
        // Generate semi-random price from address to maintain consistency
        const hash = Array.from(tokenAddress).reduce((sum, char) => sum + char.charCodeAt(0), 0);
        fallbackPrice = (hash % 1000) / 100; // Between 0 and 10
      }
      
      return {
        value: fallbackPrice,
        price_change_24h: 0,
        volume_24h: 0,
        fallback: true,
        error: error.message
      };
    }
  }

  /**
   * Get top Solana tokens
   * 
   * @param {number} limit - Maximum number of tokens to return (default: 10)
   * @returns {Promise<Array>} - Array of token information
   */
  async getTopTokens(limit = 10) {
    try {
      // For devnet, return a list of well-known devnet tokens
      if (this.network === 'devnet') {
        return [
          { address: 'So11111111111111111111111111111111111111112', symbol: 'SOL', name: 'Solana' },
          { address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', symbol: 'USDC', name: 'USD Coin' },
          { address: 'DUSTawucrTsGU8hcqRdHDCbuYhCPADMLM2VcCb8VnFnQ', symbol: 'DUST', name: 'DUST Protocol' },
          { address: 'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So', symbol: 'mSOL', name: 'Marinade staked SOL' },
          { address: 'kinXdEcpDQeHPEuQnqmUgtYykqKGVFq6CeVX5iAHJq6', symbol: 'KIN', name: 'KIN' }
        ].slice(0, limit);
      }
      
      // For mainnet, get tokens from the API
      const url = `${this.baseUrl}/token/popular`;
      
      // Ensure API key is loaded
      if (!this.apiKey) {
        await this.initializeApiKeys();
      }
      
      const response = await axios.get(url, {
        headers: { 'x-api-key': this.apiKey },
        params: { network: this.network, limit }
      });
      
      return response.data.result;    } catch (error) {
      logger.error(`SHYFT getTopTokens error: ${error.message}`);
      
      // Return fallback tokens instead of throwing
      const fallbackTokens = [
        { address: 'So11111111111111111111111111111111111111112', symbol: 'SOL', name: 'Solana', fallback: true },
        { address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', symbol: 'USDC', name: 'USD Coin', fallback: true },
        { address: 'DUSTawucrTsGU8hcqRdHDCbuYhCPADMLM2VcCb8VnFnQ', symbol: 'DUST', name: 'DUST Protocol', fallback: true },
        { address: 'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So', symbol: 'mSOL', name: 'Marinade staked SOL', fallback: true },
        { address: 'kinXdEcpDQeHPEuQnqmUgtYykqKGVFq6CeVX5iAHJq6', symbol: 'KIN', name: 'KIN', fallback: true }
      ].slice(0, limit);
      
      return fallbackTokens;
    }
  }
  /**
   * Get token transactions
   * 
   * @param {string} tokenAddress - The token address
   * @param {Object} params - Additional parameters
   * @returns {Promise<Array>} - Array of transactions
   */
  async getTokenTransactions(tokenAddress, params = {}) {
    try {
      // Validate token address
      if (!tokenAddress || typeof tokenAddress !== 'string') {
        throw new Error('Invalid token address');
      }
      
      const url = `${this.baseUrl}/transaction/history`;
      const queryParams = {
        network: this.network,
        token_address: tokenAddress,
        limit: params.limit || 10
      };
      
      // Ensure API key is loaded
      if (!this.apiKey) {
        await this.initializeApiKeys();
      }
      
      const response = await axios.get(url, {
        headers: { 'x-api-key': this.apiKey },
        params: queryParams,
        timeout: 10000 // 10 second timeout
      });
      
      return response.data.result || [];
    } catch (error) {
      logger.error(`SHYFT getTokenTransactions error: ${error.message}`);
      
      // Return empty array instead of throwing
      return [
        {
          signature: 'fallback_tx_' + Date.now(),
          timestamp: new Date().toISOString(),
          fallback: true,
          error: error.message
        }
      ];
    }
  }

  /**
   * Get wallet token balance
   * 
   * @param {string} walletAddress - The wallet address
   * @returns {Promise<Array>} - Array of token balances
   */
  async getWalletTokens(walletAddress) {
    try {
      const url = `${this.baseUrl}/wallet/all_tokens`;
      
      // Ensure API key is loaded
      if (!this.apiKey) {
        await this.initializeApiKeys();
      }
      
      const response = await axios.get(url, {
        headers: { 'x-api-key': this.apiKey },
        params: { network: this.network, wallet: walletAddress }
      });
      
      return response.data.result || [];
    } catch (error) {
      logger.error(`SHYFT getWalletTokens error: ${error.message}`);
      throw new Error(`Failed to get wallet tokens: ${error.message}`);
    }
  }
}

// Create and export singleton instance
const shyftService = new ShyftService();
export default shyftService;
