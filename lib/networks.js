import { Connection } from '@solana/web3.js';
import { ethers } from 'ethers';
import axios from 'axios';

/**
 * Network configurations and utilities for multi-chain support
 */
export const NETWORKS = {
  solana: {
    id: 'solana',
    name: 'Solana',
    icon: '/solana.svg',
    nativeCurrency: 'SOL',
    rpc: process.env.RPC_ENDPOINT,
    fallbackRpc: process.env.FALLBACK_RPC_ENDPOINT,
    tokenAddress: process.env.EMB_TOKEN_ADDRESS,
    enabled: true
  },
  ethereum: {
    id: 'ethereum',
    name: 'Ethereum',
    icon: '/ethereum.svg',
    nativeCurrency: 'ETH',
    rpc: 'https://mainnet.infura.io/v3/YOUR_INFURA_KEY',
    tokenAddress: '0x...', // ETH token address placeholder
    enabled: false // Disabled until ETH implementation is ready
  }
};

// Cache network connections
const connections = new Map();

/**
 * Get or create a network connection
 */
export const getNetworkConnection = (networkId) => {
  // For simulation mode, return a mock connection
  if (typeof window !== 'undefined' && window.location.pathname.includes('/simulation')) {
    return {
      _isMockConnection: true,
      getRecentBlockhash: async () => ({ blockhash: 'mock-blockhash', feeCalculator: { lamportsPerSignature: 5000 } }),
      getTokenAccountBalance: async () => ({ value: { uiAmount: 100 } }),
      // Add any other methods needed by the app
      on: () => {},
      removeListener: () => {}
    };
  }

  if (!connections.has(networkId)) {
    const network = NETWORKS[networkId];
    if (!network) throw new Error(`Unsupported network: ${networkId}`);

    if (networkId === 'solana') {
      try {
        connections.set(networkId, new Connection(network.rpc, 'confirmed'));
      } catch (error) {
        console.error('Error creating Solana connection:', error);
        // Return a mock connection as fallback
        return {
          _isMockConnection: true,
          _isErrorFallback: true,
          getRecentBlockhash: async () => ({ blockhash: 'mock-blockhash', feeCalculator: { lamportsPerSignature: 5000 } }),
          getTokenAccountBalance: async () => ({ value: { uiAmount: 100 } }),
          on: () => {},
          removeListener: () => {}
        };
      }
    } else if (networkId === 'ethereum') {
      try {
        connections.set(networkId, new ethers.providers.JsonRpcProvider(network.rpc));
      } catch (error) {
        console.error('Error creating Ethereum connection:', error);
        // Return a mock connection as fallback
        return {
          _isMockConnection: true,
          _isErrorFallback: true,
          // Add ETH-specific mock methods here
        };
      }
    }
  }
  return connections.get(networkId);
};

/**
 * Switch to a different network
 */
export const switchNetwork = async (networkId) => {
  const network = NETWORKS[networkId];
  if (!network) throw new Error(`Unsupported network: ${networkId}`);
  if (!network.enabled) throw new Error(`Network ${network.name} is not yet supported`);

  // Clear existing connection
  connections.delete(networkId);

  // Initialize new connection
  try {
    const connection = await getNetworkConnection(networkId);
    return {
      success: true,
      network,
      connection
    };
  } catch (err) {
    console.error('Network Switch Error:', err);
    return {
      success: false,
      error: err.message
    };
  }
};

/**
 * Get token balance for the current network
 */
export const getTokenBalance = async (networkId, walletAddress) => {
  // For simulation mode, return a mock balance
  if (typeof window !== 'undefined' && window.location.pathname.includes('/simulation')) {
    return { value: { uiAmount: 100 } };
  }

  const network = NETWORKS[networkId];
  if (!network) throw new Error(`Unsupported network: ${networkId}`);

  try {
    const connection = getNetworkConnection(networkId);

    if (networkId === 'solana') {
      // Use existing Solana balance fetching logic
      return await connection.getTokenAccountBalance(walletAddress);
    } else if (networkId === 'ethereum') {
      // Ethereum balance fetching (placeholder)
      const contract = new ethers.Contract(network.tokenAddress, ['function balanceOf(address) view returns (uint256)'], connection);
      const balance = await contract.balanceOf(walletAddress);
      return ethers.utils.formatUnits(balance, 18);
    }
  } catch (error) {
    console.error(`Error getting token balance for ${networkId}:`, error);
    // Return a mock balance as fallback
    return { value: { uiAmount: 0 } };
  }
};

