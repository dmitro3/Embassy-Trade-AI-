'use client';

import { useState, useEffect, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Connection, PublicKey } from '@solana/web3.js';
import { TokenListProvider } from '@solana/spl-token-registry';
import logger from './logger';

/**
 * Custom hook for managing wallet balance and token balances
 * 
 * @param {string} networkEndpoint - Solana network endpoint URL
 * @returns {Object} - Wallet balances and status
 */
const useWalletBalance = (networkEndpoint = 'https://api.devnet.solana.com') => {
  const { publicKey, connected } = useWallet();
  const [connection, setConnection] = useState(null);
  const [solBalance, setSolBalance] = useState(null);
  const [tokenBalances, setTokenBalances] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [tokenList, setTokenList] = useState([]);

  // Initialize connection and token registry
  useEffect(() => {
    try {
      const conn = new Connection(networkEndpoint, 'confirmed');
      setConnection(conn);
      
      // Load token list
      const loadTokens = async () => {
        try {
          const tokens = await new TokenListProvider().resolve();
          const tokenList = tokens.filterByClusterSlug('devnet').getList();
          setTokenList(tokenList);
        } catch (err) {
          logger.error('Error loading token list:', err);
        }
      };
      
      loadTokens();
    } catch (err) {
      logger.error('Error initializing Solana connection:', err);
      setError('Failed to connect to Solana network');
    }
  }, [networkEndpoint]);

  // Fetch SOL balance
  const fetchSolBalance = useCallback(async () => {
    if (!connected || !publicKey || !connection) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      const balance = await connection.getBalance(publicKey);
      setSolBalance(balance / 1_000_000_000); // Convert lamports to SOL
      
      setLastUpdated(new Date());
    } catch (err) {
      logger.error('Error fetching SOL balance:', err);
      setError('Failed to fetch SOL balance');
      setSolBalance(null);
    } finally {
      setIsLoading(false);
    }
  }, [connected, publicKey, connection]);

  // Fetch token balances
  const fetchTokenBalances = useCallback(async () => {
    if (!connected || !publicKey || !connection || !tokenList.length) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      // Get all token accounts owned by the wallet
      const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
        publicKey,
        { programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA') }
      );
      
      const balances = {};
      
      // Process token accounts
      tokenAccounts.value.forEach(({ account }) => {
        const parsedInfo = account.data.parsed.info;
        const mintAddress = parsedInfo.mint;
        const balance = parsedInfo.tokenAmount.uiAmount;
        
        // Find token info from token list
        const tokenInfo = tokenList.find(t => t.address === mintAddress);
        
        if (tokenInfo && balance > 0) {
          balances[mintAddress] = {
            symbol: tokenInfo.symbol,
            logo: tokenInfo.logoURI,
            balance,
            decimals: tokenInfo.decimals
          };
        }
      });
      
      setTokenBalances(balances);
      setLastUpdated(new Date());
    } catch (err) {
      logger.error('Error fetching token balances:', err);
      setError('Failed to fetch token balances');
    } finally {
      setIsLoading(false);
    }
  }, [connected, publicKey, connection, tokenList]);

  // Refresh all balances
  const refreshBalances = useCallback(() => {
    fetchSolBalance();
    fetchTokenBalances();
  }, [fetchSolBalance, fetchTokenBalances]);

  // Update balances when connection state changes
  useEffect(() => {
    if (connected && publicKey && connection) {
      refreshBalances();
      
      // Set up polling for balance updates
      const intervalId = setInterval(refreshBalances, 30000); // 30 seconds
      
      return () => clearInterval(intervalId);
    }
  }, [connected, publicKey, connection, refreshBalances]);

  return {
    isWalletConnected: connected,
    solBalance,
    tokenBalances,
    isLoading,
    error,
    lastUpdated,
    refreshBalances
  };
};

export default useWalletBalance;
