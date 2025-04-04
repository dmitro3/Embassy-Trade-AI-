'use client';

/**
 * EMB Token Configuration and Utilities
 * This file contains token-specific information and utility functions for the EMB token
 */

export const EMB_TOKEN_CONFIG = {
  // Token contract information
  contract: 'D8U9GxmBGs98geNjWkrYf4GUjHqDvMgG5XdL41TXpump',
  name: 'Embassy AI Token',
  symbol: 'EMB',
  decimals: 9,
  
  // Network information
  network: 'mainnet',
  
  // RPC endpoints
  rpcEndpoints: {
    mainnet: 'https://rpc.shyft.to?api_key=wUdL5eei8B56NKaE',
    devnet: 'https://devnet-rpc.shyft.to?api_key=wUdL5eei8B56NKaE'
  },
  
  // WebSocket endpoints for real-time updates
  wsEndpoints: {
    mainnet: 'wss://rpc.shyft.to?api_key=wUdL5eei8B56NKaE',
    devnet: 'wss://devnet-rpc.shyft.to?api_key=wUdL5eei8B56NKaE'
  },
  
  // API key for Shyft
  apiKey: 'wUdL5eei8B56NKaE',
  
  // Utility functions
  exchangeRates: {
    usd: 0.05, // 1 EMB = $0.05 (example rate, should be fetched from API in production)
    sol: 0.0005, // 1 EMB = 0.0005 SOL (example rate)
  },
  
  // Token utility links
  links: {
    pump: 'https://pump.fun/coin/D8U9GxmBGs98geNjWkrYf4GUjHqDvMgG5XdL41TXpump',
    explorer: 'https://explorer.solana.com/address/D8U9GxmBGs98geNjWkrYf4GUjHqDvMgG5XdL41TXpump'
  }
};

/**
 * Format a token amount with correct decimal places
 * @param {number} amount - Raw amount of tokens
 * @returns {string} - Formatted amount with correct decimal places
 */
export const formatTokenAmount = (amount) => {
  if (!amount && amount !== 0) return '0';
  
  const fixedAmount = parseFloat(amount).toFixed(EMB_TOKEN_CONFIG.decimals);
  // Remove trailing zeros
  return fixedAmount.replace(/\.?0+$/, '');
};

/**
 * Convert token amount to USD value
 * @param {number} amount - Amount of tokens
 * @returns {string} - USD value formatted as string with $ sign
 */
export const convertToUsd = (amount) => {
  if (!amount) return '$0.00';
  
  const value = parseFloat(amount) * EMB_TOKEN_CONFIG.exchangeRates.usd;
  return `$${value.toFixed(2)}`;
};

/**
 * Convert token amount to SOL value
 * @param {number} amount - Amount of tokens
 * @returns {string} - SOL value formatted as string
 */
export const convertToSol = (amount) => {
  if (!amount) return '0 SOL';
  
  const value = parseFloat(amount) * EMB_TOKEN_CONFIG.exchangeRates.sol;
  return `${value.toFixed(6)} SOL`;
};

/**
 * Check if a wallet has sufficient EMB token balance for an operation
 * @param {number} balance - Current balance of EMB tokens
 * @param {number} requiredAmount - Amount required for the operation
 * @returns {boolean} - Whether the balance is sufficient
 */
export const hasEnoughBalance = (balance, requiredAmount) => {
  if (!balance || !requiredAmount) return false;
  return parseFloat(balance) >= parseFloat(requiredAmount);
};

/**
 * Get a purchase link for buying EMB tokens
 * @returns {string} - URL to purchase EMB tokens
 */
export const getPurchaseLink = () => {
  return EMB_TOKEN_CONFIG.links.pump;
};

export default EMB_TOKEN_CONFIG;