/**
 * Validate network configuration
 */
export const validateNetworkConfig = async (networkId) => {
  // For simulation mode, always return true
  if (typeof window !== 'undefined' && window.location.pathname.includes('/simulation')) {
    return true;
  }

  const network = NETWORKS[networkId];
  if (!network) return false;

  try {
    const connection = getNetworkConnection(networkId);
    if (networkId === 'solana') {
      await connection.getRecentBlockhash();
    } else if (networkId === 'ethereum') {
      await connection.getBlockNumber();
    }
    return true;
  } catch (err) {
    console.error('Network Validation Error:', err);
    return false;
  }
};

// Shyft API configuration
const SHYFT_API_KEY = 'wUdL5eei8B56NKaE';
const SHYFT_GRAPHQL_URL = `https://programs.shyft.to/v0/graphql/?api_key=${SHYFT_API_KEY}&network=mainnet-beta`;

// Default Solana fee in SOL (fallback value)
const DEFAULT_SOLANA_FEE = 0.000005;
const MAX_FEE_RETRIES = 3;
const FEE_REQUEST_TIMEOUT = 10000; // 10 seconds timeout

// Store the fee in memory cache
let cachedSolanaFee = DEFAULT_SOLANA_FEE;
let lastFeeUpdateTime = 0;
const FEE_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch current Solana transaction fee from Shyft API
 */
export async function getSolanaFee() {
  // For simulation mode or server-side rendering, return the cached or default fee immediately
  if (typeof window === 'undefined' || window.location.pathname.includes('/simulation')) {
    return DEFAULT_SOLANA_FEE;
  }
  
  // Check if we have a recent cached value
  const now = Date.now();
  if (cachedSolanaFee !== DEFAULT_SOLANA_FEE && (now - lastFeeUpdateTime) < FEE_CACHE_TTL) {
    return cachedSolanaFee;
  }
  
  let retries = 0;
  
  while (retries < MAX_FEE_RETRIES) {
    try {
      // Use AbortController to avoid hanging requests
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), FEE_REQUEST_TIMEOUT);
      
      const response = await axios.post(
        SHYFT_GRAPHQL_URL, 
        {
          query: `
            query {
              feeEstimate(network: "mainnet-beta") {
                averageFee
              }
            }
          `
        },
        { 
          timeout: FEE_REQUEST_TIMEOUT,
          signal: controller.signal
        }
      );
      
      clearTimeout(timeoutId);

      if (response.data?.data?.feeEstimate?.averageFee) {
        // Convert from lamports to SOL (1 SOL = 10^9 lamports)
        const fee = response.data.data.feeEstimate.averageFee / 1e9;
        // Update cache
        cachedSolanaFee = fee;
        lastFeeUpdateTime = now;
        return fee;
      } else {
        console.warn('Invalid fee data from Shyft API, using default fee');
        return DEFAULT_SOLANA_FEE;
      }
    } catch (error) {
      retries++;
      console.error(`Error fetching Solana fee (attempt ${retries}/${MAX_FEE_RETRIES}):`, 
        error.message || 'Unknown error');
      
      // If we've reached max retries, return default
      if (retries >= MAX_FEE_RETRIES) {
        console.warn('Max retries reached for Solana fee fetch, using default fee');
        return DEFAULT_SOLANA_FEE; // Fallback to default fee
      }
      
      // Wait before retrying (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, 1000 * retries));
    }
  }
  
  return DEFAULT_SOLANA_FEE; // Final fallback
}