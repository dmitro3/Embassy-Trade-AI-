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
  static #lastEndpointIndex = {};
  
  // Custom RPC endpoints with multiple fallbacks
  static #endpoints = {
    [Networks.MAINNET]: [
      'https://api.mainnet-beta.solana.com',
      'https://solana-api.projectserum.com',
      'https://rpc.ankr.com/solana',
      'https://solana-mainnet.g.alchemy.com/v2/demo',
      'https://solana.public-rpc.com'
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
   * Get the next endpoint for the specified network (round-robin)
   * @param {string} network - The network to get an endpoint for
   * @returns {string} The endpoint URL
   */
  static #getNextEndpoint(network) {
    const endpoints = Networks.#endpoints[network] || [];
    
    if (endpoints.length === 0) {
      return clusterApiUrl(network);
    }
    
    // Initialize last index if not set
    if (Networks.#lastEndpointIndex[network] === undefined) {
      Networks.#lastEndpointIndex[network] = -1;
    }
    
    // Move to next endpoint in round-robin fashion
    Networks.#lastEndpointIndex[network] = 
      (Networks.#lastEndpointIndex[network] + 1) % endpoints.length;
    
    return endpoints[Networks.#lastEndpointIndex[network]];
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
    
    const connectionOptions = {
      commitment: 'confirmed',
      disableRetryOnRateLimit: false,
      confirmTransactionInitialTimeout: 60000 // 60 seconds
    };
    
    // Try to connect with multiple fallbacks if needed
    const errors = [];
    const maxRetries = Networks.#endpoints[network]?.length || 1;
    
    for (let i = 0; i < maxRetries; i++) {
      try {
        // Get next endpoint in rotation
        const endpoint = Networks.#getNextEndpoint(network);
        
        console.log(`Attempting to connect to ${network} using endpoint: ${endpoint}`);
        
        // Create new connection
        const connection = new Connection(endpoint, connectionOptions);
        
        // Test the connection with a simple request
        connection.getRecentBlockhash()
          .then(() => console.log(`Connected to ${network} via ${endpoint}`))
          .catch(err => console.warn(`Connection health check failed for ${endpoint}:`, err));
        
        Networks.#connections[network] = connection;
        return connection;
      } catch (error) {
        console.warn(`Error connecting to ${network} (attempt ${i+1}/${maxRetries}):`, error.message);
        errors.push(error.message);
      }
    }
    
    // All endpoints failed, try Solana's standard endpoint as last resort
    try {
      const fallbackEndpoint = clusterApiUrl(network);
      console.log(`All custom endpoints failed, trying Solana default: ${fallbackEndpoint}`);
      
      const fallbackConnection = new Connection(fallbackEndpoint, connectionOptions);
      Networks.#connections[network] = fallbackConnection;
      return fallbackConnection;
    } catch (fallbackError) {
      console.error(`All connection attempts failed for ${network}`);
      console.error(`Errors:`, errors);
      
      // Create a mock connection that will throw a more helpful error
      const mockConnection = {
        ...Connection.prototype,
        _rpcEndpoint: 'disconnected',
        _commitment: 'confirmed'
      };
      
      // Override methods to return helpful errors
      for (const method of Object.getOwnPropertyNames(Connection.prototype)) {
        if (typeof Connection.prototype[method] === 'function' && method !== 'constructor') {
          mockConnection[method] = function() {
            throw new Error(`Cannot connect to ${network}. Please check your internet connection and try again.`);
          };
        }
      }
      
      return mockConnection;
    }
  }

  /**
   * Get a standard connection to the current network
   * This is an alias for getConnection for backward compatibility
   * @returns {Connection} A Solana connection object
   */
  static getStandardConnection() {
    return Networks.getConnection();
  }

  /**
   * Reset the connection for the current network
   * This is useful when a connection has failed and needs to be refreshed
   */
  static resetConnection() {
    const network = Networks.#currentNetwork;
    delete Networks.#connections[network];
    return Networks.getConnection(true);
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
export const getStandardConnection = () => Networks.getStandardConnection();
export const getCurrentNetwork = () => Networks.getCurrentNetwork();
export const formatPublicKey = (publicKey) => Networks.formatPublicKey(publicKey);
export const resetConnection = () => Networks.resetConnection();
export const isValidPublicKey = (publicKey) => Networks.isValidPublicKey(publicKey);