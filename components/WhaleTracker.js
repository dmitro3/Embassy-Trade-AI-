import React, { useState, useEffect } from 'react';
import { Connection, clusterApiUrl, PublicKey } from '@solana/web3.js';
import { useWallet } from '@solana/wallet-adapter-react';

// Whale tracker component that monitors and displays large transactions
const WhaleTracker = ({ onSelectWhale, isLiveTrading, onDataUpdate }) => {
  const { publicKey } = useWallet();
  const [whaleTransactions, setWhaleTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeframe, setTimeframe] = useState('24h');
  const [threshold, setThreshold] = useState(100000); // $100k minimum for whale txs
  const [sortBy, setSortBy] = useState('time'); // 'time', 'amount', 'impact'
  const [alertsEnabled, setAlertsEnabled] = useState(false);
  const [watchedWallets, setWatchedWallets] = useState([]);
  const [expandedTx, setExpandedTx] = useState(null);
  const [isPremium, setIsPremium] = useState(false);
  const [activeTab, setActiveTab] = useState('transactions');
  const [filter, setFilter] = useState('all');
  const [activeToken, setActiveToken] = useState(null);

  // Check if user has EMBAI tokens for premium features
  useEffect(() => {
    const checkPremiumStatus = async () => {
      if (publicKey) {
        try {
          // In a real implementation, you would check the user's EMBAI balance
          // For now, we'll use the isLiveTrading prop as a proxy
          setIsPremium(isLiveTrading);
        } catch (err) {
          console.error('Error checking premium status:', err);
        }
      }
    };
    
    checkPremiumStatus();
  }, [publicKey, isLiveTrading]);

  // Fetch whale transactions based on selected timeframe and threshold
  useEffect(() => {
    const fetchWhaleTransactions = async () => {
      setLoading(true);
      try {
        // In a real implementation, you would fetch actual blockchain data
        // For demo purposes, we'll use mock data that simulates whale transactions
        const mockData = generateMockWhaleTransactions(timeframe, threshold);
        
        // Sort the transactions based on the selected sort option
        let sortedTxs = [...mockData];
        if (sortBy === 'time') {
          sortedTxs = sortedTxs.sort((a, b) => b.timestamp - a.timestamp);
        } else if (sortBy === 'amount') {
          sortedTxs = sortedTxs.sort((a, b) => b.amountUsd - a.amountUsd);
        } else if (sortBy === 'impact') {
          sortedTxs = sortedTxs.sort((a, b) => b.marketImpactValue - a.marketImpactValue);
        }
        
        // Apply premium features - non-premium users get delayed and limited data
        if (!isPremium) {
          // For non-premium users: show fewer transactions with delay
          sortedTxs = sortedTxs
            .slice(0, 5) // Limit to fewer transactions
            .map(tx => ({
              ...tx,
              timestamp: tx.timestamp - 3600000, // 1 hour delay
              isDelayed: true
            }));
        }
        
        setWhaleTransactions(sortedTxs);
        
        // Share the whale data with parent components via callback
        if (onDataUpdate) {
          onDataUpdate(sortedTxs);
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching whale transactions:', err);
        setError('Failed to fetch whale data. Please try again later.');
        setLoading(false);
      }
    };

    fetchWhaleTransactions();
    // Poll for updates every 2 minutes for premium users, less frequently for others
    const interval = setInterval(fetchWhaleTransactions, isPremium ? 120000 : 300000);
    
    return () => clearInterval(interval);
  }, [timeframe, threshold, sortBy, isPremium, onDataUpdate]);

  // Toggle wallet watching
  const toggleWatchWallet = (walletAddress, event) => {
    if (event) {
      event.stopPropagation();
    }
    
    if (watchedWallets.includes(walletAddress)) {
      setWatchedWallets(watchedWallets.filter(w => w !== walletAddress));
    } else {
      if (!isPremium && watchedWallets.length >= 3) {
        setError('Free accounts can only watch up to 3 wallets. Upgrade to EMBAI for unlimited wallet tracking.');
        return;
      }
      setWatchedWallets([...watchedWallets, walletAddress]);
    }
  };

  // Generate mock whale transactions for demonstration
  const generateMockWhaleTransactions = (timeframe, minAmountUsd) => {
    const now = Date.now();
    let timeRangeMs = 86400000; // 24 hours in milliseconds
    
    if (timeframe === '1h') timeRangeMs = 3600000;
    if (timeframe === '6h') timeRangeMs = 21600000;
    if (timeframe === '7d') timeRangeMs = 604800000;
    
    const tokens = ['SOL', 'USDC', 'ETH', 'BTC', 'BONK', 'RAY', 'EMB', 'EMBAI', 'FARTCOIN', 'MOBY', 'PYTH', 'JUP'];
    const exchanges = ['Jupiter', 'Orca', 'Raydium', 'Mango Markets', 'Drift Protocol'];
    const impactLevels = ['Low', 'Medium', 'High', 'Very High'];
    const walletTypes = ['Exchange', 'Investment Fund', 'Known Trader', 'Unknown'];
    const walletLabels = {
      'G58Yu...H21f': 'Binance Hot Wallet',
      'jUP76...90xc': 'Jupiter Treasury',
      'j5A9z...F31q': 'Alameda Remnant',
      'T67vD...11dF': 'Jump Trading',
    };
    
    // Generate 20 random transactions
    const transactions = Array(20).fill().map((_, i) => {
      // Higher index = more recent transaction
      const timestamp = now - Math.random() * timeRangeMs;
      const token = tokens[Math.floor(Math.random() * tokens.length)];
      const exchange = exchanges[Math.floor(Math.random() * exchanges.length)];
      const walletType = walletTypes[Math.floor(Math.random() * walletTypes.length)];
      
      // Generate random amounts, higher for certain tokens
      let amountUsd;
      if (token === 'FARTCOIN' && Math.random() > 0.9) {
        // Special case for FARTCOIN meme - large transaction
        amountUsd = 4130000;
      } else if (['BTC', 'ETH', 'SOL'].includes(token)) {
        amountUsd = Math.round(minAmountUsd + Math.random() * 5000000);
      } else {
        amountUsd = Math.round(minAmountUsd + Math.random() * 1000000);
      }
      
      // Calculate token amount based on mock prices
      const tokenPrices = {
        SOL: 150, ETH: 3500, BTC: 64000, BONK: 0.000002,
        RAY: 1.5, USDC: 1, EMB: 0.5, EMBAI: 2.5,
        FARTCOIN: 0.00005, MOBY: 0.11, PYTH: 0.9, JUP: 1.75
      };
      const tokenAmount = amountUsd / tokenPrices[token];
      
      // For sell transactions (odd index)
      const isSell = i % 2 === 1;
      
      // Market impact increases with transaction size
      const marketImpactValue = Math.min(Math.pow(amountUsd / minAmountUsd, 1.5) / 20, 1);
      const marketImpact = impactLevels[
        Math.min(Math.floor(marketImpactValue * impactLevels.length), impactLevels.length - 1)
      ];
      
      // Generate a valid-looking wallet address
      const walletAddress = `${Math.random().toString(36).substring(2, 6)}${Math.random().toString(36).substring(2, 6)}...${Math.random().toString(36).substring(2, 4)}${Math.random().toString(36).substring(2, 4)}`;
      
      // Special wallets for more realistic data
      const knownWallets = Object.keys(walletLabels);
      const useKnownWallet = Math.random() > 0.7;
      const finalWalletAddress = useKnownWallet ? 
        knownWallets[Math.floor(Math.random() * knownWallets.length)] : 
        walletAddress;
        
      const walletLabel = walletLabels[finalWalletAddress] || null;
      
      return {
        id: `tx-${i}-${Math.random().toString(36).substring(7)}`,
        walletAddress: finalWalletAddress,
        walletType,
        walletLabel,
        timestamp,
        token,
        tokenAmount: parseFloat(tokenAmount.toFixed(token === 'BONK' || token === 'FARTCOIN' ? 0 : 2)),
        amountUsd,
        type: isSell ? 'SELL' : 'BUY',
        exchange,
        marketImpact,
        marketImpactValue,
        // Additional data for premium features
        previousTransactions: Math.floor(Math.random() * 50) + 5,
        holdingPeriod: Math.floor(Math.random() * 60) + 1, // days
        walletBalance: amountUsd * (Math.random() * 10 + 1),
        relatedWallets: Array(Math.floor(Math.random() * 5)).fill().map(
          () => `${Math.random().toString(36).substring(2, 10)}...`
        ),
        priceImpact: Math.random() * (isSell ? -5 : 5),
        otherHoldings: [
          { token: tokens[Math.floor(Math.random() * tokens.length)], value: Math.random() * 1000000 },
          { token: tokens[Math.floor(Math.random() * tokens.length)], value: Math.random() * 500000 }
        ],
        transactionHash: `${Math.random().toString(16).substring(2, 10)}${Math.random().toString(16).substring(2, 10)}...`,
        notes: Math.random() > 0.7 ? "Possible accumulation pattern" : null
      };
    });
    
    // Filter by amount and current filter
    let filteredTransactions = transactions.filter(tx => tx.amountUsd >= minAmountUsd);
    
    // Apply token filter if active
    if (activeToken) {
      filteredTransactions = filteredTransactions.filter(tx => tx.token === activeToken);
    }
    
    // Apply transaction type filter
    if (filter !== 'all') {
      filteredTransactions = filteredTransactions.filter(tx => {
        if (filter === 'buy') return tx.type === 'BUY';
        if (filter === 'sell') return tx.type === 'SELL';
        if (filter === 'transfer') return tx.type === 'TRANSFER';
        return true;
      });
    }
    
    // Special case: Always include one FARTCOIN transaction for the example
    const fartcoinTx = transactions.find(tx => tx.token === 'FARTCOIN' && tx.amountUsd === 4130000);
    if (fartcoinTx && !filteredTransactions.some(tx => tx.token === 'FARTCOIN' && tx.amountUsd === 4130000)) {
      filteredTransactions.push(fartcoinTx);
    }
    
    return filteredTransactions;
  };

  // Format timestamp to readable date/time
  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  // Format large numbers with commas
  const formatNumber = (num) => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };

  // Enable or disable real-time alerts
  const toggleAlerts = () => {
    if (!isPremium && !alertsEnabled) {
      setError('Real-time alerts require EMBAI tokens. Please migrate to live trading to access this feature.');
      return;
    }
    setAlertsEnabled(!alertsEnabled);
  };

  // Expand transaction details
  const toggleExpandTransaction = (txId) => {
    if (expandedTx === txId) {
      setExpandedTx(null);
    } else {
      if (!isPremium && txId) {
        setError('Detailed transaction analysis requires EMBAI tokens. Please migrate to live trading.');
        return;
      }
      setExpandedTx(txId);
    }
  };

  // Handle token filter click
  const handleTokenFilterClick = (token) => {
    if (activeToken === token) {
      setActiveToken(null);
    } else {
      setActiveToken(token);
    }
  };

  // Market impact indicator
  const MarketImpactIndicator = ({ impact }) => {
    let bgColor = 'bg-gray-400';
    if (impact === 'Low') bgColor = 'bg-green-400';
    if (impact === 'Medium') bgColor = 'bg-yellow-400';
    if (impact === 'High') bgColor = 'bg-orange-400';
    if (impact === 'Very High') bgColor = 'bg-red-400';
    
    return (
      <div className="flex items-center">
        <div className={`w-2 h-2 rounded-full ${bgColor} mr-1.5`}></div>
        <span>{impact}</span>
      </div>
    );
  };

  // Calculate summary statistics
  const calculateStats = () => {
    if (!whaleTransactions.length) return {};
    
    const totalVolume = whaleTransactions.reduce((sum, tx) => sum + tx.amountUsd, 0);
    const buys = whaleTransactions.filter(tx => tx.type === 'BUY');
    const sells = whaleTransactions.filter(tx => tx.type === 'SELL');
    const buyVolume = buys.reduce((sum, tx) => sum + tx.amountUsd, 0);
    const sellVolume = sells.reduce((sum, tx) => sum + tx.amountUsd, 0);
    
    const tokenVolumes = {};
    whaleTransactions.forEach(tx => {
      if (!tokenVolumes[tx.token]) {
        tokenVolumes[tx.token] = 0;
      }
      tokenVolumes[tx.token] += tx.amountUsd;
    });
    
    const sortedTokens = Object.entries(tokenVolumes)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5); // Top 5 tokens by volume
      
    return {
      totalVolume,
      buyVolume,
      sellVolume,
      buyCount: buys.length,
      sellCount: sells.length,
      largestTx: Math.max(...whaleTransactions.map(tx => tx.amountUsd)),
      avgTxSize: totalVolume / whaleTransactions.length,
      topTokens: sortedTokens
    };
  };
  
  const stats = calculateStats();
  
  // Render transaction details expansion
  const renderTransactionDetails = (tx) => {
    if (!isPremium) return null;
    
    return (
      <tr className="bg-gray-800">
        <td colSpan="8" className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="text-sm font-medium mb-2">Transaction Details</h4>
              <div className="bg-gray-900 p-3 rounded text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-400">Transaction Hash:</span>
                  <span className="font-mono">{tx.transactionHash}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Exchange:</span>
                  <span>{tx.exchange}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Price Impact:</span>
                  <span className={tx.priceImpact > 0 ? 'text-green-400' : 'text-red-400'}>
                    {tx.priceImpact.toFixed(2)}%
                  </span>
                </div>
                {tx.notes && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Notes:</span>
                    <span className="text-yellow-400">{tx.notes}</span>
                  </div>
                )}
              </div>
            </div>
            
            <div>
              <h4 className="text-sm font-medium mb-2">Wallet Analysis</h4>
              <div className="bg-gray-900 p-3 rounded text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-400">Wallet Balance:</span>
                  <span>${formatNumber(Math.round(tx.walletBalance))}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Previous Transactions:</span>
                  <span>{tx.previousTransactions}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Holding Period:</span>
                  <span>{tx.holdingPeriod} days</span>
                </div>
                <div className="space-y-1 mt-2">
                  <div className="text-gray-400">Other Holdings:</div>
                  {tx.otherHoldings.map((holding, i) => (
                    <div key={i} className="flex justify-between">
                      <span>{holding.token}:</span>
                      <span>${formatNumber(Math.round(holding.value))}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-4 flex justify-end">
            <button
              className="px-3 py-1 rounded text-xs bg-blue-600 hover:bg-blue-700"
              onClick={(e) => {
                e.stopPropagation();
                if (onSelectWhale) onSelectWhale(tx.walletAddress);
              }}
            >
              Track This Wallet
            </button>
          </div>
        </td>
      </tr>
    );
  };
  
  // Render the transactions tab content
  const renderTransactionsTab = () => {
    if (loading) {
      return (
        <div className="flex justify-center my-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      );
    }
    
    if (whaleTransactions.length === 0) {
      return (
        <div className="text-center py-8 text-gray-400">
          No whale transactions found for the selected criteria.
        </div>
      );
    }
    
    return (
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-800">
          <thead>
            <tr>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Time</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Wallet</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Type</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Token</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Amount</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">USD Value</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Impact</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {whaleTransactions.map((transaction) => (
              <React.Fragment key={transaction.id}>
                <tr 
                  className={`hover:bg-gray-800 transition-colors cursor-pointer ${
                    transaction.isDelayed ? 'opacity-70' : ''
                  }`}
                  onClick={() => toggleExpandTransaction(transaction.id)}
                >
                  <td className="px-3 py-3 whitespace-nowrap text-sm">
                    <div className="flex flex-col">
                      <span>{formatTimestamp(transaction.timestamp)}</span>
                      {transaction.isDelayed && (
                        <span className="text-yellow-500 text-xs">Delayed</span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap text-sm">
                    <div>
                      <div className="flex items-center">
                        <span className="font-mono">{transaction.walletAddress}</span>
                        {watchedWallets.includes(transaction.walletAddress) && (
                          <span className="ml-1 text-blue-400">★</span>
                        )}
                      </div>
                      <div className="text-xs text-gray-400">
                        {transaction.walletLabel || transaction.walletType}
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap text-sm">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      transaction.type === 'BUY' 
                        ? 'bg-green-900 bg-opacity-30 text-green-400' 
                        : 'bg-red-900 bg-opacity-30 text-red-400'
                    }`}>
                      {transaction.type}
                    </span>
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap text-sm">
                    <span 
                      className="px-2 py-1 bg-gray-800 rounded text-xs cursor-pointer hover:bg-gray-700"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTokenFilterClick(transaction.token);
                      }}
                    >
                      {transaction.token}
                    </span>
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap text-sm">
                    {formatNumber(transaction.tokenAmount)}
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap text-sm">
                    <span className="font-semibold">
                      ${formatNumber(Math.round(transaction.amountUsd))}
                    </span>
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap text-sm">
                    <MarketImpactIndicator impact={transaction.marketImpact} />
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap text-sm">
                    <button
                      className={`p-1 rounded-full mr-1 ${
                        watchedWallets.includes(transaction.walletAddress)
                          ? 'text-blue-400 hover:bg-blue-900 hover:bg-opacity-30'
                          : 'text-gray-400 hover:bg-gray-700'
                      }`}
                      onClick={(e) => toggleWatchWallet(transaction.walletAddress, e)}
                    >
                      {watchedWallets.includes(transaction.walletAddress) ? (
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1.323l3.954 1.582 1.599-.8a1 1 0 01.894 1.79l-1.233.616 1.738 5.42a1 1 0 01-.285 1.05A3.989 3.989 0 0115 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.715-5.349L10 6.477 6.237 7.582l1.715 5.349a1 1 0 01-.285 1.05A3.989 3.989 0 015 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.738-5.42-1.233-.617a1 1 0 01.894-1.788l1.599.799L9 4.323V3a1 1 0 011-1z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                        </svg>
                      )}
                    </button>
                  </td>
                </tr>
                
                {expandedTx === transaction.id && renderTransactionDetails(transaction)}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    );
  };
  
  // Render the analytics tab content
  const renderAnalyticsTab = () => {
    if (loading) {
      return (
        <div className="flex justify-center my-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      );
    }
    
    if (whaleTransactions.length === 0) {
      return (
        <div className="text-center py-8 text-gray-400">
          No whale transactions found for the selected criteria.
        </div>
      );
    }
    
    // Basic stats section for non-premium users
    const basicStats = (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-800 p-4 rounded-lg">
          <div className="text-gray-400 text-xs">Total Volume</div>
          <div className="text-xl font-bold">${formatNumber(Math.round(stats.totalVolume))}</div>
        </div>
        <div className="bg-gray-800 p-4 rounded-lg">
          <div className="text-gray-400 text-xs">Largest Transaction</div>
          <div className="text-xl font-bold">${formatNumber(Math.round(stats.largestTx))}</div>
        </div>
        <div className="bg-gray-800 p-4 rounded-lg">
          <div className="text-gray-400 text-xs">Buy vs Sell Count</div>
          <div className="text-xl font-bold">
            <span className="text-green-400">{stats.buyCount}</span>
            <span className="text-gray-500 mx-1">/</span>
            <span className="text-red-400">{stats.sellCount}</span>
          </div>
        </div>
        <div className="bg-gray-800 p-4 rounded-lg">
          <div className="text-gray-400 text-xs">Avg Transaction Size</div>
          <div className="text-xl font-bold">${formatNumber(Math.round(stats.avgTxSize))}</div>
        </div>
      </div>
    );
    
    // Premium visualization section
    const premiumVisualizations = isPremium ? (
      <>
        <div className="mb-8">
          <h3 className="text-lg font-medium mb-3">Buy/Sell Volume</h3>
          <div className="bg-gray-800 p-4 rounded-lg">
            <div className="mb-2 flex justify-between text-sm">
              <div>
                <span className="inline-block w-3 h-3 bg-green-500 mr-1"></span>
                <span>Buy: ${formatNumber(Math.round(stats.buyVolume))}</span>
              </div>
              <div>
                <span className="inline-block w-3 h-3 bg-red-500 mr-1"></span>
                <span>Sell: ${formatNumber(Math.round(stats.sellVolume))}</span>
              </div>
            </div>
            
            <div className="relative pt-1">
              <div className="overflow-hidden h-6 mb-1 text-xs flex rounded bg-gray-700">
                <div
                  style={{ width: `${(stats.buyVolume / stats.totalVolume) * 100}%` }}
                  className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-green-500"
                ></div>
                <div
                  style={{ width: `${(stats.sellVolume / stats.totalVolume) * 100}%` }}
                  className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-red-500"
                ></div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="mb-8">
          <h3 className="text-lg font-medium mb-3">Top Tokens by Volume</h3>
          <div className="bg-gray-800 p-4 rounded-lg">
            {stats.topTokens.map(([token, volume], i) => (
              <div key={token} className="mb-3 last:mb-0">
                <div className="flex justify-between text-sm mb-1">
                  <div>
                    <span 
                      className="cursor-pointer hover:underline"
                      onClick={() => handleTokenFilterClick(token)}
                    >
                      {token}
                    </span>
                  </div>
                  <div>${formatNumber(Math.round(volume))}</div>
                </div>
                <div className="relative pt-1">
                  <div className="overflow-hidden h-2 mb-1 text-xs flex rounded bg-gray-700">
                    <div
                      style={{ width: `${(volume / stats.topTokens[0][1]) * 100}%` }}
                      className="shadow-none flex flex-col text-center whitespace-nowrap justify-center bg-blue-500"
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <div>
          <h3 className="text-lg font-medium mb-3">Market Impact Analysis</h3>
          <div className="bg-gray-800 p-4 rounded-lg">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {['Low', 'Medium', 'High', 'Very High'].map(impact => {
                const count = whaleTransactions.filter(tx => tx.marketImpact === impact).length;
                return (
                  <div key={impact} className="text-center">
                    <div className={`
                      inline-block w-3 h-3 rounded-full mb-1
                      ${impact === 'Low' ? 'bg-green-400' : ''}
                      ${impact === 'Medium' ? 'bg-yellow-400' : ''}
                      ${impact === 'High' ? 'bg-orange-400' : ''}
                      ${impact === 'Very High' ? 'bg-red-400' : ''}
                    `}></div>
                    <div className="text-sm">{impact}</div>
                    <div className="text-2xl font-bold">{count}</div>
                  </div>
                );
              })}
            </div>
            
            <div className="mt-4 text-xs text-gray-400">
              Market impact is calculated based on transaction size relative to average daily volume for the token.
            </div>
          </div>
        </div>
      </>
    ) : (
      <div className="bg-gray-800 p-4 rounded-lg text-center">
        <div className="text-lg font-semibold mb-2">Upgrade to see detailed analytics</div>
        <p className="text-gray-400 mb-4">
          Premium users get access to detailed market impact analysis, token trends, and predictive signals.
        </p>
        <div className="p-6 bg-gray-900 rounded-lg opacity-50 blur-sm">
          <div className="h-40 bg-gray-800 rounded"></div>
        </div>
        <div className="mt-4 text-blue-400 text-sm">
          Migrate to EMBAI tokens for full analytics access
        </div>
      </div>
    );
    
    return (
      <>
        {basicStats}
        {premiumVisualizations}
      </>
    );
  };

  return (
    <div className="bg-gray-900 rounded-lg shadow-lg p-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold">Whale Transaction Tracker</h2>
        
        {error && (
          <div className="bg-red-900 bg-opacity-30 border border-red-800 text-red-200 text-sm px-3 py-1 rounded absolute top-4 right-4 max-w-xs z-10">
            {error}
            <button 
              className="ml-2 text-red-400 hover:text-red-300" 
              onClick={() => setError(null)}
            >
              ✕
            </button>
          </div>
        )}
        
        <div className="flex items-center">
          <div className="flex items-center mr-4">
            <span className={`flex h-3 w-3 relative mr-1 ${isPremium ? 'text-green-500' : 'text-yellow-500'}`}>
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-current"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-current"></span>
            </span>
            <span className="text-sm">{isPremium ? 'Live Data' : 'Delayed Data'}</span>
          </div>
          
          <div className="relative">
            <button 
              className={`px-3 py-1 rounded text-sm ${
                alertsEnabled 
                  ? 'bg-blue-600 hover:bg-blue-700' 
                  : 'bg-gray-700 hover:bg-gray-600'
              }`}
              onClick={toggleAlerts}
            >
              {alertsEnabled ? 'Alerts On' : 'Alerts Off'}
            </button>
          </div>
        </div>
      </div>
      
      <div className="flex flex-wrap items-center justify-between mb-4 gap-2">
        {/* Filter controls */}
        <div className="flex flex-wrap gap-2">
          <select 
            className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm"
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value)}
          >
            <option value="1h">Past Hour</option>
            <option value="6h">Past 6 Hours</option>
            <option value="24h">Past 24 Hours</option>
            <option value="7d">Past Week</option>
          </select>
          
          <select 
            className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm"
            value={threshold}
            onChange={(e) => setThreshold(Number(e.target.value))}
          >
            <option value="10000">$10,000+</option>
            <option value="100000">$100,000+</option>
            <option value="1000000">$1,000,000+</option>
            <option value="10000000">$10,000,000+</option>
          </select>
          
          <select 
            className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="time">Sort by Time</option>
            <option value="amount">Sort by Amount</option>
            <option value="impact">Sort by Market Impact</option>
          </select>
          
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm"
          >
            <option value="all">All Activities</option>
            <option value="buy">Buys</option>
            <option value="sell">Sells</option>
            <option value="transfer">Transfers</option>
          </select>
        </div>
        
        <div className="flex items-center">
          {activeToken && (
            <div className="bg-blue-900 bg-opacity-30 text-blue-400 px-2 py-1 rounded text-xs mr-2 flex items-center">
              Filtering: {activeToken}
              <button 
                className="ml-1 text-blue-300 hover:text-blue-200"
                onClick={() => setActiveToken(null)}
              >
                ✕
              </button>
            </div>
          )}
          
          <div className="text-xs text-gray-400">
            {isPremium 
              ? 'Full access with real-time data' 
              : 'Upgrade to EMBAI for real-time data'}
          </div>
        </div>
      </div>

      <div className="mb-4">
        <div className="flex border-b border-gray-700">
          <button
            className={`py-2 px-4 text-sm font-medium ${activeTab === 'transactions' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400'}`}
            onClick={() => setActiveTab('transactions')}
          >
            Transactions
          </button>
          <button
            className={`py-2 px-4 text-sm font-medium ${activeTab === 'analytics' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400'}`}
            onClick={() => setActiveTab('analytics')}
          >
            Analytics
          </button>
        </div>
      </div>

      {activeTab === 'transactions' ? renderTransactionsTab() : renderAnalyticsTab()}
      
      <div className="mt-6 text-xs text-gray-500">
        <p>
          Whale defined as any wallet transacting &gt;$1M in a single transaction or holding &gt;$10M in assets.
          {!isPremium && ' Full analytics available to live traders with $EMBAI tokens.'}
        </p>
      </div>
    </div>
  );
};

export default WhaleTracker;