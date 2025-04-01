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
  if (!connections.has(networkId)) {
    const network = NETWORKS[networkId];
    if (!network) throw new Error(`Unsupported network: ${networkId}`);

    if (networkId === 'solana') {
      connections.set(networkId, new Connection(network.rpc, 'confirmed'));
    } else if (networkId === 'ethereum') {
      connections.set(networkId, new ethers.providers.JsonRpcProvider(network.rpc));
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
  const network = NETWORKS[networkId];
  if (!network) throw new Error(`Unsupported network: ${networkId}`);

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
};

/**
 * Validate network configuration
 */
export const validateNetworkConfig = async (networkId) => {
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
const SHYFT_API_KEY = 'oRVaHOZ1n2McZ0BW';
const SHYFT_GRAPHQL_URL = `https://programs.shyft.to/v0/graphql/?api_key=${SHYFT_API_KEY}&network=devnet`;

// Default Solana fee in SOL (fallback value)
const DEFAULT_SOLANA_FEE = 0.000005;

/**
 * Fetch current Solana transaction fee from Shyft API
 */
export async function getSolanaFee() {
  try {
    const response = await axios.post(SHYFT_GRAPHQL_URL, {
      query: `
        query {
          feeEstimate(network: "mainnet-beta") {
            averageFee
          }
        }
      `
    });

    if (response.data?.data?.feeEstimate?.averageFee) {
      // Convert from lamports to SOL (1 SOL = 10^9 lamports)
      return response.data.data.feeEstimate.averageFee / 1e9;
    } else {
      console.warn('Invalid fee data from Shyft API, using default fee');
      return DEFAULT_SOLANA_FEE;
    }
  } catch (error) {
    console.error('Error fetching Solana fee:', error);
    return DEFAULT_SOLANA_FEE; // Fallback to default fee
  }
}