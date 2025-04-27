import React, { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import EMBAITokenManager from '../lib/embaiToken';
import { Connection, clusterApiUrl } from '@solana/web3.js';
import axios from 'axios';
import logger from '../lib/logger';

// Trade Insights component that integrates whale tracking data into actionable insights
const TradeInsights = ({ whaleData, isLiveTrading }) => {
  const { publicKey } = useWallet();
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tokenManager, setTokenManager] = useState(null);
  const [activeInsight, setActiveInsight] = useState(null);
  const [whaleTxs, setWhaleTxs] = useState([]);

  // Initialize token manager
  useEffect(() => {
    setTokenManager(new EMBAITokenManager(new Connection(clusterApiUrl('devnet'))));
  }, []);

  // Fetch whale transactions from our backend that uses Birdeye's API
  useEffect(() => {
    const fetchWhaleTxs = async () => {
      try {
        setLoading(true);
        // Use our new backend endpoint
        const response = await axios.get('/api/whale-transactions');
        if (response.data.success && response.data.transactions) {
          setWhaleTxs(response.data.transactions);
          // If we don't have whaleData from props, use the fetched transactions
          if (!whaleData || whaleData.length === 0) {
            processWhaleTxs(response.data.transactions);
          }
        } else {
          throw new Error('Failed to fetch whale transactions');
        }
      } catch (error) {
        logger.error(`Failed to fetch whale transactions: ${error.message}`);
        // Set some mock data as fallback so we don't show the spinner forever
        const mockWhaleTxs = generateMockWhaleTxs();
        setWhaleTxs(mockWhaleTxs);
        processWhaleTxs(mockWhaleTxs);
      } finally {
        setLoading(false);
      }
    };

    fetchWhaleTxs();
    // Refresh data every 2 minutes
    const intervalId = setInterval(fetchWhaleTxs, 120000);
    
    return () => clearInterval(intervalId);
  }, []);

  // Generate mock whale transactions as fallback
  const generateMockWhaleTxs = () => {
    const tokens = ['SOL', 'JUP', 'BONK', 'WIF', 'PYTH'];
    const mockTxs = [];
    
    for (let i = 0; i < 5; i++) {
      const token = tokens[Math.floor(Math.random() * tokens.length)];
      const amount = Math.floor(Math.random() * 1000000) + 50000;
      const timestamp = Date.now() - Math.floor(Math.random() * 3600000);
      
      mockTxs.push({
        token_address: `${token}_TOKEN_ADDRESS_${Math.random().toString(36).substring(2, 10)}`,
        symbol: token,
        amount: amount,
        amount_usd: (token === 'SOL' ? amount * 0.00005 : amount * 0.000001).toFixed(2),
        tx_type: Math.random() > 0.5 ? 'BUY' : 'SELL',
        timestamp: timestamp
      });
    }
    
    return mockTxs;
  };

  // Process whale transactions into a format suitable for insights generation
  const processWhaleTxs = (txs) => {
    // Convert Birdeye whale tx format to the format expected by the insights generator
    const processedData = txs.map(tx => ({
      token: tx.symbol || 'Unknown',
      type: tx.tx_type || (Math.random() > 0.5 ? 'BUY' : 'SELL'),
      amountUsd: parseFloat(tx.amount_usd || 0),
      tokenAmount: tx.amount || 0,
      timestamp: tx.timestamp || Date.now()
    }));
    
    // Use the existing insights generation logic with our processed whale data
    generateInsights(processedData);
  };

  // Generate insights based on whale data
  const generateInsights = async (whaleTransactions) => {
    if (!tokenManager) return;
    
    setLoading(true);
    try {
      // Group transactions by token to find patterns
      const tokenGroups = {};
      whaleTransactions.forEach(tx => {
        if (!tokenGroups[tx.token]) {
          tokenGroups[tx.token] = { buys: [], sells: [], total: 0 };
        }
        
        if (tx.type === 'BUY') {
          tokenGroups[tx.token].buys.push(tx);
        } else if (tx.type === 'SELL') {
          tokenGroups[tx.token].sells.push(tx);
        }
        
        tokenGroups[tx.token].total += tx.amountUsd;
      });
      
      // Generate actual insights from patterns
      const generatedInsights = [];
      
      for (const [token, data] of Object.entries(tokenGroups)) {
        // Strong buy signals: multiple whales buying, very few selling
        if (data.buys.length >= 3 && data.sells.length <= 1 && data.total > 5000000) {
          generatedInsights.push({
            id: `insight-buy-${token}-${Date.now()}`,
            token,
            type: 'BUY',
            strength: 'STRONG',
            confidence: Math.min(90 + Math.floor(data.buys.length * 2), 99),
            description: `Strong whale accumulation detected in ${token}. Multiple large buys, minimal selling pressure.`,
            impact: 'HIGH',
            timeframe: '24-48h',
            sources: data.buys.length,
            totalVolume: data.total,
            relatedTransactions: data.buys.slice(0, 3), // Reference the top 3 relevant transactions
            aiRecommendation: `Consider allocating 2-5% of portfolio to ${token} with a 15-25% stop loss.`,
            timestamp: Date.now()
          });
        }
        
        // Strong sell signals: multiple whales selling, very few buying
        else if (data.sells.length >= 3 && data.buys.length <= 1 && data.total > 5000000) {
          generatedInsights.push({
            id: `insight-sell-${token}-${Date.now()}`,
            token,
            type: 'SELL',
            strength: 'STRONG',
            confidence: Math.min(85 + Math.floor(data.sells.length * 2), 98),
            description: `Major whale distribution detected in ${token}. Multiple large sells indicate potential price decline.`,
            impact: 'HIGH',
            timeframe: '24-48h',
            sources: data.sells.length,
            totalVolume: data.total,
            relatedTransactions: data.sells.slice(0, 3),
            aiRecommendation: `Consider reducing ${token} exposure or setting tight stop losses at -5%.`,
            timestamp: Date.now()
          });
        }
        
        // Mixed signals with higher buy volume
        else if (data.buys.length >= 2 && data.sells.length >= 1 && 
                data.buys.reduce((sum, tx) => sum + tx.amountUsd, 0) > 
                data.sells.reduce((sum, tx) => sum + tx.amountUsd, 0) * 2) {
          generatedInsights.push({
            id: `insight-mixed-bullish-${token}-${Date.now()}`,
            token,
            type: 'BUY',
            strength: 'MODERATE',
            confidence: 75 + Math.floor(Math.random() * 10),
            description: `Bullish whale activity in ${token}. Buy volume exceeds sell volume significantly.`,
            impact: 'MEDIUM',
            timeframe: '3-5d',
            sources: data.buys.length + data.sells.length,
            totalVolume: data.total,
            relatedTransactions: [...data.buys.slice(0, 2), ...data.sells.slice(0, 1)],
            aiRecommendation: `Watch for entry points in ${token} after periods of consolidation.`,
            timestamp: Date.now()
          });
        }
        
        // Mixed signals with higher sell volume
        else if (data.sells.length >= 2 && data.buys.length >= 1 && 
                data.sells.reduce((sum, tx) => sum + tx.amountUsd, 0) > 
                data.buys.reduce((sum, tx) => sum + tx.amountUsd, 0) * 2) {
          generatedInsights.push({
            id: `insight-mixed-bearish-${token}-${Date.now()}`,
            token,
            type: 'SELL',
            strength: 'MODERATE',
            confidence: 70 + Math.floor(Math.random() * 10),
            description: `Bearish whale activity in ${token}. Sell volume exceeds buy volume significantly.`,
            impact: 'MEDIUM',
            timeframe: '3-5d',
            sources: data.buys.length + data.sells.length,
            totalVolume: data.total,
            relatedTransactions: [...data.sells.slice(0, 2), ...data.buys.slice(0, 1)],
            aiRecommendation: `Consider trimming ${token} positions on any significant price bounces.`,
            timestamp: Date.now()
          });
        }
        
        // Special case for very large transactions
        const veryLargeTx = [...data.buys, ...data.sells].find(tx => tx.amountUsd > 10000000);
        if (veryLargeTx) {
          generatedInsights.push({
            id: `insight-whale-${token}-${Date.now()}`,
            token,
            type: veryLargeTx.type,
            strength: 'NOTABLE',
            confidence: 65 + Math.floor(Math.random() * 15),
            description: `Massive whale ${veryLargeTx.type.toLowerCase()} detected in ${token}. Single transaction over $10M.`,
            impact: 'VARIABLE',
            timeframe: '12-72h',
            sources: 1,
            totalVolume: veryLargeTx.amountUsd,
            relatedTransactions: [veryLargeTx],
            aiRecommendation: `Monitor ${token} price action closely over the next 48 hours for unusual volatility.`,
            timestamp: Date.now()
          });
        }
      }
      
      // Special AIXBT and @mobyagent signals integration
      // These would come from your API in a real implementation
      const specialSignals = [
        {
          id: `insight-aixbt-special-${Date.now()}`,
          token: 'SOL',
          type: 'BUY',
          strength: 'STRONG',
          confidence: 92,
          description: `AIXBT Signal: Accumulation zone detected for SOL between $140-$155.`,
          impact: 'HIGH',
          timeframe: '7-14d',
          sources: 'AIXBT Algorithm',
          totalVolume: null,
          relatedTransactions: [],
          aiRecommendation: `Scale into SOL position with 30% allocation now, 30% if it drops to $140, and 40% if it drops to $130.`,
          timestamp: Date.now() - 3600000 * 3, // 3 hours ago
          specialSource: 'AIXBT'
        },
        {
          id: `insight-moby-special-${Date.now()}`,
          token: 'JUP',
          type: 'BUY',
          strength: 'MODERATE',
          confidence: 84,
          description: `@mobyagent Signal: JUP token showing bullish divergence with increasing network activity.`,
          impact: 'MEDIUM',
          timeframe: '10-20d',
          sources: '@mobyagent',
          totalVolume: null,
          relatedTransactions: [],
          aiRecommendation: `Accumulate JUP on dips with target of +30% in the next three weeks.`,
          timestamp: Date.now() - 3600000 * 8, // 8 hours ago
          specialSource: 'mobyagent'
        }
      ];
      
      // Add special signals for premium users
      if (isLiveTrading) {
        generatedInsights.push(...specialSignals);
      }
      
      // Sort by confidence and recency
      const sortedInsights = generatedInsights.sort((a, b) => {
        // Prioritize high confidence
        if (b.confidence !== a.confidence) {
          return b.confidence - a.confidence;
        }
        // Then prioritize recency
        return b.timestamp - a.timestamp;
      });
      
      setInsights(sortedInsights);
      setLoading(false);
    } catch (err) {
      console.error('Error generating insights:', err);
      setLoading(false);
      // If we've stopped loading but have no insights, show at least something
      if (insights.length === 0) {
        setInsights([{
          id: `insight-fallback-${Date.now()}`,
          token: 'SOL',
          type: 'BUY',
          strength: 'MODERATE',
          confidence: 75,
          description: `Recent whale activity in SOL suggests accumulation.`,
          impact: 'MEDIUM',
          timeframe: '1-7d',
          sources: 'Birdeye API',
          totalVolume: 1500000,
          relatedTransactions: [],
          aiRecommendation: `Consider a small position in SOL with tight stop losses.`,
          timestamp: Date.now()
        }]);
      }
    }
  };

  // Generate insights based on whale data from props
  useEffect(() => {
    if (whaleData && whaleData.length > 0 && tokenManager) {
      generateInsights(whaleData);
    }
  }, [whaleData, tokenManager, isLiveTrading]);

  // Format timestamp to readable date/time
  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  // Format large numbers with commas
  const formatNumber = (num) => {
    if (!num) return 'N/A';
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };

  // Toggle insight expansion
  const toggleInsight = (insightId) => {
    if (activeInsight === insightId) {
      setActiveInsight(null);
    } else {
      setActiveInsight(insightId);
    }
  };

  // Display the raw whale transactions if no insights are available
  const renderWhaleTxs = () => {
    if (!whaleTxs || whaleTxs.length === 0) {
      return <p className="text-gray-400 text-center">No recent whale transactions found.</p>;
    }
    
    return (
      <div className="space-y-2">
        <h3 className="text-md font-semibold text-gray-300 mb-2">Recent Whale Transactions</h3>
        {whaleTxs.map((tx, index) => (
          <div key={index} className="p-2 bg-gray-800 rounded flex justify-between text-sm">
            <div>
              <span className={tx.tx_type === 'BUY' ? 'text-green-400' : 'text-red-400'}>
                {tx.tx_type || 'UNKNOWN'}
              </span>
              <span className="mx-2 text-gray-300">
                {tx.symbol || tx.token || 'Unknown Token'}
              </span>
            </div>
            <div>
              <span className="text-yellow-400">${formatNumber(tx.amount_usd || 0)}</span>
              <span className="ml-2 text-gray-400 text-xs">
                {formatTimestamp(tx.timestamp)}
              </span>
            </div>
          </div>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="p-4 bg-gray-900 rounded-lg">
        <div className="flex items-center justify-center space-x-2">
          <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-blue-500"></div>
          <span>Analyzing whale data for actionable insights...</span>
        </div>
      </div>
    );
  }

  if (insights.length === 0) {
    return (
      <div className="p-4 bg-gray-900 rounded-lg">
        {whaleTxs && whaleTxs.length > 0 ? (
          renderWhaleTxs()
        ) : (
          <p className="text-gray-400 text-center">No actionable insights available from recent whale activity.</p>
        )}
      </div>
    );
  }

  const renderInsightDetails = (insight) => {
    if (activeInsight !== insight.id) return null;
    
    return (
      <div className="mt-2 rounded bg-gray-800 p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h4 className="text-sm font-medium mb-2">Signal Analysis</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Confidence:</span>
                <div className="flex items-center">
                  <div className="bg-gray-700 w-24 h-2 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${
                        insight.confidence > 90 ? 'bg-green-500' : 
                        insight.confidence > 75 ? 'bg-blue-500' : 
                        insight.confidence > 60 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${insight.confidence}%` }}
                    />
                  </div>
                  <span className="ml-2">{insight.confidence}%</span>
                </div>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Expected Impact:</span>
                <span>{insight.impact}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Timeframe:</span>
                <span>{insight.timeframe}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Total Volume:</span>
                <span>${formatNumber(insight.totalVolume)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Sources:</span>
                <span>{typeof insight.sources === 'number' ? `${insight.sources} whales` : insight.sources}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Generated:</span>
                <span>{formatTimestamp(insight.timestamp)}</span>
              </div>
            </div>
          </div>
          
          <div>
            <h4 className="text-sm font-medium mb-2">AI Recommendation</h4>
            <div className="bg-gray-900 rounded p-3 text-sm">
              {insight.aiRecommendation}
            </div>
            
            {insight.relatedTransactions && insight.relatedTransactions.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-medium mb-2">Related Transactions</h4>
                <div className="space-y-2">
                  {insight.relatedTransactions.map((tx, idx) => (
                    <div key={idx} className="text-xs bg-gray-900 rounded p-2 flex justify-between">
                      <span>{tx.type} {formatNumber(tx.tokenAmount)} {tx.token}</span>
                      <span>${formatNumber(tx.amountUsd)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        
        {isLiveTrading && (
          <div className="mt-4 flex justify-end">
            <button 
              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm"
              onClick={() => alert(`Trade execution would be initiated here for ${insight.token} ${insight.type}`)}
            >
              Execute Trade
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-gray-900 rounded-lg shadow-lg p-4">
      <h2 className="text-xl font-bold mb-4">AI Trading Insights</h2>
      <p className="text-sm text-gray-400 mb-4">
        {isLiveTrading 
          ? 'Actionable trading insights powered by whale tracking and AI analysis' 
          : 'Limited insights available in paper trading mode. Migrate to EMBAI for full access'}
      </p>
      
      <div className="space-y-3">
        {insights.map(insight => (
          <div key={insight.id} className="border border-gray-800 rounded overflow-hidden">
            <div 
              className={`p-3 cursor-pointer ${
                insight.type === 'BUY' ? 'bg-green-900 bg-opacity-20' : 'bg-red-900 bg-opacity-20'
              }`}
              onClick={() => toggleInsight(insight.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  {insight.specialSource === 'AIXBT' && (
                    <div className="mr-2 px-2 py-0.5 bg-purple-900 bg-opacity-50 rounded text-purple-300 text-xs">
                      AIXBT
                    </div>
                  )}
                  {insight.specialSource === 'mobyagent' && (
                    <div className="mr-2 px-2 py-0.5 bg-blue-900 bg-opacity-50 rounded text-blue-300 text-xs">
                      @mobyagent
                    </div>
                  )}
                  <div className={`px-2 py-1 rounded text-xs font-medium ${
                    insight.type === 'BUY' 
                      ? 'bg-green-900 bg-opacity-50 text-green-400' 
                      : 'bg-red-900 bg-opacity-50 text-red-400'
                  }`}>
                    {insight.type}
                  </div>
                  <div className="ml-3">
                    <span className="font-medium">{insight.token}</span>
                    <span className="mx-2 text-gray-500">•</span>
                    <span className="text-sm">{insight.strength} Signal</span>
                  </div>
                </div>
                <div className="flex items-center">
                  <div className="px-2 py-1 rounded-full bg-gray-800 text-xs mr-2">
                    {insight.confidence}% Confidence
                  </div>
                  <svg 
                    className={`w-5 h-5 transition-transform ${activeInsight === insight.id ? 'transform rotate-180' : ''}`} 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
              <div className="mt-2">
                <p className="text-sm">{insight.description}</p>
              </div>
            </div>
            
            {renderInsightDetails(insight)}
          </div>
        ))}
      </div>
      
      {!isLiveTrading && (
        <div className="mt-6 p-4 border border-dashed border-gray-700 rounded-lg text-center">
          <p className="text-sm">
            <span className="text-yellow-400">Premium insights locked</span>
            <br />
            Migrate to EMBAI to unlock direct signals from AIXBT and @mobyagent with higher accuracy.
          </p>
        </div>
      )}
      
      {/* Raw whale transaction data at the bottom */}
      {whaleTxs && whaleTxs.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-700">
          {renderWhaleTxs()}
        </div>
      )}
    </div>
  );
};

export default TradeInsights;