'use client';

import { Connection, clusterApiUrl } from '@solana/web3.js';
import logger from './logger';

/**
 * Network configurations for Solana
 */
const NETWORKS = {
  'mainnet-beta': {
    name: 'Mainnet Beta',
    endpoint: 'https://api.mainnet-beta.solana.com',
    websocket: 'wss://api.mainnet-beta.solana.com',
    explorer: 'https://explorer.solana.com'
  },
  'devnet': {
    name: 'Devnet',
    endpoint: 'https://api.devnet.solana.com',
    websocket: 'wss://api.devnet.solana.com',
    explorer: 'https://explorer.solana.com'
  },
  'testnet': {
    name: 'Testnet',
    endpoint: 'https://api.testnet.solana.com',
    websocket: 'wss://api.testnet.solana.com',
    explorer: 'https://explorer.solana.com'
  },
  'localnet': {
    name: 'Localnet',
    endpoint: 'http://localhost:8899',
    websocket: 'ws://localhost:8900',
    explorer: null
  }
};

// Default network
let currentNetwork = 'devnet';

// Connection cache
const connectionCache = {};

/**
 * Get the current network
 * 
 * @returns {string} - Current network name
 */
export function getCurrentNetwork() {
  return currentNetwork;
}

/**
 * Set the current network
 * 
 * @param {string} network - Network name
 */
export function setCurrentNetwork(network) {
  if (!NETWORKS[network]) {
    throw new Error(`Invalid network: ${network}`);
  }
  
  currentNetwork = network;
  logger.info(`Network set to ${network}`);
}

/**
 * Get network configuration
 * 
 * @param {string} network - Network name (optional, defaults to current network)
 * @returns {Object} - Network configuration
 */
export function getNetworkConfig(network = currentNetwork) {
  return NETWORKS[network] || NETWORKS.devnet;
}

/**
 * Get Solana connection for the current network
 * 
 * @param {string} network - Network name (optional, defaults to current network)
 * @param {Object} options - Connection options
 * @returns {Connection} - Solana connection
 */
export function getConnection(network = currentNetwork, options = {}) {
  const cacheKey = `${network}-${JSON.stringify(options)}`;
  
  if (!connectionCache[cacheKey]) {
    const networkConfig = getNetworkConfig(network);
    
    // Use custom endpoint if available, otherwise use clusterApiUrl
    const endpoint = networkConfig.endpoint || clusterApiUrl(network);
    
    // Create connection with default options
    const defaultOptions = {
      commitment: 'confirmed',
      disableRetryOnRateLimit: false,
      confirmTransactionInitialTimeout: 60000
    };
    
    // Merge default options with provided options
    const connectionOptions = {
      ...defaultOptions,
      ...options
    };
    
    connectionCache[cacheKey] = new Connection(endpoint, connectionOptions);
    logger.debug(`Created new connection for ${network}`);
  }
  
  return connectionCache[cacheKey];
}

/**
 * Get WebSocket URL for the current network
 * 
 * @param {string} network - Network name (optional, defaults to current network)
 * @returns {string} - WebSocket URL
 */
export function getWebSocketUrl(network = currentNetwork) {
  const networkConfig = getNetworkConfig(network);
  return networkConfig.websocket;
}

/**
 * Get explorer URL for a transaction
 * 
 * @param {string} signature - Transaction signature
 * @param {string} network - Network name (optional, defaults to current network)
 * @returns {string} - Explorer URL
 */
export function getExplorerUrl(signature, network = currentNetwork) {
  const networkConfig = getNetworkConfig(network);
  
  if (!networkConfig.explorer) {
    return null;
  }
  
  const clusterParam = network === 'mainnet-beta' ? '' : `?cluster=${network}`;
  return `${networkConfig.explorer}/tx/${signature}${clusterParam}`;
}

/**
 * Get explorer URL for an address
 * 
 * @param {string} address - Account address
 * @param {string} network - Network name (optional, defaults to current network)
 * @returns {string} - Explorer URL
 */
export function getAddressExplorerUrl(address, network = currentNetwork) {
  const networkConfig = getNetworkConfig(network);
  
  if (!networkConfig.explorer) {
    return null;
  }
  
  const clusterParam = network === 'mainnet-beta' ? '' : `?cluster=${network}`;
  return `${networkConfig.explorer}/address/${address}${clusterParam}`;
}

/**
 * Get all available networks
 * 
 * @returns {Object} - All networks
 */
export function getAllNetworks() {
  return NETWORKS;
}

/**
 * Get current Solana transaction fee
 * 
 * @param {string} network - Network name (optional, defaults to current network)
 * @returns {Promise<number>} - Current Solana fee in SOL
 */
export async function getSolanaFee(network = currentNetwork) {
  try {
    // For now, return a fixed fee as Solana doesn't have variable transaction fees
    // In the future, this could fetch from an API or calculate based on network congestion
    const DEFAULT_FEE = 0.000005; // 5000 lamports
    
    // Customize fee based on network if needed
    if (network === 'mainnet-beta') {
      return DEFAULT_FEE;
    } else if (network === 'devnet' || network === 'testnet') {
      return DEFAULT_FEE;
    } else {
      return DEFAULT_FEE;
    }
  } catch (error) {
    logger.error(`Error getting Solana fee: ${error.message}`);
    return 0.000005; // Default fallback fee
  }
}

export default {
  getCurrentNetwork,
  setCurrentNetwork,
  getNetworkConfig,
  getConnection,
  getWebSocketUrl,
  getExplorerUrl,
  getAddressExplorerUrl,
  getAllNetworks,
  getSolanaFee
};
