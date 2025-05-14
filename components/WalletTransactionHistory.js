'use client';

import React, { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { getConnection } from '../lib/networks';
import logger from '../lib/logger';
import SolanaRpcClient from '../lib/solanaRpc';

/**
 * WalletTransactionHistory Component
 * 
 * Displays transaction history for a connected wallet
 */
const WalletTransactionHistory = ({ className = '', limit = 20 }) => {
  const { publicKey, connected } = useWallet();
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // Fetch transaction history
  const fetchTransactionHistory = async (reset = false) => {
    if (!connected || !publicKey) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      const currentPage = reset ? 1 : page;
      const connection = getConnection();
      
      // Get signatures for address with pagination
      const signatures = await SolanaRpcClient.executeWithRetry(
        async () => {
          return await connection.getSignaturesForAddress(
            publicKey,
            { limit: limit, before: reset ? undefined : transactions[transactions.length - 1]?.signature }
          );
        },
        3, // retry count
        1000 // delay between retries
      );
      
      if (!signatures || signatures.length === 0) {
        setHasMore(false);
        setIsLoading(false);
        return;
      }
      
      // Get transaction details for each signature
      const txDetails = await Promise.all(
        signatures.map(async (sig) => {
          try {
            const tx = await SolanaRpcClient.executeWithRetry(
              async () => {
                return await connection.getTransaction(sig.signature, {
                  maxSupportedTransactionVersion: 0
                });
              },
              2, // retry count
              500 // delay between retries
            );
            
            return {
              signature: sig.signature,
              timestamp: sig.blockTime ? new Date(sig.blockTime * 1000) : null,
              status: sig.confirmationStatus || 'processed',
              fee: tx?.meta?.fee || 0,
              slot: sig.slot,
              error: tx?.meta?.err ? 'Failed' : null,
              type: determineTransactionType(tx),
              amount: calculateTransactionAmount(tx, publicKey.toString()),
              raw: tx
            };
          } catch (err) {
            logger.warn(`Error fetching transaction details for ${sig.signature}: ${err.message}`);
            return {
              signature: sig.signature,
              timestamp: sig.blockTime ? new Date(sig.blockTime * 1000) : null,
              status: sig.confirmationStatus || 'unknown',
              error: 'Failed to load details',
              slot: sig.slot
            };
          }
        })
      );
      
      // Update state
      setTransactions(prev => reset ? txDetails : [...prev, ...txDetails]);
      setPage(currentPage + 1);
      setHasMore(signatures.length === limit);
    } catch (err) {
      logger.error(`Error fetching transaction history: ${err.message}`);
      setError(`Failed to load transaction history: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Determine transaction type based on instructions
  const determineTransactionType = (tx) => {
    if (!tx || !tx.transaction || !tx.transaction.message) return 'Unknown';
    
    const message = tx.transaction.message;
    const instructions = message.instructions || [];
    
    // Check for token transfers
    const hasTokenTransfer = instructions.some(ix => 
      ix.programId?.toString() === 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'
    );
    
    if (hasTokenTransfer) return 'Token Transfer';
    
    // Check for SOL transfers
    const hasSOLTransfer = instructions.some(ix => 
      ix.programId?.toString() === '11111111111111111111111111111111'
    );
    
    if (hasSOLTransfer) return 'SOL Transfer';
    
    // Check for swaps (common DEX program IDs)
    const dexProgramIds = [
      'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4', // Jupiter
      '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8', // Raydium
      'srmqPvymJeFKQ4zGQed1GFppgkRHL9kaELCbyksJtPX'  // Serum
    ];
    
    const hasSwap = instructions.some(ix => 
      dexProgramIds.includes(ix.programId?.toString())
    );
    
    if (hasSwap) return 'Swap';
    
    return 'Other';
  };
  
  // Calculate transaction amount (simplified)
  const calculateTransactionAmount = (tx, walletAddress) => {
    if (!tx || !tx.meta || !tx.meta.postBalances || !tx.meta.preBalances) return null;
    
    try {
      const accountIndex = tx.transaction.message.accountKeys.findIndex(
        key => key.toString() === walletAddress
      );
      
      if (accountIndex === -1) return null;
      
      const preBalance = tx.meta.preBalances[accountIndex];
      const postBalance = tx.meta.postBalances[accountIndex];
      const balanceChange = (postBalance - preBalance) / 1e9; // Convert lamports to SOL
      
      // Adjust for transaction fee if sender
      const adjustedChange = tx.meta.fee && accountIndex === 0 
        ? balanceChange + (tx.meta.fee / 1e9)
        : balanceChange;
      
      return {
        value: Math.abs(adjustedChange),
        direction: adjustedChange >= 0 ? 'in' : 'out',
        token: 'SOL' // Simplified, would need token context for SPL tokens
      };
    } catch (err) {
      logger.warn(`Error calculating transaction amount: ${err.message}`);
      return null;
    }
  };
  
  // Format transaction timestamp
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'Unknown time';
    
    return timestamp.toLocaleString();
  };
  
  // Format transaction signature for display
  const formatSignature = (signature) => {
    if (!signature) return '';
    
    return `${signature.substring(0, 4)}...${signature.substring(signature.length - 4)}`;
  };
  
  // Reset and fetch transactions when wallet changes
  useEffect(() => {
    if (connected && publicKey) {
      fetchTransactionHistory(true);
    } else {
      setTransactions([]);
      setPage(1);
      setHasMore(true);
    }
  }, [connected, publicKey]);
  
  // Handle load more
  const handleLoadMore = () => {
    if (!isLoading && hasMore) {
      fetchTransactionHistory();
    }
  };
  
  // Open transaction in Solana Explorer
  const openInExplorer = (signature) => {
    const network = 'devnet'; // This should be dynamic based on your app's network
    window.open(`https://explorer.solana.com/tx/${signature}?cluster=${network}`, '_blank');
  };
  
  if (!connected) {
    return (
      <div className={`wallet-transaction-history ${className}`}>
        <div className="text-center py-8 text-gray-500">
          Connect your wallet to view transaction history
        </div>
      </div>
    );
  }
  
  return (
    <div className={`wallet-transaction-history ${className}`}>
      <div className="mb-4 flex justify-between items-center">
        <h3 className="text-lg font-medium">Transaction History</h3>
        <button 
          onClick={() => fetchTransactionHistory(true)} 
          disabled={isLoading}
          className={`text-sm ${isLoading ? 'bg-blue-500/60' : 'bg-blue-500 hover:bg-blue-600'} text-white py-1 px-3 rounded flex items-center`}
        >
          {isLoading ? (
            <>
              <span className="mr-2">Refreshing</span>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            </>
          ) : 'Refresh'}
        </button>
      </div>
      
      {error && (
        <div className="bg-red-900/30 border border-red-800/40 text-red-400 px-4 py-3 rounded mb-4">
          <p>{error}</p>
        </div>
      )}
      
      {transactions.length === 0 ? (
        <div className="bg-gray-800 rounded-lg p-6 text-center">
          {isLoading ? (
            <div className="flex justify-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <p className="text-gray-400">No transactions found for this wallet</p>
          )}
        </div>
      ) : (
        <div className="bg-gray-800 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-700">
              <thead className="bg-gray-700">
                <tr>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Time
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Type
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Amount
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Signature
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {transactions.map((tx, index) => (
                  <tr 
                    key={tx.signature} 
                    className="hover:bg-gray-700 cursor-pointer"
                    onClick={() => openInExplorer(tx.signature)}
                  >
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">
                      {formatTimestamp(tx.timestamp)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">
                      {tx.type || 'Unknown'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      {tx.amount ? (
                        <span className={tx.amount.direction === 'in' ? 'text-green-400' : 'text-red-400'}>
                          {tx.amount.direction === 'in' ? '+' : '-'}{tx.amount.value.toFixed(4)} {tx.amount.token}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      {tx.error ? (
                        <span className="text-red-400">Failed</span>
                      ) : (
                        <span className="text-green-400">Success</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">
                      {formatSignature(tx.signature)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {hasMore && (
            <div className="px-4 py-3 bg-gray-800 border-t border-gray-700 text-center">
              <button
                onClick={handleLoadMore}
                disabled={isLoading}
                className={`text-sm ${isLoading ? 'bg-gray-600' : 'bg-gray-700 hover:bg-gray-600'} text-white py-2 px-4 rounded`}
              >
                {isLoading ? 'Loading...' : 'Load More'}
              </button>
            </div>
          )}
        </div>
      )}
      
      <div className="mt-4 text-xs text-gray-500 text-center">
        Click on a transaction to view details in Solana Explorer
      </div>
    </div>
  );
};

export default WalletTransactionHistory;
