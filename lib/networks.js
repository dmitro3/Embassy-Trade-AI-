'use client';

import { Connection } from '@solana/web3.js';
import { PublicKey } from '@solana/web3.js';
import { clusterApiUrl } from '@solana/web3.js';

/**
 * Networks utility class
 * Provides standardized network connections and utility functions for Solana
 */
class Networks {
  static MAINNET = 'mainnet-beta';
  static DEVNET = 'devnet';
  static TESTNET = 'testnet';
  static LOCALNET = 'localnet';

  static #connections = {};
  static #currentNetwork = Networks.DEVNET; // Default to devnet
  
  // Custom RPC endpoints
  static #endpoints = {
    [Networks.MAINNET]: [
      'https://api.mainnet-beta.solana.com',
      'https://solana-api.projectserum.com'
    ],
    [Networks.DEVNET]: [
      'https://api.devnet.solana.com',
      'https://devnet.solana.com'
    ],
    [Networks.TESTNET]: [
      'https://api.testnet.solana.com'
    ],
    [Networks.LOCALNET]: [
      'http://localhost:8899'
    ]
  };
  
  /**
   * Set the current network
   * @param {string} network - The network to set as current
   */
  static setCurrentNetwork(network) {
    if (!Object.values(Networks).includes(network)) {
      console.error(`Invalid network: ${network}`);
      return;
    }
    
    Networks.#currentNetwork = network;
    console.log(`Network set to ${network}`);
  }
  
  /**
   * Get the current network
   * @returns {string} The current network
   */
  static getCurrentNetwork() {
    return Networks.#currentNetwork;
  }
  
  /**
   * Get a Solana connection to the current network
   * @param {boolean} forceNew - Force a new connection even if one exists
   * @returns {Connection} A Solana connection object
   */
  static getConnection(forceNew = false) {
    const network = Networks.#currentNetwork;
    
    if (!forceNew && Networks.#connections[network]) {
      return Networks.#connections[network];
    }
    
    // Get preferred endpoint for this network
    const endpoints = Networks.#endpoints[network];
    const endpoint = endpoints && endpoints.length > 0 
      ? endpoints[0] 
      : clusterApiUrl(network);
    
    try {
      // Create new connection
      const connection = new Connection(endpoint, 'confirmed');
      Networks.#connections[network] = connection;
      return connection;
    } catch (error) {
      console.error(`Error creating connection to ${network}: ${error.message}`);
      
      // Try to use Solana's standard endpoints as fallback
      try {
        const fallbackEndpoint = clusterApiUrl(network);
        const fallbackConnection = new Connection(fallbackEndpoint, 'confirmed');
        Networks.#connections[network] = fallbackConnection;
        console.log(`Using fallback endpoint for ${network}: ${fallbackEndpoint}`);
        return fallbackConnection;
      } catch (fallbackError) {
        console.error(`Fallback connection failed: ${fallbackError.message}`);
        throw new Error(`Could not connect to ${network}: ${fallbackError.message}`);
      }
    }
  }
  
  /**
   * Get all available networks
   * @returns {string[]} Array of available networks
   */
  static getAvailableNetworks() {
    return [
      Networks.MAINNET,
      Networks.DEVNET,
      Networks.TESTNET,
      Networks.LOCALNET
    ];
  }
  
  /**
   * Format a public key for display
   * @param {PublicKey|string} publicKey - The public key to format
   * @returns {string} Formatted public key (e.g., "Abcd...wxyz")
   */
  static formatPublicKey(publicKey) {
    if (!publicKey) return '';
    
    let pkStr = typeof publicKey === 'string' 
      ? publicKey 
      : publicKey.toString();
    
    if (pkStr.length <= 10) return pkStr;
    return `${pkStr.substring(0, 4)}...${pkStr.substring(pkStr.length - 4)}`;
  }
  
  /**
   * Validate a public key
   * @param {string} publicKeyString - The public key string to validate
   * @returns {boolean} True if valid, false otherwise
   */
  static isValidPublicKey(publicKeyString) {
    try {
      new PublicKey(publicKeyString);
      return true;
    } catch (error) {
      return false;
    }
  }
  
  /**
   * Get explorer URL for a transaction, account, or other entity
   * @param {string} address - Transaction ID, account address, etc.
   * @param {string} type - Type of entity ('tx', 'address', 'block', etc.)
   * @returns {string} The explorer URL
   */
  static getExplorerUrl(address, type = 'address') {
    const network = Networks.#currentNetwork;
    const cluster = network !== Networks.MAINNET ? `?cluster=${network}` : '';
    
    return `https://explorer.solana.com/${type}/${address}${cluster}`;
  }

  /**
   * Gets the standard Solana fee estimate based on the current network
   * @returns {number} The estimated fee in lamports
   */
  static getSolanaFee() {
    // Default fee estimates based on network
    const defaultFees = {
      [Networks.MAINNET]: 5000,  // 5000 lamports on mainnet
      [Networks.DEVNET]: 10000,  // 10000 lamports on devnet (higher for testing)
      [Networks.TESTNET]: 10000,
      [Networks.LOCALNET]: 1000
    };
    
    return defaultFees[Networks.#currentNetwork] || 5000;
  }
}

// Export the default Networks class
export default Networks;

// Export named functions for direct import - make them callable functions
export const getSolanaFee = () => Networks.getSolanaFee();
export const getConnection = (forceNew) => Networks.getConnection(forceNew);
export const getCurrentNetwork = () => Networks.getCurrentNetwork();
export const formatPublicKey = (publicKey) => Networks.formatPublicKey(publicKey);