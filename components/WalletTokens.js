"use client";

import { useState, useEffect, useRef } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { getConnection, getStandardConnection } from '../lib/networks';
import SolanaRpcClient from '../lib/solanaRpc';
import tokenAccountService from '../lib/tokenAccountService';
import axios from 'axios';
import { Tooltip } from 'react-tooltip';

// Network configuration
const NETWORKS = {
  solana: {
    name: 'Solana',
    icon: '/images/networks/solana.png',
    enabled: true
  },
  ethereum: {
    name: 'Ethereum',
    icon: '/images/networks/ethereum.png',
    enabled: false // Not implemented yet
  }
};

// Token metadata for known tokens with enhanced information
const TOKEN_METADATA = {
  'So11111111111111111111111111111111111111112': {
    symbol: 'SOL',
    name: 'Solana',
    decimals: 9,
    logoURI: '/images/tokens/sol.png',
    coingeckoId: 'solana'
  },
  'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZvyTDt1v': {
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
    logoURI: '/images/tokens/usdc.png',
    coingeckoId: 'usd-coin'
  },
  '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU': {
    symbol: 'USDC',
    name: 'USD Coin (Devnet)',
    decimals: 6,
    logoURI: '/images/tokens/usdc.png',
    coingeckoId: 'usd-coin'
  },
  'D8U9GxmBGs98geNjWkrYf4GUjHqDvMgG5XdL41TXpump': {
    symbol: 'EMB',
    name: 'Embassy Token',
    decimals: 9,
    logoURI: '/images/tokens/emb.png',
    coingeckoId: 'embassy' // Replace with actual CoinGecko ID when available
  }
};

/**
 * Validates a Solana public key or mint address
 * @param {string} address - The address to validate
 * @returns {boolean} - True if valid, false otherwise
 */
const isValidSolanaAddress = (address) => {
  if (!address || typeof address !== 'string') return false;
  
  try {
    new PublicKey(address);
    return true;
  } catch (error) {
    console.warn(`Invalid Solana address: ${address}`, error.message);
    return false;
  }
};

export default function WalletTokens({ onSelectToken, networkId = 'solana', excludeEMB = false }) {
  const { publicKey, connected } = useWallet();
  const [tokens, setTokens] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentNetwork, setCurrentNetwork] = useState(networkId);
  const [tokenPrices, setTokenPrices] = useState({});
  const [showNetworkDropdown, setShowNetworkDropdown] = useState(false);
  const [isNetworkSwitching, setIsNetworkSwitching] = useState(false);
  const [sortOption, setSortOption] = useState('value'); // 'name', 'balance', 'value'
  const [lastTransactions, setLastTransactions] = useState({});
  const priceRetryCount = useRef(0);
  const connectionErrorCount = useRef(0);
  
  // Format token balance with the correct number of decimals
  const formatTokenBalance = (amount, decimals) => {
    if (!amount) return '0';
    return (amount / Math.pow(10, decimals)).toLocaleString('en-US', {
      maximumFractionDigits: decimals
    });
  };

  // Format USD value
  const formatUsdValue = (amount) => {
    if (!amount) return '$0.00';
    return amount.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  // Fetch token prices from CoinGecko with retry mechanism
  const fetchTokenPrices = async (retryCount = 0) => {
    try {
      // Collect all unique CoinGecko IDs
      const tokenIds = Object.values(TOKEN_METADATA)
        .filter(token => token.coingeckoId)
        .map(token => token.coingeckoId);
      
      if (tokenIds.length === 0) return;
      
      const response = await axios.get(
        `https://api.coingecko.com/api/v3/simple/price?ids=${tokenIds.join(',')}&vs_currencies=usd&include_24h_change=true`,
        { timeout: 5000 } // 5 second timeout
      );
      
      if (response.data) {
        setTokenPrices(response.data);
        priceRetryCount.current = 0; // Reset retry count on success
      }
    } catch (err) {
      console.error('Error fetching token prices:', err);
      // Retry with exponential backoff if we're under the retry limit (3 attempts)
      if (retryCount < 3) {
        const nextRetryDelay = Math.pow(2, retryCount) * 1000; // Exponential backoff
        console.log(`Retrying price fetch in ${nextRetryDelay}ms...`);
        setTimeout(() => fetchTokenPrices(retryCount + 1), nextRetryDelay);
      }
      priceRetryCount.current = retryCount + 1;
    }
  };

  // Handle network switch
  const handleNetworkSwitch = async (newNetworkId) => {
    if (newNetworkId === currentNetwork) return;
    
    setIsNetworkSwitching(true);
    try {
      if (newNetworkId === 'solana') {
        setCurrentNetwork(newNetworkId);
        // Clear tokens when switching networks
        setTokens([]);
        // Fetch new tokens after network switch
        setTimeout(() => fetchTokenBalances(), 500);
      } else {
        setError(`Network ${NETWORKS[newNetworkId]?.name || newNetworkId} is not supported yet`);
      }
    } catch (err) {
      console.error('Network switch error:', err);
      setError(`Failed to switch network: ${err.message}`);
    } finally {
      setIsNetworkSwitching(false);
      setShowNetworkDropdown(false);
    }
  };

  // Fetch recent transactions for an account safely with robust error handling
  const fetchRecentTransactions = async (address) => {
    if (!publicKey) return null;
    
    try {
      // Validate the address before proceeding
      if (!isValidSolanaAddress(address)) {
        return null;
      }
      
      let connection;
      try {
        connection = getStandardConnection();
      } catch (connErr) {
        console.warn('Could not get standard connection:', connErr.message);
        return null;
      }
      
      // Get recent transactions (last 5) with timeout
      try {
        const pubkey = new PublicKey(address);
        
        // Set up a timeout promise
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Transaction fetch timed out')), 5000)
        );
        
        // Get signatures with timeout
        const signaturesPromise = connection.getSignaturesForAddress(pubkey, { limit: 5 });
        const signatures = await Promise.race([signaturesPromise, timeoutPromise]);
        
        if (signatures && signatures.length > 0) {
          const latestTx = signatures[0];
          return {
            signature: latestTx.signature,
            time: latestTx.blockTime ? new Date(latestTx.blockTime * 1000) : null,
            status: latestTx.confirmationStatus
          };
        }
      } catch (err) {
        // Non-critical error, just log a warning
        console.warn(`Could not fetch signatures for address ${address.substring(0, 6)}...`, err.message);
      }
      
      return null;
    } catch (err) {
      console.warn('Error fetching recent transactions:', err);
      return null;
    }
  };

  // Fetch native SOL balance and SPL tokens with better error handling
  const fetchTokenBalances = async () => {
    if (!connected) {
      setTokens([]);
      return;
    }
    
    if (!publicKey || !isValidSolanaAddress(publicKey.toString())) {
      setError('Invalid wallet address');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Get SOL balance with robust retry using our enhanced RPC client
      let solBalance = 0;
      try {
        solBalance = await SolanaRpcClient.executeWithRetry(
          getConnection().getBalance,
          publicKey
        );
      } catch (err) {
        console.error('Failed to get SOL balance after retries:', err);
        throw new Error('Could not retrieve SOL balance. Network may be congested.');
      }
      
      // Prepare token data array
      const tokenData = [];
      
      // Add SOL to the list
      tokenData.push({
        mint: 'So11111111111111111111111111111111111111112',
        address: publicKey.toString(),
        amount: solBalance,
        decimals: 9,
        symbol: 'SOL',
        name: 'Solana',
        logoURI: '/images/tokens/sol.png',
        coingeckoId: 'solana'
      });
      
      try {
        const connection = getConnection();
        // Use our enhanced token account service to prevent TokenAccountNotFoundError
        const tokenAccountsResponse = await tokenAccountService.getTokenAccounts(connection, publicKey);
        const tokenAccounts = tokenAccountsResponse.value || [];
        
        // Reset connection error counter on success
        connectionErrorCount.current = 0;
        
        // Add SPL tokens
        if (tokenAccounts && Array.isArray(tokenAccounts)) {
          for (const tokenAccount of tokenAccounts) {
            try {
              // Use our enhanced unwrap function with better type checking
              const accountData = tokenAccountService.unwrapTokenAccount(tokenAccount);
              
              // Skip if account data couldn't be safely unwrapped
              if (!accountData) {
                continue;
              }
              
              const mintAddress = accountData.mint;
              
              // Skip EMB token if excludeEMB is true
              if (excludeEMB && mintAddress === 'D8U9GxmBGs98geNjWkrYf4GUjHqDvMgG5XdL41TXpump') {
                continue;
              }
              
              // Get token metadata or create placeholder for unknown tokens
              const metadata = TOKEN_METADATA[mintAddress] || { 
                symbol: 'Unknown',
                name: `Token (${mintAddress.slice(0, 4)}...${mintAddress.slice(-4)})`,
                decimals: accountData.decimals || 0,
                logoURI: '/images/tokens/unknown.png'
              };
              
              // Only add tokens with non-zero balance
              if (parseFloat(accountData.amount) > 0) {
                tokenData.push({
                  mint: mintAddress,
                  address: accountData.address,
                  amount: accountData.amount,
                  decimals: accountData.decimals,
                  symbol: metadata.symbol || 'Unknown',
                  name: metadata.name || 'Unknown Token',
                  logoURI: metadata.logoURI || '/images/tokens/unknown.png',
                  coingeckoId: metadata.coingeckoId
                });
              }
            } catch (err) {
              console.warn('Error processing token account:', err.message);
              // Continue to the next token account
            }
          }
        }
      } catch (err) {
        console.warn('Error getting token accounts:', err.message);
        connectionErrorCount.current += 1;
        
        // Continue with just SOL if token accounts fail
        console.log('Continuing with only SOL balance due to error fetching token accounts');
      }
      
      setTokens(tokenData);
      
      // Fetch token prices after getting balances
      fetchTokenPrices();
      
      // Fetch transaction history for main account (SOL)
      try {
        const solTx = await fetchRecentTransactions(publicKey.toString());
        if (solTx) {
          setLastTransactions(prev => ({
            ...prev,
            [publicKey.toString()]: solTx
          }));
        }
      } catch (err) {
        // Non-critical error, just log
        console.warn('Error fetching transaction history:', err.message);
      }
    } catch (err) {
      console.error('Error fetching token balances:', err);
      connectionErrorCount.current += 1;
      
      if (err.message.includes('429') || err.message.includes('rate limit')) {
        setError('Rate limit exceeded. Please try again in a few minutes.');
      } else if (connectionErrorCount.current > 2) {
        setError('Connection issues detected. Please check your internet connection or try a different RPC.');
      } else {
        setError(`Failed to load token balances: ${err.message}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate token value in USD with added safety checks
  const calculateTokenValue = (token) => {
    if (!token || !token.coingeckoId) return null;
    
    const priceData = tokenPrices[token.coingeckoId];
    if (!priceData || typeof priceData.usd !== 'number' || isNaN(priceData.usd)) {
      return null;
    }
    
    try {
      const price = priceData.usd;
      const decimals = parseInt(token.decimals);
      if (isNaN(decimals)) return null;
      
      const amount = parseFloat(token.amount) / Math.pow(10, decimals);
      if (isNaN(amount)) return null;
      
      return price * amount;
    } catch (err) {
      console.warn('Error calculating token value:', err.message);
      return null;
    }
  };

  // Get token 24h price change
  const getToken24hChange = (token) => {
    if (!token || !token.coingeckoId || !tokenPrices[token.coingeckoId]) {
      return null;
    }
    
    try {
      const change = tokenPrices[token.coingeckoId].usd_24h_change;
      return typeof change === 'number' && !isNaN(change) ? change : null;
    } catch (err) {
      return null;
    }
  };

  // Sort tokens based on the selected option with error handling
  const sortedTokens = () => {
    if (!tokens || !Array.isArray(tokens) || tokens.length === 0) return [];
    
    try {
      return [...tokens].sort((a, b) => {
        switch (sortOption) {
          case 'name':
            return (a.symbol || '').localeCompare(b.symbol || '');
          case 'balance':
            try {
              const balanceA = parseFloat(a.amount) / Math.pow(10, parseInt(a.decimals));
              const balanceB = parseFloat(b.amount) / Math.pow(10, parseInt(b.decimals));
              return isNaN(balanceB - balanceA) ? 0 : balanceB - balanceA;
            } catch (err) {
              return 0;
            }
          case 'value':
          default:
            const valueA = calculateTokenValue(a) || 0;
            const valueB = calculateTokenValue(b) || 0;
            return valueB - valueA;
        }
      });
    } catch (err) {
      console.warn('Error sorting tokens:', err.message);
      return [...tokens];
    }
  };

  // Update when network changes
  useEffect(() => {
    setCurrentNetwork(networkId);
  }, [networkId]);

  // Fetch token balances when wallet is connected or network changes
  useEffect(() => {
    if (connected && publicKey) {
      fetchTokenBalances();
      
      // Apply token account patches for better reliability
      tokenAccountService.monkeyPatchTokenFunctions();
    } else {
      setTokens([]);
    }
  }, [connected, publicKey, currentNetwork]);

  // Refresh balances and prices periodically if connected with exponential backoff on errors
  useEffect(() => {
    if (!connected) return;
    
    let balanceIntervalId;
    let priceIntervalId;
    
    // Function to set up balance refresh with exponential backoff on errors
    const setupBalanceRefresh = (initialDelay = 30000) => {
      if (balanceIntervalId) clearInterval(balanceIntervalId);
      
      balanceIntervalId = setInterval(async () => {
        try {
          await fetchTokenBalances();
          // If successful, reset to normal interval
          if (initialDelay !== 30000) {
            clearInterval(balanceIntervalId);
            setupBalanceRefresh();
          }
        } catch (error) {
          // If error, increase delay up to 2 minutes max
          const newDelay = Math.min(initialDelay * 1.5, 120000);
          if (newDelay !== initialDelay) {
            clearInterval(balanceIntervalId);
            setupBalanceRefresh(newDelay);
          }
          console.warn(`Balance refresh error, next retry in ${newDelay/1000}s`, error);
        }
      }, initialDelay);
    };
    
    // Set up price refresh with similar pattern
    const setupPriceRefresh = (initialDelay = 60000) => {
      if (priceIntervalId) clearInterval(priceIntervalId);
      
      priceIntervalId = setInterval(async () => {
        try {
          await fetchTokenPrices();
          // If successful, reset to normal interval
          if (initialDelay !== 60000) {
            clearInterval(priceIntervalId);
            setupPriceRefresh();
          }
        } catch (error) {
          // If error, increase delay up to 3 minutes max
          const newDelay = Math.min(initialDelay * 1.5, 180000);
          if (newDelay !== initialDelay) {
            clearInterval(priceIntervalId);
            setupPriceRefresh(newDelay);
          }
        }
      }, initialDelay);
    };
    
    // Initialize both refresh cycles
    setupBalanceRefresh();
    setupPriceRefresh();
    
    return () => {
      if (balanceIntervalId) clearInterval(balanceIntervalId);
      if (priceIntervalId) clearInterval(priceIntervalId);
    };
  }, [connected, currentNetwork]);

  // Calculate total portfolio value with safety checks
  const calculateTotalValue = () => {
    if (!tokens || !Array.isArray(tokens)) return 0;
    
    try {
      return tokens.reduce((total, token) => {
        const value = calculateTokenValue(token);
        return total + (typeof value === 'number' && !isNaN(value) ? value : 0);
      }, 0);
    } catch (err) {
      console.warn('Error calculating total portfolio value:', err.message);
      return 0;
    }
  };

  // Close network dropdown when clicking outside
  useEffect(() => {
    if (!showNetworkDropdown) return;
    
    const handleClickOutside = (event) => {
      if (!event.target.closest('.network-dropdown')) {
        setShowNetworkDropdown(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showNetworkDropdown]);

  // Format relative time
  const formatRelativeTime = (date) => {
    if (!date) return 'Unknown time';
    
    try {
      const now = new Date();
      const diffInSeconds = Math.floor((now - date) / 1000);
      
      if (diffInSeconds < 60) return `${diffInSeconds} seconds ago`;
      if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
      if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
      return `${Math.floor(diffInSeconds / 86400)} days ago`;
    } catch (err) {
      return 'Unknown time';
    }
  };

  if (!connected) {
    return (
      <div className="p-4 text-center">
        <p className="text-gray-500">Connect your wallet to view tokens</p>
      </div>
    );
  }

  return (
    <div className="wallet-tokens">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center">
          <h3 className="text-lg font-medium mr-3">Your Tokens</h3>
          <div className="relative network-dropdown">
            <button
              onClick={() => setShowNetworkDropdown(!showNetworkDropdown)}
              disabled={isNetworkSwitching}
              className="flex items-center text-sm bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded text-white"
            >
              {isNetworkSwitching ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              ) : (
                <img 
                  src={NETWORKS[currentNetwork]?.icon} 
                  alt={NETWORKS[currentNetwork]?.name}
                  className="w-4 h-4 rounded-full mr-1"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = '/images/networks/unknown.png';
                  }}
                />
              )}
              <span>{NETWORKS[currentNetwork]?.name || 'Network'}</span>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            {showNetworkDropdown && (
              <div className="absolute z-10 mt-1 w-48 bg-gray-800 rounded-md shadow-lg">
                <ul className="py-1">
                  {Object.entries(NETWORKS)
                    .filter(([_, network]) => network.enabled)
                    .map(([id, network]) => (
                      <li 
                        key={id}
                        onClick={() => handleNetworkSwitch(id)}
                        className={`px-3 py-2 hover:bg-gray-700 cursor-pointer flex items-center ${currentNetwork === id ? 'bg-gray-700 text-blue-400' : 'text-white'}`}
                      >
                        <img 
                          src={network.icon} 
                          alt={network.name}
                          className="w-5 h-5 rounded-full mr-2"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = '/images/networks/unknown.png';
                          }}
                        />
                        {network.name}
                      </li>
                    ))
                  }
                </ul>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center">
          <div className="mr-3">
            <select 
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value)}
              className="text-sm bg-gray-700 border border-gray-600 text-white rounded p-1"
            >
              <option value="value">Sort by Value</option>
              <option value="balance">Sort by Balance</option>
              <option value="name">Sort by Name</option>
            </select>
          </div>
          <button 
            onClick={fetchTokenBalances}
            disabled={isLoading}
            className={`text-sm ${isLoading ? 'bg-blue-500/60' : 'bg-blue-500 hover:bg-blue-600'} text-white py-1 px-3 rounded flex items-center`}
          >
            {isLoading ? (
              <>
                <span className="mr-2">Loading</span>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              </>
            ) : 'Refresh'}
          </button>
        </div>
      </div>
      
      {/* Total Portfolio Value */}
      {tokens.length > 0 && Object.keys(tokenPrices).length > 0 && (
        <div className="mb-4 p-3 bg-gradient-to-r from-blue-900/30 to-purple-900/30 rounded-lg border border-blue-800/30">
          <div className="text-sm text-gray-400">Total Value</div>
          <div className="text-xl font-medium text-white">{formatUsdValue(calculateTotalValue())}</div>
          {priceRetryCount.current > 0 && (
            <div className="text-xs text-yellow-500 mt-1">
              Some token prices may be unavailable or delayed
            </div>
          )}
        </div>
      )}

      {/* Show a message about EMB tokens if they're excluded */}
      {excludeEMB && (
        <div className="my-4 p-3 bg-amber-900/20 border border-amber-800/30 rounded-lg text-amber-200 text-sm">
          <p className="flex items-center">
            <span className="mr-2">ℹ️</span>
            <span>
              Note: EMB tokens are currently only purchasable on Pumpfun and aren't available for direct trading here.
              <a 
                href="https://pump.fun" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-blue-400 hover:text-blue-300 underline ml-1"
              >
                Visit Pumpfun to get EMB
              </a>
            </span>
          </p>
        </div>
      )}
      
      {/* Connection warning for persistent RPC issues */}
      {connectionErrorCount.current > 1 && !error && (
        <div className="my-4 p-3 bg-orange-900/20 border border-orange-800/30 rounded-lg text-orange-200 text-sm">
          <p className="flex items-center">
            <span className="mr-2">⚠️</span>
            <span>
              Warning: Some Solana RPC nodes may be experiencing issues. Your token data might be incomplete.
            </span>
          </p>
        </div>
      )}
      
      {isLoading && tokens.length === 0 ? (
        <div className="flex justify-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
        </div>
      ) : error ? (
        <div className="bg-red-900/30 border border-red-800/40 text-red-400 px-4 py-3 rounded">
          <p>{error}</p>
          <button 
            onClick={fetchTokenBalances}
            className="mt-2 text-sm bg-red-700 hover:bg-red-600 text-white py-1 px-3 rounded"
          >
            Try Again
          </button>
        </div>
      ) : tokens.length === 0 ? (
        <div className="bg-yellow-900/20 border border-yellow-800/30 text-yellow-500 px-4 py-3 rounded">
          No tokens found in your wallet
        </div>
      ) : (
        <ul className="space-y-2">
          {sortedTokens().map(token => {
            const tokenValue = calculateTokenValue(token);
            const priceChange = getToken24hChange(token);
            const tokenId = `token-${token.mint}`;
            const lastTx = lastTransactions[token.address];
            
            return (
              <li 
                key={token.mint}
                className="flex items-center justify-between p-3 bg-gray-800 hover:bg-gray-700 rounded-lg cursor-pointer transition"
                onClick={() => onSelectToken && onSelectToken(token)}
                data-tooltip-id={tokenId}
                data-tooltip-place="top"
              >
                <div className="flex items-center">
                  <img 
                    src={token.logoURI} 
                    alt={token.symbol}
                    className="w-8 h-8 rounded-full mr-3"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = '/images/tokens/unknown.png';
                    }}
                  />
                  <div>
                    <div className="font-medium text-white">{token.symbol}</div>
                    <div className="text-xs text-gray-400">{token.name}</div>
                    {lastTx && (
                      <div className="text-xs text-gray-500">
                        Last tx: {formatRelativeTime(lastTx.time)}
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-medium text-white">{formatTokenBalance(token.amount, token.decimals)}</div>
                  {tokenValue !== null && (
                    <div className="text-xs text-gray-400">{formatUsdValue(tokenValue)}</div>
                  )}
                  {priceChange !== null && (
                    <div className={`text-xs ${priceChange >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {priceChange >= 0 ? '↑' : '↓'} {Math.abs(priceChange).toFixed(2)}%
                    </div>
                  )}
                </div>
                
                <Tooltip id={tokenId} className="z-50 max-w-xs">
                  <div className="p-2">
                    <div className="font-bold mb-1">{token.name} ({token.symbol})</div>
                    <div className="text-xs mb-1">Mint: {token.mint}</div>
                    <div className="text-xs">Token Account: {token.address}</div>
                    {lastTx && (
                      <>
                        <div className="text-xs mt-2">Last Transaction:</div>
                        <div className="text-xs">{lastTx.signature.substring(0, 8)}...{lastTx.signature.substring(lastTx.signature.length - 8)}</div>
                        <div className="text-xs">{lastTx.time?.toLocaleString()}</div>
                      </>
                    )}
                  </div>
                </Tooltip>
              </li>
            );
          })}
        </ul>
      )}
      
      {/* Additional help text */}
      {tokens.length > 0 && (
        <div className="mt-4 text-xs text-gray-500 text-center">
          Click on a token to select it for trading
        </div>
      )}
    </div>
  );
}
